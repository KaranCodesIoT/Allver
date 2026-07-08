export const isWebRTCAvailable = false;

const WebRTCService = {
  setCallbacks: () => {},
  getCallState: () => 'idle',
  getCallId: () => null,
  getCallDuration: () => 0,
  getLocalMediaStream: async () => { throw new Error('WebRTC disabled'); },
  startCall: async () => {},
  endCall: () => {},
  toggleMute: () => false,
  toggleCamera: () => false,
  switchCamera: async () => {},
  getCameraState: () => false,
  cleanup: () => {},
};

export default WebRTCService;
