import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';
import { useTranslation } from '../utils/i18n';
import SocketService from '../utils/SocketService';
import { useFocusEffect } from '@react-navigation/native';

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
  isMarked?: boolean;
}

const parseNotificationText = (text: string) => {
  let title = 'Notification';
  let body = text;
  let actionType = 'none';

  // 1. Extract titles starting with emojis
  const firstLine = text.split('\n')[0] || '';
  if (
    firstLine.startsWith('📋') ||
    firstLine.startsWith('📍') ||
    firstLine.startsWith('📩') ||
    firstLine.startsWith('🏗') ||
    firstLine.startsWith('✅') ||
    firstLine.startsWith('💬')
  ) {
    title = firstLine.replace(/[📋📍📩🏗✅💬]/g, '').trim();
    // Body is everything after the first line (excluding blank lines and tags)
    body = text.split('\n').slice(1).join('\n').trim();
  } else if (text.includes('started following you')) {
    title = 'New Follower';
  }

  // 2. Identify action types based on brackets or keywords
  if (text.includes('[View Attendance]')) {
    actionType = 'attendance';
    body = body.replace(/\[View Attendance\]/gi, '').trim();
  } else if (text.includes('[View Invitation]')) {
    actionType = 'invitation';
    body = body.replace(/\[View Invitation\]/gi, '').trim();
  } else if (text.includes('[View Progress]')) {
    actionType = 'progress';
    body = body.replace(/\[View Progress\]/gi, '').trim();
  }

  // Strip empty lines from body
  body = body.split('\n').filter(line => line.trim().length > 0).join('\n');

  return { title, body, actionType };
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationItem[]>((global as any).cachedNotifications || []);
  const [isLoading, setIsLoading] = useState(!((global as any).cachedNotifications && (global as any).cachedNotifications.length > 0));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRequests, setUserRequests] = useState<any[]>([]);

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

  const fetchUserRequests = async () => {
    let user = currentUser || (global as any).currentUser;
    if (!user?._id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/contract-requests/user/${user._id}`);
      const data = await res.json();
      if (data.requests) {
        setUserRequests(data.requests);
      }
    } catch (err) {
      console.error("Error fetching requests for notifications:", err);
    }
  };

  const getMatchingRequest = (notifText: string) => {
    if (!notifText.includes('Project Invitation')) return null;
    const secondLine = notifText.split('\n')[1] || '';
    const titleHint = (secondLine.split('invited you to the project: ')[1] || '').split('\n')[0] || '';
    if (!titleHint) return null;
    
    return userRequests.find(r => 
      r.title.trim().toLowerCase() === titleHint.trim().toLowerCase() &&
      r.status === 'Pending'
    );
  };

  const handleInvitationResponse = async (requestId: string, status: 'Accepted' | 'Rejected') => {
    if (!currentUser?._id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/contract-requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          professional: currentUser._id
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (status === 'Accepted') {
          Alert.alert(
            'Success!',
            'You have accepted the project invitation. A workspace has been created.',
            [
              {
                text: 'Go to Workspace',
                onPress: () => {
                  if (data.workspace && data.workspace._id) {
                    router.push({
                      pathname: '/project-progress',
                      params: { workspaceId: data.workspace._id }
                    });
                  } else {
                    router.push('/(tabs)');
                  }
                }
              },
              { text: 'OK' }
            ]
          );
        } else {
          Alert.alert('Rejected', 'You have rejected the project invitation.');
        }
        // Refresh notifications & requests
        fetchNotifications(false);
        fetchUserRequests();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to update invitation status.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error occurred.');
    }
  };

  // Fetch notifications
  const fetchNotifications = async (showLoading = true) => {
    let user = currentUser || (global as any).currentUser;
    if (!user?._id) return;
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/${user._id}`);
      const data = await response.json();
      if (data.success && data.notifications) {
        const filtered = (data.notifications || []).filter((n: any) => {
          const text = n.text || '';
          // Always show direct project invitations and proposal acceptances / rejections in the main feed
          if (text.includes('Project Invitation') || text.includes('Proposal Accepted') || text.includes('Bid Not Selected') || text.includes('Accepted') || text.includes('accepted')) {
            return true;
          }
          const isJobRelated = text.includes('New Project') || 
                             text.includes('New Project Posted') || 
                             text.includes('[View Project]') ||
                             text.includes('Applied') || 
                             text.includes('[View Application]') || 
                             text.includes('[View Invitation]');
          return !isJobRelated;
        });
        setNotifications(filtered);
        (global as any).cachedNotifications = filtered;
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (currentUser?._id) {
        fetchNotifications(false);
        fetchUserRequests();
      }
    }, [currentUser])
  );

  useEffect(() => {
    if (currentUser?._id) {
      fetchNotifications(true);
      fetchUserRequests();
      // Mark notifications as read when entering the screen
      markAllAsRead();
    }
  }, [currentUser]);

  // Handle real-time incoming notifications & reconnect sync
  useEffect(() => {
    if (!currentUser?._id) return;

    const handleNewNotification = (data: any) => {
      console.log('[Notifications] Real-time notification received:', data);
      // Prepend or refetch dynamically
      fetchNotifications(false);
      fetchUserRequests();
    };

    const handleNotificationsRead = (data: any) => {
      if (data && data.userId === currentUser?._id) {
        console.log('[Notifications] Notifications marked read via socket, syncing...');
        fetchNotifications(false);
      }
    };

    const handleReconnect = () => {
      console.log('[Notifications] Socket reconnected. Syncing notifications...');
      fetchNotifications(false);
      fetchUserRequests();
    };

    SocketService.on('new_notification', handleNewNotification);
    SocketService.on('notifications_read', handleNotificationsRead);
    SocketService.on('connect', handleReconnect);

    return () => {
      SocketService.off('new_notification', handleNewNotification);
      SocketService.off('notifications_read', handleNotificationsRead);
      SocketService.off('connect', handleReconnect);
    };
  }, [currentUser?._id]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchNotifications(false);
    fetchUserRequests();
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

  const renderNotificationSection = (key: string, items: NotificationItem[]) => {
    if (items.length === 0) return null;
    return (
      <View key={key} style={styles.sectionContainer}>
        <Text style={styles.sectionHeader}>{t(key)}</Text>
        {items.map((item) => {
          const sender = item.senderId || { fullName: 'Someone', role: 'User' };
          const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(sender.fullName)}&background=1BC47D&color=fff`;
          const parsed = parseNotificationText(item.text);
          
          return (
            <TouchableOpacity
              key={item._id}
              style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
              onPress={() => handleNotificationPress(item)}
              activeOpacity={0.7}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: resolveAvatarUrl(sender.avatarUrl) || fallbackAvatar }}
                  style={styles.avatar}
                  contentFit="cover"
                />
                {!item.isRead && <View style={styles.unreadPulse} />}
              </View>
              
              <View style={styles.contentContainer}>
                {/* Title and Time row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.notificationTitle}>{parsed.title}</Text>
                  <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                </View>

                {/* Body Text */}
                <Text style={styles.text}>
                  {parsed.body}
                </Text>

                {/* Metadata Row (Role tags, etc.) */}
                <View style={styles.metaRow}>
                  <Text style={styles.roleTag}>{sender.role}</Text>
                </View>

                {/* Styled inline action buttons (if any) */}
                {parsed.actionType !== 'none' && !item.text.includes('Labour Checked In') && (
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: COLORS.greenLight,
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#A7F3D0'
                    }}>
                      <Text style={{ color: COLORS.green, fontSize: 11, fontWeight: '700', marginRight: 4 }}>
                        {parsed.actionType === 'attendance' ? 'View Attendance' : parsed.actionType === 'invitation' ? 'View Invitation' : 'View Progress'}
                      </Text>
                      <Feather name="arrow-right" size={11} color={COLORS.green} />
                    </View>
                  </View>
                )}

                {/* Contractor approval action buttons */}
                {(currentUser?.role === 'Contractor' || currentUser?.role === 'Architect' || currentUser?.role === 'Professional') && item.text.includes('Labour Checked In') && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: item.isMarked ? '#94A3B8' : '#10B981',
                      paddingVertical: 6,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      alignItems: 'center',
                      marginTop: 8,
                      alignSelf: 'flex-start'
                    }}
                    disabled={!!item.isMarked}
                    onPress={(e) => {
                      e.stopPropagation();
                      const dateMatch = item.text.match(/for date\s+(\d{4}-\d{2}-\d{2})/i);
                      const checkInDate = dateMatch ? dateMatch[1] : '';
                      router.push({
                        pathname: '/labour-detail',
                        params: {
                          id: sender._id,
                          name: sender.fullName,
                          role: sender.role,
                          avatar: resolveAvatarUrl(sender.avatarUrl),
                          targetDate: checkInDate,
                          autoOpen: 'true'
                        }
                      });
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
                      {item.isMarked ? '✓ Marked' : 'Mark Attendance'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Direct Invitation Actions */}
                {(() => {
                  const req = getMatchingRequest(item.text);
                  if (!req) return null;
                  return (
                    <View style={styles.invitationActionsRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.acceptBtn]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleInvitationResponse(req._id, 'Accepted');
                        }}
                      >
                        <Feather name="check" size={12} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={styles.actionBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleInvitationResponse(req._id, 'Rejected');
                        }}
                      >
                        <Feather name="x" size={12} color="#FFF" style={{ marginRight: 4 }} />
                        <Text style={styles.actionBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </View>

              {!item.isRead && (
                <View style={{ justifyContent: 'center', paddingLeft: 8 }}>
                  <View style={styles.unreadDot} />
                </View>
              )}
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
          <Text style={styles.headerTitle}>{t('notifications')}</Text>
        </View>
        
        {hasUnread && (
          <TouchableOpacity onPress={markAllAsRead} style={styles.markReadBtn}>
            <Text style={styles.markReadText}>{t('markRead')}</Text>
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
          <Text style={styles.emptyTitle}>{t('noNotifications')}</Text>
          <Text style={styles.emptySubtitle}>
            {t('noNotificationsDesc')}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.feed}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.green]} />}
          showsVerticalScrollIndicator={false}
        >
          {renderNotificationSection('today', today)}
          {renderNotificationSection('yesterday', yesterday)}
          {renderNotificationSection('earlier', earlier)}
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
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  unreadCard: {
    backgroundColor: '#F7FEE7', // Very premium soft light tint
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  unreadPulse: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgLight,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  text: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginVertical: 4,
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
  invitationActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 80,
  },
  acceptBtn: {
    backgroundColor: '#10B981',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
