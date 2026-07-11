import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { useTranslation } from '../utils/i18n';
import { getStoredUser } from '../constants/Auth';
import { useUnreadActivities } from '../context/UnreadActivityContext';
import SocketService from '../utils/SocketService';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#16A34A',
  greenLight: '#F0FDF4',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  gold: '#F59E0B',
  bgLight: '#F9FAFB',
  pageBg: '#F3F4F6'
};


export default function JobsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { refreshUnreadActivityCount } = useUnreadActivities();

  const [searchQuery, setSearchQuery] = useState('');
  const selectedCategory = 'All';
  const [jobs, setJobs] = useState<any[]>((global as any).cachedJobs || []);
  const [loading, setLoading] = useState(!((global as any).cachedJobs && (global as any).cachedJobs.length > 0));
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load current user details on mount
  useEffect(() => {
    const loadUser = async () => {
      let user = (global as any).currentUser;
      if (!user) {
        try {
          const stored = await getStoredUser();
          if (stored) {
            user = JSON.parse(stored);
            (global as any).currentUser = user;
          }
        } catch (e) {
          console.log('Error loading user in jobs.tsx:', e);
        }
      }
      setCurrentUser(user);

      // Mark project notifications as read immediately upon viewing the Jobs Board
      if (user?._id) {
        try {
          await fetch(`${BACKEND_URL}/api/notifications/read-projects/${user._id}`, {
            method: 'POST'
          });
          // Immediately update global badge count
          refreshUnreadActivityCount();
        } catch (err) {
          console.log('Error marking project notifications as read:', err);
        }
      }
    };
    loadUser();
  }, [refreshUnreadActivityCount]);

  const fetchJobs = useCallback(async () => {
    try {
      const cached = (global as any).cachedJobs;
      if (!cached || cached.length === 0) {
        setLoading(true);
      }
      const res = await fetch(`${BACKEND_URL}/api/contract-requests`);
      const data = await res.json();
      if (data.success && data.requests) {
        setJobs(data.requests);
        (global as any).cachedJobs = data.requests;
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Handle real-time updates via Socket.IO
  useEffect(() => {
    const handleNewContractRequest = (newRequest: any) => {
      if (!newRequest || !newRequest._id) return;
      if (newRequest.professional) return; // Skip direct requests
      console.log('[Jobs] Real-time job/contract request received:', newRequest);
      setJobs((prevJobs) => {
        if (prevJobs.some((j) => j._id === newRequest._id)) return prevJobs;
        return [newRequest, ...prevJobs];
      });
    };

    const handleContractStatusUpdated = (data: any) => {
      if (!data || !data.requestId) return;
      console.log('[Jobs] Job status updated via socket:', data);
      setJobs((prevJobs) =>
        prevJobs.map((job) => {
          if (job._id === data.requestId) {
            return { ...job, status: data.status };
          }
          return job;
        })
      );
    };

    const handleReconnect = () => {
      console.log('[Jobs] Socket reconnected. Re-fetching jobs...');
      fetchJobs();
    };

    SocketService.on('new_contract_request', handleNewContractRequest);
    SocketService.on('contract_status_updated', handleContractStatusUpdated);
    SocketService.on('connect', handleReconnect);

    return () => {
      SocketService.off('new_contract_request', handleNewContractRequest);
      SocketService.off('contract_status_updated', handleContractStatusUpdated);
      SocketService.off('connect', handleReconnect);
    };
  }, [fetchJobs]);

  // Filter logic
  const filteredJobs = jobs.filter((job) => {
    // Exclude direct hire requests (where professional is assigned) from the Jobs page
    if (job.professional) {
      return false;
    }

    // If logged-in user is a Client, only show their own posted contracts
    if (currentUser?.role === 'Client') {
      const isMyJob = job.client?._id === currentUser._id || job.client === currentUser._id;
      return isMyJob;
    }

    // For professionals: Only show open (Pending) contracts
    if (job.status !== 'Pending') {
      return false;
    }

    // 1. Search Query filter
    const matchesSearch = 
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.requirements?.some((r: string) => r.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Category filter
    const matchesCategory = 
      selectedCategory === 'All' || 
      job.projectType?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contracts</Text>
        <TouchableOpacity 
          onPress={() => fetchJobs()} 
          style={styles.refreshBtn}
        >
          <Feather name="refresh-cw" size={18} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>

      {/* Search & Category Filter Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Feather name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects, location, skills..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={18} color={COLORS.textMuted} style={{ padding: 4 }} />
            </TouchableOpacity>
          ) : null}
        </View>

      </View>

      {/* Jobs List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={COLORS.green} />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const clientName = item.client?.fullName || 'Client';
            const budgetText = item.budget ? `₹ ${item.budget}` : 'TBD';
            const projectType = item.projectType || 'General';

            const isOwner = currentUser?._id && (item.client?._id === currentUser._id || item.client === currentUser._id);

            return (
              <View style={styles.jobCard}>
                {/* Category and Location Row */}
                <View style={styles.cardHeader}>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{projectType}</Text>
                    </View>
                    {isOwner && (
                      <View style={[styles.badge, { backgroundColor: '#F3E8FF' }]}>
                        <Text style={[styles.badgeText, { color: '#7C3AED' }]}>Your Post</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {item.status === 'Accepted' && (
                      <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}>
                        <Text style={[styles.badgeText, { color: '#0284C7' }]}>In Progress</Text>
                      </View>
                    )}
                    <View style={styles.locationRow}>
                      <Feather name="map-pin" size={14} color={COLORS.textMuted} />
                      <Text style={styles.locationText}>{item.location}</Text>
                    </View>
                  </View>
                </View>

                {/* Title */}
                <Text style={styles.jobTitle}>{item.title}</Text>

                {/* Client Info */}
                <Text style={styles.postedBy}>Posted by: <Text style={{ fontWeight: '600' }}>{clientName}</Text></Text>

                {/* Details Block (Budget & Timeline) */}
                <View style={styles.detailsBlock}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Estimated Budget</Text>
                    <Text style={styles.detailValue}>{budgetText}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Timeline</Text>
                    <Text style={styles.detailValue}>{item.timeline || 'Flexible'}</Text>
                  </View>
                </View>

                {/* Requirements Chips */}
                {item.requirements && item.requirements.length > 0 && (
                  <View style={styles.requirementsRow}>
                    {item.requirements.slice(0, 4).map((req: string, idx: number) => (
                      <View key={idx} style={styles.reqChip}>
                        <Text style={styles.reqChipText}>{req}</Text>
                      </View>
                    ))}
                    {item.requirements.length > 4 && (
                      <View style={styles.reqChipMore}>
                        <Text style={styles.reqChipTextMore}>+{item.requirements.length - 4}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Description */}
                {item.description ? (
                  <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Action Button */}
                <TouchableOpacity
                  style={[styles.actionBtn, isOwner && { backgroundColor: '#7C3AED' }]}
                  onPress={() => {
                    if (isOwner) {
                      router.push({
                        pathname: '/project-applications',
                        params: {
                          requestId: item._id,
                          title: item.title,
                          location: item.location,
                          budget: budgetText,
                          timeline: item.timeline || 'Flexible',
                          description: item.description || '',
                          requirements: item.requirements ? item.requirements.join(',') : ''
                        }
                      });
                    } else {
                      router.push({
                        pathname: '/project-detail',
                        params: {
                          clientId: item.client?._id || item.client,
                          titleHint: item.title
                        }
                      });
                    }
                  }}
                >
                  <Text style={styles.actionBtnText}>
                    {isOwner ? 'View Details / Bids' : 'View Details / Apply'}
                  </Text>
                  <Feather name="arrow-right" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="briefcase" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No Contracts Found</Text>
              <Text style={styles.emptySubtitle}>Try adjusting your filters or search query.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchJobs}
              colors={[COLORS.green]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.pageBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  refreshBtn: {
    padding: 6,
  },
  searchSection: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    height: '100%',
  },
  chipsScroll: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgLight,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.green,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  chipTextActive: {
    color: COLORS.green,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  postedBy: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  detailsBlock: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  requirementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  reqChip: {
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reqChipMore: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reqChipText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  reqChipTextMore: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 6,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
