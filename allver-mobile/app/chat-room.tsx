import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { io } from 'socket.io-client';

const { width } = Dimensions.get('window');

const COLORS = {
  white: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#6B7280',
  bgLight: '#F9FAFB',
  green: '#10B981',
  blue: '#2563EB',
  orange: '#F97316',
  yellow: '#F59E0B',
  yellowLight: '#FEF3C7',
  border: '#E5E7EB',
  badgeGold: '#F59E0B',
};

import { BACKEND_URL } from '../constants/Config';

interface Message {
  _id: string;
  sender: {
    _id: string;
    fullName: string;
    role: string;
  };
  text: string;
  attachment?: {
    name: string;
    url: string;
    type: string;
  };
  createdAt: string;
  reactions?: Array<{
    emoji: string;
    count: number;
  }>;
}

const getMockMessages = (clientName: string) => [
  {
    _id: 'msg-1',
    sender: { _id: 'rahul-id', fullName: 'Rahul Contractor', role: 'Civil Contractor' },
    text: `Hi ${clientName}, thank you for considering me for your project.`,
    createdAt: new Date(new Date().getTime() - 60000 * 20).toISOString(),
  },
  {
    _id: 'msg-2',
    sender: { _id: 'default-user-id', fullName: clientName, role: 'Client' },
    text: 'Hi Rahul, please share your availability and estimated timeline for this project.',
    createdAt: new Date(new Date().getTime() - 60000 * 18).toISOString(),
  },
  {
    _id: 'msg-3',
    sender: { _id: 'rahul-id', fullName: 'Rahul Contractor', role: 'Civil Contractor' },
    text: 'Sure, I can start the work from next week. The estimated time will be 4 to 5 months to complete the total work.',
    createdAt: new Date(new Date().getTime() - 60000 * 16).toISOString(),
  },
  {
    _id: 'msg-4',
    sender: { _id: 'default-user-id', fullName: clientName, role: 'Client' },
    text: "That's great! Please share the materials list and estimated cost.",
    createdAt: new Date(new Date().getTime() - 60000 * 15).toISOString(),
  },
  {
    _id: 'msg-5',
    sender: { _id: 'rahul-id', fullName: 'Rahul Contractor', role: 'Civil Contractor' },
    text: '',
    attachment: {
      name: 'Estimated_Cost_Breakup.pdf',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      type: 'file',
    },
    createdAt: new Date(new Date().getTime() - 60000 * 13).toISOString(),
  },
  {
    _id: 'msg-6',
    sender: { _id: 'default-user-id', fullName: clientName, role: 'Client' },
    text: 'Thanks! I will review and get back to you.',
    createdAt: new Date(new Date().getTime() - 60000 * 12).toISOString(),
  },
  {
    _id: 'msg-7',
    sender: { _id: 'rahul-id', fullName: 'Rahul Contractor', role: 'Civil Contractor' },
    text: `Sure ${clientName}, let know if you have any questions.`,
    createdAt: new Date(new Date().getTime() - 60000 * 10).toISOString(),
    reactions: [
      { emoji: '👍', count: 1 }
    ]
  }
];

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, name, role, project, avatar, online, isReal } = params;

  const [currentUser, setCurrentUser] = useState<any>({
    _id: 'default-user-id',
    fullName: 'Rohit',
    role: 'Client'
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState<any>(null);
  
  const flatListRef = useRef<FlatList>(null);

  // 1. Load current user profile session
  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        user = JSON.parse(stored);
      }
    }
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  // 2. Fetch history and connect to Socket.io
  useEffect(() => {
    // A. Load message history
    if (isReal === 'true') {
      const fetchHistory = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${id}?userId=${currentUser._id}`);
          if (res.ok) {
            const data = await res.json();
            setMessages(data.workspace.messages || []);
          }
        } catch (err) {
          console.error('Error fetching workspace history:', err);
        }
      };
      if (currentUser._id !== 'default-user-id') {
        fetchHistory();
      }
    } else {
      setMessages(getMockMessages(currentUser.fullName || 'Rohit'));
    }

    // B. Setup socket connection
    const socketInstance = io(BACKEND_URL, {
      transports: ['websocket'],
      forceNew: true
    });
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket client connected. Joining room:', id);
      socketInstance.emit('join_room', { roomId: id });
    });

    socketInstance.on('receive_message', (data) => {
      console.log('Socket message received:', data);
      if (data.workspaceId === id) {
        setMessages((prev) => {
          if (prev.some(m => m._id === data.message._id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [id, isReal, currentUser._id]);

  // Scroll to bottom on content size change or new message
  const handleContentSizeChange = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  const handleSend = async () => {
    if (!text.trim()) return;

    const messageText = text;
    setText('');

    const tempId = Math.random().toString();
    const newMsg: Message = {
      _id: tempId,
      sender: {
        _id: currentUser._id,
        fullName: currentUser.fullName,
        role: currentUser.role
      },
      text: messageText,
      createdAt: new Date().toISOString()
    };

    if (isReal !== 'true') {
      // Append locally and emit directly over socket for mock room
      setMessages((prev) => [...prev, newMsg]);
      if (socket) {
        socket.emit('send_message', {
          roomId: id,
          message: newMsg
        });
      }
    } else {
      // POST to backend and let the backend broadcast it
      try {
        const response = await fetch(`${BACKEND_URL}/api/project-workspaces/${id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sender: currentUser._id,
            text: messageText
          })
        });

        if (!response.ok) {
          Alert.alert('Failed to send', 'There was a problem delivering your message.');
        }
      } catch (err) {
        console.error('Failed sending message via REST API:', err);
      }
    }
  };

  // Generate dynamic Project ID code based on workspace ID
  const displayProjectId = () => {
    if (isReal === 'true' && typeof id === 'string') {
      return `#ALV${id.substring(id.length - 4).toUpperCase()}`;
    }
    return '#ALV1256';
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isOutgoing = item.sender._id === currentUser._id;
    
    return (
      <View style={[styles.messageRow, isOutgoing ? styles.messageRowRight : styles.messageRowLeft]}>
        
        {/* Profile Avatar for incoming messages */}
        {!isOutgoing && (
          <Image 
            source={{ uri: (avatar as string) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop' }} 
            style={styles.senderAvatar}
          />
        )}

        <View style={styles.bubbleContainer}>
          <View style={[
            styles.messageBubble, 
            isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming
          ]}>
            {/* Render file attachments (PDF) */}
            {item.attachment && item.attachment.name.endsWith('.pdf') && (
              <TouchableOpacity style={styles.pdfAttachmentCard} activeOpacity={0.8}>
                <View style={styles.pdfIconBox}>
                  <FontAwesome5 name="file-pdf" size={20} color="#EF4444" />
                </View>
                <View style={styles.pdfDetails}>
                  <Text style={styles.pdfName} numberOfLines={1}>{item.attachment.name}</Text>
                  <Text style={styles.pdfSize}>1.2 MB • PDF</Text>
                </View>
                <View style={styles.pdfDownloadBtn}>
                  <Feather name="download" size={16} color={COLORS.textMuted} />
                </View>
              </TouchableOpacity>
            )}

            {/* Message Text */}
            {item.text !== '' && (
              <Text style={styles.messageText}>{item.text}</Text>
            )}

            {/* Time and Double checkmark */}
            <View style={styles.timeContainer}>
              <Text style={styles.messageTime}>
                {formatMessageTime(item.createdAt)}
              </Text>
              {isOutgoing && (
                <FontAwesome5 name="check-double" size={11} color="#3B82F6" style={styles.checkIcon} />
              )}
            </View>
          </View>

          {/* Reaction badges */}
          {item.reactions && item.reactions.length > 0 && (
            <View style={[styles.reactionBadge, isOutgoing ? styles.reactionRight : styles.reactionLeft]}>
              <Text style={styles.reactionText}>
                {item.reactions[0].emoji} {item.reactions[0].count}
              </Text>
            </View>
          )}
        </View>

      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          
          <View style={styles.avatarWrapper}>
            <Image 
              source={{ uri: (avatar as string) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop' }} 
              style={styles.avatar}
            />
            {online === 'true' && <View style={styles.onlineDot} />}
          </View>

          <View style={styles.headerTitles}>
            <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
            <Text style={styles.headerStatus}>
              {online === 'true' ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Feather name="phone" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Feather name="more-horizontal" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= PROJECT BANNER ================= */}
      <View style={styles.projectBanner}>
        <View style={styles.bannerLeft}>
          <View style={styles.projectIconContainer}>
            <FontAwesome5 name="building" size={16} color="#D97706" />
          </View>
          <View style={styles.projectDetails}>
            <Text style={styles.projectTitle} numberOfLines={1}>{project}</Text>
            <Text style={styles.projectId}>{displayProjectId()}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.viewProjectBtn} activeOpacity={0.8}>
          <Text style={styles.viewProjectBtnText}>View Project</Text>
        </TouchableOpacity>
      </View>

      {/* ================= CHAT SCROLL AREA ================= */}
      <FlatList 
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.chatListContent}
        onContentSizeChange={handleContentSizeChange}
        onLayout={handleContentSizeChange}
        showsVerticalScrollIndicator={false}
      />

      {/* ================= INPUT FOOTER ================= */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity style={styles.attachmentBtn} activeOpacity={0.7}>
            <Feather name="paperclip" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
          
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textMuted}
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <TouchableOpacity style={styles.smileBtn}>
              <Feather name="smile" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.8}>
            <Feather name="send" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  
  /* HEADER */
  header: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  headerTitles: {
    justifyContent: 'center',
    flex: 1,
  },
  headerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  headerStatus: {
    fontSize: 12,
    color: COLORS.green,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 8,
  },

  /* PROJECT BANNER */
  projectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  projectIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  projectDetails: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  projectId: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  viewProjectBtn: {
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
  },
  viewProjectBtnText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '700',
  },

  /* CHAT SCROLL AREA */
  chatListContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 4,
  },
  bubbleContainer: {
    position: 'relative',
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'relative',
  },
  bubbleIncoming: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleOutgoing: {
    backgroundColor: '#FEF3C7',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 18,
  },
  timeContainer: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  checkIcon: {
    marginLeft: 4,
  },

  /* REACTION BADGES */
  reactionBadge: {
    position: 'absolute',
    bottom: -12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  reactionLeft: {
    left: 10,
  },
  reactionRight: {
    right: 10,
  },
  reactionText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },

  /* PDF ATTACHMENT CARD */
  pdfAttachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    width: width * 0.65,
    marginBottom: 4,
  },
  pdfIconBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pdfDetails: {
    flex: 1,
  },
  pdfName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  pdfSize: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pdfDownloadBtn: {
    padding: 4,
  },

  /* INPUT FOOTER */
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: COLORS.white,
  },
  attachmentBtn: {
    padding: 6,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    paddingVertical: 0,
  },
  smileBtn: {
    padding: 4,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
