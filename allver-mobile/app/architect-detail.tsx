import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Share, Linking, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Video, ResizeMode } from 'expo-av';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';

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
  const architectId = (params.id as string) || '60c72b2f9b1d8a2a4c8b0001';
  const name = (params.name as string) || 'Ar. Neha Sharma';
  const avatar = resolveAvatarUrl(params.avatar as string) || '';
  const coverImage = resolveAvatarUrl(params.coverImage as string) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80';
  const rating = (params.rating as string) || '4.8';
  const reviews = (params.reviews as string) || '124';
  const location = (params.location as string) || 'Mumbai, Maharashtra';
  const experience = (params.experience as string) || '8+ Years';
  const projectsCount = (params.projects as string) || '0';
  const followersCount = (params.followers as string) || '256';
  const firmName = (params.firmName as string) || 'Design Space Architects';
  const phone = (params.phone as string) || '+91 98765 43210';
  const specializationStr = (params.specialization as string) || 'Specializes in modern, sustainable and luxury architecture.';
  const role = (params.role as string) || 'Architect';

  // State
  const [activeTab, setActiveTab] = useState<'projects' | 'media' | 'team' | 'reviews'>('projects');
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [followers, setFollowers] = useState<number>(parseInt(followersCount, 10) || 0);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [reviewsList, setReviewsList] = useState<any[]>([]);
  const [realProjects, setRealProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [professionalData, setProfessionalData] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);

  useEffect(() => {
    if (architectId) {
      fetch(`${BACKEND_URL}/api/professional/${architectId}/portfolio-highlights`)
        .then(res => res.json())
        .then(data => {
          if (data.portfolioHighlights) {
            setPortfolioProjects(data.portfolioHighlights);
          }
        })
        .catch(err => console.error("Error fetching portfolio highlights:", err));
    }
  }, [architectId]);

  useEffect(() => {
    if (architectId) {
      setIsLoadingProjects(true);
      fetch(`${BACKEND_URL}/api/project-workspaces/user/${architectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.workspaces) {
            setRealProjects(data.workspaces);
          }
          setIsLoadingProjects(false);
        })
        .catch(err => {
          console.error("Error fetching architect projects:", err);
          setIsLoadingProjects(false);
        });
    }
  }, [architectId]);

  // Direct Hire Modal states
  const [isHireModalVisible, setIsHireModalVisible] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectCategory, setProjectCategory] = useState('Architecture');
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
          professional: architectId,
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
      setProjectCategory('Architecture');
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

  // Portfolio Video Modal States
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');

  const handleOpenVideo = (videoUrl: string, title: string) => {
    setSelectedVideoUrl(videoUrl);
    setSelectedVideoTitle(title);
  };

  const handleCloseVideo = () => {
    setSelectedVideoUrl(null);
    setSelectedVideoTitle('');
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
    if (architectId) {
      // Fetch live user info (followers count and profile detail for media etc.)
      fetch(`${BACKEND_URL}/api/professional/${architectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.professional) {
            setProfessionalData(data.professional);
            setFollowers(data.professional.followersCount || 0);
          }
        })
        .catch(err => console.error("Error fetching professional info:", err));

      // Fetch team members
      fetch(`${BACKEND_URL}/api/professional/${architectId}/team`)
        .then(res => res.json())
        .then(data => {
          if (data.team) {
            setTeamMembers(data.team);
          }
        })
        .catch(err => console.error("Error fetching professional team:", err));

      // Fetch reviews
      fetchReviews(architectId);
    }
  }, [architectId]);

  useEffect(() => {
    if (currentUser?._id && architectId) {
      // Fetch follow status
      fetch(`${BACKEND_URL}/api/follow/status/${architectId}?followerId=${currentUser._id}`)
        .then(res => res.json())
        .then(data => {
          setIsFollowing(!!data.isFollowing);
        })
        .catch(err => console.error("Error fetching follow status:", err));
    }
  }, [currentUser, architectId]);

  const getCombinedMedia = () => {
    const list: { type: 'image' | 'video'; url: string; source: 'portfolio' | 'project' }[] = [];

    if (professionalData?.portfolioImages && Array.isArray(professionalData.portfolioImages)) {
      professionalData.portfolioImages.forEach((img: string) => {
        if (img) {
          list.push({ type: 'image', url: resolveAvatarUrl(img), source: 'portfolio' });
        }
      });
    }

    if (realProjects && Array.isArray(realProjects)) {
      realProjects.forEach((w: any) => {
        if (w.updates && Array.isArray(w.updates)) {
          w.updates.forEach((up: any) => {
            if (up.img) {
              const imgs = up.img.split(',').map((s: string) => s.trim()).filter(Boolean);
              imgs.forEach((img: string) => {
                list.push({ type: 'image', url: resolveAvatarUrl(img), source: 'project' });
              });
            }
            if (up.video) {
              list.push({ type: 'video', url: resolveAvatarUrl(up.video), source: 'project' });
            }
          });
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
    setFollowers(prev => prev + 1);

    try {
      const response = await fetch(`${BACKEND_URL}/api/follow/${architectId}`, {
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
      setFollowers(prev => Math.max(0, prev - 1));
      Alert.alert('Error', error.message || 'Could not follow user.');
    }
  };

  const executeUnfollow = async () => {
    setShowUnfollowModal(false);
    
    // Optimistic update
    setIsFollowing(false);
    setFollowers(prev => Math.max(0, prev - 1));

    try {
      const response = await fetch(`${BACKEND_URL}/api/unfollow/${architectId}`, {
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
      setFollowers(prev => prev + 1);
      Alert.alert('Error', error.message || 'Could not unfollow user.');
    }
  };

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
            <Image source={avatar ? { uri: avatar } : require('../assets/android-icon-foreground.png')} style={styles.avatarImage} contentFit={avatar ? "cover" : "contain"} />
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={12} color={COLORS.white} />
            </View>
          </View>
        </View>

        {/* Profile Info Details Block */}
        <View style={styles.profileDetailsBlock}>
          <View style={styles.nameSection}>
            <Text style={styles.profileName}>{firmName}</Text>
            <TouchableOpacity 
              style={styles.followersContainer}
              onPress={() => {
                router.push({
                  pathname: '/followers-list',
                  params: { userId: architectId, type: 'followers', userName: firmName || name }
                });
              }}
            >
              <Feather name="users" size={14} color={COLORS.textMuted} />
              <Text style={styles.followersText}>{followers} Networks</Text>
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
              <Text style={styles.infoTagText}>{projectsCount} Projects</Text>
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
                  onPress={handleFollowPress}
                >
                  <Feather name={isFollowing ? "check" : "user-plus"} size={12} color={isFollowing ? COLORS.textDark : COLORS.white} style={{ marginRight: 4 }} />
                  <Text style={[styles.followBtnText, isFollowing && { color: COLORS.textDark }]}>
                    {isFollowing ? 'In Network' : 'Add to Network'}
                  </Text>
                </TouchableOpacity>

                {currentUser?.role === 'Client' ? (
                  <TouchableOpacity 
                    style={[styles.outlineActionBtn, { borderColor: COLORS.green, backgroundColor: COLORS.greenLight }]} 
                    onPress={() => setIsHireModalVisible(true)}
                  >
                    <Feather name="briefcase" size={12} color={COLORS.green} style={{ marginRight: 4 }} />
                    <Text style={[styles.outlineActionText, { color: COLORS.green, fontWeight: '700' }]}>Hire</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.outlineActionBtn} onPress={handleWhatsApp}>
                    <FontAwesome5 name="whatsapp" size={12} color={COLORS.green} style={{ marginRight: 4 }} />
                    <Text style={styles.outlineActionText}>Chat</Text>
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
                        receiverId: architectId,
                        name: name,
                        role: 'Architect',
                        avatar: avatar,
                      }
                    });
                  }}
                >
                  <Feather name="message-circle" size={12} color={COLORS.blue} style={{ marginRight: 4 }} />
                  <Text style={[styles.outlineActionText, { color: COLORS.blue }]}>Message</Text>
                </TouchableOpacity>
              </View>
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
          {portfolioProjects.length > 0 && (
            <View style={styles.portfolioHighlightSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Portfolio Highlights</Text>
                <TouchableOpacity onPress={() => router.push({ pathname: '/portfolio-highlights', params: { userId: architectId } })}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 10 }}>
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
                        onPress={() => router.push({ pathname: '/portfolio-highlights', params: { userId: architectId } })}
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

          {/* Sub-Tabs Navigation Segment */}
          <View style={styles.tabSegmentContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollRow}>
              {(['projects', 'media', 'team', 'reviews'] as const).map((tab) => (
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
                {isLoadingProjects ? (
                  <ActivityIndicator size="small" color={COLORS.blue} style={{ padding: 20 }} />
                ) : realProjects.length === 0 ? (
                  <Text style={{ textAlign: 'center', padding: 20, color: COLORS.textMuted }}>No performed projects yet.</Text>
                ) : (
                  realProjects.map((w: any, idx) => {
                    const isCompleted = w.status === 'Completed';
                    const isCancelled = w.status === 'Cancelled';
                    const statusText = isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : 'Ongoing';
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

            {activeTab === 'media' && (
              <View style={styles.videosGrid}>
                {getCombinedMedia().length === 0 ? (
                  <Text style={{ textAlign: 'center', width: '100%', padding: 20, color: COLORS.textMuted }}>No media uploaded yet.</Text>
                ) : (
                  getCombinedMedia().map((item, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={styles.videoCard}
                      onPress={() => {
                        Linking.openURL(item.url).catch(err => console.error("Couldn't open URL", err));
                      }}
                    >
                      <Image source={{ uri: item.url }} style={styles.videoThumbnail} contentFit="cover" />
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

            {activeTab === 'team' && (
              <View style={styles.teamListCol}>
                {teamMembers.length === 0 ? (
                  <Text style={{ textAlign: 'center', padding: 20, color: COLORS.textMuted }}>No team members available.</Text>
                ) : (
                  teamMembers.map((member, idx) => {
                    const memberName = member.fullName || member.name;
                    const memberRole = member.role || member.type;
                    const memberAvatar = resolveAvatarUrl(member.avatarUrl) || 'https://i.pravatar.cc/100?img=11';
                    return (
                      <View key={member._id || idx} style={styles.teamListItem}>
                        <Image source={{ uri: memberAvatar }} style={styles.teamMemberAvatar} contentFit="cover" />
                        <View style={styles.teamMemberDetails}>
                          <View style={styles.teamNameRow}>
                            <Text style={styles.teamMemberName}>{memberName}</Text>
                            {member.isVerified && (
                              <Feather name="check-circle" size={12} color={COLORS.blue} style={{ marginLeft: 5 }} />
                            )}
                          </View>
                          <Text style={styles.teamMemberType}>{memberRole} • Team Member</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {activeTab === 'reviews' && (
              <View style={styles.reviewsListCol}>
                {/* Rating Breakdown Section */}
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
            <Text style={styles.modalTitle}>Remove {firmName || name} from Network?</Text>
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

      {/* ================= PORTFOLIO VIDEO MODAL ================= */}
      <Modal
        visible={!!selectedVideoUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVideo}
      >
        <View style={styles.videoModalOverlay}>
          <View style={styles.videoModalContainer}>
            {/* Header */}
            <View style={styles.videoModalHeader}>
              <Text style={styles.videoModalTitle} numberOfLines={1}>{selectedVideoTitle}</Text>
              <TouchableOpacity onPress={handleCloseVideo} style={styles.videoCloseBtn}>
                <Feather name="x" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {/* Video Player */}
            {selectedVideoUrl && (
              <Video
                source={{ uri: selectedVideoUrl }}
                rate={1.0}
                volume={1.0}
                isMuted={false}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
                style={styles.portfolioVideoPlayer}
              />
            )}
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
                {['Residential', 'Commercial', 'Renovation', 'Interior', 'Architecture', 'Electrical', 'Plumbing', 'General'].map((cat) => (
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
                  setProjectCategory('Architecture');
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
    flex: 1.2,
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
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusCompleted: { backgroundColor: COLORS.greenLight },
  statusProgress: { backgroundColor: COLORS.blueLight },
  statusCancelled: { backgroundColor: '#FEF2F2' },
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
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContainer: {
    width: width * 0.95,
    height: width * 0.95 * (9/16) + 60,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
    flex: 1,
    marginRight: 10,
  },
  videoCloseBtn: {
    padding: 4,
  },
  portfolioVideoPlayer: {
    width: '100%',
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#000000',
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
