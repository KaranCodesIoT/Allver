import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BACKEND_URL } from '../../constants/Config';
import NotificationBell from '../../components/NotificationBell';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#10B981', // Selected filter / active state
  teal: '#0F766E', // Green/Teal accent
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F9FAFB',
  blue: '#3B82F6', // Blue like badge
};

const CATEGORIES = [
  { name: 'All' },
  { name: 'Architecture' },
  { name: 'Contractor' },
];

interface PostData {
  id: string;
  creator: {
    name: string;
    role: string;
    avatar: string;
    location: string;
    isVerified?: boolean;
  };
  timeAgo: string;
  bodyText: string;
  images: string[];
  likes: number;
  comments: number;
  hasLiked?: boolean;
  hasSaved?: boolean;
  hasConnected?: boolean;
}

const INITIAL_POSTS: PostData[] = [
  {
    id: 'p1',
    creator: {
      name: 'Ar. Neha Sharma',
      role: 'Architect',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      location: 'Mumbai',
      isVerified: true,
    },
    timeAgo: '2h ago',
    bodyText: 'A modern minimal home design with natural light 🌿\nThoughts on this facade?',
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=600&q=80',
    ],
    likes: 128,
    comments: 12,
    hasLiked: true,
  },
  {
    id: 'p2',
    creator: {
      name: 'Rahul Verma',
      role: 'Contractor',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      location: 'Pune',
      isVerified: true,
    },
    timeAgo: '5h ago',
    bodyText: 'Casting in progress for the new commercial villa project. Making sure every mix is perfect! 🏗️🔩',
    images: [
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
    ],
    likes: 45,
    comments: 3,
  },
  {
    id: 'p3',
    creator: {
      name: 'Priya Mishra',
      role: 'Architect',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      location: 'Bengaluru',
      isVerified: true,
    },
    timeAgo: '1d ago',
    bodyText: 'Just finalized the master bedroom layout for our duplex client in Indiranagar. Loving the warm tones! ✨🛏️',
    images: [
      'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
    ],
    likes: 82,
    comments: 7,
  },
];

const mapBackendPostToFeed = (bp: any): PostData => {
  return {
    id: bp._id,
    creator: {
      name: bp.creator?.fullName || 'Ar. Neha Sharma',
      role: bp.creator?.role || 'Architect',
      avatar: bp.creator?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      location: bp.creator?.city || 'Mumbai',
      isVerified: true,
    },
    timeAgo: 'Just now',
    bodyText: bp.description,
    images: bp.mediaUrls && bp.mediaUrls.length > 0 ? bp.mediaUrls : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'],
    likes: bp.likes || 0,
    comments: bp.comments || 0,
  };
};

