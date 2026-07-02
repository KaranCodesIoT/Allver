import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Alert, Modal, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { BACKEND_URL, resolveAvatarUrl } from '../../constants/Config';
import NotificationBell from '../../components/NotificationBell';
import { useTranslation } from '../../utils/i18n';

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

interface CommentData {
  user?: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

interface PostData {
  id: string;
  creator: {
    id?: string;
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
  commentsList?: CommentData[];
}

const INITIAL_POSTS: PostData[] = [];

const mapBackendPostToFeed = (bp: any, currentUserId?: string): PostData => {
  return {
    id: bp._id,
    creator: {
      id: bp.creator?._id || bp.creator,
      name: bp.creator?.fullName || 'Ar. Neha Sharma',
      role: bp.creator?.role || 'Architect',
      avatar: resolveAvatarUrl(bp.creator?.avatarUrl) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      location: bp.creator?.city || 'Mumbai',
      isVerified: true,
    },
    timeAgo: 'Just now',
    bodyText: bp.description,
    images: bp.mediaUrls && bp.mediaUrls.length > 0 ? bp.mediaUrls.map((url: string) => resolveAvatarUrl(url)) : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80'],
    likes: bp.likes || 0,
    comments: bp.comments || 0,
    hasLiked: currentUserId && bp.likedBy ? bp.likedBy.some((id: any) => id.toString() === currentUserId.toString()) : false,
    commentsList: bp.commentsList || [],
  };
};

export default function DiscoverScreen() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('All');
  const [posts, setPosts] = useState<PostData[]>(INITIAL_POSTS);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [expandedPostIds, setExpandedPostIds] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeVideoPostId, setActiveVideoPostId] = useState<string | null>(null);
  const postLayouts = React.useRef<{ [postId: string]: { y: number, height: number } }>({});
  const viewportHeight = Dimensions.get('window').height;
  
  // Edit post states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingPost, setEditingPost] = useState<PostData | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);

