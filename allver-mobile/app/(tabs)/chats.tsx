import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { BACKEND_URL } from '../../constants/Config';
import { useTranslation } from '../../utils/i18n';

import NotificationBell from '../../components/NotificationBell';

const getParticipantDetails = (workspace: any, currentUserId: string, onlineUserIds: string[] = []) => {
  const isClient = workspace.client?._id === currentUserId || workspace.client === currentUserId;
  const partner = isClient ? workspace.professional : workspace.client;
  const partnerId = partner?._id || partner;
  const isOnline = partnerId ? onlineUserIds.includes(partnerId.toString()) : false;
  
  const lastMessage = workspace.messages && workspace.messages.length > 0 ? workspace.messages[workspace.messages.length - 1] : null;
  const timestamp = lastMessage ? new Date(lastMessage.createdAt).getTime() : new Date(workspace.updatedAt || workspace.createdAt || 0).getTime();

  return {
    id: workspace._id,
    receiverId: partnerId ? partnerId.toString() : '',
    name: partner?.fullName || 'User',
    role: partner?.role || 'Professional',
    project: workspace.title,
    message: lastMessage ? lastMessage.text : 'No messages yet',
    time: lastMessage ? new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    timestamp,
    unreadCount: 0,
    online: isOnline,
    avatar: partner?.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop',
    type: partner?.role === 'Client' ? 'Projects' : 'Professionals',
    isReal: true
  };
};

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
  badgeRed: '#EF4444',
};

const CONVERSATIONS_DATA: any[] = [];