export default function DiscoverScreen() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [posts, setPosts] = useState<PostData[]>(INITIAL_POSTS);
  const [expandedPostIds, setExpandedPostIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchLivePosts = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/posts/feed`);
        if (response.ok) {
          const data = await response.json();
          const mapped = data.posts.map(mapBackendPostToFeed);
          setPosts([...mapped, ...INITIAL_POSTS]);
        }
      } catch (err) {
        console.error('Error fetching live posts:', err);
      }
    };
    fetchLivePosts();
  }, []);

  const handleExpandPost = (postId: string) => {
    setExpandedPostIds(prev => [...prev, postId]);
  };

  const handleAppreciate = (id: string) => {
    setPosts(prev =>
      prev.map(post => {
        if (post.id === id) {
          const newState = !post.hasLiked;
          return {
            ...post,
            hasLiked: newState,
            likes: newState ? post.likes + 1 : post.likes - 1,
          };
        }
        return post;
      })
    );
  };

  const handleConnect = (id: string) => {
    setPosts(prev =>
      prev.map(post => {
        if (post.id === id) {
          return {
            ...post,
            hasConnected: !post.hasConnected,
          };
        }
        return post;
      })
    );
  };

  const handleSave = (id: string) => {
    setPosts(prev =>
      prev.map(post => {
        if (post.id === id) {
          return {
            ...post,
            hasSaved: !post.hasSaved,
          };
        }
        return post;
      })
    );
  };

  // Filter posts by role
  const filteredPosts = posts.filter(post => {
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Architecture') {
      return post.creator.role === 'Architect';
    }
    if (activeCategory === 'Contractor') {
      return post.creator.role === 'Contractor';
    }
    return post.creator.role === activeCategory;
  });

  const renderImageGrid = (images: string[], postId: string) => {
    if (images.length === 0) return null;

    const isExpanded = expandedPostIds.includes(postId);

    if (isExpanded) {
      return (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.scrollableContainer}
          contentContainerStyle={styles.scrollableContent}
        >
          {images.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.scrollImageItem} contentFit="cover" />
          ))}
        </ScrollView>
      );
    }

    if (images.length === 1) {
      return (
        <View style={styles.imageGrid}>
          <Image source={{ uri: images[0] }} style={styles.singleImage} contentFit="cover" />
        </View>
      );
    }

    if (images.length === 2) {
      return (
        <View style={styles.imageGrid}>
          <Image source={{ uri: images[0] }} style={styles.doubleImage} contentFit="cover" />
          <Image source={{ uri: images[1] }} style={styles.doubleImage} contentFit="cover" />
        </View>
      );
    }

    // Horizontal layout for 3 or more images, with a +more overlay on the second image
    return (
      <View style={styles.imageGrid}>
        <Image source={{ uri: images[0] }} style={styles.doubleImage} contentFit="cover" />
        <TouchableOpacity 
          style={styles.moreImageContainer}
          activeOpacity={0.8}
          onPress={() => handleExpandPost(postId)}
        >
          <Image source={{ uri: images[1] }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
          <View style={styles.moreOverlay}>
            <Text style={styles.moreText}>+{images.length - 2} more</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        <NotificationBell size={22} color={COLORS.textDark} style={styles.bellBtn} />
      </View>

      {/* ================= FILTER CHIPS ROW ================= */}
      <View style={styles.filterSection}>
        <View style={styles.chipsContainer}>
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat.name;
            return (
              <TouchableOpacity
                key={cat.name}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategory(cat.name)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
          <Feather name="sliders" size={16} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>

      {/* ================= FEED SCROLLVIEW ================= */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Subheading */}
        <Text style={styles.subHeadingText}>Showing posts from people you follow</Text>

        {/* Posts List */}
        {filteredPosts.map(post => (
          <View key={post.id} style={styles.postCard}>
            
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <Image source={{ uri: post.creator.avatar }} style={styles.avatar} contentFit="cover" />
              <View style={styles.headerInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{post.creator.name}</Text>
                  {post.creator.isVerified && (
                    <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.green} style={styles.verifiedIcon} />
                  )}
                </View>
                <Text style={styles.profileMeta}>{post.creator.role} • {post.creator.location}</Text>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>{post.timeAgo} • </Text>
                  <Feather name="globe" size={11} color="#9CA3AF" />
                </View>
              </View>
              <TouchableOpacity style={styles.menuBtn} activeOpacity={0.7}>
                <Feather name="more-horizontal" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Post Body Text */}
            <Text style={styles.bodyText}>{post.bodyText}</Text>

            {/* Post Images Grid */}
            {renderImageGrid(post.images, post.id)}

            {/* Stats Summary Row */}
            <View style={styles.statsSummaryRow}>
              <View style={styles.likesCountWrap}>
                <View style={styles.likeBadge}>
                  <FontAwesome5 name="thumbs-up" size={9} color={COLORS.white} solid />
                </View>
                <Text style={styles.likesText}>{post.likes}</Text>
              </View>
              <Text style={styles.commentsText}>{post.comments} Comments</Text>
            </View>

            {/* Card Actions Row */}
            <View style={styles.cardDivider} />
            <View style={styles.actionsRow}>
              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => handleAppreciate(post.id)}
                activeOpacity={0.7}
              >
                <Feather 
                  name="thumbs-up" 
                  size={15} 
                  color={post.hasLiked ? COLORS.green : COLORS.textMuted} 
                />
                <Text style={[styles.actionBtnText, post.hasLiked && { color: COLORS.green, fontWeight: '700' }]}>
                  Appreciate
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
                <Feather name="message-square" size={15} color={COLORS.textMuted} />
                <Text style={styles.actionBtnText}>Comment</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => handleConnect(post.id)}
                activeOpacity={0.7}
              >
                <Feather 
                  name="user-plus" 
                  size={15} 
                  color={post.hasConnected ? COLORS.green : COLORS.textMuted} 
                />
                <Text style={[styles.actionBtnText, post.hasConnected && { color: COLORS.green, fontWeight: '700' }]}>
                  {post.hasConnected ? 'Connected' : 'Connect'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionBtn} 
                onPress={() => handleSave(post.id)}
                activeOpacity={0.7}
              >
                {post.hasSaved ? (
                  <FontAwesome5 name="bookmark" size={14} color={COLORS.green} solid />
                ) : (
                  <Feather name="bookmark" size={15} color={COLORS.textMuted} />
                )}
                <Text style={[styles.actionBtnText, post.hasSaved && { color: COLORS.green, fontWeight: '700' }]}>
                  {post.hasSaved ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        ))}

        {filteredPosts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Feather name="alert-circle" size={40} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>No posts available in this category.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Lighter soft background color matching mockup
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  
  /* HEADER */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  bellBtn: {
    position: 'relative',
    padding: 4,
  },
  bellDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },

  /* FILTER SECTION */
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  categoryChipActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },

  /* SUBHEADING */
  subHeadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 10,
  },

  /* POST CARD */
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  verifiedIcon: {
    marginLeft: 6,
  },
  profileMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  timeText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  menuBtn: {
    padding: 4,
  },
  bodyText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginTop: 12,
  },

  /* IMAGE GRID */
  imageGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  singleImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  doubleImage: {
    flex: 1,
    height: 120,
    borderRadius: 12,
  },
  gridImage: {
    flex: 1,
    height: 120,
    borderRadius: 12,
  },
  moreImageContainer: {
    position: 'relative',
    flex: 1,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  /* STATS SUMMARY ROW */
  statsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  likesCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likeBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.blue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likesText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  commentsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  /* CARD DIVIDER */
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },

  /* ACTIONS ROW */
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  actionBtnText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  scrollableContainer: {
    marginTop: 12,
    width: '100%',
  },
  scrollableContent: {
    gap: 8,
    paddingRight: 16,
  },
  scrollImageItem: {
    width: width * 0.72,
    height: 160,
    borderRadius: 12,
  },

  /* EMPTY STATE */
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
