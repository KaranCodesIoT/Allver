import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';

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
};

export default function ArchitectDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Dynamic values with fallbacks to Neha Sharma (from third screenshot)
  const architectId = (params.id as string) || '1';
  const name = (params.name as string) || 'Ar. Neha Sharma';
  const avatar = (params.avatar as string) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80';
  const coverImage = (params.coverImage as string) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
  const rating = (params.rating as string) || '4.8';
  const reviews = (params.reviews as string) || '124';
  const location = (params.location as string) || 'Mumbai, Maharashtra';
  const experience = (params.experience as string) || '8+ Years';
  const projectsCount = (params.projects as string) || '120';
  const followersCount = (params.followers as string) || '256';
  const firmName = (params.firmName as string) || 'Design Space Architects';
  const phone = (params.phone as string) || '+91 98765 43210';
  const specializationStr = (params.specialization as string) || 'Specializes in modern, sustainable and luxury architecture.';
  const role = (params.role as string) || 'Architect';

  // State
  const [activeTab, setActiveTab] = useState<'projects' | 'videos' | 'team' | 'reviews'>('projects');
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

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
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const isOwnProfile = currentUser && currentUser._id === architectId;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${name}'s profile on Allver: ${firmName} from ${location}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=${phone}&text=Hello ${name}, I saw your profile on Allver and wanted to inquire about architectural services.`);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Navigation Row over Cover */}
      <View style={styles.navHeader}>
        <TouchableOpacity 
          onPress={() => {
            if (Platform.OS === 'web' && typeof document !== 'undefined') {
              (document.activeElement as HTMLElement)?.blur();
            }
            router.back();
          }} 
          style={styles.circleHeaderBtn}
        >
          <Feather name="arrow-left" size={20} color={COLORS.textDark} />
        </TouchableOpacity>
        
        <View style={styles.headerRightActions}>
          <TouchableOpacity 
            onPress={() => {
              if (Platform.OS === 'web' && typeof document !== 'undefined') {
                (document.activeElement as HTMLElement)?.blur();
              }
              handleShare();
            }} 
            style={styles.circleHeaderBtn}
          >
            <Feather name="share-2" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleHeaderBtn}>
            <Feather name="more-vertical" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Cover & Profile Avatar Container */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: coverImage }} style={styles.coverImage} contentFit="cover" />
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: avatar }} style={styles.avatarImage} contentFit="cover" />
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={12} color={COLORS.white} />
            </View>
          </View>
        </View>

        {/* Profile Info Details Block */}
        <View style={styles.profileDetailsBlock}>
          <View style={styles.nameSection}>
            <Text style={styles.profileName}>{firmName}</Text>
            <TouchableOpacity style={styles.followersContainer}>
              <Feather name="users" size={14} color={COLORS.textMuted} />
              <Text style={styles.followersText}>{followersCount} Followers</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitleText}>{name} • {role} | {location}</Text>
          <Text style={styles.phoneText} onPress={handleCall}>
            <Feather name="phone" size={13} color={COLORS.textMuted} /> {phone}
          </Text>

          {/* Quick Info Tags Row */}
          <View style={styles.quickInfoRow}>
            <View style={styles.infoTag}>
              <Feather name="award" size={14} color={COLORS.gold} />
              <Text style={styles.infoTagText}>{experience} Experience</Text>
            </View>
            <View style={styles.infoTag}>
              <Feather name="grid" size={14} color={COLORS.blue} />
              <Text style={styles.infoTagText}>{projectsCount}+ Projects</Text>
            </View>
            <View style={styles.infoTag}>
              <Feather name="map-pin" size={14} color={COLORS.green} />
              <Text style={styles.infoTagText}>{location.split(',')[0]}</Text>
            </View>
          </View>

          {/* Core Action/Edit Buttons */}
          {isOwnProfile ? (
            <View style={{ marginBottom: 20 }}>
              <TouchableOpacity 
                style={{
                  height: 46,
                  backgroundColor: COLORS.green,
                  borderRadius: 8,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => router.push('/edit-profile')}
              >
                <Feather name="edit" size={16} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '700' }}>Edit Profile Info</Text>
              </TouchableOpacity>
              <Text style={{ textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 8 }}>
                This is your public profile.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.actionButtonsRow}>
                <TouchableOpacity 
                  style={[styles.followBtn, isFollowing && styles.followingBtn]} 
                  onPress={() => setIsFollowing(!isFollowing)}
                >
                  <Feather name={isFollowing ? "check" : "user-plus"} size={16} color={isFollowing ? COLORS.textDark : COLORS.white} style={{ marginRight: 6 }} />
                  <Text style={[styles.followBtnText, isFollowing && { color: COLORS.textDark }]}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.outlineActionBtn} onPress={handleWhatsApp}>
                  <FontAwesome5 name="whatsapp" size={16} color={COLORS.green} style={{ marginRight: 6 }} />
                  <Text style={styles.outlineActionText}>Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.outlineActionBtn}>
                  <Feather name="message-square" size={16} color={COLORS.textDark} style={{ marginRight: 6 }} />
                  <Text style={styles.outlineActionText}>Message</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.hireBtn}>
                <Feather name="briefcase" size={16} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.hireBtnText}>Hire / Give Contract</Text>
              </TouchableOpacity>
            </>
          )}

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionHeaderTitle}>About</Text>
            <Text style={styles.aboutParagraphText}>
              {specializationStr}
            </Text>
          </View>

          {/* Specializations Wrap */}
          <View style={styles.specializationSection}>
            <Text style={styles.sectionHeaderTitle}>Specialization</Text>
            <View style={styles.specializationsWrap}>
              {['Residential Design', 'Commercial Design', 'Interior Design', 'Landscape', '3D Visualization', 'Renovation', 'Vastu Planning', 'Smart Homes'].map((spec, index) => (
                <View key={index} style={styles.specTag}>
                  <Text style={styles.specTagText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Portfolio Highlights Horizontal Scroll */}
          <View style={styles.portfolioHighlightSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Portfolio Highlights</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollWrapper}>
              {[
                { title: '32+ Exterior Projects', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80' },
                { title: '48+ Interior Projects', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80' },
                { title: '18+ Ongoing Projects', image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=300&q=80' },
                { title: '22+ Design Plans', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80' }
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

          {/* Sub-Tabs Navigation Segment */}
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
                  { name: 'Greenwood Villa', location: 'Navi Mumbai', status: 'Completed', year: '2024', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Palm Beach Apartment', location: 'Mumbai', status: 'In Progress', year: '2024', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Corporate Office Design', location: 'Mumbai', status: 'Completed', year: '2023', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Luxury Bungalow Design', location: 'Navi Mumbai', status: 'Completed', year: '2023', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Hill View Residence', location: 'Pune', status: 'In Progress', year: '2024', image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=200&q=80' }
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
                  { title: 'Modern Villa Walkthrough', duration: '0:30', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80' },
                  { title: 'Apartment Interior Tour', duration: '0:45', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80' },
                  { title: 'Construction Timelapse', duration: '0:25', image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=300&q=80' },
                  { title: 'Bungalow Exterior Design', duration: '0:32', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80' }
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
                  { name: 'Mitesh Construction', type: 'Contractor', avatar: 'https://i.pravatar.cc/100?img=11' },
                  { name: 'BuildWell Contractors', type: 'Contractor', avatar: 'https://i.pravatar.cc/100?img=12' },
                  { name: 'Shree Builders', type: 'Contractor', avatar: 'https://i.pravatar.cc/100?img=13' },
                  { name: 'Nexus Constructions', type: 'Contractor', avatar: 'https://i.pravatar.cc/100?img=14' },
                  { name: 'Reliable Buildcon', type: 'Contractor', avatar: 'https://i.pravatar.cc/100?img=15' }
                ].map((item, idx) => (
                  <View key={idx} style={styles.teamListItem}>
                    <Image source={{ uri: item.avatar }} style={styles.teamMemberAvatar} contentFit="cover" />
                    <View style={styles.teamMemberDetails}>
                      <View style={styles.teamNameRow}>
                        <Text style={styles.teamMemberName}>{item.name}</Text>
                        <Feather name="check-circle" size={12} color={COLORS.blue} style={{ marginLeft: 5 }} />
                      </View>
                      <Text style={styles.teamMemberType}>{item.type} • Verified Partner</Text>
                    </View>
                    <TouchableOpacity style={styles.teamViewProfileBtn}>
                      <Text style={styles.teamViewProfileBtnText}>View Profile</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'reviews' && (
              <View style={styles.reviewsListCol}>
                {/* Rating Breakdown Section */}
                <View style={styles.ratingBreakdownBox}>
                  <View style={styles.ratingOverallCol}>
                    <Text style={styles.overallRatingValue}>{rating}</Text>
                    <View style={styles.overallStarsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Feather key={s} name="star" size={14} color={s <= Math.floor(parseFloat(rating)) ? COLORS.gold : COLORS.border} style={{ marginRight: 2 }} />
                      ))}
                    </View>
                    <Text style={styles.overallRatingReviews}>{reviews} Reviews</Text>
                  </View>
                  <View style={styles.ratingProgressCol}>
                    {[
                      { stars: '5', count: '98' },
                      { stars: '4', count: '21' },
                      { stars: '3', count: '6' },
                      { stars: '2', count: '2' },
                      { stars: '1', count: '1' }
                    ].map((row) => {
                      const percentage = (parseInt(row.count) / parseInt(reviews)) * 100;
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

                {/* Specific Reviews */}
                {[
                  { name: 'Neha Sharma', date: '2 days ago', rating: 5, comment: 'Excellent design sense and great attention to detail. The team was professional and very cooperative throughout the project.', avatar: 'https://i.pravatar.cc/100?img=21' },
                  { name: 'Vikram Patel', date: '1 week ago', rating: 5, comment: 'Highly satisfied with their work. They understood our requirements perfectly and delivered beyond expectations.', avatar: 'https://i.pravatar.cc/100?img=22' },
                  { name: 'Priya Nair', date: '3 weeks ago', rating: 4, comment: 'Amazing experience working with Design Space Architects. Timely delivery and outstanding designs!', avatar: 'https://i.pravatar.cc/100?img=23' }
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
                    {/* Review Images */}
                    <View style={styles.reviewImagesRow}>
                      <Image source={{ uri: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=150&q=80' }} style={styles.reviewImgThumb} contentFit="cover" />
                      <Image source={{ uri: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=150&q=80' }} style={styles.reviewImgThumb} contentFit="cover" />
                    </View>
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

  /* NAVIGATION OVERLAY */
  navHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  headerRightActions: { flexDirection: 'row', gap: 10 },
  circleHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  /* COVER & PROFILE */
  coverContainer: { height: 220, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  avatarWrapper: {
    position: 'absolute',
    bottom: -40,
    left: 20,
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 40 },
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

  /* PROFILE INFO DETAILS */
  profileDetailsBlock: { marginTop: 50, paddingHorizontal: 20 },
  nameSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  profileName: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  followersContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  followersText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  
  subtitleText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 5 },
  phoneText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 15 },

  /* QUICK INFO TAGS */
  quickInfoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  infoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  infoTagText: { fontSize: 12, fontWeight: '600', color: COLORS.textDark },

  /* ACTION BUTTONS */
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  followBtn: {
    flex: 2,
    height: 44,
    backgroundColor: COLORS.blue,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  outlineActionBtn: {
    flex: 1.2,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  outlineActionText: { color: COLORS.textDark, fontSize: 14, fontWeight: '600' },

  hireBtn: {
    height: 46,
    backgroundColor: COLORS.purple,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  hireBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  /* ABOUT / SECTION TITLE */
  sectionHeaderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
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
  tabContentArea: { minHeight: 200 },

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
  reviewImagesRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  reviewImgThumb: { width: 50, height: 50, borderRadius: 6 },
});
