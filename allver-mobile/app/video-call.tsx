import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import WebRTCService, { CallState, isWebRTCAvailable } from '../utils/WebRTCService';
import { BACKEND_URL } from '../constants/Config';

// Safely require RTCView
let RTCView: any = View;
if (isWebRTCAvailable) {
  try {
    const WebRTC = require('react-native-webrtc');
    RTCView = WebRTC.RTCView;
  } catch (e) {}
}

const { width, height } = Dimensions.get('window');

const COLORS = {
  bg: '#0F172A',
  bgOverlay: 'rgba(15, 23, 42, 0.85)',
  white: '#FFFFFF',
  green: '#22C55E',
  red: '#EF4444',
  blue: '#3B82F6',
  textMuted: 'rgba(255,255,255,0.6)',
  controlBg: 'rgba(255,255,255,0.15)',
  controlBgActive: 'rgba(255,255,255,0.95)',
};

export default function VideoCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const receiverId = params.receiverId as string;
  const receiverName = params.receiverName as string || 'User';
  const receiverAvatar = params.receiverAvatar as string || '';
  const callType = params.callType as string || 'outgoing'; // 'outgoing' | 'incoming'
  const callId = params.callId as string || '';
  const callerId = params.callerId as string || '';

  const [callState, setCallState] = useState<CallState>(callType === 'incoming' ? 'connecting' : 'ringing');
  const [localStreamURL, setLocalStreamURL] = useState<string | null>(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const callTimerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsTimeoutRef = useRef<any>(null);
  const hasEndedRef = useRef(false);

  const currentUser = (global as any).currentUser;

  // Pulse animation for ringing state
  useEffect(() => {
    if (callState === 'ringing' || callState === 'connecting') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [callState]);

  // Call duration timer
  useEffect(() => {
    if (callState === 'connected') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState]);

  // Auto-hide controls after 5s when connected
  useEffect(() => {
    if (callState === 'connected' && showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [callState, showControls]);

  // Set up WebRTC callbacks and start/accept call
  useEffect(() => {
    if (!isWebRTCAvailable) return;

    WebRTCService.setCallbacks({
      onLocalStream: (stream: any) => {
        console.log('[VideoCall] Local stream received');
        setLocalStreamURL(stream.toURL());
      },
      onRemoteStream: (stream: any) => {
        console.log('[VideoCall] Remote stream received');
        setRemoteStreamURL(stream.toURL());
      },
      onCallStateChange: (state: CallState) => {
        console.log('[VideoCall] State changed to:', state);
        setCallState(state);
      },
      onCallEnded: (reason: string) => {
        console.log('[VideoCall] Call ended, reason:', reason);
        handleCallEnded(reason);
      },
      onError: (error: string) => {
        console.error('[VideoCall] Error:', error);
        Alert.alert('Call Error', error);
      },
    });

    // Enable speaker mode
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    if (callType === 'outgoing') {
      // Start outgoing call
      WebRTCService.startCall(
        currentUser._id,
        receiverId,
        receiverName,
        receiverAvatar,
        currentUser.fullName,
        currentUser.avatarUrl || '',
      );
    } else {
      // Handle incoming call
      WebRTCService.handleIncomingCall(
        callId,
        callerId,
        currentUser._id,
      );
    }

    return () => {
      // Cleanup on unmount
      if (!hasEndedRef.current) {
        WebRTCService.endCall('screen_closed');
      }
    };
  }, []);

  const handleCallEnded = useCallback((reason: string) => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;

    if (callTimerRef.current) clearInterval(callTimerRef.current);

    setCallState('ended');

    let message = '';
    switch (reason) {
      case 'declined': message = 'Call was declined'; break;
      case 'unavailable': message = 'User is currently unavailable'; break;
      case 'busy': message = 'User is on another call'; break;
      case 'remote_ended': message = 'Call ended'; break;
      case 'connection_failed': message = 'Connection failed'; break;
      default: message = 'Call ended';
    }

    // Brief delay before navigating back
    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }, 1500);
  }, [router]);

  const handleEndCall = () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    WebRTCService.endCall('local_ended');
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    setTimeout(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    }, 500);
  };

  const handleToggleMute = () => {
    const muted = WebRTCService.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleCamera = () => {
    const off = WebRTCService.toggleCamera();
    setIsCameraOff(off);
  };

  const handleSwitchCamera = () => {
    WebRTCService.switchCamera();
  };

  const handleToggleSpeaker = async () => {
    const newSpeaker = !isSpeakerOn;
    setIsSpeakerOn(newSpeaker);
    // expo-av speaker mode toggle
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });
  };

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callState) {
      case 'ringing': return 'Ringing...';
      case 'connecting': return 'Connecting...';
      case 'connected': return formatTimer(callDuration);
      case 'reconnecting': return 'Reconnecting...';
      case 'ended': return 'Call Ended';
      default: return '';
    }
  };

  const handleScreenTap = () => {
    if (callState === 'connected') {
      setShowControls(!showControls);
    }
  };

  if (!isWebRTCAvailable) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <View style={styles.avatarSection}>
          <View style={[styles.pulseRing, { borderColor: COLORS.red }]} />
          <Image
            source={{ uri: receiverAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' }}
            style={styles.waitingAvatar}
          />
        </View>
        <Text style={[styles.waitingName, { textAlign: 'center' }]}>{receiverName}</Text>
        
        <View style={{ backgroundColor: 'rgba(239,68,68,0.1)', padding: 18, borderRadius: 16, borderHorizontalWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginVertical: 20, width: '100%' }}>
          <Text style={{ color: COLORS.red, fontWeight: '700', fontSize: 16, textAlign: 'center', marginBottom: 8 }}>
            WebRTC Native Module Missing
          </Text>
          <Text style={{ color: '#E2E8F0', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            In-app calling requires a custom development client compilation to run WebRTC native code. It is not supported in Expo Go.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.endCallBtn, { width: 140, height: 50, borderRadius: 25, flexDirection: 'row', gap: 8 }]} 
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* ===== REMOTE VIDEO (Full Screen) ===== */}
      {remoteStreamURL && callState === 'connected' ? (
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleScreenTap}
          style={styles.remoteVideoContainer}
        >
          <RTCView
            streamURL={remoteStreamURL}
            style={styles.remoteVideo}
            objectFit="cover"
            mirror={false}
          />
        </TouchableOpacity>
      ) : (
        // Ringing / Connecting / No video state
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleScreenTap}
          style={styles.waitingContainer}
        >
          {/* Background gradient */}
          <View style={styles.waitingBg} />

          {/* Avatar with pulse ring */}
          <View style={styles.avatarSection}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
            <Animated.View style={[styles.pulseRingOuter, { transform: [{ scale: pulseAnim }], opacity: 0.3 }]} />
            <Image
              source={{ uri: receiverAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' }}
              style={styles.waitingAvatar}
            />
          </View>
          <Text style={styles.waitingName}>{receiverName}</Text>
          <Text style={styles.waitingStatus}>{getStatusText()}</Text>

          {callState === 'ended' && (
            <View style={styles.endedBadge}>
              <Feather name="phone-off" size={16} color={COLORS.red} />
              <Text style={styles.endedText}>Call Ended</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* ===== LOCAL VIDEO (Picture-in-Picture) ===== */}
      {localStreamURL && !isCameraOff && callState !== 'ended' && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={localStreamURL}
            style={styles.localVideo}
            objectFit="cover"
            mirror={true}
            zOrder={1}
          />
        </View>
      )}

      {/* ===== TOP BAR ===== */}
      {(showControls || callState !== 'connected') && callState !== 'ended' && (
        <SafeAreaView style={styles.topBar} edges={['top']}>
          <View style={styles.topBarContent}>
            <View style={styles.encryptedBadge}>
              <Feather name="shield" size={12} color={COLORS.textMuted} />
              <Text style={styles.encryptedText}>End-To-End Encrypted</Text>
            </View>
            {callState === 'connected' && (
              <TouchableOpacity style={styles.minimizeBtn} onPress={handleEndCall}>
                <Feather name="minimize-2" size={20} color={COLORS.white} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      )}

      {/* ===== RECONNECTING OVERLAY ===== */}
      {callState === 'reconnecting' && (
        <View style={styles.reconnectingOverlay}>
          <Ionicons name="wifi-outline" size={32} color={COLORS.white} />
          <Text style={styles.reconnectingText}>Reconnecting...</Text>
          <Text style={styles.reconnectingSubtext}>Please check your internet connection</Text>
        </View>
      )}

      {/* ===== BOTTOM CONTROLS ===== */}
      {(showControls || callState !== 'connected') && callState !== 'ended' && (
        <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
          <View style={styles.controlsRow}>
            {/* Camera toggle */}
            <TouchableOpacity
              style={[styles.controlBtn, isCameraOff && styles.controlBtnActive]}
              onPress={handleToggleCamera}
            >
              <Feather
                name={isCameraOff ? 'camera-off' : 'camera'}
                size={22}
                color={isCameraOff ? COLORS.bg : COLORS.white}
              />
              <Text style={[styles.controlLabel, isCameraOff && styles.controlLabelActive]}>Camera</Text>
            </TouchableOpacity>

            {/* Mute toggle */}
            <TouchableOpacity
              style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
              onPress={handleToggleMute}
            >
              <Feather
                name={isMuted ? 'mic-off' : 'mic'}
                size={22}
                color={isMuted ? COLORS.bg : COLORS.white}
              />
              <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>Mute</Text>
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity
              style={styles.endCallBtn}
              onPress={handleEndCall}
            >
              <Feather name="phone-off" size={26} color={COLORS.white} />
            </TouchableOpacity>

            {/* Switch camera */}
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={handleSwitchCamera}
            >
              <Ionicons name="camera-reverse-outline" size={24} color={COLORS.white} />
              <Text style={styles.controlLabel}>Flip</Text>
            </TouchableOpacity>

            {/* Speaker toggle */}
            <TouchableOpacity
              style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
              onPress={handleToggleSpeaker}
            >
              <Feather
                name={isSpeakerOn ? 'volume-2' : 'volume-x'}
                size={22}
                color={isSpeakerOn ? COLORS.bg : COLORS.white}
              />
              <Text style={[styles.controlLabel, isSpeakerOn && styles.controlLabelActive]}>Speaker</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // Remote video
  remoteVideoContainer: {
    flex: 1,
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  // Local PiP video
  localVideoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 10,
  },
  localVideo: {
    width: '100%',
    height: '100%',
  },

  // Waiting state (ringing/connecting)
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.bg,
  },
  avatarSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: COLORS.green,
  },
  pulseRingOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.green,
  },
  waitingAvatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  waitingName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  waitingStatus: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  endedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(239,68,68,0.15)',
    gap: 8,
  },
  endedText: {
    color: COLORS.red,
    fontSize: 14,
    fontWeight: '600',
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  encryptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  encryptedText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  minimizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.controlBg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Reconnecting overlay
  reconnectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
  },
  reconnectingText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
  },
  reconnectingSubtext: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 6,
  },

  // Bottom controls
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingBottom: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.controlBg,
  },
  controlBtnActive: {
    backgroundColor: COLORS.controlBgActive,
  },
  controlLabel: {
    fontSize: 9,
    color: COLORS.white,
    marginTop: 2,
    fontWeight: '500',
  },
  controlLabelActive: {
    color: COLORS.bg,
  },
  endCallBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.red,
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
