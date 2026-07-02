import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, useWindowDimensions, TextInput, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from '../../utils/i18n';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import NotificationBell from '../../components/NotificationBell';
import { BACKEND_URL, resolveAvatarUrl } from '../../constants/Config';
import { Fonts } from '../../constants/theme';

const { width } = Dimensions.get('window');

const COLORS = {
  white: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#6B7280',
  bgLight: '#F9FAFB',
  green: '#10B981',
  greenLight: '#D1FAE5',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  orange: '#F97316',
  orangeLight: '#FFEDD5',
  purple: '#7C3AED',
  purpleLight: '#F3E8FF',
  yellow: '#F59E0B',
  yellowLight: '#FEF3C7',
  border: '#E5E7EB',
  starGold: '#FBBF24',
};

// Custom data matching the mockup screenshot
const PROJECTS_DATA = [
  {
    id: '1',
    title: 'Luxury Villa Construction',
    location: 'Jaipur, Rajasthan',
    status: 'On Track',
    statusBg: '#DCFCE7',
    statusColor: '#15803D',
    progress: 75,
    workers: 12,
    dueDate: '12 May',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: '2',
    title: 'Office Renovation',
    location: 'Gurugram, Haryana',
    status: 'In Progress',
    statusBg: '#DBEAFE',
    statusColor: '#1D4ED8',
    progress: 32,
    workers: 8,
    dueDate: '28 May',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop'
  }
];

const SERVICES_DATA = [
  { id: '1', title: 'Residential\nConstruction', icon: 'home', color: '#EA580C', bgColor: '#FFEDD5', library: 'Feather' },
  { id: '2', title: 'Commercial\nConstruction', icon: 'office-building', color: '#F59E0B', bgColor: '#FEF3C7', library: 'MaterialCommunityIcons' },
  { id: '3', title: 'Architecture\n& Design', icon: 'drafting-compass', color: '#059669', bgColor: '#D1FAE5', library: 'FontAwesome5' },
  { id: '4', title: 'Interior\nDesign', icon: 'sofa', color: '#7C3AED', bgColor: '#F3E8FF', library: 'MaterialCommunityIcons' },
  { id: '5', title: 'Renovation', icon: 'hammer', color: '#EA580C', bgColor: '#FFEDD5', library: 'FontAwesome5' },
  { id: '6', title: 'Electrical\nWork', icon: 'zap', color: '#EAB308', bgColor: '#FEFCE8', library: 'Feather' },
  { id: '7', title: 'Plumbing', icon: 'faucet', color: '#06B6D4', bgColor: '#ECFEFF', library: 'FontAwesome5' },
  { id: '8', title: 'Painting', icon: 'paint-roller', color: '#EC4899', bgColor: '#FDF2F8', library: 'MaterialCommunityIcons' },
  { id: '9', title: 'Civil\nWork', icon: 'hard-hat', color: '#10B981', bgColor: '#D1FAE5', library: 'FontAwesome5' },
  { id: '10', title: 'More\nServices', icon: 'grid', color: '#6B7280', bgColor: '#F3F4F6', library: 'Feather' },
];

// Service sub-menus for categories that need drill-down
const SERVICE_SUBMENUS: Record<string, { title: string; items: { name: string; icon: string; library: string; route: string }[] }> = {
  'Interior Design': {
    title: 'Interior Design Services',
    items: [
      { name: 'Interior Designers', icon: 'sofa', library: 'MaterialCommunityIcons', route: '/contractors' },
      { name: 'False Ceiling Experts', icon: 'layers', library: 'Feather', route: '/contractors' },
      { name: 'Furniture Experts', icon: 'table-furniture', library: 'MaterialCommunityIcons', route: '/contractors' },
      { name: 'Lighting Designers', icon: 'lightbulb-outline', library: 'MaterialCommunityIcons', route: '/contractors' },
    ]
  },
  'Electrical Work': {
    title: 'Electrical Services',
    items: [
      { name: 'Electricians', icon: 'zap', library: 'Feather', route: '/labours' },
      { name: 'Electrical Contractors', icon: 'flash', library: 'MaterialCommunityIcons', route: '/contractors' },
      { name: 'Industrial Wiring Experts', icon: 'cable-data', library: 'MaterialCommunityIcons', route: '/contractors' },
    ]
  },
  'Plumbing': {
    title: 'Plumbing Services',
    items: [
      { name: 'Plumbers', icon: 'faucet', library: 'FontAwesome5', route: '/labours' },
      { name: 'Plumbing Contractors', icon: 'pipe', library: 'MaterialCommunityIcons', route: '/contractors' },
    ]
  },
  'Painting': {
    title: 'Painting Services',
    items: [
      { name: 'Painters', icon: 'paint-roller', library: 'MaterialCommunityIcons', route: '/labours' },
      { name: 'Painting Contractors', icon: 'format-paint', library: 'MaterialCommunityIcons', route: '/contractors' },
    ]
  },
};

// Direct navigation map for services without sub-menus
const SERVICE_DIRECT_NAV: Record<string, string> = {
  'Residential Construction': '/contractors',
  'Commercial Construction': '/contractors',
  'Architecture & Design': '/architects',
  'Renovation': '/contractors',
  'Civil Work': '/contractors',
};