export default function ChatsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Projects' | 'Professionals' | 'System' | 'Unread'>('All');
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const loadConversations = useCallback(async (user: any) => {
    if (!user) return;
    const userId = user._id;

    // Fetch online users list
    let onlineUserIds: string[] = [];
    try {
      const onlineRes = await fetch(`${BACKEND_URL}/api/users/online`);
      if (onlineRes.ok) {
        const onlineData = await onlineRes.json();
        onlineUserIds = onlineData.onlineUserIds || [];
      }
    } catch (e) {
      console.log('Error fetching online user list:', e);
    }

    // Fetch real DM conversations
    const fetchDMConversations = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/conversations/user/${userId}`);
        if (res.ok) {
          const data = await res.json();
          const dmChats = data.conversations
            .filter((convo: any) => convo.otherUser && convo.otherUser._id)
            .map((convo: any) => {
              const timestamp = convo.lastMessage?.createdAt
                ? new Date(convo.lastMessage.createdAt).getTime()
                : new Date(convo.updatedAt || convo.createdAt || 0).getTime();
              return {
                id: convo._id,
                name: convo.otherUser?.fullName || 'User',
                role: convo.otherUser?.role || 'Professional',
                project: 'Direct Message',
                message: convo.lastMessage?.text || 'No messages yet',
                time: convo.lastMessage?.createdAt
                  ? new Date(convo.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '',
                timestamp,
                unreadCount: convo.unreadCount || 0,
                online: convo.isOnline || false,
                avatar: convo.otherUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=120&auto=format&fit=crop',
                type: 'Professionals',
                isDM: true,
                receiverId: convo.otherUser?._id,
                conversationId: convo._id,
              };
            });
          return dmChats;
        }
      } catch (err) {
        console.log('Error fetching DM conversations:', err);
      }
      return [];
    };

    // Fetch project workspace chats
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/project-workspaces/user/${userId}`);
        if (res.ok) {
          const data = await res.json();
          return data.workspaces
            .filter((w: any) => {
              const isClient = w.client?._id === userId || w.client === userId;
              const partner = isClient ? w.professional : w.client;
              return partner && (partner._id || typeof partner === 'string');
            })
            .map((w: any) => getParticipantDetails(w, userId, onlineUserIds));
        }
      } catch (err) {
        console.log('Error fetching workspaces:', err);
      }
      return [];
    };

    const [dmChats, workspaceChats] = await Promise.all([fetchDMConversations(), fetchWorkspaces()]);
    // Merge real chats only, no dummy/mock data
    const allReal = [...dmChats, ...workspaceChats];

    // Group by receiverId to de-duplicate, summing up unreadCounts and keeping the latest conversation
    const chatGroups: { [key: string]: any } = {};
    const fallbackChats: any[] = [];
    
    allReal.forEach(chat => {
      const rId = chat.receiverId;
      if (!rId) {
        if (chat.isNotification || chat.isSupport || chat.isMaterial) {
          fallbackChats.push(chat);
        }
        return;
      }
      
      if (!chatGroups[rId]) {
        chatGroups[rId] = {
          ...chat,
          totalUnread: chat.unreadCount || 0,
        };
      } else {
        chatGroups[rId].totalUnread += (chat.unreadCount || 0);
        if (chat.timestamp > chatGroups[rId].timestamp) {
          const accumulatedUnread = chatGroups[rId].totalUnread;
          chatGroups[rId] = {
            ...chat,
            totalUnread: accumulatedUnread
          };
        }
      }
    });

    const uniqueChats = [
      ...Object.values(chatGroups).map((chat: any) => ({
        ...chat,
        unreadCount: chat.totalUnread
      })),
      ...fallbackChats
    ];

    // Sort by timestamp descending (newest first)
    uniqueChats.sort((a, b) => b.timestamp - a.timestamp);
    setConversations(uniqueChats);
  }, []);

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
      loadConversations(user);
    }
  }, []);

  // Refresh conversations when the tab comes back into focus
  useFocusEffect(
    useCallback(() => {
      if (currentUser) {
        loadConversations(currentUser);
      }
    }, [currentUser, loadConversations])
  );

  // Compute total unread count dynamically
  const totalUnreadCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const handleChatPress = (chat: any) => {
    // Immediately clear unread badge in local state for instant UI feedback
    if (chat.unreadCount > 0) {
      setConversations(prev =>
        prev.map(c =>
          c.id === chat.id ? { ...c, unreadCount: 0 } : c
        )
      );

      // Also call backend to mark conversation as read
      if (chat.conversationId && currentUser?._id) {
        fetch(`${BACKEND_URL}/api/conversations/${chat.conversationId}/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser._id }),
        }).catch(err => console.log('Error marking as read:', err));
      }
    }

    if (chat.isDM) {
      // Navigate to DM chat with receiverId
      router.push({
        pathname: '/chat-room',
        params: {
          receiverId: chat.receiverId,
          conversationId: chat.conversationId,
          name: chat.name,
          role: chat.role,
          avatar: chat.avatar,
        }
      });
    } else {
      // Navigate to project workspace chat (legacy)
      router.push({
        pathname: '/chat-room',
        params: {
          receiverId: chat.id,
          name: chat.name,
          role: chat.role,
          avatar: chat.avatar,
        }
      });
    }
  };

  const filteredConversations = conversations.filter((chat) => {
    // 1. Category Filter
    if (selectedFilter === 'Projects' && chat.type !== 'Projects') return false;
    if (selectedFilter === 'Professionals' && chat.type !== 'Professionals') return false;
    if (selectedFilter === 'System' && chat.type !== 'System') return false;
    if (selectedFilter === 'Unread' && chat.unreadCount === 0) return false;

    // 2. Search Filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      return (
        chat.name.toLowerCase().includes(query) ||
        chat.role.toLowerCase().includes(query) ||
        chat.project.toLowerCase().includes(query) ||
        chat.message.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const renderAvatar = (chat: typeof CONVERSATIONS_DATA[0]) => {
    if (chat.isNotification) {
      return (
        <View style={[styles.specialAvatar, { backgroundColor: '#EFF6FF' }]}>
          <Feather name="shield" size={20} color={COLORS.blue} />
        </View>
      );
    }
    if (chat.isSupport) {
      return (
        <View style={[styles.specialAvatar, { backgroundColor: '#ECFDF5' }]}>
          <Feather name="headphones" size={20} color={COLORS.green} />
        </View>
      );
    }
    if (chat.isMaterial) {
      return (
        <View style={[styles.specialAvatar, { backgroundColor: '#F5F3FF' }]}>
          <Feather name="truck" size={20} color="#8B5CF6" />
        </View>
      );
    }

    return (
      <View style={styles.avatarWrapper}>
        <Image source={{ uri: chat.avatar }} style={styles.avatar} />
        {chat.online && <View style={styles.onlineDot} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ================= HEADER ================= */}
      <View style={styles.headerContainer}>
        <View style={styles.logoRow}>
          <Image 
            source={require('@/assets/images/allver-logo.svg')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <View style={styles.headerIconsRow}>
            <NotificationBell size={20} color={COLORS.textDark} />

            <TouchableOpacity style={[styles.iconBadgeBtn, styles.activeHeaderBtn]}>
              <Feather name="message-square" size={20} color={COLORS.textDark} />
              {totalUnreadCount > 0 && (
                <View style={styles.badgeCircle}><Text style={styles.badgeText}>{totalUnreadCount}</Text></View>
              )}
              <View style={styles.activeHeaderLine} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.avatarBtn}
              onPress={() => router.push('/profile')}
            >
              <Image 
                source={currentUser?.avatarUrl ? { uri: currentUser.avatarUrl } : require('../../assets/android-icon-foreground.png')} 
                style={styles.avatarImage}
                contentFit={currentUser?.avatarUrl ? "cover" : "contain"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Title */}
        <Text style={styles.pageTitle}>{t('messages')}</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBarWrapper}>
            <Feather name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder={t('searchMessagesPlaceholder')} 
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterBtn}>
              <Feather name="sliders" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Filters Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {(['All', 'Projects', 'Professionals', 'System', 'Unread'] as const).map((filter) => {
            const isSelected = selectedFilter === filter;
            const filterLabels: Record<string, string> = {
              All: t('all') || 'All',
              Projects: t('projects') || 'Projects',
              Professionals: t('professionals') || 'Professionals',
              System: t('system') || 'System',
              Unread: t('unread') || 'Unread',
            };
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {filterLabels[filter]}
                </Text>
                {filter === 'Unread' && totalUnreadCount > 0 && (
                  <View style={[styles.chipBadge, isSelected && styles.chipBadgeActive]}>
                    <Text style={[styles.chipBadgeText, isSelected && styles.chipBadgeTextActive]}>{totalUnreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Conversations List */}
        <View style={styles.listContainer}>
          {filteredConversations.map((chat) => (
            <TouchableOpacity 
              key={chat.id} 
              style={styles.chatItem} 
              activeOpacity={0.7}
              onPress={() => handleChatPress(chat)}
            >
              {renderAvatar(chat)}
              
              <View style={styles.chatDetails}>
                <View style={styles.nameRow}>
                  <Text style={styles.chatName} numberOfLines={1}>{chat.name}</Text>
                  <Text style={styles.chatTime}>{chat.time}</Text>
                </View>

                {/* Subtitle/Project badge */}
                <View style={styles.projectBadge}>
                  <Text style={styles.projectText}>{chat.project}</Text>
                </View>

                <View style={styles.messageRow}>
                  <Text style={[styles.messageText, chat.unreadCount > 0 && styles.messageTextUnread]} numberOfLines={1}>
                    {chat.message}
                  </Text>
                  {chat.unreadCount > 0 && (
                    <View style={styles.unreadCountBadge}>
                      <Text style={styles.unreadCountText}>{chat.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {filteredConversations.length === 0 && (
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>{t('noMessagesFound')}</Text>
            </View>
          )}
        </View>

      </ScrollView>
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingBottom: 80 },

  /* HEADER */
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: COLORS.white,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoImage: {
    width: 125,
    height: 34,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadgeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  activeHeaderBtn: {
    position: 'relative',
  },
  activeHeaderLine: {
    position: 'absolute',
    bottom: -12,
    left: 4,
    right: 4,
    height: 3,
    backgroundColor: COLORS.yellow,
    borderRadius: 2,
  },
  badgeCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

  /* PAGE TITLE */
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 6,
  },

  /* SEARCH BAR */
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 44,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: COLORS.textDark,
  },
  filterBtn: {
    padding: 6,
    marginLeft: 8,
  },

  /* CHIPS */
  chipsScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    gap: 6,
  },
  chipActive: {
    backgroundColor: COLORS.yellow,
    borderColor: COLORS.yellow,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  chipBadge: {
    backgroundColor: COLORS.yellowLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 16,
    alignItems: 'center',
  },
  chipBadgeActive: {
    backgroundColor: COLORS.white,
  },
  chipBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.yellow,
  },
  chipBadgeTextActive: {
    color: COLORS.yellow,
  },

  /* LIST */
  listContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  specialAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  chatDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  chatTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  projectBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
  },
  projectText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
    marginRight: 8,
  },
  messageTextUnread: {
    color: COLORS.textDark,
    fontWeight: '600',
  },
  unreadCountBadge: {
    backgroundColor: COLORS.yellow,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCountText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },

  /* EMPTY */
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  }
});
