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
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F3F4F6',
  gold: '#F59E0B',
};

// Mock Team Members
const TEAM_MEMBERS = [
  { name: 'Ramesh Yadav', role: 'Site Supervisor', experience: '8 Years', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' },
  { name: 'Suresh Patil', role: 'Mason', experience: '10 Years', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
  { name: 'Ravi Singh', role: 'Carpenter', experience: '7 Years', avatar: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=150&auto=format&fit=crop' },
  { name: 'Imran Shaikh', role: 'Electrician', experience: '6 Years', avatar: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?q=80&w=150&auto=format&fit=crop' },
  { name: 'Mahesh Gupta', role: 'Plumber', experience: '9 Years', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop' },
  { name: 'Anil Naik', role: 'Painter', experience: '5 Years', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' }
];

export default function ContractorDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Load params with fallbacks
  const id = (params.id as string) || '1';
  const name = (params.name as string) || 'Raj Construction Services';
  const avatar = (params.avatar as string) || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=200&auto=format&fit=crop';
  const coverImage = (params.coverImage as string) || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop';
  const rating = (params.rating as string) || '4.8';
  const reviews = (params.reviews as string) || '124';
  const location = (params.location as string) || 'Mumbai, Maharashtra';
  const experience = (params.experience as string) || '12+ Years';
  const specialization = (params.specialization as string) || 'Specialized in residential and commercial construction with quality and timely delivery.';
  const projects = (params.projects as string) || '156';
  const followers = (params.followers as string) || '320';
  const firmName = (params.firmName as string) || 'BuildWell Construction Group';
  const phone = (params.phone as string) || '+91 98765 43210';
  const workerCount = (params.workerCount as string) || '25 Workers Available';
  const serviceAreas = (params.serviceAreas as string) || 'Mumbai, Navi Mumbai';
  const skillsList = params.skills ? (params.skills as string).split(',') : ['RCC Work', 'Brickwork', 'Plumbing', 'Electrical', 'Painting', 'Tile Work', 'False Ceiling', 'Carpentry'];

  // Tab State
  const [activeTab, setActiveTab] = useState<'projects' | 'media' | 'team' | 'reviews'>('projects');
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);
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

  const isOwnProfile = currentUser && currentUser._id === id;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${name} on Allver: Specialists in construction from ${location}. Contact: ${phone}`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=${phone}&text=Hello ${name}, I saw your contractor profile on Allver and wanted to discuss a construction project.`);
  };

  const handleCall = () => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleLabourClick = (worker: typeof TEAM_MEMBERS[0]) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push({
      pathname: '/labour-detail',
      params: {
        name: worker.name,
        role: worker.role,
        avatar: worker.avatar,
        experience: worker.experience,
        contractorName: name,
        rating: '4.8',
        reviews: '124'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header Row over Cover */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.circleHeaderBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.textDark} />
        </TouchableOpacity>
        
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={handleShare} style={styles.circleHeaderBtn}>
            <Feather name="share-2" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsBookmarked(!isBookmarked)} style={styles.circleHeaderBtn}>
            <Feather name="bookmark" size={20} color={isBookmarked ? COLORS.green : COLORS.textDark} style={isBookmarked && { fill: COLORS.green }} />
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
            <Text style={styles.profileName}>{name}</Text>
            <TouchableOpacity style={styles.followersContainer}>
              <Feather name="users" size={14} color={COLORS.textMuted} />
              <Text style={styles.followersText}>{followers} Followers</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitleText}>Residential Contractor | {location.split(',')[0]}</Text>
          
          {/* Quick Info Tags Row */}
          <View style={styles.quickInfoRow}>
            <View style={styles.infoTag}>
              <Feather name="award" size={14} color={COLORS.gold} />
              <Text style={styles.infoTagText}>{experience} Experience</Text>
            </View>
            <View style={styles.infoTag}>
              <Feather name="users" size={14} color={COLORS.blue} />
              <Text style={styles.infoTagText}>{workerCount.split(' ')[0]} Workers</Text>
            </View>
            <View style={styles.infoTag}>
              <Feather name="map-pin" size={14} color={COLORS.green} />
              <Text style={styles.infoTagText}>{serviceAreas.split(',')[0]}</Text>
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

              <TouchableOpacity style={styles.outlineActionBtn} onPress={handleCall}>
                <Feather name="phone" size={16} color={COLORS.textDark} style={{ marginRight: 6 }} />
                <Text style={styles.outlineActionText}>Call</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionHeaderTitle}>About</Text>
            <Text style={styles.aboutParagraphText} numberOfLines={showFullAbout ? undefined : 3}>
              {specialization} We are a trusted team of construction professionals specializing in residential and commercial building projects. From concrete foundation slab pouring to structural brickwork, plumbing, electrical wiring, and high-end interior woodworking, we deliver standard results ahead of schedule.
            </Text>
            <TouchableOpacity onPress={() => setShowFullAbout(!showFullAbout)}>
              <Text style={styles.readMoreText}>{showFullAbout ? 'Read Less' : 'Read More'}</Text>
            </TouchableOpacity>
          </View>

          {/* Skills & Expertise */}
          <View style={styles.specializationSection}>
            <Text style={styles.sectionHeaderTitle}>Skills & Expertise</Text>
            <View style={styles.specializationsWrap}>
              {skillsList.map((spec, index) => (
                <View key={index} style={styles.specTag}>
                  <Text style={styles.specTagText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Sub-Tabs Navigation Segment Control */}
          <View style={styles.tabSegmentContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'projects' && styles.activeTabButton]}
              onPress={() => setActiveTab('projects')}
            >
              <Feather name="grid" size={16} color={activeTab === 'projects' ? COLORS.blue : COLORS.textMuted} />
              <Text style={[styles.tabButtonText, activeTab === 'projects' && styles.activeTabButtonText]}>Projects</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'media' && styles.activeTabButton]}
              onPress={() => setActiveTab('media')}
            >
              <Feather name="play-circle" size={16} color={activeTab === 'media' ? COLORS.blue : COLORS.textMuted} />
              <Text style={[styles.tabButtonText, activeTab === 'media' && styles.activeTabButtonText]}>Media</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'team' && styles.activeTabButton]}
              onPress={() => setActiveTab('team')}
            >
              <Feather name="users" size={16} color={activeTab === 'team' ? COLORS.blue : COLORS.textMuted} />
              <Text style={[styles.tabButtonText, activeTab === 'team' && styles.activeTabButtonText]}>Team</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'reviews' && styles.activeTabButton]}
              onPress={() => setActiveTab('reviews')}
            >
              <Feather name="star" size={16} color={activeTab === 'reviews' ? COLORS.blue : COLORS.textMuted} />
              <Text style={[styles.tabButtonText, activeTab === 'reviews' && styles.activeTabButtonText]}>Reviews</Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Tab Content Area */}
          <View style={styles.tabContentArea}>
            
            {/* PROJECTS TAB */}
            {activeTab === 'projects' && (
              <View style={styles.projectsListCol}>
                {[
                  { name: '2BHK Residential Construction', location: 'Navi Mumbai', status: 'Ongoing', progress: 0.6, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80' },
                  { name: '3BHK Villa Project', location: 'Panvel, Navi Mumbai', status: 'Completed', progress: 1.0, image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Interior Work', location: 'Kharghar, Navi Mumbai', status: 'Ongoing', progress: 0.4, image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Renovation Project', location: 'Belapur, Navi Mumbai', status: 'Ongoing', progress: 0.3, image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=200&q=80' }
                ].map((item, idx) => (
                  <View key={idx} style={styles.projectListItem}>
                    <Image source={{ uri: item.image }} style={styles.projectListImg} contentFit="cover" />
                    <View style={styles.projectListDetails}>
                      <Text style={styles.projectListName}>{item.name}</Text>
                      <Text style={styles.projectListLoc}>{item.location}</Text>
                      
                      {/* Progress bar container */}
                      <View style={styles.progressRow}>
                        <View style={styles.progressBarBg}>
                          <View style={[styles.progressBarFill, { width: `${item.progress * 100}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{item.progress * 100}%</Text>
                      </View>

                      <View style={[styles.statusBadge, item.status === 'Completed' ? styles.statusCompleted : styles.statusProgress]}>
                        <View style={[styles.statusDot, { backgroundColor: item.status === 'Completed' ? COLORS.green : '#F59E0B' }]} />
                        <Text style={[styles.statusBadgeText, item.status === 'Completed' ? { color: COLORS.green } : { color: '#F59E0B' }]}>
                          {item.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* MEDIA TAB */}
            {activeTab === 'media' && (
              <View style={styles.mediaGrid}>
                {[
                  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=200&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=200&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=200&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=200&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop',
                  'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?q=80&w=200&auto=format&fit=crop'
                ].map((uri, idx) => (
                  <View key={idx} style={styles.mediaCard}>
                    <Image source={{ uri }} style={styles.mediaThumbnail} contentFit="cover" />
                    {idx === 1 && (
                      <View style={styles.videoPlayOverlay}>
                        <Feather name="play" size={24} color={COLORS.white} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* TEAM TAB */}
            {activeTab === 'team' && (
              <View style={styles.teamListCol}>
                {TEAM_MEMBERS.map((worker, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.teamListItem} 
                    activeOpacity={0.8}
                    onPress={() => handleLabourClick(worker)}
                  >
                    <Image source={{ uri: worker.avatar }} style={styles.teamMemberAvatar} contentFit="cover" />
                    <View style={styles.teamMemberDetails}>
                      <Text style={styles.teamMemberName}>{worker.name}</Text>
                      <Text style={styles.teamMemberRole}>{worker.role} • {worker.experience} Exp</Text>
                    </View>
                    <View style={styles.availabilityBadge}>
                      <Text style={styles.availabilityText}>Available</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <View style={styles.reviewsListCol}>
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
                      { stars: '4', count: '18' },
                      { stars: '3', count: '5' },
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

                {/* Review Items */}
                {[
                  { name: 'Karan Chaubey', date: 'Yesterday', rating: 5, comment: 'BuildWell did a phenomenal job constructing our independent villa in Panvel. Outstanding materials and construction schedule maintenance.', avatar: 'https://i.pravatar.cc/100?img=11' },
                  { name: 'Rita Desai', date: '2 weeks ago', rating: 4, comment: 'Great supervisor team. Very clear communication and workers finished RCC slab exactly on time.', avatar: 'https://i.pravatar.cc/100?img=12' }
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
  profileName: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, flex: 1, marginRight: 10 },
  followersContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  followersText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  
  subtitleText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 15 },

  /* QUICK INFO TAGS */
  quickInfoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  infoTag: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    justifyContent: 'center'
  },
  infoTagText: { fontSize: 11, fontWeight: '600', color: COLORS.textDark },

  /* ACTION BUTTONS */
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  followBtn: {
    flex: 1.5,
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
    flex: 1,
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

  /* ABOUT SECTION */
  aboutSection: { marginBottom: 20 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  aboutParagraphText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  readMoreText: { fontSize: 13, color: COLORS.blue, fontWeight: '700', marginTop: 4 },

  /* SPECIALIZATION */
  specializationSection: { marginBottom: 25 },
  specializationsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  specTag: { backgroundColor: COLORS.bgLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  specTagText: { fontSize: 12, color: COLORS.textDark },

  /* TAB SEGMENT */
  tabSegmentContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 20 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabButton: { borderBottomColor: COLORS.blue },
  tabButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  activeTabButtonText: { color: COLORS.blue, fontWeight: '700' },

  tabContentArea: { minHeight: 200 },

  /* PROJECTS TAB */
  projectsListCol: { gap: 12 },
  projectListItem: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  projectListImg: { width: 70, height: 70, borderRadius: 6 },
  projectListDetails: { flex: 1, marginLeft: 12 },
  projectListName: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  projectListLoc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 },
  progressBarBg: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: COLORS.green, borderRadius: 3 },
  progressText: { fontSize: 10, fontWeight: '700', color: COLORS.textDark },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.bgLight },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusCompleted: { backgroundColor: COLORS.greenLight },
  statusProgress: { backgroundColor: '#FFEDD5' },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  /* MEDIA TAB */
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mediaCard: { width: (width - 50) / 2, height: 110, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.bgLight, position: 'relative' },
  mediaThumbnail: { width: '100%', height: '100%' },
  videoPlayOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },

  /* TEAM TAB */
  teamListCol: { gap: 12 },
  teamListItem: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: 'center', backgroundColor: COLORS.white },
  teamMemberAvatar: { width: 44, height: 44, borderRadius: 22 },
  teamMemberDetails: { flex: 1, marginLeft: 12 },
  teamMemberName: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  teamMemberRole: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  availabilityBadge: { backgroundColor: COLORS.greenLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  availabilityText: { fontSize: 10, color: COLORS.green, fontWeight: '700' },

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
  reviewText: { fontSize: 13, color: COLORS.textDark, marginTop: 8, lineHeight: 18 },
});
