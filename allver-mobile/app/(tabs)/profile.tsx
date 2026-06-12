import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useNavigation } from 'expo-router';

const { width } = Dimensions.get('window');

const COLORS = {
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  purple: '#6366F1',
  purpleLight: '#EEF2FF',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F3F4F6',
  gold: '#F59E0B',
  red: '#EF4444',
  redLight: '#FEE2E2',
};

// Default Architect Profile Data (Rohit Mehta)
const DEFAULT_USER_DATA = {
  id: '2',
  name: 'Ar. Rohit Mehta',
  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
  rating: '4.7',
  reviews: '98',
  location: 'Pune, Maharashtra',
  experience: '10+ Years',
  specialization: 'Expert in residential and commercial architecture.',
  projects: '96',
  followers: '189',
  firmName: 'RM Design Studios',
  phone: '+91 98765 43211'
};

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [user, setUser] = useState(DEFAULT_USER_DATA);
  const [activeTab, setActiveTab] = useState<'projects' | 'videos' | 'team' | 'reviews'>('projects');
  const [currentUser, setCurrentUser] = useState<any>(null);

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
          const roleLabel = parsed.role || 'Architect';
          const prefix = parsed.role === 'Architect' ? 'Ar. ' : '';
          setUser({
            id: parsed._id || '2',
            name: `${prefix}${parsed.fullName}`,
            avatar: parsed.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
            coverImage: parsed.cover || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
            rating: parsed.rating?.toString() || '4.7',
            reviews: parsed.reviews?.toString() || '98',
            location: parsed.city || 'Pune, Maharashtra',
            experience: parsed.experience || '10+ Years',
            specialization: parsed.shortDesc || parsed.about || `Expert ${roleLabel.toLowerCase()} services.`,
            projects: parsed.projects?.toString() || '96',
            followers: '189',
            firmName: parsed.firmName || parsed.fullName || 'RM Design Studios',
            phone: parsed.phoneNumber || parsed.phone || '+91 98765 43211'
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header Buttons */}
      <View style={styles.navHeader}>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={handleShare} style={styles.circleHeaderBtn}>
            <Feather name="share-2" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleHeaderBtn} onPress={handleLogout}>
            <Feather name="log-out" size={18} color={COLORS.red} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cover & Profile Avatar Container */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: user.coverImage }} style={styles.coverImage} contentFit="cover" />
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: user.avatar }} style={styles.avatarImage} contentFit="cover" />
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={12} color={COLORS.white} />
            </View>
          </View>
        </View>

        {/* Profile Info Details Block */}
        <View style={styles.profileDetailsBlock}>
          <View style={styles.nameSection}>
            <Text style={styles.profileName}>{user.firmName}</Text>
            <View style={styles.followersContainer}>
              <Feather name="users" size={14} color={COLORS.textMuted} />
              <Text style={styles.followersText}>{user.followers} Followers</Text>
            </View>
          </View>
          
          <Text style={styles.subtitleText}>{user.name} • {currentUser?.role || 'Architect'}</Text>
          <Text style={styles.phoneText}>
            <Feather name="phone" size={13} color={COLORS.textMuted} /> {user.phone}
          </Text>

          {/* Quick Info Tags Row */}
          <View style={styles.quickInfoRow}>
            <View style={styles.infoTag}>
              <Feather name="award" size={14} color={COLORS.gold} />
              <Text style={styles.infoTagText}>{user.experience} Exp</Text>
            </View>
            <View style={styles.infoTag}>
              <Feather name="grid" size={14} color={COLORS.blue} />
              <Text style={styles.infoTagText}>{user.projects} Projects</Text>
            </View>
            <View style={styles.infoTag}>
              <Feather name="map-pin" size={14} color={COLORS.green} />
              <Text style={styles.infoTagText}>{user.location.split(',')[0]}</Text>
            </View>
          </View>

          {/* Edit Profile & Logout Action Buttons */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity style={styles.editProfileBtn} onPress={handleEditProfile}>
              <Feather name="edit" size={15} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.editProfileBtnText}>Edit Profile Info</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={15} color={COLORS.red} style={{ marginRight: 5 }} />
              <Text style={styles.logoutBtnText}>Log Out</Text>
            </TouchableOpacity>
          </View>

          {/* Specializations Wrap */}
          <View style={styles.specializationSection}>
            <Text style={styles.sectionHeaderTitle}>Specialization</Text>
            <View style={styles.specializationsWrap}>
              {['Residential Design', 'Commercial Design', 'Interior Design', 'Vastu Planning', 'Smart Homes', 'Renovation'].map((spec, index) => (
                <View key={index} style={styles.specTag}>
                  <Text style={styles.specTagText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Portfolio Highlights */}
          <View style={styles.portfolioHighlightSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Portfolio Highlights</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollWrapper}>
              {[
                { title: '24+ Commercial Projects', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80' },
                { title: '40+ Residential Projects', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80' },
                { title: '12+ Ongoing Projects', image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=300&q=80' }
              ].map((item, index) => (
                <View key={index} style={styles.portfolioCardHighlight}>
                  <Image source={{ uri: item.image }} style={styles.highlightImage} contentFit="cover" />
                  <View style={styles.highlightOverlay}>
                    <Feather name="play-circle" size={22} color={COLORS.white} style={styles.playIcon} />
                    <Text style={styles.highlightCardTitle}>{item.title}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Sub-Tabs Navigation */}
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

          {/* Dynamic Tab Content Area */}
          <View style={styles.tabContentArea}>
            {activeTab === 'projects' && (
              <View style={styles.projectsListCol}>
                {[
                  { name: 'Pune Commercial Tower', location: 'Pune', status: 'Completed', year: '2024', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Luxury Penthouse Suite', location: 'Pune', status: 'Completed', year: '2023', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Smart Tech Villa', location: 'Mumbai', status: 'In Progress', year: '2024', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80' }
                ].map((item, idx) => (
                  <View key={idx} style={styles.projectListItem}>
                    <Image source={{ uri: item.image }} style={styles.projectListImg} contentFit="cover" />
                    <View style={styles.projectListDetails}>
                      <Text style={styles.projectListName}>{item.name}</Text>
                      <Text style={styles.projectListLoc}>{item.location} • {item.year}</Text>
                      <View style={[styles.statusBadge, item.status === 'Completed' ? styles.statusCompleted : styles.statusProgress]}>
                        <Text style={[styles.statusBadgeText, item.status === 'Completed' ? { color: COLORS.green } : { color: COLORS.blue }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.bookmarkBtn}>
                      <Feather name="bookmark" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
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
                        <Feather key={s} name="star" size={14} color={s <= Math.floor(parseFloat(user.rating)) ? COLORS.gold : COLORS.border} style={{ marginRight: 2 }} />
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
                          <Feather key={s} name="star" size={11} color={s <= item.rating ? COLORS.gold : COLORS.border} />
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
  scrollContent: { paddingBottom: 50 },

  /* NAVIGATION HEADER */
  navHeader: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  headerRightActions: { flexDirection: 'row', gap: 10 },
  circleHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* COVER & PROFILE */
  coverContainer: { height: 180, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  avatarWrapper: {
    position: 'absolute',
    bottom: -35,
    left: 20,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 35 },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.green,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* PROFILE INFO DETAILS */
  profileDetailsBlock: { marginTop: 45, paddingHorizontal: 20 },
  nameSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  profileName: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  followersContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  followersText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  
  subtitleText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 5 },
  phoneText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 15 },

  /* QUICK INFO TAGS */
  quickInfoRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  infoTagText: { fontSize: 11, fontWeight: '600', color: COLORS.textDark },

  /* ACTION BUTTONS */
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  editProfileBtn: {
    flex: 1,
    height: 38,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  logoutBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  logoutBtnText: { color: COLORS.red, fontSize: 13, fontWeight: '700' },

  /* ABOUT / SECTION TITLE */
  sectionHeaderTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  aboutSection: { marginBottom: 20 },
  aboutParagraphText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },

  /* SPECIALIZATION */
  specializationSection: { marginBottom: 20 },
  specializationsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specTag: { backgroundColor: COLORS.bgLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  specTagText: { fontSize: 12, color: COLORS.textDark },

  /* PORTFOLIO HIGHLIGHTS */
  portfolioHighlightSection: { marginBottom: 25 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAllText: { fontSize: 13, color: COLORS.blue, fontWeight: '700' },
  horizontalScrollWrapper: { gap: 12 },
  portfolioCardHighlight: { width: 140, height: 100, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  highlightImage: { width: '100%', height: '100%' },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 10,
  },
  playIcon: { alignSelf: 'flex-start' },
  highlightCardTitle: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

  /* TABS SEGMENT */
  tabSegmentContainer: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 15 },
  tabScrollRow: { gap: 20, paddingBottom: 5 },
  tabButton: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabButton: { borderBottomColor: COLORS.purple },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  activeTabButtonText: { color: COLORS.purple },

  /* TAB CONTENT AREA */
  tabContentArea: { minHeight: 180 },

  /* PROJECTS LIST */
  projectsListCol: { gap: 12 },
  projectListItem: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  projectListImg: { width: 60, height: 60, borderRadius: 6 },
  projectListDetails: { flex: 1, marginLeft: 12 },
  projectListName: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  projectListLoc: { fontSize: 12, color: COLORS.textMuted, marginVertical: 3 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusCompleted: { backgroundColor: COLORS.greenLight },
  statusProgress: { backgroundColor: COLORS.blueLight },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  bookmarkBtn: { padding: 8 },

  /* VIDEOS TAB */
  videosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  videoCard: { width: (width - 50) / 2, height: 130, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.bgLight, position: 'relative' },
  videoThumbnail: { width: '100%', height: '100%' },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfoBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  videoTitleText: { flex: 1, color: COLORS.white, fontSize: 11, fontWeight: '600', marginRight: 5 },
  videoDurationText: { color: COLORS.white, fontSize: 9 },

  /* TEAM TAB */
  teamListCol: { gap: 12 },
  teamListItem: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  teamMemberAvatar: { width: 44, height: 44, borderRadius: 22 },
  teamMemberDetails: { flex: 1, marginLeft: 12 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center' },
  teamMemberName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  teamMemberType: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  teamViewProfileBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 6 },
  teamViewProfileBtnText: { fontSize: 11, color: COLORS.textDark, fontWeight: '600' },

  /* REVIEWS TAB */
  reviewsListCol: { gap: 15 },
  ratingBreakdownBox: { flexDirection: 'row', padding: 15, backgroundColor: COLORS.bgLight, borderRadius: 10, alignItems: 'center' },
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

  reviewItemCard: { padding: 15, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10 },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewerMeta: { flex: 1, marginLeft: 10 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  reviewDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  reviewStarsRow: { flexDirection: 'row' },
  reviewText: { fontSize: 13, color: COLORS.textDark, marginTop: 10, lineHeight: 18 },
});
