import { Platform, NativeModules } from 'react-native';
import SocketService from './SocketService';
import WebRTCService from './WebRTCService';

let RNCallKeep: any = null;
let isCallKeepAvailable = false;

const hasNativeCallKeepModule = Boolean(
  Platform.OS !== 'web' &&
  NativeModules &&
  (NativeModules.RNCallKeep || NativeModules.RNCallKeepModule)
);

if (hasNativeCallKeepModule) {
  try {
    const callkeepModule = require('react-native-callkeep');
    RNCallKeep = callkeepModule?.default || callkeepModule;
    isCallKeepAvailable = !!(RNCallKeep && typeof RNCallKeep.setup === 'function');
    if (isCallKeepAvailable) {
      console.log('[CallKeep] react-native-callkeep native module loaded.');
    }
  } catch (e) {
    console.log('[CallKeep] react-native-callkeep native binary not present in bundle.');
  }
} else {
  console.log('[CallKeep] NativeModules.RNCallKeep is null in current runtime (Expo Go mode). Skipping CallKeep setup.');
}

export const CALLKEEP_OPTIONS = {
  ios: {
    appName: 'Allver',
  },
  android: {
    alertTitle: 'Permissions required',
    alertDescription: 'Allver requires calling permissions to show incoming voice call screens.',
    buttonNeutral: 'Ask Me Later',
    buttonNegative: 'Cancel',
    buttonPositive: 'OK',
    selfManaged: false, // Use Android native system dialer interface
    foregroundService: {
      channelId: 'com.allver.mobile.callkeep',
      channelName: 'Allver Voice Call Service',
      notificationTitle: 'Voice call active',
    },
  },
};

class CallKeepManagerNative {
  private isInitialized = false;
  private currentCallUUID: string | null = null;
  private activeCallerInfo: any = null;
  private onCallAnsweredCallback: ((data: any) => void) | null = null;
  private onCallEndedCallback: (() => void) | null = null;

  constructor() {
    console.log('[CallKeep] CallKeepManager instantiated.');
  }

  public async setupCallKeep(): Promise<boolean> {
    if (this.isInitialized) return true;
    if (!hasNativeCallKeepModule || !isCallKeepAvailable || !RNCallKeep || typeof RNCallKeep.setup !== 'function') {
      console.log('[CallKeep] Skipping native CallKeep setup (Module not present in current binary).');
      return false;
    }

    try {
      console.log('[CallKeep] Initializing RNCallKeep with Android ConnectionService...');
      await RNCallKeep.setup(CALLKEEP_OPTIONS);
      if (typeof RNCallKeep.setAvailable === 'function') {
        RNCallKeep.setAvailable(true);
      }

      // Register native event listeners
      if (typeof RNCallKeep.addEventListener === 'function') {
        RNCallKeep.addEventListener('answerCall', this.onNativeAnswerCall);
        RNCallKeep.addEventListener('endCall', this.onNativeEndCall);
        RNCallKeep.addEventListener('didDisplayIncomingCall', this.onNativeDisplayIncomingCall);
        RNCallKeep.addEventListener('didPerformSetMutedCallAction', this.onNativeSetMutedCall);
      }

      this.isInitialized = true;
      console.log('[CallKeep] RNCallKeep successfully initialized and listeners registered.');
      return true;
    } catch (err) {
      console.error('[CallKeep] Error setting up RNCallKeep:', err);
      return false;
    }
  }

  public displayIncomingCall(callUUID: string, handle: string, localizedCallerName: string, payloadData?: any): void {
    this.currentCallUUID = callUUID;
    this.activeCallerInfo = payloadData || { handle, localizedCallerName };

    console.log(`[CallKeep] [Stage 5 - Native Call UI] Displaying Android native incoming call UI for ${localizedCallerName} (UUID: ${callUUID})`);

    if (hasNativeCallKeepModule && isCallKeepAvailable && RNCallKeep && typeof RNCallKeep.displayIncomingCall === 'function') {
      try {
        RNCallKeep.displayIncomingCall(callUUID, handle, localizedCallerName, 'generic', true);
      } catch (err) {
        console.error('[CallKeep] Error displaying native incoming call:', err);
      }
    }
  }

