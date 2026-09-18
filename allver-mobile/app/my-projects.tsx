import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { getStoredUser } from '../constants/Auth';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#2563EB',
  textDark: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  bgPage: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  green: '#10B981',
  greenBg: '#ECFDF5',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
  grayBg: '#F1F5F9',
  grayText: '#64748B',
  white: '#FFFFFF',
  tabActive: '#2563EB',
  tabInactiveText: '#64748B'
};

const DEFAULT_CLIENT_PROJECTS: any[] = [];

export default function MyProjectsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeFilter, setActiveFilter] = useState<'All' | 'In Progress' | 'Completed'>('All');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProjects = useCallback(async (userId?: string) => {
    const targetId = userId || currentUser?._id;
    if (!targetId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/client/projects/${targetId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.projects) && data.projects.length > 0) {
          setProjects(data.projects);
        }
      }
    } catch (e) {
      console.warn('Error fetching client projects:', e);
    }
  }, [currentUser]);

  useEffect(() => {
    async function init() {
      let user = (global as any).currentUser;
      if (!user) {
        const stored = await getStoredUser();
        if (stored) {
          try {
            user = typeof stored === 'string' ? JSON.parse(stored) : stored;
            (global as any).currentUser = user;
          } catch (e) {}
        }
      }
      setCurrentUser(user);
      if (user?._id) {
        fetchProjects(user._id);
      }
    }
    init();
  }, [fetchProjects]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  const allCount = projects.length;
  const inProgressCount = projects.filter(p => p.status === 'In Progress').length;
  const completedCount = projects.filter(p => p.status === 'Completed').length;

  const filteredProjects = projects.filter(p => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'In Progress') return p.status === 'In Progress';
    if (activeFilter === 'Completed') return p.status === 'Completed';
    return true;
  });

  const handleProjectClick = (item: any) => {
    router.push({
      pathname: '/client-project-detail',
      params: {
        projectId: item.id || item.jobId || item.workspaceId,
        projectData: JSON.stringify(item)
      }
    });
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Projects</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* FILTER TABS */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabItem, activeFilter === 'All' && styles.tabItemActive]}
          onPress={() => setActiveFilter('All')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeFilter === 'All' && styles.tabTextActive]}>
            All ({allCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeFilter === 'In Progress' && styles.tabItemActive]}
          onPress={() => setActiveFilter('In Progress')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeFilter === 'In Progress' && styles.tabTextActive]}>
            In Progress ({inProgressCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeFilter === 'Completed' && styles.tabItemActive]}
          onPress={() => setActiveFilter('Completed')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeFilter === 'Completed' && styles.tabTextActive]}>
            Completed ({completedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* PROJECT LIST */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {filteredProjects.map((item, idx) => {
          const isCompleted = item.status === 'Completed';
          const isInProgress = item.status === 'In Progress';
          const isCancelled = item.status === 'Cancelled';

          return (
            <TouchableOpacity
              key={item.id || idx}
              style={styles.projectCard}
              onPress={() => handleProjectClick(item)}
              activeOpacity={0.88}
            >
              <View style={styles.cardMainRow}>
                {/* Left Thumbnail Image */}
                <Image
                  source={{ uri: item.image || 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400&auto=format&fit=crop' }}
                  style={styles.cardImage}
                  contentFit="cover"
                />

                {/* Center Content */}
                <View style={styles.cardDetailsCol}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardWorkerName} numberOfLines={1}>{item.workerName}</Text>

                  {/* Location with Pin */}
                  <View style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={13} color={COLORS.textMuted} style={{ marginRight: 3 }} />
                    <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
                  </View>

                  {/* Status Pill Badge */}
                  <View style={styles.statusPillRow}>
                    <View style={[
                      styles.statusPill,
                      isCompleted && styles.statusPillCompleted,
                      isInProgress && styles.statusPillInProgress,
                      isCancelled && styles.statusPillCancelled
                    ]}>
                      <View style={[
                        styles.statusDot,
                        isCompleted && { backgroundColor: COLORS.green },
                        isInProgress && { backgroundColor: COLORS.blue },
                        isCancelled && { backgroundColor: COLORS.grayText }
                      ]} />
                      <Text style={[
                        styles.statusPillText,
                        isCompleted && { color: COLORS.green },
                        isInProgress && { color: COLORS.blue },
                        isCancelled && { color: COLORS.grayText }
                      ]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right Arrow Chevron */}
                <View style={styles.arrowWrap}>
                  <Feather name="chevron-right" size={20} color="#94A3B8" />
                </View>
              </View>

              {/* Bottom Row: Started/Completed Date & Price */}
              <View style={styles.cardBottomRow}>
                <Text style={styles.cardDateText}>{item.dateLabel || item.endDateFormatted || ''}</Text>
                <Text style={styles.cardPriceText}>{item.priceFormatted || (item.amount ? `₹${Number(item.amount).toLocaleString('en-IN')}` : '')}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {filteredProjects.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <Feather name="folder" size={42} color="#CBD5E1" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyStateTitle}>No {activeFilter.toLowerCase()} projects</Text>
            <Text style={styles.emptyStateSub}>
              {activeFilter === 'In Progress'
                ? 'You do not have any projects currently ongoing.'
                : 'Projects you book will appear here.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPage
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
    marginRight: 8
  },
  tabItemActive: {
    borderBottomColor: COLORS.primary
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.tabInactiveText
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  listContent: {
    padding: 16
  },
  projectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  cardImage: {
    width: 82,
    height: 82,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 12
  },
  cardDetailsCol: {
    flex: 1
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2
  },
  cardWorkerName: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  locationText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  statusPillRow: {
    flexDirection: 'row'
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusPillCompleted: {
    backgroundColor: COLORS.greenBg
  },
  statusPillInProgress: {
    backgroundColor: COLORS.blueBg
  },
  statusPillCancelled: {
    backgroundColor: COLORS.grayBg
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  arrowWrap: {
    marginLeft: 6
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC'
  },
  cardDateText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  cardPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4
  },
  emptyStateSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 240
  }
});
