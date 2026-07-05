import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { BACKEND_URL } from '../constants/Config';
import { getToken } from '../constants/Auth';

class SocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private appStateSubscription: any = null;

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
      this.socket.emit('go_online', { userId: this.userId });
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

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected successfully. Socket ID:', this.socket?.id);
      if (this.userId) {
        this.socket?.emit('go_online', { userId: this.userId });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected. Reason:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Connect error:', error.message);
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
    if (!this.socket) {
      console.warn('[SocketService] on() called before initialize. Listener will be registered once initialized.');
    }
    this.socket?.on(event, callback);
  }

  /**
   * Remove an event listener
   */
  public off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      this.socket?.off(event, callback);
    } else {
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
  }

  /**
   * Get raw socket instance
   */
  public getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
