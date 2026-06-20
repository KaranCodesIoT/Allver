import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';

const COLORS = {
  green: '#1BC47D', // Green accent
  greenLight: '#E8FBF3',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F9FAFB',
};

interface UserListItem {
  _id: string;
  fullName: string;
  role: string;
  city: string;
  avatarUrl?: string;
  shortDesc?: string;
  rating?: number;
  reviews?: number;
  experience?: string;
}

export default function FollowersListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const userId = (params.userId as string);
  const type = (params.type as 'followers' | 'following') || 'followers';
  const userName = (params.userName as string) || 'User';

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchList = async (showLoading = true) => {
    if (!userId) return;
    if (showLoading) setIsLoading(true);
    try {
      const endpoint = type === 'followers' 
        ? `${BACKEND_URL}/api/followers/${userId}`
        : `${BACKEND_URL}/api/following/${userId}`;
        
      const response = await fetch(endpoint);
      const data = await response.json();
      if (data.success) {
        setUsers(type === 'followers' ? data.followers : data.following);
      }
    } catch (error) {
      console.error(`Error fetching ${type} list:`, error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchList(true);
  }, [userId, type]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchList(false);
  };

  const handleUserPress = (user: UserListItem) => {
    if (user.role === 'Architect') {
      router.push({
        pathname: '/architect-detail',
        params: { id: user._id, name: user.fullName, avatar: user.avatarUrl, location: user.city }
      });
    } else if (user.role === 'Contractor') {
      router.push({
        pathname: '/contractor-detail',
        params: { id: user._id, name: user.fullName, avatar: user.avatarUrl, location: user.city }
      });
    } else if (user.role === 'Labour') {
      router.push({
        pathname: '/labour-detail',
        params: { id: user._id, name: user.fullName, role: user.role, avatar: user.avatarUrl, location: user.city }
      });
    } else {
      // Fallback or generic detail if any
      router.push({
        pathname: '/(tabs)/profile',
        params: { viewId: user._id }
      });
    }
  };

  const headerTitle = type === 'followers' 
    ? `${userName}'s Followers` 
    : `${userName} is Following`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.green} />
        </View>
      ) : users.length === 0 ? (
        <ScrollView 
          contentContainerStyle={styles.centerContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.green]} />}
        >
          <View style={styles.emptyIconCircle}>
            <Feather name="users" size={36} color={COLORS.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No profiles found</Text>
          <Text style={styles.emptySubtitle}>
            {type === 'followers' 
              ? "This user doesn't have any followers yet."
              : "This user isn't following anyone yet."
            }
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.listContainer}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.green]} />}
          showsVerticalScrollIndicator={false}
        >
          {users.map((user) => {
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=1BC47D&color=fff`;
            
            return (
              <TouchableOpacity
                key={user._id}
                style={styles.userCard}
                onPress={() => handleUserPress(user)}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: user.avatarUrl || fallbackAvatar }}
                  style={styles.avatar}
                  contentFit="cover"
                />

                <View style={styles.infoContainer}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName} numberOfLines={1}>{user.fullName}</Text>
                    <Text style={styles.roleBadge}>{user.role}</Text>
                  </View>

                  {user.shortDesc ? (
                    <Text style={styles.description} numberOfLines={1}>{user.shortDesc}</Text>
                  ) : user.experience ? (
                    <Text style={styles.description}>{user.experience} Experience</Text>
                  ) : null}

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Feather name="map-pin" size={12} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{user.city}</Text>
                    </View>

                    {user.rating && (
                      <View style={[styles.metaItem, { marginLeft: 12 }]}>
                        <FontAwesome5 name="star" size={11} color="#F59E0B" solid />
                        <Text style={styles.metaText}>{user.rating} ({user.reviews || 0})</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <Feather name="chevron-right" size={18} color={COLORS.textMuted} style={styles.chevron} />
              </TouchableOpacity>
            );
          })}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
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
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.bgLight,
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    maxWidth: '65%',
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.green,
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    marginLeft: 8,
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  chevron: {
    paddingLeft: 4,
  },
});