export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clientRequests, setClientRequests] = useState<any[]>([]);
  const [labourProjects, setLabourProjects] = useState<any[]>([]);
  const [serviceMenuVisible, setServiceMenuVisible] = useState(false);
  const [activeServiceMenu, setActiveServiceMenu] = useState<string | null>(null);
  const [featuredProfessionals, setFeaturedProfessionals] = useState<any[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);


  // Fetch unread message count from backend
  const fetchUnreadMsgCount = useCallback(async () => {
    if (!currentUser?._id) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/conversations/unread-total/${currentUser._id}`);
      const data = await res.json();
      if (data.success) {
        setUnreadMsgCount(data.totalUnread || 0);
      }
    } catch (err) {
      console.log('Error fetching unread msg count:', err);
    }
  }, [currentUser?._id]);

  useFocusEffect(
    useCallback(() => {
      fetchUnreadMsgCount();
    }, [fetchUnreadMsgCount])
  );

  useEffect(() => {
    fetchUnreadMsgCount();
    const interval = setInterval(fetchUnreadMsgCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadMsgCount]);

  // Fetch client requests or professional projects
  useEffect(() => {
    if (!currentUser?._id) return;
    const fetchRequests = async () => {
      try {
        if (currentUser.role === 'Client') {
          const res = await fetch(`${BACKEND_URL}/api/contract-requests/user/${currentUser._id}`);
          const data = await res.json();

          const wsRes = await fetch(`${BACKEND_URL}/api/project-workspaces/user/${currentUser._id}`);
          const wsData = await wsRes.json();
          const workspaces = wsData.workspaces || [];

          if (data.requests) {
            const merged = data.requests.map((req: any) => {
              const assocWorkspace = workspaces.find((w: any) => {
                const wReqId = w.contractRequest?._id || w.contractRequest;
                return wReqId && req._id && wReqId.toString() === req._id.toString();
              });
              let displayStatus = 'Hiring';
              if (assocWorkspace) {
                displayStatus = assocWorkspace.status === 'Completed' ? 'Completed' : assocWorkspace.status === 'Cancelled' ? 'Cancelled' : 'In Progress';
              }
              return {
                ...req,
                status: displayStatus,
                workspaceId: assocWorkspace?._id || null,
                updates: assocWorkspace?.updates || []
              };
            });

            const sortedMerged = merged.sort((a: any, b: any) => {
              const aFinished = a.status === 'Completed' || a.status === 'Cancelled';
              const bFinished = b.status === 'Completed' || b.status === 'Cancelled';
              if (aFinished && !bFinished) return 1;
              if (!aFinished && bFinished) return -1;
              return 0;
            });
            setClientRequests(sortedMerged);
          }
        } else if (currentUser.role === 'Contractor' || currentUser.role === 'Architect' || currentUser.role === 'Labour') {
          // Fetch workspaces where this professional/labour is assigned
          const wsRes = await fetch(`${BACKEND_URL}/api/project-workspaces/user/${currentUser._id}`);
          const wsData = await wsRes.json();
          const workspaces = wsData.workspaces || [];

          const mapped = workspaces.map((w: any) => {
            return {
              _id: w._id,
              title: w.title,
              location: w.contractRequest?.location || 'Thane',
              status: w.status === 'Completed' ? 'Completed' : w.status === 'Cancelled' ? 'Cancelled' : 'In Progress',
              workspaceId: w._id,
              timeline: w.contractRequest?.timeline || '20 Days',
              description: w.contractRequest?.description || '',
              budget: w.quotation?.totalCost ? `₹${w.quotation.totalCost.toLocaleString('en-IN')}` : '',
              requirements: w.contractRequest?.requirements || [],
              updates: w.updates || []
            };
          });

          // Fetch direct pending invitations
          try {
            const reqRes = await fetch(`${BACKEND_URL}/api/contract-requests/user/${currentUser._id}`);
            const reqData = await reqRes.json();
            if (reqData.requests) {
              const pendingInvitations = reqData.requests.filter((r: any) => {
                const isPending = r.status === 'Pending';
                const isDirectInvitation = r.professional && 
                  ((typeof r.professional === 'object' && r.professional._id && r.professional._id.toString() === currentUser._id.toString()) ||
                   (typeof r.professional === 'string' && r.professional === currentUser._id.toString()));
                return isPending && isDirectInvitation;
              });

              const mappedInvitations = pendingInvitations.map((inv: any) => {
                const clientId = typeof inv.client === 'object' && inv.client._id ? inv.client._id : inv.client;
                return {
                  _id: inv._id,
                  title: inv.title,
                  location: inv.location,
                  status: 'Invitation',
                  workspaceId: null,
                  clientId: clientId,
                  timeline: inv.timeline || 'Not Specified',
                  description: inv.description || '',
                  budget: inv.budget || '',
                  requirements: inv.requirements || [],
                  updates: []
                };
              });

              mapped.push(...mappedInvitations);
            }
          } catch (invErr) {
            console.error('Error fetching invitations:', invErr);
          }

          const sortedMapped = mapped.sort((a: any, b: any) => {
            const aFinished = a.status === 'Completed' || a.status === 'Cancelled';
            const bFinished = b.status === 'Completed' || b.status === 'Cancelled';
            if (aFinished && !bFinished) return 1;
            if (!aFinished && bFinished) return -1;
            // Put invitations first
            if (a.status === 'Invitation' && b.status !== 'Invitation') return -1;
            if (a.status !== 'Invitation' && b.status === 'Invitation') return 1;
            return 0;
          });
          setClientRequests(sortedMapped);
        }
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    fetchRequests();
  }, [currentUser?._id, currentUser?.role]);

  // Fetch recent activities - also refresh on screen focus
  const fetchActivities = useCallback(async () => {
    if (!currentUser?._id) {
      setActivitiesLoading(false);
      return;
    }
    const run = async () => {
      try {
        setActivitiesLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/notifications/${currentUser._id}`);
        const data = await res.json();
        if (data.success && data.notifications) {
          // Map notifications to activity items
          const mapped = data.notifications.slice(0, 5).map((n: any) => {
            let icon = 'bell';
            let color = '#3B82F6';
            let bgColor = '#EFF6FF';
            
            const text = n.text || '';
            if (text.includes('attendance') || text.includes('Attendance') || text.includes('marked present')) {
              icon = 'check-square';
              color = '#10B981';
              bgColor = '#E6FDF5';
            } else if (text.includes('quotation') || text.includes('Quotation') || text.includes('bid') || text.includes('Bid') || text.includes('Invitation to bid')) {
              icon = 'file-text';
              color = '#8B5CF6';
              bgColor = '#F5F3FF';
            } else if (text.includes('payment') || text.includes('Payment') || text.includes('Paid') || text.includes('wage') || text.includes('credited')) {
              icon = 'credit-card';
              color = '#F59E0B';
              bgColor = '#FEF3C7';
            } else if (text.includes('accepted') || text.includes('Accepted') || text.includes('invitation') || text.includes('Invitation') || text.includes('portfolio') || text.includes('matched') || text.includes('Welcome')) {
              icon = 'user-check';
              color = '#10B981';
              bgColor = '#E6FDF5';
            } else if (text.includes('materials') || text.includes('delivered') || text.includes('Delivery') || text.includes('project') || text.includes('Project') || text.includes('opportunity')) {
              icon = 'truck';
              color = '#F97316';
              bgColor = '#FFF7ED';
            }
            
            const diffMs = new Date().getTime() - new Date(n.createdAt).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            let timeStr = 'Just now';
            if (diffDays > 0) timeStr = `${diffDays}d ago`;
            else if (diffHours > 0) timeStr = `${diffHours}h ago`;
            else if (diffMins > 0) timeStr = `${diffMins}m ago`;

            let projectTitle = '';
            const projMatch = text.match(/for\s+project\s+([^[\]\n]+)/i) || text.match(/for\s+([^[\]\n]+)/i);
            if (projMatch && projMatch[1]) {
              projectTitle = projMatch[1].trim().split('\n')[0].substring(0, 30);
            }

            return {
              id: n._id,
              title: text.split('\n')[0],
              project: projectTitle || 'Project Update',
              time: timeStr,
              icon: icon,
              color: color,
              bgColor: bgColor,
              isClickable: true
            };
          });
          setRecentActivities(mapped);
        } else {
          setRecentActivities([]);
        }
      } catch (err) {
        console.error('Error fetching dashboard activities:', err);
        setRecentActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    };
    run();
  }, [currentUser?._id]);

  useEffect(() => { fetchActivities(); }, [currentUser?._id]);

  useFocusEffect(useCallback(() => { fetchActivities(); }, [fetchActivities]));

  // Fetch Labour portfolio highlights
  useEffect(() => {
    if (!currentUser?._id || currentUser?.role !== 'Labour') return;
    const fetchLabourPortfolio = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/professional/${currentUser._id}/portfolio-highlights`);
        const data = await res.json();
        if (data.portfolioHighlights) {
          setLabourProjects(data.portfolioHighlights);
        }
      } catch (err) {
        console.error('Error fetching labour portfolio highlights:', err);
      }
    };
    fetchLabourPortfolio();
  }, [currentUser?._id, currentUser?.role]);

  // Load current user from global/localStorage on every focus
  const loadCurrentUser = useCallback(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { user = JSON.parse(stored); } catch (e) {}
      }
    }
    if (user) setCurrentUser(user);
  }, []);

  useEffect(() => { loadCurrentUser(); }, []);

  useFocusEffect(useCallback(() => { loadCurrentUser(); }, [loadCurrentUser]));

  // Fetch featured professionals from API when user is loaded
  useEffect(() => {
    if (!currentUser?._id) {
      setFeaturedLoading(false);
      return;
    }
    const fetchFeatured = async () => {
      try {
        setFeaturedLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/featured-professionals/${currentUser._id}`);
        const data = await res.json();
        if (data.featured) {
          setFeaturedProfessionals(data.featured);
        }

      } catch (err) {
        console.error('Error fetching featured professionals:', err);
      } finally {
        setFeaturedLoading(false);
      }
    };
    fetchFeatured();
  }, [currentUser?._id]);

  const userName = currentUser?.fullName || 'Rohit';

  // Set exactly 4 columns per row for Browse by Service grid
  const numCols = 4;
  const gridGap = 8;
  const gridPadding = 16;
  const totalGapWidth = gridGap * (numCols - 1);
  const availableGridWidth = screenWidth - (gridPadding * 2) - totalGapWidth;
  const srvCardWidth = Math.floor(availableGridWidth / numCols);

  const handleSearch = (query: string) => {
    const q = query.trim();
    if (!q) return;
    router.push({ pathname: '/search-results', params: { searchQuery: q } } as any);
  };

  const handleToggleService = (serviceName: string) => {
    const cleanedTitle = serviceName.replace('\n', ' ');

    // Check if this service has a sub-menu
    if (SERVICE_SUBMENUS[cleanedTitle]) {
      setActiveServiceMenu(cleanedTitle);
      setServiceMenuVisible(true);
      return;
    }

    // Check if this service navigates directly
    if (SERVICE_DIRECT_NAV[cleanedTitle]) {
      router.push(SERVICE_DIRECT_NAV[cleanedTitle] as any);
      return;
    }

    // "More Services" or unknown — toggle selection
    if (selectedService === cleanedTitle) {
      setSelectedService(null);
    } else {
      setSelectedService(cleanedTitle);
    }
  };

  const renderSubMenuIcon = (iconName: string, library: string) => {
    if (library === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={iconName as any} size={20} color="#374151" />;
    } else if (library === 'FontAwesome5') {
      return <FontAwesome5 name={iconName as any} size={16} color="#374151" />;
    } else {
      return <Feather name={iconName as any} size={20} color="#374151" />;
    }
  };

  const handleViewProfile = (prof: any) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    const profId = prof._id || prof.id;
    const profName = prof.fullName || prof.name;
    const profAvatar = resolveAvatarUrl(prof.avatarUrl) || prof.avatar || '';
    const profLocation = prof.location || (prof.city ? `${prof.city}${prof.state ? ', ' + prof.state : ''}` : '');
    const profRating = (prof.rating || 0).toString();
    const profReviews = (prof.reviews || 0).toString();
    const profExperience = (prof.experience || '').split(' ')[0];
    const profProjects = (prof.projects || 0).toString();

    if (prof.role === 'Architect') {
      router.push({
        pathname: '/architect-detail',
        params: {
          id: profId,
          name: profName,
          avatar: profAvatar,
          coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
          firmName: prof.firmName || '',
          experience: profExperience,
          projects: profProjects,
          followers: (prof.followersCount || 0).toString(),
          phone: prof.phone || prof.phoneNumber || '',
          reviews: profReviews,
          rating: profRating,
          role: prof.role,
          location: profLocation,
          specialization: Array.isArray(prof.specialization) ? prof.specialization.join(', ') : (prof.specialization || '')
        }
      });
    } else if (prof.role === 'Contractor') {
      router.push({
        pathname: '/contractor-detail',
        params: {
          id: profId,
          name: profName,
          avatar: profAvatar,
          coverImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop',
          rating: profRating,
          reviews: profReviews,
          location: profLocation,
          experience: profExperience,
          specialization: prof.contractorType || prof.shortDesc || '',
          projects: profProjects,
          followers: (prof.followersCount || 0).toString(),
          firmName: prof.firmName || 'Contracting Services',
          phone: prof.phone || prof.phoneNumber || '',
          workerCount: prof.teamSize ? `${prof.teamSize} Workers Available` : '18 Workers Available',
          serviceAreas: Array.isArray(prof.serviceLocation) ? prof.serviceLocation.join(', ') : (prof.city || ''),
          skills: Array.isArray(prof.workCategory) ? prof.workCategory.join(',') : 'Civil Work,RCC Work,Renovation'
        }
      });
    } else if (prof.role === 'Labour') {
      router.push({
        pathname: '/labour-detail',
        params: {
          id: prof._id || prof.id || '',
          name: profName,
          role: prof.skillType || prof.role,
          avatar: profAvatar,
          experience: profExperience + ' Years Experience',
          location: profLocation,
          rating: profRating,
          reviews: profReviews,
          contractorName: 'BuildWell Constructions'
        }
      });
    } else if (prof.role === 'Client') {
      router.push({
        pathname: '/project-detail',
        params: {
          clientId: profId,
          title: prof.activeProject?.title || '',
          projectType: prof.activeProject?.projectType || '',
          budget: prof.activeProject?.budget || '',
          location: prof.activeProject?.location || profLocation,
        }
      });
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

  // Filter featured professionals based on search/service selection
  const filteredProfessionals = featuredProfessionals.filter((p) => {
    const name = (p.fullName || p.name || '').toLowerCase();
    const role = (p.role || '').toLowerCase();
    const contractorType = (p.contractorType || '').toLowerCase();
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return name.includes(q) || role.includes(q) || contractorType.includes(q);
    }
    return true;
  });

  const renderServiceIcon = (item: typeof SERVICES_DATA[0]) => {
    if (item.library === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />;
    } else if (item.library === 'FontAwesome5') {
      return <FontAwesome5 name={item.icon as any} size={16} color={item.color} />;
    } else {
      return <Feather name={item.icon as any} size={20} color={item.color} />;
    }
  };

  const renderActivityIcon = (iconName: string, color: string) => {
    if (iconName === 'user-check') return <Feather name="user-check" size={14} color={color} />;
    if (iconName === 'check-square') return <Feather name="check-square" size={14} color={color} />;
    if (iconName === 'truck') return <FontAwesome5 name="truck" size={12} color={color} />;
    return <Feather name="file-text" size={14} color={color} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* ================= STATIC HEADER ================= */}
      <View style={styles.headerContainer}>
        <View style={styles.logoRow}>
          <Image 
            source={require('@/assets/images/allver-logo.svg')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <View style={styles.headerIconsRow}>
            
            <NotificationBell size={20} color={COLORS.textDark} />

            <TouchableOpacity 
              style={styles.iconBadgeBtn}
              onPress={() => router.push('/chats')}
            >
              <Feather name="message-square" size={20} color={COLORS.textDark} />
              {unreadMsgCount > 0 && (
                <View style={styles.badgeCircle}><Text style={styles.badgeText}>{unreadMsgCount > 9 ? '9+' : unreadMsgCount}</Text></View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.avatarBtn}
              onPress={() => router.push('/profile')}
            >
              {currentUser?.avatarUrl ? (
                <Image 
                  source={{ uri: resolveAvatarUrl(currentUser.avatarUrl) }} 
                  style={styles.avatarImage} 
                  contentFit="cover" 
                />
              ) : (
                <View style={[styles.avatarImage, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Feather name="user" size={16} color="#94A3B8" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ================= GREETING ================= */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>{t('welcome')}, {userName} !</Text>
          <Text style={styles.subtitleText}>{t('buildGreatDay')}</Text>
        </View>


        {/* ================= SEARCH BAR ================= */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBarWrapper}>
            <TouchableOpacity onPress={() => handleSearch(searchQuery)}>
              <Feather name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            </TouchableOpacity>
            <TextInput 
              style={styles.searchInput} 
              placeholder={t('homeSearchPlaceholder')} 
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearch(searchQuery)}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                <Feather name="x" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.filterBtn}>
              <Feather name="sliders" size={18} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= QUICK ACTIONS ================= */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{t('quickActions')}</Text>
          
          {/* All 3 cards in a flex-wrap grid */}
          <View style={styles.qaTopRow}>
            {/* Find Contractor */}
            <TouchableOpacity 
              style={[styles.qaCard, { borderColor: '#D1FAE5' }]}
              onPress={() => router.push('/contractors')}
              activeOpacity={0.85}
            >
              <View style={styles.qaCardHeader}>
                <View style={[styles.qaIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <FontAwesome5 name="hard-hat" size={18} color="#10B981" />
                </View>
                <View style={styles.qaCardTextCol}>
                  <Text style={styles.qaCardTitle}>{t('findContractor')}</Text>
                  <Text style={styles.qaCardDesc}>{t('findContractorDesc')}</Text>
                </View>
              </View>
              <View style={styles.qaCardFooter}>
                <View style={[styles.qaPill, { backgroundColor: '#10B981' }]}>
                  <Text style={styles.qaPillText}>{t('hireNow')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Find Architect */}
            <TouchableOpacity 
              style={[styles.qaCard, { borderColor: '#DBEAFE' }]}
              onPress={() => router.push('/architects')}
              activeOpacity={0.85}
            >
              <View style={styles.qaCardHeader}>
                <View style={[styles.qaIconWrap, { backgroundColor: '#EFF6FF' }]}>
                  <FontAwesome5 name="drafting-compass" size={16} color="#2563EB" />
                </View>
                <View style={styles.qaCardTextCol}>
                  <Text style={styles.qaCardTitle}>{t('findArchitect')}</Text>
                  <Text style={styles.qaCardDesc}>{t('findArchitectDesc')}</Text>
                </View>
              </View>
              <View style={styles.qaCardFooter}>
                <View style={[styles.qaPill, { backgroundColor: '#2563EB' }]}>
                  <Text style={styles.qaPillText}>{t('exploreLabel')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Skilled Labour */}
            <TouchableOpacity 
              style={[styles.qaCard, { borderColor: '#FFEDD5' }]}
              onPress={() => router.push('/labours')}
              activeOpacity={0.85}
            >
              <View style={styles.qaCardHeader}>
                <View style={[styles.qaIconWrap, { backgroundColor: '#FFF7ED' }]}>
                  <FontAwesome5 name="users" size={18} color="#F97316" />
                </View>
                <View style={styles.qaCardTextCol}>
                  <Text style={styles.qaCardTitle}>{t('skilledLabour')}</Text>
                  <Text style={styles.qaCardDesc}>{t('findLabourDesc')}</Text>
                </View>
              </View>
              <View style={styles.qaCardFooter}>
                <View style={[styles.qaPill, { backgroundColor: '#F97316' }]}>
                  <Text style={styles.qaPillText}>{t('findLabourBtn')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Secondary Actions Row */}
          <View style={styles.qaSecondaryRow}>
            <TouchableOpacity 
              style={[styles.qaSecondaryCard, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
              onPress={() => router.push('/(tabs)/post-project')}
            >
              <View style={[styles.qaSecondaryIcon, { backgroundColor: '#FDE68A' }]}>
                <Feather name="plus" size={14} color="#D97706" />
              </View>
              <Text style={styles.qaSecondaryText}>
                {currentUser?.role === 'Labour' ? t('addWork') : t('postProject')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.qaSecondaryCard, { backgroundColor: '#F3E8FF', borderColor: '#E9D5FF' }]}
              onPress={() => router.push('/project-progress')}
            >
              <View style={[styles.qaSecondaryIcon, { backgroundColor: '#E9D5FF' }]}>
                <Feather name="clipboard" size={13} color="#7C3AED" />
              </View>
              <Text style={styles.qaSecondaryText}>{t('trackProject')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= MY PROJECTS ================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('myProjects')}</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>{t('viewAll')}</Text></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsScroll}>
            {currentUser?.role === 'Client' || currentUser?.role === 'Contractor' || currentUser?.role === 'Architect' || currentUser?.role === 'Labour' ? (
              clientRequests.length > 0 ? (
                clientRequests.map((proj) => (
                  <TouchableOpacity 
                    key={proj._id} 
                    style={[
                      styles.projectCard,
                      proj.status === 'Completed' && styles.completedProjectCard,
                      proj.status === 'Cancelled' && styles.cancelledProjectCard
                    ]}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (proj.status === 'Invitation') {
                        router.push({
                          pathname: '/project-detail',
                          params: {
                            clientId: proj.clientId || '',
                            titleHint: proj.title
                          }
                        });
                      } else if (proj.status === 'Hiring') {
                        router.push({
                          pathname: '/project-applications',
                          params: {
                            requestId: proj._id || '',
                            title: proj.title,
                            location: proj.location,
                            budget: proj.budget || '',
                            timeline: proj.timeline || '',
                            description: proj.description || '',
                            requirements: Array.isArray(proj.requirements) ? proj.requirements.join(',') : proj.requirements || '',
                          }
                        });
                      } else {
                        router.push({
                          pathname: '/project-progress',
                          params: {
                            name: proj.title,
                            location: proj.location,
                            status: proj.status || 'Hiring',
                            progress: (proj.status === 'Completed' ? '100' : '60'),
                            workspaceId: proj.workspaceId || ''
                          }
                        });
                      }
                    }}
                  >
                    {/* Cover Image Area */}
                    <View style={styles.projectImageWrapper}>
                      <Image 
                        source={{ uri: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=600&auto=format&fit=crop' }} 
                        style={styles.projectImage} 
                      />
                      {/* Status Overlay */}
                      <View style={[styles.projectStatusBadge, { 
                        backgroundColor: proj.status === 'Completed' 
                          ? '#DCFCE7' 
                          : proj.status === 'Cancelled'
                            ? '#FEF2F2'
                            : proj.status === 'In Progress' 
                              ? '#DBEAFE' 
                              : '#FEF3C7' 
                      }]}>
                        <Text style={[styles.projectStatusText, { 
                          color: proj.status === 'Completed' 
                            ? '#15803D' 
                            : proj.status === 'Cancelled'
                              ? '#B91C1C'
                              : proj.status === 'In Progress' 
                                ? '#1D4ED8' 
                                : '#D97706' 
                        }]}>{proj.status || 'Hiring'}</Text>
                      </View>
                      
                      {/* NEW UPDATE BADGE OVER IMAGE */}
                      {checkNewUpdates(proj.workspaceId, proj.updates) && (
                        <View style={styles.newUpdateBadge}>
                          <View style={styles.newUpdateDot} />
                          <Text style={styles.newUpdateText}>New Update</Text>
                        </View>
                      )}
                    </View>

                    {/* Body Content */}
                    <View style={styles.projectCardBody}>
                      <Text style={styles.projectTitleText}>{proj.title}</Text>
                      <View style={styles.iconLabelRow}>
                        <Feather name="map-pin" size={12} color={COLORS.textMuted} style={styles.cardInfoIcon} />
                        <Text style={styles.projectDetailText}>{proj.location}</Text>
                      </View>
                      
                      <View style={styles.projectDivider} />

                      {/* Statistics metrics */}
                      <View style={styles.projectMetricsRow}>
                        <View style={styles.metricItem}>
                          <Feather name="clock" size={11} color={COLORS.textMuted} style={styles.metricIcon} />
                          <Text style={styles.metricText}>{proj.timeline || '90 Days'}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                currentUser?.role === 'Client' ? (
                  <TouchableOpacity 
                    style={[styles.projectCard, { justifyContent: 'center', alignItems: 'center', padding: 16 }]}
                    activeOpacity={0.8}
                    onPress={() => router.push('/(tabs)/post-project')}
                  >
                    <Feather name="plus-circle" size={32} color={COLORS.green} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, textAlign: 'center' }}>{t('postNewProject')}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 }}>{t('postNewProjectDesc')}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.projectCard, { justifyContent: 'center', alignItems: 'center', padding: 16 }]}>
                    <Feather name="clipboard" size={32} color={COLORS.textLight} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textDark, textAlign: 'center' }}>{t('noActiveProjects')}</Text>
                    <Text style={{ fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 }}>{t('noActiveProjectsDesc')}</Text>
                  </View>
                )
              )
            ) : (
              PROJECTS_DATA.map((proj) => (
                <View key={proj.id} style={styles.projectCard}>
                  
                  {/* Cover Image Area */}
                  <View style={styles.projectImageWrapper}>
                    <Image source={{ uri: proj.image }} style={styles.projectImage} />
                    
                    {/* Status Overlay */}
                    <View style={[styles.projectStatusBadge, { backgroundColor: proj.statusBg }]}>
                      <Text style={[styles.projectStatusText, { color: proj.statusColor }]}>{proj.status}</Text>
                    </View>


                  </View>

                  {/* Body Content */}
                  <View style={styles.projectCardBody}>
                    <Text style={styles.projectTitleText}>{proj.title}</Text>
                    <View style={styles.iconLabelRow}>
                      <Feather name="map-pin" size={12} color={COLORS.textMuted} style={styles.cardInfoIcon} />
                      <Text style={styles.projectDetailText}>{proj.location}</Text>
                    </View>
                    
                    <View style={styles.projectDivider} />

                    {/* Statistics metrics */}
                    <View style={styles.projectMetricsRow}>
                      <View style={styles.metricItem}>
                        <FontAwesome5 name="users" size={10} color={COLORS.textMuted} style={styles.metricIcon} />
                        <Text style={styles.metricText}>{proj.workers} Workers</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Feather name="calendar" size={11} color={COLORS.textMuted} style={styles.metricIcon} />
                        <Text style={styles.metricText}>{proj.dueDate} Due</Text>
                      </View>
                    </View>



                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* ================= FEATURED PROFESSIONALS ================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('featuredProfessionals')}</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>{t('viewAll')}</Text></TouchableOpacity>
          </View>

          {featuredLoading ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 30, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.blue} />
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8 }}>Finding the best matches...</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsScroll}>
              {filteredProfessionals.map((prof, idx) => {
                const profName = prof.fullName || prof.name || 'Unknown';
                const profAvatar = resolveAvatarUrl(prof.avatarUrl) || prof.avatar || '';
                const profCity = prof.city || '';
                const profRating = prof.rating || 0;
                const profReviews = prof.reviews || 0;
                const isVerified = prof.isVerified;

                // Determine color by role
                const roleColorMap: Record<string, string> = {
                  'Contractor': '#2563EB',
                  'Architect': '#10B981',
                  'Labour': '#F97316',
                  'Client': '#7C3AED',
                };
                const cardColor = roleColorMap[prof.role] || '#6B7280';

                if (prof.type === 'client' && prof.activeProject) {
                  // ============ CLIENT CARD ============
                  return (
                    <View key={`client-${prof._id || idx}-${idx}`} style={[styles.professionalCard, { borderColor: '#E9D5FF' }]}>
                      {/* Project Type Badge */}
                      <View style={[styles.clientTypeBadge, { backgroundColor: '#F3E8FF' }]}>
                        <Text style={[styles.clientTypeBadgeText, { color: '#7C3AED' }]}>
                          {prof.activeProject.projectType || 'Project'}
                        </Text>
                      </View>

                      {/* Project Title */}
                      <Text style={styles.clientProjectTitle} numberOfLines={2}>
                        {prof.activeProject.title}
                      </Text>

                      {/* Client Name */}
                      <View style={styles.iconLabelRow}>
                        <Feather name="user" size={11} color={COLORS.textMuted} style={styles.cardInfoIcon} />
                        <Text style={styles.projectDetailText} numberOfLines={1}>{profName}</Text>
                      </View>

                      {/* Location */}
                      <View style={styles.iconLabelRow}>
                        <Feather name="map-pin" size={11} color={COLORS.textMuted} style={styles.cardInfoIcon} />
                        <Text style={styles.projectDetailText}>{prof.activeProject.location || profCity}</Text>
                      </View>

                      {/* Budget */}
                      {prof.activeProject.budget && (
                        <View style={styles.iconLabelRow}>
                          <FontAwesome name="rupee" size={10} color={COLORS.textMuted} style={styles.cardInfoIcon} />
                          <Text style={[styles.projectDetailText, { fontWeight: '700', color: COLORS.textDark }]}>
                            {prof.activeProject.budget}
                          </Text>
                        </View>
                      )}

                      <View style={{ flex: 1 }} />

                      {/* View Project Button */}
                      <TouchableOpacity 
                        style={[styles.profBtn, { borderColor: '#7C3AED' }]}
                        onPress={() => handleViewProfile(prof)}
                      >
                        <Text style={[styles.profBtnText, { color: '#7C3AED' }]}>View Project</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                // ============ PROFESSIONAL CARD (Contractor / Architect / Labour) ============
                return (
                  <View key={`prof-${prof._id || idx}-${idx}`} style={styles.professionalCard}>
                    {/* Header Info */}
                    <View style={styles.profCardHeader}>
                      <Image source={{ uri: profAvatar }} style={styles.profAvatar} />
                      <View style={styles.profTitleCol}>
                        <View style={styles.nameVerifiedRow}>
                          <Text style={styles.profName} numberOfLines={1}>{profName}</Text>
                          {isVerified && (
                            <MaterialCommunityIcons name="decagram-check" size={14} color="#10B981" style={styles.verifiedIcon} />
                          )}
                        </View>
                        <Text style={styles.profSubText}>{prof.contractorType || prof.skillType || prof.role}</Text>
                        
                        {/* Rating */}
                        <View style={styles.ratingRow}>
                          <FontAwesome name="star" size={12} color={COLORS.starGold} />
                          <Text style={styles.ratingValueText}>{profRating}</Text>
                          <Text style={styles.reviewsCountText}>({profReviews})</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.projectDivider} />

                    {/* Stats Row */}
                    <View style={styles.profStatsRow}>
                      <Feather name="file-text" size={13} color={COLORS.textMuted} style={styles.profStatIcon} />
                      <Text style={styles.profStatText}>{prof.projects || 0} Projects</Text>
                    </View>

                    {profCity ? (
                      <View style={[styles.profStatsRow, { marginBottom: 10 }]}>
                        <Feather name="map-pin" size={13} color={COLORS.textMuted} style={styles.profStatIcon} />
                        <Text style={styles.profStatText}>{profCity}</Text>
                      </View>
                    ) : null}

                    {/* View Profile Button */}
                    <TouchableOpacity 
                      style={[styles.profBtn, { borderColor: cardColor }]} 
                      onPress={() => handleViewProfile(prof)}
                    >
                      <Text style={[styles.profBtnText, { color: cardColor }]}>{t('viewProfile')}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {filteredProfessionals.length === 0 && !featuredLoading && (
                <View style={styles.emptyCard}>
                  <Feather name="globe" size={24} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>{t('exploreNetworkDesc')}</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* ================= BROWSE BY SERVICE ================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('browseByService')}</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>{t('viewAll')}</Text></TouchableOpacity>
          </View>

          <View style={styles.servicesGrid}>
            {[
              ...SERVICES_DATA.slice(0, 7),
              SERVICES_DATA.find(s => s.id === '10') || SERVICES_DATA[9]
            ].map((srv) => {
              const cleanedTitle = srv.title.replace('\n', ' ');
              const isSelected = selectedService === cleanedTitle;
              return (
                <TouchableOpacity 
                  key={srv.id} 
                  style={[
                    styles.serviceCard,
                    { width: srvCardWidth },
                    isSelected && { borderColor: srv.color, borderWidth: 1.5 }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleToggleService(srv.title)}
                >
                  <View style={[styles.serviceIconWrapper, { backgroundColor: srv.bgColor }]}>
                    {renderServiceIcon(srv)}
                  </View>
                  <Text style={styles.serviceTitle} numberOfLines={2}>
                    {srv.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ================= RECENT ACTIVITY ================= */}
        <View style={[styles.sectionContainer, { paddingBottom: 30 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{t('recentActivity')}</Text>
            <TouchableOpacity onPress={() => router.push('/notifications')}>
              <Text style={styles.viewAllText}>{t('viewAll')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            {activitiesLoading ? (
              <ActivityIndicator size="small" color={COLORS.blue} style={{ marginVertical: 20 }} />
            ) : recentActivities.length > 0 ? (
              recentActivities.map((act) => {
                const handlePress = () => {
                  router.push('/notifications');
                };

                const ItemComponent = act.isClickable ? TouchableOpacity : View;

                return (
                  <ItemComponent 
                    key={act.id} 
                    style={styles.activityItem} 
                    activeOpacity={0.7}
                    onPress={act.isClickable ? handlePress : undefined}
                  >
                    <View style={[styles.activityIconCircle, { backgroundColor: act.bgColor }]}>
                      {renderActivityIcon(act.icon, act.color)}
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitleText} numberOfLines={1}>{act.title}</Text>
                      <Text style={styles.activityProjectText}>
                        {act.project}
                      </Text>
                    </View>
                    <View style={styles.activityTimeCol}>
                      <Text style={styles.activityTimeText}>{act.time}</Text>
                      {act.isClickable && (
                        <Feather name="chevron-right" size={14} color={COLORS.textMuted} />
                      )}
                    </View>
                  </ItemComponent>
                );
              })
            ) : (
              <View style={{ paddingVertical: 24, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="activity" size={32} color="#94A3B8" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginHorizontal: 16 }}>
                  {t('noRecentActivityDesc')}
                </Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>

      {/* ================= SERVICE SUB-MENU MODAL ================= */}
      <Modal
        visible={serviceMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setServiceMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setServiceMenuVisible(false)}
        >
          <View style={styles.modalSheet}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />
            
            {activeServiceMenu && SERVICE_SUBMENUS[activeServiceMenu] && (
              <>
                <Text style={styles.modalTitle}>
                  {SERVICE_SUBMENUS[activeServiceMenu].title}
                </Text>
                <View style={styles.modalDivider} />
                
                {SERVICE_SUBMENUS[activeServiceMenu].items.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.modalItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setServiceMenuVisible(false);
                      router.push(item.route as any);
                    }}
                  >
                    <View style={styles.modalItemIcon}>
                      {renderSubMenuIcon(item.icon, item.library)}
                    </View>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingBottom: 20 },
  
  /* STATIC HEADER */
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: COLORS.white,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoImage: {
    width: 125,
    height: 34,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadgeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

  /* GREETING */
  greetingContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  /* SEARCH BAR */
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 44,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: COLORS.textDark,
  },
  filterBtn: {
    padding: 6,
    marginLeft: 8,
  },

  /* SECTIONS */
  sectionContainer: {
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.blue,
  },

  /* QUICK ACTIONS */
  qaTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 10,
  },
  qaBottomRow: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  qaCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    justifyContent: 'space-between',
    height: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  qaCardWide: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  qaCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  qaIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qaCardTextCol: {
    flex: 1,
  },
  qaCardTitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  qaCardDesc: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 14,
  },
  qaCardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  qaCount: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  qaCountLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  qaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 3,
  },
  qaPillText: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  qaSecondaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 6,
  },
  qaSecondaryCard: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  qaSecondaryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  qaSecondaryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#111827',
  },

  /* HORIZONTAL CARDS SCROLL */
  horizontalCardsScroll: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 8,
  },

  /* MY PROJECTS */
  projectCard: {
    width: 260,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  completedProjectCard: {
    backgroundColor: '#F0FDF4', // Very light green background
    borderColor: '#BBF7D0',     // Soft green border
    borderWidth: 1.5,
  },
  cancelledProjectCard: {
    backgroundColor: '#FEF2F2', // Very light red background
    borderColor: '#FCA5A5',     // Soft red border
    borderWidth: 1.5,
  },
  projectImageWrapper: {
    height: 120,
    position: 'relative',
  },
  projectImage: {
    width: '100%',
    height: '100%',
  },
  projectStatusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  projectStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressPercentageOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressPercentageText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  projectCardBody: {
    padding: 14,
  },
  projectTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  iconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardInfoIcon: {
    marginRight: 4,
  },
  projectDetailText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  projectDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  projectMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 4,
  },
  metricText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressBarWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },

  /* FEATURED PROFESSIONALS */
  professionalCard: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  profCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  profTitleCol: {
    flex: 1,
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    flex: 1,
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  profSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginVertical: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    marginLeft: 3,
    marginRight: 2,
  },
  reviewsCountText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  profStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profStatIcon: {
    marginRight: 6,
  },
  profStatText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  profBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  profBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    width: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },

  /* CLIENT CARD (Featured) */
  clientTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 8,
  },
  clientTypeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  clientProjectTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8,
    lineHeight: 18,
  },

  /* BROWSE BY SERVICE */
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  serviceCard: {
    height: 80,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  serviceIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    lineHeight: 11,
  },

  /* RECENT ACTIVITY */
  activityList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activityIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  activityProjectText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  activityTimeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTimeText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },

  /* SERVICE SUB-MENU MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  modalItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textDark,
  },
  newUpdateBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newUpdateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
  },
  newUpdateText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});
