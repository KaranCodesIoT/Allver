import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';

const { width } = Dimensions.get('window');

const COLORS = {
  white: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#6B7280',
  bgLight: '#F9FAFB',
  green: '#10B981',
  greenLight: '#D1FAE5',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  border: '#E5E7EB',
  starGold: '#FBBF24',
  purple: '#7C3AED',
  purpleLight: '#F3E8FF',
  bgPage: '#F3F4F6',
  red: '#EF4444',
  redLight: '#FEE2E2',
};

export default function ProjectCompareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const title = (params.title as string) || 'Project Details';
  const requestId = params.requestId as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [compareData, setCompareData] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptedContractor, setAcceptedContractor] = useState<any>(null);
  const [hasAccepted, setHasAccepted] = useState(false);

  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          user = JSON.parse(stored);
        } catch (e) {}
      }
    }
    setCurrentUser(user);
  }, []);

  // Fetch bids dynamically from backend
  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }

    const fetchBids = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/project-bids/request/${requestId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch bids');
        }
        const data = await res.json();
        
        if (data.bids && data.bids.length > 0) {
          // Find if any bid has already been accepted
          const acceptedBid = data.bids.find((b: any) => b.status === 'Accepted');
          if (acceptedBid) {
            setHasAccepted(true);
          }

          // Calculate which bid is recommended based on a simple score: rating * 10 - costVal/100000
          let recommendedIndex = 0;
          let highestScore = -9999999;

          data.bids.forEach((bid: any, index: number) => {
            const rating = bid.professional?.rating || 4.0;
            // Parse costVal if not present
            let costVal = bid.costVal;
            if (!costVal) {
              costVal = parseFloat((bid.cost || '').replace(/[^\d.]/g, ''));
              if (isNaN(costVal)) costVal = 0;
              if ((bid.cost || '').toUpperCase().includes('L')) {
                costVal = costVal * 100000;
              }
            }
            const score = rating * 10 - (costVal / 200000);
            if (score > highestScore) {
              highestScore = score;
              recommendedIndex = index;
            }
          });

          const transformed = data.bids.map((bid: any, index: number) => {
            const charKey = String.fromCharCode(65 + index); // A, B, C, D...
            const prof = bid.professional || {};
            const profName = prof.fullName || 'Unknown Contractor';
            const profAvatar = prof.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profName)}&background=7C3AED&color=fff`;
            
            let costVal = bid.costVal;
            if (!costVal) {
              costVal = parseFloat((bid.cost || '').replace(/[^\d.]/g, ''));
              if (isNaN(costVal)) costVal = 0;
              if ((bid.cost || '').toUpperCase().includes('L')) {
                costVal = costVal * 100000;
              }
            }

            let durationDays = bid.durationDays;
            if (!durationDays) {
              durationDays = parseInt((bid.duration || '').replace(/[^\d.]/g, ''));
              if (isNaN(durationDays)) durationDays = 90;
            }

            return {
              key: charKey,
              name: profName,
              avatar: profAvatar,
              cost: bid.cost || `₹${(costVal || 0).toLocaleString('en-IN')}`,
              costVal: costVal,
              duration: bid.duration || `${durationDays} Days`,
              durationDays: durationDays,
              projects: prof.completedProjects || 0,
              rating: prof.rating || 4.5,
              responseTime: prof.responseTime || '5 mins',
              verified: true,
              isRecommended: index === recommendedIndex,
              id: prof._id || '',
              bidId: bid._id,
              status: bid.status || 'Pending'
            };
          });

          setCompareData(transformed);
          setSelectedKey(transformed[0].key);
        } else {
          setCompareData([]);
        }
      } catch (err) {
        console.error('Error fetching bids for compare:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBids();
  }, [requestId]);

  const handleShortlistAccept = async (contractor: any) => {
    if (hasAccepted) {
      Alert.alert('Already Accepted', 'A bid has already been accepted for this project. Only 1 bid can be accepted at a time.');
      return;
    }

    setAcceptedContractor(contractor);
    Alert.alert(
      'Shortlist & Accept',
      `Accept bid from ${contractor.name} for ${contractor.cost}? This will start the project timeline immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept Bid',
          style: 'default',
          onPress: async () => {
            setIsAccepting(true);
            try {
              // Update contract request status and assign professional (creates active workspace)
              const response = await fetch(`${BACKEND_URL}/api/contract-requests/${requestId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'Accepted',
                  professional: contractor.id,
                  bidId: contractor.bidId
                })
              });

              if (response.ok) {
                const data = await response.json();
                setSuccess(true);
                setHasAccepted(true);
                
                // Calculate dynamic end date
                const start = new Date();
                const end = new Date();
                end.setDate(start.getDate() + contractor.durationDays);
                const endDateStr = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                setTimeout(() => {
                  setSuccess(false);
                  setIsAccepting(false);
                  // Route to the project progress page with active workspace details
                  router.push({
                    pathname: '/project-progress',
                    params: {
                      workspaceId: data.workspace?._id || 'mock-workspace-id',
                      endDate: endDateStr,
                      progress: '20',
                      status: 'Active',
                      name: title,
                      contractor: contractor.name,
                      contractorAvatar: contractor.avatar,
                      contractorRating: contractor.rating.toString(),
                      contractorReviews: contractor.projects.toString(),
                      totalAmount: contractor.cost,
                      paidAmount: '₹0',
                      dueAmount: contractor.cost,
                    }
                  });
                }, 2500);
              } else {
                const errData = await response.json();
                Alert.alert('Acceptance Failed', errData.message || 'Something went wrong.');
                setIsAccepting(false);
              }
            } catch (err) {
              console.error('Accept bid error:', err);
              Alert.alert('Error', 'Could not complete the acceptance. Please try again.');
              setIsAccepting(false);
            }
          }
        }
      ]
    );
  };

  if (success && acceptedContractor) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <View style={styles.successIconBox}>
          <Feather name="check" size={50} color={COLORS.white} />
        </View>
        <Text style={styles.successTitle}>Timeline Started!</Text>
        <Text style={styles.successSubtitle}>
          Project workspace created for "{title}" with contractor {acceptedContractor.name}. Redirecting to tracking timeline...
        </Text>
        <ActivityIndicator size="small" color={COLORS.green} style={{ marginTop: 24 }} />
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={styles.loadingText}>Loading bids to compare...</Text>
      </SafeAreaView>
    );
  }

  if (compareData.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Compare Contractor Bids</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Feather name="git-compare" size={50} color={COLORS.textMuted} style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No Bids Available</Text>
          <Text style={styles.emptySubtitle}>
            There are no bids submitted for this project request yet. Once contractors apply, you can compare them side-by-side here.
          </Text>
          <TouchableOpacity style={styles.backBtnLarge} onPress={() => router.back()}>
            <Text style={styles.backBtnTextLarge}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Compare Contractor Bids</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Project Header Info */}
        <View style={styles.projectInfoRow}>
          <Text style={styles.projectInfoLabel}>Comparing Bids for:</Text>
          <Text style={styles.projectInfoTitle}>{title}</Text>
        </View>

        {/* Already Accepted Banner */}
        {hasAccepted && (
          <View style={styles.acceptedBanner}>
            <Feather name="check-circle" size={18} color={COLORS.green} style={{ marginRight: 8 }} />
            <Text style={styles.acceptedBannerText}>A bid has already been accepted for this project.</Text>
          </View>
        )}

        {/* Tab Selection for Mobile Columns */}
        <View style={styles.selectorRow}>
          {compareData.map((c) => {
            const isSelected = selectedKey === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[
                  styles.selectorTab,
                  isSelected && styles.selectorTabActive,
                  c.isRecommended && styles.selectorTabRecommend,
                  isSelected && c.isRecommended && styles.selectorTabRecommendActive
                ]}
                onPress={() => setSelectedKey(c.key)}
              >
                <Text style={[
                  styles.selectorTabText,
                  isSelected && styles.selectorTabTextActive,
                  c.isRecommended && { color: COLORS.purple }
                ]}>
                  {c.name.split(' ')[0]} {c.isRecommended ? '⭐' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Comparison Matrix Cards */}
        <View style={styles.matrixContainer}>
          {compareData.map((contractor) => {
            const isSelected = selectedKey === contractor.key;
            if (!isSelected) return null;

            const isThisAccepted = contractor.status === 'Accepted';
            const isThisRejected = contractor.status === 'Rejected';

            return (
              <View key={contractor.key} style={[
                styles.compareCard, 
                contractor.isRecommended && styles.recommendedCardBorder,
                isThisAccepted && styles.acceptedCardBorder,
                isThisRejected && styles.rejectedCardOpacity
              ]}>
                {contractor.isRecommended && !isThisAccepted && !isThisRejected && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>RECOMMENDED BID</Text>
                  </View>
                )}

                {isThisAccepted && (
                  <View style={[styles.recommendedBadge, { backgroundColor: COLORS.green }]}>
                    <Text style={styles.recommendedBadgeText}>ACCEPTED BID</Text>
                  </View>
                )}

                {isThisRejected && (
                  <View style={[styles.recommendedBadge, { backgroundColor: COLORS.textMuted }]}>
                    <Text style={styles.recommendedBadgeText}>NOT SELECTED</Text>
                  </View>
                )}

                {/* Profile Header */}
                <View style={styles.contractorHeader}>
                  <Image source={{ uri: contractor.avatar }} style={styles.avatar} />
                  <View style={styles.meta}>
                    <Text style={styles.name}>{contractor.name}</Text>
                    <View style={styles.ratingRow}>
                      <FontAwesome name="star" size={14} color={COLORS.starGold} />
                      <Text style={styles.rating}>{contractor.rating} ★</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Compare Stats Rows */}
                <View style={styles.statsRow}>
                  <View style={styles.statIconBox}>
                    <FontAwesome name="rupee" size={16} color={COLORS.purple} />
                  </View>
                  <View style={styles.statMeta}>
                    <Text style={styles.statLabel}>Proposed Cost</Text>
                    <Text style={[styles.statValue, { color: COLORS.purple, fontSize: 20 }]}>{contractor.cost}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statIconBox}>
                    <Feather name="clock" size={16} color={COLORS.blue} />
                  </View>
                  <View style={styles.statMeta}>
                    <Text style={styles.statLabel}>Estimated Duration</Text>
                    <Text style={[styles.statValue, { color: COLORS.blue }]}>{contractor.duration}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statIconBox}>
                    <Feather name="check-square" size={16} color={COLORS.green} />
                  </View>
                  <View style={styles.statMeta}>
                    <Text style={styles.statLabel}>Completed Projects</Text>
                    <Text style={styles.statValue}>{contractor.projects} Projects</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statIconBox}>
                    <Feather name="zap" size={16} color={COLORS.starGold} />
                  </View>
                  <View style={styles.statMeta}>
                    <Text style={styles.statLabel}>Average Response Time</Text>
                    <Text style={styles.statValue}>{contractor.responseTime}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Action button */}
                {!isThisAccepted && !isThisRejected && (
                  <TouchableOpacity
                    style={[
                      styles.acceptBtn, 
                      contractor.isRecommended && styles.acceptBtnRecommend,
                      hasAccepted && { backgroundColor: '#9CA3AF' }
                    ]}
                    activeOpacity={0.9}
                    onPress={() => handleShortlistAccept(contractor)}
                    disabled={hasAccepted || isAccepting}
                  >
                    <Feather name="check-circle" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.acceptBtnText}>
                      {hasAccepted ? 'Bid Acceptance Disabled' : 'Shortlist & Accept Bid'}
                    </Text>
                  </TouchableOpacity>
                )}

                {isThisAccepted && (
                  <View style={[styles.acceptBtn, { backgroundColor: COLORS.green }]}>
                    <Feather name="check" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.acceptBtnText}>Bid Accepted</Text>
                  </View>
                )}

                {isThisRejected && (
                  <View style={[styles.acceptBtn, { backgroundColor: '#9CA3AF' }]}>
                    <Feather name="x" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                    <Text style={styles.acceptBtnText}>Not Selected</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Side-by-Side Reference Grid */}
        <Text style={styles.gridSectionTitle}>Comparison Matrix</Text>
        <View style={styles.referenceGrid}>
          {/* Header Row */}
          <View style={styles.gridRowHeader}>
            <Text style={[styles.gridCellHeader, { flex: 1.5, textAlign: 'left' }]}>Metrics</Text>
            {compareData.map((c) => (
              <Text key={c.key} style={styles.gridCellHeader}>
                {c.name.split(' ')[0]} ({c.key})
              </Text>
            ))}
          </View>
          
          {/* Cost Row */}
          <View style={styles.gridRow}>
            <Text style={[styles.gridCellLabel, { flex: 1.5 }]}>Cost Bid</Text>
            {compareData.map((c) => (
              <Text key={c.key} style={[
                styles.gridCellVal, 
                c.key === selectedKey && { color: COLORS.purple, fontWeight: '800' }
              ]}>
                {c.cost}
              </Text>
            ))}
          </View>

          {/* Duration Row */}
          <View style={styles.gridRow}>
            <Text style={[styles.gridCellLabel, { flex: 1.5 }]}>Duration</Text>
            {compareData.map((c) => (
              <Text key={c.key} style={[
                styles.gridCellVal, 
                c.key === selectedKey && { color: COLORS.blue, fontWeight: '800' }
              ]}>
                {c.duration}
              </Text>
            ))}
          </View>

          {/* Projects Row */}
          <View style={styles.gridRow}>
            <Text style={[styles.gridCellLabel, { flex: 1.5 }]}>Projects</Text>
            {compareData.map((c) => (
              <Text key={c.key} style={[
                styles.gridCellVal, 
                c.key === selectedKey && { fontWeight: '800' }
              ]}>
                {c.projects}
              </Text>
            ))}
          </View>

          {/* Rating Row */}
          <View style={[styles.gridRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.gridCellLabel, { flex: 1.5 }]}>Rating</Text>
            {compareData.map((c) => (
              <Text key={c.key} style={[
                styles.gridCellVal, 
                c.key === selectedKey && { fontWeight: '800' }
              ]}>
                {c.rating} ★
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPage },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12, fontWeight: '600' },
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  projectInfoRow: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  projectInfoLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  projectInfoTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark },

  /* ACCEPTED BANNER */
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  acceptedBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  /* SELECTOR TABS */
  selectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  selectorTab: {
    flex: 1,
    minWidth: 90,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorTabActive: {
    borderColor: COLORS.blue,
    backgroundColor: COLORS.blueLight,
  },
  selectorTabRecommend: {
    borderColor: COLORS.purpleLight,
  },
  selectorTabRecommendActive: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.purpleLight,
  },
  selectorTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  selectorTabTextActive: {
    color: COLORS.blue,
  },

  /* MATRIX CARDS */
  matrixContainer: {
    marginBottom: 24,
  },
  compareCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  recommendedCardBorder: {
    borderColor: COLORS.purple,
  },
  acceptedCardBorder: {
    borderColor: COLORS.green,
    borderWidth: 2,
  },
  rejectedCardOpacity: {
    opacity: 0.6,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: COLORS.purple,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  recommendedBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
  },
  contractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.bgLight,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statMeta: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  acceptBtn: {
    height: 44,
    backgroundColor: COLORS.green,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  acceptBtnRecommend: {
    backgroundColor: COLORS.purple,
  },
  acceptBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  /* SIDE BY SIDE GRID */
  gridSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  referenceGrid: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  gridRowHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  gridCellHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  gridCellLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  gridCellVal: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
  },

  /* SUCCESS STATE */
  successContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successIconBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* EMPTY CONTAINER styles */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: COLORS.bgPage,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backBtnLarge: {
    backgroundColor: COLORS.purple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnTextLarge: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
});
