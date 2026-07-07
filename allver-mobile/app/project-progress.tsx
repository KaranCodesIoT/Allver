import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Alert, Modal, TextInput, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import * as Location from 'expo-location';
import SocketService from '../utils/SocketService';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';
import { useTranslation } from '../utils/i18n';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#F59E0B',
  navy: '#0F172A',
  white: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  bgLight: '#F8FAFC',
  border: '#E2E8F0',
  green: '#22C55E',
  greenLight: '#ECFDF5',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  red: '#EF4444',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
};

interface TimelineUpdate {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  images?: string[];
  video?: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  comments?: any[];
  postedBy?: {
    senderId?: string;
    senderName?: string;
    senderRole?: string;
  };
}



const STATUS_CONFIG: Record<string, {
  color: string;
  bg: string;
  dotColor: string;
  label: string;
  description: string;
  animation?: 'blink' | 'pulse' | 'none';
}> = {
  'Request Sent': {
    color: '#B45309',
    bg: '#FEF3C7',
    dotColor: '#F59E0B',
    label: 'Request Sent',
    description: 'Waiting for contractor response.',
    animation: 'blink',
  },
  'Accepted': {
    color: '#1D4ED8',
    bg: '#EFF6FF',
    dotColor: '#3B82F6',
    label: 'Accepted',
    description: 'Contractor accepted your request.',
    animation: 'pulse',
  },
  'Planning': {
    color: '#6D28D9',
    bg: '#F5F3FF',
    dotColor: '#8B5CF6',
    label: 'Planning',
    description: 'Materials, workers, and schedule are being prepared.',
    animation: 'none',
  },
  'Work Started': {
    color: '#15803D',
    bg: '#F0FDF4',
    dotColor: '#22C55E',
    label: 'Work Started',
    description: 'Construction is in progress.',
    animation: 'pulse',
  },
  'On Track': {
    color: '#15803D',
    bg: '#F0FDF4',
    dotColor: '#22C55E',
    label: 'On Track',
    description: 'Everything is progressing as planned.',
    animation: 'none',
  },
  'Delayed': {
    color: '#C2410C',
    bg: '#FFF7ED',
    dotColor: '#F97316',
    label: 'Delayed',
    description: 'Project is behind schedule.',
    animation: 'none',
  },
  'Attention Required': {
    color: '#B91C1C',
    bg: '#FEF2F2',
    dotColor: '#EF4444',
    label: 'Attention Required',
    description: 'Issue reported. Client action required.',
    animation: 'blink',
  },
  'Quality Check': {
    color: '#15803D',
    bg: '#F0FDF4',
    dotColor: '#22C55E',
    label: 'Quality Check',
    description: 'Final inspection is in progress.',
    animation: 'none',
  },
  'Completed': {
    color: '#15803D',
    bg: '#F0FDF4',
    dotColor: '#22C55E',
    label: 'Completed',
    description: 'Project finished successfully.',
    animation: 'none',
  },
  'Awaiting Review': {
    color: '#B45309',
    bg: '#FEF3C7',
    dotColor: '#F59E0B',
    label: 'Awaiting Review',
    description: 'Rate and review the contractor.',
    animation: 'none',
  },
  'Cancelled': {
    color: '#B91C1C',
    bg: '#FEF2F2',
    dotColor: '#EF4444',
    label: 'Cancelled',
    description: 'This project has been cancelled by the Client.',
    animation: 'none',
  },
};

