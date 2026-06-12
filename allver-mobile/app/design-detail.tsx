import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#16A34A',
  greenLight: '#F0FDF4',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F3F4F6',
  gold: '#F59E0B',
  blue: '#3B82F6',
};

export default function DesignDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Load params
  const designId = (params.id as string) || '1';
  const title = (params.title as string) || 'Modern 2BHK Apartment';
  const location = (params.location as string) || 'Mumbai, Maharashtra';
  const mainImage = (params.image as string) || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80';
  const likes = (params.likes as string) || '128';
  const comments = (params.comments as string) || '24';
  const rating = (params.rating as string) || '4.8';

  // Architect Params
  const authorId = (params.authorId as string) || '1';
  const authorName = (params.authorName as string) || 'Ar. Neha Sharma';
  const authorAvatar = (params.authorAvatar as string) || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80';
  const authorCover = (params.authorCover as string) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
  const authorFirm = (params.authorFirm as string) || 'Design Space Architects';
  const authorExperience = (params.authorExperience as string) || '8+ Years';
  const authorProjects = (params.authorProjects as string) || '120';
  const authorFollowers = (params.authorFollowers as string) || '256';
  const authorPhone = (params.authorPhone as string) || '+91 98765 43210';
  const authorReviews = (params.authorReviews as string) || '124';

  const imagesList = params.imagesList 
    ? (params.imagesList as string).split(',')
    : [mainImage];

  // States
  const [activeTab, setActiveTab] = useState<'photos' | 'videos' | 'quotation'>('photos');
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handleViewProfile = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    // Navigate to architect details page
    router.push({
      pathname: '/architect-detail',
      params: {
        id: authorId,
        name: authorName,
        avatar: authorAvatar,
        coverImage: authorCover,
        firmName: authorFirm,
        experience: authorExperience,
        projects: authorProjects,
        followers: authorFollowers,
        phone: authorPhone,
        reviews: authorReviews,
      }
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this design on Allver: ${title} in ${location} by ${authorName}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleWhatsApp = () => {
    Linking.openURL(`whatsapp://send?phone=${authorPhone}&text=Hello ${authorName}, I saw your design "${title}" on Allver and wanted to inquire about custom architectural plans.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header Row */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleShare} style={styles.headerCircleBtn}>
            <Feather name="share-2" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setHasSaved(!hasSaved)} 
            style={[styles.headerCircleBtn, hasSaved && { backgroundColor: COLORS.greenLight }]}
          >
            <Feather name="bookmark" size={18} color={hasSaved ? COLORS.green : COLORS.textDark} style={hasSaved && { fill: COLORS.green }} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Title Block */}
        <View style={styles.titleBlock}>
          <Text style={styles.designTitle}>{title}</Text>
          <Text style={styles.designLoc}>
            <Feather name="map-pin" size={13} color={COLORS.textMuted} /> {location}
          </Text>
        </View>

        {/* Architect Profile Inline Card */}
        <View style={styles.designerCard}>
          <TouchableOpacity onPress={handleViewProfile}>
            <Image source={{ uri: authorAvatar }} style={styles.designerAvatar} contentFit="cover" />
          </TouchableOpacity>
          <View style={styles.designerInfo}>
            <View style={styles.designerNameRow}>
              <Text style={styles.designerName} onPress={handleViewProfile}>By {authorName}</Text>
              <View style={styles.verifiedBadge}>
                <Feather name="check" size={8} color={COLORS.white} />
              </View>
            </View>
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color={COLORS.gold} style={{ fill: COLORS.gold }} />
              <Text style={styles.ratingText}>{rating} <Text style={styles.reviewsText}>({authorReviews} reviews)</Text></Text>
            </View>
          </View>
          <View style={styles.designerActions}>
            <TouchableOpacity 
              style={[styles.miniBtn, isFollowing && { backgroundColor: COLORS.bgLight }]}
              onPress={() => setIsFollowing(!isFollowing)}
            >
              <Text style={styles.miniBtnText}>{isFollowing ? 'Following' : 'Follow'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.miniBtn} onPress={handleViewProfile}>
              <Text style={styles.miniBtnText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.miniBtn, styles.miniBtnGreen]} onPress={handleWhatsApp}>
              <Feather name="message-circle" size={12} color={COLORS.white} style={{ marginRight: 2 }} />
              <Text style={[styles.miniBtnText, { color: COLORS.white }]}>Contact</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sub-Tabs Selector */}
        <View style={styles.subTabsContainer}>
          {(['photos', 'videos', 'quotation'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity 
                key={tab} 
                style={[styles.subTabBtn, isActive && styles.subTabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Feather 
                  name={tab === 'photos' ? 'image' : tab === 'videos' ? 'play-circle' : 'file-text'} 
                  size={14} 
                  color={isActive ? COLORS.green : COLORS.textMuted} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.subTabBtnText, isActive && styles.subTabBtnTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Photos Grid Tab Content */}
        {activeTab === 'photos' && (
          <View style={styles.photosGrid}>
            <View style={styles.mainPhotoCol}>
              <Image source={{ uri: mainImage }} style={styles.mainPhoto} contentFit="cover" />
              <View style={styles.mediaCountBadge}>
                <Text style={styles.mediaCountText}>1/{imagesList.length || 1}</Text>
              </View>
            </View>
            <View style={styles.sidePhotoCol}>
              <Image 
                source={{ uri: imagesList[1] || 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=200&q=80' }} 
                style={styles.sidePhotoTop} 
                contentFit="cover" 
              />
              <View style={styles.sidePhotoBottomContainer}>
                <Image 
                  source={{ uri: imagesList[2] || 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=200&q=80' }} 
                  style={styles.sidePhotoBottom} 
                  contentFit="cover" 
                />
                <View style={styles.morePhotosOverlay}>
                  <Text style={styles.morePhotosText}>+9 More</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'videos' && (
          <View style={styles.videosTabContent}>
            <Image source={{ uri: mainImage }} style={styles.videoPlayerMock} contentFit="cover" />
            <View style={styles.videoPlayIconBg}>
              <Feather name="play" size={32} color={COLORS.white} />
            </View>
          </View>
        )}

        {activeTab === 'quotation' && (
          <View style={styles.quotationTabContent}>
            <View style={styles.quotationHeader}>
              <Feather name="file-text" size={24} color={COLORS.green} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.quotationTitle}>Estimated Cost Quotation</Text>
                <Text style={styles.quotationSub}>Based on standard material finishes</Text>
              </View>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Civil & Structure</Text>
              <Text style={styles.quoteValue}>₹4.5 L - ₹5.8 L</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Flooring & Tiling</Text>
              <Text style={styles.quoteValue}>₹1.2 L - ₹1.8 L</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Electrical & Plumbing</Text>
              <Text style={styles.quoteValue}>₹0.8 L - ₹1.2 L</Text>
            </View>
            <View style={styles.quoteRow}>
              <Text style={styles.quoteLabel}>Modular Woodwork</Text>
              <Text style={styles.quoteValue}>₹2.5 L - ₹3.8 L</Text>
            </View>
            <View style={[styles.quoteRow, { borderBottomWidth: 0, marginTop: 10 }]}>
              <Text style={[styles.quoteLabel, { fontWeight: '800' }]}>Total Approx Cost</Text>
              <Text style={[styles.quoteValue, { color: COLORS.green, fontWeight: '800' }]}>₹9.0 L - ₹12.6 L</Text>
            </View>
          </View>
        )}

        {/* Design Overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionHeaderTitle}>Design Overview</Text>
          <Text style={styles.overviewText} numberOfLines={showFullOverview ? undefined : 3}>
            A modern and minimal 2BHK apartment design with a perfect blend of comfort, functionality and premium aesthetics. Warm wood tones, soft natural light, and space-optimized custom layouts make this home feel open and truly beautiful. Perfect choice for urban families looking for upscale styling.
          </Text>
          <TouchableOpacity style={styles.showMoreRow} onPress={() => setShowFullOverview(!showFullOverview)}>
            <Text style={styles.showMoreText}>{showFullOverview ? 'Show Less' : 'Show More'}</Text>
            <Feather name={showFullOverview ? "chevron-up" : "chevron-down"} size={14} color={COLORS.green} />
          </TouchableOpacity>
        </View>

        {/* Stats and Action Bar */}
        <View style={styles.statsRow}>
          <View style={styles.statsCol}>
            <TouchableOpacity 
              style={[styles.statActionBtn, hasLiked && { backgroundColor: COLORS.greenLight }]} 
              onPress={() => setHasLiked(!hasLiked)}
            >
              <Feather name="heart" size={16} color={hasLiked ? COLORS.green : COLORS.textDark} style={hasLiked && { fill: COLORS.green }} />
              <Text style={[styles.statActionText, hasLiked && { color: COLORS.green }]}>
                {hasLiked ? parseInt(likes) + 1 : likes}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statActionBtn}>
              <Feather name="message-square" size={16} color={COLORS.textDark} />
              <Text style={styles.statActionText}>{comments}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.statActionBtn, hasSaved && { backgroundColor: COLORS.greenLight }]}
            onPress={() => setHasSaved(!hasSaved)}
          >
            <Feather name="bookmark" size={16} color={hasSaved ? COLORS.green : COLORS.textDark} style={hasSaved && { fill: COLORS.green }} />
            <Text style={[styles.statActionText, hasSaved && { color: COLORS.green }]}>
              {hasSaved ? 'Saved Design' : 'Save Design'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionDivider} />

        {/* Similar Designs Horizontal Scroll */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Similar Designs</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All {'->'}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselWrapper}>
            {[
              { title: 'Minimal 2BHK Apartment', loc: 'Pune, Maharashtra', rating: '4.6', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=250&q=80' },
              { title: 'Modern Living Room', loc: 'Mumbai, Maharashtra', rating: '4.7', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=250&q=80' },
              { title: 'Modular Kitchen Design', loc: 'Bengaluru, Karnataka', rating: '4.5', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=250&q=80' },
            ].map((item, idx) => (
              <View key={idx} style={styles.carouselCard}>
                <Image source={{ uri: item.image }} style={styles.carouselImg} contentFit="cover" />
                <View style={styles.carouselCardBody}>
                  <Text style={styles.carouselCardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.carouselCardLoc}>{item.loc}</Text>
                  <View style={styles.carouselRatingRow}>
                    <Feather name="star" size={10} color={COLORS.gold} style={{ fill: COLORS.gold }} />
                    <Text style={styles.carouselRatingText}>{item.rating}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Contractors Who Can Build This Design Section */}
        <View style={[styles.sectionWrap, { marginTop: 10 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Contractors Who Can Build This Design</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All {'->'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselWrapper}>
            {[
              { name: 'BuildWell Construction', rate: '4.6 (98)', price: 'Starts at ₹8.5 L', avatar: 'https://i.pravatar.cc/100?img=12' },
              { name: 'HomeCraft Builders', rate: '4.5 (76)', price: 'Starts at ₹8.8 L', avatar: 'https://i.pravatar.cc/100?img=13' },
              { name: 'StructureLine Construc.', rate: '4.7 (120)', price: 'Starts at ₹8.2 L', avatar: 'https://i.pravatar.cc/100?img=14' }
            ].map((item, idx) => (
              <View key={idx} style={styles.contractorCard}>
                <Image source={{ uri: item.avatar }} style={styles.contractorAvatar} contentFit="cover" />
                <Text style={styles.contractorName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.contractorRating}>
                  <Feather name="star" size={10} color={COLORS.gold} style={{ fill: COLORS.gold }} />
                  <Text style={styles.contractorRatingText}>{item.rate}</Text>
                </View>
                <Text style={styles.contractorPrice}>{item.price}</Text>
                <TouchableOpacity style={styles.hireBtn}>
                  <Text style={styles.hireBtnText}>Hire Now</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

      </ScrollView>

      {/* Bottom Floating Action Buttons */}
      <View style={styles.bottomBarActions}>
        <TouchableOpacity style={styles.similarBtn}>
          <Feather name="grid" size={16} color={COLORS.textDark} style={{ marginRight: 6 }} />
          <Text style={styles.similarBtnText}>Get Similar Design</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactDesignerBtn} onPress={handleWhatsApp}>
          <Feather name="message-circle" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
          <Text style={styles.contactDesignerBtnText}>Contact Designer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingBottom: 100 },

  /* HEADER */
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backBtn: { padding: 4 },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* TITLE */
  titleBlock: { paddingHorizontal: 20, paddingTop: 16, pb: 10 },
  designTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  designLoc: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },

  /* DESIGNER CARD */
  designerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
  },
  designerAvatar: { width: 44, height: 44, borderRadius: 22 },
  designerInfo: { flex: 1, marginLeft: 10 },
  designerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  designerName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  verifiedBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 11, fontWeight: '700', color: COLORS.textDark },
  reviewsText: { fontSize: 10, fontWeight: '500', color: COLORS.textMuted },
  designerActions: { flexDirection: 'row', gap: 6 },
  miniBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  miniBtnGreen: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
    flexDirection: 'row',
  },
  miniBtnText: { fontSize: 9, fontWeight: '700', color: COLORS.textDark },

  /* SUB TABS */
  subTabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabBtnActive: {
    borderBottomColor: COLORS.green,
  },
  subTabBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  subTabBtnTextActive: { color: COLORS.green, fontWeight: '700' },

  /* PHOTOS GRID */
  photosGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    height: 220,
    gap: 10,
  },
  mainPhotoCol: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  mainPhoto: { width: '100%', height: '100%' },
  mediaCountBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  mediaCountText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },
  sidePhotoCol: {
    flex: 1,
    gap: 10,
  },
  sidePhotoTop: { flex: 1, borderRadius: 10 },
  sidePhotoBottomContainer: {
    flex: 1,
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
  },
  sidePhotoBottom: { width: '100%', height: '100%' },
  morePhotosOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  morePhotosText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },

  /* VIDEOS */
  videosTabContent: {
    marginHorizontal: 20,
    marginTop: 16,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  videoPlayerMock: { ...StyleSheet.absoluteFillObject, opacity: 0.8 },
  videoPlayIconBg: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* QUOTATION */
  quotationTabContent: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.bgLight,
  },
  quotationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  quotationTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  quotationSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quoteLabel: { fontSize: 12, color: COLORS.textDark, fontWeight: '500' },
  quoteValue: { fontSize: 12, color: COLORS.textDark, fontWeight: '700' },

  /* OVERVIEW */
  overviewSection: { paddingHorizontal: 20, marginTop: 20 },
  overviewText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },
  showMoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  showMoreText: { fontSize: 12, fontWeight: '700', color: COLORS.green },

  /* STATS BAR */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
  },
  statsCol: { flexDirection: 'row', gap: 12 },
  statActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statActionText: { fontSize: 11, fontWeight: '700', color: COLORS.textDark },

  sectionDivider: { height: 6, backgroundColor: COLORS.bgLight, marginVertical: 20 },

  /* SECTIONS */
  sectionWrap: { paddingHorizontal: 20 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAllText: { fontSize: 12, color: COLORS.green, fontWeight: '700' },
  
  carouselWrapper: { gap: 12 },
  carouselCard: {
    width: 150,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  carouselImg: { width: '100%', height: 100 },
  carouselCardBody: { padding: 8 },
  carouselCardTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textDark },
  carouselCardLoc: { fontSize: 9, color: COLORS.textMuted, marginTop: 2 },
  carouselRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  carouselRatingText: { fontSize: 9, fontWeight: '700', color: COLORS.textDark },

  /* CONTRACTORS */
  contractorCard: {
    width: 130,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  contractorAvatar: { width: 44, height: 44, borderRadius: 22 },
  contractorName: { fontSize: 11, fontWeight: '700', color: COLORS.textDark, marginTop: 6, textAlign: 'center' },
  contractorRating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  contractorRatingText: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  contractorPrice: { fontSize: 10, fontWeight: '700', color: COLORS.green, marginTop: 6 },
  hireBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  hireBtnText: { color: COLORS.white, fontSize: 9, fontWeight: '700' },

  /* BOTTOM FLOATING BAR */
  bottomBarActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  similarBtn: {
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
  similarBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  contactDesignerBtn: {
    flex: 1.4,
    height: 44,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDesignerBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
});
