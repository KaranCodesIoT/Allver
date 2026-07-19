import { Platform } from 'react-native';

console.log('[BOOT] [CallKeep] CallKeepService.ts loaded in mock bypass mode.');

class CallKeepManager {
  private isInitialized = false;
  private currentCallUUID: string | null = null;
  private activeCallerInfo: any = null;
  private onCallAnsweredCallback: ((data: any) => void) | null = null;
  private onCallEndedCallback: (() => void) | null = null;

  constructor() {
    console.log('[BOOT] [CallKeep] Mock CallKeepManager instantiated.');
  }

  public async setupCallKeep(): Promise<boolean> {
    console.log('[BOOT] [CallKeep] setupCallKeep bypassed globally.');
    return true;
  }

  public displayIncomingCall(callUUID: string, handle: string, localizedCallerName: string, payloadData?: any): void {
    console.log(`[BOOT] [CallKeep] displayIncomingCall bypassed globally for ${localizedCallerName} (UUID: ${callUUID})`);
  }

  public startOutgoingCall(callUUID: string, handle: string, localizedCallerName: string): void {
    console.log(`[BOOT] [CallKeep] startOutgoingCall bypassed globally (UUID: ${callUUID})`);
  }

  public setCallActive(callUUID: string): void {
    console.log(`[BOOT] [CallKeep] setCallActive bypassed globally (UUID: ${callUUID})`);
  }

  public endNativeCall(callUUID?: string): void {
    console.log(`[BOOT] [CallKeep] endNativeCall bypassed globally.`);
  }

  // Dummy event handlers to prevent undefined reference errors
  private onNativeAnswerCall = () => {};
  private onNativeEndCall = () => {};
  private onNativeDisplayIncomingCall = () => {};
  private onNativeSetMutedCall = () => {};
}

export default new CallKeepManager();
