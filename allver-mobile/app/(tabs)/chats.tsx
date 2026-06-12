import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../../constants/Config';

const getParticipantDetails = (workspace: any, currentUserId: string) => {
  const isClient = workspace.client?._id === currentUserId || workspace.client === currentUserId;
  const partner = isClient ? workspace.professional : workspace.client;
  
  return {
    id: workspace._id,
    name: partner?.fullName || 'User',
    role: partner?.role || 'Professional',
    project: workspace.title,
    message: workspace.messages?.length > 0 ? workspace.messages[workspace.messages.length - 1].text : 'No messages yet',
    time: workspace.messages?.length > 0 ? new Date(workspace.messages[workspace.messages.length - 1].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    unreadCount: 0,
    online: true,
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

const CONVERSATIONS_DATA = [
  {
    id: '1',
    name: 'Rahul Contractor',
    role: 'Civil Contractor',
    type: 'Professionals',
    project: 'Luxury Villa Construction',
    message: 'Yes, I can start the work from next week.',
    time: '9:30 AM',
    unreadCount: 2,
    online: true,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop',
  },
  {
    id: '2',
    name: 'Ar. Rohit Sharma',
    role: 'Architect',
    type: 'Professionals',
    project: 'Office Renovation',
    message: 'Please share the floor plan and design details.',
    time: '9:15 AM',
    unreadCount: 1,
    online: true,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120&auto=format&fit=crop',
  },
  {
    id: '3',
    name: 'Amit Labour Supplier',
    role: 'Labour Supplier',
    type: 'Professionals',
    project: 'Labour Supply',
    message: '20 workers will be available tomorrow.',
    time: '8:45 AM',
    unreadCount: 0,
    online: true,
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=120&auto=format&fit=crop',
  },
  {
    id: '4',
    name: 'Shree Cement Supplier',
    role: 'Material Supplier',
    type: 'Projects',
    project: 'Material Delivery',
    message: 'Your order of 50 Cement Bags has been delivered.',
    time: 'Yesterday',
    unreadCount: 1,
    online: true,
    isMaterial: true,
    avatar: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=120&auto=format&fit=crop', // cement/delivery representation
  },
  {
    id: '5',
    name: 'Allver Support',
    role: 'Support Agent',
    type: 'System',
    project: 'Support',
    message: 'Your query regarding payment has been resolved.',
    time: 'Yesterday',
    unreadCount: 0,
    online: false,
    isSupport: true,
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=120&auto=format&fit=crop',
  },
  {
    id: '6',
    name: 'Vikram Electrician',
    role: 'Electrician',
    type: 'Professionals',
    project: 'Office Renovation',
    message: 'Installation work is 80% complete.',
    time: '2 Days Ago',
    unreadCount: 0,
    online: true,
    avatar: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=120&auto=format&fit=crop',
  },
  {
    id: '7',
    name: 'Interior Studio',
    role: 'Interior Designer',
    type: 'Professionals',
    project: 'Interior Design',
    message: "We've sent you the 3D design options.",
    time: '2 Days Ago',
    unreadCount: 1,
    online: true,
    avatar: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=120&auto=format&fit=crop',
  },
  {
    id: '8',
    name: 'Allver Notifications',
    role: 'System Notifications',
    type: 'System',
    project: 'System',
    message: "New update available! Check out what's new.",
    time: '3 Days Ago',
    unreadCount: 0,
    online: false,
    isNotification: true,
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=120&auto=format&fit=crop',
  },
];

export default function ChatsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Projects' | 'Professionals' | 'System' | 'Unread'>('All');
  const [conversations, setConversations] = useState<any[]>(CONVERSATIONS_DATA);

  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        user = JSON.parse(stored);
      }
    }
    
    if (user) {
      const userId = user._id;
      const fetchWorkspaces = async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/api/project-workspaces/user/${userId}`);
          if (res.ok) {
            const data = await res.json();
            const realChats = data.workspaces.map((w: any) => getParticipantDetails(w, userId));
            
            // Merge real workspaces and mock conversations
            const filteredMock = CONVERSATIONS_DATA.filter(mock => 
              !realChats.some((real: any) => real.name === mock.name && real.project === mock.project)
            );
            setConversations([...realChats, ...filteredMock]);
          }
        } catch (err) {
          console.log('Error fetching workspaces:', err);
        }
      };
      fetchWorkspaces();
    }
  }, []);

  const handleChatPress = (chat: any) => {
    router.push({
      pathname: '/chat-room',
      params: {
        id: chat.id,
        name: chat.name,
        role: chat.role,
        project: chat.project,
        avatar: chat.avatar,
        online: chat.online ? 'true' : 'false',
        isReal: chat.isReal ? 'true' : 'false'
      }
    });
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
            <TouchableOpacity style={styles.iconBadgeBtn}>
              <Feather name="bell" size={20} color={COLORS.textDark} />
              <View style={styles.badgeCircle}><Text style={styles.badgeText}>3</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.iconBadgeBtn, styles.activeHeaderBtn]}>
              <Feather name="message-square" size={20} color={COLORS.textDark} />
              <View style={styles.badgeCircle}><Text style={styles.badgeText}>5</Text></View>
              <View style={styles.activeHeaderLine} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.avatarBtn}
              onPress={() => router.push('/profile')}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop' }} 
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Title */}
        <Text style={styles.pageTitle}>Messages</Text>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBarWrapper}>
            <Feather name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search messages or contacts..." 
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
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.chip, isSelected && styles.chipActive]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                  {filter}
                </Text>
                {filter === 'Unread' && (
                  <View style={[styles.chipBadge, isSelected && styles.chipBadgeActive]}>
                    <Text style={[styles.chipBadgeText, isSelected && styles.chipBadgeTextActive]}>5</Text>
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
              <Text style={styles.emptyText}>No messages found</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Floating Compose Button */}
      <TouchableOpacity style={styles.composeBtn} activeOpacity={0.8}>
        <Feather name="edit-2" size={20} color={COLORS.white} />
      </TouchableOpacity>
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
    height: 30,
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
  },

  /* FLOATING BUTTON */
  composeBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.badgeGold,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      }
    })
  }
});
