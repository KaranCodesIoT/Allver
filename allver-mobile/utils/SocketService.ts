import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { BACKEND_URL } from '../constants/Config';
import { getToken } from '../constants/Auth';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private appStateSubscription: any = null;
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  constructor() {
    // Listen to React Native AppState shifts
    if (Platform.OS !== 'web') {
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    }
  }

  /**
   * Initialize socket connection
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
      transports: ['websocket'],
      forceNew: false, // Re-use the connection
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
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
      console.log('[SocketService] Connected successfully. Socket ID:', this.socket?.id);
      this.socket?.emit('go_online');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected. Reason:', reason);
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
  }

  /**
   * Handle application moving to foreground/background
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('[SocketService] App returned to foreground. Verifying socket connection...');
      if (this.socket && !this.socket.connected && this.userId) {
        console.log('[SocketService] Socket disconnected. Re-initializing...');
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
   * Emit an event
   */
  public emit(event: string, data: any, callback?: (...args: any[]) => void): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('[SocketService] emit() called on a disconnected socket.');
    }
    if (callback) {
      this.socket?.emit(event, data, callback);
    } else {
      this.socket?.emit(event, data);
    }
  }

  /**
   * Disconnect completely (e.g. on logout)
   */
  public disconnect(): void {
    console.log('[SocketService] Disconnecting socket...');
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
}

export default new SocketService();
