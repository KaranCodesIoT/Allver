import { NativeModules, Platform } from 'react-native';

const { IncomingCallModule } = NativeModules;

class IncomingCallService {
  /**
   * Displays the custom fullscreen incoming call UI.
   * On Android, this triggers the native Activity and registers a high-importance notification.
   */
  public showIncomingCall(callId: string, callerName: string): void {
    console.log(`[IncomingCallService] showIncomingCall called for callId: "${callId}", callerName: "${callerName}"`);
    
    if (Platform.OS !== 'android') {
      console.warn('[IncomingCallService] Fullscreen incoming call UI is only supported on Android.');
      return;
    }

    if (!IncomingCallModule) {
      console.error('[IncomingCallService] IncomingCallModule is not linked or registered.');
      return;
    }

    try {
      IncomingCallModule.showIncomingCall(callId, callerName);
      console.log('[IncomingCallService] Successfully invoked native showIncomingCall.');
    } catch (error) {
      console.error('[IncomingCallService] Error invoking native showIncomingCall:', error);
    }
  }

  /**
   * Dismisses any active incoming call notification and activity.
   */
  public dismissIncomingCall(): void {
    console.log('[IncomingCallService] dismissIncomingCall called.');

    if (Platform.OS !== 'android') {
      return;
    }

    if (!IncomingCallModule) {
      return;
    }

    try {
      IncomingCallModule.dismissIncomingCall();
      console.log('[IncomingCallService] Successfully invoked native dismissIncomingCall.');
    } catch (error) {
      console.error('[IncomingCallService] Error invoking native dismissIncomingCall:', error);
    }
  }

  /**
   * Checks if the app was launched or brought to foreground via a native call intent action.
   * Returns a promise resolving to the action object or null.
   */
  public async getPendingCallAction(): Promise<{ action: string; callId?: string; callerName?: string } | null> {
    if (Platform.OS !== 'android' || !IncomingCallModule) {
      return null;
    }
    try {
      return await IncomingCallModule.getPendingCallAction();
    } catch (e) {
      console.error('[IncomingCallService] Error getting pending call action:', e);
      return null;
    }
  }
}

export default new IncomingCallService();