export default function ProjectProgressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const workspaceId = params.workspaceId as string;
  const { t } = useTranslation();

  const blinkAnimStatus = useRef(new Animated.Value(1)).current;
  const pulseAnimStatus = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnimStatus, {
          toValue: 0.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnimStatus, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    blinkLoop.start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimStatus, {
          toValue: 1.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimStatus, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      blinkLoop.stop();
      pulseLoop.stop();
    };
  }, []);

  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState<any>(null);

  const getParamNumeric = (val: string | string[] | undefined, defaultVal: number): number => {
    if (!val) return defaultVal;
    const str = Array.isArray(val) ? val[0] : val;
    const clean = str.replace(/[^\d]/g, '');
    const num = parseInt(clean);
    return isNaN(num) ? defaultVal : num;
  };

  const [demoPaidAmount, setDemoPaidAmount] = useState<number>(() => {
    return getParamNumeric(params.paidAmount as string, 600000);
  });
  const [demoTotalAmount, setDemoTotalAmount] = useState<number>(() => {
    return getParamNumeric(params.totalAmount as string, 850000);
  });

  useEffect(() => {
    if (!workspace) {
      if (params.paidAmount) {
        setDemoPaidAmount(getParamNumeric(params.paidAmount as string, 600000));
      }
      if (params.totalAmount) {
        setDemoTotalAmount(getParamNumeric(params.totalAmount as string, 850000));
      }
    }
  }, [params.paidAmount, params.totalAmount, workspace]);

  useEffect(() => {
    if (!workspaceId) return;
    const s = SocketService;
    setSocket(s);

    s.emit('join_room', { roomId: workspaceId });

    const handleWorkspaceUpdated = (data: any) => {
      if (data.workspaceId === workspaceId && data.workspace) {
        console.log('[ProjectProgress] Workspace updated via socket:', data);
        setWorkspace(data.workspace);
      }
    };

    s.on('workspace_updated', handleWorkspaceUpdated);

    return () => {
      s.off('workspace_updated', handleWorkspaceUpdated);
    };
  }, [workspaceId]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserFullName, setCurrentUserFullName] = useState<string>('User');

  // Add / Edit Update states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formImg, setFormImg] = useState('');
  const [formVideo, setFormVideo] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [fullscreenMedia, setFullscreenMedia] = useState<{ type: 'image' | 'video', url: string } | null>(null);

  // Rework/Workflow states
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [reworkCommentText, setReworkCommentText] = useState('');

  // Rating & Review states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<any>(null); // { user: any, relation: string }
  const [ratingScores, setRatingScores] = useState<{ [key: string]: number }>({});
  const [ratingReviewText, setRatingReviewText] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Team Management states
  const [architectList, setArchitectList] = useState<any[]>([]);
  const [contractorList, setContractorList] = useState<any[]>([]);
  const [labourList, setLabourList] = useState<any[]>([]);
  const [showArchitectModal, setShowArchitectModal] = useState(false);
  const [showContractorModal, setShowContractorModal] = useState(false);
  const [showLabourModal, setShowLabourModal] = useState(false);
  const [loadingArchitects, setLoadingArchitects] = useState(false);
  const [loadingContractors, setLoadingContractors] = useState(false);
  const [loadingLabour, setLoadingLabour] = useState(false);

  const uploadMediaFileDirect = async (
    uri: string, 
    mediaType: 'image' | 'video', 
    assetFileName?: string | null, 
    assetMimeType?: string | null,
    latitude?: string,
    longitude?: string,
    address?: string
  ): Promise<string | null> => {
    // 1. Get clean filename
    // 1. Get filename
    const filename = assetFileName || uri.split('/').pop() || (mediaType === 'image' ? 'photo.jpg' : 'video.mp4');
    const cleanFilename = filename.split('?')[0].split('#')[0]; // strip query string or hashes if any

    // 2. Get clean mime type
    let type = assetMimeType;
    if (!type) {
      const match = /\.(\w+)$/.exec(cleanFilename);
      const ext = match ? match[1].toLowerCase() : (mediaType === 'image' ? 'jpg' : 'mp4');
      if (mediaType === 'image') {
        type = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      } else {
        type = ext === 'mov' || ext === 'quicktime' ? 'video/quicktime' : 'video/mp4';
      }
    }

    // 3. Fix local file path prefix on Android
    let uploadUri = uri;
    if (Platform.OS === 'android' && !uploadUri.startsWith('file://') && !uploadUri.startsWith('content://')) {
      if (uploadUri.startsWith('file:')) {
        uploadUri = uploadUri.replace('file:/', 'file:///');
      } else {
        uploadUri = `file://${uploadUri}`;
      }
    }

    const formData = new FormData();
    formData.append('latitude', latitude || '');
    formData.append('longitude', longitude || '');
    formData.append('address', address || '');

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], cleanFilename, { type: blob.type || type });
      formData.append('image', file);
    } else {
      formData.append('image', {
        uri: uploadUri,
        name: cleanFilename,
        type: type,
      } as any);
    }

    const res = await fetch(`${BACKEND_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      return data.url || null;
    }
    return null;
  };

  const uploadMediaFile = async (
    uri: string, 
    mediaType: 'image' | 'video', 
    assetFileName?: string | null, 
    assetMimeType?: string | null
  ) => {
    setUploadingMedia(true);
    try {
      // Fetch location ONCE
      let latVal = '';
      let lonVal = '';
      let addressVal = '';
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc && loc.coords) {
            latVal = loc.coords.latitude.toString();
            lonVal = loc.coords.longitude.toString();
            
            try {
              const rev = await Location.reverseGeocodeAsync({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude
              });
              if (rev && rev.length > 0) {
                const addr = rev[0];
                const parts = [
                  addr.name,
                  addr.city || addr.subregion,
                  addr.region
                ].filter(Boolean);
                addressVal = parts.join(', ');
              }
            } catch (geocodingErr) {
              console.warn('Geocoding failed:', geocodingErr);
            }
          }
        }
      } catch (gpsErr) {
        console.warn('Failed to fetch GPS coordinates for photo stamp:', gpsErr);
      }

      const url = await uploadMediaFileDirect(uri, mediaType, assetFileName, assetMimeType, latVal, lonVal, addressVal);
      if (url) {
        if (mediaType === 'image') {
          setFormImg(prev => {
            const existing = prev ? prev.split(',').filter(Boolean) : [];
            const combined = [...existing, url].slice(0, 5);
            return combined.join(',');
          });
        } else {
          setFormVideo(prev => {
            const existing = prev ? prev.split(',').filter(Boolean) : [];
            const combined = [...existing, url].slice(0, 2);
            return combined.join(',');
          });
        }
      } else {
        Alert.alert('Upload Failed', 'Could not upload file.');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Upload Error', 'An error occurred during upload.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const pickMedia = async (mediaType: 'image' | 'video') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Permission to access gallery is required!');
      return;
    }

    if (mediaType === 'image') {
      const existingCount = formImg ? formImg.split(',').filter(Boolean).length : 0;
      if (existingCount >= 5) {
        Alert.alert('Limit Reached', 'You can upload a maximum of 5 images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 5 - existingCount,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
        for (const asset of result.assets) {
          if (asset.fileSize && asset.fileSize > MAX_IMAGE_SIZE) {
            Alert.alert(
              'Image Too Large', 
              `Image size is ${(asset.fileSize / (1024 * 1024)).toFixed(1)}MB. Please select an image smaller than 10MB.`
            );
            return;
          }
        }
        setUploadingMedia(true);
        try {
          // Fetch location ONCE for the whole batch
          let latVal = '';
          let lonVal = '';
          let addressVal = '';
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              if (loc && loc.coords) {
                latVal = loc.coords.latitude.toString();
                lonVal = loc.coords.longitude.toString();
                
                try {
                  const rev = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude
                  });
                  if (rev && rev.length > 0) {
                    const addr = rev[0];
                    const parts = [
                      addr.name,
                      addr.city || addr.subregion,
                      addr.region
                    ].filter(Boolean);
                    addressVal = parts.join(', ');
                  }
                } catch (geocodingErr) {
                  console.warn('Geocoding failed:', geocodingErr);
                }
              }
            }
          } catch (gpsErr) {
            console.warn('Failed to fetch GPS coordinates for photo stamp:', gpsErr);
          }

          const uploadedUrls: string[] = [];
          for (const asset of result.assets) {
            const url = await uploadMediaFileDirect(asset.uri, 'image', asset.fileName, asset.mimeType, latVal, lonVal, addressVal);
            if (url) {
              uploadedUrls.push(url);
            }
          }
          if (uploadedUrls.length > 0) {
            setFormImg(prev => {
              const existing = prev ? prev.split(',').filter(Boolean) : [];
              const combined = [...existing, ...uploadedUrls].slice(0, 5);
              return combined.join(',');
            });
          } else {
            Alert.alert('Upload Failed', 'Could not upload selected images.');
          }
        } catch (err) {
          console.error('Error uploading multiple images:', err);
          Alert.alert('Upload Error', 'An error occurred while uploading images.');
        } finally {
          setUploadingMedia(false);
        }
      }
    } else {
      const existingCount = formVideo ? formVideo.split(',').filter(Boolean).length : 0;
      if (existingCount >= 2) {
        Alert.alert('Limit Reached', 'You can upload a maximum of 2 videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 2 - existingCount,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB
        for (const asset of result.assets) {
          if (asset.fileSize && asset.fileSize > MAX_VIDEO_SIZE) {
            Alert.alert(
              'Video Too Large', 
              `Video size is ${(asset.fileSize / (1024 * 1024)).toFixed(1)}MB. Please select a video smaller than 15MB.`
            );
            return;
          }
        }
        setUploadingMedia(true);
        try {
          // Fetch location ONCE for the video batch
          let latVal = '';
          let lonVal = '';
          let addressVal = '';
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              if (loc && loc.coords) {
                latVal = loc.coords.latitude.toString();
                lonVal = loc.coords.longitude.toString();
                
                try {
                  const rev = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude
                  });
                  if (rev && rev.length > 0) {
                    const addr = rev[0];
                    const parts = [
                      addr.name,
                      addr.city || addr.subregion,
                      addr.region
                    ].filter(Boolean);
                    addressVal = parts.join(', ');
                  }
                } catch (geocodingErr) {
                  console.warn('Geocoding failed:', geocodingErr);
                }
              }
            }
          } catch (gpsErr) {
            console.warn('Failed to fetch GPS coordinates for photo stamp:', gpsErr);
          }

          const uploadedUrls: string[] = [];
          for (const asset of result.assets) {
            const url = await uploadMediaFileDirect(asset.uri, 'video', asset.fileName, asset.mimeType, latVal, lonVal, addressVal);
            if (url) {
              uploadedUrls.push(url);
            }
          }
          if (uploadedUrls.length > 0) {
            setFormVideo(prev => {
              const existing = prev ? prev.split(',').filter(Boolean) : [];
              const combined = [...existing, ...uploadedUrls].slice(0, 2);
              return combined.join(',');
            });
          } else {
            Alert.alert('Upload Failed', 'Could not upload selected videos.');
          }
        } catch (err) {
          console.error('Error uploading videos:', err);
          Alert.alert('Upload Error', 'An error occurred while uploading videos.');
        } finally {
          setUploadingMedia(false);
        }
      }
    }
  };

  const clickPhotoWithCamera = async () => {
    const count = formImg ? formImg.split(',').filter(Boolean).length : 0;
    if (count >= 5) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 5 images.');
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Denied', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      await uploadMediaFile(asset.uri, 'image', asset.fileName, asset.mimeType);
    }
  };

  const [localUpdates, setLocalUpdates] = useState<TimelineUpdate[]>([]);
  const [isTeamExpanded, setIsTeamExpanded] = useState(true);

  // Reply states
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const [timelineY, setTimelineY] = useState(0);

  useEffect(() => {
    if (params.focusSection === 'timeline' && timelineY > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: timelineY, animated: true });
      }, 400);
    }
  }, [params.focusSection, timelineY]);

  // Load current user
  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { user = JSON.parse(stored); } catch (e) {}
      }
    }
    if (user?._id) {
      setCurrentUserId(user._id);
      setCurrentUserRole(user.role);
      setCurrentUserFullName(user.fullName || 'User');
    }
  }, []);

  const getUserIdStr = (userObj: any) => {
    if (!userObj) return '';
    if (typeof userObj === 'string') return userObj;
    return userObj._id?.toString() || '';
  };

  const projectStatus = workspace?.status || (params.status as string) || 'In Progress';

  const isClient = workspace 
    ? (getUserIdStr(workspace.client) === currentUserId)
    : (currentUserRole === 'Client');

  const isContractor = workspace 
    ? (getUserIdStr(workspace.professional) === currentUserId || 
       getUserIdStr(workspace.contractor) === currentUserId ||
       getUserIdStr(workspace.architect) === currentUserId)
    : (currentUserRole === 'Contractor' || currentUserRole === 'Architect');

  const isLabourMember = workspace && workspace.labourTeam
    ? workspace.labourTeam.some((l: any) => getUserIdStr(l) === currentUserId)
    : (currentUserRole === 'Labour');

  const isCompleted = projectStatus === 'Completed';
  const isCancelled = projectStatus === 'Cancelled';
  const isReadOnly = isCompleted || isCancelled;

  const canPostUpdates = (isContractor || isLabourMember) && !isReadOnly;

  const isWorkspaceClient = workspace && getUserIdStr(workspace.client) === currentUserId;

  const canManageArchitect = workspace && !isReadOnly && (
    isWorkspaceClient ||
    (getUserIdStr(workspace.professional) === currentUserId && workspace.professional?.role === 'Contractor') ||
    (getUserIdStr(workspace.contractor) === currentUserId)
  );

  const canManageContractor = workspace && !isReadOnly && (
    isWorkspaceClient ||
    (getUserIdStr(workspace.professional) === currentUserId && workspace.professional?.role === 'Architect') ||
    (getUserIdStr(workspace.architect) === currentUserId)
  );

  // Clients and Architects CANNOT manage labour — only actual contractors can
  const canManageLabour = workspace && !isReadOnly && (
    (getUserIdStr(workspace.professional) === currentUserId && workspace.professional?.role === 'Contractor') ||
    (getUserIdStr(workspace.contractor) === currentUserId && currentUserRole === 'Contractor')
  );

  const canManageTeam = (workspace 
    ? (getUserIdStr(workspace.professional) === currentUserId || 
       getUserIdStr(workspace.contractor) === currentUserId ||
       getUserIdStr(workspace.architect) === currentUserId)
    : (currentUserRole === 'Contractor' || currentUserRole === 'Architect')) && !isReadOnly;

  const RELATION_CRITERIA: { [key: string]: string[] } = {
    'Client → Contractor': [
      'Quality of work',
      'Communication',
      'Timeliness',
      'Professionalism',
      'Would hire again?'
    ],
    'Contractor → Client': [
      'Timely payments',
      'Clear requirements',
      'Cooperation',
      'Respectful behaviour',
      'Overall experience'
    ],
    'Contractor → Labour': [
      'Skill',
      'Attendance',
      'Discipline',
      'Speed',
      'Quality'
    ],
    'Labour → Contractor': [
      'Payment on time',
      'Behaviour',
      'Safety',
      'Work management',
      'Fair treatment'
    ],
    'Contractor → Architect': [
      'Design quality',
      'Communication',
      'Responsiveness',
      'Accuracy'
    ],
    'Architect → Contractor': [
      'Cooperation',
      'Clarity',
      'Professionalism',
      'Payment'
    ],
    'Client → Architect': [
      'Design quality',
      'Communication',
      'Responsiveness',
      'Accuracy'
    ],
    'Client → Labour': [
      'Skill & efficiency',
      'Punctuality & attendance',
      'Discipline & behaviour',
      'Work Quality',
      'Overall rating'
    ]
  };

  const getRateableTargets = () => {
    if (!workspace || !currentUserId) return [];
    
    const targets: any[] = [];
    const clientObj = workspace.client;
    const contractorObj = workspace.contractor || (workspace.professional?.role === 'Contractor' ? workspace.professional : null);
    const architectObj = workspace.architect || (workspace.professional?.role === 'Architect' ? workspace.professional : null);
    const labourTeamObjs = workspace.labourTeam || [];

    // Determine current user's actual role in this workspace
    let myRole = currentUserRole;
    if (!myRole && currentUserId) {
      if (getUserIdStr(clientObj) === currentUserId) myRole = 'Client';
      else if (contractorObj && getUserIdStr(contractorObj) === currentUserId) myRole = 'Contractor';
      else if (architectObj && getUserIdStr(architectObj) === currentUserId) myRole = 'Architect';
      else if (labourTeamObjs.some((l: any) => getUserIdStr(l) === currentUserId)) myRole = 'Labour';
    }

    if (!myRole) return [];

    // Only Client can rate all other project members (Contractor, Architect, Labour team)
    if (myRole === 'Client') {
      if (contractorObj && getUserIdStr(contractorObj) !== currentUserId) {
        targets.push({ user: contractorObj, relation: 'Client → Contractor' });
      }
      if (architectObj && getUserIdStr(architectObj) !== currentUserId) {
        targets.push({ user: architectObj, relation: 'Client → Architect' });
      }
      labourTeamObjs.forEach((lab: any) => {
        if (getUserIdStr(lab) !== currentUserId) {
          targets.push({ user: lab, relation: 'Client → Labour' });
        }
      });
    }

    return targets;
  };

  const isAlreadyRated = (toUserId: string) => {
    if (!workspace || !workspace.ratings || !currentUserId) return false;
    return workspace.ratings.some(
      (r: any) => getUserIdStr(r.from) === currentUserId && getUserIdStr(r.to) === toUserId
    );
  };

  const handleOpenRatingModal = (target: any) => {
    setRatingTarget(target);
    const criteriaList = RELATION_CRITERIA[target.relation] || [];
    const initialScores: { [key: string]: number } = {};
    criteriaList.forEach(c => {
      initialScores[c] = 5; // default 5 stars
    });
    setRatingScores(initialScores);
    setRatingReviewText('');
    setShowRatingModal(true);
  };

  const handleSelectStar = (criterion: string, stars: number) => {
    setRatingScores(prev => ({
      ...prev,
      [criterion]: stars
    }));
  };

  const handleSubmitRating = async () => {
    if (!workspaceId || !currentUserId || !ratingTarget) return;

    // Calculate average rating
    const scores = Object.values(ratingScores);
    if (scores.length === 0) {
      Alert.alert('Error', 'No criteria found to rate.');
      return;
    }
    const average = scores.reduce((sum, val) => sum + val, 0) / scores.length;
    const finalRating = Math.round(average * 10) / 10; // round to 1 decimal place

    setSubmittingRating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: currentUserId,
          to: ratingTarget.user._id,
          rating: finalRating,
          reviewText: ratingReviewText.trim(),
          criteria: ratingScores
        })
      });

      const data = await res.json();
      if (res.ok && data.workspace) {
        setWorkspace(data.workspace);
        setShowRatingModal(false);
        Alert.alert('Success', `Thank you! Your rating and review for ${ratingTarget.user.fullName} has been submitted.`);
      } else {
        Alert.alert('Error', data.message || 'Failed to submit rating.');
      }
    } catch (err) {
      console.error('Error submitting rating:', err);
      Alert.alert('Error', 'An error occurred while submitting your rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const navigateToArchitectDetail = (architect: any) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push({
      pathname: '/architect-detail',
      params: {
        id: architect._id,
        name: architect.fullName,
        avatar: architect.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        coverImage: architect.cover || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
        rating: (architect.rating || 4.5).toString(),
        reviews: (architect.reviews || 0).toString(),
        location: architect.city || '',
        experience: architect.experience || 'Entry Level',
        specialization: Array.isArray(architect.specialization) ? architect.specialization.join(', ') : (architect.specialization || 'General Architecture'),
        projects: (architect.projects || 0).toString(),
        followers: '150',
        firmName: architect.firmName || 'Independent Architect',
        phone: architect.phoneNumber || architect.whatsappNumber || ''
      }
    });
  };

  const navigateToLabourDetail = (labour: any) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push({
      pathname: '/labour-detail',
      params: {
        id: labour._id || labour.id,
        name: labour.fullName,
        role: labour.skillType || 'Labour',
        avatar: labour.avatarUrl || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
        experience: (labour.experience || '0') + ' Years Experience',
        location: labour.city || '',
        rating: (labour.rating || 0).toString(),
        reviews: (labour.reviews || 0).toString(),
        contractorName: 'Independent',
        workspaceId: workspaceId || ''
      }
    });
  };

  const handleOpenArchitectModal = async () => {
    setShowArchitectModal(true);
    setLoadingArchitects(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/professionals/Architect`);
      if (res.ok) {
        const data = await res.json();
        setArchitectList(data.professionals || []);
      }
    } catch (err) {
      console.error('Error fetching architect list:', err);
    } finally {
      setLoadingArchitects(false);
    }
  };

  const handleOpenContractorModal = async () => {
    setShowContractorModal(true);
    setLoadingContractors(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/professionals/Contractor`);
      if (res.ok) {
        const data = await res.json();
        setContractorList(data.professionals || []);
      }
    } catch (err) {
      console.error('Error fetching contractor list:', err);
    } finally {
      setLoadingContractors(false);
    }
  };

  const handleOpenLabourModal = async () => {
    setShowLabourModal(true);
    setLoadingLabour(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/professionals/Labour`);
      if (res.ok) {
        const data = await res.json();
        setLabourList(data.professionals || []);
      }
    } catch (err) {
      console.error('Error fetching labour list:', err);
    } finally {
      setLoadingLabour(false);
    }
  };

  const handleAssignArchitect = async (architectId: string, architectName: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/assign-architect`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ architectId, userId: currentUserId }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        setWorkspace(data.workspace);
        setShowArchitectModal(false);
        Alert.alert('Success', `Architect ${architectName} assigned successfully.`);
      } else {
        Alert.alert('Error', data.message || 'Failed to assign architect.');
      }
    } catch (err) {
      console.error('Error assigning architect:', err);
      Alert.alert('Error', 'An error occurred while assigning architect.');
    }
  };

  const handleAssignContractor = async (contractorId: string, contractorName: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/assign-contractor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractorId, userId: currentUserId }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        setWorkspace(data.workspace);
        setShowContractorModal(false);
        Alert.alert('Success', `Contractor ${contractorName} assigned successfully.`);
      } else {
        Alert.alert('Error', data.message || 'Failed to assign contractor.');
      }
    } catch (err) {
      console.error('Error assigning contractor:', err);
      Alert.alert('Error', 'An error occurred while assigning contractor.');
    }
  };

  const handleAddLabour = async (labourId: string, labourName: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/add-labour`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labourId, userId: currentUserId }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        setWorkspace(data.workspace);
        setShowLabourModal(false);
        Alert.alert('Success', `${labourName} added to the labour team.`);
      } else {
        Alert.alert('Error', data.message || 'Failed to add labourer.');
      }
    } catch (err) {
      console.error('Error adding labour:', err);
      Alert.alert('Error', 'An error occurred while adding labourer.');
    }
  };

  const handleRemoveLabour = async (labourId: string, labourName: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/remove-labour`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ labourId, userId: currentUserId }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        setWorkspace(data.workspace);
        Alert.alert('Success', `${labourName} removed from the labour team.`);
      } else {
        Alert.alert('Error', data.message || 'Failed to remove labourer.');
      }
    } catch (err) {
      console.error('Error removing labour:', err);
      Alert.alert('Error', 'An error occurred while removing labourer.');
    }
  };

  const handleConfirmRemoveLabour = (labourId: string, labourName: string) => {
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${labourName} from this project?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => handleRemoveLabour(labourId, labourName) }
      ]
    );
  };


  useEffect(() => {
    if (!workspaceId || !currentUserId) return;
    const fetchWorkspace = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}?userId=${currentUserId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.workspace) {
            setWorkspace(data.workspace);
          }
        }
      } catch (err) {
        console.error('Error fetching workspace in progress screen:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspace();
  }, [workspaceId, currentUserId]);

  useEffect(() => {
    if (workspaceId && workspace) {
      const nowStr = Date.now().toString();
      if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        localStorage.setItem(`lastViewedUpdates_${workspaceId}`, nowStr);
      }
      (global as any).lastViewedUpdates = (global as any).lastViewedUpdates || {};
      (global as any).lastViewedUpdates[workspaceId] = Date.now();
    }
  }, [workspace, workspaceId]);

  const handleAddUpdate = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the update.');
      return;
    }
    if (!workspaceId || workspaceId === 'undefined') {
      const newUp: TimelineUpdate = {
        id: Math.random().toString(),
        title: formTitle,
        description: formDescription,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        images: formImg ? formImg.split(',').filter(Boolean) : [],
        video: formVideo || '',
        icon: (formCategory === 'Task' || formCategory === 'General') ? 'check' : formCategory === 'Quotation' ? 'file-text' : formCategory === 'Payment' ? 'credit-card' : 'check',
        iconColor: (formCategory === 'Task' || formCategory === 'General') ? COLORS.white : formCategory === 'Quotation' ? COLORS.blue : formCategory === 'Payment' ? COLORS.primary : COLORS.white,
        iconBg: (formCategory === 'Task' || formCategory === 'General') ? COLORS.green : formCategory === 'Quotation' ? COLORS.blueLight : formCategory === 'Payment' ? '#FEF3C7' : COLORS.green,
        comments: [],
        postedBy: {
          senderId: currentUserId || 'local',
          senderName: currentUserFullName || 'Home Owner',
          senderRole: currentUserRole || 'Client'
        }
      };
      setLocalUpdates(prev => [...prev, newUp]);
      setShowAddModal(false);
      setFormTitle('');
      setFormDescription('');
      setFormCategory('General');
      setFormImg('');
      setFormVideo('');
      Alert.alert('Success', 'Progress update posted successfully!');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          category: formCategory,
          img: formImg,
          video: formVideo,
          senderId: currentUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          setShowAddModal(false);
          setFormTitle('');
          setFormDescription('');
          setFormCategory('General');
          setFormImg('');
          setFormVideo('');
          Alert.alert('Success', 'Progress update posted successfully!');
        }
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to post progress update.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error. Failed to post progress update.');
    }
  };

  const handleEditUpdate = async () => {
    if (!formTitle.trim() || !editingUpdateId) {
      Alert.alert('Error', 'Please enter a title for the update.');
      return;
    }
    if (!workspaceId || workspaceId === 'undefined') {
      setLocalUpdates(prev => prev.map(up => {
        if (up.id === editingUpdateId) {
          return {
            ...up,
            title: formTitle,
            description: formDescription,
            category: formCategory,
            images: formImg ? formImg.split(',').filter(Boolean) : [],
            video: formVideo || '',
            icon: (formCategory === 'Task' || formCategory === 'General') ? 'check' : formCategory === 'Quotation' ? 'file-text' : formCategory === 'Payment' ? 'credit-card' : 'check',
            iconColor: (formCategory === 'Task' || formCategory === 'General') ? COLORS.white : formCategory === 'Quotation' ? COLORS.blue : formCategory === 'Payment' ? COLORS.primary : COLORS.white,
            iconBg: (formCategory === 'Task' || formCategory === 'General') ? COLORS.green : formCategory === 'Quotation' ? COLORS.blueLight : formCategory === '#FEF3C7' ? '#FEF3C7' : COLORS.green,
          };
        }
        return up;
      }));
      setShowEditModal(false);
      setEditingUpdateId(null);
      setFormTitle('');
      setFormDescription('');
      setFormCategory('General');
      setFormImg('');
      setFormVideo('');
      Alert.alert('Success', 'Progress update updated successfully!');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/updates/${editingUpdateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          category: formCategory,
          img: formImg,
          video: formVideo,
          senderId: currentUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          setShowEditModal(false);
          setEditingUpdateId(null);
          setFormTitle('');
          setFormDescription('');
          setFormCategory('General');
          setFormImg('');
          setFormVideo('');
          Alert.alert('Success', 'Progress update updated successfully!');
        }
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to edit progress update.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error. Failed to edit progress update.');
    }
  };

  const handlePostComment = async (updateId: string) => {
    if (!replyText.trim()) return;
    if (!workspaceId || workspaceId === 'undefined') {
      const newComment = {
        _id: Math.random().toString(),
        sender: currentUserId || 'local',
        senderName: currentUserFullName || 'Home Owner',
        text: replyText,
        createdAt: new Date().toISOString()
      };
      setLocalUpdates(prev => prev.map(up => {
        if (up.id === updateId) {
          return {
            ...up,
            comments: [...(up.comments || []), newComment]
          };
        }
        return up;
      }));
      setActiveReplyId(null);
      setReplyText('');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/updates/${updateId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: currentUserId,
          senderName: currentUserFullName,
          text: replyText
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          setActiveReplyId(null);
          setReplyText('');
        }
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to post reply.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error. Failed to post reply.');
    }
  };

  const promptCustomAmount = (callback: (amount: number) => void) => {
    if (Platform.OS === 'web') {
      const amtStr = window.prompt("Enter payment amount (₹):", dueCostVal.toString());
      if (amtStr) {
        const amt = parseFloat(amtStr);
        if (!isNaN(amt) && amt > 0) {
          callback(amt);
        } else {
          Alert.alert("Invalid Amount", "Please enter a valid number greater than 0.");
        }
      }
    } else {
      Alert.alert(
        "Select Payment Amount",
        `Due: ₹${dueCostVal.toLocaleString('en-IN')}`,
        [
          { text: `Pay Full (₹${dueCostVal.toLocaleString('en-IN')})`, onPress: () => callback(dueCostVal) },
          { text: "Pay ₹50,000", onPress: () => callback(Math.min(50000, dueCostVal)) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const handlePayNow = () => {
    if (currentUserRole && currentUserRole !== 'Client') {
      Alert.alert("Forbidden", "Only Client can initiate payment.");
      return;
    }

    if (isCancelled) {
      Alert.alert("Project Cancelled", "This project is cancelled and no longer accepts payments.");
      return;
    }

    if (dueCostVal <= 0) {
      Alert.alert("No Dues", "There is no outstanding due amount for this project.");
      return;
    }

    promptCustomAmount(async (amountToPay) => {
      if (!workspaceId || workspaceId === 'undefined') {
        setDemoPaidAmount(prev => prev + amountToPay);
        Alert.alert("Success", `Paid ₹${amountToPay.toLocaleString('en-IN')} successfully!`);
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/client/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: amountToPay,
            senderId: currentUserId
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.workspace) {
            setWorkspace(data.workspace);
            Alert.alert("Payment Success", `Payment of ₹${amountToPay.toLocaleString('en-IN')} recorded successfully!`);
          }
        } else {
          const err = await res.json();
          Alert.alert("Payment Failed", err.message || "Could not process payment.");
        }
      } catch (err) {
        console.error('Error posting client payment:', err);
        Alert.alert("Network Error", "Could not connect to payment server.");
      }
    });
  };

  const handleMarkWorkCompleted = async () => {
    if (!workspaceId || workspaceId === 'undefined') {
      Alert.alert("Success", "Work marked as completed! (Demo mode)");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/project-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Waiting for Client Approval',
          senderId: currentUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          Alert.alert("Success", "Work marked as completed. Waiting for client approval!");
        }
      } else {
        const err = await res.json();
        Alert.alert("Error", err.message || "Failed to update project status.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error. Failed to update project status.");
    }
  };

  const handleApproveWork = async () => {
    if (!workspaceId || workspaceId === 'undefined') {
      Alert.alert("Success", "Project marked as Completed and Approved! (Demo mode)");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/project-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completed',
          senderId: currentUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          Alert.alert("Success", "Work approved! The project is now completed, payment can be released, and professional ratings are enabled.");
        }
      } else {
        const err = await res.json();
        Alert.alert("Error", err.message || "Failed to approve work.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error. Failed to approve work.");
    }
  };

  const handleCancelProject = () => {
    Alert.alert(
      "Cancel Project",
      "Are you sure you want to cancel this project due to convenience? This will put the project into read-only mode for all members and cannot be undone.",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel Project", style: "destructive", onPress: submitCancelProject }
      ]
    );
  };

  const submitCancelProject = async () => {
    if (!workspaceId || workspaceId === 'undefined') {
      Alert.alert("Success", "Project cancelled! (Demo mode)");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/project-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Cancelled',
          senderId: currentUserId,
          reworkComment: "Cancelled by Client due to convenience"
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          Alert.alert("Success", "Project has been successfully cancelled.");
        }
      } else {
        const err = await res.json();
        Alert.alert("Error", err.message || "Failed to cancel project.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error. Failed to cancel project.");
    }
  };

  const handleRequestChanges = () => {
    setReworkCommentText('');
    setShowReworkModal(true);
  };

  const submitReworkRequest = async () => {
    if (!reworkCommentText.trim()) {
      Alert.alert("Comment Required", "Please enter a comment describing the changes needed.");
      return;
    }
    setShowReworkModal(false);
    
    if (!workspaceId || workspaceId === 'undefined') {
      Alert.alert("Success", `Rework requested with comment: "${reworkCommentText}" (Demo mode)`);
      return;
    }
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/project-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rework Required',
          senderId: currentUserId,
          reworkComment: reworkCommentText
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          Alert.alert("Rework Requested", "Change request submitted successfully. Status updated to 'Rework Required'.");
        }
      } else {
        const err = await res.json();
        Alert.alert("Error", err.message || "Failed to submit rework request.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Network error. Failed to submit rework request.");
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'task':
      case 'milestone':
      case 'general':
        return { icon: 'check', color: COLORS.white, bg: COLORS.green };
      case 'file':
      case 'quotation':
        return { icon: 'file-text', color: COLORS.blue, bg: COLORS.blueLight };
      case 'payment':
        return { icon: 'credit-card', color: COLORS.primary, bg: '#FEF3C7' };
      default:
        return { icon: 'check', color: COLORS.white, bg: COLORS.green };
    }
  };

  const projectName = workspace?.title || (params.name as string) || '2BHK Interior Project';
  const projectId = workspace?._id || (params.projectId as string) || 'PR/12345';
  
  const projectProgress = workspace 
    ? (workspace.status === 'Completed' ? 100 : workspace.status === 'Active' ? 60 : 20)
    : parseInt((params.progress as string) || '60');

  const partner = workspace 
    ? (getUserIdStr(workspace.client) === currentUserId 
       ? (workspace.contractor || workspace.professional) 
       : workspace.client)
    : null;
  const contractorName = partner?.fullName || (params.contractor as string) || 'Raj Construction';
  const contractorAvatar = resolveAvatarUrl(partner?.avatarUrl) || resolveAvatarUrl(params.contractorAvatar as string) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80';
  const contractorRating = partner?.rating?.toString() || (params.contractorRating as string) || '4.7';
  const contractorReviews = partner?.reviews?.toString() || (params.contractorReviews as string) || '028';
  
  const startDate = workspace ? new Date(workspace.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (params.startDate as string) || '10 Apr 2024';
  const endDate = (params.endDate as string) || '10 Jul 2024';

  // Use quotation total if available, else client's estimated budget from contractRequest, else 0
  const contractBudgetRaw = workspace?.contractRequest?.budget || '';
  const contractBudgetNum = contractBudgetRaw
    ? parseInt(contractBudgetRaw.replace(/[^\d]/g, '')) || 0
    : 0;
  const totalCostVal = workspace?.quotation?.totalCost || contractBudgetNum || (workspace ? 0 : demoTotalAmount);
  const paidCostVal = workspace
    ? (workspace.labourManagement?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0)
    : demoPaidAmount;
  const dueCostVal = Math.max(0, totalCostVal - paidCostVal);

  const totalAmount = `₹${totalCostVal.toLocaleString('en-IN')}`;
  const paidAmount = `₹${paidCostVal.toLocaleString('en-IN')}`;
  const dueAmount = `₹${dueCostVal.toLocaleString('en-IN')}`;

  useEffect(() => {
    if (workspace?.updates?.length > 0) {
      const mapped = workspace.updates.map((up: any) => {
        const iconInfo = getIconForCategory(up.category);
        const dt = new Date(up.createdAt);
        return {
          id: up._id || Math.random().toString(),
          title: up.title,
          description: up.description,
          date: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          images: up.img ? up.img.split(',').map((url: string) => resolveAvatarUrl(url.trim())).filter((u): u is string => !!u) : [],
          videos: up.video ? up.video.split(',').map((url: string) => resolveAvatarUrl(url.trim())).filter((u): u is string => !!u) : [],
          icon: iconInfo.icon,
          iconColor: iconInfo.color,
          iconBg: iconInfo.bg,
          comments: up.comments || [],
          postedBy: up.postedBy || {},
          createdAt: up.createdAt || new Date().toISOString()
        };
      });
      setLocalUpdates(mapped);
    } else {
      // Real workspace but no updates yet -> start progress updates from scratch!
      setLocalUpdates([]);
    }
  }, [workspace, workspaceId]);


  const timelineUpdates = [...localUpdates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Map database status to display status
  let displayStatus = projectStatus;
  if (projectStatus === 'Active') {
    displayStatus = 'Work Started';
  } else if (projectStatus === 'Rework Required') {
    displayStatus = 'Attention Required';
  } else if (projectStatus === 'Waiting for Client Approval') {
    displayStatus = 'Quality Check';
  } else if (projectStatus === 'Pending') {
    displayStatus = 'Request Sent';
  }

  const statusInfo = STATUS_CONFIG[displayStatus] || {
    color: COLORS.primary,
    bg: '#FEF3C7',
    dotColor: '#F59E0B',
    label: displayStatus,
    description: 'Project details and timeline tracking.',
    animation: 'none',
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* HEADER */}
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>{t('projectProgressTitle') || 'PROJECT PROGRESS PAGE'}</Text>
          <Text style={styles.headerSub}>({t('for') || 'For'} {isContractor ? t('contractor') || 'Contractor' : t('homeOwner') || 'Home Owner'})</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* PROJECT INFO CARD */}
        <View style={styles.projectCard}>
          <View style={styles.projectCardTop}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.projectTitle}>{projectName}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>  
              {statusInfo.animation === 'blink' ? (
                <Animated.View style={[styles.statusDot, { backgroundColor: statusInfo.dotColor, opacity: blinkAnimStatus }]} />
              ) : statusInfo.animation === 'pulse' ? (
                <Animated.View style={[styles.statusDot, { backgroundColor: statusInfo.dotColor, transform: [{ scale: pulseAnimStatus }] }]} />
              ) : (
                <View style={[styles.statusDot, { backgroundColor: statusInfo.dotColor }]} />
              )}
              <Text style={[styles.statusPillText, { color: statusInfo.color, marginLeft: 4 }]}>{t(`status${displayStatus.replace(/\s+/g, '')}`) || statusInfo.label}</Text>
            </View>
          </View>

          <View style={{ marginTop: 6, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 18 }}>
              {t(`status${displayStatus.replace(/\s+/g, '')}Desc`) || statusInfo.description}
            </Text>
          </View>

          {/* Contractor */}
          <View style={styles.contractorRow}>
            <Image source={{ uri: contractorAvatar }} style={styles.contractorAvatar} contentFit="cover" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.contractorName}>{contractorName}</Text>
              {partner?.role !== 'Client' && !isContractor && (
                <View style={styles.contractorRatingRow}>
                  <FontAwesome5 name="star" solid size={11} color={COLORS.primary} />
                  <Text style={styles.contractorRatingText}>{contractorRating}</Text>
                  <Text style={styles.contractorReviewsText}>({contractorReviews} Reviews)</Text>
                </View>
              )}
            </View>
            {partner?.role !== 'Client' && !isContractor && (
              <TouchableOpacity 
                style={styles.viewProfileBtn}
                onPress={() => {
                  if (partner) {
                    const isArchitect = partner.role === 'Architect';
                    router.push({
                      pathname: isArchitect ? '/architect-detail' : '/contractor-detail',
                      params: {
                        id: partner._id,
                        name: partner.fullName,
                        avatar: partner.avatarUrl,
                        role: partner.role,
                      }
                    });
                  } else {
                    // Fallback
                    router.push('/profile');
                  }
                }}
              >
                <Text style={styles.viewProfileBtnText}>{t('viewProfile') || 'View Profile'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Dates & Amount */}
          <View style={styles.datesRow}>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>{t('startDate') || 'Start Date'}</Text>
              <Text style={styles.dateValue}>{startDate}</Text>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>{t('endDateEst') || 'End Date (Est.)'}</Text>
              <Text style={styles.dateValue}>{endDate}</Text>
            </View>
            <View style={[styles.dateCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.dateLabel}>{t('totalAmount') || 'Total Amount'}</Text>
              <Text style={[styles.dateValue, { color: COLORS.primary, fontWeight: '800' }]}>{totalAmount}</Text>
            </View>
          </View>
        </View>

        {/* WORKFLOW STATUS ACTIONS PANEL */}
        {workspace && (
          <View style={styles.actionPanelCard}>
            <View style={styles.actionPanelHeader}>
              <View style={styles.actionPanelHeaderLeft}>
                <Feather name="shield" size={18} color={COLORS.navy} />
                <Text style={styles.actionPanelTitle}>{t('projectStatusControls') || 'Project Status Controls'}</Text>
              </View>
              {isClient && !isReadOnly && (
                <TouchableOpacity 
                  style={styles.smallCancelBtn} 
                  onPress={handleCancelProject}
                  activeOpacity={0.8}
                >
                  <Text style={styles.smallCancelBtnText}>{t('cancelProject') || 'Cancel Project'}</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {projectStatus === 'Active' || projectStatus === 'Rework Required' ? (
              isContractor ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={[styles.primaryActionBtn, { backgroundColor: COLORS.green }]} 
                    onPress={handleMarkWorkCompleted}
                  >
                    <Feather name="check-circle" size={16} color={COLORS.white} />
                    <Text style={styles.primaryActionText}>{t('markWorkCompleted') || 'Mark Work Completed'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.infoBanner}>
                  <Feather name="info" size={16} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                  <Text style={styles.infoBannerText}>
                    {projectStatus === 'Rework Required' 
                      ? (t('waitingRework') || 'Waiting for contractor to finish rework.') 
                      : (t('contractorActivelyWorking') || 'Contractor is actively working on the project.')}
                  </Text>
                </View>
              )
            ) : null}

            {projectStatus === 'Waiting for Client Approval' ? (
              isClient ? (
                <View style={styles.approvalActionRow}>
                  <Text style={styles.approvalLabel}>{t('reviewProgressBeforeApproving') || 'Review the progress updates, photos, and videos below before approving:'}</Text>
                  <View style={styles.approvalButtonsContainer}>
                    <TouchableOpacity 
                      style={[styles.approvalBtn, { backgroundColor: COLORS.green }]} 
                      onPress={handleApproveWork}
                    >
                      <Feather name="check" size={16} color={COLORS.white} />
                      <Text style={styles.approvalBtnText}>{t('approveWork') || 'Approve Work'}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.approvalBtn, { backgroundColor: COLORS.red }]} 
                      onPress={handleRequestChanges}
                    >
                      <Feather name="x-circle" size={16} color={COLORS.white} />
                      <Text style={styles.approvalBtnText}>{t('requestChanges') || 'Request Changes'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.infoBanner}>
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.infoBannerText}>{t('workCompletedWaitingApproval') || "Work completed! Waiting for Client's review and approval."}</Text>
                </View>
              )
            ) : null}

            {projectStatus === 'Cancelled' && (
              <View style={[styles.infoBanner, { backgroundColor: '#FEF2F2', flexDirection: 'column', alignItems: 'flex-start', padding: 16, gap: 4, borderColor: '#FCA5A5', borderWidth: 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Feather name="x-circle" size={20} color={COLORS.red} style={{ marginRight: 8 }} />
                  <Text style={{ color: COLORS.red, fontSize: 16, fontWeight: '800' }}>{t('projectCancelled') || 'Project Cancelled'}</Text>
                </View>
                <Text style={{ color: '#991B1B', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
                  {t('projectCancelledDesc') || 'This project has been cancelled due to inconvenience. The project timeline is now read-only for all assigned members.'}
                </Text>
              </View>
            )}



            {projectStatus === 'Completed' && (
              <>
                <View style={[styles.infoBanner, { backgroundColor: COLORS.greenLight, flexDirection: 'column', alignItems: 'flex-start', padding: 16, gap: 4 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Feather name="award" size={20} color={COLORS.green} style={{ marginRight: 8 }} />
                    <Text style={{ color: COLORS.green, fontSize: 16, fontWeight: '800' }}>{t('projectCompletedTitle') || 'Project Completed'}</Text>
                  </View>
                  <Text style={{ color: '#065F46', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
                    {t('projectCompletedDesc') || 'This project has been completed and approved. The project timeline is now read-only.'}
                  </Text>
                </View>

                {/* Ratings & Reviews List */}
                {isWorkspaceClient && (
                  <View style={styles.ratingsListSection}>
                    <Text style={styles.ratingsSectionTitle}>{t('ratingsAndReviews') || 'Ratings & Reviews'}</Text>
                    {getRateableTargets().length === 0 ? (
                      <Text style={styles.noRatingsText}>{t('noRatingsDesc') || 'No other participants available to rate on this project.'}</Text>
                    ) : (
                      getRateableTargets().map((target) => {
                        const isRated = isAlreadyRated(target.user._id);
                        const userRating = workspace.ratings?.find(
                          (r: any) => getUserIdStr(r.from) === currentUserId && getUserIdStr(r.to) === target.user._id
                        );

                        return (
                          <View key={target.user._id} style={styles.ratingTargetItem}>
                            <Image 
                              source={{ uri: resolveAvatarUrl(target.user.avatarUrl) || 'https://i.pravatar.cc/100?img=12' }} 
                              style={styles.ratingTargetAvatar} 
                              contentFit="cover" 
                            />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.ratingTargetName}>{target.user.fullName}</Text>
                              <Text style={styles.ratingTargetRole}>
                                {target.user.role} · {target.relation}
                              </Text>
                              {isRated && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                                  <View style={{ flexDirection: 'row', gap: 2 }}>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                      <FontAwesome5 
                                        key={s} 
                                        name="star" 
                                        solid={s <= Math.round(userRating?.rating || 0)} 
                                        size={10} 
                                        color={s <= Math.round(userRating?.rating || 0) ? COLORS.primary : COLORS.textLight} 
                                      />
                                    ))}
                                  </View>
                                  <Text style={styles.ratingDetailText}>
                                    ({userRating?.rating?.toFixed(1)})
                                  </Text>
                                </View>
                              )}
                            </View>
                            {isRated ? (
                              <View style={styles.ratedBadge}>
                                <Feather name="check" size={12} color={COLORS.green} style={{ marginRight: 2 }} />
                                <Text style={styles.ratedBadgeText}>{t('submitted') || 'Submitted'}</Text>
                              </View>
                            ) : (
                              <TouchableOpacity 
                                style={styles.rateBtn}
                                onPress={() => handleOpenRatingModal(target)}
                              >
                                <Text style={styles.rateBtnText}>{t('rate') || 'Rate'}</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* PROJECT TEAM */}
        {workspace && (isContractor || isClient) && (
          <View style={styles.teamSection}>
            <TouchableOpacity 
              style={[styles.teamHeaderRow, !isTeamExpanded && { marginBottom: 0 }]} 
              activeOpacity={0.7}
              onPress={() => setIsTeamExpanded(!isTeamExpanded)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.teamSectionTitle}>{t('projectTeam') || 'Project Team'}</Text>
                <Text style={styles.teamSubtext}>{t('manageTeamMembers') || 'Manage architects, contractors, and labour team members.'}</Text>
              </View>
              <Feather 
                name={isTeamExpanded ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={COLORS.textDark} 
              />
            </TouchableOpacity>

            {isTeamExpanded && (
              <>
                {/* Contractor Row */}
                <View style={styles.teamItemHeader}>
                  <Text style={styles.teamItemHeaderTitle}>{t('contractor') || 'Contractor'}</Text>
                  {canManageContractor && workspace.professional?.role !== 'Contractor' && (
                    <TouchableOpacity style={styles.teamActionBtn} onPress={handleOpenContractorModal}>
                      <Text style={styles.teamActionBtnText}>{workspace.contractor ? (t('change') || 'Change') : (t('assign') || 'Assign')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {workspace.professional?.role === 'Contractor' ? (
                  <View style={styles.teamItem}>
                    <Image source={{ uri: resolveAvatarUrl(workspace.professional.avatarUrl) || 'https://i.pravatar.cc/100?img=12' }} style={styles.teamAvatar} contentFit="cover" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.teamMemberName}>{workspace.professional.fullName}</Text>
                      <Text style={styles.teamMemberRole}>Contractor (Hired Professional)</Text>
                    </View>
                  </View>
                ) : workspace.contractor ? (
                  <View style={styles.teamItem}>
                    <Image source={{ uri: resolveAvatarUrl(workspace.contractor.avatarUrl) || 'https://i.pravatar.cc/100?img=12' }} style={styles.teamAvatar} contentFit="cover" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.teamMemberName}>{workspace.contractor.fullName}</Text>
                      <Text style={styles.teamMemberRole}>Contractor · {workspace.contractor.city || 'Partner'}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.emptyTeamText}>{t('noContractorAssigned') || 'No contractor assigned yet.'}</Text>
                )}

                <View style={styles.teamDivider} />

                {/* Architect Row */}
                <View style={styles.teamItemHeader}>
                  <Text style={styles.teamItemHeaderTitle}>{t('architect') || 'Architect'}</Text>
                  {canManageArchitect && workspace.professional?.role !== 'Architect' && (
                    <TouchableOpacity style={styles.teamActionBtn} onPress={handleOpenArchitectModal}>
                      <Text style={styles.teamActionBtnText}>{workspace.architect ? (t('change') || 'Change') : (t('assign') || 'Assign')}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {workspace.professional?.role === 'Architect' ? (
                  <View style={styles.teamItem}>
                    <Image source={{ uri: resolveAvatarUrl(workspace.professional.avatarUrl) || 'https://i.pravatar.cc/100?img=47' }} style={styles.teamAvatar} contentFit="cover" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.teamMemberName}>{workspace.professional.fullName}</Text>
                      <Text style={styles.teamMemberRole}>Architect (Hired Professional)</Text>
                    </View>
                  </View>
                ) : workspace.architect ? (
                  <TouchableOpacity 
                    style={styles.teamItem}
                    onPress={() => navigateToArchitectDetail(workspace.architect)}
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: resolveAvatarUrl(workspace.architect.avatarUrl) || 'https://i.pravatar.cc/100?img=47' }} style={styles.teamAvatar} contentFit="cover" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.teamMemberName}>{workspace.architect.fullName}</Text>
                      <Text style={styles.teamMemberRole}>Architect · {workspace.architect.city || 'Independent'}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={COLORS.textLight} />
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.emptyTeamText}>{t('noArchitectAssigned') || 'No architect assigned yet.'}</Text>
                )}

                <View style={styles.teamDivider} />

                {/* Labour Team Row */}
                <View style={styles.teamItemHeader}>
                  <Text style={styles.teamItemHeaderTitle}>{t('labourTeam') || 'Labour Team'}</Text>
                  {canManageLabour && (
                    <TouchableOpacity style={styles.teamActionBtn} onPress={handleOpenLabourModal}>
                      <Text style={styles.teamActionBtnText}>{t('addLabourer') || 'Add Labourer'}</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {workspace.labourTeam && workspace.labourTeam.length > 0 ? (
                  workspace.labourTeam.map((lab: any) => (
                    <View key={lab._id || Math.random().toString()} style={styles.teamItem}>
                      <TouchableOpacity 
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                        onPress={() => navigateToLabourDetail(lab)}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: resolveAvatarUrl(lab.avatarUrl) || 'https://i.pravatar.cc/100?img=60' }} style={styles.teamAvatar} contentFit="cover" />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.teamMemberName}>{lab.fullName}</Text>
                          <Text style={styles.teamMemberRole}>{lab.skillType || 'Labour'} · {lab.city || 'Skilled Worker'}</Text>
                        </View>
                        <Feather name="chevron-right" size={16} color={COLORS.textLight} style={{ marginRight: 8 }} />
                      </TouchableOpacity>
                      {canManageLabour && (
                        <TouchableOpacity 
                          style={styles.removeLabourBtn} 
                          onPress={() => handleConfirmRemoveLabour(lab._id, lab.fullName)}
                        >
                          <Feather name="trash-2" size={16} color={COLORS.red} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyTeamText}>{t('noLabourersAdded') || 'No labourers added yet.'}</Text>
                )}
              </>
            )}
          </View>
        )}

        {/* TIMELINE */}
        <View 
          onLayout={(e) => setTimelineY(e.nativeEvent.layout.y)}
          style={styles.timelineSection}
        >
          <View style={styles.timelineHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.timelineSectionTitle}>{t('projectUpdates') || 'Project Updates'}</Text>
              <Text style={styles.timelineSubtext}>{t('timelineSubtext') || 'Recent updates and replies to discuss any changes.'}</Text>
            </View>
            {canPostUpdates && (
              <TouchableOpacity 
                style={styles.addUpdateBtn} 
                onPress={() => {
                  setFormTitle('');
                  setFormDescription('');
                  setFormCategory('General');
                  setFormImg('');
                  setFormVideo('');
                  setShowAddModal(true);
                }}
              >
                <Feather name="plus" size={14} color={COLORS.white} />
                <Text style={styles.addUpdateBtnText}>{t('addUpdate') || 'Add Update'}</Text>
              </TouchableOpacity>
            )}
          </View>


          {timelineUpdates.map((update, index) => (
            <View key={update.id} style={styles.timelineItem}>
              {/* Vertical line */}
              {index < timelineUpdates.length - 1 && <View style={styles.timelineLine} />}

              {/* Icon */}
              <View style={{ width: 26, height: 26, marginRight: 12, justifyContent: 'center', alignItems: 'center' }}>
                {index === 0 && !isReadOnly && (
                  <Animated.View
                    style={{
                      position: 'absolute',
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: update.iconBg === COLORS.green ? COLORS.green : update.iconColor,
                      opacity: 0.25,
                      transform: [{ scale: pulseAnimStatus }],
                    }}
                  />
                )}
                <Animated.View 
                  style={[
                    styles.timelineIcon, 
                    { 
                      backgroundColor: update.iconBg, 
                      marginRight: 0,
                      opacity: (index === 0 && !isReadOnly) ? blinkAnimStatus : 1
                    }
                  ]}
                >  
                  <Feather name={update.icon as any} size={12} color={update.iconColor} />
                </Animated.View>
              </View>

              {/* Content */}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{update.title}</Text>
                <Text style={styles.timelineDesc}>{update.description}</Text>
                <Text style={styles.timelineDate}>{update.date} · {update.time}</Text>

                {/* Images */}
                {update.images && update.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineImagesScroll}>
                    {update.images.map((img, imgIdx) => (
                      <TouchableOpacity key={imgIdx} activeOpacity={0.9} onPress={() => setFullscreenMedia({ type: 'image', url: img })}>
                        <Image source={{ uri: img }} style={styles.timelineImage} contentFit="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Videos */}
                {update.videos && update.videos.length > 0 && (
                  <View style={{ gap: 10, marginTop: 8 }}>
                    {update.videos.map((vid, vidIdx) => (
                      <View key={vidIdx} style={styles.timelineVideoWrap}>
                        <Video
                          source={{ uri: vid }}
                          rate={1.0}
                          volume={1.0}
                          isMuted={false}
                          resizeMode={ResizeMode.CONTAIN}
                          shouldPlay={false}
                          isLooping={false}
                          useNativeControls
                          style={styles.timelineVideo}
                        />
                        <TouchableOpacity 
                          style={styles.videoFullscreenBtn}
                          activeOpacity={0.8}
                          onPress={() => setFullscreenMedia({ type: 'video', url: vid })}
                        >
                          <Feather name="maximize" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Existing comments/replies */}
                {update.comments && update.comments.length > 0 && (
                  <View style={styles.commentsList}>
                    {update.comments.map((comment: any, cIdx: number) => (
                      <View key={comment._id || cIdx} style={styles.commentBubble}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentSenderName}>{comment.senderName}</Text>
                          <Text style={styles.commentTime}>
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{comment.text}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Actions row */}
                {!isReadOnly && (
                  <>
                    <View style={styles.actionRow}>
                      <TouchableOpacity 
                        style={styles.replyBtn}
                        onPress={() => {
                          if (activeReplyId === update.id) {
                            setActiveReplyId(null);
                          } else {
                            setActiveReplyId(update.id);
                            setReplyText('');
                          }
                        }}
                      >
                        <Feather name="message-circle" size={13} color={COLORS.blue} />
                        <Text style={styles.replyBtnText}>{t('reply') || 'Reply'}</Text>
                      </TouchableOpacity>

                      {(update.postedBy?.senderId ? update.postedBy.senderId === currentUserId : isContractor) && (
                        <TouchableOpacity 
                          style={[styles.replyBtn, { backgroundColor: COLORS.orangeLight, marginLeft: 8 }]}
                          onPress={() => {
                            setEditingUpdateId(update.id);
                            setFormTitle(update.title);
                            setFormDescription(update.description || '');
                            setFormCategory(update.icon === 'check-circle' ? 'Task' : update.icon === 'file-text' ? 'Quotation' : update.icon === 'credit-card' ? 'Payment' : 'General');
                            setFormImg(update.images?.join(',') || '');
                            setFormVideo(update.video || '');
                            setShowEditModal(true);
                          }}
                        >
                          <Feather name="edit-2" size={12} color={COLORS.orange} />
                          <Text style={[styles.replyBtnText, { color: COLORS.orange }]}>{t('edit') || 'Edit'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Reply Input Field */}
                    {activeReplyId === update.id && (
                      <View style={styles.replyInputWrap}>
                        <TextInput
                          style={styles.replyInput}
                          placeholder={t('writeReplyPlaceholder') || 'Write a reply...'}
                          placeholderTextColor={COLORS.textLight}
                          value={replyText}
                          onChangeText={setReplyText}
                        />
                        <TouchableOpacity 
                          style={styles.sendReplyBtn}
                          onPress={() => handlePostComment(update.id)}
                        >
                          <Feather name="send" size={14} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* BOTTOM PAYMENT BAR */}
      {currentUserRole === 'Client' && !isCancelled && (
        <View style={styles.bottomBar}>
          <View style={styles.amountCols}>
            <View style={styles.amountCol}>
              <Text style={styles.amountLabel}>{t('amount') || 'Amount'}</Text>
              <Text style={styles.amountValue}>{totalAmount}</Text>
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.amountLabel}>{t('paid') || 'Paid'}</Text>
              <Text style={[styles.amountValue, { color: COLORS.green }]}>{paidAmount}</Text>
            </View>
            <View style={styles.amountCol}>
              <Text style={styles.amountLabel}>{t('due') || 'Due'}</Text>
              <Text style={[styles.amountValue, { color: COLORS.red }]}>{dueAmount}</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.payNowBtn} 
            activeOpacity={0.85}
            onPress={handlePayNow}
          >
            <Text style={styles.payNowBtnText}>{t('payNow') || 'Pay Now'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ADD UPDATE MODAL (Contractor only) ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addProgressUpdate') || 'Add Progress Update'}</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.modalLabel}>{t('titleLabel') || 'Title *'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('titlePlaceholder') || 'e.g. Plumbing Work Done'}
                placeholderTextColor={COLORS.textLight}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.modalLabel}>{t('description') || 'Description'}</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder={t('descriptionPlaceholder') || 'Describe the progress...'}
                placeholderTextColor={COLORS.textLight}
                multiline
                value={formDescription}
                onChangeText={setFormDescription}
              />

              <Text style={styles.modalLabel}>{t('mediaAttachments') || 'Media Attachments'}</Text>
              
              {/* Capture Photo Button (Full Width) */}
              <TouchableOpacity 
                style={[
                  styles.mediaPickerBtn, 
                  formImg ? styles.mediaPickerBtnActive : null,
                  (formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5 ? { opacity: 0.5 } : null,
                  { marginBottom: 8 }
                ]} 
                onPress={clickPhotoWithCamera}
                disabled={uploadingMedia || (formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5}
              >
                <Feather name="camera" size={16} color={formImg ? COLORS.white : COLORS.textDark} />
                <Text style={[styles.mediaPickerBtnText, formImg ? styles.mediaPickerBtnTextActive : null]}>
                  {(formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5 
                    ? (t('max5Images') || 'Max 5 Images') 
                    : (formImg ? formImg.split(',').filter(Boolean).length : 0) > 0 
                      ? `${t('captureMore') || 'Capture More'} (${formImg.split(',').filter(Boolean).length}/5)`
                      : (t('capturePhoto') || 'Capture Photo')}
                </Text>
              </TouchableOpacity>

              {/* Upload Buttons Row */}
              <View style={styles.mediaButtonsRow}>
                {/* Upload Image */}
                <TouchableOpacity 
                  style={[
                    styles.mediaPickerBtn, 
                    formImg ? styles.mediaPickerBtnActive : null,
                    (formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5 ? { opacity: 0.5 } : null,
                  ]} 
                  onPress={() => pickMedia('image')}
                  disabled={uploadingMedia || (formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5}
                >
                  <Feather name="image" size={16} color={formImg ? COLORS.white : COLORS.textDark} />
                  <Text style={[styles.mediaPickerBtnText, formImg ? styles.mediaPickerBtnTextActive : null]}>
                    {(formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5 
                      ? 'Max 5'
                      : `Images (${formImg ? formImg.split(',').filter(Boolean).length : 0}/5)`}
                  </Text>
                </TouchableOpacity>

                {/* Upload Video */}
                <TouchableOpacity 
                  style={[
                    styles.mediaPickerBtn, 
                    formVideo ? styles.mediaPickerBtnActive : null,
                    (formVideo ? formVideo.split(',').filter(Boolean).length : 0) >= 2 ? { opacity: 0.5 } : null,
                  ]} 
                  onPress={() => pickMedia('video')}
                  disabled={uploadingMedia || (formVideo ? formVideo.split(',').filter(Boolean).length : 0) >= 2}
                >
                  <Feather name="video" size={16} color={formVideo ? COLORS.white : COLORS.textDark} />
                  <Text style={[styles.mediaPickerBtnText, formVideo ? styles.mediaPickerBtnTextActive : null]}>
                    {(formVideo ? formVideo.split(',').filter(Boolean).length : 0) >= 2 
                      ? 'Max 2'
                      : `Videos (${formVideo ? formVideo.split(',').filter(Boolean).length : 0}/2)`}
                  </Text>
                </TouchableOpacity>
              </View>

              {uploadingMedia && (
                <View style={styles.uploadingWrap}>
                  <Text style={styles.uploadingText}>Uploading media, please wait...</Text>
                </View>
              )}

              {(formImg || formVideo) ? (
                <View style={styles.mediaPreviewsContainer}>
                  {formImg ? (
                    formImg.split(',').filter(Boolean).map((imgUrl, imgIdx) => (
                      <View key={imgIdx} style={[styles.mediaPreviewItem, { marginBottom: 8 }]}>
                        <Image source={{ uri: resolveAvatarUrl(imgUrl) }} style={styles.mediaPreviewThumb} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.mediaPreviewLabel} numberOfLines={1}>Image attached ({imgIdx + 1})</Text>
                          <TouchableOpacity onPress={() => {
                            const newImgs = formImg.split(',').filter(Boolean).filter((_, idx) => idx !== imgIdx);
                            setFormImg(newImgs.join(','));
                          }}>
                            <Text style={styles.mediaRemoveText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : null}

                  {formVideo ? (
                    formVideo.split(',').filter(Boolean).map((vidUrl, vidIdx) => (
                      <View key={vidIdx} style={[styles.mediaPreviewItem, { marginBottom: 8 }]}>
                        <View style={[styles.mediaPreviewThumb, { backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center' }]}>
                          <Feather name="video" size={24} color={COLORS.white} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.mediaPreviewLabel} numberOfLines={1}>Video attached ({vidIdx + 1})</Text>
                          <TouchableOpacity onPress={() => {
                            const newVids = formVideo.split(',').filter(Boolean).filter((_, idx) => idx !== vidIdx);
                            setFormVideo(newVids.join(','));
                          }}>
                            <Text style={styles.mediaRemoveText}>{t('remove') || 'Remove'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : null}
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddUpdate} activeOpacity={0.85}>
              <Text style={styles.modalSubmitBtnText}>{t('postUpdate') || 'Post Update'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── EDIT UPDATE MODAL (Contractor only) ── */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEditModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('editUpdate') || 'Edit Update'}</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditingUpdateId(null); }}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.modalLabel}>{t('titleLabel') || 'Title *'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('titlePlaceholder') || 'e.g. Plumbing Work Done'}
                placeholderTextColor={COLORS.textLight}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.modalLabel}>{t('description') || 'Description'}</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder={t('descriptionPlaceholder') || 'Describe the progress...'}
                placeholderTextColor={COLORS.textLight}
                multiline
                value={formDescription}
                onChangeText={setFormDescription}
              />

              <Text style={styles.modalLabel}>{t('mediaAttachments') || 'Media Attachments'}</Text>
              
              {/* Capture Photo Button (Full Width) */}
              <TouchableOpacity 
                style={[
                  styles.mediaPickerBtn, 
                  formImg ? styles.mediaPickerBtnActive : null,
                  (formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5 ? { opacity: 0.5 } : null,
                  { marginBottom: 8 }
                ]} 
                onPress={clickPhotoWithCamera}
                disabled={uploadingMedia || (formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5}
              >
                <Feather name="camera" size={16} color={formImg ? COLORS.white : COLORS.textDark} />
                <Text style={[styles.mediaPickerBtnText, formImg ? styles.mediaPickerBtnTextActive : null]}>
                  {(formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5 
                    ? (t('max5Images') || 'Max 5 Images') 
                    : (formImg ? formImg.split(',').filter(Boolean).length : 0) > 0 
                      ? `${t('captureMore') || 'Capture More'} (${formImg.split(',').filter(Boolean).length}/5)`
                      : (t('capturePhoto') || 'Capture Photo')}
                </Text>
              </TouchableOpacity>

              {/* Upload Buttons Row */}
              <View style={styles.mediaButtonsRow}>
                {/* Upload Image */}
                <TouchableOpacity 
                  style={[
                    styles.mediaPickerBtn, 
                    formImg ? styles.mediaPickerBtnActive : null,
                    (formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5 ? { opacity: 0.5 } : null,
                  ]} 
                  onPress={() => pickMedia('image')}
                  disabled={uploadingMedia || (formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5}
                >
                  <Feather name="image" size={16} color={formImg ? COLORS.white : COLORS.textDark} />
                  <Text style={[styles.mediaPickerBtnText, formImg ? styles.mediaPickerBtnTextActive : null]}>
                    {(formImg ? formImg.split(',').filter(Boolean).length : 0) >= 5 
                      ? 'Max 5'
                      : `Images (${formImg ? formImg.split(',').filter(Boolean).length : 0}/5)`}
                  </Text>
                </TouchableOpacity>

                {/* Upload Video */}
                <TouchableOpacity 
                  style={[
                    styles.mediaPickerBtn, 
                    formVideo ? styles.mediaPickerBtnActive : null,
                    (formVideo ? formVideo.split(',').filter(Boolean).length : 0) >= 2 ? { opacity: 0.5 } : null,
                  ]} 
                  onPress={() => pickMedia('video')}
                  disabled={uploadingMedia || (formVideo ? formVideo.split(',').filter(Boolean).length : 0) >= 2}
                >
                  <Feather name="video" size={16} color={formVideo ? COLORS.white : COLORS.textDark} />
                  <Text style={[styles.mediaPickerBtnText, formVideo ? styles.mediaPickerBtnTextActive : null]}>
                    {(formVideo ? formVideo.split(',').filter(Boolean).length : 0) >= 2 
                      ? 'Max 2'
                      : `Videos (${formVideo ? formVideo.split(',').filter(Boolean).length : 0}/2)`}
                  </Text>
                </TouchableOpacity>
              </View>

              {uploadingMedia && (
                <View style={styles.uploadingWrap}>
                  <Text style={styles.uploadingText}>Uploading media, please wait...</Text>
                </View>
              )}

              {(formImg || formVideo) ? (
                <View style={styles.mediaPreviewsContainer}>
                  {formImg ? (
                    formImg.split(',').filter(Boolean).map((imgUrl, imgIdx) => (
                      <View key={imgIdx} style={[styles.mediaPreviewItem, { marginBottom: 8 }]}>
                        <Image source={{ uri: resolveAvatarUrl(imgUrl) }} style={styles.mediaPreviewThumb} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.mediaPreviewLabel} numberOfLines={1}>Image attached ({imgIdx + 1})</Text>
                          <TouchableOpacity onPress={() => {
                            const newImgs = formImg.split(',').filter(Boolean).filter((_, idx) => idx !== imgIdx);
                            setFormImg(newImgs.join(','));
                          }}>
                            <Text style={styles.mediaRemoveText}>{t('remove') || 'Remove'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : null}

                  {formVideo ? (
                    formVideo.split(',').filter(Boolean).map((vidUrl, vidIdx) => (
                      <View key={vidIdx} style={[styles.mediaPreviewItem, { marginBottom: 8 }]}>
                        <View style={[styles.mediaPreviewThumb, { backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center' }]}>
                          <Feather name="video" size={24} color={COLORS.white} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.mediaPreviewLabel} numberOfLines={1}>Video attached ({vidIdx + 1})</Text>
                          <TouchableOpacity onPress={() => {
                            const newVids = formVideo.split(',').filter(Boolean).filter((_, idx) => idx !== vidIdx);
                            setFormVideo(newVids.join(','));
                          }}>
                            <Text style={styles.mediaRemoveText}>{t('remove') || 'Remove'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : null}
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleEditUpdate} activeOpacity={0.85}>
              <Text style={styles.modalSubmitBtnText}>{t('saveChanges') || 'Save Changes'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* REWORK REQUEST MODAL */}
      <Modal visible={showReworkModal} transparent animationType="fade" onRequestClose={() => setShowReworkModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowReworkModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('requestChanges') || 'Request Changes'}</Text>
              <TouchableOpacity onPress={() => setShowReworkModal(false)}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <View style={{ paddingVertical: 10 }}>
              <Text style={[styles.modalLabel, { marginBottom: 10 }]}>{t('explainChangesRequired') || 'Explain what changes or improvements are required (e.g., "Paint finish needs improvement"):'}</Text>
              <TextInput
                style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={4}
                value={reworkCommentText}
                onChangeText={setReworkCommentText}
                placeholder={t('enterChangesDetailsPlaceholder') || 'Enter details of changes needed...'}
                placeholderTextColor={COLORS.textLight}
              />
              <TouchableOpacity 
                style={[styles.modalSubmitBtn, { backgroundColor: COLORS.red, marginTop: 15 }]} 
                onPress={submitReworkRequest} 
                activeOpacity={0.85}
              >
                <Text style={styles.modalSubmitBtnText}>{t('submitChangeRequest') || 'Submit Change Request'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      <Modal
        visible={!!fullscreenMedia}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenMedia(null)}
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity 
            style={styles.lightboxCloseBtn}
            onPress={() => setFullscreenMedia(null)}
          >
            <Feather name="x" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {fullscreenMedia?.type === 'image' ? (
            <Image 
              source={{ uri: fullscreenMedia.url }} 
              style={styles.lightboxImage} 
              contentFit="contain" 
            />
          ) : fullscreenMedia?.type === 'video' ? (
            <Video
              source={{ uri: fullscreenMedia.url }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={true}
              useNativeControls
              style={styles.lightboxVideo}
            />
          ) : null}
        </View>
      </Modal>

      {/* ── ASSIGN ARCHITECT MODAL ── */}
      <Modal visible={showArchitectModal} transparent animationType="slide" onRequestClose={() => setShowArchitectModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowArchitectModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('assignArchitect') || 'Assign Architect'}</Text>
              <TouchableOpacity onPress={() => setShowArchitectModal(false)}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {loadingArchitects ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.orange} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                {architectList.length > 0 ? (
                  architectList.map((arch) => (
                    <TouchableOpacity 
                      key={arch._id} 
                      style={styles.selectionListItem} 
                      onPress={() => handleAssignArchitect(arch._id, arch.fullName)}
                    >
                      <Image source={{ uri: resolveAvatarUrl(arch.avatarUrl) || 'https://i.pravatar.cc/100?img=47' }} style={styles.selectionAvatar} contentFit="cover" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.selectionName}>{arch.fullName}</Text>
                        <Text style={styles.selectionDetail}>{arch.experience || 'Experienced'} · {arch.city || 'Architect'}</Text>
                      </View>
                      <Feather name="plus-circle" size={20} color={COLORS.orange} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textMuted }}>{t('noArchitectsFound') || 'No registered architects found.'}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── ASSIGN CONTRACTOR MODAL ── */}
      <Modal visible={showContractorModal} transparent animationType="slide" onRequestClose={() => setShowContractorModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowContractorModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('assignContractor') || 'Assign Contractor'}</Text>
              <TouchableOpacity onPress={() => setShowContractorModal(false)}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {loadingContractors ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.orange} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                {contractorList.length > 0 ? (
                  contractorList.map((contr) => (
                    <TouchableOpacity 
                      key={contr._id} 
                      style={styles.selectionListItem} 
                      onPress={() => handleAssignContractor(contr._id, contr.fullName)}
                    >
                      <Image source={{ uri: resolveAvatarUrl(contr.avatarUrl) || 'https://i.pravatar.cc/100?img=12' }} style={styles.selectionAvatar} contentFit="cover" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.selectionName}>{contr.fullName}</Text>
                        <Text style={styles.selectionDetail}>{contr.experience || 'Experienced'} · {contr.city || 'Contractor'}</Text>
                      </View>
                      <Feather name="plus-circle" size={20} color={COLORS.orange} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textMuted }}>{t('noContractorsFound') || 'No registered contractors found.'}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── ADD LABOURER MODAL ── */}
      <Modal visible={showLabourModal} transparent animationType="slide" onRequestClose={() => setShowLabourModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowLabourModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('addLabourer') || 'Add Labourer'}</Text>
              <TouchableOpacity onPress={() => setShowLabourModal(false)}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {loadingLabour ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.orange} />
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                {labourList.length > 0 ? (
                  labourList.map((lab) => (
                    <TouchableOpacity 
                      key={lab._id} 
                      style={styles.selectionListItem} 
                      onPress={() => handleAddLabour(lab._id, lab.fullName)}
                    >
                      <Image source={{ uri: resolveAvatarUrl(lab.avatarUrl) || 'https://i.pravatar.cc/100?img=60' }} style={styles.selectionAvatar} contentFit="cover" />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.selectionName}>{lab.fullName}</Text>
                        <Text style={styles.selectionDetail}>{lab.skillType || 'General Labour'} · {lab.city || 'Skilled Worker'}</Text>
                      </View>
                      <Feather name="plus-circle" size={20} color={COLORS.orange} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textMuted }}>{t('noLabourersFound') || 'No registered labourers found.'}</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── RATINGS & REVIEWS MODAL ── */}
      <Modal 
        visible={showRatingModal} 
        transparent 
        animationType="slide" 
        onRequestClose={() => setShowRatingModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowRatingModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalCard} 
            activeOpacity={1}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('rateAndReview') || 'Rate & Review'}</Text>
              <TouchableOpacity onPress={() => setShowRatingModal(false)}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {ratingTarget && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Target User Info */}
                <View style={styles.ratingModalTargetInfo}>
                  <Image 
                    source={{ uri: resolveAvatarUrl(ratingTarget.user.avatarUrl) || 'https://i.pravatar.cc/100?img=12' }} 
                    style={styles.ratingModalAvatar} 
                    contentFit="cover" 
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.ratingModalTargetName}>{ratingTarget.user.fullName}</Text>
                    <Text style={styles.ratingModalTargetRole}>
                      {ratingTarget.user.role} · {ratingTarget.relation}
                    </Text>
                  </View>
                </View>

                {/* Criteria Stars */}
                <View style={styles.criteriaContainer}>
                  {RELATION_CRITERIA[ratingTarget.relation]?.map((criterion) => {
                    const score = ratingScores[criterion] || 5;
                    return (
                      <View key={criterion} style={styles.criterionStarRow}>
                        <Text style={styles.criterionLabel}>{criterion}</Text>
                        <View style={styles.starRow}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <TouchableOpacity 
                              key={star} 
                              onPress={() => handleSelectStar(criterion, star)}
                              activeOpacity={0.7}
                              style={{ padding: 4 }}
                            >
                              <FontAwesome5 
                                name="star" 
                                solid={star <= score} 
                                size={18} 
                                color={star <= score ? COLORS.primary : COLORS.textLight} 
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Review Text Comment */}
                <Text style={styles.reviewInputLabel}>{t('reviewComments') || 'Review Comments'}</Text>
                <TextInput
                  style={styles.reviewTextInput}
                  placeholder={t('reviewExperiencePlaceholder') || 'Share details of your experience with this person...'}
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  numberOfLines={4}
                  value={ratingReviewText}
                  onChangeText={setRatingReviewText}
                />

                {/* Actions */}
                <View style={styles.modalActionsRow}>
                  <TouchableOpacity 
                    style={[styles.modalActionBtn, styles.modalCancelBtn]} 
                    onPress={() => setShowRatingModal(false)}
                    disabled={submittingRating}
                  >
                    <Text style={styles.modalCancelBtnText}>{t('cancel') || 'Cancel'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalActionBtn, styles.modalSubmitBtn, { marginTop: 0, borderRadius: 8, paddingVertical: 0 }]} 
                    onPress={handleSubmitRating}
                    disabled={submittingRating}
                  >
                    {submittingRating ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={[styles.modalSubmitBtnText, { fontSize: 13 }]}>{t('submitReview') || 'Submit Review'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  scrollContent: { paddingBottom: 20 },

  /* HEADER */
  header: {
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, letterSpacing: 0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted },

  /* PROJECT CARD */
  projectCard: {
    margin: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  projectCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  projectTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textDark, marginBottom: 2 },
  projectIdText: { fontSize: 12, color: COLORS.textMuted },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  /* CONTRACTOR ROW */
  contractorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 14,
  },
  contractorAvatar: { width: 40, height: 40, borderRadius: 20 },
  contractorName: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  contractorRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  contractorRatingText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  contractorReviewsText: { fontSize: 11, color: COLORS.textMuted },
  viewProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.blueLight,
    borderRadius: 8,
  },
  viewProfileBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.blue },

  /* DATES ROW */
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase' },
  dateValue: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },

  /* PROGRESS */
  progressSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  progressPercent: { fontSize: 14, fontWeight: '800', color: COLORS.green },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 4,
  },

  /* TIMELINE */
  timelineSection: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  timelineSubtext: { fontSize: 12, color: COLORS.textMuted, marginBottom: 20 },

  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 12,
    top: 28,
    bottom: -20,
    width: 2,
    backgroundColor: COLORS.border,
  },
  timelineIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 1,
  },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  timelineDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 4 },
  timelineDate: { fontSize: 11, color: COLORS.textLight, marginBottom: 8 },
  timelineImagesScroll: { marginBottom: 8 },
  timelineImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E2E8F0',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: COLORS.blueLight,
    borderRadius: 12,
  },
  replyBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.blue },

  /* TIMELINE HEADER ROW */
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addUpdateBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },

  /* ACTION ROW */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  /* COMMENTS */
  commentsList: {
    marginTop: 8,
    marginBottom: 4,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  commentBubble: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    marginLeft: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentSenderName: { fontSize: 11, fontWeight: '700', color: COLORS.textDark },
  commentTime: { fontSize: 10, color: COLORS.textLight },
  commentText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },

  /* REPLY INPUT */
  replyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  replyInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 38,
  },
  sendReplyBtn: {
    backgroundColor: COLORS.blue,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgLight,
  },
  categoryChipActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  categoryChipTextActive: { color: COLORS.white },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSubmitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  /* BOTTOM PAYMENT BAR */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  amountCols: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  amountCol: { flex: 1 },
  amountLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  amountValue: { fontSize: 12, fontWeight: '800', color: COLORS.textDark },
  payNowBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  payNowBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },

  /* NEW MEDIA ATTACHMENT STYLES */
  mediaButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  mediaPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    backgroundColor: COLORS.bgLight,
  },
  mediaPickerBtnActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  mediaPickerBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  mediaPickerBtnTextActive: {
    color: COLORS.white,
  },
  uploadingWrap: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  mediaPreviewsContainer: {
    gap: 10,
    marginBottom: 12,
  },
  mediaPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
  },
  mediaPreviewThumb: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  mediaPreviewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  mediaRemoveText: {
    fontSize: 12,
    color: COLORS.red,
    fontWeight: '600',
    marginTop: 4,
  },
  timelineVideoWrap: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
    marginTop: 4,
  },
  timelineVideo: {
    width: '100%',
    height: '100%',
  },
  videoFullscreenBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxCloseBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
  lightboxVideo: {
    width: '100%',
    height: '85%',
  },
  /* TEAM SECTION */
  teamSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  teamSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  teamSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 4,
  },
  teamAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  teamMemberName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  teamMemberRole: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  teamDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  teamItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  teamItemHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  teamActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.orangeLight,
    borderRadius: 6,
  },
  teamActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
  },
  emptyTeamText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  removeLabourBtn: {
    padding: 6,
  },
  selectionListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectionAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  selectionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  selectionDetail: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  /* ACTION PANEL CARD */
  actionPanelCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  actionPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionPanelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPanelTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.navy,
  },
  smallCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 8,
  },
  smallCancelBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.red,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  infoBannerText: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  approvalActionRow: {
    flexDirection: 'column',
    gap: 12,
  },
  approvalLabel: {
    fontSize: 13,
    color: COLORS.textDark,
    lineHeight: 18,
  },
  approvalButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  approvalBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approvalBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  reworkLabel: {
    fontSize: 13,
    color: COLORS.textDark,
    marginBottom: 8,
    lineHeight: 18,
  },
  reworkInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: COLORS.textDark,
    textAlignVertical: 'top',
    backgroundColor: COLORS.bgLight,
    marginBottom: 15,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  ratingsListSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  ratingsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  noRatingsText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  ratingTargetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  ratingTargetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  ratingTargetName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  ratingTargetRole: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  ratingDetailText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.green,
  },
  rateBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  ratingModalTargetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  ratingModalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  ratingModalTargetName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  ratingModalTargetRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  criteriaContainer: {
    marginVertical: 8,
  },
  criterionStarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  criterionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    flex: 1,
    marginRight: 8,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewInputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  reviewTextInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: COLORS.textDark,
    textAlignVertical: 'top',
    backgroundColor: COLORS.bgLight,
    height: 80,
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: COLORS.border,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },

});
