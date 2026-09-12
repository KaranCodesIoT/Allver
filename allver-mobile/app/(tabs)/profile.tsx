import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Share, Linking, Modal, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { Feather, FontAwesome5, MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Image } from 'expo-image';
import { useRouter, useNavigation } from 'expo-router';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL, resolveAvatarUrl } from '../../constants/Config';
import { useTranslation } from '../../utils/i18n';
import { removeToken, removeStoredUser } from '../../constants/Auth';
import SocketService from '../../utils/SocketService';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#F59E0B',
  primaryDark: '#D97706',
  navy: '#0F172A',
  white: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  bgLight: '#F8FAFC',
  bgCard: '#F1F5F9',
  border: '#E2E8F0',
  green: '#22C55E',
  greenDark: '#16A34A',
  greenLight: '#F0FDF4',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  red: '#EF4444',
  purple: '#6366F1',
  purpleLight: '#EEF2FF',
  gold: '#F59E0B',
  orange: '#F59E0B',
  teal: '#0F766E',
};

const PROJECT_TYPE_IMAGES: Record<string, string> = {
  'Residential': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80',
  'Commercial': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80',
  'Interior': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80',
  'Renovation': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=300&q=80',
  'General': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80',
  'Electrical': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80',
  'Plumbing': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=300&q=80',
};

// Default Profile Data (empty states, no dummy placeholders)
const DEFAULT_USER_DATA = {
  id: '',
  name: '',
  avatar: '',
  coverImage: '',
  rating: '0.0',
  reviews: '0',
  location: '',
  area: '',
  state: '',
  experience: '',
  specialization: '',
  specializations: [] as string[],
  projects: '0',
  followers: '0',
  firmName: '',
  phone: '',
  teamSize: '0',
};

