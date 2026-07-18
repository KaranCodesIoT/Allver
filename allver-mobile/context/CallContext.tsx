import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import SocketService from '../utils/SocketService';
import CallKeepService from '../utils/CallKeepService';

interface CallContextType {
  callState: 'idle' | 'calling' | 'incoming' | 'active';
  callerInfo: {
    callerId: string;
    callerName: string;
    callerAvatar: string;
    conversationId?: string;
  } | null;
  declineIncomingCall: () => void;
  acceptIncomingCall: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'active'>('idle');
  const [callerInfo, setCallerInfo] = useState<{ callerId: string; callerName: string; callerAvatar: string; conversationId?: string } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const callStateRef = useRef(callState);
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const ringtoneSoundRef = useRef<Audio.Sound | null>(null);
  const callTimeoutRef = useRef<any>(null);

  // Poll global user login state to bind/unbind socket listeners
  useEffect(() => {
    const checkUser = () => {
      const user = (global as any).currentUser;
      if (user && user._id) {
        setCurrentUserId(user._id);
      } else {
        setCurrentUserId(null);
      }
    };
    checkUser();
    const interval = setInterval(checkUser, 1000);
    return () => clearInterval(interval);
  }, []);

  const playRingtone = async () => {
    try {
      if (ringtoneSoundRef.current) {
        await ringtoneSoundRef.current.stopAsync();
        await ringtoneSoundRef.current.unloadAsync();
        ringtoneSoundRef.current = null;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldRouteThroughEarpieceIOS: false,
      });
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/phone/telephone-ring-03a.mp3' },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      ringtoneSoundRef.current = sound;
    } catch (err) {
      console.error('[CallContext] Failed to play ringtone:', err);
    }
  };

  const stopRingtone = async () => {
    try {
      if (ringtoneSoundRef.current) {
        await ringtoneSoundRef.current.stopAsync();
        await ringtoneSoundRef.current.unloadAsync();
        ringtoneSoundRef.current = null;
      }
    } catch (err) {
      console.error('[CallContext] Failed to stop ringtone:', err);
    }
  };

  const cleanupCall = () => {
    stopRingtone();
    setCallState('idle');
    setCallerInfo(null);
    CallKeepService.endNativeCall();
    if (callTimeoutRef.current) {
      clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = null;
    }
  };

  const handleDeclineCall = () => {
    if (callerInfo && currentUserId) {
      SocketService.emit('reject_call', {
        callerId: callerInfo.callerId,
        receiverId: currentUserId,
      });
    }
    cleanupCall();
  };

  const handleDeclineCallWithId = (callerId: string) => {
    if (currentUserId) {
      SocketService.emit('reject_call', {
        callerId: callerId,
        receiverId: currentUserId,
      });
    }
    cleanupCall();
  };

  // Track when the incoming call UI was displayed (for time-to-accept measurement)
  const incomingDisplayTimeRef = useRef<number>(0);

  const handleAcceptCall = () => {
    if (!callerInfo || !currentUserId) return;
    const acceptTime = Date.now();
    const timeToAccept = incomingDisplayTimeRef.current ? acceptTime - incomingDisplayTimeRef.current : -1;
    console.log(`[Call] [Stage 7 - Call Accepted] User accepted call from ${callerInfo.callerName} (time-to-accept: ${timeToAccept}ms)`);
    SocketService.emit('answer_call', {
      callerId: callerInfo.callerId,
      receiverId: currentUserId
    });
    const convoId = callerInfo.conversationId;
    cleanupCall();

    router.push({
      pathname: '/chat-room',
      params: {
        receiverId: callerInfo.callerId,
        conversationId: convoId || '',
        name: callerInfo.callerName,
        avatar: callerInfo.callerAvatar,
        autoAcceptCall: 'true',
      },
    });
  };

  useEffect(() => {
    if (!currentUserId) {
      cleanupCall();
      return;
    }

    const handleIncomingCall = (data: any) => {
      const receiveTime = Date.now();
      const serverToClientMs = data.timestamp ? receiveTime - data.timestamp : -1;
      console.log(`[Call] [Latency] Server→Client: ${serverToClientMs}ms | Caller: ${data.callerName} | UUID: ${data.callUUID}`);
      
      if (callStateRef.current !== 'idle') {
        console.log(`[Call] User busy. Emitting busy_call for ${data.callerId}`);
        SocketService.emit('busy_call', { callerId: data.callerId });
        return;
      }

      setCallerInfo({
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        conversationId: data.conversationId || '',
      });
      setCallState('incoming');
      incomingDisplayTimeRef.current = Date.now();
      const displayLatency = incomingDisplayTimeRef.current - receiveTime;
      console.log(`[Call] [Stage 5 - UI Displayed] Overlay shown (display setup: ${displayLatency}ms, total since server emit: ${serverToClientMs + displayLatency}ms)`);
      playRingtone();

      const callUUID = data.callUUID || `call_${data.callerId}_${Date.now()}`;
      CallKeepService.displayIncomingCall(callUUID, data.callerName, data.callerName, data);
      const callKeepLatency = Date.now() - incomingDisplayTimeRef.current;
      console.log(`[Call] [Stage 5b - CallKeep Displayed] Native call UI triggered (${callKeepLatency}ms)`);

      if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
      callTimeoutRef.current = setTimeout(() => {
        console.log('[Global Call] Call unanswered, timing out...');
        handleDeclineCallWithId(data.callerId);
      }, 30000);
    };

    const handleCallEndedGlobal = () => {
      console.log('[Global Call] Call ended from caller');
      cleanupCall();
    };

    SocketService.on('incoming_call', handleIncomingCall);
    SocketService.on('call_ended', handleCallEndedGlobal);

    return () => {
      SocketService.off('incoming_call', handleIncomingCall);
      SocketService.off('call_ended', handleCallEndedGlobal);
    };
  }, [currentUserId]);

  return (
    <CallContext.Provider value={{ callState, callerInfo, acceptIncomingCall: handleAcceptCall, declineIncomingCall: handleDeclineCall }}>
      {children}

      {/* Global Incoming Call Overlay */}
      <Modal
        visible={callState === 'incoming' && !!callerInfo}
        transparent
        animationType="fade"
        onRequestClose={handleDeclineCall}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.avatarGlow}>
              <Image
                source={{ uri: callerInfo?.callerAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop' }}
                style={styles.avatar}
              />
            </View>
            
            <Text style={styles.callerName}>{callerInfo?.callerName}</Text>
            <Text style={styles.callType}>Incoming Voice Call...</Text>
            
            <View style={styles.btnRow}>
              {/* Decline Button */}
              <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={handleDeclineCall} activeOpacity={0.8}>
                <Feather name="phone-off" size={26} color="#FFFFFF" />
              </TouchableOpacity>
              
              {/* Accept Button */}
              <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={handleAcceptCall} activeOpacity={0.8}>
                <Feather name="phone" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)', // Premium dark slate glass overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#1E293B', // Sleek dark card
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarGlow: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#F59E0B', // Amber border glow matching Allver theme
  },
  callerName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  callType: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 36,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 36,
  },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  declineBtn: {
    backgroundColor: '#EF4444', // Red-500
  },
  acceptBtn: {
    backgroundColor: '#10B981', // Emerald-500
  },
});