  public startOutgoingCall(callUUID: string, handle: string, localizedCallerName: string): void {
    this.currentCallUUID = callUUID;
    console.log(`[CallKeep] Starting native outgoing call (UUID: ${callUUID})`);
    if (hasNativeCallKeepModule && isCallKeepAvailable && RNCallKeep && typeof RNCallKeep.startCall === 'function') {
      try {
        RNCallKeep.startCall(callUUID, handle, localizedCallerName, 'generic', true);
      } catch (err) {
        console.error('[CallKeep] Error starting native call:', err);
      }
    }
  }

  public setCallActive(callUUID: string): void {
    console.log(`[CallKeep] Setting native call active (UUID: ${callUUID})`);
    if (hasNativeCallKeepModule && isCallKeepAvailable && RNCallKeep && typeof RNCallKeep.setCurrentCallActive === 'function') {
      try {
        RNCallKeep.setCurrentCallActive(callUUID);
      } catch (err) {
        console.error('[CallKeep] Error setting call active:', err);
      }
    }
  }

  public endNativeCall(callUUID?: string): void {
    const targetUUID = callUUID || this.currentCallUUID;
    console.log(`[CallKeep] Ending native call (UUID: ${targetUUID})`);
    if (targetUUID && hasNativeCallKeepModule && isCallKeepAvailable && RNCallKeep) {
      try {
        if (typeof RNCallKeep.endCall === 'function') {
          RNCallKeep.endCall(targetUUID);
        }
        if (typeof RNCallKeep.endAllCalls === 'function') {
          RNCallKeep.endAllCalls();
        }
      } catch (err) {
        console.error('[CallKeep] Error ending native call:', err);
      }
    }
    this.currentCallUUID = null;
    this.activeCallerInfo = null;
  }

  private onNativeAnswerCall = ({ callUUID }: { callUUID: string }) => {
    console.log(`[CallKeep] [User Action] User answered incoming call from native UI (UUID: ${callUUID})`);
    this.setCallActive(callUUID);

    if (this.activeCallerInfo) {
      const { callerId, conversationId } = this.activeCallerInfo;
      if (callerId) {
        console.log(`[CallKeep] Emitting call_answered socket signal for ${callerId}`);
        SocketService.emit('call_answered', { callerId });
      }
    }

    if (this.onCallAnsweredCallback) {
      this.onCallAnsweredCallback(this.activeCallerInfo);
    }
  };

  private onNativeEndCall = ({ callUUID }: { callUUID: string }) => {
    console.log(`[CallKeep] [User Action] User declined/ended call from native UI (UUID: ${callUUID})`);
    if (this.activeCallerInfo?.callerId) {
      SocketService.emit('reject_call', { callerId: this.activeCallerInfo.callerId });
    }
    WebRTCService.cleanup();
    if (this.onCallEndedCallback) {
      this.onCallEndedCallback();
    }
    this.currentCallUUID = null;
    this.activeCallerInfo = null;
  };

  private onNativeDisplayIncomingCall = (data: any) => {
    console.log('[CallKeep] Native incoming call UI successfully displayed on Android:', data);
  };

  private onNativeSetMutedCall = ({ muted, callUUID }: { muted: boolean; callUUID: string }) => {
    console.log(`[CallKeep] Native mute toggle (Muted: ${muted}, UUID: ${callUUID})`);
    WebRTCService.toggleMute();
  };

  public setCallbacks(callbacks: {
    onCallAnswered?: (data: any) => void;
    onCallEnded?: () => void;
  }): void {
    if (callbacks.onCallAnswered) this.onCallAnsweredCallback = callbacks.onCallAnswered;
    if (callbacks.onCallEnded) this.onCallEndedCallback = callbacks.onCallEnded;
  }
}

const CallKeepService = new CallKeepManagerNative();
export default CallKeepService;
