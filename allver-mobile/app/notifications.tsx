import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';

const COLORS = {
  green: '#1BC47D', // Green accent
  greenLight: '#E8FBF3',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F9FAFB',
  bg: '#F3F4F6',
};

interface NotificationSender {
  _id: string;
  fullName: string;
  avatarUrl?: string;
  role: string;
}

interface NotificationItem {
  _id: string;
  recipientId: string;
  senderId: NotificationSender;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load current user
  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          user = JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
    }
    setCurrentUser(user);
  }, []);

  // Fetch notifications
  const fetchNotifications = async (showLoading = true) => {
    if (!currentUser?._id) return;
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/${currentUser._id}`);
      const data = await response.json();
      if (data.success && data.notifications) {
        let filtered = data.notifications;
        if (currentUser?.role === 'Labour') {
          filtered = filtered.filter((n: any) => {
            const isNewProject = n.text && (n.text.includes('New Project') || n.text.includes('New Project Posted'));
            return !isNewProject;
          });
        }
        setNotifications(filtered);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentUser?._id) {
      fetchNotifications(true);
      // Mark notifications as read when entering the screen
      markAllAsRead();
    }
  }, [currentUser]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications(false);
  };

  const markAllAsRead = async () => {
    if (!currentUser?._id) return;
    try {
      await fetch(`${BACKEND_URL}/api/notifications/read/${currentUser._id}`, {
        method: 'POST',
      });
      // Optionally update local status to read
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 6000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const hasUnread = notifications.some(n => !n.isRead);

  // Group notifications by date (Today, Yesterday, Earlier)
  const getGroupedNotifications = () => {
    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const earlier: NotificationItem[] = [];

    const now = new Date();
    const todayDateStr = now.toDateString();

    const yesterdayDate = new Date();
    yesterdayDate.setDate(now.getDate() - 1);
    const yesterdayDateStr = yesterdayDate.toDateString();

    notifications.forEach(item => {
      const itemDate = new Date(item.createdAt);
      const itemDateStr = itemDate.toDateString();

      if (itemDateStr === todayDateStr) {
        today.push(item);
      } else if (itemDateStr === yesterdayDateStr) {
        yesterday.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, yesterday, earlier };
  };

  // Clicking on a notification navigates to the sender's profile or project details
  const handleNotificationPress = (notification: NotificationItem) => {
    const sender = notification.senderId;
    if (!sender) return;
    
    // Check if it's a project invitation notification
    if (notification.text.includes('📩 Project Invitation') || notification.text.includes('Project Invitation')) {
      const secondLine = notification.text.split('\n')[1] || '';
      const titleHint = secondLine.split('invited you to the project: ')[1] || '';
      router.push({
        pathname: '/project-detail',
        params: {
          clientId: sender._id,
          titleHint: titleHint.trim()
        }
      });
      return;
    }

    // Check if it's a new project notification
    if (notification.text.includes('🏗 New Project') || notification.text.includes('New Project Posted')) {
      router.push({
        pathname: '/project-detail',
        params: {
          clientId: sender._id,
          titleHint: notification.text.split('\n')[1]?.split(' posted near')[0] || ''
        }
      });
      return;
    }

    // Determine route based on sender role
    if (sender.role === 'Architect') {
      router.push({ pathname: '/architect-detail', params: { id: sender._id, name: sender.fullName, avatar: resolveAvatarUrl(sender.avatarUrl) } });
    } else if (sender.role === 'Contractor') {
      router.push({ pathname: '/contractor-detail', params: { id: sender._id, name: sender.fullName, avatar: resolveAvatarUrl(sender.avatarUrl) } });
    } else if (sender.role === 'Labour') {
      router.push({ pathname: '/labour-detail', params: { id: sender._id, name: sender.fullName, role: sender.role, avatar: resolveAvatarUrl(sender.avatarUrl) } });
    }
  };

  const { today, yesterday, earlier } = getGroupedNotifications();

  const renderNotificationSection = (title: string, items: NotificationItem[]) => {
    if (items.length === 0) return null;
    return (
      <View key={title} style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>{title}</Text>
        {items.map((item) => {
          const sender = item.senderId || { fullName: 'Someone', role: 'User' };
          const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(sender.fullName)}&background=1BC47D&color=fff`;
          
          return (
            <TouchableOpacity
              key={item._id}
              style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: resolveAvatarUrl(sender.avatarUrl) || fallbackAvatar }}
                style={styles.avatar}
                contentFit="cover"
              />
              
              <View style={styles.contentContainer}>
                <Text style={styles.text}>
                  {item.text}
                </Text>
                
                <View style={styles.metaRow}>
                  <Text style={styles.roleTag}>{sender.role}</Text>
                  <Text style={styles.timeText}>• {formatTime(item.createdAt)}</Text>
                </View>
              </View>

              {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        
        {hasUnread && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
            <Text style={styles.markReadText}>Mark read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
        </View>
      ) : notifications.length === 0 ? (
        <ScrollView 
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.green]} />}
        >
          <View style={styles.emptyIconCircle}>
            <Feather name="bell-off" size={36} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptySubtitle}>
            We'll notify you here when users add you to their network or interact with your posts.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.feed}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.green]} />}
          showsVerticalScrollIndicator={false}
        >
          {renderNotificationSection('Today', today)}
          {renderNotificationSection('Yesterday', yesterday)}
          {renderNotificationSection('Earlier', earlier)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  markReadBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: COLORS.greenLight,
  },
  markReadText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.green,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: COLORS.white,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  feed: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  unreadCard: {
    backgroundColor: '#F2FBF7', // Very light green highlight for unread
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bgLight,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    color: COLORS.textDark,
    lineHeight: 19,
  },
  senderName: {
    fontWeight: '700',
    color: COLORS.textDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleTag: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.green,
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.green,
  },
  sectionContainer: {
    marginBottom: 8,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
});
