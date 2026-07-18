import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { BACKEND_URL } from '../constants/Config';
import { getToken } from '../constants/Auth';

// ─── Call Signaling Events That Require Acknowledgement ───
const ACK_EVENTS = new Set([
  'initiate_call', 'answer_call', 'reject_call', 'end_call', 'busy_call',
  'webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate'
]);
const ACK_TIMEOUT_MS = 3000; // 3 seconds before retry
const ACK_MAX_RETRIES = 2;

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private appStateSubscription: any = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private heartbeatInterval: any = null;
  private lastPong: number = 0;
  private reconnectingFast: boolean = false;

  constructor() {
    // Listen to React Native AppState shifts
    if (Platform.OS !== 'web') {
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    }
  }

  /**
   * Initialize socket connection with ultra-low-latency configuration
   */
  public async initialize(userId: string): Promise<void> {
    if (!userId) return;
    this.userId = userId;

    if (this.socket && this.socket.connected) {
      console.log('[SocketService] Socket already connected. Re-joining room...');
      this.socket.emit('go_online');
      return;
    }

    // Retrieve active JWT token for authentication
    const token = await getToken();

    console.log('[SocketService] Connecting to socket at:', BACKEND_URL);
    this.socket = io(BACKEND_URL, {
      transports: ['websocket'],       // Skip HTTP long-poll, go straight to WebSocket
      forceNew: false,                  // Re-use existing connection
      reconnection: true,
      reconnectionAttempts: Infinity,   // Never give up reconnecting
      reconnectionDelay: 500,           // Start retrying after 500ms (was 1500ms)
      reconnectionDelayMax: 5000,       // Cap exponential backoff at 5s
      randomizationFactor: 0.2,         // Minimal jitter
      timeout: 8000,                    // Connection timeout
      auth: { token },
      query: { userId, token: token || '' }
    });

    // Re-bind all stored listeners to the new socket instance
    for (const [event, callbacks] of this.listeners.entries()) {
      for (const callback of callbacks) {
        this.socket.on(event, callback);
      }
    }

    this.socket.on('connect', () => {
      const connectTime = Date.now();
      console.log(`[SocketService] Connected successfully. Socket ID: ${this.socket?.id} (t=${connectTime})`);
      this.socket?.emit('go_online');
      this.reconnectingFast = false;
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected. Reason:', reason);
      this.stopHeartbeat();
      // If server closed cleanly, reconnect immediately
      if (reason === 'io server disconnect') {
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', async (error) => {
      console.error('[SocketService] Connect error:', error.message);
      if (error.message && (error.message.includes('Unauthorized') || error.message.includes('Invalid token'))) {
        console.log('[SocketService] Socket connection unauthorized. Clearing stale session tokens...');
        this.disconnect();
        const { removeToken, removeStoredUser } = require('../constants/Auth');
        await removeToken();
        await removeStoredUser();
        try {
          const { router } = require('expo-router');
          router.replace('/login');
        } catch (routerErr) {
          console.warn('[SocketService] Failed to auto-redirect during socket auth error:', routerErr);
        }
      }
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log('[SocketService] Reconnection attempt #', attempt);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[SocketService] Reconnection failed completely.');
    });

    // Respond to server pings for latency measurement
    this.socket.on('server_ping', (data: any) => {
      this.lastPong = Date.now();
      this.socket?.emit('client_pong', { timestamp: data?.timestamp, clientTime: this.lastPong });
    });
  }

  // ─── Heartbeat: Detect stale connections and force fast reconnect ───
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastPong = Date.now();
    this.heartbeatInterval = setInterval(() => {
      if (!this.socket || !this.socket.connected) {
        this.stopHeartbeat();
        return;
      }
      const now = Date.now();
      // If no pong from server for 15 seconds, force reconnect
      if (now - this.lastPong > 15000 && !this.reconnectingFast) {
        console.warn('[SocketService] Heartbeat timeout. Forcing fast reconnect...');
        this.reconnectingFast = true;
        this.socket.disconnect();
        this.socket.connect();
      }
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Handle application moving to foreground/background
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('[SocketService] App returned to foreground. Verifying socket connection...');
      if (this.socket && !this.socket.connected && this.userId) {
        console.log('[SocketService] Socket disconnected. Reconnecting immediately...');
        this.socket.connect();
      } else if (!this.socket && this.userId) {
        this.initialize(this.userId);
      }
    }
  };

  /**
   * Listen to an event
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback);
  }

  /**
   * Remove an event listener
   */
  public off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.listeners.get(event)?.delete(callback);
      this.socket?.off(event, callback);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  /**
   * Emit with optional acknowledgement + automatic retry for critical call events.
   * For ACK_EVENTS: waits for server acknowledgement callback. If not received
   * within ACK_TIMEOUT_MS, retries up to ACK_MAX_RETRIES times.
   */
  public emit(event: string, data: any, callback?: (...args: any[]) => void): void {
    if (!this.socket || !this.socket.connected) {
      console.warn(`[SocketService] emit('${event}') called on disconnected socket. Attempting reconnect...`);
      if (this.userId && this.socket) {
        this.socket.connect();
      }
    }

    // For critical call signaling events, use ack-based emit with retry
    if (ACK_EVENTS.has(event)) {
      this.emitWithAck(event, data, callback, 0);
    } else if (callback) {
      this.socket?.emit(event, data, callback);
    } else {
      this.socket?.emit(event, data);
    }
  }

  private emitWithAck(event: string, data: any, externalCallback?: (...args: any[]) => void, attempt: number = 0): void {
    const emitTime = Date.now();
    const timeoutId = setTimeout(() => {
      if (attempt < ACK_MAX_RETRIES) {
        console.warn(`[SocketService] ACK timeout for '${event}' (attempt ${attempt + 1}/${ACK_MAX_RETRIES}). Retrying...`);
        this.emitWithAck(event, data, externalCallback, attempt + 1);
      } else {
        console.error(`[SocketService] ACK failed for '${event}' after ${ACK_MAX_RETRIES} retries.`);
      }
    }, ACK_TIMEOUT_MS);

    this.socket?.emit(event, { ...data, _emitTimestamp: emitTime }, (ackResponse: any) => {
      clearTimeout(timeoutId);
      const ackLatency = Date.now() - emitTime;
      console.log(`[SocketService] ACK received for '${event}' in ${ackLatency}ms`);
      if (externalCallback) externalCallback(ackResponse);
    });
  }

  /**
   * Disconnect completely (e.g. on logout)
   */
  public disconnect(): void {
    console.log('[SocketService] Disconnecting socket...');
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    this.listeners.clear();
  }

  /**
   * Get raw socket instance
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return !!this.socket && this.socket.connected;
  }
}

export default new SocketService();
