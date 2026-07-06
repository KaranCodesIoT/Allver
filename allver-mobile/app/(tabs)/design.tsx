import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Dimensions, FlatList, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../../constants/Config';
import NotificationBell from '../../components/NotificationBell';
import { useTranslation } from '../../utils/i18n';
import SocketService from '../../utils/SocketService';

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
  orange: '#F97316',
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
  description?: string;
  quotation?: any;
  price?: number;
  likedBy?: string[];
}

const DESIGN_DATA: DesignItem[] = [];

const mapBackendPostToDesign = (bp: any): DesignItem => {
  let itemPrice = 1800000; // default to 18L
  if (bp.quotation?.totalCost) {
    itemPrice = bp.quotation.totalCost;
  } else if (bp.title?.toLowerCase().includes('bedroom')) {
    itemPrice = 350000;
  } else if (bp.title?.toLowerCase().includes('kitchen')) {
    itemPrice = 480000;
  }

  return {
    id: bp._id,
    title: bp.title || 'Modern Design Concept',
    location: bp.creator?.city || 'Mumbai, Maharashtra',
    image: bp.mediaUrls && bp.mediaUrls.length > 0 ? bp.mediaUrls[0] : 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    likes: bp.likes || 0,
    comments: bp.comments || 0,
    rating: bp.creator?.rating || 4.8,
    authorName: bp.creator?.fullName || 'Ar. Neha Sharma',
    authorAvatar: bp.creator?.avatarUrl || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    authorId: bp.creator?._id || '1',
    authorCover: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    authorFirm: bp.creator?.firmName || 'Design Space Architects',
    authorExperience: bp.creator?.experience || '8+ Years',
    authorProjects: bp.creator?.projects || '120',
    authorFollowers: '256',
    authorPhone: bp.creator?.phoneNumber || '+91 98765 43210',
    authorReviews: '124',
    imagesList: bp.mediaUrls && bp.mediaUrls.length > 0 ? bp.mediaUrls : ['https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80'],
    description: bp.description || '',
    quotation: bp.quotation || null,
    price: itemPrice,
    likedBy: bp.likedBy || [],
  };
};

