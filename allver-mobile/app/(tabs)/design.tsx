import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Dimensions, FlatList, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

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
};

interface DesignItem {
  id: string;
  title: string;
  location: string;
  image: string;
  likes: number;
  comments: number;
  rating: number;
  authorName: string;
  authorAvatar: string;
  authorId: string;
  authorCover: string;
  authorFirm: string;
  authorExperience: string;
  authorProjects: string;
  authorFollowers: string;
  authorPhone: string;
  authorReviews: string;
  imagesList: string[];
}

const DESIGN_DATA: DesignItem[] = [
  {
    id: '1',
    title: 'Modern 2BHK Apartment',
    location: 'Mumbai, Maharashtra',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    likes: 128,
    comments: 24,
    rating: 4.8,
    authorName: 'Ar. Neha Sharma',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    authorId: '1',
    authorCover: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    authorFirm: 'Design Space Architects',
    authorExperience: '8+ Years',
    authorProjects: '120',
    authorFollowers: '256',
    authorPhone: '+91 98765 43210',
    authorReviews: '124',
    imagesList: [
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80',
    ]
  },
  {
    id: '2',
    title: 'Modern Bedroom Design',
    location: 'Pune, Maharashtra',
    image: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
    likes: 96,
    comments: 18,
    rating: 4.7,
    authorName: 'Ar. Rohit Mehta',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    authorId: '2',
    authorCover: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    authorFirm: 'RM Design Studios',
    authorExperience: '10+ Years',
    authorProjects: '96',
    authorFollowers: '189',
    authorPhone: '+91 98765 43211',
    authorReviews: '98',
    imagesList: [
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    ]
  },
  {
    id: '3',
    title: 'Minimal Kitchen Design',
    location: 'Bengaluru, Karnataka',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    likes: 142,
    comments: 32,
    rating: 4.9,
    authorName: 'Ar. Priya Nair',
    authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    authorId: '3',
    authorCover: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    authorFirm: 'Priya Nair & Associates',
    authorExperience: '6+ Years',
    authorProjects: '74',
    authorFollowers: '142',
    authorPhone: '+91 98765 43212',
    authorReviews: '156',
    imagesList: [
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    ]
  }
];

