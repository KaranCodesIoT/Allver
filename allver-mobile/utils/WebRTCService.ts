/**
 * WebRTCService — Singleton managing WebRTC peer connections for video calling
 * 
 * Uses react-native-webrtc for native WebRTC APIs and Socket.IO for signaling.
 * Designed for 1:1 calls with architecture ready for group calling.
 */

import SocketService from './SocketService';

// Safely require react-native-webrtc
let RTCPeerConnection: any = null;
let RTCSessionDescription: any = null;
let RTCIceCandidate: any = null;
let mediaDevices: any = null;
let MediaStream: any = null;
let isWebRTCAvailable = false;

try {
  const WebRTC = require('react-native-webrtc');
  RTCPeerConnection = WebRTC.RTCPeerConnection;
  RTCSessionDescription = WebRTC.RTCSessionDescription;
  RTCIceCandidate = WebRTC.RTCIceCandidate;
  mediaDevices = WebRTC.mediaDevices;
  MediaStream = WebRTC.MediaStream;
  isWebRTCAvailable = true;
} catch (e) {
  console.warn('[WebRTCService] react-native-webrtc is not available. Call features will be disabled.');
}

export { isWebRTCAvailable };

// ICE server configuration — Google STUN + optional TURN
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export type CallState = 
  | 'idle'
  | 'ringing'       // Outgoing call ringing
  | 'incoming'      // Incoming call ringing
  | 'connecting'    // SDP exchange in progress
  | 'connected'     // Media streaming
  | 'reconnecting'  // ICE restart / network interruption
  | 'ended';        // Call finished

export interface CallEventCallbacks {
  onRemoteStream: (stream: MediaStream) => void;
  onLocalStream: (stream: MediaStream) => void;
  onCallStateChange: (state: CallState) => void;
  onCallEnded: (reason: string) => void;
  onError: (error: string) => void;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callbacks: CallEventCallbacks | null = null;
  private callState: CallState = 'idle';
  private currentCallId: string | null = null;
  private currentTargetId: string | null = null;
  private currentUserId: string | null = null;
  private iceCandidateQueue: RTCIceCandidate[] = [];
  private isFrontCamera: boolean = true;
  private isMuted: boolean = false;
  private isCameraOff: boolean = false;
  private callStartTime: number = 0;

