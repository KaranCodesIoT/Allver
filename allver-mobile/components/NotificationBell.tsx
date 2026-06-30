import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { BACKEND_URL } from '../constants/Config';

interface NotificationBellProps {
  size?: number;
  color?: string;
  style?: any;
}

export default function NotificationBell({ size = 20, color = '#111827', style }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const isFocused = useIsFocused();

  const fetchUnreadCount = async () => {
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

    if (user?._id) {
      try {
        if (user.role === 'Labour') {
          const response = await fetch(`${BACKEND_URL}/api/notifications/${user._id}`);
          const data = await response.json();
          if (data.success && data.notifications) {
            const filtered = data.notifications.filter((n: any) => {
              const isNewProject = n.text && (n.text.includes('New Project') || n.text.includes('New Project Posted'));
              return !isNewProject;
            });
            const unread = filtered.filter((n: any) => !n.isRead).length;
            setUnreadCount(unread);
          }
        } else {
          const response = await fetch(`${BACKEND_URL}/api/notifications/unread-count/${user._id}`);
          const data = await response.json();
          if (data.success) {
            setUnreadCount(data.unreadCount || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchUnreadCount();
    }
  }, [isFocused]);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 10 seconds for notification updates
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={() => router.push('/notifications')}
      activeOpacity={0.7}
    >
      <Feather name="bell" size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
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
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
