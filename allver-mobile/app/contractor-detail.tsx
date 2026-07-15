import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Share, Linking, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';
import { useTranslation } from '../utils/i18n';
import SocketService from '../utils/SocketService';


const { width } = Dimensions.get('window');

const PROJECT_TYPE_IMAGES: Record<string, string> = {
  'Residential': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80',
  'Commercial': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80',
  'Interior': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80',
  'Renovation': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=300&q=80',
  'General': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80',
};

const COLORS = {
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  greenDark: '#16A34A',
  purple: '#6366F1',
  purpleLight: '#EEF2FF',
  navy: '#0F172A',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F3F4F6',
  gold: '#F59E0B',
};

// Mock Team Members
const TEAM_MEMBERS = [
  { id: '60c72b2f9b1d8a2a4c8b0004', name: 'Ramesh Yadav', role: 'Site Supervisor', experience: '8 Years', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop' },
  { id: '60c72b2f9b1d8a2a4c8b0005', name: 'Suresh Patil', role: 'Mason', experience: '10 Years', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop' },
  { id: '60c72b2f9b1d8a2a4c8b0006', name: 'Ravi Singh', role: 'Carpenter', experience: '7 Years', avatar: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=150&auto=format&fit=crop' },
  { id: '60c72b2f9b1d8a2a4c8b0007', name: 'Imran Shaikh', role: 'Electrician', experience: '6 Years', avatar: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?q=80&w=150&auto=format&fit=crop' },
  { id: '60c72b2f9b1d8a2a4c8b0008', name: 'Mahesh Gupta', role: 'Plumber', experience: '9 Years', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop' },
  { id: '60c72b2f9b1d8a2a4c8b0009', name: 'Anil Naik', role: 'Painter', experience: '5 Years', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop' }
];

export default function ContractorDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();


  // Load params with fallbacks
  const id = (params.id as string) || '60c72b2f9b1d8a2a4c8b0010';
  const name = (params.name as string) || 'Raj Construction Services';
  const avatar = resolveAvatarUrl(params.avatar as string) || '';
  const coverImage = resolveAvatarUrl(params.coverImage as string) || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop';
  const rating = (params.rating as string) || '4.8';
  const reviews = (params.reviews as string) || '124';
  const location = (params.location as string) || 'Mumbai, Maharashtra';
  const experience = (params.experience as string) || '12+ Years';
  const specialization = (params.specialization as string) || 'Specialized in residential and commercial construction with quality and timely delivery.';
  const projects = (params.projects as string) || '0';
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
  const [followerCountVal, setFollowerCountVal] = useState<number>(parseInt(followers, 10) || 0);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [labours, setLabours] = useState<any[]>([]);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [realProjects, setRealProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [professionalData, setProfessionalData] = useState<any>(null);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const [userUploadedPosts, setUserUploadedPosts] = useState<any[]>([]);

  const displayCoverImage = resolveAvatarUrl(professionalData?.cover || professionalData?.coverImage, professionalData?.updatedAt) || coverImage;
  const displayAvatar = resolveAvatarUrl(professionalData?.avatarUrl || professionalData?.avatar, professionalData?.updatedAt) || avatar;

  // Listen for real-time profile updates
  useEffect(() => {
    if (!id) return;

    const handleProfileUpdated = (data: any) => {
      if (data && data.userId === id && data.user) {
        console.log('[ContractorDetail] Real-time profile update received:', data.user);
        setProfessionalData(data.user);
        if (data.user.followersCount !== undefined) {
          setFollowerCountVal(data.user.followersCount);
        }
        
        // Instant reload of reviews, highlights, and team members
        fetchReviews(id);
        
        fetch(`${BACKEND_URL}/api/professional/${id}/portfolio-highlights`)
          .then(res => res.json())
          .then(hlData => {
            if (hlData.portfolioHighlights) setPortfolioProjects(hlData.portfolioHighlights);
          }).catch(err => console.error('Error reloading highlights:', err));

        fetch(`${BACKEND_URL}/api/professional/${id}/team`)
          .then(res => res.json())
          .then(tData => {
            if (tData.team) setTeamMembers(tData.team);
          }).catch(err => console.error('Error reloading team:', err));
      }
    };

    const handleUserStatsUpdated = (data: any) => {
      if (data && data.userId === id) {
        console.log('[ContractorDetail] Real-time stats update received:', data);
        if (data.followersCount !== undefined) {
          setFollowerCountVal(data.followersCount);
        }
      }
    };

    const handleWorkspaceUpdated = (data: any) => {
      if (data && data.workspaceId) {
        setRealProjects((prevList) => {
          return prevList.map((w: any) => {
            if (w._id === data.workspaceId) {
              return {
                ...w,
                ...data.workspace
              };
            }
            return w;
          });
        });
      }
    };

    SocketService.on('profile_updated', handleProfileUpdated);
    SocketService.on('user_stats_updated', handleUserStatsUpdated);
    SocketService.on('workspace_updated', handleWorkspaceUpdated);

    return () => {
      SocketService.off('profile_updated', handleProfileUpdated);
      SocketService.off('user_stats_updated', handleUserStatsUpdated);
      SocketService.off('workspace_updated', handleWorkspaceUpdated);
    };
  }, [id]);

  useEffect(() => {
    if (realProjects && realProjects.length > 0) {
      realProjects.forEach((w: any) => {
        if (w._id) {
          SocketService.emit('join_room', { roomId: w._id });
        }
      });
    }
  }, [realProjects]);

  useEffect(() => {
    if (id) {
      fetch(`${BACKEND_URL}/api/professional/${id}/portfolio-highlights`)
        .then(res => res.json())
        .then(data => {
          if (data.portfolioHighlights) {
            setPortfolioProjects(data.portfolioHighlights);
          }
        })
        .catch(err => console.error("Error fetching portfolio highlights:", err));
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      setIsLoadingProjects(true);
      fetch(`${BACKEND_URL}/api/project-workspaces/user/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.workspaces) {
            setRealProjects(data.workspaces.filter((w: any) => w.projectType !== 'Team'));
          }
          setIsLoadingProjects(false);
        })
        .catch(err => {
          console.error("Error fetching contractor projects:", err);
          setIsLoadingProjects(false);
        });
    }
  }, [id]);

  // Direct Hire Modal states
  const [isHireModalVisible, setIsHireModalVisible] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCategory, setProjectCategory] = useState('Residential');
  const [projectLocation, setProjectLocation] = useState('');
  const [projectBudget, setProjectBudget] = useState('');
  const [projectTimeline, setProjectTimeline] = useState('');
  const [projectDetails, setProjectDetails] = useState('');
  const [isHiring, setIsHiring] = useState(false);

  // Set default location when professional location becomes available
  useEffect(() => {
    if (location) {
      setProjectLocation(location);
    }
  }, [location]);

  const handleHireSubmit = async () => {
    if (!projectName.trim()) {
      Alert.alert('Required', 'Please enter a project name.');
      return;
    }
    if (!projectCategory.trim()) {
      Alert.alert('Required', 'Please select a project category.');
      return;
    }
    if (!projectLocation.trim()) {
      Alert.alert('Required', 'Please enter project location.');
      return;
    }
    if (!projectBudget.trim()) {
      Alert.alert('Required', 'Please enter estimated budget.');
      return;
    }
    if (!projectTimeline.trim()) {
      Alert.alert('Required', 'Please enter project timeline.');
      return;
    }
    if (!currentUser?._id) {
      Alert.alert('Login Required', 'Please log in to hire this professional.');
      return;
    }

    setIsHiring(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/contract-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: currentUser._id,
          professional: id,
          title: projectName.trim(),
          projectType: projectCategory,
          location: projectLocation.trim(),
          budget: projectBudget.trim(),
          timeline: projectTimeline.trim(),
          description: projectDetails.trim(),
          senderId: currentUser._id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error sending hire request');
      }

      setIsHireModalVisible(false);
      setProjectName('');
      setProjectCategory('Residential');
      setProjectLocation(location || '');
      setProjectBudget('');
      setProjectTimeline('');
      setProjectDetails('');
      Alert.alert(
        'Request Sent!',
        `Your hire request has been sent to ${name}. You will be notified once they accept it.`,
        [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)')
          }
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not send the hire request.');
    } finally {
      setIsHiring(false);
    }
  };

  const fetchReviews = async (userId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/reviews/${userId}`);
      const data = await res.json();
      if (data.reviews) {
        setReviewsList(data.reviews);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) { const w = Math.floor(diffDays / 7); return `${w} week${w > 1 ? 's' : ''} ago`; }
    const m = Math.floor(diffDays / 30); return `${m} month${m > 1 ? 's' : ''} ago`;
  };

  const getLatestReviewByRole = (targetRole: 'Client' | 'Contractor' | 'Architect') => {
    const realReview = reviewsList.find(r => r.from && r.from.role === targetRole);
    if (realReview) {
      return { name: realReview.from.fullName, role: realReview.from.role, rating: realReview.rating, comment: realReview.reviewText, avatar: resolveAvatarUrl(realReview.from.avatarUrl) || 'https://i.pravatar.cc/100?img=32', date: formatDate(realReview.createdAt) };
    }
    return null;
  };

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

  useEffect(() => {
    if (id) {
      // Fetch live user info (followers count and profile detail for media etc.)
      fetch(`${BACKEND_URL}/api/professional/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.professional) {
            setProfessionalData(data.professional);
            setFollowerCountVal(data.professional.followersCount || 0);
          }
        })
        .catch(err => console.error("Error fetching professional info:", err));

      // Fetch user uploaded posts (discover + design)
      fetch(`${BACKEND_URL}/api/posts/user/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.posts) {
            setUserUploadedPosts(data.posts);
          }
        })
        .catch(err => console.error("Error fetching uploaded posts:", err));

      // Fetch team members
      fetch(`${BACKEND_URL}/api/professional/${id}/team`)
        .then(res => res.json())
        .then(data => {
          if (data.team) {
            setLabours(data.team);
          }
        })
        .catch(err => console.error("Error fetching professional team:", err));

      // Fetch reviews
      fetchReviews(id);
    }
  }, [id]);

  useEffect(() => {
    if (currentUser?._id && id) {
      // Fetch follow status
      fetch(`${BACKEND_URL}/api/follow/status/${id}?followerId=${currentUser._id}`)
        .then(res => res.json())
        .then(data => {
          setIsFollowing(!!data.isFollowing);
        })
        .catch(err => console.error("Error fetching follow status:", err));
    }
  }, [currentUser, id]);

  const getCombinedMedia = () => {
    const list: { type: 'image' | 'video'; url: string; source: 'portfolio' | 'project' }[] = [];

    // Map userUploadedPosts (discover feed media + design section layouts)
    if (userUploadedPosts && Array.isArray(userUploadedPosts)) {
      userUploadedPosts.forEach((post: any) => {
        const titleStr = post.title || '';
        const descStr = post.description || '';
        if (/project update|progress update/i.test(titleStr) || /project update|progress update/i.test(descStr)) {
          return; // Skip project updates
        }

        if (post.mediaUrls && Array.isArray(post.mediaUrls)) {
          post.mediaUrls.forEach((url: string) => {
            const isVideo = /\.(mp4|mov|m4v|3gp|avi|webm|mkv)/i.test(url) || url.includes('/video/') || url.includes('video') || url.includes('mp4');
            list.push({
              type: isVideo ? 'video' : 'image',
              url: resolveAvatarUrl(url),
              source: 'portfolio'
            });
          });
        }
      });
    }

    if (professionalData?.portfolioImages && Array.isArray(professionalData.portfolioImages)) {
      professionalData.portfolioImages.forEach((img: string) => {
        const resolvedUrl = resolveAvatarUrl(img);
        if (img && !list.some(item => item.url === resolvedUrl)) {
          list.push({ type: 'image', url: resolvedUrl, source: 'portfolio' });
        }
      });
    }

    return list;
  };

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
    // Optimistic update
    setIsFollowing(true);
    setFollowerCountVal(prev => prev + 1);

    try {
      const response = await fetch(`${BACKEND_URL}/api/follow/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: currentUser._id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error following user');
      }
    } catch (error: any) {
      // Rollback
      setIsFollowing(false);
      setFollowerCountVal(prev => Math.max(0, prev - 1));
      Alert.alert('Error', error.message || 'Could not follow user.');
    }
  };

  const executeUnfollow = async () => {
    setShowUnfollowModal(false);
    
    // Optimistic update
    setIsFollowing(false);
    setFollowerCountVal(prev => Math.max(0, prev - 1));

    try {
      const response = await fetch(`${BACKEND_URL}/api/unfollow/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followerId: currentUser._id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error unfollowing user');
      }
    } catch (error: any) {
      // Rollback
      setIsFollowing(true);
      setFollowerCountVal(prev => prev + 1);
      Alert.alert('Error', error.message || 'Could not unfollow user.');
    }
  };

  const isOwnProfile = currentUser && currentUser._id === id;

  const handleShare = async () => {
    try {
      const profileUrl = `https://allver.onrender.com/contractor/${id}`;
      await Share.share({
        message: `Check out ${name} on Allver: Specialists in construction from ${location}. Contact: ${phone}\nLink: ${profileUrl}`,
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

  const handleLabourClick = (worker: any) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push({
      pathname: '/labour-detail',
      params: {
        id: worker._id || worker.id || '',
        name: worker.fullName || worker.name,
        role: worker.skillType || worker.role,
        avatar: worker.avatarUrl || worker.avatar,
        experience: worker.experience,
        contractorName: name,
        rating: worker.rating?.toString() || '4.8',
        reviews: worker.reviews?.toString() || '124',
        location: worker.city || worker.location || 'Mumbai, Maharashtra'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header Row over Cover */}
      <View style={styles.navHeader}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }} 
          style={styles.circleHeaderBtn}
        >
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
          <Image source={{ uri: displayCoverImage }} style={styles.coverImage} contentFit="cover" />
          <View style={styles.avatarWrapper}>
            <Image source={displayAvatar ? { uri: displayAvatar } : require('../assets/android-icon-foreground.png')} style={styles.avatarImage} contentFit={displayAvatar ? "cover" : "contain"} />
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={12} color={COLORS.white} />
            </View>
          </View>
        </View>

        {/* Profile Info Details Block */}
        <View style={styles.profileDetailsBlock}>
          <View style={styles.nameSection}>
            <Text style={styles.profileName}>{name}</Text>
            <TouchableOpacity 
              style={styles.followersContainer}
              onPress={() => {
                router.push({
                  pathname: '/followers-list',
                  params: { userId: id, type: 'followers', userName: name }
                });
              }}
            >
              <Feather name="users" size={14} color={COLORS.textMuted} />
              <Text style={styles.followersText}>{followerCountVal} Networks</Text>
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
                <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '700' }}>{t('editProfileInfo')}</Text>
              </TouchableOpacity>
              <Text style={{ textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 8 }}>
                {t('publicProfileDesc')}
              </Text>
            </View>
          ) : (
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={[styles.followBtn, isFollowing && styles.followingBtn]} 
                onPress={handleFollowPress}
              >
                <Feather name={isFollowing ? "check" : "user-plus"} size={12} color={isFollowing ? COLORS.textDark : COLORS.white} style={{ marginRight: 4 }} />
                <Text style={[styles.followBtnText, isFollowing && { color: COLORS.textDark }]}>
                  {isFollowing ? t('inNetwork') : t('addToNetwork')}
                </Text>
              </TouchableOpacity>

              {currentUser?.role === 'Client' ? (
                <TouchableOpacity 
                  style={[styles.outlineActionBtn, { borderColor: COLORS.green, backgroundColor: COLORS.greenLight }]} 
                  onPress={() => setIsHireModalVisible(true)}
                >
                  <Feather name="briefcase" size={12} color={COLORS.green} style={{ marginRight: 4 }} />
                  <Text style={[styles.outlineActionText, { color: COLORS.green, fontWeight: '700' }]}>{t('hire')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.outlineActionBtn} onPress={handleWhatsApp}>
                  <FontAwesome5 name="whatsapp" size={12} color={COLORS.green} style={{ marginRight: 4 }} />
                  <Text style={styles.outlineActionText}>{t('chat')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.outlineActionBtn, { borderColor: COLORS.blue, backgroundColor: '#EFF6FF' }]} 
                onPress={() => {
                  if (!currentUser) {
                    Alert.alert('Login Required', 'Please log in to send messages.');
                    return;
                  }
                  router.push({
                    pathname: '/chat-room',
                    params: {
                      receiverId: id,
                      name: name,
                      role: 'Contractor',
                      avatar: avatar,
                    }
                  });
                }}
              >
                <Feather name="message-circle" size={12} color={COLORS.blue} style={{ marginRight: 4 }} />
                <Text style={[styles.outlineActionText, { color: COLORS.blue }]}>{t('message')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* About Section */}
          <View style={styles.aboutSection}>
            <Text style={styles.sectionHeaderTitle}>{t('about')}</Text>
            <Text style={styles.aboutParagraphText} numberOfLines={showFullAbout ? undefined : 3}>
              {specialization} We are a trusted team of construction professionals specializing in residential and commercial building projects. From concrete foundation slab pouring to structural brickwork, plumbing, electrical wiring, and high-end interior woodworking, we deliver standard results ahead of schedule.
            </Text>
            <TouchableOpacity onPress={() => setShowFullAbout(!showFullAbout)}>
              <Text style={styles.readMoreText}>{showFullAbout ? 'Read Less' : 'Read More'}</Text>
            </TouchableOpacity>
          </View>

          {/* Skills & Expertise */}
          <View style={styles.specializationSection}>
            <Text style={styles.sectionHeaderTitle}>{t('skills')}</Text>
            <View style={styles.specializationsWrap}>
              {skillsList.map((spec, index) => (
                <View key={index} style={styles.specTag}>
                  <Text style={styles.specTagText}>{spec}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ================= PORTFOLIO HIGHLIGHTS ================= */}
          {portfolioProjects.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textDark }}>{t('portfolioHighlights')}</Text>
                <TouchableOpacity onPress={() => router.push({ pathname: '/portfolio-highlights', params: { userId: id } })}>
                  <Text style={{ fontSize: 13, color: COLORS.gold, fontWeight: '700' }}>{t('viewAll')} ›</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
                {portfolioProjects.map((item, index) => {
                  const image = (item.mediaUrls && item.mediaUrls.length > 0) ? item.mediaUrls[0] : (PROJECT_TYPE_IMAGES[item.projectType] || PROJECT_TYPE_IMAGES['General']);
                  return (
                    <View key={item._id || index} style={{ alignItems: 'center', width: 72 }}>
                      <TouchableOpacity 
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: 14,
                          borderWidth: 2.5,
                          borderColor: '#F59E0B',
                          padding: 2,
                          backgroundColor: '#FFFFFF',
                          justifyContent: 'center',
                          alignItems: 'center',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.08,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                        onPress={() => router.push({ pathname: '/portfolio-highlights', params: { userId: id } })}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: image }} style={{ width: '100%', height: '100%', borderRadius: 10 }} contentFit="cover" />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#334155', marginTop: 6, textAlign: 'center', width: '100%' }} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Sub-Tabs Navigation Segment Control */}
          <View style={styles.tabSegmentContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'projects' && styles.activeTabButton]}
              onPress={() => setActiveTab('projects')}
            >
              <Feather name="grid" size={16} color={activeTab === 'projects' ? COLORS.blue : COLORS.textMuted} />
              <Text style={[styles.tabButtonText, activeTab === 'projects' && styles.activeTabButtonText]}>{t('projects')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'media' && styles.activeTabButton]}
              onPress={() => setActiveTab('media')}
            >
              <Feather name="play-circle" size={16} color={activeTab === 'media' ? COLORS.blue : COLORS.textMuted} />
              <Text style={[styles.tabButtonText, activeTab === 'media' && styles.activeTabButtonText]}>{t('media')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'team' && styles.activeTabButton]}
              onPress={() => setActiveTab('team')}
            >
              <Feather name="users" size={16} color={activeTab === 'team' ? COLORS.blue : COLORS.textMuted} />
              <Text style={[styles.tabButtonText, activeTab === 'team' && styles.activeTabButtonText]}>{t('team')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'reviews' && styles.activeTabButton]}
              onPress={() => setActiveTab('reviews')}
            >
              <Feather name="star" size={16} color={activeTab === 'reviews' ? COLORS.blue : COLORS.textMuted} />
              <Text style={[styles.tabButtonText, activeTab === 'reviews' && styles.activeTabButtonText]}>{t('reviews')}</Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Tab Content Area */}
          <View style={styles.tabContentArea}>
            
            {/* PROJECTS TAB */}
            {activeTab === 'projects' && (
              <View style={styles.projectsListCol}>
                {isLoadingProjects ? (
                  <ActivityIndicator size="small" color={COLORS.blue} style={{ padding: 20 }} />
                ) : realProjects.length === 0 ? (
                  <Text style={{ textAlign: 'center', padding: 20, color: COLORS.textMuted }}>{t('noPerformedProjects')}</Text>
                ) : (
                  realProjects.map((w: any, idx) => {
                    const isCompleted = w.status === 'Completed';
                    const isCancelled = w.status === 'Cancelled';
                    const statusText = isCompleted ? t('completed') : isCancelled ? t('cancelled') : t('ongoing');
                    const image = w.projectType === 'Interior' 
                      ? 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=200&q=80' 
                      : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80';

                    return (
                      <View key={w._id || idx} style={styles.projectListItem}>
                        <Image source={{ uri: image }} style={styles.projectListImg} contentFit="cover" />
                        <View style={styles.projectListDetails}>
                          <Text style={styles.projectListName}>{w.title}</Text>
                          <Text style={styles.projectListLoc}>{w.contractRequest?.location || 'Thane'}</Text>
                          
                          <View style={[
                            styles.statusBadge, 
                            isCompleted ? styles.statusCompleted : isCancelled ? styles.statusCancelled : styles.statusProgress
                          ]}>
                            <View style={[
                              styles.statusDot, 
                              { backgroundColor: isCompleted ? COLORS.green : isCancelled ? '#EF4444' : '#F59E0B' }
                            ]} />
                            <Text style={[
                              styles.statusBadgeText, 
                              isCompleted ? { color: COLORS.green } : isCancelled ? { color: '#EF4444' } : { color: '#F59E0B' }
                            ]}>
                              {statusText}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* MEDIA TAB */}
            {activeTab === 'media' && (
              <View style={styles.mediaGrid}>
                {getCombinedMedia().length === 0 ? (
                  <Text style={{ textAlign: 'center', width: '100%', padding: 20, color: COLORS.textMuted }}>No media uploaded yet.</Text>
                ) : (
                  getCombinedMedia().map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.mediaCard}
                      onPress={() => {
                        Linking.openURL(item.url).catch(err => console.error("Couldn't open URL", err));
                      }}
                    >
                      <Image source={{ uri: item.url }} style={styles.mediaThumbnail} contentFit="cover" />
                      {item.type === 'video' && (
                        <View style={styles.videoPlayOverlay}>
                          <Feather name="play" size={24} color={COLORS.white} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {/* TEAM TAB */}
            {activeTab === 'team' && (
              <View style={styles.teamListCol}>
                {labours.length === 0 ? (
                  <Text style={{ textAlign: 'center', padding: 20, color: COLORS.textMuted }}>No team members available.</Text>
                ) : (
                  labours.map((worker, idx) => {
                    const workerName = worker.fullName || worker.name;
                    const workerRole = worker.skillType || worker.role;
                    const workerAvatar = resolveAvatarUrl(worker.avatarUrl || worker.avatar) || 'https://i.pravatar.cc/100?img=32';
                    const workerExp = worker.experience || 'No';
                    return (
                      <TouchableOpacity 
                        key={idx} 
                        style={styles.teamListItem} 
                        activeOpacity={0.8}
                        onPress={() => handleLabourClick(worker)}
                      >
                        <Image source={{ uri: workerAvatar }} style={styles.teamMemberAvatar} contentFit="cover" />
                        <View style={styles.teamMemberDetails}>
                          <Text style={styles.teamMemberName}>{workerName}</Text>
                          <Text style={styles.teamMemberRole}>{workerRole} • {workerExp} Exp</Text>
                        </View>
                        <View style={styles.availabilityBadge}>
                          <Text style={styles.availabilityText}>{worker.availability || 'Available'}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <View style={styles.reviewsListCol}>
                <View style={styles.ratingBreakdownBox}>
                  <View style={styles.ratingOverallCol}>
                    <Text style={styles.overallRatingValue}>{reviewsList.length > 0 ? (reviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsList.length).toFixed(1) : '0.0'}</Text>
                    <View style={styles.overallStarsRow}>
                      {[1, 2, 3, 4, 5].map((s) => {
                        const avg = reviewsList.length > 0 ? reviewsList.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsList.length : 0;
                        return (
                          <Feather key={s} name="star" size={14} color={s <= Math.floor(avg) ? COLORS.gold : COLORS.border} style={{ marginRight: 2 }} />
                        );
                      })}
                    </View>
                    <Text style={styles.overallRatingReviews}>{reviewsList.length} Reviews</Text>
                  </View>
                  <View style={styles.ratingProgressCol}>
                    {(() => {
                      const starCounts: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
                      reviewsList.forEach((r: any) => {
                        const s = Math.round(r.rating).toString();
                        if (s in starCounts) starCounts[s] += 1;
                      });
                      const totalCount = reviewsList.length || 1;
                      return ['5', '4', '3', '2', '1'].map((stars) => {
                        const count = starCounts[stars];
                        const percentage = (count / totalCount) * 100;
                        return (
                          <View key={stars} style={styles.ratingProgressRow}>
                            <Text style={styles.rowStarText}>{stars}★</Text>
                            <View style={styles.rowProgressBarBg}>
                              <View style={[styles.rowProgressBarFill, { width: `${percentage}%` }]} />
                            </View>
                            <Text style={styles.rowStarCount}>{count}</Text>
                          </View>
                        );
                      });
                    })()}
                  </View>
                </View>

                {/* Role Reviews Highlight */}
                {reviewsList.length > 0 && (
                  <>
                    <Text style={styles.roleSectionTitle}>Role Reviews Highlight</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleHighlightsContainer} style={{ marginBottom: 8 }}>
                      {['Client', 'Contractor', 'Architect'].map((r) => {
                        const item = getLatestReviewByRole(r as any);
                        if (!item) return null;
                        let badgeBg = COLORS.greenLight;
                        let badgeText = COLORS.green;
                        if (r === 'Contractor') { badgeBg = COLORS.blueLight; badgeText = COLORS.blue; }
                        else if (r === 'Architect') { badgeBg = COLORS.purpleLight; badgeText = COLORS.purple; }
                        return (
                          <View key={r} style={styles.roleHighlightCard}>
                            <View style={styles.roleCardHeader}>
                              <View style={[styles.roleBadge, { backgroundColor: badgeBg }]}>
                                <Text style={[styles.roleBadgeText, { color: badgeText }]}>{r}</Text>
                              </View>
                              <View style={styles.reviewStarsRow}>
                                {[1,2,3,4,5].map((s) => (
                                  <FontAwesome5 key={s} name="star" solid={s <= item.rating} size={10} color={s <= item.rating ? COLORS.gold : COLORS.border} style={{ marginRight: 1 }} />
                                ))}
                              </View>
                            </View>
                            <View style={styles.roleCardUserRow}>
                              <Image source={{ uri: item.avatar }} style={styles.roleCardAvatar} contentFit="cover" />
                              <View style={styles.roleCardUserMeta}>
                                <Text style={styles.roleCardUserName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.roleCardDate}>{item.date}</Text>
                              </View>
                            </View>
                            <Text style={styles.roleCardComment} numberOfLines={3}>{item.comment}</Text>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </>
                )}

                {/* All Reviews */}
                <Text style={styles.roleSectionTitle}>All Reviews</Text>
                {reviewsList.length > 0 ? reviewsList.map((r: any, idx: number) => {
                  const item = {
                    name: r.from?.fullName || 'Anonymous',
                    date: formatDate(r.createdAt),
                    rating: r.rating,
                    comment: r.reviewText,
                    avatar: resolveAvatarUrl(r.from?.avatarUrl) || 'https://i.pravatar.cc/100?img=32'
                  };
                  return (
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
                  );
                }) : (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Feather name="star" size={32} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ color: COLORS.textMuted, fontSize: 14, fontWeight: '600' }}>No reviews yet</Text>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4, textAlign: 'center' }}>Reviews will appear here once clients collaborate on projects.</Text>
                  </View>
                )}
              </View>
            )}

          </View>
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
            <Image source={{ uri: avatar }} style={styles.modalAvatar} />
            <Text style={styles.modalTitle}>Remove {name} from Network?</Text>
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

      {/* Direct Hire Confirmation Modal */}
      <Modal
        visible={isHireModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsHireModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: width * 0.9, maxHeight: '80%' }]}>
            <Text style={[styles.modalTitle, { marginBottom: 4 }]}>Hire {name}</Text>
            <Text style={[styles.modalSubtitle, { marginBottom: 16 }]}>Specify project details to start a workspace.</Text>

            <ScrollView 
              style={{ width: '100%', marginBottom: 16 }}
              contentContainerStyle={{ alignItems: 'stretch' }}
              showsVerticalScrollIndicator={true}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 }}>Project Name</Text>
              <TextInput
                style={styles.hireModalInput}
                placeholder="e.g., Panvel Villa Construction"
                placeholderTextColor={COLORS.textMuted}
                value={projectName}
                onChangeText={setProjectName}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 }}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {['Residential', 'Commercial', 'Renovation', 'Interior', 'Electrical', 'Plumbing', 'General'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 15,
                      borderWidth: 1,
                      borderColor: projectCategory === cat ? COLORS.green : COLORS.border,
                      backgroundColor: projectCategory === cat ? '#E8F5E9' : COLORS.bgLight,
                    }}
                    onPress={() => setProjectCategory(cat)}
                  >
                    <Text style={{ fontSize: 12, color: projectCategory === cat ? COLORS.green : COLORS.textDark, fontWeight: projectCategory === cat ? '700' : 'normal' }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 }}>Location</Text>
              <TextInput
                style={styles.hireModalInput}
                placeholder="e.g., Panvel, Maharashtra"
                placeholderTextColor={COLORS.textMuted}
                value={projectLocation}
                onChangeText={setProjectLocation}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 }}>Estimated Budget</Text>
              <TextInput
                style={styles.hireModalInput}
                placeholder="e.g., ₹5,00,000"
                placeholderTextColor={COLORS.textMuted}
                value={projectBudget}
                onChangeText={setProjectBudget}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 }}>Timeline</Text>
              <TextInput
                style={styles.hireModalInput}
                placeholder="e.g., 3 Months or Immediate"
                placeholderTextColor={COLORS.textMuted}
                value={projectTimeline}
                onChangeText={setProjectTimeline}
              />

              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 }}>Project Description (Optional)</Text>
              <TextInput
                style={[styles.hireModalInput, styles.hireModalInputMultiline]}
                placeholder="Describe requirements, scope of work, etc."
                placeholderTextColor={COLORS.textMuted}
                value={projectDetails}
                onChangeText={setProjectDetails}
                multiline={true}
                numberOfLines={4}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => {
                  setIsHireModalVisible(false);
                  setProjectName('');
                  setProjectCategory('Residential');
                  setProjectLocation(location || '');
                  setProjectBudget('');
                  setProjectTimeline('');
                  setProjectDetails('');
                }}
                disabled={isHiring}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalConfirmBtn, styles.hireModalSubmitBtn, isHiring && { opacity: 0.7 }]} 
                onPress={handleHireSubmit}
                disabled={isHiring}
              >
                {isHiring ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={[styles.modalConfirmBtnText, styles.hireModalSubmitBtnText]}>Hire</Text>
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
    height: 32,
    backgroundColor: '#1BC47D', // Premium green accent
    borderRadius: 16, // Curved borders
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingBtn: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  followBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  outlineActionBtn: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  outlineActionText: { color: COLORS.textDark, fontSize: 12, fontWeight: '600' },

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
  statusCancelled: { backgroundColor: '#FEF2F2' },
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
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
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
    height: 44,
    backgroundColor: '#EF4444',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  roleSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  roleHighlightsContainer: {
    paddingRight: 16,
    paddingBottom: 8,
    gap: 12,
  },
  roleHighlightCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    width: 250,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  roleCardUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleCardAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  roleCardUserMeta: {
    flex: 1,
  },
  roleCardUserName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  roleCardDate: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  roleCardComment: {
    fontSize: 12,
    color: COLORS.textDark,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  hireModalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: COLORS.bgLight,
    marginBottom: 16,
  },
  hireModalInputMultiline: {
    height: 100,
    textAlignVertical: 'top',
  },
  hireModalSubmitBtn: {
    backgroundColor: COLORS.green,
  },
  hireModalSubmitBtnText: {
    color: COLORS.white,
  },
});
