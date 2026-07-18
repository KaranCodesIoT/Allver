import { Audio } from 'expo-av';
import SocketService from './SocketService';

export const isWebRTCAvailable = typeof window !== 'undefined' && !!(window as any).RTCPeerConnection;

const turnUrl = process.env.EXPO_PUBLIC_TURN_SERVER_URL || 'turn:openrelay.metered.ca:80';
const turnUsername = process.env.EXPO_PUBLIC_TURN_USERNAME || 'openrelayproject';
const turnCredential = process.env.EXPO_PUBLIC_TURN_CREDENTIAL || 'openrelayproject';
const turnSecureUrl = process.env.EXPO_PUBLIC_TURNS_SERVER_URL || 'turns:openrelay.metered.ca:443?transport=tcp';

export const RTC_CONFIGURATION = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    },
    {
      urls: turnSecureUrl,
      username: turnUsername,
      credential: turnCredential,
    },
  ],
  iceCandidatePoolSize: 10,
};

class WebRTCManagerWeb {
  private localStream: any = null;
  private peerConnection: any = null;
  private isMuted: boolean = false;
  private isSpeakerOn: boolean = false;
  private targetUserId: string | null = null;
  private connectionState: 'idle' | 'connecting' | 'connected' | 'ended' = 'idle';

  private onRemoteTrackCallback: ((stream: any) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: string) => void) | null = null;

  constructor() {
    console.log('[WebRTC-Web] WebRTCManager initialized for Web platform.');
  }

  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      return true;
    }
  }

  public async initializeAudioSession(): Promise<boolean> {
    return true;
  }

  public async startCall(targetUserId: string): Promise<void> {
    this.targetUserId = targetUserId;
    this.connectionState = 'connecting';
    console.log(`[WebRTC-Web] Initiating Web call to ${targetUserId}`);

    if (typeof window !== 'undefined' && (window as any).RTCPeerConnection) {
      try {
        const PeerConn = (window as any).RTCPeerConnection;
        this.peerConnection = new PeerConn(RTC_CONFIGURATION);
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.localStream.getTracks().forEach((track: any) => {
            this.peerConnection.addTrack(track, this.localStream);
          });
        }

        this.peerConnection.onicecandidate = (event: any) => {
          if (event.candidate) {
            SocketService.emit('webrtc_ice_candidate', { targetId: targetUserId, candidate: event.candidate });
          }
        };

        this.peerConnection.ontrack = (event: any) => {
          if (this.onRemoteTrackCallback && event.streams?.[0]) {
            this.onRemoteTrackCallback(event.streams[0]);
          }
        };

        const offer = await this.peerConnection.createOffer({ offerToReceiveAudio: true });
        await this.peerConnection.setLocalDescription(offer);

        SocketService.emit('webrtc_offer', { targetId: targetUserId, offer });
        return;
      } catch (err) {
        console.error('[WebRTC-Web] Error starting WebRTC call:', err);
      }
    }
  }

  public async handleOffer(senderId: string, offer: any): Promise<void> {
    this.targetUserId = senderId;
    console.log(`[WebRTC-Web] Handling Web offer from ${senderId}`);

    if (typeof window !== 'undefined' && (window as any).RTCPeerConnection) {
      try {
        const PeerConn = (window as any).RTCPeerConnection;
        this.peerConnection = new PeerConn(RTC_CONFIGURATION);
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          this.localStream.getTracks().forEach((track: any) => {
            this.peerConnection.addTrack(track, this.localStream);
          });
        }

        this.peerConnection.onicecandidate = (event: any) => {
          if (event.candidate) {
            SocketService.emit('webrtc_ice_candidate', { targetId: senderId, candidate: event.candidate });
          }
        };

        this.peerConnection.ontrack = (event: any) => {
          if (this.onRemoteTrackCallback && event.streams?.[0]) {
            this.onRemoteTrackCallback(event.streams[0]);
          }
        };

        await this.peerConnection.setRemoteDescription(new ((window as any).RTCSessionDescription)(offer));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        SocketService.emit('webrtc_answer', { targetId: senderId, answer });
        this.connectionState = 'connected';
        this.notifyStateChange('connected');
        return;
      } catch (err) {
        console.error('[WebRTC-Web] Error handling offer:', err);
      }
    }
  }

  public async handleAnswer(answer: any): Promise<void> {
    if (this.peerConnection) {
      try {
        await this.peerConnection.setRemoteDescription(new ((window as any).RTCSessionDescription)(answer));
      } catch (err) {
        console.error('[WebRTC-Web] Error setting remote description:', err);
      }
    }
    this.connectionState = 'connected';
    this.notifyStateChange('connected');
  }

  public async handleIceCandidate(candidate: any): Promise<void> {
    if (this.peerConnection && candidate) {
      try {
        await this.peerConnection.addIceCandidate(new ((window as any).RTCIceCandidate)(candidate));
      } catch (err) {
        console.error('[WebRTC-Web] Error adding ICE candidate:', err);
      }
    }
  }

  public setCallbacks(callbacks: {
    onRemoteTrack?: (stream: any) => void;
    onConnectionStateChange?: (state: string) => void;
  }): void {
    if (callbacks.onRemoteTrack) this.onRemoteTrackCallback = callbacks.onRemoteTrack;
    if (callbacks.onConnectionStateChange) this.onConnectionStateChangeCallback = callbacks.onConnectionStateChange;
  }

  private notifyStateChange(state: string): void {
    if (this.onConnectionStateChangeCallback) {
      this.onConnectionStateChangeCallback(state);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  public toggleSpeaker(useSpeaker: boolean): void {
    this.isSpeakerOn = useSpeaker;
  }

  public endCall(): void {
    if (this.targetUserId) {
      SocketService.emit('end_call', { targetId: this.targetUserId });
    }
    this.cleanup();
  }

  public cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.connectionState = 'ended';
    this.targetUserId = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.notifyStateChange('ended');
  }
}

const WebRTCService = new WebRTCManagerWeb();
export default WebRTCService;
