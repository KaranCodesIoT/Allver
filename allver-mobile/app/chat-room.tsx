import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Dimensions, Alert, Modal, Linking, ScrollView, Animated, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SocketService from '../utils/SocketService';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import TransliteratedTextInput from '../components/TransliteratedTextInput';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';
import { useUnreadMessages } from '../context/UnreadMessageContext';
import { useTranslation } from '../utils/i18n';

const { width } = Dimensions.get('window');

const COLORS = {
  white: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  bgLight: '#F8FAFC',
  green: '#22C55E',
  tickBlue: '#53BDEB',
  blue: '#2563EB',
  orange: '#F59E0B',
  amber: '#F59E0B',
  amberDark: '#D97706',
  yellow: '#F59E0B',
  yellowLight: '#FEF3C7',
  border: '#E2E8F0',
  chatBg: '#F8FAFC',
  outgoing: '#FFF7ED',
  outgoingText: '#1E293B',
  incoming: '#FFFFFF',
  headerBg: '#FFFFFF',
};

import { BACKEND_URL } from '../constants/Config';

interface Message {
  _id: string;
  tempId?: string;
  sender: {
    _id: string;
    fullName: string;
    role: string;
    avatarUrl?: string;
  } | string;
  text: string;
  attachment?: {
    name: string;
    url: string;
    type: string; // 'image', 'file', 'pdf', 'voice'
    duration?: number; // voice message duration in seconds
  };
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  readBy?: string[];
  createdAt: string;
}

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { refreshUnreadMsgCount } = useUnreadMessages();
  const { i18n } = useTranslation();

  const receiverId = params.receiverId as string;
  const receiverName = (params.name as string) || 'User';
  const receiverRole = (params.role as string) || '';
  const receiverAvatar = (params.avatar as string) || '';
  const passedConversationId = params.conversationId as string;

  const [currentUser, setCurrentUser] = useState<any>({ _id: 'default-user-id', fullName: 'You', role: 'User' });
  const [conversationId, setConversationId] = useState<string | null>(passedConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [workspace, setWorkspace] = useState<any>(null);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<any>(null);
  const initialDesignSentRef = useRef(false);

  // Voice recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Speech-to-Text state
  const [showSttModal, setShowSttModal] = useState(false);
  const [selectedSttLang, setSelectedSttLang] = useState<{ code: string; name: string } | null>(null);
  const [isSttRecording, setIsSttRecording] = useState(false);
  const [sttRecording, setSttRecording] = useState<Audio.Recording | null>(null);
  const [sttDuration, setSttDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const sttTimerRef = useRef<any>(null);
  const webSpeechRecRef = useRef<any>(null);


  // Voice playback state
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);

  // In-app calling state
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'active'>(
    params.autoAcceptCall === 'true' ? 'active' : 'idle'
  );
  const [callerInfo, setCallerInfo] = useState<{ callerId: string; callerName: string; callerAvatar: string } | null>(
    params.autoAcceptCall === 'true'
      ? { callerId: receiverId, callerName: receiverName, callerAvatar: receiverAvatar }
      : null
  );
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);

  const callStateRef = useRef<string>('idle');
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    let timerInterval: any = null;
    if (callState === 'active') {
      setCallTimer(0);
      timerInterval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [callState]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Sync conversationId to global state for push notification filtering
  useEffect(() => {
    (global as any).activeChatRoomId = conversationId;
    return () => {
      (global as any).activeChatRoomId = null;
    };
  }, [conversationId]);

  // 1. Load current user
  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) { try { user = JSON.parse(stored); } catch (e) {} }
    }
    if (user) setCurrentUser(user);
  }, []);

  // 2. Create or find conversation
  useEffect(() => {
    if (currentUser._id === 'default-user-id') return;
    const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

    const initChat = async () => {
      setIsLoading(true);
      try {
        let convoId = conversationId;
        
        // 1. Check if receiverId is a Workspace ID first
        let isWorkspace = false;
        let fetchedWorkspace = null;
        if (isValidObjectId(receiverId)) {
          try {
            const workspaceRes = await fetch(`${BACKEND_URL}/api/project-workspaces/${receiverId}?userId=${currentUser._id}`);
            if (workspaceRes.ok) {
              const workspaceData = await workspaceRes.json();
              if (workspaceData.workspace) {
                isWorkspace = true;
                fetchedWorkspace = workspaceData.workspace;
              }
            }
          } catch (e) {
            console.log('Error checking if workspace:', e);
          }
        }

        if (isWorkspace && fetchedWorkspace) {
          setWorkspace(fetchedWorkspace);
          setConversationId(receiverId); // Use workspaceId as conversationId
          
          if (fetchedWorkspace.messages) {
            const uniqueMessages: Message[] = [];
            const seenIds = new Set<string>();
            fetchedWorkspace.messages.forEach((m: any) => {
              if (m && (m._id || m.tempId)) {
                const id = m._id || m.tempId;
                if (!seenIds.has(id)) {
                  seenIds.add(id);
                  uniqueMessages.push(m);
                }
              }
            });
            setMessages(uniqueMessages);
          }
        } else {
          // Standard DM conversation initialization
          if (!convoId && receiverId) {
            if (!isValidObjectId(currentUser._id) || !isValidObjectId(receiverId)) {
              Alert.alert('Cannot Message', 'This is a demo profile. Messaging is available only with real registered users.', [{ text: 'OK', onPress: () => router.back() }]);
              setIsLoading(false);
              return;
            }
            const res = await fetch(`${BACKEND_URL}/api/conversations`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ senderId: currentUser._id, receiverId })
            });
            const data = await res.json();
            if (res.ok && data.conversation) {
              convoId = data.conversation._id;
              setConversationId(convoId);
            } else {
              Alert.alert('Error', data.message || 'Could not start conversation.');
              setIsLoading(false);
              return;
            }
          }
          if (convoId) {
            const msgRes = await fetch(`${BACKEND_URL}/api/conversations/${convoId}/messages?userId=${currentUser._id}`);
            const msgData = await msgRes.json();
            if (msgRes.ok && msgData.messages) {
              // Filter out duplicate message IDs to prevent FlatList crashes
              const uniqueMessages: Message[] = [];
              const seenIds = new Set<string>();
              msgData.messages.forEach((m: any) => {
                if (m && (m._id || m.tempId)) {
                  const id = m._id || m.tempId;
                  if (!seenIds.has(id)) {
                    seenIds.add(id);
                    uniqueMessages.push(m);
                  }
                }
              });
              setMessages(uniqueMessages);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing chat:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, [currentUser._id, receiverId]);

  // Load active project workspace context dynamically
  useEffect(() => {
    if (currentUser._id === 'default-user-id') return;
    const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

    const loadWorkspace = async () => {
      try {
        // If this is a workspace chat (receiverId is the workspace ID), we already loaded it in initChat
        if (workspace && workspace._id === receiverId) return;

        // Try fetching receiverId directly if it's a valid workspace ID
        if (isValidObjectId(receiverId)) {
          const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${receiverId}?userId=${currentUser._id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.workspace) {
              setWorkspace(data.workspace);
              return;
            }
          }
        }
        
        // Fetch all workspaces and filter by participant
        const resList = await fetch(`${BACKEND_URL}/api/project-workspaces/user/${currentUser._id}`);
        if (resList.ok) {
          const dataList = await resList.json();
          if (dataList.workspaces) {
            const found = dataList.workspaces.find((w: any) => 
              (w.client?._id === receiverId || w.client === receiverId ||
               w.professional?._id === receiverId || w.professional === receiverId ||
               w.contractor?._id === receiverId || w.contractor === receiverId ||
               w.architect?._id === receiverId || w.architect === receiverId)
            );
            if (found) {
              setWorkspace(found);
            }
          }
        }
      } catch (err) {
        console.error('Error loading workspace context:', err);
      }
    };
    loadWorkspace();
  }, [currentUser._id, receiverId, workspace?._id]);

  // Track mapping of tempId → real MongoDB _id to prevent duplicates
  const sentMessageIdsRef = useRef<Set<string>>(new Set());

  // 3. Socket.io
  useEffect(() => {
    if (!conversationId) return;
    const s = SocketService;
    setSocket(s);

    const markAsRead = async () => {
      if (conversationId && currentUser?._id && !workspace) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/conversations/${conversationId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id }),
          });
          if (res.ok) {
            refreshUnreadMsgCount();
          }
        } catch (err) {
          console.log('[ChatRoom] Error marking as read:', err);
        }
      }
    };

    // Join room & mark read initially
    s.emit('join_room', { roomId: conversationId });
    markAsRead();
    
    // Query if the other user is online initially
    s.emit('check_online', { userId: receiverId }, (res: any) => {
      if (res && typeof res.isOnline === 'boolean') {
        setOtherUserOnline(res.isOnline);
      }
    });

    const handleReceiveMessage = (data: any) => {
      if (data.workspaceId === conversationId) {
        const msgSender = data.message?.sender;
        const msgSenderId = msgSender && typeof msgSender === 'object' 
          ? msgSender._id 
          : msgSender;
        
        // Skip our own messages — we already added them optimistically
        // The REST response handler already updates tempId→realId correctly
        if (msgSenderId === currentUser._id) {
          // Just track this real _id so we never add it as a duplicate
          if (data.message._id) {
            sentMessageIdsRef.current.add(data.message._id);
          }
          return;
        }

        // Other user's message — add if not duplicate
        if (!data.message || !data.message._id) return;
        setMessages((prev) => {
          if (prev.some(m => m._id === data.message._id)) return prev;
          // Also skip if we already tracked this as our own sent message
          if (sentMessageIdsRef.current.has(data.message._id)) return prev;
          return [...prev, { ...data.message, status: 'delivered' }];
        });

        // Mark as read immediately on receiving message since we are in the chat room
        markAsRead();
      }
    };

    const handleUserTyping = ({ userId }: { userId: string }) => {
      if (userId !== currentUser._id) setIsTyping(true);
    };

    const handleUserStopTyping = ({ userId }: { userId: string }) => {
      if (userId !== currentUser._id) setIsTyping(false);
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      if (userId === receiverId) setOtherUserOnline(true);
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      if (userId === receiverId) setOtherUserOnline(false);
    };

    const handleMessagesRead = (data: any) => {
      if (data && data.conversationId === conversationId && data.userId !== currentUser._id) {
        console.log('[ChatRoom] Other user read our messages:', data.userId);
        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.readBy?.includes(data.userId)) {
              return {
                ...msg,
                readBy: [...(msg.readBy || []), data.userId],
                status: 'read'
              };
            }
            return msg;
          })
        );
      }
    };

    const handleMessageDelivered = (data: any) => {
      if (data && data.roomId === conversationId && data.userId !== currentUser._id) {
        console.log('[ChatRoom] Message delivered to other user:', data.messageId);
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg._id === data.messageId && msg.status !== 'read') {
              return { ...msg, status: 'delivered' };
            }
            return msg;
          })
        );
      }
    };

    const handleReconnect = () => {
      console.log('[ChatRoom] Socket reconnected. Re-joining room and syncing message history...');
      s.emit('join_room', { roomId: conversationId });
      markAsRead();

      if (conversationId && !workspace) {
        fetch(`${BACKEND_URL}/api/conversations/${conversationId}/messages?userId=${currentUser._id}`)
          .then(res => res.json())
          .then(msgData => {
            if (msgData.messages) {
              const uniqueMessages: Message[] = [];
              const seenIds = new Set<string>();
              msgData.messages.forEach((m: any) => {
                if (m && (m._id || m.tempId)) {
                  const id = m._id || m.tempId;
                  if (!seenIds.has(id)) {
                    seenIds.add(id);
                    uniqueMessages.push(m);
                  }
                }
              });
              setMessages(uniqueMessages);
            }
          })
          .catch(err => console.error('[ChatRoom] Error syncing messages on reconnect:', err));
      }
    };

    const handleIncomingCall = (data: any) => {
      console.log('[Socket] Incoming call from:', data.callerName);
      if (callStateRef.current !== 'idle') {
        s.emit('busy_call', { callerId: data.callerId });
        return;
      }
      setCallerInfo({
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar
      });
      setCallState('incoming');
    };

    const handleCallAnswered = (data: any) => {
      console.log('[Socket] Call answered by:', data.receiverId);
      setCallState('active');
    };

    const handleCallRejected = (data: any) => {
      console.log('[Socket] Call rejected by:', data.receiverId);
      setCallState('idle');
      setCallerInfo(null);
      Alert.alert('Call Declined', `${receiverName} declined your call.`);
    };

    const handleCallBusy = () => {
      console.log('[Socket] Target is busy');
      setCallState('idle');
      setCallerInfo(null);
      Alert.alert('User Busy', `${receiverName} is currently in another call.`);
    };

    const handleCallEnded = () => {
      console.log('[Socket] Call ended');
      setCallState('idle');
      setCallerInfo(null);
      Alert.alert('Call Ended', 'The call has ended.');
    };

    const handleReceiveVoiceChunk = async (data: any) => {
      console.log('[Socket] Received voice chunk');
      if (data && data.base64Data) {
        try {
          const tempFilename = `${FileSystem.cacheDirectory}call_chunk_${Date.now()}_${Math.random().toString(36).substring(7)}.m4a`;
          await FileSystem.writeAsStringAsync(tempFilename, data.base64Data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          voiceQueueRef.current.push(tempFilename);
          playNextInVoiceQueue();
        } catch (err) {
          console.error('[Socket] Failed to write incoming voice chunk:', err);
        }
      } else if (data && data.url) {
        voiceQueueRef.current.push(data.url);
        playNextInVoiceQueue();
      }
    };

    s.on('receive_message', handleReceiveMessage);
    s.on('user_typing', handleUserTyping);
    s.on('user_stop_typing', handleUserStopTyping);
    s.on('user_online', handleUserOnline);
    s.on('user_offline', handleUserOffline);
    s.on('messages_read', handleMessagesRead);
    s.on('message_delivered', handleMessageDelivered);
    s.on('connect', handleReconnect);
    s.on('incoming_call', handleIncomingCall);
    s.on('call_answered', handleCallAnswered);
    s.on('call_rejected', handleCallRejected);
    s.on('call_busy', handleCallBusy);
    s.on('call_ended', handleCallEnded);
    s.on('receive_voice_chunk', handleReceiveVoiceChunk);

    return () => {
      s.emit('leave_room', { roomId: conversationId });
      s.off('receive_message', handleReceiveMessage);
      s.off('user_typing', handleUserTyping);
      s.off('user_stop_typing', handleUserStopTyping);
      s.off('user_online', handleUserOnline);
      s.off('user_offline', handleUserOffline);
      s.off('messages_read', handleMessagesRead);
      s.off('message_delivered', handleMessageDelivered);
      s.off('connect', handleReconnect);
      s.off('incoming_call', handleIncomingCall);
      s.off('call_answered', handleCallAnswered);
      s.off('call_rejected', handleCallRejected);
      s.off('call_busy', handleCallBusy);
      s.off('call_ended', handleCallEnded);
      s.off('receive_voice_chunk', handleReceiveVoiceChunk);
    };
  }, [conversationId, currentUser._id, receiverId, workspace]);

  const scrollToEnd = () => {
    setTimeout(() => { flatListRef.current?.scrollToEnd({ animated: true }); }, 100);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    if (socket && conversationId) {
      socket.emit('typing', { roomId: conversationId, userId: currentUser._id, userName: currentUser.fullName });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { roomId: conversationId, userId: currentUser._id });
      }, 2000);
    }
  };

  // ========== VOICE RECORDING ==========
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleStartRecording = async () => {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Microphone access is required to send voice messages.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      startPulseAnimation();

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      Alert.alert('Recording Error', 'Could not start recording. Please try again.');
    }
  };

  const handleCancelRecording = async () => {
    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      setIsRecording(false);
      setRecordingDuration(0);

      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
    } catch (err) {
      console.error('Error cancelling recording:', err);
      setIsRecording(false);
      setRecording(null);
    }
  };

  const handleStopRecording = async () => {
    if (!recording || !conversationId) return;

    try {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      setIsRecording(false);

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      const duration = recordingDuration;
      setRecordingDuration(0);

      if (!uri) {
        Alert.alert('Recording Error', 'No audio recorded.');
        return;
      }

      // Don't send very short recordings (under 1 second)
      if (duration < 1) {
        return;
      }

      const fileName = `voice_${Date.now()}.m4a`;

      // Optimistic UI
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setMessages(prev => [...prev, {
        _id: tempId,
        tempId,
        sender: { _id: currentUser._id, fullName: currentUser.fullName, role: currentUser.role },
        text: '',
        attachment: { name: fileName, url: '', type: 'voice', duration },
        status: 'sending',
        createdAt: new Date().toISOString(),
      }]);
      scrollToEnd();

      // Upload the voice file
      const cloudUrl = await uploadToCloudinary(uri, fileName);
      if (!cloudUrl) {
        Alert.alert('Upload Failed', 'Could not upload voice message. Please try again.');
        setMessages(prev => prev.filter(m => m._id !== tempId));
        return;
      }

      // Send message with voice attachment
      const attachment = { name: fileName, url: cloudUrl, type: 'voice', duration };
      try {
        const isWorkspaceChat = workspace && workspace._id === conversationId;
        const url = isWorkspaceChat 
          ? `${BACKEND_URL}/api/project-workspaces/${conversationId}/messages`
          : `${BACKEND_URL}/api/conversations/${conversationId}/messages`;

        const body = isWorkspaceChat
          ? JSON.stringify({ sender: currentUser._id, text: '', attachment })
          : JSON.stringify({ senderId: currentUser._id, text: '', attachment });

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });
        if (response.ok) {
          const data = await response.json();
          let realId;
          if (isWorkspaceChat && data.workspace?.messages?.length > 0) {
            const workspaceMessages = data.workspace.messages;
            const savedMsg = workspaceMessages[workspaceMessages.length - 1];
            realId = savedMsg?._id;
          } else {
            realId = data.message?._id;
          }
          if (realId) sentMessageIdsRef.current.add(realId);
          setMessages(prev => prev.map(m =>
            m._id === tempId ? { ...m, attachment, status: 'sent', _id: realId || m._id } : m
          ));
        }
      } catch (err) {
        console.error('Error sending voice message:', err);
      }
    } catch (err) {
      setIsRecording(false);
      setRecording(null);
      setRecordingDuration(0);
    }
  };

  // ========== SPEECH TO TEXT (STT) ==========
  const handleStartSttRecording = async (lang: { code: string; name: string } | null = null) => {
    try {
      setShowSttModal(true);

      if (Platform.OS === 'web') {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
          Alert.alert('Speech Recognition Not Supported', 'Your browser does not support Speech Recognition. Please use Google Chrome or Safari.');
          setShowSttModal(false);
          return;
        }

        const recognition = new SpeechRecognition();
        if (lang) {
          recognition.lang = lang.code;
        }
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.continuous = true;

        let accumulatedTranscript = '';
        recognition.onresult = (event: any) => {
          const resultIndex = event.resultIndex;
          const transcript = event.results[resultIndex][0].transcript;
          accumulatedTranscript += ' ' + transcript;
        };

        recognition.onerror = (event: any) => {
          console.error('[Web Speech Error]', event.error);
        };

        recognition.onend = () => {
          if (accumulatedTranscript.trim()) {
            setText(prev => (prev ? prev + ' ' : '') + accumulatedTranscript.trim());
          }
        };

        webSpeechRecRef.current = recognition;
        recognition.start();

        setSelectedSttLang(lang || { code: 'auto', name: 'Auto-Detect' });
        setIsSttRecording(true);
        setSttDuration(0);
        startPulseAnimation();

        sttTimerRef.current = setInterval(() => {
          setSttDuration(prev => prev + 1);
        }, 1000);
        return;
      }

      // Native Mobile fallback
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Needed', 'Microphone access is required for Speech to Text.');
        setShowSttModal(false);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setSelectedSttLang(lang || { code: 'auto', name: 'Auto-Detect' });
      setSttRecording(newRecording);
      setIsSttRecording(true);
      setSttDuration(0);
      
      // Start pulse animation
      startPulseAnimation();

      sttTimerRef.current = setInterval(() => {
        setSttDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start STT recording:', err);
      Alert.alert('Error', 'Could not access microphone.');
      setShowSttModal(false);
    }
  };

  const handleCancelSttRecording = async () => {
    try {
      if (sttTimerRef.current) clearInterval(sttTimerRef.current);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      setIsSttRecording(false);
      setSttDuration(0);

      if (Platform.OS === 'web') {
        if (webSpeechRecRef.current) {
          webSpeechRecRef.current.onresult = null;
          webSpeechRecRef.current.onend = null;
          webSpeechRecRef.current.abort();
          webSpeechRecRef.current = null;
        }
        setSelectedSttLang(null);
        setShowSttModal(false);
        return;
      }

      if (sttRecording) {
        await sttRecording.stopAndUnloadAsync();
        setSttRecording(null);
      }
      setSelectedSttLang(null);
      setShowSttModal(false);
    } catch (err) {
      console.error('Error cancelling STT recording:', err);
      setIsSttRecording(false);
      setSttRecording(null);
    }
  };

  const handleStopSttRecordingAndTranscribe = async () => {
    if (Platform.OS === 'web') {
      try {
        if (sttTimerRef.current) clearInterval(sttTimerRef.current);
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        setIsSttRecording(false);

        if (webSpeechRecRef.current) {
          webSpeechRecRef.current.stop();
          webSpeechRecRef.current = null;
        }
      } catch (err) {
        console.error('Error stopping web speech recognition:', err);
      } finally {
        setSelectedSttLang(null);
        setShowSttModal(false);
      }
      return;
    }

    // Native Mobile (Fall back to Hugging Face transcription endpoint)
    if (!sttRecording) return;

    try {
      if (sttTimerRef.current) clearInterval(sttTimerRef.current);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      setIsSttRecording(false);

      await sttRecording.stopAndUnloadAsync();
      const uri = sttRecording.getURI();
      setSttRecording(null);
      
      if (!uri) {
        Alert.alert('Recording Error', 'No speech was recorded.');
        setSelectedSttLang(null);
        setShowSttModal(false);
        return;
      }

      setIsTranscribing(true);

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/x-m4a',
        name: 'speech.m4a'
      } as any);
      formData.append('language', i18n.language || 'en');

      console.log('[STT Client] Uploading to backend...');
      const response = await fetch(`${BACKEND_URL}/api/transcribe`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('[STT Client] Backend Response:', data);

      if (response.ok && data.success) {
        if (data.text && data.text.trim()) {
          setText(prev => (prev ? prev + ' ' : '') + data.text.trim());
        } else {
          Alert.alert('Speech Recognition', 'Could not recognize any speech. Please try speaking louder or choosing the correct language.');
        }
      } else {
        Alert.alert('Speech Recognition Error', data.message || 'Could not transcribe speech. Please try again.');
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
      Alert.alert('Error', 'Transcription service failed. Ensure the server is online.');
    } finally {
      setIsTranscribing(false);
      setSelectedSttLang(null);
      setShowSttModal(false);
    }
  };

  // ========== PLAY VOICE MESSAGE ==========
  const handlePlayVoice = async (msgId: string, voiceUrl: string) => {
    try {
      // If already playing this message, stop it
      if (playingVoiceId === msgId) {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }
        setPlayingVoiceId(null);
        setVoiceProgress(0);
        return;
      }

      // Stop any currently playing sound
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            if (status.durationMillis && status.positionMillis) {
              setVoiceProgress(status.positionMillis / status.durationMillis);
            }
            if (status.didJustFinish) {
              setPlayingVoiceId(null);
              setVoiceProgress(0);
              soundRef.current = null;
            }
          }
        }
      );

      soundRef.current = sound;
      setPlayingVoiceId(msgId);
      setVoiceProgress(0);
    } catch (err) {
      console.error('Error playing voice:', err);
      Alert.alert('Playback Error', 'Could not play voice message.');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ========== SEND TEXT MESSAGE ==========
  const handleSend = async () => {
    if (!text.trim() || !conversationId) return;
    const messageText = text;
    setText('');
    if (socket) socket.emit('stop_typing', { roomId: conversationId, userId: currentUser._id });

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Optimistic: add with single tick
    setMessages(prev => [...prev, {
      _id: tempId,
      tempId,
      sender: { _id: currentUser._id, fullName: currentUser.fullName, role: currentUser.role },
      text: messageText,
      status: 'sending',
      createdAt: new Date().toISOString(),
    }]);
    scrollToEnd();

    try {
      const isWorkspaceChat = workspace && workspace._id === conversationId;
      const url = isWorkspaceChat 
        ? `${BACKEND_URL}/api/project-workspaces/${conversationId}/messages`
        : `${BACKEND_URL}/api/conversations/${conversationId}/messages`;

      const body = isWorkspaceChat
        ? JSON.stringify({ sender: currentUser._id, text: messageText, tempId })
        : JSON.stringify({ senderId: currentUser._id, text: messageText, tempId });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (response.ok) {
        const data = await response.json();
        let realId;
        if (isWorkspaceChat && data.workspace?.messages?.length > 0) {
          const workspaceMessages = data.workspace.messages;
          const savedMsg = workspaceMessages[workspaceMessages.length - 1];
          realId = savedMsg?._id;
        } else {
          realId = data.message?._id;
        }
        // Track the real ID to prevent socket duplicate
        if (realId) sentMessageIdsRef.current.add(realId);
        // Mark as sent and update _id to the real MongoDB _id
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, status: 'sent', _id: realId || m._id } : m));
      } else {
        Alert.alert('Failed to send', 'Could not deliver your message.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network error. Message could not be sent.');
    }
  };

  const sendDesignMessage = async (designId: string, title: string, imageUrl: string, location?: string) => {
    if (!conversationId) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const locStr = location ? ` (Location: ${location})` : '';
    const textMsg = `Hello! I want to hire you to build this design: "${title}"${locStr}.`;
    
    const isRemoteUrl = imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'));
    const cleanLocation = location ? location.replace(/__/g, ' ') : '';
    const cleanTitle = title ? title.replace(/__/g, ' ') : '';
    const attachment = isRemoteUrl ? { name: `design_${designId}__${cleanTitle}__${cleanLocation}.jpg`, url: imageUrl, type: 'image' } : undefined;

    setMessages(prev => [...prev, {
      _id: tempId,
      tempId,
      sender: { _id: currentUser._id, fullName: currentUser.fullName, role: currentUser.role },
      text: textMsg,
      attachment,
      status: 'sending',
      createdAt: new Date().toISOString(),
    }]);
    scrollToEnd();

    try {
      const isWorkspaceChat = workspace && workspace._id === conversationId;
      const url = isWorkspaceChat 
        ? `${BACKEND_URL}/api/project-workspaces/${conversationId}/messages`
        : `${BACKEND_URL}/api/conversations/${conversationId}/messages`;

      const body = isWorkspaceChat
        ? JSON.stringify({ sender: currentUser._id, text: textMsg, attachment })
        : JSON.stringify({ senderId: currentUser._id, text: textMsg, attachment });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (response.ok) {
        const data = await response.json();
        let realId;
        if (isWorkspaceChat && data.workspace?.messages?.length > 0) {
          const workspaceMessages = data.workspace.messages;
          const savedMsg = workspaceMessages[workspaceMessages.length - 1];
          realId = savedMsg?._id;
        } else {
          realId = data.message?._id;
        }
        if (realId) sentMessageIdsRef.current.add(realId);
        setMessages(prev => prev.map(m =>
          m.tempId === tempId ? { ...m, status: 'sent', _id: realId || m._id } : m
        ));
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Send Error', errorData.message || 'Failed to send hiring invitation.');
      }
    } catch (err) {
      console.error('Error sending auto design message:', err);
      Alert.alert('Network Error', 'Could not send the hiring invitation due to connection issues.');
    }
  };

  useEffect(() => {
    if (conversationId && !isLoading && currentUser?._id && currentUser._id !== 'default-user-id' && params.designId && !initialDesignSentRef.current) {
      initialDesignSentRef.current = true;
      sendDesignMessage(
        params.designId as string,
        params.designTitle as string,
        params.designImage as string,
        params.designLocation as string
      );
    }
  }, [conversationId, isLoading, currentUser?._id, params.designId]);

  const uploadToCloudinary = async (uri: string, fileName: string): Promise<string | null> => {
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        formData.append('file', file);
      } else {
        formData.append('file', { uri, name: fileName, type: 'image/jpeg' } as any);
      }

      const res = await fetch(`${BACKEND_URL}/api/chat/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        return data.url;
      }

      // Fallback: try the general upload endpoint
      const formData2 = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        formData2.append('image', file);
      } else {
        formData2.append('image', { uri, name: fileName, type: 'image/jpeg' } as any);
      }

      const res2 = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData2,
      });

      if (res2.ok) {
        const data2 = await res2.json();
        return data2.url;
      }

      console.error('Backend upload failed:', await res2.text());
      return null;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  // ========== PICK IMAGE ==========
  const handlePickImage = async () => {
    Keyboard.dismiss();
    setShowAttachMenu(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `image_${Date.now()}.jpg`;
      sendImageAttachment(asset.uri, fileName);
    }
  };

  // ========== PICK DOCUMENT ==========
  const handlePickDocument = async () => {
    Keyboard.dismiss();
    setShowAttachMenu(false);
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const localUrl = URL.createObjectURL(file);
        const isImage = file.type?.startsWith('image/');
        sendImageAttachment(localUrl, file.name, isImage ? 'image' : 'file');
      };
      input.click();
    } else {
      Alert.alert('Document Sharing', 'Document picker coming soon for mobile.');
    }
  };

  // ========== TAKE PHOTO ==========
  const handleTakePhoto = async () => {
    Keyboard.dismiss();
    setShowAttachMenu(false);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow camera access.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
      sendImageAttachment(asset.uri, fileName);
    }
  };

  // ========== SEND ATTACHMENT (upload to backend → send URL) ==========
  const sendImageAttachment = async (localUri: string, fileName: string, fileType: string = 'image') => {
    if (!conversationId) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Show optimistic with local preview (only works on native, web uses blob URLs)
    const isLocalFileUri = localUri.startsWith('file://');
    setMessages(prev => [...prev, {
      _id: tempId, tempId,
      sender: { _id: currentUser._id, fullName: currentUser.fullName, role: currentUser.role },
      text: '',
      attachment: { name: fileName, url: isLocalFileUri && Platform.OS === 'web' ? '' : localUri, type: fileType },
      status: 'sending',
      createdAt: new Date().toISOString(),
    }]);
    scrollToEnd();

    // Upload via backend (server-side Cloudinary)
    const cloudUrl = await uploadToCloudinary(localUri, fileName);
    if (!cloudUrl) {
      Alert.alert('Upload Failed', 'Could not upload file. Please try again.');
      setMessages(prev => prev.filter(m => m._id !== tempId));
      return;
    }
    // Send message with the Cloudinary URL (never a local file:// URI)
    const attachment = { name: fileName, url: cloudUrl, type: fileType };
    try {
      const isWorkspaceChat = workspace && workspace._id === conversationId;
      const url = isWorkspaceChat 
        ? `${BACKEND_URL}/api/project-workspaces/${conversationId}/messages`
        : `${BACKEND_URL}/api/conversations/${conversationId}/messages`;

      const body = isWorkspaceChat
        ? JSON.stringify({ sender: currentUser._id, text: '', attachment })
        : JSON.stringify({ senderId: currentUser._id, text: '', attachment });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (response.ok) {
        const data = await response.json();
        let realId;
        if (isWorkspaceChat && data.workspace?.messages?.length > 0) {
          const workspaceMessages = data.workspace.messages;
          const savedMsg = workspaceMessages[workspaceMessages.length - 1];
          realId = savedMsg?._id;
        } else {
          realId = data.message?._id;
        }
        if (realId) sentMessageIdsRef.current.add(realId);
        setMessages(prev => prev.map(m =>
          m._id === tempId ? { ...m, attachment, status: 'sent', _id: realId || m._id } : m
        ));
      }
    } catch (err) { console.error('Error sending attachment:', err); }
  };
  // ========== SEND FILE MESSAGE ==========
  const sendFileMessage = async (dataUrl: string, fileName: string) => {
    if (!conversationId) return;
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attachment = { name: fileName, url: dataUrl, type: 'file' };

    setMessages(prev => [...prev, {
      _id: tempId, tempId,
      sender: { _id: currentUser._id, fullName: currentUser.fullName, role: currentUser.role },
      text: '', attachment, status: 'sending',
      createdAt: new Date().toISOString(),
    }]);
    scrollToEnd();
    try {
      const isWorkspaceChat = workspace && workspace._id === conversationId;
      const url = isWorkspaceChat 
        ? `${BACKEND_URL}/api/project-workspaces/${conversationId}/messages`
        : `${BACKEND_URL}/api/conversations/${conversationId}/messages`;

      const body = isWorkspaceChat
        ? JSON.stringify({ sender: currentUser._id, text: '', attachment })
        : JSON.stringify({ senderId: currentUser._id, text: '', attachment });

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (response.ok) {
        const data = await response.json();
        let realId;
        if (isWorkspaceChat && data.workspace?.messages?.length > 0) {
          const workspaceMessages = data.workspace.messages;
          const savedMsg = workspaceMessages[workspaceMessages.length - 1];
          realId = savedMsg?._id;
        } else {
          realId = data.message?._id;
        }
        if (realId) sentMessageIdsRef.current.add(realId);
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, status: 'sent', _id: realId || m._id } : m));
      }
    } catch (err) { console.error('Error sending file:', err); }
  };

  const handleViewProfile = () => {
    setShowMenu(false);
    const isArchitect = receiverRole?.toLowerCase().includes('architect');
    const isContractor = receiverRole?.toLowerCase().includes('contractor');
    const isLabour = receiverRole?.toLowerCase().includes('labour');
    if (isArchitect) {
      router.push({
        pathname: '/architect-detail',
        params: { id: receiverId, name: receiverName, avatar: receiverAvatar, role: receiverRole }
      });
    } else if (isContractor) {
      router.push({
        pathname: '/contractor-detail',
        params: { id: receiverId, name: receiverName, avatar: receiverAvatar, role: receiverRole }
      });
    } else if (isLabour) {
      router.push({
        pathname: '/labour-detail',
        params: {
          id: receiverId,
          name: receiverName,
          role: receiverRole,
          avatar: receiverAvatar,
          experience: 'Entry Level',
          rating: '4.5',
          reviews: '0',
          location: 'Thane, Maharashtra'
        }
      });
    } else {
      Alert.alert('View Profile', `${receiverName} is registered as a ${receiverRole || 'User'}.`);
    }
  };

  const handleLinkProject = () => {
    setShowMenu(false);
    router.push('/(tabs)/post-project');
  };

  const handleViewProjectWorkspace = () => {
    setShowMenu(false);
    if (workspace) {
      router.push({
        pathname: '/project-progress',
        params: {
          workspaceId: workspace._id,
          name: workspace.title,
          status: workspace.status,
          progress: workspace.status === 'Completed' ? '100' : '60',
          contractor: workspace.professional?.fullName || workspace.contractor?.fullName || receiverName,
          contractorAvatar: workspace.professional?.avatarUrl || workspace.contractor?.avatarUrl || receiverAvatar,
        }
      });
    }
  };

  const handleViewProjectTimeline = () => {
    setShowMenu(false);
    if (workspace) {
      router.push({
        pathname: '/project-progress',
        params: {
          workspaceId: workspace._id,
          name: workspace.title,
          status: workspace.status,
          progress: workspace.status === 'Completed' ? '100' : '60',
          contractor: workspace.professional?.fullName || workspace.contractor?.fullName || receiverName,
          contractorAvatar: workspace.professional?.avatarUrl || workspace.contractor?.avatarUrl || receiverAvatar,
          focusSection: 'timeline'
        }
      });
    }
  };

  const handleViewAttendanceReport = () => {
    setShowMenu(false);
    setShowAttendanceModal(true);
  };

  const handleViewSharedDocuments = () => {
    setShowMenu(false);
    setShowDocsModal(true);
  };

  const handleViewPaymentHistory = () => {
    setShowMenu(false);
    setShowPaymentsModal(true);
  };

  const handleViewSitePhotos = () => {
    setShowMenu(false);
    setShowPhotosModal(true);
  };

  const handleExportChatPDF = async () => {
    setShowMenu(false);
    try {
      let chatText = `ALLVER CHAT LOG\n`;
      chatText += `Between: ${currentUser.fullName} and ${receiverName}\n`;
      chatText += `Project: ${workspace?.title || 'None'}\n`;
      chatText += `Exported At: ${new Date().toLocaleString()}\n\n`;
      chatText += `=========================================\n\n`;
      
      messages.forEach(msg => {
        const sender = msg.sender && typeof msg.sender === 'object' ? msg.sender.fullName : (msg.sender === currentUser._id ? currentUser.fullName : receiverName);
        const dt = new Date(msg.createdAt).toLocaleString();
        chatText += `[${dt}] ${sender}: ${msg.text || '[Attachment]'}\n`;
      });
      
      if (Platform.OS === 'web') {
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_export_${receiverName.replace(/\s+/g, '_')}.txt`;
        a.click();
        Alert.alert('Success', 'Chat history exported successfully.');
      } else {
        const Share = require('react-native').Share;
        await Share.share({
          message: chatText,
          title: 'Chat History Export'
        });
      }
    } catch (err) {
      console.error('Error exporting chat:', err);
      Alert.alert('Export Failed', 'Could not export chat log.');
    }
  };

  const handleCreateTask = () => {
    setShowMenu(false);
    if (!workspace) {
      Alert.alert('No Workspace', 'Cannot create a task without an active project workspace.');
      return;
    }

    const createTaskOnBackend = async (taskName: string) => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspace._id}/updates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: taskName,
            description: `Task assigned to ${receiverName}.`,
            category: 'Task',
            senderId: currentUser._id
          })
        });
        if (response.ok) {
          const resData = await response.json();
          if (resData.workspace) setWorkspace(resData.workspace);
          Alert.alert("Task Created", `Task "${taskName}" has been successfully assigned to ${receiverName}.`);
        } else {
          Alert.alert("Failed", "Could not save the task on the server.");
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Network error when creating task.");
      }
    };

    if (Platform.OS === 'web') {
      const taskName = prompt("Enter task title:");
      if (taskName) {
        createTaskOnBackend(taskName);
      }
    } else {
      Alert.prompt(
        "Create Task",
        `Assign a task to ${receiverName}`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Create", 
            onPress: (taskName) => {
              if (taskName) {
                createTaskOnBackend(taskName);
              }
            } 
          }
        ],
        "plain-text"
      );
    }
  };

  const handleMarkImportant = () => {
    setShowMenu(false);
    const nextVal = !isImportant;
    setIsImportant(nextVal);
    Alert.alert('Important Chat', nextVal ? 'This conversation has been marked as important.' : 'This conversation has been unmarked.');
  };

  const handleReportUser = () => {
    setShowMenu(false);
    Alert.alert(
      'Report User',
      `Are you sure you want to report ${receiverName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Report', 
          style: 'destructive',
          onPress: () => Alert.alert('User Reported', 'Thank you. We have received your report and will review it.') 
        }
      ]
    );
  };

  const handleBlockUser = () => {
    setShowMenu(false);
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${receiverName}? You will not receive any more messages from them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Block', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Blocked', `${receiverName} has been blocked.`);
            router.back();
          } 
        }
      ]
    );
  };

  const formatMessageTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  // ========== TICK ICON LOGIC (WhatsApp style) ==========
  const renderTicks = (msg: Message) => {
    const readByCount = msg.readBy?.length || 0;
    const status = msg.status;

    // Read by other user → double blue tick
    if (readByCount > 1 || status === 'read') {
      return (
        <View style={styles.tickRow}>
          <Ionicons name="checkmark-done" size={16} color="#53BDEB" />
        </View>
      );
    }
    // Delivered → double grey tick
    if (status === 'delivered') {
      return (
        <View style={styles.tickRow}>
          <Ionicons name="checkmark-done" size={16} color="#94A3B8" />
        </View>
      );
    }
    // Sent / Sending → single grey tick
    return (
      <View style={styles.tickRow}>
        <Ionicons name="checkmark" size={16} color="#94A3B8" />
      </View>
    );
  };

  // ========== RENDER MESSAGE ==========
  const renderMessageItem = ({ item }: { item: Message }) => {
    if (!item) return null;
    const sender = item.sender;
    const senderId = sender && typeof sender === 'object' ? sender._id : sender;
    const isOutgoing = senderId === currentUser._id;
    const senderAvatar = item.sender && typeof item.sender === 'object' ? (item.sender as any).avatarUrl : undefined;
    const isImage = item.attachment?.type === 'image' && !!item.attachment?.url;
    const isFile = item.attachment && !!item.attachment.url && (item.attachment.type === 'file' || item.attachment.name?.endsWith('.pdf'));

    return (
      <View style={[styles.messageRow, isOutgoing ? styles.messageRowRight : styles.messageRowLeft]}>
        {!isOutgoing && (
          <Image
            source={{ uri: senderAvatar || receiverAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop' }}
            style={styles.senderAvatar}
          />
        )}

        <View style={[styles.messageBubble, isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming]}>
          {/* ===== IMAGE ATTACHMENT ===== */}
          {isImage && item.attachment && (() => {
            const imgUrl = item.attachment.url;
            // For optimistic sending: show placeholder if uploading (no valid URL yet)
            if (item.status === 'sending' && (!imgUrl || imgUrl.startsWith('file://'))) {
              return (
                <View style={[styles.imageAttachment, { justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Uploading...</Text>
                </View>
              );
            }
            // Must have a valid http/https URL to render the image
            if (!imgUrl || (!imgUrl.startsWith('http://') && !imgUrl.startsWith('https://') && !imgUrl.startsWith('blob:'))) {
              return null;
            }
            const designMatch = item.attachment.name?.match(/^design_([a-fA-F0-9]{24})__(.+)__(.*)\.jpg$/);
            const handlePress = () => {
              if (designMatch) {
                router.push({
                  pathname: '/design-detail',
                  params: {
                    id: designMatch[1],
                    title: designMatch[2],
                    image: imgUrl,
                    location: designMatch[3]
                  }
                });
              } else {
                setPreviewImage(imgUrl);
              }
            };
            return (
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={handlePress}
                style={{ position: 'relative', overflow: 'hidden', borderRadius: 10 }}
              >
                <Image
                  source={{ uri: imgUrl }}
                  style={styles.imageAttachment}
                  contentFit="cover"
                />
                {designMatch && (
                  <View style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(22, 163, 74, 0.9)',
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: '700' }}>
                      View Design Plan
                    </Text>
                    <Feather name="arrow-right" size={12} color={COLORS.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })()}

          {/* ===== FILE/PDF ATTACHMENT ===== */}
          {isFile && item.attachment && (
            <TouchableOpacity style={styles.fileAttachmentCard} activeOpacity={0.8}
              onPress={() => { if (item.attachment?.url) Linking.openURL(item.attachment.url); }}>
              <View style={[styles.fileIconBox, item.attachment.name?.endsWith('.pdf') ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#EFF6FF' }]}>
                <FontAwesome5
                  name={item.attachment.name?.endsWith('.pdf') ? 'file-pdf' : 'file-alt'}
                  size={20}
                  color={item.attachment.name?.endsWith('.pdf') ? '#EF4444' : COLORS.blue}
                />
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>{item.attachment.name}</Text>
                <Text style={styles.fileSize}>{item.attachment.name?.split('.').pop()?.toUpperCase() || 'FILE'}</Text>
              </View>
              <Feather name="download" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}

          {/* ===== TEXT ===== */}
          {item.text !== '' && (
            <Text style={[styles.messageText, isOutgoing && { color: COLORS.outgoingText }]}>{item.text}</Text>
          )}

          {/* ===== VOICE MESSAGE ===== */}
          {item.attachment?.type === 'voice' && (() => {
            const isPlaying = playingVoiceId === item._id;
            const voiceDuration = (item.attachment as any)?.duration || 0;
            const hasUrl = item.attachment?.url && (item.attachment.url.startsWith('http://') || item.attachment.url.startsWith('https://'));
            
            return (
              <View style={styles.voiceMessageContainer}>
                <TouchableOpacity
                  style={[styles.voicePlayBtn, isPlaying && styles.voicePlayBtnActive]}
                  onPress={() => hasUrl ? handlePlayVoice(item._id, item.attachment!.url) : null}
                  disabled={item.status === 'sending'}
                >
                  {item.status === 'sending' ? (
                    <Text style={{ color: '#fff', fontSize: 10 }}>...</Text>
                  ) : (
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={18}
                      color="#FFFFFF"
                    />
                  )}
                </TouchableOpacity>
                <View style={styles.voiceWaveformArea}>
                  <View style={styles.voiceWaveformTrack}>
                    <View style={[
                      styles.voiceWaveformFill,
                      { width: isPlaying ? `${voiceProgress * 100}%` : '0%' }
                    ]} />
                    {/* Waveform bars */}
                    <View style={styles.voiceWaveformBars}>
                      {[0.4, 0.7, 0.5, 0.9, 0.3, 0.8, 0.6, 0.4, 0.7, 0.5, 0.8, 0.3, 0.6, 0.9, 0.4, 0.7, 0.5, 0.3, 0.8, 0.6].map((h, i) => (
                        <View
                          key={i}
                          style={[
                            styles.voiceBar,
                            { height: h * 18 },
                            isOutgoing
                              ? { backgroundColor: isPlaying && (i / 20) < voiceProgress ? '#D97706' : '#E5C07B' }
                              : { backgroundColor: isPlaying && (i / 20) < voiceProgress ? '#2563EB' : '#94A3B8' }
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                  <Text style={[styles.voiceDurationText, isOutgoing && { color: '#92400E' }]}>
                    {formatDuration(voiceDuration)}
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* ===== TIME + TICKS ===== */}
          <View style={styles.timeContainer}>
            <Text style={[styles.messageTime, isImage && !item.text && { color: '#fff' }]}>
              {formatMessageTime(item.createdAt)}
            </Text>
            {isOutgoing && renderTicks(item)}
          </View>
        </View>
      </View>
    );
  };

  const handlePhoneCall = async () => {
    if (!currentUser || currentUser._id === 'default-user-id') {
      Alert.alert('Call Not Available', 'Please log in to make calls.');
      return;
    }
    
    try {
      // 1. Check follow status from backend
      const followRes = await fetch(`${BACKEND_URL}/api/follow/status/${receiverId}?followerId=${currentUser._id}`);
      if (!followRes.ok) {
        throw new Error('Failed to verify follow status');
      }
      const followData = await followRes.json();
      
      if (!followData.isFollowing) {
        Alert.alert(
          'Cannot Call',
          'You can only call users whom you are following. Please follow this user first from their profile page.'
        );
        return;
      }
      
      // 2. Initiate Call
      setCallState('calling');
      setCallerInfo({
        callerId: receiverId,
        callerName: receiverName,
        callerAvatar: receiverAvatar
      });
      
      if (socket) {
        socket.emit('initiate_call', {
          callerId: currentUser._id,
          receiverId: receiverId,
          callerName: currentUser.fullName,
          callerAvatar: currentUser.avatarUrl || ''
        });
      }
    } catch (err) {
      console.error('Call initialization error:', err);
      Alert.alert('Error', 'An error occurred while trying to place the call.');
    }
  };



  const handleAcceptCall = () => {
    if (!socket || !callerInfo) return;
    socket.emit('answer_call', {
      callerId: callerInfo.callerId,
      receiverId: currentUser._id
    });
    setCallState('active');
  };

  const handleDeclineCall = () => {
    if (!socket || !callerInfo) return;
    socket.emit('reject_call', {
      callerId: callerInfo.callerId,
      receiverId: currentUser._id
    });
    setCallState('idle');
    setCallerInfo(null);
  };

  const handleEndCall = () => {
    if (!socket || !callerInfo) {
      setCallState('idle');
      return;
    }
    socket.emit('end_call', {
      targetId: callerInfo.callerId === currentUser._id || callerInfo.callerId === receiverId ? receiverId : callerInfo.callerId
    });
    setCallState('idle');
    setCallerInfo(null);
  };

  // Call Streaming Management
  const callRecordingRef = useRef<Audio.Recording | null>(null);
  const callIntervalRef = useRef<any>(null);
  const voiceQueueRef = useRef<string[]>([]);
  const isPlayingQueueRef = useRef<boolean>(false);

  const startCallRecordingChunk = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recordingInstance = new Audio.Recording();
      await recordingInstance.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );
      await recordingInstance.startAsync();
      callRecordingRef.current = recordingInstance;
    } catch (err) {
      console.error('Failed to start call recording chunk:', err);
    }
  };

  const stopAndUploadCallChunk = async () => {
    const rec = callRecordingRef.current;
    if (!rec) return;

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      callRecordingRef.current = null;

      if (uri && socket && callerInfo) {
        const base64Data = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        if (base64Data) {
          const target = callerInfo.callerId === currentUser._id || callerInfo.callerId === receiverId ? receiverId : callerInfo.callerId;
          socket.emit('voice_chunk', { base64Data, targetId: target });
        }
      }
    } catch (err) {
      console.error('Failed to stop and process call chunk:', err);
    }
  };

  const playNextInVoiceQueue = async () => {
    if (isPlayingQueueRef.current || voiceQueueRef.current.length === 0) return;

    isPlayingQueueRef.current = true;
    const nextUrl = voiceQueueRef.current.shift();

    if (nextUrl) {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: nextUrl },
          { shouldPlay: true }
        );

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            isPlayingQueueRef.current = false;
            playNextInVoiceQueue(); // Play next
          }
        });
      } catch (err) {
        console.error('Failed to play voice chunk:', err);
        isPlayingQueueRef.current = false;
        playNextInVoiceQueue();
      }
    } else {
      isPlayingQueueRef.current = false;
    }
  };

  useEffect(() => {
    if (callState === 'active') {
      voiceQueueRef.current = [];
      isPlayingQueueRef.current = false;

      const runStreaming = async () => {
        await startCallRecordingChunk();
        
        callIntervalRef.current = setInterval(async () => {
          await stopAndUploadCallChunk();
          await startCallRecordingChunk();
        }, 3500);
      };

      runStreaming();
    } else {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
        callIntervalRef.current = null;
      }
      
      const cleanRec = async () => {
        if (callRecordingRef.current) {
          try {
            await callRecordingRef.current.stopAndUnloadAsync();
          } catch (e) {}
          callRecordingRef.current = null;
        }
      };
      cleanRec();

      voiceQueueRef.current = [];
      isPlayingQueueRef.current = false;
    }

    return () => {
      if (callIntervalRef.current) {
        clearInterval(callIntervalRef.current);
        callIntervalRef.current = null;
      }
    };
  }, [callState]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }} 
            style={styles.backBtn}
          >
            <Feather name="chevron-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleViewProfile} 
            activeOpacity={0.7}
            style={styles.headerProfileClickable}
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: receiverAvatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop' }}
                style={styles.avatar}
              />
              {otherUserOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.headerTitles}>
              <Text style={styles.headerName} numberOfLines={1}>{receiverName}</Text>
              <Text style={styles.headerStatus}>
                {isTyping ? 'typing...' : otherUserOnline ? 'online' : receiverRole || 'offline'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={handlePhoneCall}
          >
            <Feather name="phone" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowMenu(true)}>
            <Feather name="more-vertical" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* ===== CHAT AREA ===== */}
        <View style={styles.chatArea}>
        {isLoading ? (
          <View style={styles.centerWrap}>
            <Text style={{ color: COLORS.textMuted }}>Loading messages...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <View style={styles.emptyChatIconWrap}>
              <Ionicons name="chatbubbles-outline" size={44} color="#A0AEC0" />
            </View>
            <Text style={styles.emptyChatTitle}>Start a conversation</Text>
            <Text style={styles.emptyChatSub}>Send a message to {receiverName}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item, index) => (item._id || item.tempId || `msg_${index}`) + `_${index}`}
            contentContainerStyle={[styles.chatListContent, { flexGrow: 1, justifyContent: messages.length < 10 ? 'flex-end' : 'flex-start' }]}
            onContentSizeChange={scrollToEnd}
            onLayout={scrollToEnd}
            showsVerticalScrollIndicator={false}
          />
        )}

        {isTyping && (
          <View style={styles.typingBar}>
            <View style={styles.typingBubble}>
              <Text style={styles.typingDots}>●●●</Text>
            </View>
          </View>
        )}
      </View>

      {/* ===== ATTACHMENT MENU MODAL ===== */}
      <Modal visible={showAttachMenu} transparent animationType="fade" onRequestClose={() => setShowAttachMenu(false)}>
        <TouchableOpacity style={styles.attachOverlay} activeOpacity={1} onPress={() => setShowAttachMenu(false)}>
          <View style={styles.attachMenuCard}>
            <View style={styles.attachRow}>
              <TouchableOpacity style={styles.attachOption} onPress={handlePickImage}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#7C3AED' }]}>
                  <Feather name="image" size={22} color={COLORS.white} />
                </View>
                <Text style={styles.attachLabel}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachOption} onPress={handleTakePhoto}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#EC4899' }]}>
                  <Feather name="camera" size={22} color={COLORS.white} />
                </View>
                <Text style={styles.attachLabel}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.attachOption} onPress={handlePickDocument}>
                <View style={[styles.attachIconCircle, { backgroundColor: '#6366F1' }]}>
                  <Feather name="file-text" size={22} color={COLORS.white} />
                </View>
                <Text style={styles.attachLabel}>Document</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===== IMAGE PREVIEW MODAL ===== */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewImage(null)}>
            <Feather name="x" size={28} color={COLORS.white} />
          </TouchableOpacity>
          {previewImage && (
            <Image source={{ uri: previewImage }} style={styles.previewImage} contentFit="contain" />
          )}
        </View>
      </Modal>

      {/* ===== HEADER MENU MODAL ===== */}
      <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={styles.menuCard}>
            {workspace ? (
              // If a Project is Linked
              <>
                <Text style={styles.menuHeader}>Project: {workspace.title}</Text>
                <View style={styles.menuDivider} />
                
                <TouchableOpacity style={styles.menuItem} onPress={handleViewProjectWorkspace}>
                  <Feather name="briefcase" size={16} color={COLORS.textDark} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>View Project Workspace</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleViewProjectTimeline}>
                  <Feather name="activity" size={16} color={COLORS.textDark} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Project Timeline</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleViewAttendanceReport}>
                  <Feather name="calendar" size={16} color={COLORS.textDark} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Attendance Report</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleViewSharedDocuments}>
                  <Feather name="file-text" size={16} color={COLORS.textDark} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Shared Documents</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleViewPaymentHistory}>
                  <Feather name="credit-card" size={16} color={COLORS.textDark} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Payment History</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleViewSitePhotos}>
                  <Feather name="camera" size={16} color={COLORS.textDark} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Site Photos</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleExportChatPDF}>
                  <Feather name="download" size={16} color={COLORS.blue} style={styles.menuIcon} />
                  <Text style={[styles.menuItemText, { color: COLORS.blue, fontWeight: '600' }]}>Export Chat PDF</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Default if no project is linked
              <>
                <Text style={styles.menuHeader}>Chat Actions</Text>
                <View style={styles.menuDivider} />
                
                <TouchableOpacity style={styles.menuItem} onPress={handleViewProfile}>
                  <Feather name="user" size={16} color={COLORS.textDark} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>View Profile</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleLinkProject}>
                  <Feather name="plus-circle" size={16} color={COLORS.textDark} style={styles.menuIcon} />
                  <Text style={styles.menuItemText}>Link Project Workspace</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleMarkImportant}>
                  <Feather name="star" size={16} color={isImportant ? COLORS.amber : COLORS.textDark} style={styles.menuIcon} />
                  <Text style={[styles.menuItemText, isImportant && { color: COLORS.amber, fontWeight: '600' }]}>
                    {isImportant ? 'Unmark Important' : 'Mark Important'}
                  </Text>
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity style={styles.menuItem} onPress={handleReportUser}>
                  <Feather name="alert-triangle" size={16} color="#EF4444" style={styles.menuIcon} />
                  <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Report User</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
                  <Feather name="slash" size={16} color="#EF4444" style={styles.menuIcon} />
                  <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Block User</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ===== ATTENDANCE REPORT MODAL ===== */}
      <Modal visible={showAttendanceModal} transparent animationType="slide" onRequestClose={() => setShowAttendanceModal(false)}>
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setShowAttendanceModal(false)}>
          <TouchableOpacity style={styles.infoModalCard} activeOpacity={1}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Attendance Report</Text>
              <TouchableOpacity onPress={() => setShowAttendanceModal(false)} style={styles.infoModalCloseBtn}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.infoModalBody} showsVerticalScrollIndicator={false}>
              {workspace?.labourManagement?.attendance?.length > 0 ? (
                workspace.labourManagement.attendance.map((att: any, idx: number) => (
                  <View key={idx} style={styles.attendanceDateGroup}>
                    <View style={styles.attendanceDateHeader}>
                      <Feather name="calendar" size={14} color={COLORS.textMuted} />
                      <Text style={styles.attendanceDateText}>{att.date}</Text>
                    </View>
                    {att.records?.map((record: any, rIdx: number) => {
                      const worker = workspace.labourTeam?.find((l: any) => l._id === record.labourId || l === record.labourId);
                      const workerName = worker && typeof worker === 'object' ? worker.fullName : 'Worker';
                      const workerRole = worker && typeof worker === 'object' ? worker.skillType : 'Labourer';
                      
                      let statusColor = COLORS.textMuted;
                      if (record.status === 'Present') statusColor = COLORS.green;
                      else if (record.status === 'Overtime') statusColor = COLORS.orange;
                      else if (record.status === 'Absent') statusColor = '#EF4444';
                      
                      return (
                        <View key={rIdx} style={styles.attendanceRecordRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.attendanceWorkerName}>{workerName}</Text>
                            <Text style={styles.attendanceWorkerRole}>{workerRole}</Text>
                            {record.latitude && record.longitude && (
                              <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}
                                onPress={() => {
                                  const url = `https://www.google.com/maps/search/?api=1&query=${record.latitude},${record.longitude}`;
                                  Linking.openURL(url).catch(err => console.error("Couldn't load map", err));
                                }}
                              >
                                <Feather name="map-pin" size={10} color="#3B82F6" />
                                <Text style={{ fontSize: 10, color: '#3B82F6', fontWeight: '600', textDecorationLine: 'underline' }}>
                                  GPS Stamped
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                            <Text style={{ color: statusColor, fontSize: 11, fontWeight: '700' }}>
                              {record.status} {record.hours > 0 ? `(${record.hours}h)` : ''}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))
              ) : (
                <View style={styles.emptyModalState}>
                  <Feather name="calendar" size={40} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyModalText}>No attendance records marked yet.</Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===== SHARED DOCUMENTS MODAL ===== */}
      <Modal visible={showDocsModal} transparent animationType="slide" onRequestClose={() => setShowDocsModal(false)}>
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setShowDocsModal(false)}>
          <TouchableOpacity style={styles.infoModalCard} activeOpacity={1}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Shared Documents</Text>
              <TouchableOpacity onPress={() => setShowDocsModal(false)} style={styles.infoModalCloseBtn}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.infoModalBody} showsVerticalScrollIndicator={false}>
              {(() => {
                const dbFiles = workspace?.files || [];
                const chatFiles = messages
                  .filter(m => m.attachment && (m.attachment.type === 'file' || m.attachment.name?.endsWith('.pdf')))
                  .map(m => ({
                    name: m.attachment!.name,
                    url: m.attachment!.url,
                    createdAt: m.createdAt,
                    uploadedBy: typeof m.sender === 'object' ? m.sender.fullName : 'Chat Attachment'
                  }));
                
                const allDocs = [...dbFiles, ...chatFiles];

                return allDocs.length > 0 ? (
                  allDocs.map((doc: any, idx: number) => (
                    <TouchableOpacity key={idx} style={styles.docItemCard} onPress={() => { if (doc.url) Linking.openURL(doc.url); }}>
                      <View style={[styles.fileIconBox, doc.name?.endsWith('.pdf') ? { backgroundColor: '#FEE2E2' } : { backgroundColor: '#EFF6FF' }]}>
                        <FontAwesome5
                          name={doc.name?.endsWith('.pdf') ? 'file-pdf' : 'file-alt'}
                          size={18}
                          color={doc.name?.endsWith('.pdf') ? '#EF4444' : COLORS.blue}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.docItemName} numberOfLines={1}>{doc.name}</Text>
                        <Text style={styles.docItemMeta}>
                          {doc.uploadedBy?.fullName || doc.uploadedBy || 'System'} · {new Date(doc.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <Feather name="download" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyModalState}>
                    <Feather name="file-text" size={40} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyModalText}>No documents shared yet.</Text>
                  </View>
                );
              })()}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===== PAYMENT HISTORY MODAL ===== */}
      <Modal visible={showPaymentsModal} transparent animationType="slide" onRequestClose={() => setShowPaymentsModal(false)}>
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setShowPaymentsModal(false)}>
          <TouchableOpacity style={styles.infoModalCard} activeOpacity={1}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Payment History</Text>
              <TouchableOpacity onPress={() => setShowPaymentsModal(false)} style={styles.infoModalCloseBtn}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.infoModalBody} showsVerticalScrollIndicator={false}>
              {workspace?.labourManagement?.payments?.length > 0 ? (
                workspace.labourManagement.payments.map((pay: any, idx: number) => {
                  const worker = workspace.labourTeam?.find((l: any) => l._id === pay.labourId || l === pay.labourId);
                  const workerName = worker && typeof worker === 'object' ? worker.fullName : 'Worker';
                  
                  return (
                    <View key={idx} style={styles.paymentRecordRow}>
                      <View style={styles.paymentIconCircle}>
                        <Feather name="arrow-up-right" size={18} color={COLORS.green} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.paymentWorkerName}>{workerName}</Text>
                        <Text style={styles.paymentDate}>
                          {new Date(pay.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.paymentAmountText}>₹{pay.amount.toLocaleString('en-IN')}</Text>
                        <Text style={styles.paymentTypeText}>{pay.type}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyModalState}>
                  <Feather name="credit-card" size={40} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={styles.emptyModalText}>No payment records found.</Text>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===== SITE PHOTOS MODAL ===== */}
      <Modal visible={showPhotosModal} transparent animationType="slide" onRequestClose={() => setShowPhotosModal(false)}>
        <TouchableOpacity style={styles.modalOverlayCenter} activeOpacity={1} onPress={() => setShowPhotosModal(false)}>
          <TouchableOpacity style={styles.infoModalCard} activeOpacity={1}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Site Photos</Text>
              <TouchableOpacity onPress={() => setShowPhotosModal(false)} style={styles.infoModalCloseBtn}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.infoModalBody} showsVerticalScrollIndicator={false}>
              {(() => {
                const dbPhotos = workspace?.updates?.filter((up: any) => up.img).map((up: any) => up.img) || [];
                const chatPhotos = messages
                  .filter(m => m.attachment?.type === 'image' && m.attachment.url)
                  .map(m => m.attachment!.url);
                
                const allPhotos = [...new Set([...dbPhotos, ...chatPhotos])].filter(Boolean);

                return allPhotos.length > 0 ? (
                  <View style={styles.photoModalGrid}>
                    {allPhotos.map((photoUrl: string, idx: number) => (
                      <TouchableOpacity key={idx} style={styles.photoGridItem} onPress={() => { setShowPhotosModal(false); setPreviewImage(photoUrl); }}>
                        <Image source={{ uri: photoUrl }} style={styles.photoGridImage} contentFit="cover" />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyModalState}>
                    <Feather name="camera" size={40} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                    <Text style={styles.emptyModalText}>No site photos shared yet.</Text>
                  </View>
                );
              })()}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===== SPEECH TO TEXT MODAL (Commented out) =====
      <Modal visible={showSttModal} transparent animationType="fade" onRequestClose={handleCancelSttRecording}>
        <View style={styles.sttOverlay}>
          <View style={styles.sttCard}>
            <Text style={styles.sttTitle}>Speech to Text</Text>
            
            {isTranscribing ? (
              <View style={styles.transcribingContainer}>
                <ActivityIndicator size="large" color="#F59E0B" />
                <Text style={styles.transcribingText}>Transcribing your voice... Please wait.</Text>
              </View>
            ) : (
              <View style={styles.listeningContainer}>
                <Text style={styles.listeningLangText}>Auto-Detecting Language</Text>
                
                <View style={styles.micPulseOutline}>
                  <Animated.View style={[
                    styles.micButtonActive,
                    { transform: [{ scale: pulseAnim }] }
                  ]}>
                    <Feather name="mic" size={28} color="#FFFFFF" />
                  </Animated.View>
                </View>

                <Text style={styles.listeningText}>Listening... Speak now</Text>
                <Text style={styles.listeningDuration}>{formatDuration(sttDuration)}</Text>

                <View style={styles.listeningActionRow}>
                  <TouchableOpacity 
                    style={[styles.listeningBtn, styles.listeningCancelBtn]} 
                    onPress={handleCancelSttRecording}
                  >
                    <Text style={styles.listeningCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.listeningBtn, styles.listeningDoneBtn]} 
                    onPress={handleStopSttRecordingAndTranscribe}
                  >
                    <Text style={styles.listeningDoneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
      ===== */}

      {/* ===== INPUT FOOTER ===== */}
      <View>
        {isRecording ? (
          /* ===== RECORDING UI ===== */
          <View style={styles.recordingContainer}>
            <TouchableOpacity style={styles.recordCancelBtn} onPress={handleCancelRecording}>
              <Feather name="trash-2" size={20} color="#EF4444" />
            </TouchableOpacity>

            <View style={styles.recordingInfo}>
              <Animated.View style={[
                styles.recordingDot,
                { transform: [{ scale: pulseAnim }] }
              ]} />
              <Text style={styles.recordingTimeText}>
                {formatDuration(recordingDuration)}
              </Text>
              <Text style={styles.recordingLabel}>Recording...</Text>
            </View>

            <TouchableOpacity style={styles.recordSendBtn} onPress={handleStopRecording}>
              <Feather name="send" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          /* ===== NORMAL INPUT ===== */
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.inputIconBtn} onPress={() => { Keyboard.dismiss(); setShowAttachMenu(true); }}>
                <Feather name="plus" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>

              <TransliteratedTextInput
                style={styles.textInput}
                placeholder="Message"
                placeholderTextColor="#8696A0"
                value={text}
                onChangeText={handleTextChange}
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
                multiline
              />

              <TouchableOpacity style={styles.inputIconBtn} onPress={handleTakePhoto}>
                <Feather name="camera" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.sendBtn, !text.trim() && styles.sendBtnMic]}
              onPress={text.trim() ? handleSend : handleStartRecording}
              activeOpacity={0.8}
            >
              <Feather name={text.trim() ? 'send' : 'mic'} size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        )}
      </View>
      </KeyboardAvoidingView>

      {/* ===== IN-APP VOIP CALL OVERLAY ===== */}
      <Modal
        visible={callState !== 'idle'}
        animationType="slide"
        transparent={false}
        onRequestClose={handleEndCall}
      >
        <SafeAreaView style={styles.callOverlayContainer}>
          <View style={styles.callContent}>
            {/* Top section: Status */}
            <View style={styles.callHeaderContainer}>
              <Feather name="shield" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.callHeaderSecurityText}>End-to-end Encrypted</Text>
            </View>

            {/* Middle section: Profile details */}
            <View style={styles.callProfileContainer}>
              <View style={styles.callAvatarOutline}>
                <Image
                  source={{ uri: (callState === 'incoming' && callerInfo ? callerInfo.callerAvatar : receiverAvatar) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop' }}
                  style={styles.callAvatar}
                />
              </View>
              <Text style={styles.callProfileName}>
                {callState === 'incoming' && callerInfo ? callerInfo.callerName : receiverName}
              </Text>
              <Text style={styles.callStatusText}>
                {callState === 'calling' ? 'Ringing...' : callState === 'incoming' ? 'Incoming Call...' : formatTimer(callTimer)}
              </Text>
            </View>

            {/* Bottom section: Actions */}
            <View style={styles.callActionsContainer}>
              {callState === 'active' && (
                <View style={styles.callControlRow}>
                  <TouchableOpacity 
                    style={[styles.callControlBtn, isMuted && styles.callControlBtnActive]} 
                    onPress={() => setIsMuted(!isMuted)}
                  >
                    <Feather name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? COLORS.white : "#FFFFFF"} />
                    <Text style={styles.callControlLabel}>Mute</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.callControlBtn, isSpeaker && styles.callControlBtnActive]} 
                    onPress={() => setIsSpeaker(!isSpeaker)}
                  >
                    <Feather name={isSpeaker ? "volume-2" : "volume-x"} size={22} color={isSpeaker ? COLORS.white : "#FFFFFF"} />
                    <Text style={styles.callControlLabel}>Speaker</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.callMainActionRow}>
                {callState === 'incoming' ? (
                  <>
                    <TouchableOpacity 
                      style={[styles.callCircleBtn, styles.declineBtn]} 
                      onPress={handleDeclineCall}
                    >
                      <Feather name="phone-off" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.callCircleBtn, styles.acceptBtn]} 
                      onPress={handleAcceptCall}
                    >
                      <Feather name="phone" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity 
                    style={[styles.callCircleBtn, styles.hangupBtn]} 
                    onPress={handleEndCall}
                  >
                    <Feather name="phone-off" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.headerBg },

  /* HEADER */
  header: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    backgroundColor: COLORS.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerProfileClickable: { flexDirection: 'row', alignItems: 'center', flex: 1, height: '100%', paddingLeft: 4 },
  backBtn: { padding: 4, marginRight: 2 },
  avatarWrapper: { position: 'relative', marginRight: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#22C55E', borderWidth: 1.5, borderColor: COLORS.white,
  },
  headerTitles: { justifyContent: 'center', flex: 1 },
  headerName: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  headerStatus: { fontSize: 12, color: COLORS.textMuted },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerIconBtn: { padding: 4 },

  /* CHAT AREA */
  chatArea: { flex: 1, backgroundColor: COLORS.chatBg },
  centerWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  chatListContent: { paddingHorizontal: 10, paddingVertical: 12, gap: 4 },

  /* EMPTY CHAT */
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyChatIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyChatTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  emptyChatSub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },

  /* TYPING */
  typingBar: { paddingHorizontal: 14, paddingBottom: 4 },
  typingBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1,
  },
  typingDots: { fontSize: 16, color: '#8696A0', letterSpacing: 2 },

  /* MESSAGE BUBBLES */
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 1 },
  messageRowLeft: { alignSelf: 'flex-start', maxWidth: '80%' },
  messageRowRight: { alignSelf: 'flex-end', maxWidth: '80%' },
  senderAvatar: { width: 0, height: 0, borderRadius: 0, marginRight: 0 }, // hidden for WhatsApp style
  messageBubble: {
    borderRadius: 8, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 4,
    minWidth: 80, position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 1, elevation: 1,
  },
  bubbleIncoming: {
    backgroundColor: COLORS.incoming,
    borderTopLeftRadius: 0,
    marginLeft: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bubbleOutgoing: {
    backgroundColor: COLORS.outgoing,
    borderTopRightRadius: 0,
    marginRight: 4,
  },
  messageText: { fontSize: 15, color: COLORS.textDark, lineHeight: 20, marginBottom: 2 },

  /* TIME + TICKS */
  timeContainer: {
    flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 3, marginTop: 1,
  },
  messageTime: { fontSize: 11, color: '#8696A0' },
  tickRow: { marginLeft: 2 },

  /* IMAGE ATTACHMENT */
  imageAttachment: {
    width: width * 0.6, height: width * 0.45,
    borderRadius: 6, marginBottom: 4, backgroundColor: '#e0e0e0',
  },

  /* FILE ATTACHMENT */
  fileAttachmentCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 8, padding: 10, marginBottom: 4,
    width: width * 0.58,
  },
  fileIconBox: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  fileDetails: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: '600', color: COLORS.textDark },
  fileSize: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  /* INPUT FOOTER */
  inputContainer: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 6, paddingVertical: 6, gap: 6,
    backgroundColor: COLORS.chatBg,
  },
  inputRow: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: COLORS.white, borderRadius: 24,
    paddingHorizontal: 8, paddingVertical: Platform.OS === 'ios' ? 8 : 2,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  inputIconBtn: { padding: 6 },
  textInput: {
    flex: 1, fontSize: 16, color: COLORS.textDark,
    maxHeight: 100, paddingHorizontal: 6,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnMic: { backgroundColor: '#F59E0B' },

  /* RECORDING UI */
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
    backgroundColor: '#FFF7ED',
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
  },
  recordCancelBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  recordingTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    fontVariant: ['tabular-nums'],
  },
  recordingLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  recordSendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* VOICE MESSAGE */
  voiceMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    width: width * 0.55,
    gap: 8,
  },
  voicePlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePlayBtnActive: {
    backgroundColor: '#F59E0B',
  },
  voiceWaveformArea: {
    flex: 1,
  },
  voiceWaveformTrack: {
    height: 24,
    position: 'relative',
    justifyContent: 'center',
  },
  voiceWaveformFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  voiceWaveformBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  voiceBar: {
    width: 2.5,
    borderRadius: 1.5,
    minHeight: 3,
  },
  voiceDurationText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  /* ATTACHMENT MENU */
  attachOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  attachMenuCard: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 24, paddingBottom: 40, paddingHorizontal: 30,
  },
  attachRow: { flexDirection: 'row', justifyContent: 'space-around' },
  attachOption: { alignItems: 'center', gap: 8 },
  attachIconCircle: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  attachLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textDark },

  /* IMAGE PREVIEW */
  previewOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  previewCloseBtn: {
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, right: 20,
    padding: 8, zIndex: 10,
  },
  previewImage: { width: width, height: width * 1.2 },

  /* DROPDOWN MENU */
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: Platform.OS === 'ios' ? 100 : 60,
    marginRight: 12,
    width: 200,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  menuHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    paddingHorizontal: 16,
    paddingVertical: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },

  /* INFO MODALS (Attendance, Documents, Payments, Photos) */
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoModalCard: {
    width: width * 0.9,
    maxHeight: '75%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  infoModalCloseBtn: {
    padding: 4,
  },
  infoModalBody: {
    marginTop: 12,
  },
  emptyModalState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyModalText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  /* Attendance Report styles */
  attendanceDateGroup: {
    marginBottom: 20,
  },
  attendanceDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
  },
  attendanceDateText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  attendanceRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  attendanceWorkerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  attendanceWorkerRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Shared Documents styles */
  docItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  docItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  docItemMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
  },

  /* Payment History styles */
  paymentRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  paymentIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentWorkerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  paymentDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  paymentAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  paymentTypeText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },

  /* Site Photos styles */
  photoModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 20,
  },
  photoGridItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
  },

  /* Speech-to-Text styles */
  sttOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sttCard: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  sttTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  sttSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  langGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  langButton: {
    width: '47%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  langNative: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  sttCloseButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  sttCloseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  listeningContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    width: '100%',
  },
  micPulseOutline: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  micButtonActive: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listeningLangText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  listeningText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  listeningDuration: {
    fontSize: 24,
    fontWeight: '800',
    color: '#475569',
    fontVariant: ['tabular-nums'],
    marginBottom: 24,
  },
  listeningActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  listeningBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listeningCancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  listeningCancelBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  listeningDoneBtn: {
    backgroundColor: '#F59E0B',
  },
  listeningDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  transcribingContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  transcribingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 16,
    textAlign: 'center',
  },
  callOverlayContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  callContent: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  callHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    opacity: 0.8,
  },
  callHeaderSecurityText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '500',
  },
  callProfileContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  callAvatarOutline: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#F59E0B',
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  callAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  callProfileName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  callStatusText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  callActionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 30,
    marginBottom: 20,
  },
  callControlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    width: '100%',
  },
  callControlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  callControlBtnActive: {
    backgroundColor: '#F59E0B',
  },
  callControlLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  callMainActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    width: '100%',
  },
  callCircleBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  acceptBtn: {
    backgroundColor: '#22C55E',
  },
  declineBtn: {
    backgroundColor: '#EF4444',
  },
  hangupBtn: {
    backgroundColor: '#EF4444',
  },
});
