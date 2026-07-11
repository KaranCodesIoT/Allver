import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Share, Modal, useWindowDimensions, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';

const { width } = Dimensions.get('window');

const COLORS = {
  orange: '#F59E0B',
  orangeLight: '#FFFBEB',
  navy: '#0F172A',
  white: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  bgLight: '#F8FAFC',
  bgCard: '#F1F5F9',
  border: '#E2E8F0',
  green: '#22C55E',
  greenLight: '#F0FDF4',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  purple: '#A855F7',
  purpleLight: '#F3E8FF',
};

// Project type to image mapping for portfolio highlights
const PROJECT_TYPE_IMAGES: Record<string, string> = {
  'Residential': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80',
  'Commercial': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80',
  'Interior': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80',
  'Renovation': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=300&q=80',
  'General': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80',
  'Electrical': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80',
  'Plumbing': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=300&q=80',
};

const TABS = ['All', 'Projects', 'Photos', 'Media', 'Certificates'];

export default function PortfolioHighlightsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('All');
  
  // User and portfolio state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);

  // Video Player state
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');

  // Fullscreen photo viewer state
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoTitle, setSelectedPhotoTitle] = useState<string>('');

  const handleOpenVideo = (videoUrl: string, title: string) => {
    setSelectedVideoUrl(videoUrl);
    setSelectedVideoTitle(title);
  };

  const handleCloseVideo = () => {
    setSelectedVideoUrl(null);
    setSelectedVideoTitle('');
  };

  const handleOpenPhoto = (photoUrl: string, title: string) => {
    setSelectedPhotoUrl(photoUrl);
    setSelectedPhotoTitle(title);
  };

  const handleClosePhoto = () => {
    setSelectedPhotoUrl(null);
    setSelectedPhotoTitle('');
  };

  // Edit highlight states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingHighlight, setEditingHighlight] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Comment & Like states
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Unified Media Viewer states
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerMediaList, setViewerMediaList] = useState<string[]>([]);
  const [viewerActiveIndex, setViewerActiveIndex] = useState(0);
  const [viewerTitle, setViewerTitle] = useState('');
  const viewerScrollRef = React.useRef<ScrollView>(null);

  const handleOpenViewer = (mediaUrls: string[], title: string, startIndex: number = 0) => {
    setViewerMediaList(mediaUrls);
    setViewerTitle(title);
    setViewerActiveIndex(startIndex);
    setViewerVisible(true);
    setTimeout(() => {
      viewerScrollRef.current?.scrollTo({ x: startIndex * width, animated: false });
    }, 100);
  };

  const handleLikePress = async (highlightId: string) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to like this highlight.');
      return;
    }

    const ownerId = userId || currentUser._id;
    
    // Optimistic UI update
    setPortfolioProjects(prev => prev.map(item => {
      if (item.id === highlightId) {
        const likedBy = [...(item.likedBy || [])];
        const idx = likedBy.indexOf(currentUser._id);
        let nextLikes = item.likes || 0;
        if (idx > -1) {
          likedBy.splice(idx, 1);
          nextLikes = Math.max(0, nextLikes - 1);
        } else {
          likedBy.push(currentUser._id);
          nextLikes += 1;
        }
        return {
          ...item,
          likedBy,
          likes: nextLikes
        };
      }
      return item;
    }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/professional/${ownerId}/portfolio-highlights/${highlightId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id })
      });

      if (res.ok) {
        const data = await res.json();
        setPortfolioProjects(prev => prev.map(item => {
          if (item.id === highlightId) {
            return {
              ...item,
              likes: data.likes,
              likedBy: data.likedBy
            };
          }
          return item;
        }));
      }
    } catch (err) {
      console.error('Error liking portfolio highlight:', err);
    }
  };

  const handleCommentPress = (highlightId: string) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to comment.');
      return;
    }
    setActiveHighlightId(highlightId);
    setCommentText('');
    setCommentModalVisible(true);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !activeHighlightId || !currentUser) return;
    
    setIsSubmittingComment(true);
    const ownerId = userId || currentUser._id;

    try {
      const res = await fetch(`${BACKEND_URL}/api/professional/${ownerId}/portfolio-highlights/${activeHighlightId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id,
          text: commentText.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setCommentText('');
        setPortfolioProjects(prev => prev.map(item => {
          if (item.id === activeHighlightId) {
            return {
              ...item,
              comments: data.commentsCount,
              commentsList: data.commentsList
            };
          }
          return item;
        }));
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to post comment.');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      Alert.alert('Error', 'Failed to submit comment due to network error.');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteHighlight = (highlightId: string) => {
    if (!currentUser?._id) return;
    
    Alert.alert(
      'Delete Highlight',
      'Are you sure you want to delete this highlight from your portfolio?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/professional/${currentUser._id}/portfolio-highlights/${highlightId}`, {
                method: 'DELETE',
              });
              
              if (res.ok) {
                Alert.alert('Success', 'Highlight deleted successfully!');
                setPortfolioProjects(prev => prev.filter(item => item.id !== highlightId));
              } else {
                const err = await res.json();
                Alert.alert('Error', err.message || 'Failed to delete highlight.');
              }
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Network error. Failed to delete.');
            }
          }
        }
      ]
    );
  };

  const handleEditHighlight = (item: any) => {
    setEditingHighlight(item);
    setEditTitle(item.title);
    setEditDesc(item.description || '');
    setEditModalVisible(true);
  };

  const submitEditHighlight = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Error', 'Please enter a title.');
      return;
    }
    if (!currentUser?._id || !editingHighlight) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/professional/${currentUser._id}/portfolio-highlights/${editingHighlight.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim(),
        }),
      });

      if (res.ok) {
        Alert.alert('Success', 'Highlight updated successfully!');
        setEditModalVisible(false);
        setPortfolioProjects(prev => prev.map(item => {
          if (item.id === editingHighlight.id) {
            return {
              ...item,
              title: editTitle.trim(),
              description: editDesc.trim()
            };
          }
          return item;
        }));
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to update highlight.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error. Failed to update.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const { userId } = useLocalSearchParams<{ userId?: string }>();

  // Fetch current user and their portfolio highlights
  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        user = JSON.parse(stored);
      }
    }
    setCurrentUser(user);

    const targetUserId = userId || user?._id;
    // Fetch portfolio highlights from backend
    if (targetUserId) {
      fetch(`${BACKEND_URL}/api/professional/${targetUserId}/portfolio-highlights`)
        .then(res => res.json())
        .then(data => {
          if (data.portfolioHighlights && data.portfolioHighlights.length > 0) {
            const mapped = data.portfolioHighlights.map((item: any, index: number) => ({
              id: item._id || `ph-${index}`,
              title: item.title,
              location: item.location,
              status: item.status || 'Posted',
              budget: item.budget,
              timeline: item.timeline,
              projectType: item.projectType,
              description: item.description,
              mediaUrls: item.mediaUrls || [],
              requirements: item.requirements || [],
              image: (item.mediaUrls && item.mediaUrls.length > 0) ? item.mediaUrls[0] : (PROJECT_TYPE_IMAGES[item.projectType] || PROJECT_TYPE_IMAGES['General']),
              createdAt: item.createdAt,
              likes: item.likes || 0,
              comments: item.comments || 0,
              likedBy: item.likedBy || [],
              commentsList: item.commentsList || [],
            }));
            setPortfolioProjects(mapped);
          } else {
            setPortfolioProjects([]);
          }
        })
        .catch(err => {
          console.error('Error fetching portfolio highlights:', err);
          setPortfolioProjects([]);
        });
    }
  }, [userId]);

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    return /\.(mp4|mov|m4v|3gp|avi|webm|mkv)/i.test(url) || url.includes('/video/') || url.includes('video') || url.includes('mp4');
  };

  // Extract real uploaded photos and videos
  const realPhotos = portfolioProjects.flatMap(project => 
    (project.mediaUrls || [])
      .filter((url: string) => !isVideoUrl(url))
      .map((url: string, index: number) => ({
        id: `${project.id}-photo-${index}`,
        title: project.title,
        image: url
      }))
  );

  const realVideos = portfolioProjects.flatMap(project => 
    (project.mediaUrls || [])
      .filter((url: string) => isVideoUrl(url))
      .map((url: string, index: number) => ({
        id: `${project.id}-video-${index}`,
        title: project.title,
        duration: '0:15', // Default duration
        image: PROJECT_TYPE_IMAGES[project.projectType] || PROJECT_TYPE_IMAGES['General'], // Fallback thumbnail
        videoUrl: url
      }))
  );

  const displayPhotos = realPhotos;
  const displayVideos = realVideos;

  // Combine real portfolio projects with mock projects for display
  const displayProjects = portfolioProjects;

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out my Portfolio Highlights on Allver! View completed projects, design photos, and construction videos.',
        title: 'Portfolio Highlights - Allver',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  const renderProjectsSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        {portfolioProjects.length > 0 ? 'My Posted Projects' : 'Completed & Active Projects'}
      </Text>
      <View style={styles.projectsList}>
        {displayProjects.map((item) => (
          <View key={item.id} style={styles.projectRow}>
            <Image source={{ uri: item.image }} style={styles.projectImage} contentFit="cover" />
            <View style={styles.projectInfo}>
              <View style={styles.projectTitleRow}>
                <Text style={styles.projectTitle}>{item.title}</Text>
                <View style={[
                  styles.statusBadge, 
                  item.status === 'Completed' ? styles.statusBadgeCompleted 
                    : item.status === 'Posted' ? styles.statusBadgePosted
                    : styles.statusBadgeOngoing
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === 'Completed' ? styles.statusTextCompleted 
                      : item.status === 'Posted' ? styles.statusTextPosted
                      : styles.statusTextOngoing
                  ]}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.projectLocation}>
                <Feather name="map-pin" size={12} color={COLORS.textMuted} /> {item.location}
              </Text>
              {item.budget && (
                <Text style={styles.projectBudget}>
                  ₹ {item.budget}{item.timeline ? `  •  ${item.timeline}` : ''}
                </Text>
              )}
            </View>
          </View>
        ))}
        {portfolioProjects.length === 0 && (
          <View style={styles.emptyPortfolioHint}>
            <Feather name="briefcase" size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.emptyPortfolioText}>
              Post a project to see it highlighted here!
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderPhotosSection = (photosList: typeof displayPhotos, title = 'Work Photos') => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {photosList.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollWrapper}>
          {photosList.map((item) => (
            <View key={item.id} style={styles.photoItemContainer}>
              <TouchableOpacity
                style={styles.photoCard}
                onPress={() => handleOpenPhoto(item.image, item.title)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
              </TouchableOpacity>
              <Text style={styles.photoUnderTitle}>{item.title}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyPortfolioHint}>
          <Feather name="image" size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.emptyPortfolioText}>No photos uploaded yet</Text>
        </View>
      )}
    </View>
  );

  const renderVideosSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Work Media</Text>
      {displayVideos.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollWrapper}>
          {displayVideos.map((item) => (
            <View key={item.id} style={styles.videoItemContainer}>
              <TouchableOpacity
                style={styles.videoCard}
                onPress={() => handleOpenVideo(item.videoUrl, item.title)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                <View style={styles.videoCardOverlay}>
                  <Feather name="play-circle" size={28} color={COLORS.white} />
                </View>
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{item.duration}</Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.videoUnderTitle}>
                {item.title} ({item.duration})
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyPortfolioHint}>
          <Feather name="play-circle" size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.emptyPortfolioText}>No media uploaded yet</Text>
        </View>
      )}
    </View>
  );

  const renderHighlightsGrid = () => {
    if (portfolioProjects.length === 0) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
          <Feather name="image" size={48} color={COLORS.textLight} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textDark }}>No highlights uploaded yet</Text>
          <Text style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' }}>
            Go to profile and upload portfolio highlights.
          </Text>
        </View>
      );
    }

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {portfolioProjects.map((item) => {
          const firstMedia = (item.mediaUrls && item.mediaUrls.length > 0) ? item.mediaUrls[0] : item.image;
          const isVideo = isVideoUrl(firstMedia);
          const totalMediaCount = item.mediaUrls?.length || 1;

          return (
            <TouchableOpacity
              key={item.id}
              style={{
                width: (width - 76) / 2,
                backgroundColor: COLORS.white,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                overflow: 'hidden',
                marginBottom: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }}
              onPress={() => {
                const urls = (item.mediaUrls && item.mediaUrls.length > 0) ? item.mediaUrls : [item.image];
                handleOpenViewer(urls, item.title, 0);
              }}
              activeOpacity={0.9}
            >
              <View style={{ width: '100%', height: (width - 76) / 2, backgroundColor: '#111827', position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
                {isVideo ? (
                  <View style={{ width: '100%', height: '100%', backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' }}>
                    <Feather name="video" size={32} color="rgba(255, 255, 255, 0.4)" />
                  </View>
                ) : (
                  <Image source={{ uri: firstMedia }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                )}
                {isVideo && (
                  <View style={{
                    ...StyleSheet.absoluteFillObject,
                    backgroundColor: 'rgba(0, 0, 0, 0.25)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Feather name="play-circle" size={40} color={COLORS.white} />
                  </View>
                )}
                {totalMediaCount > 1 && (
                  <View style={{
                    position: 'absolute', bottom: 8, right: 8,
                    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 10,
                    paddingHorizontal: 7, paddingVertical: 3,
                    flexDirection: 'row', alignItems: 'center', gap: 3,
                  }}>
                    <Feather name="image" size={10} color={COLORS.white} />
                    <Text style={{ fontSize: 10, color: COLORS.white, fontWeight: '700' }}>1/{totalMediaCount}</Text>
                  </View>
                )}
                {(!userId || userId === currentUser?._id) && (
                  <View style={{
                    position: 'absolute', top: 8, right: 8,
                    flexDirection: 'row', gap: 6, zIndex: 20,
                  }}>
                    <TouchableOpacity
                      style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        justifyContent: 'center', alignItems: 'center',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.25, shadowRadius: 2, elevation: 3,
                      }}
                      onPress={() => handleEditHighlight(item)}
                      activeOpacity={0.8}
                    >
                      <Feather name="edit-2" size={12} color="#1E293B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        width: 28, height: 28, borderRadius: 14,
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        justifyContent: 'center', alignItems: 'center',
                        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.25, shadowRadius: 2, elevation: 3,
                      }}
                      onPress={() => handleDeleteHighlight(item.id)}
                      activeOpacity={0.8}
                    >
                      <Feather name="trash-2" size={12} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={{ padding: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textDark }} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {/* Like & Comment Bar */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 10,
                  paddingTop: 8,
                  borderTopWidth: 1,
                  borderTopColor: COLORS.border,
                }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => handleLikePress(item.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.likedBy?.includes(currentUser?._id) ? "heart" : "heart-outline"}
                      size={16}
                      color={item.likedBy?.includes(currentUser?._id) ? "#EF4444" : COLORS.textMuted}
                    />
                    <Text style={{ fontSize: 11, color: COLORS.textDark, fontWeight: '600' }}>
                      {item.likes || 0}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    onPress={() => handleCommentPress(item.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={15}
                      color={COLORS.textMuted}
                    />
                    <Text style={{ fontSize: 11, color: COLORS.textDark, fontWeight: '600' }}>
                      {item.comments || 0}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const activeHighlight = portfolioProjects.find(item => item.id === activeHighlightId);
  const commentsList = activeHighlight?.commentsList || [];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Portfolio Highlights</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerActionCircle} activeOpacity={0.7}>
            <Feather name="share-2" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerActionCircle} activeOpacity={0.7}>
            <Feather name="log-out" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.whiteCardContainer}>
        {/* Main Content Area */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderHighlightsGrid()}
        </ScrollView>
      </View>

      {/* ================= UNIFIED MEDIA VIEWER MODAL ================= */}
      <Modal
        visible={viewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
          {/* Close Button & Header */}
          <View style={{
            height: 60,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            position: 'absolute',
            top: Platform.OS === 'ios' ? 44 : 10,
            left: 0,
            right: 0,
            zIndex: 10,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.white, flex: 1, marginRight: 12 }} numberOfLines={1}>
              {viewerTitle}
            </Text>
            <TouchableOpacity 
              onPress={() => setViewerVisible(false)} 
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(255,255,255,0.15)',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Feather name="x" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Swipeable Media ScrollView */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ScrollView
              ref={viewerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                setViewerActiveIndex(idx);
              }}
              style={{ flex: 1, width: width }}
              contentContainerStyle={{ alignItems: 'center' }}
            >
              {viewerMediaList.map((url, idx) => {
                const isVideo = isVideoUrl(url);
                return (
                  <View key={url + '-' + idx} style={{ width: width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    {isVideo ? (
                      <Video
                        source={{ uri: url }}
                        rate={1.0}
                        volume={1.0}
                        isMuted={false}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={viewerVisible && idx === viewerActiveIndex}
                        useNativeControls
                        style={{ width: width, height: '80%' }}
                      />
                    ) : (
                      <Image
                        source={{ uri: url }}
                        style={{ width: width, height: '80%' }}
                        contentFit="contain"
                      />
                    )}
                  </View>
                );
              })}
            </ScrollView>

            {/* Pagination/Scroll indicator */}
            {viewerMediaList.length > 1 && (
              <View style={{
                position: 'absolute',
                bottom: Platform.OS === 'ios' ? 50 : 30,
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                alignItems: 'center'
              }}>
                <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '700' }}>
                  {viewerActiveIndex + 1} / {viewerMediaList.length}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
      {/* ================= EDIT HIGHLIGHT MODAL ================= */}
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
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 5
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.navy }}>Edit Highlight Info</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Title Input */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 }}>Title *</Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="e.g. Concrete slab finished"
              placeholderTextColor="#94A3B8"
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                color: COLORS.textDark,
                marginBottom: 16,
                backgroundColor: '#F8FAFC'
              }}
            />

            {/* Description Input */}
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 }}>Small Description</Text>
            <TextInput
              value={editDesc}
              onChangeText={setEditDesc}
              placeholder="Provide a small detail..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 10,
                fontSize: 14,
                color: COLORS.textDark,
                height: 80,
                textAlignVertical: 'top',
                marginBottom: 20,
                backgroundColor: '#F8FAFC'
              }}
            />

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 10,
                  height: 44,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={{ color: COLORS.textDark, fontWeight: '700', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: isSavingEdit ? '#94A3B8' : '#F59E0B',
                  borderRadius: 10,
                  height: 44,
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
                onPress={submitEditHighlight}
                disabled={isSavingEdit}
              >
                <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
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
          justifyContent: 'flex-end', // slide up from bottom
        }}>
          <View style={{
            width: '100%',
            height: '75%', // take up 75% of screen height
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 5
          }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.navy }} numberOfLines={1}>
                Comments ({commentsList.length})
              </Text>
              <TouchableOpacity onPress={() => setCommentModalVisible(false)} style={{ padding: 4 }}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {commentsList.length > 0 ? (
                commentsList.map((c: any, index: number) => (
                  <View key={c._id || index} style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                    <Image
                      source={{ uri: c.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' }}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgLight }}
                    />
                    <View style={{ flex: 1, backgroundColor: COLORS.bgLight, borderRadius: 12, padding: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.textDark }}>
                          {c.userName || 'Anonymous'}
                        </Text>
                        <Text style={{ fontSize: 9, color: COLORS.textMuted }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Just now'}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: COLORS.textDark, lineHeight: 16 }}>
                        {c.text}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                  <Feather name="message-square" size={32} color={COLORS.textLight} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' }}>
                    No comments yet. Be the first to comment!
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Input Row at the bottom */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              marginBottom: Platform.OS === 'ios' ? 24 : 0
            }}>
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Write a comment..."
                placeholderTextColor="#94A3B8"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: COLORS.textDark,
                  backgroundColor: '#F8FAFC',
                  maxHeight: 80
                }}
                multiline
              />
              <TouchableOpacity
                onPress={handleSendComment}
                disabled={isSubmittingComment || !commentText.trim()}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: commentText.trim() ? COLORS.green : '#E2E8F0',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                {isSubmittingComment ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Feather name="send" size={16} color={COLORS.white} />
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
    backgroundColor: '#FAF6F0',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FAF6F0',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.navy,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  whiteCardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  landscapeRow: {
    flexDirection: 'row',
    gap: 20,
  },
  landscapeCol: {
    flex: 1,
    gap: 16,
  },
  sectionContainer: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.orange,
  },
  horizontalScrollWrapper: {
    paddingRight: 16,
  },
  photoItemContainer: {
    marginRight: 12,
    alignItems: 'flex-start',
    width: 140,
  },
  photoUnderTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    marginTop: 6,
    textAlign: 'left',
  },
  photoCard: {
    width: 140,
    height: 105,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridPhotoCard: {
    width: (width - 40) / 2,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  videoItemContainer: {
    marginRight: 12,
    alignItems: 'flex-start',
    width: 140,
  },
  videoUnderTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    marginTop: 6,
    textAlign: 'left',
  },
  videoCard: {
    width: 140,
    height: 105,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  videoCardOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  gridVideoCard: {
    width: (width - 40) / 2,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: '700',
  },
  projectsList: {
    marginTop: 4,
  },
  projectRow: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  projectImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  projectInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  projectTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.navy,
    flex: 1,
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeCompleted: {
    backgroundColor: COLORS.greenLight,
  },
  statusBadgeOngoing: {
    backgroundColor: COLORS.blueLight,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: COLORS.green,
  },
  statusTextOngoing: {
    color: COLORS.blue,
  },
  statusBadgePosted: {
    backgroundColor: COLORS.orangeLight,
  },
  statusTextPosted: {
    color: COLORS.orange,
  },
  projectLocation: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  projectBudget: {
    fontSize: 10,
    color: COLORS.navy,
    fontWeight: '600',
    marginTop: 3,
  },
  emptyPortfolioHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  emptyPortfolioText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  certificatesList: {
    marginTop: 4,
  },
  certificateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  certificateImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  certificateInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  certificateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.navy,
    marginBottom: 2,
  },
  certificateAuthority: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  // Video player fullscreen modal styles
  videoFullScreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  videoFullScreenHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  videoFullScreenTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    flex: 1,
    marginRight: 12,
  },
  videoFullScreenCloseBtn: {
    padding: 8,
  },
  videoFullScreenBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  videoFullScreenPlayer: {
    width: '100%',
    height: '100%',
  },
  // Photo modal viewer styles
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  photoModalHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  photoModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    flex: 1,
    marginRight: 12,
  },
  photoCloseBtn: {
    padding: 8,
  },
  photoModalBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoFullScreen: {
    width: '100%',
    height: '80%',
  },
});
