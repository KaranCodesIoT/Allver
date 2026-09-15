import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, FontAwesome } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { getStoredUser } from '../constants/Auth';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#1D4ED8',
  primaryLight: '#EFF6FF',
  textDark: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  bgPage: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  green: '#10B981',
  greenBg: '#ECFDF5',
  greenBorder: '#A7F3D0',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
  blueBorder: '#BFDBFE',
  grayBg: '#F1F5F9',
  starGold: '#F59E0B',
  divider: '#F1F5F9',
  white: '#FFFFFF'
};

export default function ClientProjectDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const projectId = params.projectId as string;
  const projectParam = params.projectData ? JSON.parse(params.projectData as string) : null;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(!projectParam);
  const [project, setProject] = useState<any>(projectParam || null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userReviewText, setUserReviewText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadUser() {
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

      if (!project && user?._id) {
        fetchProject(user._id);
      }
    }
    loadUser();
  }, []);

  const fetchProject = async (userId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/client/projects/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.projects)) {
          const found = data.projects.find((p: any) => p.id === projectId || p.jobId === projectId || p.workspaceId === projectId);
          if (found) {
            setProject(found);
          } else if (data.projects.length > 0) {
            setProject(data.projects[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Error loading project details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !project) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13 }}>Loading project details...</Text>
      </SafeAreaView>
    );
  }

  const isCompleted = project.status === 'Completed';
  const isCancelled = project.status === 'Cancelled';
  const isInProgress = project.status === 'In Progress';

  const workerInfo = project.workerInfo || {
    name: project.workerName || 'Service Professional',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    rating: 4.8,
    reviewsCount: 36,
    experience: '2 years experience'
  };

  const handleBookAgain = () => {
    // Navigate to booking flow or worker profile
    if (workerInfo.id) {
      router.push({
        pathname: '/labour-detail',
        params: { id: workerInfo.id, name: workerInfo.name }
      });
    } else {
      router.push({
        pathname: '/booking-flow',
        params: { serviceName: project.title }
      });
    }
  };

  const handleViewProfile = () => {
    if (workerInfo.id) {
      router.push({
        pathname: '/labour-detail',
        params: { id: workerInfo.id, name: workerInfo.name }
      });
    } else {
      Alert.alert('Profile', `${workerInfo.name} is a verified Allver partner.`);
    }
  };

  const handleSubmitReview = async () => {
    if (!userReviewText.trim()) {
      Alert.alert('Review Required', 'Please enter a few words about your experience.');
      return;
    }
    try {
      setIsSubmittingReview(true);
      // Update local review state
      setProject((prev: any) => ({
        ...prev,
        review: {
          rating: userRating,
          quote: `“${userReviewText}”`,
          date: 'Just now'
        }
      }));
      setShowReviewModal(false);
      Alert.alert('Review Submitted', 'Thank you for your feedback!');
    } catch (e) {
      Alert.alert('Error', 'Could not submit review.');
    } finally {
      setIsSubmittingReview(false);
    }
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
        <Text style={styles.headerTitle}>Project Details</Text>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => {
            Alert.alert('Project Options', 'Choose an action', [
              { text: 'Download Receipt', onPress: () => Alert.alert('Receipt', `Receipt for ${project.title} sent to email.`) },
              { text: 'Contact Support', onPress: () => router.push('/contact') },
              { text: 'Cancel', style: 'cancel' }
            ]);
          }}
          activeOpacity={0.7}
        >
          <Feather name="more-vertical" size={20} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
      >
        {/* TOP STATUS BANNER */}
        {isCompleted ? (
          <View style={styles.completedBanner}>
            <View style={styles.completedCheckWrap}>
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.completedBannerTitle}>Completed</Text>
              <Text style={styles.completedBannerSub}>
                Project was completed on {project.endDateFormatted || project.date || '10 Feb 2024'}
              </Text>
            </View>
          </View>
        ) : isInProgress ? (
          <View style={styles.inProgressBanner}>
            <View style={styles.inProgressIconWrap}>
              <Feather name="clock" size={18} color={COLORS.blue} />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.inProgressBannerTitle}>In Progress</Text>
              <Text style={styles.inProgressBannerSub}>
                Work started on {project.startDateFormatted || '12 Mar 2024'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.cancelledBanner}>
            <View style={styles.cancelledIconWrap}>
              <Feather name="x" size={18} color={COLORS.textMuted} />
            </View>
            <View style={styles.bannerTextCol}>
              <Text style={styles.cancelledBannerTitle}>Cancelled</Text>
              <Text style={styles.cancelledBannerSub}>
                {project.dateLabel || 'Project was cancelled'}
              </Text>
            </View>
          </View>
        )}

        {/* 1. PROJECT OVERVIEW CARD */}
        <View style={styles.card}>
          <View style={styles.projectOverviewRow}>
            <Image
              source={{ uri: project.image || 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=600&auto=format&fit=crop' }}
              style={styles.projectOverviewImg}
              contentFit="cover"
            />
            <View style={styles.projectOverviewDetails}>
              <Text style={styles.projectOverviewTitle}>{project.title}</Text>
              <Text style={styles.projectOverviewDesc} numberOfLines={2}>
                {project.description || 'Full modular renovation and setup'}
              </Text>
              <View style={styles.metaIconRow}>
                <Ionicons name="location-sharp" size={13} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.metaIconText} numberOfLines={1}>{project.location || 'Mumbai'}</Text>
              </View>
              <View style={styles.metaIconRow}>
                <Feather name="calendar" size={12} color={COLORS.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.metaIconText}>
                  {project.dateRange || `${project.startDateFormatted || '10 Jan 2024'} – ${project.endDateFormatted || '10 Feb 2024'}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. WORKER / PROFESSIONAL CARD */}
        <View style={styles.card}>
          <View style={styles.workerCardRow}>
            <Image
              source={{ uri: workerInfo.avatarUrl }}
              style={styles.workerAvatar}
              contentFit="cover"
            />
            <View style={styles.workerInfoCol}>
              <Text style={styles.workerName}>{workerInfo.name}</Text>
              <View style={styles.workerRatingRow}>
                <FontAwesome name="star" size={13} color={COLORS.starGold} style={{ marginRight: 4 }} />
                <Text style={styles.workerRatingText}>
                  {workerInfo.rating || 4.8}
                  <Text style={styles.workerReviewsCount}> ({workerInfo.reviewsCount || 36} reviews)</Text>
                </Text>
              </View>
              <Text style={styles.workerExpText}>{workerInfo.experience || '2 years experience'}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewProfileBtn}
              onPress={handleViewProfile}
              activeOpacity={0.8}
            >
              <Text style={styles.viewProfileBtnText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. PAYMENT DETAILS CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.green} style={{ marginRight: 4 }} />
              <Text style={styles.paidBadgeText}>{project.isPaid ? 'Paid' : 'Pending'}</Text>
            </View>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total Amount</Text>
            <Text style={styles.paymentValBold}>{project.priceFormatted || `₹${Number(project.amount || 120000).toLocaleString('en-IN')}`}</Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Amount Paid</Text>
            <Text style={[styles.paymentValBold, { color: COLORS.green }]}>
              {project.amountPaidFormatted || `₹${Number(project.amountPaid || project.amount || 120000).toLocaleString('en-IN')}`}
            </Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Amount Due</Text>
            <Text style={[styles.paymentValBold, { color: COLORS.textDark }]}>
              {project.amountDueFormatted || '₹0'}
            </Text>
          </View>
        </View>

        {/* 4. YOUR REVIEW CARD */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Your Review</Text>
            <TouchableOpacity
              style={styles.viewEditBtn}
              onPress={() => setShowReviewModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewEditBtnText}>View / Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reviewStarsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <FontAwesome
                key={s}
                name="star"
                size={16}
                color={s <= Math.round(project.review?.rating || 5) ? COLORS.starGold : '#E2E8F0'}
                style={{ marginRight: 4 }}
              />
            ))}
            <Text style={styles.reviewScoreText}>{project.review?.rating || 4.8}</Text>
          </View>

          <Text style={styles.reviewQuoteText}>
            {project.review?.quote || '“Excellent work! Very professional and completed on time. Highly recommended.”'}
          </Text>

          <Text style={styles.reviewDateText}>
            {project.review?.date || project.endDateFormatted || '12 Feb 2024'}
          </Text>
        </View>

        {/* 5. PROJECT PHOTOS */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Project Photos</Text>
            <TouchableOpacity
              onPress={() => Alert.alert('Project Photos', `Showing all ${project.photos?.length || 4} photos for this project.`)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.photosGridRow}>
            {(project.photos && project.photos.length > 0
              ? project.photos.slice(0, 4)
              : [
                  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=400&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=400&auto=format&fit=crop'
                ]
            ).map((photoUri: string, idx: number) => {
              const isLast = idx === 3;
              return (
                <View key={idx} style={styles.photoThumbWrapper}>
                  <Image source={{ uri: photoUri }} style={styles.photoThumb} contentFit="cover" />
                  {isLast && (
                    <View style={styles.photoMoreOverlay}>
                      <Text style={styles.photoMoreText}>+3</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM STICKY ACTION BAR */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.bookAgainBtn}
          onPress={handleBookAgain}
          activeOpacity={0.85}
        >
          <Text style={styles.bookAgainBtnText}>Book Again</Text>
        </TouchableOpacity>
      </View>

      {/* EDIT / VIEW REVIEW MODAL */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 12 }}>
              Rate your experience with {workerInfo.name} for {project.title}
            </Text>

            <View style={styles.interactiveStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setUserRating(star)} activeOpacity={0.7}>
                  <FontAwesome
                    name="star"
                    size={32}
                    color={star <= userRating ? COLORS.starGold : '#E2E8F0'}
                    style={{ marginHorizontal: 6 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Write your review here..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={4}
              value={userReviewText}
              onChangeText={setUserReviewText}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark
  },
  menuBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18
  },
  scrollContent: {
    padding: 16
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.greenBorder
  },
  completedCheckWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  inProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.blueBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.blueBorder
  },
  inProgressIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cancelledIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  bannerTextCol: {
    flex: 1
  },
  completedBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46'
  },
  completedBannerSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2
  },
  inProgressBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E40AF'
  },
  inProgressBannerSub: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 2
  },
  cancelledBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark
  },
  cancelledBannerSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  projectOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  projectOverviewImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 14
  },
  projectOverviewDetails: {
    flex: 1
  },
  projectOverviewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 3
  },
  projectOverviewDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginBottom: 6
  },
  metaIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  metaIconText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  workerCardRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  workerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12
  },
  workerInfoCol: {
    flex: 1
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2
  },
  workerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2
  },
  workerRatingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark
  },
  workerReviewsCount: {
    fontWeight: '400',
    color: COLORS.textMuted
  },
  workerExpText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  viewProfileBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  viewProfileBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6
  },
  paymentLabel: {
    fontSize: 13,
    color: COLORS.textSecondary
  },
  paymentValBold: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark
  },
  viewEditBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  viewEditBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  reviewScoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginLeft: 4
  },
  reviewQuoteText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 8
  },
  reviewDateText: {
    fontSize: 11,
    color: COLORS.textMuted
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary
  },
  photosGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  photoThumbWrapper: {
    width: (width - 32 - 32 - 24) / 4,
    height: (width - 32 - 32 - 24) / 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative'
  },
  photoThumb: {
    width: '100%',
    height: '100%'
  },
  photoMoreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8
  },
  bookAgainBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white
  },
  bookAgainBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end'
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark
  },
  interactiveStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 14
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: COLORS.textDark,
    textAlignVertical: 'top',
    height: 90,
    marginBottom: 16
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center'
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white
  }
});
