import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Share, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useNavigation } from 'expo-router';
import { BACKEND_URL } from '../../constants/Config';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  navy: '#0F172A',
  white: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  bgLight: '#F8FAFC',
  bgCard: '#F1F5F9',
  border: '#E2E8F0',
  green: '#22C55E',
  greenDark: '#16A34A',
  greenLight: '#F0FDF4',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  red: '#EF4444',
  purple: '#6366F1',
  purpleLight: '#EEF2FF',
  gold: '#F59E0B',
};

// Default Profile Data
const DEFAULT_USER_DATA = {
  id: '2',
  name: 'Ar. Rohit Mehta',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
  rating: '4.7',
  reviews: '98',
  location: 'Pune, Maharashtra',
  area: '',
  state: 'Maharashtra',
  experience: '10+ Years',
  specialization: 'Expert in residential and commercial architecture.',
  specializations: ['Residential Design', 'Commercial Design', 'Interior Design', 'Landscape Design'],
  projects: '0',
  followers: '189',
  firmName: 'RM Design Studios',
  phone: '+91 98765 43211',
  teamSize: '1',
};

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [user, setUser] = useState(DEFAULT_USER_DATA);
  const [activeTab, setActiveTab] = useState<'projects' | 'videos' | 'team' | 'reviews'>('projects');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [liveFollowersCount, setLiveFollowersCount] = useState(0);
  const [liveFollowingCount, setLiveFollowingCount] = useState(0);

  const loadUserData = () => {
    let storedUser = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      storedUser = localStorage.getItem('currentUser');
    } else {
      storedUser = (global as any).currentUser ? JSON.stringify((global as any).currentUser) : null;
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed) {
          setCurrentUser(parsed);
          
          // Fetch live user info (followers count)
          fetch(`${BACKEND_URL}/api/professional/${parsed._id}`)
            .then(res => res.json())
            .then(data => {
              if (data.professional) {
                setLiveFollowersCount(data.professional.followersCount || 0);
                setLiveFollowingCount(data.professional.followingCount || 0);
              }
            })
            .catch(err => console.error("Error fetching my profile live counts:", err));

          const roleLabel = parsed.role || 'Architect';
          const prefix = parsed.role === 'Architect' ? 'Ar. ' : '';
          setUser({
            id: parsed._id || '2',
            name: `${prefix}${parsed.fullName}`,
            avatar: parsed.avatarUrl || '',
            coverImage: parsed.cover || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
            rating: parsed.rating?.toString() || '4.8',
            reviews: parsed.reviews?.toString() || '32',
            location: [parsed.city, parsed.state].filter(Boolean).join(', ') || 'Pune, Maharashtra',
            area: parsed.area || '',
            state: parsed.state || 'Maharashtra',
            experience: parsed.experience || '3-5 years',
            specialization: parsed.shortDesc || parsed.about || `Expert ${roleLabel.toLowerCase()} services.`,
            specializations: parsed.specialization || ['Residential Design', 'Commercial Design', 'Interior Design', 'Landscape Design'],
            projects: (parsed.projects ?? 0).toString(),
            followers: '189',
            firmName: parsed.firmName || parsed.fullName || 'RM Design Studios',
            phone: parsed.phoneNumber || parsed.phone || '+91 98765 43211',
            teamSize: parsed.teamSize?.toString() || '1',
          });
        }
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
  };

  useEffect(() => {
    loadUserData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my profile on Allver: ${user.firmName} from ${user.location}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
    (global as any).currentUser = null;
    router.replace('/login');
  };

  const handleEditProfile = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push('/edit-profile');
  };

  const cityOnly = user.location.split(',')[0]?.trim() || 'Location';

  // Experience display: ensure it has "Exp" suffix style
  const expDisplay = user.experience.toLowerCase().includes('year') 
    ? user.experience 
    : `${user.experience} Exp`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ===== HEADER ===== */}
      <View style={styles.navHeader}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerIconBtn}>
            <Feather name="share-2" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.headerIconBtn}>
            <Feather name="log-out" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ===== COVER IMAGE + AVATAR ===== */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: user.coverImage }} style={styles.coverImage} contentFit="cover" />
          <View style={styles.avatarWrapper}>
            <Image source={user.avatar ? { uri: user.avatar } : require('@/assets/images/app-icon.png')} style={styles.avatarImage} contentFit={user.avatar ? "cover" : "contain"} />
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={11} color={COLORS.white} />
            </View>
          </View>
        </View>

        {/* ===== PROFILE INFO ===== */}
        <View style={styles.profileSection}>
          {/* Firm Name */}
          <Text style={styles.profileName}>{user.firmName}</Text>

          {/* Name + Role subtitle */}
          <Text style={styles.subtitleText}>
            {user.name}  •  {currentUser?.role || 'Architect'}
          </Text>

          {/* ===== FOLLOWERS / FOLLOWING ROW ===== */}
          {currentUser?._id && (
            <View style={styles.followStatsRow}>
              <TouchableOpacity
                style={styles.followStatCol}
                onPress={() => {
                  router.push({
                    pathname: '/followers-list',
                    params: { userId: currentUser._id, type: 'followers', userName: 'My' }
                  });
                }}
              >
                <Text style={styles.followStatNumber}>{liveFollowersCount}</Text>
                <Text style={styles.followStatLabel}> Followers</Text>
              </TouchableOpacity>

              <View style={styles.followStatDivider} />

              <TouchableOpacity
                style={styles.followStatCol}
                onPress={() => {
                  router.push({
                    pathname: '/followers-list',
                    params: { userId: currentUser._id, type: 'following', userName: 'My' }
                  });
                }}
              >
                <Text style={styles.followStatNumber}>{liveFollowingCount}</Text>
                <Text style={styles.followStatLabel}> Following</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ===== PHONE NUMBER ===== */}
          <View style={styles.phoneRow}>
            <Feather name="phone" size={15} color={COLORS.textMuted} />
            <Text style={styles.phoneText}>{user.phone}</Text>
          </View>

          {/* ===== STAT PILLS ROW ===== */}
          <View style={styles.pillsRow}>
            <View style={styles.pill}>
              <FontAwesome5 name="trophy" size={12} color={COLORS.primary} />
              <Text style={styles.pillText}>{expDisplay}</Text>
            </View>
            <View style={styles.pill}>
              <FontAwesome5 name="th-large" size={12} color={COLORS.primary} />
              <Text style={styles.pillText}>{user.projects} Projects</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="location-outline" size={14} color={COLORS.primary} />
              <Text style={styles.pillText}>{cityOnly}</Text>
            </View>
          </View>

          {/* ===== EDIT PROFILE + LOG OUT BUTTONS ===== */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.editProfileBtn} onPress={handleEditProfile} activeOpacity={0.85}>
              <Feather name="edit-2" size={15} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.editProfileBtnText}>Edit Profile Info</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
              <Feather name="log-out" size={15} color={COLORS.red} style={{ marginRight: 6 }} />
              <Text style={styles.logoutBtnText}>Log Out</Text>
            </TouchableOpacity>
          </View>

          {/* ===== SPECIALIZATION ===== */}
          <View style={styles.specializationSection}>
            <Text style={styles.sectionHeaderTitle}>Specialization</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specScrollRow}>
              {(Array.isArray(user.specializations) ? user.specializations : ['Residential Design', 'Commercial Design', 'Interior Design', 'Landscape Design']).map((spec, index) => (
                <View key={index} style={styles.specTag}>
                  <View style={styles.specDot} />
                  <Text style={styles.specTagText}>{spec}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* ===== PORTFOLIO HIGHLIGHTS ===== */}
          <View style={styles.portfolioSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Portfolio Highlights</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All ›</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollWrapper}>
              {[
                { title: '24+ Commercial Projects', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80' },
                { title: '40+ Residential Projects', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80' },
                { title: '12+ Ongoing Projects', image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=300&q=80' }
              ].map((item, index) => (
                <View key={index} style={styles.portfolioCard}>
                  <Image source={{ uri: item.image }} style={styles.portfolioCardImage} contentFit="cover" />
                  <View style={styles.portfolioCardOverlay}>
                    <Feather name="play-circle" size={22} color={COLORS.white} style={styles.playIcon} />
                    <Text style={styles.portfolioCardTitle}>{item.title}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* ===== TABS ===== */}
          <View style={styles.tabSegmentContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollRow}>
              {(['projects', 'videos', 'team', 'reviews'] as const).map((tab) => (
                <TouchableOpacity 
                  key={tab} 
                  style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabButtonText, activeTab === tab && styles.activeTabButtonText]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ===== TAB CONTENT ===== */}
          <View style={styles.tabContentArea}>
            {activeTab === 'projects' && (
              <View style={styles.projectsListCol}>
                {[
                  { name: '2BHK Residential Construction', location: 'Navi Mumbai', status: 'Ongoing', progress: 60, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80' },
                  { name: '3BHK Villa Project', location: 'Panvel, Navi Mumbai', status: 'Completed', progress: 100, image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Interior Work', location: 'Kharghar, Navi Mumbai', status: 'Ongoing', progress: 40, image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Renovation Project', location: 'Belapur, Navi Mumbai', status: 'Ongoing', progress: 30, image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=200&q=80' },
                ].map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.projectCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      router.push({
                        pathname: '/project-progress',
                        params: {
                          name: item.name,
                          location: item.location,
                          status: item.status,
                          progress: item.progress.toString(),
                        }
                      });
                    }}
                  >
                    <Image source={{ uri: item.image }} style={styles.projectCardImg} contentFit="cover" />
                    <View style={styles.projectCardInfo}>
                      <Text style={styles.projectCardName}>{item.name}</Text>
                      <Text style={styles.projectCardLoc}>{item.location}</Text>
                      <View style={styles.projectProgressRow}>
                        <View style={styles.projectProgressBarBg}>
                          <View style={[
                            styles.projectProgressBarFill,
                            { width: `${item.progress}%`, backgroundColor: item.status === 'Completed' ? COLORS.green : COLORS.green }
                          ]} />
                        </View>
                        <Text style={styles.projectProgressText}>{item.progress}%</Text>
                      </View>
                      <View style={styles.projectStatusRow}>
                        <View style={[styles.projectStatusDot, { backgroundColor: item.status === 'Completed' ? COLORS.green : '#F59E0B' }]} />
                        <Text style={[styles.projectStatusText, { color: item.status === 'Completed' ? COLORS.green : '#F59E0B' }]}>{item.status}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activeTab === 'videos' && (
              <View style={styles.videosGrid}>
                {[
                  { title: 'Commercial Office Walkthrough', duration: '1:05', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80' },
                  { title: 'Smart Villa Automation Tour', duration: '0:50', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80' }
                ].map((item, idx) => (
                  <View key={idx} style={styles.videoCard}>
                    <Image source={{ uri: item.image }} style={styles.videoThumbnail} contentFit="cover" />
                    <View style={styles.videoPlayOverlay}>
                      <Feather name="play" size={24} color={COLORS.white} />
                    </View>
                    <View style={styles.videoInfoBar}>
                      <Text style={styles.videoTitleText} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.videoDurationText}>{item.duration}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'team' && (
              <View style={styles.teamListCol}>
                {[
                  { name: 'Ramesh Yadav', type: 'Mason', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop', experience: '12+ Years Experience', location: 'Mumbai, Maharashtra', rating: '4.8', reviews: '124' },
                  { name: 'Suresh Patil', type: 'Carpenter', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop', experience: '10 Years Experience', location: 'Pune, Maharashtra', rating: '4.7', reviews: '86' },
                  { name: 'Ravi Singh', type: 'Electrician', avatar: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=150&auto=format&fit=crop', experience: '8 Years Experience', location: 'Mumbai, Maharashtra', rating: '4.6', reviews: '92' }
                ].map((item, idx) => (
                  <View key={idx} style={styles.teamListItem}>
                    <Image source={{ uri: item.avatar }} style={styles.teamMemberAvatar} contentFit="cover" />
                    <View style={styles.teamMemberDetails}>
                      <View style={styles.teamNameRow}>
                        <Text style={styles.teamMemberName}>{item.name}</Text>
                        <Feather name="check-circle" size={12} color={COLORS.blue} style={{ marginLeft: 5 }} />
                      </View>
                      <Text style={styles.teamMemberType}>{item.type} • Partner</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.teamViewProfileBtn}
                      onPress={() => {
                        router.push({
                          pathname: '/labour-detail',
                          params: {
                            name: item.name,
                            role: item.type,
                            avatar: item.avatar,
                            experience: item.experience,
                            location: item.location,
                            rating: item.rating,
                            reviews: item.reviews,
                            contractorName: 'BuildWell Contractors'
                          }
                        });
                      }}
                    >
                      <Text style={styles.teamViewProfileBtnText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'reviews' && (
              <View style={styles.reviewsListCol}>
                {/* Rating Breakdown */}
                <View style={styles.ratingBreakdownBox}>
                  <View style={styles.ratingOverallCol}>
                    <Text style={styles.overallRatingValue}>{user.rating}</Text>
                    <View style={styles.overallStarsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <FontAwesome5 key={s} name="star" solid={s <= Math.floor(parseFloat(user.rating))} size={13} color={s <= Math.floor(parseFloat(user.rating)) ? COLORS.gold : COLORS.border} style={{ marginRight: 2 }} />
                      ))}
                    </View>
                    <Text style={styles.overallRatingReviews}>{user.reviews} Reviews</Text>
                  </View>
                  <View style={styles.ratingProgressCol}>
                    {[
                      { stars: '5', count: '74' },
                      { stars: '4', count: '18' },
                      { stars: '3', count: '4' },
                      { stars: '2', count: '1' },
                      { stars: '1', count: '1' }
                    ].map((row) => {
                      const percentage = (parseInt(row.count) / parseInt(user.reviews)) * 100;
                      return (
                        <View key={row.stars} style={styles.ratingProgressRow}>
                          <Text style={styles.rowStarText}>{row.stars}★</Text>
                          <View style={styles.rowProgressBarBg}>
                            <View style={[styles.rowProgressBarFill, { width: `${percentage}%` }]} />
                          </View>
                          <Text style={styles.rowStarCount}>{row.count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Review items */}
                {[
                  { name: 'Karan Chaubey', date: '5 days ago', rating: 5, comment: 'Outstanding layouts and details. Rohit was extremely professional and incorporated our feedback perfectly.', avatar: 'https://i.pravatar.cc/100?img=32' },
                  { name: 'Vikram Patel', date: '3 weeks ago', rating: 4, comment: 'Great job with space planning in our apartment. Excellent work!', avatar: 'https://i.pravatar.cc/100?img=22' }
                ].map((item, idx) => (
                  <View key={idx} style={styles.reviewItemCard}>
                    <View style={styles.reviewHeaderRow}>
                      <Image source={{ uri: item.avatar }} style={styles.reviewerAvatar} contentFit="cover" />
                      <View style={styles.reviewerMeta}>
                        <Text style={styles.reviewerName}>{item.name}</Text>
                        <Text style={styles.reviewDate}>{item.date}</Text>
                      </View>
                      <View style={styles.reviewStarsRow}>
                        {[1, 2, 3, 4, 5].map((s) => (
                          <FontAwesome5 key={s} name="star" solid={s <= item.rating} size={11} color={s <= item.rating ? COLORS.gold : COLORS.border} />
                        ))}
                      </View>
                    </View>
                    <Text style={styles.reviewText}>{item.comment}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingBottom: 80 },

  /* HEADER */
  navHeader: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  headerRightActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center', alignItems: 'center',
  },

  /* COVER & AVATAR */
  coverContainer: { height: 180, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  avatarWrapper: {
    position: 'absolute',
    bottom: -35,
    left: 20,
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
    overflow: 'visible',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 36 },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.green,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* PROFILE SECTION */
  profileSection: { marginTop: 45, paddingHorizontal: 20 },

  /* NAME */
  profileName: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, marginBottom: 2 },

  /* SUBTITLE */
  subtitleText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },

  /* FOLLOWERS / FOLLOWING */
  followStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  followStatCol: { flexDirection: 'row', alignItems: 'baseline' },
  followStatNumber: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  followStatLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  followStatDivider: { width: 1, height: 16, backgroundColor: COLORS.border },

  /* PHONE */
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  phoneText: { fontSize: 14, color: COLORS.textDark, fontWeight: '500' },

  /* STAT PILLS */
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillText: { fontSize: 12, color: COLORS.textDark, fontWeight: '600' },

  /* ACTION BUTTONS ROW */
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  editProfileBtn: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.greenDark,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  logoutBtn: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  logoutBtnText: { color: COLORS.red, fontSize: 14, fontWeight: '700' },

  /* SPECIALIZATION */
  specializationSection: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 },
  viewAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  specScrollRow: { gap: 8 },
  specTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  specDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: COLORS.primary,
  },
  specTagText: { fontSize: 12, color: COLORS.textDark, fontWeight: '500' },

  /* PORTFOLIO */
  portfolioSection: { marginBottom: 24 },
  horizontalScrollWrapper: { gap: 12 },
  portfolioCard: { width: 150, height: 110, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  portfolioCardImage: { width: '100%', height: '100%' },
  portfolioCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 10,
  },
  playIcon: { alignSelf: 'flex-start' },
  portfolioCardTitle: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

  /* TABS */
  tabSegmentContainer: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 16 },
  tabScrollRow: { gap: 24, paddingBottom: 0 },
  tabButton: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabButton: { borderBottomColor: COLORS.primary },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  activeTabButtonText: { color: COLORS.primary },

  /* TAB CONTENT */
  tabContentArea: { minHeight: 180 },

  /* PROJECTS */
  projectsListCol: { gap: 14 },
  projectCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  projectCardImg: { width: 80, height: 80, borderRadius: 10 },
  projectCardInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  projectCardName: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  projectCardLoc: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8 },
  projectProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  projectProgressBarBg: {
    flex: 1, height: 7, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden',
  },
  projectProgressBarFill: { height: '100%', borderRadius: 4 },
  projectProgressText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, width: 32, textAlign: 'right' },
  projectStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  projectStatusDot: { width: 7, height: 7, borderRadius: 3.5 },
  projectStatusText: { fontSize: 12, fontWeight: '700' },

  /* VIDEOS */
  videosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  videoCard: { width: (width - 50) / 2, height: 130, borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.bgLight, position: 'relative' },
  videoThumbnail: { width: '100%', height: '100%' },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfoBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 5, paddingHorizontal: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  videoTitleText: { flex: 1, color: COLORS.white, fontSize: 11, fontWeight: '600', marginRight: 5 },
  videoDurationText: { color: COLORS.white, fontSize: 9 },

  /* TEAM */
  teamListCol: { gap: 12 },
  teamListItem: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  teamMemberAvatar: { width: 44, height: 44, borderRadius: 22 },
  teamMemberDetails: { flex: 1, marginLeft: 12 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center' },
  teamMemberName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  teamMemberType: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  teamViewProfileBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 },
  teamViewProfileBtnText: { fontSize: 11, color: COLORS.textDark, fontWeight: '600' },

  /* REVIEWS */
  reviewsListCol: { gap: 15 },
  ratingBreakdownBox: { flexDirection: 'row', padding: 15, backgroundColor: COLORS.bgLight, borderRadius: 12, alignItems: 'center' },
  ratingOverallCol: { width: 100, alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.border, paddingRight: 10 },
  overallRatingValue: { fontSize: 32, fontWeight: '800', color: COLORS.textDark },
  overallStarsRow: { flexDirection: 'row', marginVertical: 4 },
  overallRatingReviews: { fontSize: 11, color: COLORS.textMuted },
  ratingProgressCol: { flex: 1, paddingLeft: 15 },
  ratingProgressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  rowStarText: { fontSize: 11, color: COLORS.textDark, width: 18, fontWeight: '600' },
  rowProgressBarBg: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  rowProgressBarFill: { height: '100%', backgroundColor: COLORS.gold, borderRadius: 3 },
  rowStarCount: { fontSize: 11, color: COLORS.textMuted, width: 18, textAlign: 'right' },
  reviewItemCard: { padding: 15, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewerMeta: { flex: 1, marginLeft: 10 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  reviewDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  reviewStarsRow: { flexDirection: 'row' },
  reviewText: { fontSize: 13, color: COLORS.textDark, marginTop: 10, lineHeight: 18 },
});