export default function DesignScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [designs, setDesigns] = useState<DesignItem[]>(DESIGN_DATA);

  const filteredDesigns = searchQuery.trim() === ''
    ? designs
    : designs.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.location.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleCardPress = (item: DesignItem) => {
    // Navigate to design-detail screen with design parameters
    router.push({
      pathname: '/design-detail',
      params: {
        id: item.id,
        title: item.title,
        location: item.location,
        image: item.image,
        likes: item.likes.toString(),
        comments: item.comments.toString(),
        rating: item.rating.toString(),
        
        // Architect details
        authorId: item.authorId,
        authorName: item.authorName,
        authorAvatar: item.authorAvatar,
        authorCover: item.authorCover,
        authorFirm: item.authorFirm,
        authorExperience: item.authorExperience,
        authorProjects: item.authorProjects,
        authorFollowers: item.authorFollowers,
        authorPhone: item.authorPhone,
        authorReviews: item.authorReviews,
        
        // Images array as comma-separated string
        imagesList: item.imagesList.join(','),
      }
    });
  };

  const handleAuthorPress = (e: any, item: DesignItem) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push({
      pathname: '/architect-detail',
      params: {
        id: item.authorId,
        name: item.authorName,
        avatar: item.authorAvatar,
        coverImage: item.authorCover,
        firmName: item.authorFirm,
        experience: item.authorExperience,
        projects: item.authorProjects,
        followers: item.authorFollowers,
        phone: item.authorPhone,
        reviews: item.authorReviews,
      }
    });
  };

  const renderDesignCard = ({ item }: { item: DesignItem }) => {
    return (
      <TouchableOpacity style={styles.designCard} activeOpacity={0.9} onPress={() => handleCardPress(item)}>
        <View style={styles.cardImageWrapper}>
          <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
          <View style={styles.photoCountBadge}>
            <Text style={styles.photoCountText}>1/{item.imagesList.length}</Text>
          </View>
        </View>

        <View style={styles.cardInfoSection}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardLoc}>
            <Feather name="map-pin" size={12} color={COLORS.textMuted} /> {item.location}
          </Text>

          <View style={styles.cardDivider} />

          <View style={styles.cardFooter}>
            <View style={styles.cardStatsCol}>
              <View style={styles.statItem}>
                <Feather name="heart" size={14} color={COLORS.textMuted} />
                <Text style={styles.statValueText}>{item.likes}</Text>
              </View>
              <View style={[styles.statItem, { marginLeft: 12 }]}>
                <Feather name="message-square" size={14} color={COLORS.textMuted} />
                <Text style={styles.statValueText}>{item.comments}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.authorBadge} 
              activeOpacity={0.7} 
              onPress={(e) => handleAuthorPress(e, item)}
            >
              <Image source={{ uri: item.authorAvatar }} style={styles.authorAvatar} contentFit="cover" />
              <Text style={styles.authorNameText} numberOfLines={1}>{item.authorName}</Text>
              <View style={styles.ratingBadge}>
                <Feather name="star" size={10} color={COLORS.gold} style={{ fill: COLORS.gold }} />
                <Text style={styles.ratingText}>{item.rating}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Design</Text>
        <TouchableOpacity style={styles.notificationBtn}>
          <Feather name="bell" size={18} color={COLORS.textDark} />
          <View style={styles.notificationBadge} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredDesigns}
        keyExtractor={(item) => item.id}
        renderItem={renderDesignCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Banner Block */}
            <View style={styles.bannerContainer}>
              <View style={styles.bannerIconBox}>
                <Feather name="info" size={18} color={COLORS.green} />
              </View>
              <Text style={styles.bannerText}>
                Good design is more than just looks – it's about comfort, function, and creating spaces that truly feel like home.
              </Text>
            </View>

            {/* Filter Dropdowns / Search */}
            <View style={styles.filtersWrapper}>
              <View style={styles.filterBox}>
                <Feather name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search design type"
                  placeholderTextColor={COLORS.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <Feather name="chevron-down" size={16} color={COLORS.textMuted} />
              </View>

              <View style={[styles.filterBox, { flex: 0.8 }]}>
                <Feather name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
                <Text style={styles.filterPlaceholderText}>Search price range</Text>
                <Feather name="chevron-down" size={16} color={COLORS.textMuted} />
              </View>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },

  /* HEADER */
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  notificationBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },

  listContent: { paddingBottom: 40 },

  /* BANNER */
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.green + '22',
  },
  bannerIconBox: { marginRight: 12 },
  bannerText: { flex: 1, color: COLORS.textDark, fontSize: 13, lineHeight: 18, fontWeight: '500' },

  /* FILTERS */
  filtersWrapper: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  filterBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textDark, padding: 0 },
  filterPlaceholderText: { flex: 1, fontSize: 13, color: COLORS.textMuted },

  /* DESIGN CARD */
  designCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardImageWrapper: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  cardImage: { width: '100%', height: '100%' },
  photoCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  photoCountText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },

  cardInfoSection: { padding: 16 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textDark, marginBottom: 4 },
  cardLoc: { fontSize: 12, color: COLORS.textMuted },
  cardDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardStatsCol: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValueText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  
  authorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    maxWidth: width * 0.45,
  },
  authorAvatar: { width: 20, height: 20, borderRadius: 10 },
  authorNameText: { fontSize: 11, fontWeight: '700', color: COLORS.textDark, marginHorizontal: 6, flexShrink: 1 },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    paddingLeft: 6,
  },
  ratingText: { fontSize: 10, fontWeight: '800', color: COLORS.textDark },
});
