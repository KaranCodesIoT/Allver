import SocketService from './SocketService';
import WebRTCService from './WebRTCService';

export const CALLKEEP_OPTIONS = {};

class CallKeepManagerWeb {
  public async setupCallKeep(): Promise<boolean> {
    console.log('[CallKeep-Web] Skipping native CallKeep setup on Web.');
    return false;
  }

  public displayIncomingCall(callUUID: string, handle: string, localizedCallerName: string, payloadData?: any): void {
    console.log(`[CallKeep-Web] Incoming call received on Web for ${localizedCallerName}`);
  }

  public startOutgoingCall(callUUID: string, handle: string, localizedCallerName: string): void {
    console.log(`[CallKeep-Web] Outgoing call started on Web for ${localizedCallerName}`);
  }

  public setCallActive(callUUID: string): void {
    console.log(`[CallKeep-Web] Call active on Web (UUID: ${callUUID})`);
  }

  public endNativeCall(callUUID?: string): void {
    console.log('[CallKeep-Web] Call ended on Web.');
  }

  public setCallbacks(callbacks: {
    onCallAnswered?: (data: any) => void;
    onCallEnded?: () => void;
  }): void {}
}

const CallKeepService = new CallKeepManagerWeb();
export default CallKeepService;