export default function DesignScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [designs, setDesigns] = useState<DesignItem[]>(DESIGN_DATA);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [savedDesignIds, setSavedDesignIds] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceModalVisible, setPriceModalVisible] = useState(false);

  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        user = JSON.parse(stored);
      }
    }
    setCurrentUser(user);
  }, []);

  const fetchSavedDesigns = async (userId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/saved-designs/${userId}`);
      if (res.ok) {
        const data = await res.json();
        const list = data.savedDesigns || [];
        const ids = list.map((d: any) => d._id || d);
        setSavedDesignIds(ids);
      }
    } catch (err) {
      console.error('Error fetching saved designs list:', err);
    }
  };

  useEffect(() => {
    const fetchLiveDesigns = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/posts/design`);
        if (response.ok) {
          const data = await response.json();
          const mapped = data.designs.map(mapBackendPostToDesign);
          setDesigns([...mapped, ...DESIGN_DATA]);
        }
      } catch (err) {
        console.error('Error fetching live designs:', err);
      }
    };
    fetchLiveDesigns();
    if (currentUser) {
      fetchSavedDesigns(currentUser._id);
    }
  }, [currentUser]);

  // Real-time synchronization via global socket for new posts and updates
  useEffect(() => {
    const handleNewPost = (newPost: any) => {
      if (!newPost || !newPost._id || newPost.type !== 'design') return;
      console.log('[DesignFeed] New design post received via socket:', newPost._id);
      setDesigns((prevDesigns) => {
        if (prevDesigns.some((d) => d.id === newPost._id)) return prevDesigns;
        const mapped = mapBackendPostToDesign(newPost);
        return [mapped, ...prevDesigns];
      });
    };

    const handlePostUpdated = (data: any) => {
      if (!data || !data.postId) return;
      console.log('[DesignFeed] Design post updated via socket:', data);
      setDesigns((prevDesigns) =>
        prevDesigns.map((design) => {
          if (design.id === data.postId) {
            return {
              ...design,
              likes: data.likes ?? design.likes,
              comments: data.comments ?? design.comments,
              likedBy: data.likedBy || design.likedBy,
            };
          }
          return design;
        })
      );
    };

    const handlePostEdited = (editedPost: any) => {
      if (!editedPost || !editedPost._id || editedPost.type !== 'design') return;
      console.log('[DesignFeed] Design post edited via socket:', editedPost._id);
      setDesigns((prevDesigns) =>
        prevDesigns.map((design) => {
          if (design.id === editedPost._id) {
            return mapBackendPostToDesign(editedPost);
          }
          return design;
        })
      );
    };

    const handlePostDeleted = (data: any) => {
      if (!data || !data.postId) return;
      console.log('[DesignFeed] Design post deleted via socket:', data.postId);
      setDesigns((prevDesigns) => prevDesigns.filter((d) => d.id !== data.postId));
    };

    const handleReconnect = () => {
      console.log('[DesignFeed] Socket reconnected. Re-fetching designs...');
      fetch(`${BACKEND_URL}/api/posts/design`)
        .then(res => res.json())
        .then(data => {
          if (data && data.designs) {
            const mapped = data.designs.map(mapBackendPostToDesign);
            setDesigns([...mapped, ...DESIGN_DATA]);
          }
        })
        .catch(err => console.error('Error re-fetching designs on reconnect:', err));
    };

    SocketService.on('new_post', handleNewPost);
    SocketService.on('post_updated', handlePostUpdated);
    SocketService.on('post_edited', handlePostEdited);
    SocketService.on('post_deleted', handlePostDeleted);
    SocketService.on('connect', handleReconnect);

    return () => {
      SocketService.off('new_post', handleNewPost);
      SocketService.off('post_updated', handlePostUpdated);
      SocketService.off('post_edited', handlePostEdited);
      SocketService.off('post_deleted', handlePostDeleted);
      SocketService.off('connect', handleReconnect);
    };
  }, []);

  const handleToggleSaved = () => {
    if (!currentUser) {
      alert('Please log in to view saved designs.');
      return;
    }
    const nextVal = !showSavedOnly;
    setShowSavedOnly(nextVal);
    if (nextVal) {
      fetchSavedDesigns(currentUser._id);
    }
  };

  const filteredDesigns = designs.filter(item => {
    const matchesSearch = searchQuery.trim() === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSaved = !showSavedOnly || savedDesignIds.includes(item.id);
    
    // Category match
    const matchesCategory = selectedCategory === 'All' || 
      item.title.toLowerCase().includes(selectedCategory.toLowerCase()) || 
      (item.description && item.description.toLowerCase().includes(selectedCategory.toLowerCase()));
      
    // Price match
    let matchesPrice = true;
    if (selectedPrice === 'Under ₹5L') {
      matchesPrice = (item.price || 0) < 500000;
    } else if (selectedPrice === '₹5L - ₹15L') {
      matchesPrice = (item.price || 0) >= 500000 && (item.price || 0) <= 1500000;
    } else if (selectedPrice === 'Over ₹15L') {
      matchesPrice = (item.price || 0) > 1500000;
    }

    return matchesSearch && matchesSaved && matchesCategory && matchesPrice;
  });

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
        description: item.description || '',
        quotation: item.quotation ? JSON.stringify(item.quotation) : '',
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

  const handleLikePress = async (e: any, postId: string) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    const userId = currentUser?.role === 'Labour' ? (global as any).currentUser?._id : currentUser?._id;
    const finalUserId = userId || 'default-user-id';

    // 1. Optimistic UI update
    setDesigns((prev) =>
      prev.map((d) => {
        if (d.id !== postId) return d;

        const likedBy = d.likedBy || [];
        const isLiked = likedBy.includes(finalUserId);
        const nextLikedBy = isLiked 
          ? likedBy.filter((uid) => uid !== finalUserId)
          : [...likedBy, finalUserId];

        return {
          ...d,
          likedBy: nextLikedBy,
          likes: nextLikedBy.length
        };
      })
    );

    // 2. Network Request
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: finalUserId })
      });
      if (res.ok) {
        const data = await res.json();
        // Sync with exact server count and liked list
        setDesigns((prev) =>
          prev.map((d) => {
            if (d.id !== postId) return d;
            return {
              ...d,
              likes: typeof data.likes === 'number' ? data.likes : d.likes,
              likedBy: Array.isArray(data.likedBy) ? data.likedBy : d.likedBy
            };
          })
        );
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
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
              {(() => {
                const userId = currentUser?.role === 'Labour' ? (global as any).currentUser?._id : currentUser?._id;
                const finalUserId = userId || 'default-user-id';
                const isLiked = item.likedBy && item.likedBy.includes(finalUserId);
                return (
                  <TouchableOpacity 
                    style={styles.statItem} 
                    activeOpacity={0.7} 
                    onPress={(e) => handleLikePress(e, item.id)}
                  >
                    <Feather 
                      name="heart" 
                      size={14} 
                      color={isLiked ? COLORS.orange : COLORS.textMuted} 
                      style={isLiked ? { fill: COLORS.orange } : undefined}
                    />
                    <Text style={[styles.statValueText, isLiked && { color: COLORS.orange, fontWeight: '700' }]}>
                      {item.likes}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
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
        <Text style={styles.headerTitle}>{t('design')}</Text>
        <NotificationBell size={18} color={COLORS.textDark} style={styles.notificationBtn} />
      </View>

      <FlatList
        data={filteredDesigns}
        keyExtractor={(item, index) => (item.id || `design_${index}`) + `_${index}`}
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
                {t('designBanner')}
              </Text>
            </View>

            {/* Filter Dropdowns / Search */}
            <View style={styles.filtersContainer}>
              {/* Search Row */}
              <View style={styles.searchBarRow}>
                <View style={styles.searchBarContainer}>
                  <Feather name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={t('designSearchPlaceholder')}
                    placeholderTextColor={COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                      <Feather name="x" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Saved Designs Toggle Button */}
                <TouchableOpacity 
                  style={[
                    styles.savedFilterBtn, 
                    showSavedOnly && { backgroundColor: COLORS.greenLight, borderColor: COLORS.green }
                  ]}
                  onPress={handleToggleSaved}
                  activeOpacity={0.7}
                >
                  <Feather 
                    name="bookmark" 
                    size={16} 
                    color={showSavedOnly ? COLORS.green : COLORS.textDark} 
                    style={showSavedOnly && { fill: COLORS.green }} 
                  />
                </TouchableOpacity>
              </View>

              {/* Filter Scroll Row */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.filterPillsScroll}
              >
                {/* Price range selector dropdown pill */}
                <TouchableOpacity 
                  style={[
                    styles.filterPillBtn,
                    selectedPrice !== 'All' && { backgroundColor: COLORS.greenLight, borderColor: COLORS.green }
                  ]}
                  activeOpacity={0.8}
                   onPress={() => setPriceModalVisible(true)}
                >
                  <Feather name="tag" size={13} color={selectedPrice !== 'All' ? COLORS.green : COLORS.textDark} style={{ marginRight: 4 }} />
                  <Text style={[styles.filterPillText, selectedPrice !== 'All' && { color: COLORS.green, fontWeight: '700' }]}>
                    {selectedPrice === 'All' ? t('priceRange') : selectedPrice}
                  </Text>
                  <Feather name="chevron-down" size={12} color={selectedPrice !== 'All' ? COLORS.green : COLORS.textMuted} style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                {/* Categories filter pills */}
                {['All', 'Apartment', 'Bedroom', 'Kitchen', 'Living Room'].map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const labelMap: Record<string, string> = {
                    'All': t('all'),
                    'Apartment': t('apartment'),
                    'Bedroom': t('bedroom'),
                    'Kitchen': t('kitchen'),
                    'Living Room': t('livingRoom'),
                  };
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryPill,
                        isSelected && { backgroundColor: COLORS.green, borderColor: COLORS.green }
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.categoryPillText, isSelected && { color: COLORS.white, fontWeight: '700' }]}>
                        {labelMap[cat] || cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </>
        }
      />

      {/* Price Range Selector Modal */}
      <Modal
        visible={priceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPriceModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setPriceModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('selectPriceRange')}</Text>
            <View style={styles.modalDivider} />
            
            {['All', 'Under ₹5L', '₹5L - ₹15L', 'Over ₹15L'].map((priceOption) => {
              const isSelected = selectedPrice === priceOption;
              const priceLabels: Record<string, string> = {
                'All': t('allPrices'),
                'Under ₹5L': t('under5L'),
                '₹5L - ₹15L': t('between5LAnd15L'),
                'Over ₹15L': t('over15L')
              };
              return (
                <TouchableOpacity
                  key={priceOption}
                  style={[styles.modalOption, isSelected && { backgroundColor: COLORS.greenLight }]}
                  activeOpacity={0.7}
                  onPress={() => {
                    setSelectedPrice(priceOption);
                    setPriceModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, isSelected && { color: COLORS.green, fontWeight: '700' }]}>
                    {priceLabels[priceOption] || priceOption}
                  </Text>
                  {isSelected && (
                    <Feather name="check" size={16} color={COLORS.green} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
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
  filtersContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textDark, padding: 0 },
  savedFilterBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillsScroll: {
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  filterPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    height: 32,
  },
  filterPillText: {
    fontSize: 12,
    color: COLORS.textDark,
  },
  categoryPill: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillText: {
    fontSize: 12,
    color: COLORS.textDark,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  modalOptionText: {
    fontSize: 14,
    color: COLORS.textDark,
  },

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