export default function ProfileScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState(DEFAULT_USER_DATA);
  const [activeTab, setActiveTab] = useState<string>('projects');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [liveFollowersCount, setLiveFollowersCount] = useState(0);
  const [liveFollowingCount, setLiveFollowingCount] = useState(0);
  const [reviewsList, setReviewsList] = useState<any[]>([]);

  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);
  const [userUploadedPosts, setUserUploadedPosts] = useState<any[]>([]);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostTitle, setEditingPostTitle] = useState('');
  const [editingPostDesc, setEditingPostDesc] = useState('');
  const [editingPostType, setEditingPostType] = useState<'media' | 'design'>('media');
  const [showEditPostModal, setShowEditPostModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    messages: true,
    projectUpdates: true,
    contracts: true,
    payments: true,
    marketing: true,
    systemAlerts: true
  });

  // ===== Labour-specific states =====
  const [isAvailableForWork, setIsAvailableForWork] = useState(true);
  const [workArea, setWorkArea] = useState('');
  const [workAreaRadius, setWorkAreaRadius] = useState(15);
  const [showWorkAreaModal, setShowWorkAreaModal] = useState(false);
  const [workAreaInput, setWorkAreaInput] = useState('');
  const [workAreaRadiusInput, setWorkAreaRadiusInput] = useState('15');
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [labourWorkSubTab, setLabourWorkSubTab] = useState<'Active' | 'Completed'>('Active');

  const DEFAULT_LABOUR_JOBS = [
    {
      id: 'lj-1',
      title: 'Residential Construction',
      location: 'Andheri, Mumbai',
      date: '12 Sep 2026',
      status: 'In Progress',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'lj-2',
      title: 'Home Renovation',
      location: 'Bandra, Mumbai',
      date: '18 Sep 2026',
      status: 'Accepted',
      image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'lj-3',
      title: 'Plumbing Repair',
      location: 'Dadar, Mumbai',
      date: '20 Sep 2026',
      status: 'Pending',
      image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'lj-4',
      title: 'Painting Work',
      location: 'Worli, Mumbai',
      date: '22 Sep 2026',
      status: 'Pending',
      image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const DEFAULT_LABOUR_COMPLETED_JOBS = [
    {
      id: 'lj-c1',
      title: 'Electrical Wiring & Setup',
      location: 'Powai, Mumbai',
      date: '02 Aug 2026',
      status: 'Completed',
      image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'lj-c2',
      title: 'Interior Wall Finishing',
      location: 'Goregaon, Mumbai',
      date: '24 Jul 2026',
      status: 'Completed',
      image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80',
    },
  ];

  // Listen for real-time profile updates
  useEffect(() => {
    const handleProfileUpdated = (data: any) => {
      const loggedInUserId = (global as any).currentUser?._id;
      if (data && loggedInUserId && data.userId === loggedInUserId && data.user) {
        console.log('[Profile] Current user profile updated via socket:', data.user);
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        (global as any).currentUser = data.user;
        setCurrentUser(data.user);
        loadUserData();
      }
    };

    const handleWorkspaceUpdated = (data: any) => {
      if (data && data.workspaceId) {
        setAllWorkspaces((prevList) => {
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

    const handleUserSettingsUpdated = (data: any) => {
      const loggedInUserId = (global as any).currentUser?._id;
      if (data && loggedInUserId && data.userId === loggedInUserId && data.notificationSettings) {
        console.log('[Profile] Current user settings updated via socket:', data.notificationSettings);
        setNotifSettings({
          messages: data.notificationSettings.messages !== false,
          projectUpdates: data.notificationSettings.projectUpdates !== false,
          contracts: data.notificationSettings.contracts !== false,
          payments: data.notificationSettings.payments !== false,
          marketing: data.notificationSettings.marketing !== false,
          systemAlerts: data.notificationSettings.systemAlerts !== false,
        });
      }
    };

    SocketService.on('profile_updated', handleProfileUpdated);
    SocketService.on('workspace_updated', handleWorkspaceUpdated);
    SocketService.on('user_settings_updated', handleUserSettingsUpdated);
    return () => {
      SocketService.off('profile_updated', handleProfileUpdated);
      SocketService.off('workspace_updated', handleWorkspaceUpdated);
      SocketService.off('user_settings_updated', handleUserSettingsUpdated);
    };
  }, [currentUser?._id]);

  useEffect(() => {
    if (allWorkspaces && allWorkspaces.length > 0) {
      allWorkspaces.forEach((w: any) => {
        if (w._id) {
          SocketService.emit('join_room', { roomId: w._id });
        }
      });
    }
  }, [allWorkspaces]);



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
    
    if (diffDays <= 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    }
  };

  const getLatestReviewByRole = (role: 'Client' | 'Contractor' | 'Architect') => {
    const realReview = reviewsList.find(r => r.from && r.from.role === role);
    if (realReview) {
      return {
        name: realReview.from.fullName,
        role: realReview.from.role,
        rating: realReview.rating,
        comment: realReview.reviewText,
        avatar: resolveAvatarUrl(realReview.from.avatarUrl) || 'https://i.pravatar.cc/100?img=32',
        date: formatDate(realReview.createdAt)
      };
    }
    return null;
  };

  const isVideoUrl = (url: string) => {
    if (!url) return false;
    return /\.(mp4|mov|m4v|3gp|avi|webm|mkv)/i.test(url) || url.includes('/video/') || url.includes('video') || url.includes('mp4');
  };

  const uploadMediaFile = async (localUri: string, type: 'image' | 'video', mimeType?: string, fileName?: string): Promise<string | null> => {
    const formData = new FormData();
    
    let extension = 'jpg';
    if (localUri.includes('.')) {
      const parts = localUri.split('.');
      extension = parts[parts.length - 1].split('?')[0].toLowerCase();
    } else if (mimeType) {
      const parts = mimeType.split('/');
      extension = parts[parts.length - 1];
    }
    
    const finalMime = mimeType || (type === 'image' ? `image/${extension}` : `video/${extension}`);
    let finalName = fileName || (type === 'image' ? `photo.${extension}` : `video.${extension}`);
    if (!finalName.includes('.')) {
      finalName = finalName + `.${extension}`;
    }
    
    formData.append('image', {
      uri: localUri,
      name: finalName,
      type: finalMime,
    } as any);

    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const data = await res.json();
      return data.url || null;
    }
    return null;
  };



  // Client Projects States
  const [clientProjects, setClientProjects] = useState<any[]>([]);
  const [statsPosted, setStatsPosted] = useState(0);
  const [statsActive, setStatsActive] = useState(0);
  const [statsCompleted, setStatsCompleted] = useState(0);

  const fetchClientProjects = async (userId: string, role?: string) => {
    try {
      const wsRes = await fetch(`${BACKEND_URL}/api/project-workspaces/user/${userId}`);
      const wsData = await wsRes.json();
      const workspaces = wsData.workspaces || [];
      setAllWorkspaces(workspaces);

      if (role === 'Contractor' || role === 'Architect' || role === 'Labour') {
        const mapped = workspaces.filter((w: any) => w.projectType !== 'Team').map((w: any) => {
          return {
            id: w._id,
            title: w.title,
            location: w.contractRequest?.location || 'Thane',
            status: w.status === 'Completed' ? 'Completed' : w.status === 'Cancelled' ? 'Cancelled' : 'In Progress',
            workspaceId: w._id,
            projectType: w.projectType || 'Residential',
            description: w.contractRequest?.description || '',
            budget: w.quotation?.totalCost ? `₹${w.quotation.totalCost.toLocaleString('en-IN')}` : '',
            timeline: w.contractRequest?.timeline || '20 Days',
            requirements: w.contractRequest?.requirements || [],
            updates: w.updates || []
          };
        });
        const sortedMapped = mapped.sort((a: any, b: any) => {
          const aFinished = a.status === 'Completed' || a.status === 'Cancelled';
          const bFinished = b.status === 'Completed' || b.status === 'Cancelled';
          if (aFinished && !bFinished) return 1;
          if (!aFinished && bFinished) return -1;
          return 0;
        });
        setClientProjects(sortedMapped);
        setStatsPosted(sortedMapped.length);
        setStatsActive(sortedMapped.filter((p: any) => p.status === 'In Progress').length);
        setStatsCompleted(sortedMapped.filter((p: any) => p.status === 'Completed').length);
        return;
      }

      const reqRes = await fetch(`${BACKEND_URL}/api/contract-requests/user/${userId}`);
      const reqData = await reqRes.json();
      const requests = reqData.requests || [];

      const merged = requests.map((req: any) => {
        const assocWorkspace = workspaces.find((w: any) => {
          const wReqId = w.contractRequest?._id || w.contractRequest;
          return wReqId && req._id && wReqId.toString() === req._id.toString();
        });
        let displayStatus: 'Hiring' | 'In Progress' | 'Completed' | 'Cancelled' = 'Hiring';
        if (assocWorkspace) {
          if (assocWorkspace.status === 'Completed') {
            displayStatus = 'Completed';
          } else if (assocWorkspace.status === 'Cancelled') {
            displayStatus = 'Cancelled';
          } else {
            displayStatus = 'In Progress';
          }
        }

        return {
          id: req._id,
          title: req.title,
          location: req.location,
          status: displayStatus,
          projectType: req.projectType,
          description: req.description,
          budget: req.budget,
          timeline: req.timeline,
          requirements: req.requirements,
          workspaceId: assocWorkspace?._id || null,
          updates: assocWorkspace?.updates || [],
          bids: req.bids || []
        };
      });

      const sortedMerged = merged.sort((a: any, b: any) => {
        const aFinished = a.status === 'Completed' || a.status === 'Cancelled';
        const bFinished = b.status === 'Completed' || b.status === 'Cancelled';
        if (aFinished && !bFinished) return 1;
        if (!aFinished && bFinished) return -1;
        return 0;
      });
      setClientProjects(sortedMerged);
      setStatsPosted(sortedMerged.length);
      setStatsActive(sortedMerged.filter((p: any) => p.status === 'In Progress').length);
      setStatsCompleted(sortedMerged.filter((p: any) => p.status === 'Completed').length);
    } catch (err) {
      console.error('Error fetching client projects:', err);
    }
  };

  const checkNewUpdates = (workspaceId: string, updates: any[]) => {
    if (!workspaceId || !updates || updates.length === 0 || !currentUser?._id) return false;
    
    // Find updates posted by others
    const otherUpdates = updates.filter(up => {
      const senderId = up.postedBy?.senderId || up.postedBy?.userId;
      if (!senderId) return up.postedBy?.senderRole !== currentUser.role;
      return senderId.toString() !== currentUser._id.toString();
    });

    if (otherUpdates.length === 0) return false;

    // Get latest update time
    const latestUpdate = otherUpdates.reduce((latest, current) => {
      const latestTime = new Date(latest.createdAt || 0).getTime();
      const currentTime = new Date(current.createdAt || 0).getTime();
      return currentTime > latestTime ? current : latest;
    });

    const latestUpdateTime = new Date(latestUpdate.createdAt || 0).getTime();

    // Get last viewed time
    let lastViewed = 0;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(`lastViewedUpdates_${workspaceId}`);
      if (val) lastViewed = parseInt(val);
    }
    if ((global as any).lastViewedUpdates && (global as any).lastViewedUpdates[workspaceId]) {
      const globalVal = (global as any).lastViewedUpdates[workspaceId];
      if (globalVal > lastViewed) lastViewed = globalVal;
    }

    return latestUpdateTime > lastViewed;
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

  // Fullscreen photo viewer state
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);
  const [selectedPhotoTitle, setSelectedPhotoTitle] = useState<string>('');

  const handleOpenPhoto = (photoUrl: string, title: string) => {
    setSelectedPhotoUrl(photoUrl);
    setSelectedPhotoTitle(title);
  };

  const handleClosePhoto = () => {
    setSelectedPhotoUrl(null);
    setSelectedPhotoTitle('');
  };

  const getMonthName = (monthIdx: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIdx];
  };

  // Team Management State
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [registeredLabours, setRegisteredLabours] = useState<any[]>([]);
  const [registeredArchitects, setRegisteredArchitects] = useState<any[]>([]);
  const [registeredContractors, setRegisteredContractors] = useState<any[]>([]);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const handleVoiceSearchPress = () => {
    setModalSearchQuery('');
    setShowVoiceModal(true);
    setIsListening(true);
    
    const SpeechRecognition = (Platform.OS === 'web') 
      ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
      : null;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const speechToText = event.results[0][0].transcript;
          console.log('[VoiceSearch] Result:', speechToText);
          setModalSearchQuery(speechToText);
          setShowVoiceModal(false);
        };

        recognition.onerror = (e: any) => {
          console.error('[VoiceSearch] Error:', e);
          setIsListening(false);
          setShowVoiceModal(false);
        };

        recognition.onend = () => {
          setIsListening(false);
          setShowVoiceModal(false);
        };

        recognition.start();
      } catch (err) {
        console.error('[VoiceSearch] Start error:', err);
        setIsListening(false);
        setShowVoiceModal(false);
      }
    } else {
      console.log('[VoiceSearch] Web Speech API not available. Simulating Voice Input...');
      const mockKeywords = 
        activeModalTab === 'Labour' 
          ? ['Plumber', 'Mason', 'Electrician', 'Tile Layer']
          : activeModalTab === 'Contractor'
            ? ['Bumrah', 'Anuj', 'Mumbai', 'Thane']
            : ['Design Space', 'Sustainable', 'Residential'];
      const randomKeyword = mockKeywords[Math.floor(Math.random() * mockKeywords.length)];

      setTimeout(() => {
        setModalSearchQuery(randomKeyword);
        setIsListening(false);
        setShowVoiceModal(false);
      }, 2500);
    }
  };

  const [loadingProfessionals, setLoadingProfessionals] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<string>('Labour');

  const fetchTeamMembers = (userId: string) => {
    fetch(`${BACKEND_URL}/api/professional/${userId}/team`)
      .then(res => res.json())
      .then(data => {
        if (data.team) {
          setTeamMembers(data.team.map((member: any) => ({
            id: member._id,
            name: member.fullName,
            type: member.role || member.skillType || 'Partner',
            avatar: resolveAvatarUrl(member.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
            experience: member.experience || '5 Years Experience',
            location: member.city || 'Mumbai, Maharashtra',
            rating: member.rating?.toString() || '4.8',
            reviews: member.reviews?.toString() || '24'
          })));
        }
      })
      .catch(err => console.error("Error fetching professional team:", err));
  };

  const fetchRegisteredProfessionals = () => {
    setLoadingProfessionals(true);
    // Fetch Labours
    fetch(`${BACKEND_URL}/api/professionals/Labour`)
      .then(res => res.json())
      .then(data => {
        if (data.professionals) {
          setRegisteredLabours(data.professionals);
        }
      })
      .catch(err => console.error("Error fetching registered labours:", err));

    // Fetch Contractors
    fetch(`${BACKEND_URL}/api/professionals/Contractor`)
      .then(res => res.json())
      .then(data => {
        if (data.professionals) {
          const filtered = currentUser 
            ? data.professionals.filter((p: any) => p._id !== currentUser._id)
            : data.professionals;
          setRegisteredContractors(filtered);
        }
      })
      .catch(err => console.error("Error fetching registered contractors:", err));

    // Fetch Architects
    fetch(`${BACKEND_URL}/api/professionals/Architect`)
      .then(res => res.json())
      .then(data => {
        if (data.professionals) {
          // Filter out current user if they are an architect
          const filtered = currentUser 
            ? data.professionals.filter((p: any) => p._id !== currentUser._id)
            : data.professionals;
          setRegisteredArchitects(filtered);
        }
      })
      .catch(err => console.error("Error fetching registered architects:", err))
      .finally(() => setLoadingProfessionals(false));
  };

  const handleAddRegisteredProfessional = async (member: any) => {
    if (!currentUser || !currentUser._id) return;

    try {
      const response = await fetch(`${BACKEND_URL}/api/professional/${currentUser._id}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: member._id }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Failed to add team member');
        return;
      }

      // Update the local list
      if (data.team) {
        setTeamMembers(data.team.map((m: any) => ({
          id: m._id,
          name: m.fullName,
          type: m.role || m.skillType || 'Partner',
          avatar: resolveAvatarUrl(m.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
          experience: m.experience || '5 Years Experience',
          location: m.city || 'Mumbai, Maharashtra',
          rating: m.rating?.toString() || '4.8',
          reviews: m.reviews?.toString() || '24'
        })));
      }

      alert(`Invitation sent! Added ${member.fullName} to team.`);
      setShowAddTeamModal(false);
    } catch (error) {
      console.error('Error adding team member:', error);
      alert('Error adding team member');
    }
  };

  const handleRemoveTeamMember = (memberId: string, memberName: string) => {
    if (!currentUser || !currentUser._id) return;

    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${memberName} from your team?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/professional/${currentUser._id}/team/${memberId}`, {
                method: 'DELETE',
              });

              const data = await response.json();
              if (!response.ok) {
                alert(data.message || 'Failed to remove team member');
                return;
              }

              // Update the local list
              if (data.team) {
                setTeamMembers(data.team.map((m: any) => ({
                  id: m._id,
                  name: m.fullName,
                  type: m.role || m.skillType || 'Partner',
                  avatar: resolveAvatarUrl(m.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop',
                  experience: m.experience || '5 Years Experience',
                  location: m.city || 'Mumbai, Maharashtra',
                  rating: m.rating?.toString() || '4.8',
                  reviews: m.reviews?.toString() || '24'
                })));
              }
              alert(`${memberName} removed from team.`);
            } catch (error) {
              console.error('Error removing team member:', error);
              alert('Error removing team member');
            }
          }
        }
      ]
    );
  };

  const loadUserData = () => {
    let storedUser = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      storedUser = localStorage.getItem('currentUser');
    } else {
      storedUser = (global as any).currentUser ? JSON.stringify((global as any).currentUser) : null;
    }

    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed) {
          setCurrentUser(parsed);
          fetchReviews(parsed._id);
          
          if (parsed.notificationSettings) {
            setNotifSettings({
              messages: parsed.notificationSettings.messages !== false,
              projectUpdates: parsed.notificationSettings.projectUpdates !== false,
              contracts: parsed.notificationSettings.contracts !== false,
              payments: parsed.notificationSettings.payments !== false,
              marketing: parsed.notificationSettings.marketing !== false,
              systemAlerts: parsed.notificationSettings.systemAlerts !== false,
            });
          }

          if (parsed.role !== 'Client') {

            // Fetch user uploaded posts (discover + design)
            fetch(`${BACKEND_URL}/api/posts/user/${parsed._id}`)
              .then(res => res.json())
              .then(data => {
                if (data.success && data.posts) {
                  setUserUploadedPosts(data.posts);
                }
              })
              .catch(err => console.error("Error fetching my uploaded posts:", err));
          }

          if (parsed.role === 'Client') {
            fetchClientProjects(parsed._id, parsed.role);
          } else {
            // Fetch live user info (followers count)
            fetch(`${BACKEND_URL}/api/professional/${parsed._id}`)
              .then(res => res.json())
              .then(data => {
                if (data.professional) {
                  setLiveFollowersCount(data.professional.followersCount || 0);
                  setLiveFollowingCount(data.professional.followingCount || 0);
                }
              })
              .catch(err => console.error("Error fetching my profile live counts:", err));

            // Fetch live team members
            fetchTeamMembers(parsed._id);

            // Fetch workspaces for Contractor/Architect/Labour
            if (parsed.role === 'Contractor' || parsed.role === 'Architect' || parsed.role === 'Labour') {
              fetchClientProjects(parsed._id, parsed.role);
            }
          }

          const roleLabel = parsed.role || 'Architect';
          const prefix = parsed.role === 'Architect' ? 'Ar. ' : '';
          setUser({
            id: parsed._id || '',
            name: `${prefix}${parsed.fullName}`,
            avatar: resolveAvatarUrl(parsed.avatarUrl, parsed.updatedAt) || '',
            coverImage: resolveAvatarUrl(parsed.cover, parsed.updatedAt) || '',
            rating: parsed.rating?.toString() || '0.0',
            reviews: parsed.reviews?.toString() || '0',
            location: [parsed.city, parsed.state].filter(Boolean).join(', ') || '',
            area: parsed.area || '',
            state: parsed.state || '',
            experience: parsed.experience || '',
            specialization: parsed.shortDesc || parsed.about || `Expert ${roleLabel.toLowerCase()} services.`,
            specializations: (parsed.specialization && parsed.specialization.length > 0)
              ? parsed.specialization 
              : (parsed.role === 'Labour'
                  ? ['Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Tile Fitter', 'Helper']
                  : (parsed.role === 'Contractor'
                      ? ['General Contracting', 'Civil Construction', 'Renovation']
                      : ['Residential Design', 'Commercial Design', 'Interior Design', 'Landscape Design'])),
            projects: (parsed.projects ?? 0).toString(),
            followers: liveFollowersCount.toString(),
            firmName: parsed.firmName || parsed.fullName || '',
            phone: parsed.phoneNumber || parsed.phone || '',
            teamSize: parsed.teamSize?.toString() || '0',
          });

          // Initialize Labour-specific states
          if (parsed.role === 'Labour') {
            setIsAvailableForWork(parsed.availability !== 'Not Available');
            setWorkArea(parsed.workArea || parsed.city || '');
            setWorkAreaRadius(parsed.workAreaRadius || 15);
            setWorkAreaInput(parsed.workArea || parsed.city || '');
            setWorkAreaRadiusInput(String(parsed.workAreaRadius || 15));
          }
        }
      } catch (e) {
        console.error('Error parsing stored user:', e);
      }
    }
  };

  const handleSaveNotificationSettings = async (updatedSettings: typeof notifSettings) => {
    if (!currentUser?._id) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/${currentUser._id}/notification-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      const data = await res.json();
      if (res.ok && data.user) {
        (global as any).currentUser = data.user;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        setCurrentUser(data.user);
        Alert.alert('Success', 'Notification settings saved successfully');
        setShowSettingsModal(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to save notification settings');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error occurred while saving notification settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleSettings = async (key: string, newValue: boolean) => {
    if (!currentUser?._id) return;
    const previousSettings = { ...notifSettings };
    const updatedSettings = {
      ...notifSettings,
      [key]: newValue
    };
    
    // Optimistic UI update
    setNotifSettings(updatedSettings);

    try {
      const res = await fetch(`${BACKEND_URL}/api/user/${currentUser._id}/notification-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      const data = await res.json();
      if (res.ok && data.user) {
        (global as any).currentUser = data.user;
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        setCurrentUser(data.user);
      } else {
        // Rollback on error
        setNotifSettings(previousSettings);
        Alert.alert('Error', data.message || 'Failed to update notification preference');
      }
    } catch (err) {
      // Rollback on network failure
      setNotifSettings(previousSettings);
      Alert.alert('Error', 'Network error occurred. Reverting preference.');
    }
  };

  const handleEditMediaPress = (item: any) => {
    setEditingPostId(item.postId);
    setEditingPostTitle(item.title);
    setEditingPostDesc(item.description || '');
    setEditingPostType(item.postType || 'media');
    setShowEditPostModal(true);
  };

  const handleSavePostEdit = async () => {
    if (!editingPostId) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/posts/${editingPostId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingPostTitle,
          description: editingPostDesc
        })
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Post updated successfully');
        setShowEditPostModal(false);
        loadUserData();
      } else {
        Alert.alert('Error', data.message || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'An error occurred while updating the post');
    }
  };

  const handleDeletePostPress = () => {
    if (!editingPostId) return;
    Alert.alert(
      'Delete Post',
      'Are you sure you want to permanently delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/posts/${editingPostId}`, {
                method: 'DELETE'
              });
              if (response.ok) {
                Alert.alert('Success', 'Post deleted successfully');
                setShowEditPostModal(false);
                loadUserData();
              } else {
                Alert.alert('Error', 'Failed to delete post');
              }
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'An error occurred while deleting the post');
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadUserData();
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });
    return unsubscribe;
  }, [navigation]);

  const formatDateString = (y: number, m: number, d: number) => {
    const monthStr = m + 1;
    return `${y}-${monthStr < 10 ? '0' + monthStr : monthStr}-${d < 10 ? '0' + d : d}`;
  };

  const handleShare = async () => {
    try {
      if (!currentUser?._id) return;
      
      const role = currentUser.role || 'Client';
      let profileUrl = 'https://allver.onrender.com';
      
      if (role === 'Architect') {
        profileUrl += `/architect/${currentUser._id}`;
      } else if (role === 'Contractor') {
        profileUrl += `/contractor/${currentUser._id}`;
      } else if (role === 'Labour') {
        profileUrl += `/labour/${currentUser._id}`;
      } else {
        profileUrl += `/profile`;
      }

      await Share.share({
        message: `Check out my profile on Allver: ${currentUser.fullName} (${t(role.toLowerCase()) || role})\nLink: ${profileUrl}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogout = async () => {
    try {
      const activeToken = (global as any).currentPushToken;
      if (activeToken && currentUser?._id) {
        try {
          await fetch(`${BACKEND_URL}/api/user/push-token`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id, token: activeToken })
          });
        } catch (fetchErr) {
          console.warn('Failed to delete push token from backend on logout:', fetchErr);
        }
        (global as any).currentPushToken = null;
      }

      const activeFcmToken = (global as any).currentFcmToken;
      if (activeFcmToken && currentUser?._id) {
        try {
          await fetch(`${BACKEND_URL}/api/user/fcm-token`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser._id, token: activeFcmToken })
          });
        } catch (fetchErr) {
          console.warn('Failed to delete FCM token from backend on logout:', fetchErr);
        }
        (global as any).currentFcmToken = null;
      }

      await removeToken();
      await removeStoredUser();
    } catch (e) {
      console.warn('Logout secure storage clear failed:', e);
    }
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
    (global as any).currentUser = null;
    router.replace('/login');
  };

  const performDeleteAccount = async () => {
    if (!currentUser?._id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/${currentUser._id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.removeItem('currentUser');
        }
        (global as any).currentUser = null;
        router.replace('/login');
        if (Platform.OS === 'web') {
          alert('Your account has been deleted successfully.');
        } else {
          Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
        }
      } else {
        const data = await res.json();
        if (Platform.OS === 'web') {
          alert(data.message || 'Failed to delete account.');
        } else {
          Alert.alert('Error', data.message || 'Failed to delete account.');
        }
      }
    } catch (err: any) {
      console.error('Delete account error:', err);
      if (Platform.OS === 'web') {
        alert('Network error. Failed to delete account.');
      } else {
        Alert.alert('Error', 'Network error. Failed to delete account.');
      }
    }
  };

  const handleDeleteAccount = () => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm("Are you sure you want to permanently delete your account? All your profile details, posts, notifications, and connections will be permanently removed. This action cannot be undone.");
      if (confirmDelete) {
        performDeleteAccount();
      }
    } else {
      Alert.alert(
        "Delete Account",
        "Are you sure you want to permanently delete your account? All your profile details, posts, notifications, and connections will be permanently removed. This action cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: performDeleteAccount 
          }
        ]
      );
    }
  };

  const handleEditProfile = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push('/edit-profile');
  };

  const handleToggleAvailability = async (newValue: boolean) => {
    if (!currentUser?._id) return;
    setIsAvailableForWork(newValue);
    setSavingAvailability(true);
    try {
      await fetch(`${BACKEND_URL}/api/user/profile/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: newValue ? 'Available' : 'Not Available' })
      });
    } catch (err) {
      console.error('Error saving availability:', err);
      setIsAvailableForWork(!newValue); // rollback
    } finally {
      setSavingAvailability(false);
    }
  };

  const handleSaveWorkArea = async () => {
    if (!currentUser?._id || !workAreaInput.trim()) return;
    const radius = parseInt(workAreaRadiusInput) || 15;
    try {
      await fetch(`${BACKEND_URL}/api/user/profile/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workArea: workAreaInput.trim(), workAreaRadius: radius })
      });
      setWorkArea(workAreaInput.trim());
      setWorkAreaRadius(radius);
      setShowWorkAreaModal(false);
    } catch (err) {
      console.error('Error saving work area:', err);
      Alert.alert('Error', 'Failed to save work area');
    }
  };

  const cityOnly = user.location.split(',')[0]?.trim() || 'Location';

  // Experience display: ensure it has "Exp" suffix style
  const expDisplay = user.experience.toLowerCase().includes('year') 
    ? user.experience 
    : `${user.experience} Exp`;

  // Build Recent Activity dynamically from all workspaces for current user
  const getRecentActivity = () => {
    if (!currentUser?._id) return [];
    const activities: any[] = [];

    allWorkspaces.forEach((w: any) => {
      // Gather Payments/Advances
      if (w.labourManagement?.payments) {
        w.labourManagement.payments.forEach((p: any) => {
          if ((p.labourId?._id || p.labourId)?.toString() === currentUser._id.toString()) {
            const pDate = new Date(p.date);
            activities.push({
              dateRaw: pDate,
              hours: p.type === 'Advance' ? `Advance: ₹${p.amount}` : `Paid: ₹${p.amount}`,
              status: p.type === 'Advance' ? 'Half Day' : 'Present', // Use visual status icons as mapping
              advance: p.amount || 0,
              latitude: undefined,
              longitude: undefined,
              checkInTime: undefined,
              checkOutTime: undefined,
              address: undefined,
              distanceFromSite: undefined,
              googleMapsLink: undefined,
              rawDay: {
                day: pDate.getDate(),
                isCurrentMonth: pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear,
                status: p.type === 'Advance' ? 'Half Day' : 'Present',
                hours: 0,
                advance: p.amount || 0,
                remarks: p.remarks || '-'
              }
            });
          }
        });
      }
    });

    // Sort by dateRaw latest first
    activities.sort((a, b) => b.dateRaw.getTime() - a.dateRaw.getTime());

    // Format dates nicely and return top 4
    return activities.slice(0, 4).map(act => {
      const d = act.dateRaw;
      const daysOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayName = daysOfWeekNames[d.getDay()];
      const monthName = getMonthName(d.getMonth());
      const dateFormatted = `${d.getDate() < 10 ? '0' + d.getDate() : d.getDate()} ${monthName} ${d.getFullYear()}, ${dayName}`;
      
      return {
        date: dateFormatted,
        hours: act.hours,
        status: act.status,
        advance: act.advance || 0,
        latitude: act.latitude,
        longitude: act.longitude,
        checkInTime: act.checkInTime,
        checkOutTime: act.checkOutTime,
        address: act.address,
        distanceFromSite: act.distanceFromSite,
        googleMapsLink: act.googleMapsLink,
        rawDay: act.rawDay
      };
    });
  };

  const totalReviewsCount = reviewsList.length;
  const averageRating = totalReviewsCount > 0
    ? (reviewsList.reduce((sum, r) => sum + r.rating, 0) / totalReviewsCount).toFixed(1)
    : '0.0';

  const starCounts = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  reviewsList.forEach((r) => {
    const starStr = Math.round(r.rating).toString();
    if (starStr in starCounts) {
      starCounts[starStr as keyof typeof starCounts] += 1;
    }
  });



  const getCombinedMedia = () => {
    const list: { 
      id: string; 
      type: 'image' | 'video'; 
      url: string; 
      title: string; 
      duration?: string; 
      image?: string;
      postId?: string;
      postType?: 'media' | 'design';
      description?: string;
      quotation?: any;
    }[] = [];

    // Map userUploadedPosts (discover feed media + design section layouts)
    if (userUploadedPosts && Array.isArray(userUploadedPosts)) {
      userUploadedPosts.forEach((post: any) => {
        const titleStr = post.title || '';
        const descStr = post.description || '';
        if (/project update|progress update/i.test(titleStr) || /project update|progress update/i.test(descStr)) {
          return; // Skip project updates
        }

        if (post.mediaUrls && Array.isArray(post.mediaUrls)) {
          post.mediaUrls.forEach((url: string, mediaIdx: number) => {
            const isVideo = /\.(mp4|mov|m4v|3gp|avi|webm|mkv)/i.test(url) || url.includes('/video/') || url.includes('video') || url.includes('mp4');
            list.push({
              id: `${post._id}-${mediaIdx}`,
              type: isVideo ? 'video' : 'image',
              url: resolveAvatarUrl(url),
              title: post.title || post.description || 'Uploaded Media',
              image: isVideo ? undefined : resolveAvatarUrl(url),
              postId: post._id,
              postType: post.type,
              description: post.description,
              quotation: post.quotation
            });
          });
        }
      });
    }


    return list;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ===== HEADER ===== */}
      <View style={styles.navHeader}>
        <Text style={styles.headerTitle}>{t('myProfile')}</Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.headerIconBtn}>
            <Feather name="settings" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowLanguageModal(true)} style={styles.headerIconBtn}>
            <Ionicons name="language" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} style={styles.headerIconBtn}>
            <Feather name="log-out" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ===== COVER IMAGE + AVATAR ===== */}
        {currentUser?.role === 'Client' ? (
          <View style={styles.clientHeaderContainer}>
            <View style={styles.clientAvatarWrapper}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.clientAvatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.clientAvatarImage, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Feather name="user" size={40} color="#94A3B8" />
                </View>
              )}
              <View style={styles.verifiedBadge}>
                <Feather name="check" size={11} color={COLORS.white} />
              </View>
            </View>
          </View>
        ) : currentUser?.role === 'Labour' ? null : (
          <View style={[styles.coverContainer, !user.coverImage && { backgroundColor: '#CBD5E1' }]}>
            {user.coverImage ? (
              <Image source={{ uri: user.coverImage }} style={styles.coverImage} contentFit="cover" />
            ) : null}
            <View style={styles.avatarWrapper}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <View style={[styles.avatarImage, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Feather name="user" size={32} color="#94A3B8" />
                </View>
              )}
              <View style={styles.verifiedBadge}>
                <Feather name="check" size={11} color={COLORS.white} />
              </View>
            </View>
          </View>
        )}

        {/* ===== PROFILE INFO ===== */}
        {currentUser?.role === 'Labour' ? (
          /* =================== LABOUR PROFILE UI =================== */
          <View style={styles.labourProfileContainer}>
            {/* Avatar Section */}
            <View style={styles.labourAvatarSection}>
              <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.9} style={styles.labourAvatarTouchable}>
                {user.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.labourAvatarImage} contentFit="cover" />
                ) : (
                  <View style={[styles.labourAvatarImage, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                    <Feather name="user" size={44} color="#94A3B8" />
                  </View>
                )}
                <View style={styles.labourCameraOverlay}>
                  <Feather name="camera" size={14} color={COLORS.white} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Name + Verified */}
            <View style={styles.labourNameRow}>
              <Text style={styles.labourName} numberOfLines={1}>{user.name || currentUser?.fullName || 'My Name'}</Text>
              {currentUser?.isVerified && (
                <View style={styles.labourVerifiedBadge}>
                  <Feather name="check" size={11} color={COLORS.white} />
                  <Text style={styles.labourVerifiedText}>Verified</Text>
                </View>
              )}
            </View>

            {/* Premium Worker Badge */}
            {currentUser?.isPremium && (
              <View style={styles.premiumBadgeRow}>
                <FontAwesome5 name="crown" size={12} color="#D97706" style={{ marginRight: 5 }} />
                <Text style={styles.premiumBadgeText}>Premium Worker</Text>
              </View>
            )}

            {/* Skills */}
            <Text style={styles.labourSkillsText} numberOfLines={2}>
              {(Array.isArray(user.specializations) && user.specializations.length > 0
                ? user.specializations
                : ['Mason', 'Electrician', 'Plumber', 'Painter']
              ).join(' • ')}
            </Text>

            {/* Worker ID */}
            {currentUser?._id && (
              <Text style={styles.labourIdText}>ID: ALV-WS-{currentUser._id.toString().slice(-5).toUpperCase()}</Text>
            )}

            {/* Edit Profile Button */}
            <TouchableOpacity style={styles.labourEditProfileBtn} onPress={handleEditProfile} activeOpacity={0.85}>
              <Feather name="edit-2" size={14} color={COLORS.textDark} style={{ marginRight: 6 }} />
              <Text style={styles.labourEditProfileBtnText}>Edit Profile</Text>
            </TouchableOpacity>

            {/* Available for Work Toggle */}
            <View style={styles.labourAvailabilityCard}>
              <View style={styles.labourAvailabilityRow}>
                <View style={[styles.availabilityDot, { backgroundColor: isAvailableForWork ? COLORS.green : COLORS.textLight }]} />
                <Text style={styles.availabilityLabel}>Available for Work</Text>
                <Switch
                  value={isAvailableForWork}
                  onValueChange={handleToggleAvailability}
                  trackColor={{ false: '#CBD5E1', true: '#86EFAC' }}
                  thumbColor={isAvailableForWork ? COLORS.green : '#f4f3f4'}
                  disabled={savingAvailability}
                  style={{ marginLeft: 'auto' }}
                />
              </View>
              <Text style={styles.availabilitySubText}>You will receive job requests nearby</Text>
            </View>

            {/* Work Area */}
            <View style={styles.labourWorkAreaCard}>
              <Ionicons name="location" size={20} color={COLORS.red} style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.workAreaLabel}>Work Area</Text>
                <Text style={styles.workAreaCity}>{workArea || cityOnly}</Text>
                <Text style={styles.workAreaRadius}>(Within {workAreaRadius} km)</Text>
              </View>
              <TouchableOpacity onPress={() => { setWorkAreaInput(workArea || cityOnly); setWorkAreaRadiusInput(String(workAreaRadius)); setShowWorkAreaModal(true); }}>
                <Text style={styles.workAreaChangeBtn}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Networks */}
            {currentUser?._id && (
              <TouchableOpacity
                style={styles.labourNetworksRow}
                onPress={() => router.push({ pathname: '/followers-list', params: { userId: currentUser._id, type: 'followers', userName: 'My' } })}
                activeOpacity={0.75}
              >
                <Feather name="users" size={18} color={COLORS.textDark} style={{ marginRight: 10 }} />
                <Text style={styles.labourNetworksText}>{liveFollowersCount} Networks</Text>
                <Feather name="chevron-right" size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            )}

            {/* Stats Row */}
            <View style={styles.labourStatsRow}>
              <View style={styles.labourStatCard}>
                <Feather name="briefcase" size={18} color={COLORS.textDark} style={{ marginBottom: 4 }} />
                <Text style={styles.labourStatNumber}>
                  {clientProjects.filter(p => p.status === 'Completed').length}
                </Text>
                <Text style={styles.labourStatLabel}>Jobs Completed</Text>
              </View>
              <View style={[styles.labourStatCard, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
                <FontAwesome5 name="star" size={18} color={COLORS.gold} style={{ marginBottom: 4 }} />
                <Text style={styles.labourStatNumber}>{averageRating}</Text>
                <Text style={styles.labourStatLabel}>Rating</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={[styles.profileSection, currentUser?.role === 'Client' && { marginTop: 10 }]}>
          {currentUser?.role === 'Client' ? (
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
              {/* Name */}
              <Text style={[styles.profileName, { flex: 0, textAlign: 'center', marginRight: 0, marginBottom: 4 }]}>{user.name}</Text>
              
              {/* City */}
              <Text style={[styles.subtitleText, { textAlign: 'center', marginBottom: 6, fontWeight: '500' }]}>{cityOnly}</Text>
              
              {/* Phone Number */}
              <View style={[styles.phoneRow, { justifyContent: 'center', marginBottom: 12, gap: 6 }]}>
                <Feather name="phone" size={14} color={COLORS.textMuted} />
                <Text style={styles.phoneText}>{user.phone}</Text>
              </View>

              {/* Edit Profile Button */}
              <TouchableOpacity style={styles.clientEditProfileBtn} onPress={handleEditProfile} activeOpacity={0.85}>
                <Feather name="edit-2" size={13} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={styles.clientEditProfileBtnText}>Edit Profile</Text>
              </TouchableOpacity>

              {/* Stats Section */}
              <View style={styles.clientStatsRow}>
                <View style={styles.clientStatBox}>
                  <Text style={styles.clientStatNumber}>{statsPosted}</Text>
                  <Text style={styles.clientStatLabel}>Projects Posted</Text>
                </View>
                <View style={styles.clientStatDivider} />
                <View style={styles.clientStatBox}>
                  <Text style={styles.clientStatNumber}>{statsActive}</Text>
                  <Text style={styles.clientStatLabel}>Active</Text>
                </View>
                <View style={styles.clientStatDivider} />
                <View style={styles.clientStatBox}>
                  <Text style={styles.clientStatNumber}>{statsCompleted}</Text>
                  <Text style={styles.clientStatLabel}>Completed</Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              {/* Firm Name row with edit/logout buttons */}
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName} numberOfLines={1}>{user.firmName}</Text>
                <View style={styles.profileActionBtnsRow}>
                  <TouchableOpacity style={styles.smallEditProfileBtn} onPress={handleEditProfile} activeOpacity={0.85}>
                    <Feather name="edit-2" size={11} color={COLORS.white} style={{ marginRight: 4 }} />
                    <Text style={styles.smallEditProfileBtnText}>{t('edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallLogoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                    <Feather name="log-out" size={11} color={COLORS.red} style={{ marginRight: 4 }} />
                    <Text style={styles.smallLogoutBtnText}>{t('logout')}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Name + Role subtitle */}
              <Text style={[styles.subtitleText, { marginBottom: 15 }]}>
                {user.name}  •  {currentUser?.role || 'Architect'}
              </Text>

              {currentUser?._id && (
                <View style={styles.followStatsRow}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#F9FAFB',
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: '#E5E7EB',
                      borderRadius: 20,
                    }}
                    onPress={() => {
                      router.push({
                        pathname: '/followers-list',
                        params: { userId: currentUser._id, type: 'followers', userName: 'My' }
                      });
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#111827', fontWeight: '600' }}>
                      {liveFollowersCount} {liveFollowersCount === 1 ? 'Network' : 'Networks'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ===== PHONE NUMBER ===== */}
              <View style={styles.phoneRow}>
                <Feather name="phone" size={15} color={COLORS.textMuted} />
                <Text style={styles.phoneText}>{user.phone}</Text>
              </View>

              {/* ===== STAT PILLS ROW ===== */}
              <View style={styles.pillsRow}>
                <View style={styles.pill}>
                  <FontAwesome5 name="trophy" size={12} color={COLORS.primary} />
                  <Text style={styles.pillText}>{expDisplay}</Text>
                </View>
                <View style={styles.pill}>
                  <FontAwesome5 name="th-large" size={12} color={COLORS.primary} />
                  <Text style={styles.pillText}>{clientProjects.length} Projects</Text>
                </View>
                <View style={styles.pill}>
                  <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.pillText}>{cityOnly}</Text>
                </View>
              </View>
            </>
          )}

          {/* ===== SPECIALIZATION ===== */}
          {currentUser?.role !== 'Client' && (
            <View style={styles.specializationSection}>
              <Text style={styles.sectionHeaderTitle}>{t('specialization') || 'Specialization'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specScrollRow}>
                {(Array.isArray(user.specializations) && user.specializations.length > 0
                  ? user.specializations
                  : (currentUser?.role === 'Labour'
                      ? ['Mason', 'Electrician', 'Plumber', 'Painter', 'Carpenter', 'Welder', 'Tile Fitter', 'Helper']
                      : (currentUser?.role === 'Contractor'
                          ? ['General Contracting', 'Civil Construction', 'Renovation']
                          : ['Residential Design', 'Commercial Design', 'Interior Design', 'Landscape Design']))).map((spec, index) => (
                  <View key={index} style={styles.specTag}>
                    <Text style={styles.specTagText}>{t(spec.toLowerCase().replace(/\s+/g, '')) || spec}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          </View>
        )}


        {/* ===== TABS + TAB CONTENT (all roles) ===== */}
        <View style={{ paddingHorizontal: 20 }}>
          {/* ===== TABS ===== */}
          <View style={styles.tabSegmentContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollRow}>
              {(currentUser?.role === 'Client'
                ? ['projects']
                : currentUser?.role === 'Labour'
                  ? ['my work', 'reviews']
                  : ['projects', 'media', 'team', 'reviews']
              ).map((tab) => (
                <TouchableOpacity 
                  key={tab} 
                  style={[styles.tabButton, (activeTab === tab || (tab === 'my work' && activeTab === 'projects')) && styles.activeTabButton]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabButtonText, (activeTab === tab || (tab === 'my work' && activeTab === 'projects')) && styles.activeTabButtonText]}>
                    {tab === 'my work' ? 'My Work' : t(tab) || tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ===== TAB CONTENT ===== */}
          <View style={styles.tabContentArea}>
            {(activeTab === 'projects' || activeTab === 'my work') && (
              currentUser?.role === 'Labour' ? (
                /* ===== LABOUR MY WORK (Active Jobs / Completed) ===== */
                <View style={styles.labourWorkSection}>
                  {/* Sub-Tabs: Active Jobs | Completed */}
                  <View style={styles.labourWorkSubTabsRow}>
                    <TouchableOpacity
                      style={[
                        styles.labourWorkSubTabBtn,
                        labourWorkSubTab === 'Active' && styles.labourWorkSubTabBtnActive
                      ]}
                      onPress={() => setLabourWorkSubTab('Active')}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.labourWorkSubTabText,
                        labourWorkSubTab === 'Active' && styles.labourWorkSubTabTextActive
                      ]}>
                        Active Jobs
                      </Text>
                      {labourWorkSubTab === 'Active' && <View style={styles.labourWorkSubTabIndicator} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.labourWorkSubTabBtn,
                        labourWorkSubTab === 'Completed' && styles.labourWorkSubTabBtnActive
                      ]}
                      onPress={() => setLabourWorkSubTab('Completed')}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.labourWorkSubTabText,
                        labourWorkSubTab === 'Completed' && styles.labourWorkSubTabTextActive
                      ]}>
                        Completed
                      </Text>
                      {labourWorkSubTab === 'Completed' && <View style={styles.labourWorkSubTabIndicator} />}
                    </TouchableOpacity>
                  </View>

                  {/* Jobs List */}
                  <View style={styles.labourJobsList}>
                    {(() => {
                      let allJobs = clientProjects.length > 0
                        ? clientProjects.map((item, idx) => ({
                            id: item.id || item.workspaceId || `lj-${idx}`,
                            title: item.title || 'General Construction',
                            location: item.location || 'Mumbai, Maharashtra',
                            date: item.timeline && item.timeline.includes('202') ? item.timeline : `${12 + idx * 3} Sep 2026`,
                            status: item.status === 'Completed' ? 'Completed' : (idx === 0 ? 'In Progress' : idx === 1 ? 'Accepted' : 'Pending'),
                            image: (idx === 0
                              ? 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'
                              : idx === 1
                                ? 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'
                                : idx === 2
                                  ? 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80'
                                  : 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80'),
                            workspaceId: item.workspaceId
                          }))
                        : DEFAULT_LABOUR_JOBS;

                      let filteredJobs = allJobs.filter((job: any) =>
                        labourWorkSubTab === 'Active'
                          ? job.status !== 'Completed' && job.status !== 'Cancelled'
                          : job.status === 'Completed'
                      );

                      if (labourWorkSubTab === 'Completed' && filteredJobs.length === 0 && clientProjects.length === 0) {
                        filteredJobs = DEFAULT_LABOUR_COMPLETED_JOBS;
                      }

                      if (filteredJobs.length === 0) {
                        return (
                          <View style={styles.labourJobsEmptyBox}>
                            <Feather name="briefcase" size={36} color="#CBD5E1" style={{ marginBottom: 10 }} />
                            <Text style={styles.labourJobsEmptyTitle}>
                              {labourWorkSubTab === 'Active' ? 'No active jobs right now' : 'No completed jobs yet'}
                            </Text>
                            <Text style={styles.labourJobsEmptySub}>
                              {labourWorkSubTab === 'Active'
                                ? 'New project assignments and accepted work will appear here.'
                                : 'Completed projects and contracts will be listed here.'}
                            </Text>
                          </View>
                        );
                      }

                      return filteredJobs.map((job: any) => {
                        let badgeBg = '#FEF3C7';
                        let badgeColor = '#D97706';
                        if (job.status === 'In Progress') {
                          badgeBg = '#ECFDF5';
                          badgeColor = '#10B981';
                        } else if (job.status === 'Accepted') {
                          badgeBg = '#EFF6FF';
                          badgeColor = '#2563EB';
                        } else if (job.status === 'Completed') {
                          badgeBg = '#ECFDF5';
                          badgeColor = '#10B981';
                        }

                        return (
                          <TouchableOpacity
                            key={job.id}
                            style={styles.labourJobCard}
                            activeOpacity={0.85}
                            onPress={() => {
                              if (job.workspaceId) {
                                router.push({
                                  pathname: '/project-progress',
                                  params: {
                                    name: job.title,
                                    location: job.location,
                                    status: job.status,
                                    progress: job.status === 'Completed' ? '100' : '60',
                                    workspaceId: job.workspaceId
                                  }
                                });
                              }
                            }}
                          >
                            {/* Thumbnail Image */}
                            <Image source={{ uri: job.image }} style={styles.labourJobThumbnail} contentFit="cover" />

                            {/* Details Col */}
                            <View style={styles.labourJobDetailsCol}>
                              <Text style={styles.labourJobTitle} numberOfLines={1}>{job.title}</Text>
                              
                              <View style={styles.labourJobMetaRow}>
                                <Ionicons name="location-sharp" size={13} color="#2563EB" style={{ marginRight: 4 }} />
                                <Text style={styles.labourJobMetaText} numberOfLines={1}>{job.location}</Text>
                              </View>

                              <View style={styles.labourJobMetaRow}>
                                <Ionicons name="calendar-outline" size={13} color="#2563EB" style={{ marginRight: 4 }} />
                                <Text style={styles.labourJobMetaText}>{job.date}</Text>
                              </View>

                              <View style={[styles.labourJobStatusBadge, { backgroundColor: badgeBg }]}>
                                <Text style={[styles.labourJobStatusText, { color: badgeColor }]}>{job.status}</Text>
                              </View>
                            </View>

                            {/* Chevron Arrow */}
                            <Feather name="chevron-right" size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
                          </TouchableOpacity>
                        );
                      });
                    })()}
                  </View>
                </View>
              ) : (
                <View style={styles.projectsListCol}>
                  {clientProjects
                    .filter((item) => currentUser?.role !== 'Client' || item.status !== 'Hiring')
                    .map((item, idx) => (
                      <TouchableOpacity
                        key={item.id || idx}
                        style={[
                          styles.clientProjectCard,
                          item.status === 'Completed' && styles.completedProjectCard,
                          item.status === 'Cancelled' && styles.cancelledProjectCard
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          router.push({
                            pathname: '/project-progress',
                            params: {
                              name: item.title,
                              location: item.location,
                              status: item.status,
                              progress: (item.status === 'Completed' ? '100' : '60'),
                              workspaceId: item.workspaceId || ''
                            }
                          });
                        }}
                      >
                        {/* NEW UPDATE BADGE */}
                        {checkNewUpdates(item.workspaceId, item.updates) && (
                          <View style={styles.newUpdateBadge}>
                            <View style={styles.newUpdateDot} />
                            <Text style={styles.newUpdateText}>New Update</Text>
                          </View>
                        )}

                        <Text style={styles.clientProjectCardName}>{item.title}</Text>
                        <Text style={styles.clientProjectCardLoc}>{item.location}</Text>
                        <View style={styles.projectStatusRow}>
                          <View style={[styles.projectStatusDot, { 
                            backgroundColor: item.status === 'Completed' 
                              ? COLORS.green 
                              : item.status === 'Cancelled'
                                ? COLORS.red
                                : item.status === 'In Progress' 
                                  ? COLORS.blue 
                                  : '#F59E0B' 
                          }]} />
                          <Text style={[styles.projectStatusText, { 
                            color: item.status === 'Completed' 
                              ? COLORS.green 
                              : item.status === 'Cancelled'
                                ? COLORS.red
                                : item.status === 'In Progress' 
                                  ? COLORS.blue 
                                  : '#F59E0B' 
                          }]}>{item.status}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  {clientProjects.filter((item) => currentUser?.role !== 'Client' || item.status !== 'Hiring').length === 0 && (
                    <View style={{ padding: 30, alignItems: 'center' }}>
                      <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
                        {currentUser?.role === 'Client' ? 'No projects in progress' : 'No projects assigned yet'}
                      </Text>
                    </View>
                  )}
                </View>
              )
            )}

            {activeTab === 'your contracts' && (
              <View style={styles.projectsListCol}>
                {clientProjects
                  .map((item, idx) => (
                    <TouchableOpacity
                      key={item.id || idx}
                      style={styles.clientProjectCardDetail}
                      activeOpacity={0.85}
                      onPress={() => {
                        router.push({
                          pathname: '/project-applications',
                          params: {
                            requestId: item.id || '',
                            title: item.title,
                            location: item.location,
                            budget: item.budget || '',
                            timeline: item.timeline || '',
                            description: item.description || '',
                            requirements: Array.isArray(item.requirements) ? item.requirements.join(',') : item.requirements || '',
                          }
                        });
                      }}
                    >
                      {/* Top Badges Row */}
                      <View style={styles.cardBadgesRow}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>{item.projectType || 'General'}</Text>
                        </View>
                        <View style={styles.yourPostBadge}>
                          <Text style={styles.yourPostBadgeText}>Your Post</Text>
                        </View>
                        <View style={[
                          styles.statusBadgeHiring,
                          item.status === 'Completed' && { backgroundColor: '#ECFDF5' },
                          item.status === 'Cancelled' && { backgroundColor: '#FEF2F2' },
                          item.status === 'In Progress' && { backgroundColor: '#EFF6FF' },
                          item.status === 'Hiring' && { backgroundColor: '#F5F3FF' }
                        ]}>
                          <Text style={[
                            styles.statusBadgeHiringText,
                            item.status === 'Completed' && { color: COLORS.green },
                            item.status === 'Cancelled' && { color: COLORS.red },
                            item.status === 'In Progress' && { color: COLORS.blue },
                            item.status === 'Hiring' && { color: '#7C3AED' }
                          ]}>{item.status === 'Hiring' ? 'Pending' : item.status}</Text>
                        </View>
                        <View style={styles.locBadge}>
                          <Feather name="map-pin" size={11} color={COLORS.textMuted} />
                          <Text style={styles.locBadgeText} numberOfLines={1}>{item.location}</Text>
                        </View>
                      </View>

                      {/* Title */}
                      <Text style={styles.cardTitle}>{item.title}</Text>
                      <Text style={styles.postedByText}>Posted by: {user.name}</Text>

                      {/* Budget and Timeline Box */}
                      <View style={styles.budgetTimelineBox}>
                        <View style={styles.boxColumn}>
                          <Text style={styles.boxLabel}>Estimated Budget</Text>
                          <Text style={styles.boxValue}>₹ {item.budget || 'Ask for Quote'}</Text>
                        </View>
                        <View style={styles.boxColumn}>
                          <Text style={styles.boxLabel}>Timeline</Text>
                          <Text style={styles.boxValue}>{item.timeline || 'Flexible'}</Text>
                        </View>
                      </View>

                      {/* Description */}
                      {item.description ? (
                        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                      ) : null}

                      {/* Applicants List */}
                      {item.bids && item.bids.length > 0 && (
                        <View style={styles.applicantsSection}>
                          <Text style={styles.applicantsSectionTitle}>Applicants ({item.bids.length})</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                            {item.bids.map((bid: any) => {
                              const prof = bid.professional || {};
                              const pName = prof.fullName || 'Professional';
                              const pAvatar = resolveAvatarUrl(prof.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(pName)}&background=7C3AED&color=fff`;
                              return (
                                <View key={bid._id} style={styles.miniApplicantCard}>
                                  <Image source={{ uri: pAvatar }} style={styles.miniApplicantAvatar} />
                                  <View style={styles.miniApplicantMeta}>
                                    <Text style={styles.miniApplicantName} numberOfLines={1}>{pName}</Text>
                                    <Text style={styles.miniApplicantRole}>{prof.role || 'Contractor'}</Text>
                                  </View>
                                  <Text style={styles.miniApplicantQuotation}>{bid.cost}</Text>
                                </View>
                              );
                            })}
                          </ScrollView>
                        </View>
                      )}

                      {/* Action Button */}
                      <View style={styles.viewBidsBtn}>
                        <Text style={styles.viewBidsBtnText}>View Details / Bids</Text>
                        <Feather name="arrow-right" size={14} color={COLORS.white} style={{ marginLeft: 6 }} />
                      </View>

                    </TouchableOpacity>
                  ))}
                {clientProjects.length === 0 && (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
                      No contract requests posted yet
                    </Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'media' && (
              <View style={styles.videosGrid}>
                {getCombinedMedia().map((item, idx) => (
                  <View key={item.id || idx} style={styles.videoCard}>
                    <TouchableOpacity 
                      style={{ flex: 1 }}
                      onPress={() => {
                        if (item.type === 'video') {
                          handleOpenVideo(item.url, item.title);
                        } else {
                          handleOpenPhoto(item.url, item.title);
                        }
                      }}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: item.image || item.url }} style={styles.videoThumbnail} contentFit="cover" />
                      {item.type === 'video' && (
                        <View style={styles.videoPlayOverlay}>
                          <Feather name="play" size={24} color={COLORS.white} />
                        </View>
                      )}
                      <View style={styles.videoInfoBar}>
                        <Text style={styles.videoTitleText} numberOfLines={1}>{item.title}</Text>
                        {item.duration && <Text style={styles.videoDurationText}>{item.duration}</Text>}
                      </View>
                    </TouchableOpacity>

                    {item.postId && (
                      <TouchableOpacity 
                        style={styles.editMediaBtn}
                        onPress={() => handleEditMediaPress(item)}
                        activeOpacity={0.7}
                      >
                        <Feather name="edit-2" size={12} color={COLORS.white} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {getCombinedMedia().length === 0 && (
                  <View style={styles.emptyVideosContainer}>
                    <Feather name="play-circle" size={32} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyVideosText}>No media uploaded yet</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === 'team' && (
              <View style={styles.teamListCol}>
                <View style={styles.teamSectionHeader}>
                  <Text style={styles.teamSectionTitle}>Team Members</Text>
                  <TouchableOpacity 
                    style={styles.teamAddBtn} 
                    onPress={() => {
                      setActiveModalTab(currentUser?.role === 'Architect' ? 'Contractor' : 'Labour');
                      setModalSearchQuery('');
                      setShowAddTeamModal(true);
                      fetchRegisteredProfessionals();
                    }}
                  >
                    <Feather name="plus" size={14} color={COLORS.white} style={{ marginRight: 4 }} />
                    <Text style={styles.teamAddBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {teamMembers.map((item, idx) => (
                  <View key={idx} style={styles.teamListItem}>
                    <Image source={{ uri: item.avatar }} style={styles.teamMemberAvatar} contentFit="cover" />
                    <View style={styles.teamMemberDetails}>
                      <View style={styles.teamNameRow}>
                        <Text style={styles.teamMemberName}>{item.name}</Text>
                        <Feather name="check-circle" size={12} color={COLORS.blue} style={{ marginLeft: 5 }} />
                      </View>
                      <Text style={styles.teamMemberType}>{item.type} • Partner</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity 
                        style={styles.teamViewProfileBtn}
                        onPress={() => {
                          router.push({
                            pathname: '/labour-detail',
                            params: {
                              id: item.id || item._id || '',
                              name: item.name,
                              role: item.type,
                              avatar: item.avatar,
                              experience: item.experience,
                              location: item.location,
                              rating: item.rating,
                              reviews: item.reviews,
                              contractorName: user.name || 'BuildWell Contractors'
                            }
                          });
                        }}
                      >
                        <Text style={styles.teamViewProfileBtnText}>View Details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.teamRemoveBtn}
                        onPress={() => handleRemoveTeamMember(item.id, item.name)}
                      >
                        <Feather name="trash-2" size={16} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'reviews' && (
              <View style={styles.reviewsListCol}>
                {reviewsList.length > 0 ? (
                  <>
                    {/* Rating Breakdown */}
                    <View style={styles.ratingBreakdownBox}>
                      <View style={styles.ratingOverallCol}>
                        <Text style={styles.overallRatingValue}>{averageRating}</Text>
                        <View style={styles.overallStarsRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <FontAwesome5 key={s} name="star" solid={s <= Math.floor(parseFloat(averageRating))} size={13} color={s <= Math.floor(parseFloat(averageRating)) ? COLORS.gold : COLORS.border} style={{ marginRight: 2 }} />
                          ))}
                        </View>
                        <Text style={styles.overallRatingReviews}>{totalReviewsCount} Reviews</Text>
                      </View>
                      <View style={styles.ratingProgressCol}>
                        {[
                          { stars: '5', count: starCounts['5'].toString() },
                          { stars: '4', count: starCounts['4'].toString() },
                          { stars: '3', count: starCounts['3'].toString() },
                          { stars: '2', count: starCounts['2'].toString() },
                          { stars: '1', count: starCounts['1'].toString() }
                        ].map((row) => {
                          const percentage = totalReviewsCount > 0 ? (parseInt(row.count) / totalReviewsCount) * 100 : 0;
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

                    {/* Role Reviews Highlight */}
                    <Text style={styles.roleSectionTitle}>Role Reviews Highlight</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      contentContainerStyle={styles.roleHighlightsContainer}
                      style={{ marginBottom: 8 }}
                    >
                      {['Client', 'Contractor', 'Architect'].map((role) => {
                        const item = getLatestReviewByRole(role as any);
                        if (!item) return null;
                        
                        let badgeBgColor = COLORS.greenLight;
                        let badgeTextColor = COLORS.greenDark;
                        if (role === 'Contractor') {
                          badgeBgColor = COLORS.blueLight;
                          badgeTextColor = COLORS.blue;
                        } else if (role === 'Architect') {
                          badgeBgColor = COLORS.purpleLight;
                          badgeTextColor = COLORS.purple;
                        }

                        return (
                          <View key={role} style={styles.roleHighlightCard}>
                            <View style={styles.roleCardHeader}>
                              <View style={[styles.roleBadge, { backgroundColor: badgeBgColor }]}>
                                <Text style={[styles.roleBadgeText, { color: badgeTextColor }]}>{role}</Text>
                              </View>
                              <View style={styles.reviewStarsRow}>
                                {[1, 2, 3, 4, 5].map((s) => (
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

                    {/* Review items */}
                    <Text style={styles.roleSectionTitle}>All Reviews</Text>
                    {reviewsList.map((r: any, idx: number) => {
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
                                <FontAwesome5 key={s} name="star" solid={s <= item.rating} size={11} color={s <= item.rating ? COLORS.gold : COLORS.border} style={{ marginRight: 1 }} />
                              ))}
                            </View>
                          </View>
                          <Text style={styles.reviewText}>{item.comment}</Text>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <View style={styles.emptyReviewsContainer}>
                    <Feather name="star" size={32} color={COLORS.textLight} style={{ marginBottom: 8 }} />
                    <Text style={styles.emptyReviewsTitle}>No reviews yet</Text>
                    <Text style={styles.emptyReviewsSubtitle}>Reviews from clients and other professionals will appear here once you collaborate on projects.</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* Edit Post/Design Modal */}
      <Modal
        visible={showEditPostModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditPostModal(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <View style={{
            backgroundColor: COLORS.white,
            borderRadius: 16,
            width: width * 0.85,
            maxWidth: 360,
            padding: 20,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
              },
              android: { elevation: 5 }
            })
          }}>
            {/* Modal Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textDark }}>
                Edit {editingPostType === 'design' ? 'Design' : 'Media Post'}
              </Text>
              <TouchableOpacity onPress={() => setShowEditPostModal(false)}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Title Input (only for design posts) */}
            {editingPostType === 'design' && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6 }}>Title</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    height: 40,
                    fontSize: 14,
                    color: COLORS.textDark,
                    backgroundColor: COLORS.bgLight
                  }}
                  placeholder="Enter title..."
                  value={editingPostTitle}
                  onChangeText={setEditingPostTitle}
                />
              </View>
            )}

            {/* Description Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginBottom: 6 }}>Description</Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  minHeight: 80,
                  maxHeight: 120,
                  fontSize: 14,
                  color: COLORS.textDark,
                  backgroundColor: COLORS.bgLight,
                  textAlignVertical: 'top'
                }}
                multiline={true}
                numberOfLines={3}
                placeholder="Enter description..."
                value={editingPostDesc}
                onChangeText={setEditingPostDesc}
              />
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity 
                style={{
                  flex: 1,
                  height: 40,
                  backgroundColor: COLORS.red || '#EF4444',
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row'
                }}
                onPress={handleDeletePostPress}
              >
                <Feather name="trash-2" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 14 }}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{
                  flex: 1,
                  height: 40,
                  backgroundColor: COLORS.green || '#16A34A',
                  borderRadius: 8,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row'
                }}
                onPress={handleSavePostEdit}
              >
                <Feather name="save" size={14} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 14 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Team Member Modal */}
      <Modal
        visible={showAddTeamModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAddTeamModal(false);
          setModalSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '80%', padding: 16 }]}>
            <Text style={styles.modalTitle}>Add Team Member</Text>
            
            {/* Modal Sub-Tabs */}
            {currentUser?.role !== 'Architect' && (
              <View style={styles.modalTabRow}>
                <TouchableOpacity 
                  style={[styles.modalTabBtn, activeModalTab === 'Labour' && styles.modalActiveTabBtn]}
                  onPress={() => {
                    setActiveModalTab('Labour');
                    setModalSearchQuery('');
                  }}
                >
                  <Text style={[styles.modalTabBtnText, activeModalTab === 'Labour' && styles.modalActiveTabBtnText]}>Labours</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalTabBtn, activeModalTab === 'Architect' && styles.modalActiveTabBtn]}
                  onPress={() => {
                    setActiveModalTab('Architect');
                    setModalSearchQuery('');
                  }}
                >
                  <Text style={[styles.modalTabBtnText, activeModalTab === 'Architect' && styles.modalActiveTabBtnText]}>Architects</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Modal Search Bar */}
            <View style={styles.modalSearchContainer}>
              <Feather name="search" size={16} color={COLORS.textMuted} style={styles.modalSearchIcon} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by name, firm name, skill, location..."
                value={modalSearchQuery}
                onChangeText={setModalSearchQuery}
                placeholderTextColor={COLORS.textMuted}
              />
              {modalSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearchQuery('')} style={{ marginRight: 8 }}>
                  <Feather name="x" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleVoiceSearchPress}>
                <Feather name="mic" size={16} color={isListening ? COLORS.red : COLORS.primary} />
              </TouchableOpacity>
            </View>

            {loadingProfessionals ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading professionals...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginVertical: 12 }}>
                {(() => {
                  const rawList = 
                    activeModalTab === 'Labour' 
                      ? registeredLabours 
                      : activeModalTab === 'Contractor' 
                        ? registeredContractors 
                        : registeredArchitects;

                  const filteredList = rawList.filter((prof: any) => {
                    const query = modalSearchQuery.trim().toLowerCase();
                    const matchesName = (prof.fullName || '').toLowerCase().includes(query);
                    const matchesFirm = (prof.firmName || '').toLowerCase().includes(query);
                    const matchesSkill = 
                      (prof.skillType || '').toLowerCase().includes(query) ||
                      (prof.role || '').toLowerCase().includes(query) ||
                      (Array.isArray(prof.specialization) 
                        ? prof.specialization.some((s: string) => s.toLowerCase().includes(query)) 
                        : (prof.specialization || '').toLowerCase().includes(query)) ||
                      (Array.isArray(prof.skills)
                        ? prof.skills.some((s: string) => s.toLowerCase().includes(query))
                        : (prof.skills || '').toLowerCase().includes(query));
                    const matchesLocation = 
                      (prof.city || '').toLowerCase().includes(query) ||
                      (prof.state || '').toLowerCase().includes(query);

                    return matchesName || matchesFirm || matchesSkill || matchesLocation;
                  });

                  if (filteredList.length === 0) {
                    return <Text style={styles.noProfessionalsText}>No registered {activeModalTab.toLowerCase()}s found.</Text>;
                  }

                  return filteredList.map((prof: any) => {
                    const isAlreadyMember = teamMembers.some(m => m.id === prof._id);
                    return (
                      <View key={prof._id} style={styles.profListItem}>
                        <Image source={{ uri: resolveAvatarUrl(prof.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150&auto=format&fit=crop' }} style={styles.profAvatar} contentFit="cover" />
                        <View style={styles.profDetails}>
                          <Text style={styles.profName}>{prof.fullName}</Text>
                          {prof.firmName ? (
                            <Text style={styles.profFirm}>{prof.firmName}</Text>
                          ) : null}
                          <Text style={styles.profRole}>{prof.role === 'Labour' ? (prof.skillType || 'Labour') : prof.role}</Text>
                          <Text style={styles.profExp}>{prof.experience || '3-5 Years Exp'} • {prof.city || 'Mumbai'}</Text>
                        </View>
                        <TouchableOpacity 
                          style={[styles.profAddBtn, isAlreadyMember && styles.profAlreadyMemberBtn]}
                          disabled={isAlreadyMember}
                          onPress={() => handleAddRegisteredProfessional(prof)}
                        >
                          <Text style={styles.profAddBtnText}>{isAlreadyMember ? 'Added' : 'Add'}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  });
                })()}
              </ScrollView>
            )}

            <TouchableOpacity 
              style={[styles.modalBtn, styles.modalCancelBtn, { marginTop: 12 }]} 
              onPress={() => {
                setShowAddTeamModal(false);
                setModalSearchQuery('');
              }}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Voice Search Listening Modal Overlay */}
      <Modal
        visible={showVoiceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowVoiceModal(false);
          setIsListening(false);
        }}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <View style={{
            backgroundColor: COLORS.white,
            padding: 30,
            borderRadius: 16,
            alignItems: 'center',
            width: width * 0.8,
            maxWidth: 320,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 }}>Listening...</Text>
            
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FEE2E2',
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 20,
            }}>
              <Feather name="mic" size={32} color={COLORS.red} />
            </View>

            <Text style={{ fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20 }}>
              Speak now to search team members...
            </Text>

            {Platform.OS !== 'web' && (
              <Text style={{ fontSize: 10, color: COLORS.primary, textAlign: 'center', marginBottom: 20, fontStyle: 'italic' }}>
                Note: Simulating speech input on native environment. Tapping phone keyboard's microphone provides native dictation.
              </Text>
            )}

            <TouchableOpacity 
              style={{
                paddingVertical: 8,
                paddingHorizontal: 20,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: COLORS.border,
                backgroundColor: COLORS.bgLight
              }}
              onPress={() => {
                setShowVoiceModal(false);
                setIsListening(false);
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textDark }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===== NOTIFICATION SETTINGS MODAL ===== */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowSettingsModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            style={{
              width: width * 0.9,
              maxWidth: 400,
              backgroundColor: COLORS.white,
              borderRadius: 24,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
              paddingBottom: 12,
            }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.navy }}>
                  Notification Settings
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  Choose which alerts you want to receive
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setShowSettingsModal(false)}
                style={{
                  backgroundColor: '#F1F5F9',
                  borderRadius: 15,
                  width: 30,
                  height: 30,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Feather name="x" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Toggles Container */}
            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {[
                { key: 'messages', label: 'Messages', desc: 'Direct chat messages & alerts', icon: 'message-square' },
                { key: 'projectUpdates', label: 'Project Updates', desc: 'Bid selections, applications, invites', icon: 'briefcase' },
                { key: 'contracts', label: 'Contracts', desc: 'Contract assignment notifications', icon: 'file-text' },
                { key: 'payments', label: 'Payments', desc: 'Milestone and payout notifications', icon: 'dollar-sign' },
                { key: 'marketing', label: 'Marketing', desc: 'News, tips, and AI recommendations', icon: 'gift' },
                { key: 'systemAlerts', label: 'System Alerts', desc: 'Maintenance and official announcements', icon: 'bell' },
              ].map((item) => {
                const isChecked = notifSettings[item.key as keyof typeof notifSettings];
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F1F5F9',
                    }}
                    onPress={() => {
                      handleToggleSettings(item.key, !isChecked);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: isChecked ? '#FEF3C7' : '#F1F5F9',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                        <Feather name={item.icon as any} size={16} color={isChecked ? COLORS.primary : COLORS.textMuted} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark }}>
                          {item.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                          {item.desc}
                        </Text>
                      </View>
                    </View>

                    {/* Switch/Checkbox */}
                    <View style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: isChecked ? COLORS.green : '#E2E8F0',
                      padding: 2,
                      justifyContent: 'center',
                      alignItems: isChecked ? 'flex-end' : 'flex-start',
                    }}>
                      <View style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: COLORS.white,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 1.5,
                        elevation: 2,
                      }} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Save Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 1.5,
                  borderColor: COLORS.border,
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: COLORS.white,
                }}
                onPress={() => setShowSettingsModal(false)}
                disabled={savingSettings}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1.5,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: COLORS.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => setShowSettingsModal(false)}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.white }}>
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ===== LANGUAGE SELECTOR MODAL ===== */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowLanguageModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            style={{
              width: width * 0.88,
              maxWidth: 360,
              backgroundColor: COLORS.white,
              borderRadius: 24,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Modal Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.navy }}>
                {t('chooseLanguage') || 'Choose Your Language'}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowLanguageModal(false)}
                style={{
                  backgroundColor: '#F1F5F9',
                  borderRadius: 15,
                  width: 30,
                  height: 30,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Feather name="x" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Language Options */}
            {[
              { code: 'en', native: 'English', eng: 'English', emoji: '🇺🇸' },
              { code: 'hi', native: 'हिन्दी', eng: 'Hindi', emoji: '🇮🇳' },
              { code: 'mr', native: 'मराठी', eng: 'Marathi', emoji: '🇮🇳' }
            ].map((lang) => {
              const isSelected = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    borderRadius: 16,
                    backgroundColor: isSelected ? '#FEF3C7' : '#F8FAFC',
                    borderWidth: 1.5,
                    borderColor: isSelected ? COLORS.primary : '#F1F5F9',
                    marginBottom: 12,
                  }}
                  onPress={() => {
                    i18n.changeLanguage(lang.code);
                    setShowLanguageModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>{lang.emoji}</Text>
                    <View style={{ alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textDark }}>
                        {lang.native}
                      </Text>
                      <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                        {lang.eng}
                      </Text>
                    </View>
                  </View>

                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: isSelected ? COLORS.primary : '#CBD5E1',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: isSelected ? COLORS.primary : 'transparent',
                  }}>
                    {isSelected && (
                      <Feather name="check" size={12} color={COLORS.white} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ================= PORTFOLIO VIDEO MODAL ================= */}
      <Modal
        visible={!!selectedVideoUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVideo}
      >
        <View style={styles.videoModalOverlay}>
          <View style={styles.videoModalHeader}>
            <Text style={styles.videoModalTitle} numberOfLines={1}>{selectedVideoTitle}</Text>
            <TouchableOpacity onPress={handleCloseVideo} style={styles.videoCloseBtn}>
              <Feather name="x" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.videoModalContainer}>
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
      {/* ================= PHOTO VIEWER MODAL ================= */}
      <Modal
        visible={!!selectedPhotoUrl}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClosePhoto}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalHeader}>
            <Text style={styles.photoModalTitle} numberOfLines={1}>{selectedPhotoTitle}</Text>
            <TouchableOpacity onPress={handleClosePhoto} style={styles.photoCloseBtn}>
              <Feather name="x" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.photoModalBody}>
            {selectedPhotoUrl && (
              <Image source={{ uri: selectedPhotoUrl }} style={styles.photoFullScreen} contentFit="contain" />
            )}
          </View>
        </View>
      </Modal>
      {/* ================= WORK AREA MODAL (LABOUR) ================= */}
      <Modal visible={showWorkAreaModal} transparent animationType="slide" onRequestClose={() => setShowWorkAreaModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.navy }}>Work Area</Text>
              <TouchableOpacity onPress={() => setShowWorkAreaModal(false)}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 6, fontWeight: '600' }}>City / Area Name</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.textDark, marginBottom: 16, backgroundColor: COLORS.bgLight }}
              placeholder="E.g. Dadar, Mumbai"
              placeholderTextColor={COLORS.textLight}
              value={workAreaInput}
              onChangeText={setWorkAreaInput}
            />

            <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 6, fontWeight: '600' }}>Radius (km)</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              {[5, 10, 15, 25, 50].map(r => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setWorkAreaRadiusInput(String(r))}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: workAreaRadiusInput === String(r) ? COLORS.green : COLORS.border,
                    backgroundColor: workAreaRadiusInput === String(r) ? COLORS.greenLight : COLORS.white,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: workAreaRadiusInput === String(r) ? COLORS.greenDark : COLORS.textMuted }}>{r} km</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: COLORS.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              onPress={handleSaveWorkArea}
            >
              <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 15 }}>Save Work Area</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  // ===== LABOUR PROFILE STYLES =====
  labourProfileContainer: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
  },
  labourAvatarSection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  labourAvatarTouchable: {
    position: 'relative',
  },
  labourAvatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  labourCameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.textDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  labourNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  labourName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.navy,
    flexShrink: 1,
  },
  labourVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  labourVerifiedText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '700',
  },
  premiumBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  labourSkillsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  labourIdText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 16,
    fontWeight: '600',
  },
  labourEditProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 16,
  },
  labourEditProfileBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  labourAvailabilityCard: {
    backgroundColor: COLORS.greenLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  labourAvailabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  availabilityLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
  },
  availabilitySubText: {
    fontSize: 12,
    color: COLORS.greenDark,
    marginTop: 2,
  },
  labourWorkAreaCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  workAreaLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  workAreaCity: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 1,
  },
  workAreaRadius: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  workAreaChangeBtn: {
    fontSize: 13,
    color: COLORS.blue,
    fontWeight: '700',
  },
  labourNetworksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  labourNetworksText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  labourStatsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgLight,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  labourStatCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
  },
  labourStatNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.navy,
  },
  labourStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // ===== LABOUR MY WORK STYLES =====
  labourWorkSection: {
    marginTop: 4,
  },
  labourWorkSubTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
    gap: 24,
  },
  labourWorkSubTabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    position: 'relative',
    alignItems: 'center',
  },
  labourWorkSubTabBtnActive: {},
  labourWorkSubTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  labourWorkSubTabTextActive: {
    color: '#16A34A',
    fontWeight: '700',
  },
  labourWorkSubTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#16A34A',
    borderRadius: 2,
  },
  labourJobsList: {
    gap: 12,
  },
  labourJobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  labourJobThumbnail: {
    width: 76,
    height: 76,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  labourJobDetailsCol: {
    flex: 1,
    justifyContent: 'center',
  },
  labourJobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  labourJobMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  labourJobMetaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  labourJobStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  labourJobStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  labourJobsEmptyBox: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labourJobsEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  labourJobsEmptySub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // ===== END LABOUR STYLES =====

  navHeader: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  headerRightActions: { flexDirection: 'row', gap: 8 },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bgLight,
    justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { paddingBottom: 80 },
  clientHeaderContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  clientAvatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
    marginBottom: 12,
    overflow: 'visible',
    position: 'relative',
  },
  clientAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 37,
  },
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
  coverContainer: { height: 180, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  avatarWrapper: {
    position: 'absolute',
    bottom: -35,
    left: 20,
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 3,
    borderColor: COLORS.white,
    backgroundColor: COLORS.white,
    overflow: 'visible',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 36 },
  profileSection: { marginTop: 45, paddingHorizontal: 20 },
  profileName: { flex: 1, fontSize: 20, fontWeight: '800', color: COLORS.textDark, marginBottom: 2, marginRight: 10 },
  subtitleText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  phoneText: { fontSize: 14, color: COLORS.textDark, fontWeight: '500' },
  clientEditProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  clientEditProfileBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  clientStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clientStatBox: {
    alignItems: 'center',
    flex: 1,
  },
  clientStatNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  clientStatLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  clientStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  profileNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  profileActionBtnsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallEditProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallEditProfileBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  smallLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallLogoutBtnText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '700',
  },
  followStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  followStatCol: { flexDirection: 'row', alignItems: 'baseline' },
  followStatNumber: { fontSize: 16, fontWeight: '800', color: COLORS.textDark },
  followStatLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '500' },
  followStatDivider: { width: 1, height: 16, backgroundColor: COLORS.border },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillText: { fontSize: 12, color: COLORS.textDark, fontWeight: '600' },
  specializationSection: { marginBottom: 24 },
  sectionHeaderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 12 },
  specScrollRow: { gap: 8 },
  specTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  specDot: {
    width: 7, height: 7, borderRadius: 3.5,
    backgroundColor: COLORS.primary,
  },
  specTagText: { fontSize: 12, color: COLORS.textDark, fontWeight: '500' },

  summaryStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 4,
  },
  summaryStatLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  summaryStatValue: {
    fontSize: 11,
    fontWeight: '800',
  },
  tabSegmentContainer: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 16 },
  tabScrollRow: { gap: 24, paddingBottom: 0 },
  tabButton: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTabButton: { borderBottomColor: COLORS.primary },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted },
  activeTabButtonText: { color: COLORS.primary },
  tabContentArea: { minHeight: 180 },
  projectsListCol: { gap: 14 },
  clientProjectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  completedProjectCard: {
    borderColor: '#E2E8F0',
  },
  cancelledProjectCard: {
    opacity: 0.7,
  },
  newUpdateBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  newUpdateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  newUpdateText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#3B82F6',
  },
  clientProjectCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
    marginRight: 80,
  },
  clientProjectCardLoc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 10,
  },
  projectStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  projectStatusDot: { width: 7, height: 7, borderRadius: 3.5 },
  projectStatusText: { fontSize: 12, fontWeight: '700' },
  videosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  videoCard: { width: (width - 50) / 2, height: 130, borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.bgLight, position: 'relative' },
  editMediaBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  videoThumbnail: { width: '100%', height: '100%' },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfoBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 5, paddingHorizontal: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  videoTitleText: { flex: 1, color: COLORS.white, fontSize: 11, fontWeight: '600', marginRight: 5 },
  videoDurationText: { color: COLORS.white, fontSize: 9 },
  emptyVideosContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyVideosText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  teamListCol: { gap: 12 },
  teamSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  teamSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  teamAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  teamAddBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  teamListItem: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, alignItems: 'center' },
  teamMemberAvatar: { width: 44, height: 44, borderRadius: 22 },
  teamMemberDetails: { flex: 1, marginLeft: 12 },
  teamNameRow: { flexDirection: 'row', alignItems: 'center' },
  teamMemberName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  teamMemberType: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  teamViewProfileBtn: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 },
  teamViewProfileBtnText: { fontSize: 11, color: COLORS.textDark, fontWeight: '600' },
  teamRemoveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  reviewsListCol: { gap: 15 },
  ratingBreakdownBox: { flexDirection: 'row', padding: 15, backgroundColor: COLORS.bgLight, borderRadius: 12, alignItems: 'center' },
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
  reviewStarsRow: { flexDirection: 'row' },
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
  reviewItemCard: { padding: 15, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12 },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18 },
  reviewerMeta: { flex: 1, marginLeft: 10 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },
  reviewDate: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  reviewText: { fontSize: 13, color: COLORS.textDark, marginTop: 10, lineHeight: 18 },
  emptyReviewsContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyReviewsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptyReviewsSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modalActiveTabBtn: {
    borderBottomColor: COLORS.primary,
  },
  modalTabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  modalActiveTabBtnText: {
    color: COLORS.primary,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  noProfessionalsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    padding: 20,
  },
  profListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: '#E2E8F0',
  },
  profDetails: {
    flex: 1,
  },
  profName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  profFirm: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
    marginTop: 1,
    marginBottom: 1,
  },
  profRole: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  profExp: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 1,
  },
  profAddBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profAlreadyMemberBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  profAddBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  modalBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    height: 44,
    width: '100%',
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
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginTop: 12,
    marginBottom: 4,
  },
  modalSearchIcon: {
    marginRight: 8,
  },
  modalSearchInput: {
    flex: 1,
    height: '100%',
    color: '#111827',
    fontSize: 14,
    padding: 0,
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
  pickerYearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  pickerArrowBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pickerYearText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  pickerMonthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  pickerMonthCell: {
    width: '30%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginVertical: 4,
  },
  pickerMonthCellActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  pickerMonthText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  pickerMonthTextActive: {
    color: COLORS.white,
    fontWeight: '800',
  },
  pickerCloseBtn: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  pickerCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  videoModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  videoModalHeader: {
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
  videoModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    flex: 1,
    marginRight: 12,
  },
  videoCloseBtn: {
    padding: 8,
  },
  portfolioVideoPlayer: {
    width: '100%',
    height: '100%',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  textInput: {
    fontSize: 13,
    color: COLORS.textDark,
    padding: 0,
  },
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
  /* CONTRACT OPPORTUNITY CARD STYLES */
  clientProjectCardDetail: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  cardBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  categoryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  yourPostBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  yourPostBadgeText: {
    color: '#7C3AED',
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadgeHiring: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeHiringText: {
    color: '#2563EB',
    fontSize: 10,
    fontWeight: '800',
  },
  locBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
  },
  locBadgeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    maxWidth: 100,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  postedByText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  budgetTimelineBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 16,
    marginBottom: 12,
  },
  boxColumn: {
    flex: 1,
  },
  boxLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  boxValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  cardDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginBottom: 12,
  },
  applicantsSection: {
    marginTop: 6,
    marginBottom: 12,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  applicantsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  miniApplicantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    width: 170,
    gap: 8,
  },
  miniApplicantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#CBD5E1',
  },
  miniApplicantMeta: {
    flex: 1,
  },
  miniApplicantName: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  miniApplicantRole: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  miniApplicantQuotation: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7C3AED',
  },
  viewBidsBtn: {
    backgroundColor: '#7C3AED',
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBidsBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  proofContainer: {
    marginTop: 6,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  proofTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proofTimeLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  proofTimeValue: {
    fontWeight: '700',
    color: '#1E293B',
  },
  proofTimeSeparator: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  proofLocRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  proofAddressText: {
    flex: 1,
    fontSize: 10,
    color: '#475569',
    lineHeight: 14,
  },
  proofFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  proofDistanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  proofDistanceText: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '600',
  },
  mapsLinkBtn: {
    paddingVertical: 2,
  },
  mapsLinkText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '700',
  },
});
