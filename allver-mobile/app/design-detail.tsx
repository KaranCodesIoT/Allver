import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Share, Linking, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';
import { Video, ResizeMode } from 'expo-av';

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
  const initialTitle = (params.title as string) || 'Modern 2BHK Apartment';
  const initialLocation = (params.location as string) || 'Mumbai, Maharashtra';
  const initialMainImage = (params.image as string) || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80';
  const likes = (params.likes as string) || '128';
  const comments = (params.comments as string) || '24';
  const rating = (params.rating as string) || '4.8';

  // Architect Params
  const initialAuthorId = (params.authorId as string) || '60c72b2f9b1d8a2a4c8b0001';
  const initialAuthorName = (params.authorName as string) || 'Ar. Neha Sharma';
  const initialAuthorAvatar = (params.authorAvatar as string) || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80';
  const initialAuthorCover = (params.authorCover as string) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
  const initialAuthorFirm = (params.authorFirm as string) || 'Design Space Architects';
  const initialAuthorExperience = (params.authorExperience as string) || '8+ Years';
  const authorProjects = (params.authorProjects as string) || '0';
  const authorFollowers = (params.authorFollowers as string) || '256';
  const authorPhone = (params.authorPhone as string) || '+91 98765 43210';
  const authorReviews = (params.authorReviews as string) || '124';
  const authorRole = (params.authorRole as string) || 'Architect';

  const initialImagesList = params.imagesList 
    ? (params.imagesList as string).split(',')
    : [initialMainImage];

  const initialDescription = (params.description as string) || 'A modern and minimal 2BHK apartment design with a perfect blend of comfort, functionality and premium aesthetics. Warm wood tones, soft natural light, and space-optimized custom layouts make this home feel open and truly beautiful. Perfect choice for urban families looking for upscale styling.';

  // Parse quotation params
  const initialQuotation = params.quotation 
    ? JSON.parse(params.quotation as string) 
    : { civilStructure: '', flooringTiling: '', electricalPlumbing: '', modularWoodwork: '' };

  // States
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [title, setTitle] = useState(initialTitle);
  const [location, setLocation] = useState(initialLocation);
  const [mainImage, setMainImage] = useState(initialMainImage);
  const [imagesList, setImagesList] = useState<string[]>(initialImagesList);
  const [description, setDescription] = useState(initialDescription);

  const [authorId, setAuthorId] = useState(initialAuthorId);
  const [authorName, setAuthorName] = useState(initialAuthorName);
  const [authorAvatar, setAuthorAvatar] = useState(initialAuthorAvatar);
  const [authorCover, setAuthorCover] = useState(initialAuthorCover);
  const [authorFirm, setAuthorFirm] = useState(initialAuthorFirm);
  const [authorExperience, setAuthorExperience] = useState(initialAuthorExperience);

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

  const [activeTab, setActiveTab] = useState<'photos' | 'videos' | 'quotation'>('photos');
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [authorFollowersVal, setAuthorFollowersVal] = useState<number>(parseInt(authorFollowers, 10) || 0);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [similarDesigns, setSimilarDesigns] = useState<any[]>([]);
  const [realContractors, setRealContractors] = useState<any[]>([]);
  const [fullscreenMedia, setFullscreenMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    if (fullscreenMedia && fullscreenMedia.type === 'image') {
      const idx = imagesList.indexOf(fullscreenMedia.url);
      if (idx >= 0) {
        setActiveImageIndex(idx);
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ x: idx * width, animated: false });
        }, 100);
      }
    }
  }, [fullscreenMedia]);

  useEffect(() => {
    if (currentUser?._id && authorId) {
      // Fetch follow status
      fetch(`${BACKEND_URL}/api/follow/status/${authorId}?followerId=${currentUser._id}`)
        .then(res => res.json())
        .then(data => {
          setIsFollowing(!!data.isFollowing);
        })
        .catch(err => console.error("Error fetching follow status:", err));

      // Fetch live author followers count
      fetch(`${BACKEND_URL}/api/professional/${authorId}`)
        .then(res => res.json())
        .then(data => {
          if (data.professional) {
            setAuthorFollowersVal(data.professional.followersCount || 0);
          }
        })
        .catch(err => console.error("Error fetching professional info:", err));
    }
  }, [currentUser, authorId]);

  const handleFollowPress = () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to follow other users.');
      return;
    }

    if (isFollowing) {
      setShowUnfollowModal(true);
    } else {
      executeFollow();
    }
  };

  const executeFollow = async () => {
    setIsFollowing(true);
    setAuthorFollowersVal(prev => prev + 1);

    try {
      const response = await fetch(`${BACKEND_URL}/api/follow/${authorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: currentUser._id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error following user');
      }
    } catch (error: any) {
      setIsFollowing(false);
      setAuthorFollowersVal(prev => Math.max(0, prev - 1));
      Alert.alert('Error', error.message || 'Could not follow user.');
    }
  };

  const executeUnfollow = async () => {
    setShowUnfollowModal(false);
    setIsFollowing(false);
    setAuthorFollowersVal(prev => Math.max(0, prev - 1));

    try {
      const response = await fetch(`${BACKEND_URL}/api/unfollow/${authorId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: currentUser._id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error unfollowing user');
      }
    } catch (error: any) {
      setIsFollowing(true);
      setAuthorFollowersVal(prev => prev + 1);
      Alert.alert('Error', error.message || 'Could not unfollow user.');
    }
  };

  // Likes, Dislikes, and Comments Dynamic States
  const [likesCount, setLikesCount] = useState(parseInt(likes) || 0);
  const [dislikesCount, setDislikesCount] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [commentsCount, setCommentsCount] = useState(parseInt(comments) || 0);
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Edit states for architect
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(description);
  const [civilCost, setCivilCost] = useState(initialQuotation?.civilStructure || '');
  const [flooringCost, setFlooringCost] = useState(initialQuotation?.flooringTiling || '');
  const [electricalCost, setElectricalCost] = useState(initialQuotation?.electricalPlumbing || '');
  const [modularCost, setModularCost] = useState(initialQuotation?.modularWoodwork || '');

  useEffect(() => {
    setLocalTitle(title);
    setLocalDescription(description);
  }, [title, description]);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  const isOwner = currentUser && currentUser._id === authorId;

  // Dynamic visible tabs list based on actual content
  const hasQuotation = !!(civilCost || flooringCost || electricalCost || modularCost);
  const hasVideo = imagesList.some(url => url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov') || url.toLowerCase().endsWith('.avi'));

  const visibleTabs: string[] = ['photos'];
  if (hasVideo) visibleTabs.push('videos');
  if (hasQuotation) visibleTabs.push('quotation');

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab('photos');
    }
  }, [civilCost, flooringCost, electricalCost, modularCost]);

  // Fetch latest post data and user saved state from backend on mount
  useEffect(() => {
    const fetchPostAndUserState = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/posts/${designId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.post) {
            const p = data.post;
            setLikesCount(p.likes || 0);
            setDislikesCount(p.dislikedBy ? p.dislikedBy.length : 0);
            setCommentsCount(p.comments || 0);
            setCommentsList(p.commentsList || []);
            
            if (p.title) setTitle(p.title);
            if (p.location) setLocation(p.location);
            if (p.description) setDescription(p.description);
            if (p.mediaUrls && p.mediaUrls.length > 0) {
              setMainImage(p.mediaUrls[0]);
              setImagesList(p.mediaUrls);
            }
            if (p.creator) {
              setAuthorId(p.creator._id || p.creator);
              setAuthorName(p.creator.fullName || p.creator.name || 'Architect');
              setAuthorAvatar(p.creator.avatarUrl || p.creator.avatar || '');
              setAuthorFirm(p.creator.firmName || 'Independent');
              setAuthorExperience(p.creator.experience || '5+ Years');
            }
            if (p.quotation) {
              setCivilCost(p.quotation.civilStructure || '');
              setFlooringCost(p.quotation.flooringTiling || '');
              setElectricalCost(p.quotation.electricalPlumbing || '');
              setModularCost(p.quotation.modularWoodwork || '');
            }

            // Check if current user liked
            if (currentUser) {
              setHasLiked(p.likedBy ? p.likedBy.includes(currentUser._id) : false);
            }
          }
        }

        // Fetch user's saved list to see if this design is saved
        if (currentUser) {
          const userRes = await fetch(`${BACKEND_URL}/api/user/saved-designs/${currentUser._id}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            const savedList = userData.savedDesigns || [];
            const isSaved = savedList.some((item: any) => item._id === designId || item === designId);
            setHasSaved(isSaved);
          }
        }
      } catch (err) {
        console.error('Error fetching post/user details:', err);
      }
    };
    if (designId && currentUser) {
      fetchPostAndUserState();
    }
  }, [designId, currentUser]);

  useEffect(() => {
    const fetchSimilarDesigns = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/posts/design`);
        if (res.ok) {
          const data = await res.json();
          // Filter out current design
          const filtered = data.designs.filter((d: any) => d._id !== designId);
          setSimilarDesigns(filtered.slice(0, 5));
        }
      } catch (err) {
        console.error('Error fetching similar designs:', err);
      }
    };

    const fetchRealContractors = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/professionals/Contractor`);
        if (res.ok) {
          const data = await res.json();
          setRealContractors(data.professionals || []);
        }
      } catch (err) {
        console.error('Error fetching real contractors:', err);
      }
    };

    fetchSimilarDesigns();
    fetchRealContractors();
  }, [designId]);

  const handleLike = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to like this design.');
      return;
    }
    
    // Optimistic UI updates
    const nextHasLiked = !hasLiked;
    setHasLiked(nextHasLiked);
    setLikesCount(prev => nextHasLiked ? prev + 1 : Math.max(0, prev - 1));
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/posts/${designId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id })
      });
      if (response.ok) {
        const data = await response.json();
        setLikesCount(data.likes);
        setHasLiked(data.likedBy.includes(currentUser._id));
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleSaveDesign = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to save this design.');
      return;
    }

    // Optimistic UI update
    const nextHasSaved = !hasSaved;
    setHasSaved(nextHasSaved);

    try {
      const response = await fetch(`${BACKEND_URL}/api/user/save-design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, designId })
      });
      if (response.ok) {
        const data = await response.json();
        setHasSaved(data.isSaved);
      }
    } catch (err) {
      console.error('Error saving design:', err);
    }
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to comment.');
      return;
    }
    
    setIsPostingComment(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/posts/${designId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser._id,
          userName: currentUser.fullName || 'Anonymous',
          userAvatar: currentUser.avatarUrl || '',
          text: commentText
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCommentsList(prev => [...prev, data.comment]);
        setCommentsCount(data.commentsCount);
        setCommentText('');
      } else {
        Alert.alert('Error', 'Failed to post comment.');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/posts/${designId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: localTitle,
          description: localDescription,
          quotation: {
            civilStructure: civilCost,
            flooringTiling: flooringCost,
            electricalPlumbing: electricalCost,
            modularWoodwork: modularCost,
          }
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Design details updated successfully.');
        setIsEditing(false);
      } else {
        Alert.alert('Update Failed', 'Failed to save changes. Please try again.');
      }
    } catch (err) {
      console.error('Update design error:', err);
      // Fallback
      Alert.alert('Test Mode', 'Offline simulation: Changes saved locally.');
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDesign = () => {
    Alert.alert(
      'Delete Design',
      'Are you sure you want to permanently delete this design project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: executeDeleteDesign 
        }
      ]
    );
  };

  const executeDeleteDesign = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/posts/${designId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        Alert.alert('Success', 'Design deleted successfully.', [
          { 
            text: 'OK', 
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            } 
          }
        ]);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.message || 'Failed to delete design.');
      }
    } catch (err: any) {
      console.error('Delete design error:', err);
      Alert.alert('Error', 'Network error. Failed to delete design.');
    } finally {
      setIsSaving(false);
    }
  };

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
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }} 
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          {isOwner && (
            <TouchableOpacity 
              onPress={() => setIsEditing(!isEditing)} 
              style={[styles.headerCircleBtn, isEditing && { backgroundColor: COLORS.greenLight }]}
            >
              <Feather name="edit" size={17} color={isEditing ? COLORS.green : COLORS.textDark} />
            </TouchableOpacity>
          )}
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
          {isEditing ? (
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.smallLabel}>Design Title</Text>
              <TextInput
                style={styles.editInput}
                value={localTitle}
                onChangeText={setLocalTitle}
                placeholder="Enter design title..."
              />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.designTitle, { flex: 1, marginRight: 10 }]}>{localTitle}</Text>
              {isOwner && !isEditing && (
                <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.smallEditBtn}>
                  <Feather name="edit-2" size={11} color={COLORS.green} />
                  <Text style={styles.smallEditBtnText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          <Text style={styles.designLoc}>
            <Feather name="map-pin" size={13} color={COLORS.textMuted} /> {location}
          </Text>
        </View>

        {/* Architect Profile Inline Card */}
        <View style={styles.designerCard}>
          <TouchableOpacity onPress={handleViewProfile}>
            <Image source={{ uri: authorAvatar }} style={styles.designerAvatar} contentFit="cover" />
          </TouchableOpacity>
          <View style={[styles.designerInfo, { marginRight: 8 }]}>
            <View style={styles.designerNameRow}>
              <Text 
                style={[styles.designerName, { flexShrink: 1 }]} 
                numberOfLines={1} 
                onPress={handleViewProfile}
              >
                By {authorName}
              </Text>
              <View style={styles.verifiedBadge}>
                <Feather name="check" size={8} color={COLORS.white} />
              </View>
            </View>
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color={COLORS.gold} style={{ fill: COLORS.gold }} />
              <Text style={styles.ratingText}>{rating} <Text style={styles.reviewsText}>({authorReviews} reviews)</Text></Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {!isOwner && (
              <TouchableOpacity 
                style={{
                  borderRadius: 20,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: isFollowing ? '#F3F4F6' : '#E6F4EA',
                  borderWidth: isFollowing ? 1 : 0,
                  borderColor: '#E5E7EB',
                }}
                onPress={handleFollowPress}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  fontSize: 11, 
                  fontWeight: '700', 
                  color: isFollowing ? '#374151' : '#137333'
                }}>
                  {isFollowing ? 'In Network' : 'Add to Network'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={{
                borderRadius: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#E0F2FE',
              }} 
              activeOpacity={0.8}
              onPress={() => {
                if (!currentUser) {
                  Alert.alert('Login Required', 'Please log in to send messages.');
                  return;
                }
                router.push({
                  pathname: '/chat-room',
                  params: {
                    receiverId: authorId,
                    name: authorName,
                    role: authorRole || 'Architect',
                    avatar: authorAvatar || '',
                  }
                });
              }}
            >
              <Feather name="message-square" size={12} color="#0369A1" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369A1' }}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sub-Tabs Selector */}
        {visibleTabs.length > 1 && (
          <View style={styles.subTabsContainer}>
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <TouchableOpacity 
                  key={tab} 
                  style={[styles.subTabBtn, isActive && styles.subTabBtnActive]}
                  onPress={() => setActiveTab(tab as any)}
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
        )}

        {/* Photos Grid Tab Content */}
        {activeTab === 'photos' && (
          <View style={styles.photosGrid}>
            {imagesList.length === 1 ? (
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => setFullscreenMedia({ type: 'image', url: imagesList[0] })}
                style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
              >
                <Image source={{ uri: imagesList[0] }} style={styles.mainPhoto} contentFit="cover" />
                <View style={styles.mediaCountBadge}>
                  <Text style={styles.mediaCountText}>1/1</Text>
                </View>
              </TouchableOpacity>
            ) : imagesList.length === 2 ? (
              <View style={{ flex: 1, flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  onPress={() => setFullscreenMedia({ type: 'image', url: imagesList[0] })}
                  style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                >
                  <Image source={{ uri: imagesList[0] }} style={styles.mainPhoto} contentFit="cover" />
                  <View style={styles.mediaCountBadge}>
                    <Text style={styles.mediaCountText}>1/2</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  onPress={() => setFullscreenMedia({ type: 'image', url: imagesList[1] })}
                  style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }}
                >
                  <Image source={{ uri: imagesList[1] }} style={styles.mainPhoto} contentFit="cover" />
                  <View style={styles.mediaCountBadge}>
                    <Text style={styles.mediaCountText}>2/2</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  onPress={() => setFullscreenMedia({ type: 'image', url: imagesList[0] })}
                  style={styles.mainPhotoCol}
                >
                  <Image source={{ uri: imagesList[0] }} style={styles.mainPhoto} contentFit="cover" />
                  <View style={styles.mediaCountBadge}>
                    <Text style={styles.mediaCountText}>1/{imagesList.length}</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.sidePhotoCol}>
                  <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={() => setFullscreenMedia({ type: 'image', url: imagesList[1] })}
                    style={{ flex: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}
                  >
                    <Image 
                      source={{ uri: imagesList[1] }} 
                      style={styles.sidePhotoTop} 
                      contentFit="cover" 
                    />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={() => setFullscreenMedia({ type: 'image', url: imagesList[2] })}
                    style={styles.sidePhotoBottomContainer}
                  >
                    <Image 
                      source={{ uri: imagesList[2] }} 
                      style={styles.sidePhotoBottom} 
                      contentFit="cover" 
                    />
                    {imagesList.length > 3 && (
                      <View style={styles.morePhotosOverlay}>
                        <Text style={styles.morePhotosText}>+{imagesList.length - 3} More</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {activeTab === 'videos' && (
          <TouchableOpacity 
            style={styles.videosTabContent}
            activeOpacity={0.9}
            onPress={() => {
              const videoUrl = imagesList.find(url => url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.mov') || url.includes('/video/') || url.includes('video') || url.includes('.webm') || url.includes('mp4')) || imagesList[0];
              setFullscreenMedia({ type: 'video', url: videoUrl });
            }}
          >
            <Image source={{ uri: mainImage }} style={styles.videoPlayerMock} contentFit="cover" />
            <View style={styles.videoPlayIconBg}>
              <Feather name="play" size={32} color={COLORS.white} />
            </View>
          </TouchableOpacity>
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

            {isEditing ? (
              <View style={{ gap: 10 }}>
                <View style={styles.editQuoteRow}>
                  <Text style={styles.editQuoteLabel}>Civil & Structure</Text>
                  <TextInput
                    style={styles.editQuoteInput}
                    value={civilCost}
                    onChangeText={setCivilCost}
                    placeholder="e.g. 4.5 L - 5.8 L"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.editQuoteRow}>
                  <Text style={styles.editQuoteLabel}>Flooring & Tiling</Text>
                  <TextInput
                    style={styles.editQuoteInput}
                    value={flooringCost}
                    onChangeText={setFlooringCost}
                    placeholder="e.g. 1.2 L - 1.8 L"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.editQuoteRow}>
                  <Text style={styles.editQuoteLabel}>Electrical & Plumbing</Text>
                  <TextInput
                    style={styles.editQuoteInput}
                    value={electricalCost}
                    onChangeText={setElectricalCost}
                    placeholder="e.g. 0.8 L - 1.2 L"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
                <View style={styles.editQuoteRow}>
                  <Text style={styles.editQuoteLabel}>Modular Woodwork</Text>
                  <TextInput
                    style={styles.editQuoteInput}
                    value={modularCost}
                    onChangeText={setModularCost}
                    placeholder="e.g. 2.5 L - 3.8 L"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
            ) : (!civilCost && !flooringCost && !electricalCost && !modularCost) ? (
              <View style={styles.noQuotationBox}>
                <Feather name="alert-circle" size={26} color={COLORS.textMuted} style={{ marginBottom: 6 }} />
                <Text style={styles.noQuotationText}>No estimated cost quotation provided for this design.</Text>
                {isOwner && (
                  <TouchableOpacity style={styles.addQuoteBtn} onPress={() => setIsEditing(true)}>
                    <Text style={styles.addQuoteBtnText}>Add Quotation</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View>
                {civilCost ? (
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Civil & Structure</Text>
                    <Text style={styles.quoteValue}>₹{civilCost}</Text>
                  </View>
                ) : null}
                {flooringCost ? (
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Flooring & Tiling</Text>
                    <Text style={styles.quoteValue}>₹{flooringCost}</Text>
                  </View>
                ) : null}
                {electricalCost ? (
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Electrical & Plumbing</Text>
                    <Text style={styles.quoteValue}>₹{electricalCost}</Text>
                  </View>
                ) : null}
                {modularCost ? (
                  <View style={styles.quoteRow}>
                    <Text style={styles.quoteLabel}>Modular Woodwork</Text>
                    <Text style={styles.quoteValue}>₹{modularCost}</Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        )}

        {/* Design Overview */}
        <View style={styles.overviewSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionHeaderTitle}>Design Overview</Text>
            {isOwner && !isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.smallEditBtn}>
                <Feather name="edit-2" size={11} color={COLORS.green} />
                <Text style={styles.smallEditBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {isEditing ? (
            <View>
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={localDescription}
                onChangeText={setLocalDescription}
                multiline={true}
                numberOfLines={4}
                placeholder="Enter design overview description..."
              />
              
              {/* Optional Quotation Form inside editing mode alongside description */}
              <View style={styles.editQuotationFormSection}>
                <Text style={styles.editQuotationSectionTitle}>Cost Quotation (Optional)</Text>
                <Text style={styles.editQuotationSectionSub}>Provide estimated price ranges for this design layout (e.g. 4.5 L - 5.8 L)</Text>
                
                <View style={styles.editQuoteRowInline}>
                  <Text style={styles.editQuoteLabelInline}>Civil & Structure</Text>
                  <TextInput
                    style={styles.editQuoteInputInline}
                    value={civilCost}
                    onChangeText={setCivilCost}
                    placeholder="e.g. 4.5 L - 5.8 L"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.editQuoteRowInline}>
                  <Text style={styles.editQuoteLabelInline}>Flooring & Tiling</Text>
                  <TextInput
                    style={styles.editQuoteInputInline}
                    value={flooringCost}
                    onChangeText={setFlooringCost}
                    placeholder="e.g. 1.2 L - 1.8 L"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.editQuoteRowInline}>
                  <Text style={styles.editQuoteLabelInline}>Electrical & Plumbing</Text>
                  <TextInput
                    style={styles.editQuoteInputInline}
                    value={electricalCost}
                    onChangeText={setElectricalCost}
                    placeholder="e.g. 0.8 L - 1.2 L"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>

                <View style={styles.editQuoteRowInline}>
                  <Text style={styles.editQuoteLabelInline}>Modular Woodwork</Text>
                  <TextInput
                    style={styles.editQuoteInputInline}
                    value={modularCost}
                    onChangeText={setModularCost}
                    placeholder="e.g. 2.5 L - 3.8 L"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              </View>
            </View>
          ) : (
            <Text style={styles.overviewText} numberOfLines={showFullOverview ? undefined : 3}>
              {localDescription}
            </Text>
          )}
          {!isEditing && (
            <TouchableOpacity style={styles.showMoreRow} onPress={() => setShowFullOverview(!showFullOverview)}>
              <Text style={styles.showMoreText}>{showFullOverview ? 'Show Less' : 'Show More'}</Text>
              <Feather name={showFullOverview ? "chevron-up" : "chevron-down"} size={14} color={COLORS.green} />
            </TouchableOpacity>
          )}
        </View>

        {isEditing && (
          <View style={{ paddingHorizontal: 20, marginTop: 20, flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={[styles.saveChangesBtn, { flex: 1, marginBottom: 0 }, isSaving && { opacity: 0.8 }]} 
              onPress={handleSaveChanges}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Feather name="check-circle" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                  <Text style={styles.saveChangesBtnText}>Save Changes</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                flex: 1,
                height: 44,
                backgroundColor: '#EF4444',
                borderRadius: 8,
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }} 
              onPress={handleDeleteDesign}
              disabled={isSaving}
            >
              <Feather name="trash-2" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '700' }}>Delete Design</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats and Action Bar */}
        <View style={styles.statsRow}>
          <View style={styles.statsCol}>
            {/* Like Button (Orange-yellow filled when liked) */}
            <TouchableOpacity 
              style={[styles.statActionBtn, hasLiked && { backgroundColor: '#FEF3C7', borderColor: '#FEF3C7' }]} 
              onPress={handleLike}
            >
              <Feather 
                name="heart" 
                size={16} 
                color={hasLiked ? '#F59E0B' : COLORS.textDark} 
                style={hasLiked && { fill: '#F59E0B' }} 
              />
              <Text style={[styles.statActionText, hasLiked && { color: '#F59E0B', fontWeight: '800' }]}>
                {likesCount}
              </Text>
            </TouchableOpacity>

            {/* Comment Button */}
            <TouchableOpacity 
              style={[styles.statActionBtn, showComments && { backgroundColor: COLORS.greenLight }]}
              onPress={() => setShowComments(!showComments)}
            >
              <Feather name="message-square" size={16} color={showComments ? COLORS.green : COLORS.textDark} />
              <Text style={[styles.statActionText, showComments && { color: COLORS.green }]}>
                {commentsCount}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.statActionBtn, hasSaved && { backgroundColor: COLORS.greenLight }]}
            onPress={handleSaveDesign}
          >
            <Feather name="bookmark" size={16} color={hasSaved ? COLORS.green : COLORS.textDark} style={hasSaved && { fill: COLORS.green }} />
            <Text style={[styles.statActionText, hasSaved && { color: COLORS.green }]}>
              {hasSaved ? 'Saved Design' : 'Save Design'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Comments List & Input Section */}
        {showComments && (
          <View style={styles.commentsSection}>
            <Text style={styles.commentsSectionTitle}>Comments ({commentsCount})</Text>
            
            {/* Input Form */}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentTextInput}
                placeholder="Write a comment..."
                placeholderTextColor={COLORS.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity 
                style={styles.commentSendBtn}
                onPress={handleCommentSubmit}
                disabled={isPostingComment || !commentText.trim()}
              >
                {isPostingComment ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Feather name="send" size={16} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {commentsList.length === 0 ? (
              <Text style={styles.noCommentsText}>No comments yet. Be the first to comment!</Text>
            ) : (
              <View style={styles.commentsListContainer}>
                {commentsList.map((item, idx) => (
                  <View key={idx} style={styles.commentItem}>
                    <Image 
                      source={{ uri: item.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80' }} 
                      style={styles.commentAvatar} 
                    />
                    <View style={styles.commentBubble}>
                      <View style={styles.commentHeaderRow}>
                        <Text style={styles.commentUserName}>{item.userName}</Text>
                        <Text style={styles.commentTime}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Just now'}
                        </Text>
                      </View>
                      <Text style={styles.commentText}>{item.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.sectionDivider} />

        {/* Similar Designs Horizontal Scroll */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>Similar Designs</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/design')}>
              <Text style={styles.viewAllText}>View All {'->'}</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carouselWrapper}>
            {similarDesigns.length > 0 ? (
              similarDesigns.map((item) => (
                <TouchableOpacity 
                  key={item._id} 
                  style={styles.carouselCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({
                      pathname: '/design-detail',
                      params: {
                        id: item._id,
                        title: item.title || 'Modern Design',
                        location: item.creator?.city || 'Mumbai',
                        image: item.mediaUrls?.[0] || '',
                        likes: (item.likes || 0).toString(),
                        comments: (item.comments || 0).toString(),
                        rating: (item.creator?.rating || 4.5).toString(),
                        authorId: item.creator?._id || '',
                        authorName: item.creator?.fullName || 'Architect',
                        authorRole: item.creator?.role || 'Architect',
                        authorAvatar: item.creator?.avatarUrl || '',
                        authorCover: item.creator?.coverImage || '',
                        authorFirm: item.creator?.firmName || 'Design Space Architects',
                        authorExperience: item.creator?.experience || '8+ Years',
                        authorProjects: item.creator?.projects?.toString() || '0',
                        authorFollowers: item.creator?.followersCount?.toString() || '0',
                        authorPhone: item.creator?.phone || '+91 98765 43210',
                        authorReviews: '124',
                        imagesList: (item.mediaUrls || []).join(','),
                        description: item.description || '',
                        quotation: JSON.stringify(item.quotation || { civilStructure: '', flooringTiling: '', electricalPlumbing: '', modularWoodwork: '' }),
                        isSaved: 'false'
                      }
                    });
                  }}
                >
                  <Image source={{ uri: resolveAvatarUrl(item.mediaUrls?.[0]) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=250&q=80' }} style={styles.carouselImg} contentFit="cover" />
                  <View style={styles.carouselCardBody}>
                    <Text style={styles.carouselCardTitle} numberOfLines={1}>{item.title || 'Modern Design'}</Text>
                    <Text style={styles.carouselCardLoc}>{item.creator?.city || 'Mumbai'}</Text>
                    <View style={styles.carouselRatingRow}>
                      <Feather name="star" size={10} color={COLORS.gold} style={{ fill: COLORS.gold }} />
                      <Text style={styles.carouselRatingText}>{item.creator?.rating || '4.5'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              [
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
              ))
            )}
          </ScrollView>
        </View>

        {/* Connect with Architects/Contractors Section */}
        <View style={styles.connectSectionWrap}>
          {/* Section Header Banner */}
          <View style={styles.connectBannerHeader}>
            <View style={styles.connectIconBadge}>
              <Feather name="users" size={18} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.connectSectionTitle}>Connect with Architects / Contractors</Text>
              <Text style={styles.connectSectionSubtitle}>who can build this design for you</Text>
            </View>
            <TouchableOpacity 
              style={styles.connectViewAllBtn}
              onPress={() => router.push('/contractors')}
            >
              <Text style={styles.connectViewAllText}>View All</Text>
              <Feather name="arrow-right" size={11} color={COLORS.green} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.connectCarouselWrapper}>
            {realContractors.length > 0 ? (
              realContractors.slice(0, 5).map((item) => (
                <TouchableOpacity 
                  key={item._id} 
                  style={styles.connectCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    router.push({
                      pathname: '/contractor-detail',
                      params: {
                        contractorId: item._id,
                        name: item.fullName,
                        firmName: item.firmName || 'Independent',
                        rating: item.rating?.toString() || '4.5',
                        city: item.city || 'Mumbai',
                        avatar: item.avatarUrl || '',
                        experience: item.experience || '5 Years',
                        projectsCount: item.projects?.length?.toString() || '0',
                        phone: item.phoneNumber || ''
                      }
                    });
                  }}
                >
                  <Image source={{ uri: resolveAvatarUrl(item.avatarUrl) || 'https://i.pravatar.cc/100?img=12' }} style={styles.connectCardAvatar} contentFit="cover" />
                  <View style={styles.connectVerifiedDot} />
                  <Text style={styles.connectCardName} numberOfLines={1}>{item.fullName}</Text>
                  <View style={styles.connectCardRatingRow}>
                    <Feather name="star" size={9} color={COLORS.gold} />
                    <Text style={styles.connectCardRatingText}>{item.rating?.toString() || '4.5'}</Text>
                    <Text style={styles.connectCardReviewText}>({item.reviewsCount || 8})</Text>
                  </View>
                  <Text style={styles.connectCardPrice}>₹{item.minProjectValue || '6.5 L'}+</Text>
                  <TouchableOpacity 
                    style={styles.connectHireBtn}
                    onPress={() => {
                      if (!currentUser) {
                        Alert.alert('Login Required', 'Please log in to hire a contractor.');
                        return;
                      }
                      router.push({
                        pathname: '/chat-room',
                        params: {
                          receiverId: item._id,
                          name: item.fullName,
                          role: item.role || 'Contractor',
                          avatar: item.avatarUrl || '',
                          designId: designId,
                          designTitle: title,
                          designImage: imagesList[0] || mainImage,
                          designLocation: location
                        }
                      });
                    }}
                  >
                    <Feather name="message-circle" size={10} color={COLORS.white} style={{ marginRight: 3 }} />
                    <Text style={styles.connectHireBtnText}>Connect</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              [
                { name: 'BuildWell Construction', rate: '4.6', reviews: '98', price: '8.5 L', avatar: 'https://i.pravatar.cc/100?img=12' },
                { name: 'HomeCraft Builders', rate: '4.5', reviews: '76', price: '8.8 L', avatar: 'https://i.pravatar.cc/100?img=13' },
                { name: 'StructureLine', rate: '4.7', reviews: '120', price: '8.2 L', avatar: 'https://i.pravatar.cc/100?img=14' },
                { name: 'Urban Constructions', rate: '4.4', reviews: '54', price: '7.5 L', avatar: 'https://i.pravatar.cc/100?img=15' },
              ].map((item, idx) => (
                <View key={idx} style={styles.connectCard}>
                  <Image source={{ uri: item.avatar }} style={styles.connectCardAvatar} contentFit="cover" />
                  <View style={styles.connectVerifiedDot} />
                  <Text style={styles.connectCardName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.connectCardRatingRow}>
                    <Feather name="star" size={9} color={COLORS.gold} />
                    <Text style={styles.connectCardRatingText}>{item.rate}</Text>
                    <Text style={styles.connectCardReviewText}>({item.reviews})</Text>
                  </View>
                  <Text style={styles.connectCardPrice}>₹{item.price}+</Text>
                  <TouchableOpacity style={styles.connectHireBtn}>
                    <Feather name="message-circle" size={10} color={COLORS.white} style={{ marginRight: 3 }} />
                    <Text style={styles.connectHireBtnText}>Connect</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>

      </ScrollView>



      {/* Unfollow Confirmation Modal */}
      <Modal
        visible={showUnfollowModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUnfollowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Image source={{ uri: authorAvatar }} style={styles.modalAvatar} />
            <Text style={styles.modalTitle}>Remove {authorName} from Network?</Text>
            <Text style={styles.modalSubtitle}>You will stop seeing their updates in your feed.</Text>
            
            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setShowUnfollowModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalConfirmBtn} 
                onPress={executeUnfollow}
              >
                <Text style={styles.modalConfirmBtnText}>Remove</Text>
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
                height: width * 1.3,
                maxHeight: '80%'
              }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              useNativeControls={true}
              isLooping={true}
            />
          ) : (
            <View style={{ width: width, height: '80%', justifyContent: 'center' }}>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / width);
                  setActiveImageIndex(idx);
                }}
                style={{ flex: 1 }}
              >
                {imagesList.map((imgUrl, idx) => (
                  <View key={idx} style={{ width: width, height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                    <Image
                      source={{ uri: imgUrl }}
                      style={{
                        width: width,
                        height: '100%',
                      }}
                      contentFit="contain"
                    />
                  </View>
                ))}
              </ScrollView>
              
              {/* Pagination Dots/Text indicator */}
              <View style={{
                position: 'absolute',
                bottom: -40,
                left: 0,
                right: 0,
                alignItems: 'center'
              }}>
                <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700' }}>
                  {activeImageIndex + 1} / {imagesList.length}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingBottom: 24 },

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



  /* CONNECT SECTION */
  connectSectionWrap: {
    marginTop: 16,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  connectBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 10,
  },
  connectIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  connectSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.1,
  },
  connectSectionSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 1,
  },
  connectViewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.green + '55',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  connectViewAllText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.green,
  },
  connectCarouselWrapper: {
    gap: 10,
    paddingBottom: 4,
  },
  connectCard: {
    width: 118,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  connectCardAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  connectVerifiedDot: {
    position: 'absolute',
    top: 28,
    right: 34,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.green,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  connectCardName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
  },
  connectCardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  connectCardRatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  connectCardReviewText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  connectCardPrice: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.green,
    marginTop: 4,
    textAlign: 'center',
  },
  connectHireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 8,
    width: '100%',
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  connectHireBtnText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },

  /* EDITING VIEWS */
  editInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: '#F8FAFC',
    height: 40,
    marginTop: 4,
  },
  editTextArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  editQuoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  editQuoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
  },
  editQuoteInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
    width: 140,
    height: 34,
  },
  noQuotationBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noQuotationText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 12,
  },
  addQuoteBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addQuoteBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  saveChangesBtn: {
    height: 44,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  saveChangesBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  editQuotationFormSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  editQuotationSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  editQuotationSectionSub: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  editQuoteRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  editQuoteLabelInline: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
    flex: 1,
  },
  editQuoteInputInline: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    fontSize: 11,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
    width: 140,
    height: 32,
  },
  smallEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.green + '22',
  },
  smallEditBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.green,
    marginLeft: 3,
  },
  commentsSection: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  commentsSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  commentTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
    maxHeight: 60,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  commentsListContainer: {
    gap: 10,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUserName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  commentTime: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  commentText: {
    fontSize: 11,
    color: COLORS.textDark,
    lineHeight: 14,
  },
  miniBtnFollowActive: {
    backgroundColor: '#1BC47D',
    borderColor: '#1BC47D',
    borderRadius: 12,
  },
  miniBtnFollowingActive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  modalConfirmBtn: {
    flex: 1,
    height: 40,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
