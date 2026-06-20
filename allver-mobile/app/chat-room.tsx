import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Dimensions, Alert, Modal, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';

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
    type: string; // 'image', 'file', 'pdf'
  };
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  readBy?: string[];
  createdAt: string;
}

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

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
  }, [currentUser._id, receiverId]);

  // Track mapping of tempId → real MongoDB _id to prevent duplicates
  const sentMessageIdsRef = useRef<Set<string>>(new Set());

  // 3. Socket.io
  useEffect(() => {
    if (!conversationId) return;
    const s = io(BACKEND_URL, { transports: ['websocket'], forceNew: true });
    setSocket(s);

    s.on('connect', () => {
      s.emit('join_room', { roomId: conversationId });
      s.emit('go_online', { userId: currentUser._id });
    });

    s.on('receive_message', (data) => {
      if (data.workspaceId === conversationId) {
        const msgSenderId = typeof data.message.sender === 'object' 
          ? data.message.sender._id 
          : data.message.sender;
        
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
      }
    });

    s.on('user_typing', ({ userId }) => { if (userId !== currentUser._id) setIsTyping(true); });
    s.on('user_stop_typing', ({ userId }) => { if (userId !== currentUser._id) setIsTyping(false); });
    s.on('user_online', ({ userId }) => { if (userId === receiverId) setOtherUserOnline(true); });
    s.on('user_offline', ({ userId }) => { if (userId === receiverId) setOtherUserOnline(false); });

    return () => { s.disconnect(); };
  }, [conversationId]);

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
      const response = await fetch(`${BACKEND_URL}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUser._id, text: messageText, tempId })
      });
      if (response.ok) {
        const data = await response.json();
        const realId = data.message?._id;
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

  // ========== UPLOAD VIA BACKEND (server-side Cloudinary with proper credentials) ==========
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
      const response = await fetch(`${BACKEND_URL}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUser._id, text: '', attachment })
      });
      if (response.ok) {
        const data = await response.json();
        const realId = data.message?._id;
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
      const response = await fetch(`${BACKEND_URL}/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: currentUser._id, text: '', attachment })
      });
      if (response.ok) {
        const data = await response.json();
        const realId = data.message?._id;
        if (realId) sentMessageIdsRef.current.add(realId);
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...m, status: 'sent', _id: realId || m._id } : m));
      }
    } catch (err) { console.error('Error sending file:', err); }
  };

  const handleViewProfile = () => {
    setShowMenu(false);
    const isArchitect = receiverRole?.toLowerCase().includes('architect');
    const isContractor = receiverRole?.toLowerCase().includes('contractor');
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
        const sender = typeof msg.sender === 'object' ? msg.sender.fullName : (msg.sender === currentUser._id ? currentUser.fullName : receiverName);
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

    // Read by other user → blue double tick
    if (readByCount > 1 || status === 'read') {
      return (
        <View style={styles.tickRow}>
          <Ionicons name="checkmark-done" size={16} color="#53BDEB" />
        </View>
      );
    }
    // Delivered → grey double tick
    if (status === 'delivered' || status === 'sent') {
      return (
        <View style={styles.tickRow}>
          <Ionicons name="checkmark-done" size={16} color="#94A3B8" />
        </View>
      );
    }
    // Sending → single grey tick
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
    const senderAvatar = typeof item.sender === 'object' ? (item.sender as any).avatarUrl : undefined;
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
            return (
              <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImage(imgUrl)}>
                <Image
                  source={{ uri: imgUrl }}
                  style={styles.imageAttachment}
                  contentFit="cover"
                />
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
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
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Feather name="video" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn}>
            <Feather name="phone" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowMenu(true)}>
            <Feather name="more-vertical" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>
      </View>

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
            contentContainerStyle={styles.chatListContent}
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

      {/* ===== INPUT FOOTER ===== */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.inputIconBtn} onPress={() => setShowAttachMenu(true)}>
              <Feather name="plus" size={24} color={COLORS.textMuted} />
            </TouchableOpacity>

            <TextInput
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
            onPress={text.trim() ? handleSend : undefined}
            activeOpacity={0.8}
          >
            <Feather name={text.trim() ? 'send' : 'mic'} size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
});