  /**
   * Set event callbacks
   */
  public setCallbacks(callbacks: CallEventCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Get current call state
   */
  public getCallState(): CallState {
    return this.callState;
  }

  /**
   * Get current call ID
   */
  public getCallId(): string | null {
    return this.currentCallId;
  }

  /**
   * Get call duration in seconds
   */
  public getCallDuration(): number {
    if (this.callStartTime === 0) return 0;
    return Math.floor((Date.now() - this.callStartTime) / 1000);
  }

  private setCallState(state: CallState): void {
    this.callState = state;
    this.callbacks?.onCallStateChange(state);
  }

  /**
   * Get local media stream (camera + microphone)
   */
  public async getLocalMediaStream(videoEnabled: boolean = true): Promise<MediaStream> {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: videoEnabled ? {
          facingMode: this.isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        } : false,
      });
      this.localStream = stream as MediaStream;
      this.callbacks?.onLocalStream(this.localStream);
      return this.localStream;
    } catch (error) {
      console.error('[WebRTCService] Failed to get local media:', error);
      throw error;
    }
  }

  /**
   * Create peer connection and set up event handlers
   */
  private createPeerConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event: any) => {
      console.log('[WebRTCService] Remote track received');
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0] as MediaStream;
        this.callbacks?.onRemoteStream(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event: any) => {
      if (event.candidate && this.currentTargetId && this.currentCallId) {
        SocketService.emit('video_ice_candidate', {
          targetId: this.currentTargetId,
          candidate: event.candidate,
          callId: this.currentCallId,
        });
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTCService] Connection state:', state);

      switch (state) {
        case 'connected':
          this.setCallState('connected');
          this.callStartTime = Date.now();
          break;
        case 'disconnected':
          this.setCallState('reconnecting');
          break;
        case 'failed':
          this.callbacks?.onError('Connection failed');
          this.endCall('connection_failed');
          break;
        case 'closed':
          if (this.callState !== 'ended' && this.callState !== 'idle') {
            this.endCall('connection_closed');
          }
          break;
      }
    };

    // Handle ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('[WebRTCService] ICE connection state:', state);

      if (state === 'failed') {
        // Try ICE restart
        console.log('[WebRTCService] ICE failed, attempting restart...');
        this.peerConnection?.restartIce();
      }
    };
  }

  /**
   * Start an outgoing call
   */
  public async startCall(
    userId: string,
    targetId: string,
    targetName: string,
    targetAvatar: string,
    callerName: string,
    callerAvatar: string,
  ): Promise<void> {
    if (this.callState !== 'idle') {
      console.warn('[WebRTCService] Cannot start call, already in state:', this.callState);
      return;
    }

    this.currentUserId = userId;
    this.currentTargetId = targetId;
    this.setCallState('ringing');

    try {
      // Get local media
      await this.getLocalMediaStream(true);

      // Emit initiate event via socket
      SocketService.emit('initiate_video_call', {
        callerId: userId,
        receiverId: targetId,
        callerName,
        callerAvatar,
      });

      // Set up socket listeners for call responses
      this.setupCallerListeners();
    } catch (error: any) {
      console.error('[WebRTCService] Failed to start call:', error);
      this.callbacks?.onError(error.message || 'Failed to start call');
      this.cleanup();
    }
  }

  /**
   * Set up socket listeners for the caller
   */
  private setupCallerListeners(): void {
    // Call answered — start WebRTC offer
    SocketService.on('video_call_answered', async (data: any) => {
      console.log('[WebRTCService] Call answered, creating offer...');
      this.currentCallId = data.callId;
      this.setCallState('connecting');

      this.createPeerConnection();

      try {
        const offer = await this.peerConnection!.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        } as any);
        await this.peerConnection!.setLocalDescription(offer);

        SocketService.emit('video_call_offer', {
          targetId: this.currentTargetId,
          offer: offer,
          callId: this.currentCallId,
        });
      } catch (error: any) {
        console.error('[WebRTCService] Failed to create offer:', error);
        this.callbacks?.onError('Failed to establish connection');
        this.endCall('offer_failed');
      }
    });

    // Call rejected
    SocketService.on('video_call_rejected', (_data: any) => {
      console.log('[WebRTCService] Call rejected');
      this.callbacks?.onCallEnded('declined');
      this.cleanup();
    });

    // User unavailable
    SocketService.on('video_call_unavailable', (_data: any) => {
      console.log('[WebRTCService] User unavailable');
      this.callbacks?.onCallEnded('unavailable');
      this.cleanup();
    });

    // User busy
    SocketService.on('video_call_busy', (_data: any) => {
      console.log('[WebRTCService] User busy');
      this.callbacks?.onCallEnded('busy');
      this.cleanup();
    });

    // SDP answer from callee
    SocketService.on('video_call_answer', async (data: any) => {
      console.log('[WebRTCService] Received SDP answer');
      try {
        if (this.peerConnection) {
          const answer = new RTCSessionDescription(data.answer);
          await this.peerConnection.setRemoteDescription(answer);

          // Process queued ICE candidates
          for (const candidate of this.iceCandidateQueue) {
            await this.peerConnection.addIceCandidate(candidate);
          }
          this.iceCandidateQueue = [];
        }
      } catch (error) {
        console.error('[WebRTCService] Failed to set remote description:', error);
      }
    });

    // ICE candidates
    SocketService.on('video_ice_candidate', async (data: any) => {
      try {
        const candidate = new RTCIceCandidate(data.candidate);
        if (this.peerConnection?.remoteDescription) {
          await this.peerConnection.addIceCandidate(candidate);
        } else {
          this.iceCandidateQueue.push(candidate);
        }
      } catch (error) {
        console.error('[WebRTCService] Failed to add ICE candidate:', error);
      }
    });

    // Call ended by other party
    SocketService.on('video_call_ended', (_data: any) => {
      console.log('[WebRTCService] Call ended by remote party');
      this.callbacks?.onCallEnded('remote_ended');
      this.cleanup();
    });
  }

  /**
   * Handle incoming call — called from global layout listener
   */
  public async handleIncomingCall(
    callId: string,
    callerId: string,
    userId: string,
  ): Promise<void> {
    this.currentCallId = callId;
    this.currentTargetId = callerId;
    this.currentUserId = userId;

    try {
      // Get local media
      await this.getLocalMediaStream(true);
      this.setCallState('connecting');

      // Answer the call via socket
      SocketService.emit('answer_video_call', {
        callId,
        callerId,
        receiverId: userId,
      });

      // Set up peer connection
      this.createPeerConnection();

      // Listen for SDP offer
      this.setupCalleeListeners();
    } catch (error: any) {
      console.error('[WebRTCService] Failed to handle incoming call:', error);
      this.callbacks?.onError(error.message || 'Failed to access camera/microphone');
      this.endCall('media_error');
    }
  }

  /**
   * Set up socket listeners for the callee
   */
  private setupCalleeListeners(): void {
    // SDP offer from caller
    SocketService.on('video_call_offer', async (data: any) => {
      console.log('[WebRTCService] Received SDP offer');
      try {
        if (this.peerConnection) {
          const offer = new RTCSessionDescription(data.offer);
          await this.peerConnection.setRemoteDescription(offer);

          // Process queued ICE candidates
          for (const candidate of this.iceCandidateQueue) {
            await this.peerConnection.addIceCandidate(candidate);
          }
          this.iceCandidateQueue = [];

          // Create answer
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);

          SocketService.emit('video_call_answer', {
            targetId: this.currentTargetId,
            answer: answer,
            callId: this.currentCallId,
          });
        }
      } catch (error) {
        console.error('[WebRTCService] Failed to handle offer:', error);
        this.callbacks?.onError('Failed to establish connection');
      }
    });

    // ICE candidates
    SocketService.on('video_ice_candidate', async (data: any) => {
      try {
        const candidate = new RTCIceCandidate(data.candidate);
        if (this.peerConnection?.remoteDescription) {
          await this.peerConnection.addIceCandidate(candidate);
        } else {
          this.iceCandidateQueue.push(candidate);
        }
      } catch (error) {
        console.error('[WebRTCService] Failed to add ICE candidate:', error);
      }
    });

    // Call ended by other party
    SocketService.on('video_call_ended', (_data: any) => {
      console.log('[WebRTCService] Call ended by remote party');
      this.callbacks?.onCallEnded('remote_ended');
      this.cleanup();
    });
  }

  /**
   * End the current call
   */
  public endCall(reason: string = 'local_ended'): void {
    const duration = this.getCallDuration();

    if (this.currentTargetId && this.currentCallId) {
      SocketService.emit('end_video_call', {
        callId: this.currentCallId,
        targetId: this.currentTargetId,
        duration,
      });
    }

    this.callbacks?.onCallEnded(reason);
    this.cleanup();
  }

  /**
   * Decline an incoming call
   */
  public declineCall(callId: string, callerId: string, userId: string): void {
    SocketService.emit('reject_video_call', {
      callId,
      callerId,
      receiverId: userId,
    });
    this.cleanup();
  }

  /**
   * Toggle microphone mute
   */
  public toggleMute(): boolean {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track: any) => {
        track.enabled = !track.enabled;
      });
      this.isMuted = !this.isMuted;
    }
    return this.isMuted;
  }

  /**
   * Toggle camera on/off
   */
  public toggleCamera(): boolean {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach((track: any) => {
        track.enabled = !track.enabled;
      });
      this.isCameraOff = !this.isCameraOff;
    }
    return this.isCameraOff;
  }

  /**
   * Switch front/rear camera
   */
  public async switchCamera(): Promise<void> {
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const track = videoTracks[0] as any;
        if (track._switchCamera) {
          track._switchCamera();
          this.isFrontCamera = !this.isFrontCamera;
        }
      }
    }
  }

  /**
   * Get mute state
   */
  public getMuteState(): boolean {
    return this.isMuted;
  }

  /**
   * Get camera state
   */
  public getCameraState(): boolean {
    return this.isCameraOff;
  }

  /**
   * Clean up all resources
   */
  private cleanup(): void {
    console.log('[WebRTCService] Cleaning up resources...');

    // Remove socket listeners
    SocketService.off('video_call_answered');
    SocketService.off('video_call_rejected');
    SocketService.off('video_call_unavailable');
    SocketService.off('video_call_busy');
    SocketService.off('video_call_offer');
    SocketService.off('video_call_answer');
    SocketService.off('video_ice_candidate');
    SocketService.off('video_call_ended');

    // Stop local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: any) => {
        track.stop();
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.iceCandidateQueue = [];
    this.currentCallId = null;
    this.currentTargetId = null;
    this.callStartTime = 0;
    this.isMuted = false;
    this.isCameraOff = false;
    this.isFrontCamera = true;

    this.setCallState('idle');
  }

  /**
   * Force cleanup without emitting events (e.g. on app close)
   */
  public forceCleanup(): void {
    this.cleanup();
  }
}

export default new WebRTCService();