  // Comment states
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedCommentPost, setSelectedCommentPost] = useState<PostData | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { user = JSON.parse(stored); } catch (e) {}
      }
    }
    setCurrentUser(user);
  }, []);

  const handleMenuPress = (post: PostData) => {
    const currentUserIdStr = currentUser?._id?.toString() || currentUser?.id?.toString();
    const creatorIdStr = post.creator.id?.toString() || post.creator._id?.toString();
    const isOwn = currentUserIdStr && creatorIdStr && (currentUserIdStr === creatorIdStr);
    
    if (!isOwn) {
      Alert.alert('Post Options', 'Select an action:', [
        { text: 'Hide Post', onPress: () => Alert.alert('Success', 'Post hidden from feed.') },
        { text: 'Report Post', onPress: () => Alert.alert('Success', 'Post reported for review.') },
        { text: 'Cancel', style: 'cancel' }
      ]);
      return;
    }

    Alert.alert('Manage Post', 'Select an action:', [
      { 
        text: 'Edit Post Description', 
        onPress: () => {
          setEditingPost(post);
          setEditDescription(post.bodyText);
          setEditModalVisible(true);
        } 
      },
      { 
        text: 'Delete Post', 
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this post? This action cannot be undone.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => confirmDeletePost(post.id) }
            ]
          );
        }
      },
      { text: 'Cancel', style: 'cancel' }
    ]);
  };

  const confirmDeletePost = async (postId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${postId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        Alert.alert('Success', 'Post deleted successfully.');
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to delete post.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error. Failed to delete post.');
    }
  };

  const submitEditPost = async () => {
    if (!editingPost || !editDescription.trim()) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editDescription.trim() })
      });
      if (res.ok) {
        setPosts(prev => prev.map(p => {
          if (p.id === editingPost.id) {
            return { ...p, bodyText: editDescription.trim() };
          }
          return p;
        }));
        setEditModalVisible(false);
        setEditingPost(null);
        Alert.alert('Success', 'Post updated successfully.');
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to update post.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error. Failed to update post.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  const fetchLivePosts = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/posts/feed`);
      if (response.ok) {
        const data = await response.json();
        
        let user = currentUser;
        if (!user) {
          user = (global as any).currentUser;
          if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
              try { user = JSON.parse(stored); } catch (e) {}
            }
          }
        }

        const mapped = data.posts.map((p: any) => mapBackendPostToFeed(p, user?._id));
        setPosts([...mapped, ...INITIAL_POSTS]);
      }
    } catch (err) {
      console.error('Error fetching live posts:', err);
    }
  };

  useEffect(() => {
    if (isFocused) {
      let user = (global as any).currentUser;
      if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          try { user = JSON.parse(stored); } catch (e) {}
        }
      }
      setCurrentUser(user);
      fetchLivePosts();
    }
  }, [isFocused]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLivePosts();
    setRefreshing(false);
  };

  const handleScroll = (event: any) => {
    const y = event?.nativeEvent?.contentOffset?.y || 0;
    const viewportTop = y;
    const viewportBottom = y + viewportHeight;

    let maxVisibleArea = 0;
    let activeId: string | null = null;

    for (const id of Object.keys(postLayouts.current)) {
      const layout = postLayouts.current[id];
      if (!layout) continue;

      const postTop = layout.y;
      const postBottom = layout.y + layout.height;

      const overlapTop = Math.max(viewportTop, postTop);
      const overlapBottom = Math.min(viewportBottom, postBottom);
      const overlapHeight = overlapBottom - overlapTop;

      if (overlapHeight > 0) {
        if (overlapHeight > maxVisibleArea) {
          maxVisibleArea = overlapHeight;
          activeId = id;
        }
      }
    }

    if (activeId !== activeVideoPostId) {
      setActiveVideoPostId(activeId);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      handleScroll({ nativeEvent: { contentOffset: { y: 0 } } });
    }, 600);
  }, [posts]);

  const handleExpandPost = (postId: string) => {
    setExpandedPostIds(prev => [...prev, postId]);
  };

  const handleAppreciate = async (id: string) => {
    if (!currentUser?._id) {
      Alert.alert('Login Required', 'Please log in to appreciate posts.');
      return;
    }

    // Optimistically update UI state
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

    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id })
      });
      if (!res.ok) {
        // Rollback on failure
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
        const err = await res.json();
        console.error('Failed to like post:', err.message || err);
      }
    } catch (error) {
      console.error('Network error liking post:', error);
      // Rollback on network error
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
    }
  };

  const handleCommentPress = (post: PostData) => {
    setSelectedCommentPost(post);
    setNewCommentText('');
    setCommentModalVisible(true);
  };

  const submitComment = async () => {
    if (!newCommentText.trim() || !selectedCommentPost) return;
    if (!currentUser?._id) {
      Alert.alert('Login Required', 'Please log in to add comments.');
      return;
    }

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/posts/${selectedCommentPost.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id,
          userName: currentUser.fullName || 'User',
          userAvatar: currentUser.avatarUrl || '',
          text: newCommentText.trim()
        })
      });

      if (res.ok) {
        const addedComment: CommentData = {
          user: currentUser._id,
          userName: currentUser.fullName || 'User',
          userAvatar: currentUser.avatarUrl || '',
          text: newCommentText.trim(),
          createdAt: new Date().toISOString()
        };

        // Update posts feed list
        setPosts(prev =>
          prev.map(post => {
            if (post.id === selectedCommentPost.id) {
              const updatedCommentsList = [...(post.commentsList || []), addedComment];
              return {
                ...post,
                comments: updatedCommentsList.length,
                commentsList: updatedCommentsList
               };
            }
            return post;
          })
        );

        // Update modal selected post view
        setSelectedCommentPost(prev => {
          if (!prev) return null;
          return {
            ...prev,
            comments: (prev.comments || 0) + 1,
            commentsList: [...(prev.commentsList || []), addedComment]
          };
        });

        setNewCommentText('');
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to add comment.');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      Alert.alert('Error', 'Network error. Failed to add comment.');
    } finally {
      setIsSubmittingComment(false);
    }
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

  // Filter posts by role & location
  const filteredPosts = posts.filter(post => {
    let matchesRole = true;
    if (activeCategory === 'Architecture') {
      matchesRole = post.creator.role === 'Architect';
    } else if (activeCategory === 'Contractor') {
      matchesRole = post.creator.role === 'Contractor';
    } else if (activeCategory !== 'All') {
      matchesRole = post.creator.role === activeCategory;
    }

    let matchesLocation = true;
    if (locationFilter.trim()) {
      const city = (post.creator.location || '').toLowerCase();
      matchesLocation = city.includes(locationFilter.trim().toLowerCase());
    }

    return matchesRole && matchesLocation;
  });

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    return /\.(mp4|mov|m4v|3gp|avi|webm|mkv)/i.test(url) || url.includes('/video/') || url.includes('video') || url.includes('mp4');
  };

  const renderMediaItem = (uri: string, style: any, postId?: string) => {
    const isVideo = isVideoUrl(uri);
    if (isVideo) {
      const shouldPlay = isFocused && postId && activeVideoPostId === postId;
      return (
        <View style={[style, { overflow: 'hidden', position: 'relative' }]}>
          <Video
            source={{ uri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode={ResizeMode.COVER}
            shouldPlay={shouldPlay}
            isMuted={true}
            status={{
              shouldPlay: shouldPlay,
              positionMillis: 100
            }}
            useNativeControls={false}
            isLooping={true}
          />
          <TouchableOpacity 
            style={{ 
              ...StyleSheet.absoluteFillObject, 
              backgroundColor: shouldPlay ? 'transparent' : 'rgba(0,0,0,0.15)', 
              justifyContent: 'center', 
              alignItems: 'center' 
            }}
            activeOpacity={0.8}
            onPress={() => setFullscreenMedia({ type: 'video', url: uri })}
          >
            {!shouldPlay && <Feather name="play" size={24} color={COLORS.white} />}
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity 
        style={style} 
        activeOpacity={0.9} 
        onPress={() => setFullscreenMedia({ type: 'image', url: uri })}
      >
        <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      </TouchableOpacity>
    );
  };

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
            <React.Fragment key={index}>
              {renderMediaItem(img, styles.scrollImageItem, postId)}
            </React.Fragment>
          ))}
        </ScrollView>
      );
    }

    if (images.length === 1) {
      return (
        <View style={styles.imageGrid}>
          {renderMediaItem(images[0], styles.singleImage, postId)}
        </View>
      );
    }

    if (images.length === 2) {
      return (
        <View style={styles.imageGrid}>
          {renderMediaItem(images[0], styles.doubleImage, postId)}
          {renderMediaItem(images[1], styles.doubleImage, postId)}
        </View>
      );
    }

    // Horizontal layout for 3 or more images, with a +more overlay on the second image
    return (
      <View style={styles.imageGrid}>
        {renderMediaItem(images[0], styles.doubleImage, postId)}
        <TouchableOpacity 
          style={styles.moreImageContainer}
          activeOpacity={0.8}
          onPress={() => handleExpandPost(postId)}
        >
          {renderMediaItem(images[1], StyleSheet.absoluteFillObject, postId)}
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
        <TouchableOpacity 
          style={[
            styles.filterBtn, 
            locationFilter ? { backgroundColor: '#E6F4EA', borderColor: COLORS.green } : null
          ]} 
          activeOpacity={0.7}
          onPress={() => setLocationModalVisible(true)}
        >
          <Feather 
            name="sliders" 
            size={16} 
            color={locationFilter ? COLORS.green : COLORS.textDark} 
          />
          {locationFilter ? (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#EF4444'
            }} />
          ) : null}
        </TouchableOpacity>
      </View>

      {/* ================= FEED SCROLLVIEW ================= */}
       <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[COLORS.green]} 
            tintColor={COLORS.green}
          />
        }
      >
        {/* Subheading */}
        <Text style={styles.subHeadingText}>{t('followPostsSubheading')}</Text>

        {/* Posts List */}
        {filteredPosts.map(post => (
          <View 
            key={post.id} 
            style={styles.postCard}
            onLayout={(event) => {
              const { y, height } = event.nativeEvent.layout;
              postLayouts.current[post.id] = { y, height };
            }}
          >
            
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
              <TouchableOpacity 
                style={styles.menuBtn} 
                activeOpacity={0.7}
                onPress={() => handleMenuPress(post)}
              >
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
                <Text style={styles.likesText}>{post.likes} {t('appreciations')}</Text>
              </View>
              <Text style={styles.commentsText}>{post.comments} {t('comments')}</Text>
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
                  {t('appreciate')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionBtn} 
                activeOpacity={0.7}
                onPress={() => handleCommentPress(post)}
              >
                <Feather name="message-square" size={15} color={COLORS.textMuted} />
                <Text style={styles.actionBtnText}>{t('comment')}</Text>
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
                  {post.hasConnected ? t('connected') : t('network')}
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
                  {post.hasSaved ? t('saved') : t('save')}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        ))}

        {filteredPosts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Feather name="alert-circle" size={40} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyText}>{t('noPostsCategory')}</Text>
          </View>
        )}
      </ScrollView>

      {/* ================= EDIT POST DESCRIPTION MODAL ================= */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20
        }}>
          <View style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: COLORS.white,
            borderRadius: 20,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textDark }}>Edit Post</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textMuted, marginBottom: 8 }}>
              POST DESCRIPTION
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                color: COLORS.textDark,
                height: 120,
                textAlignVertical: 'top',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#E5E7EB'
              }}
              placeholder="What's on your mind?"
              placeholderTextColor="#9CA3AF"
              multiline
              value={editDescription}
              onChangeText={setEditDescription}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#F3F4F6',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={{ color: COLORS.textDark, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: COLORS.green,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={submitEditPost}
                disabled={isSavingEdit || !editDescription.trim()}
              >
                <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= FULLSCREEN MEDIA VIEWER MODAL ================= */}
      <Modal
        visible={!!fullscreenMedia}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenMedia(null)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}>
          {/* Close Button */}
          <TouchableOpacity 
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 60 : 40,
              right: 20,
              zIndex: 10,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onPress={() => setFullscreenMedia(null)}
          >
            <Feather name="x" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {fullscreenMedia?.type === 'video' ? (
            <Video
              source={{ uri: fullscreenMedia.url }}
              style={{
                width: width,
                height: width * 1.3, // 3:4 aspect ratio standard
                maxHeight: '80%'
              }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              useNativeControls={true}
              isLooping={true}
            />
          ) : (
            <Image
              source={{ uri: fullscreenMedia?.url }}
              style={{
                width: width,
                height: width * 1.3,
                maxHeight: '80%'
              }}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>

      {/* ================= LOCATION FILTER MODAL ================= */}
      <Modal
        visible={locationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            width: '85%',
            backgroundColor: COLORS.white,
            borderRadius: 16,
            padding: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 5,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 }}>
              {t('filterByLocation')}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>
              {t('filterLocationDesc')}
            </Text>

            <TextInput
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 14,
                color: COLORS.textDark,
                backgroundColor: '#F9FAFB',
                marginBottom: 20,
              }}
              placeholder={t('filterLocationPlaceholder')}
              placeholderTextColor="#9CA3AF"
              value={locationInput}
              onChangeText={setLocationInput}
              autoFocus={true}
            />

            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#F3F4F6',
                }}
                onPress={() => {
                  setLocationInput(locationFilter);
                  setLocationModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMuted }}>
                  {t('cancel')}
                </Text>
              </TouchableOpacity>

              {locationFilter ? (
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: '#FEE2E2',
                  }}
                  onPress={() => {
                    setLocationInput('');
                    setLocationFilter('');
                    setLocationModalVisible(false);
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>
                    {t('clear')}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: COLORS.green,
                }}
                onPress={() => {
                  setLocationFilter(locationInput);
                  setLocationModalVisible(false);
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.white }}>
                  {t('apply')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= COMMENTS MODAL ================= */}
      <Modal
        visible={commentModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'flex-end'
        }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: '75%',
            paddingBottom: Platform.OS === 'ios' ? 24 : 12
          }}>
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6'
            }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textDark }}>
                {t('comments')} ({selectedCommentPost?.commentsList?.length || 0})
              </Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                <Feather name="x" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <ScrollView 
              style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}
              contentContainerStyle={{ paddingBottom: 24 }}
            >
              {selectedCommentPost?.commentsList && selectedCommentPost.commentsList.length > 0 ? (
                selectedCommentPost.commentsList.map((comment, index) => (
                  <View key={index} style={{ flexDirection: 'row', marginBottom: 16 }}>
                    <Image 
                      source={{ uri: resolveAvatarUrl(comment.userAvatar) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }} 
                      style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }} 
                      contentFit="cover" 
                    />
                    <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 }}>
                        {comment.userName}
                      </Text>
                      <Text style={{ fontSize: 13, color: COLORS.textDark }}>
                        {comment.text}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 }}>
                  <Feather name="message-square" size={36} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
                  <Text style={{ fontSize: 14, color: COLORS.textMuted, textAlign: 'center' }}>
                    {t('noCommentsYet')}
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Bottom Input Area */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderTopWidth: 1,
              borderTopColor: '#F3F4F6',
              backgroundColor: COLORS.white
            }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  fontSize: 14,
                  color: COLORS.textDark,
                  maxHeight: 100
                }}
                placeholder={t('writeCommentPlaceholder')}
                placeholderTextColor="#9CA3AF"
                multiline
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity 
                style={{
                  marginLeft: 12,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: newCommentText.trim() ? COLORS.green : '#E5E7EB',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                disabled={!newCommentText.trim() || isSubmittingComment}
                onPress={submitComment}
              >
                <Feather 
                  name={isSubmittingComment ? 'loader' : 'send'} 
                  size={16} 
                  color={COLORS.white} 
                />
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
