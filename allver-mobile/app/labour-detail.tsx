import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, TextInput, Alert, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';
import { useTranslation } from '../utils/i18n';
import SocketService from '../utils/SocketService';

import * as Location from 'expo-location';

const { width } = Dimensions.get('window');



const COLORS = {
  green: '#10B981', // Accent green
  greenLight: '#E6FDF5',
  textDark: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  bgLight: '#F8FAFC',
  gold: '#F59E0B',
  orange: '#F59E0B',
  orangeLight: '#FEF3C7',
  red: '#EF4444',
  redLight: '#FEE2E2',
  teal: '#0F766E', // Green/Teal
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
};




export default function LabourDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();


  // Load params with fallbacks
  const id = (params.id as string) || '60c72b2f9b1d8a2a4c8b0004';
  const name = (params.name as string) || 'Ramesh Yadav';
  const role = (params.role as string) || 'Mason';
  const avatar = resolveAvatarUrl(params.avatar as string) || '';
  const experience = (params.experience as string) || '12+ Years Experience';
  const location = (params.location as string) || 'Mumbai, Maharashtra';
  const rating = (params.rating as string) || '4.8';
  const reviews = (params.reviews as string) || '124';
  const contractorName = (params.contractorName as string) || 'BuildWell Contractors';
  const workspaceId = (params.workspaceId as string) || '';

  const cleanExperience = (() => {
    let exp = experience || '';
    exp = exp.replace(/Years/gi, '').replace(/Experience/gi, '').trim();
    return exp ? `${exp} Years Experience` : 'Entry Level';
  })();

  const [activeTab, setActiveTab] = useState<'payments' | 'projects' | 'documents'>('projects');
  const [tabInitialized, setTabInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);
  
  // States for Follow/Unfollow
  const [followersCountVal, setFollowersCountVal] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [specializations, setSpecializations] = useState<string[]>([]);

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

  const [professionalData, setProfessionalData] = useState<any>(null);

  // Listen for real-time profile updates
  useEffect(() => {
    if (!id) return;

    const handleProfileUpdated = (data: any) => {
      if (data && data.userId === id && data.user) {
        console.log('[LabourDetail] Real-time profile update received:', data.user);
        setProfessionalData(data.user);
        if (data.user.followersCount !== undefined) {
          setFollowersCountVal(data.user.followersCount);
        }
        
      }
    };

    const handleUserStatsUpdated = (data: any) => {
      if (data && data.userId === id) {
        console.log('[LabourDetail] Real-time stats update received:', data);
        if (data.followersCount !== undefined) {
          setFollowersCountVal(data.followersCount);
        }
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
    if (allWorkspaces && allWorkspaces.length > 0) {
      allWorkspaces.forEach((w: any) => {
        if (w._id) {
          SocketService.emit('join_room', { roomId: w._id });
        }
      });
    }
  }, [allWorkspaces]);

  const displayName = professionalData?.fullName || name;
  const displayAvatar = resolveAvatarUrl(professionalData?.avatarUrl || professionalData?.avatar, professionalData?.updatedAt) || avatar;
  const displayRating = professionalData?.rating?.toString() || rating;
  const displayReviews = professionalData?.reviews?.toString() || reviews;
  const displayLocation = professionalData?.city || location;
  const displayExperience = professionalData?.experience ? `${professionalData.experience} Years Experience` : cleanExperience;
  const isVerified = professionalData?.isVerified ?? true;



  // 1. Load current user profile session to check role
  useEffect(() => {
    const loadUser = async () => {
      let user = (global as any).currentUser;
      if (!user) {
        if (Platform.OS === 'web') {
          if (typeof localStorage !== 'undefined') {
            const stored = localStorage.getItem('currentUser');
            if (stored) {
              try {
                user = JSON.parse(stored);
              } catch (e) {
                console.error(e);
              }
            }
          }
        } else {
          try {
            const { getStoredUser } = require('../constants/Auth');
            const stored = await getStoredUser();
            if (stored) {
              user = JSON.parse(stored);
              (global as any).currentUser = user;
            }
          } catch (e) {
            console.error('[LabourDetail] Error restoring user session from SecureStore:', e);
          }
        }
      }
      if (user) {
        setCurrentUser(user);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser?._id && id) {
      // Fetch follow status
      fetch(`${BACKEND_URL}/api/follow/status/${id}?followerId=${currentUser._id}`)
        .then(res => res.json())
        .then(data => {
          setIsFollowing(!!data.isFollowing);
        })
        .catch(err => console.error("Error fetching follow status:", err));

      // Fetch live user info (followers count)
      fetch(`${BACKEND_URL}/api/professional/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.professional) {
            setProfessionalData(data.professional);
            setFollowersCountVal(data.professional.followersCount || 0);
            if (data.professional.specialization) {
              setSpecializations(data.professional.specialization);
            }
          }
        })
        .catch(err => console.error("Error fetching professional info:", err));
    }
  }, [currentUser, id]);

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
    setFollowersCountVal(prev => prev + 1);

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
      setFollowersCountVal(prev => Math.max(0, prev - 1));
      Alert.alert('Error', error.message || 'Could not follow user.');
    }
  };

  const executeUnfollow = async () => {
    setShowUnfollowModal(false);
    
    // Optimistic update
    setIsFollowing(false);
    setFollowersCountVal(prev => Math.max(0, prev - 1));

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
      setFollowersCountVal(prev => prev + 1);
      Alert.alert('Error', error.message || 'Could not unfollow user.');
    }
  };

  const getProjectDuration = (ws: any) => {
    const contractRequest = ws.contractRequest;
    if (!contractRequest || !contractRequest.startDate) {
      return 'Ongoing';
    }
    
    const start = new Date(contractRequest.startDate);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    let end = new Date(start);
    const timelineStr = contractRequest.timeline || '';
    
    // Parse timeline e.g. "3 months", "4 weeks", "60 days"
    const numberMatch = timelineStr.match(/\d+/);
    const number = numberMatch ? parseInt(numberMatch[0], 10) : 0;
    
    if (number > 0) {
      if (/month/i.test(timelineStr)) {
        end.setMonth(start.getMonth() + number);
      } else if (/week/i.test(timelineStr)) {
        end.setDate(start.getDate() + number * 7);
      } else if (/day/i.test(timelineStr)) {
        end.setDate(start.getDate() + number);
      } else if (/year/i.test(timelineStr)) {
        end.setFullYear(start.getFullYear() + number);
      } else {
        end.setMonth(start.getMonth() + 1); // fallback
      }
    } else {
      end.setMonth(start.getMonth() + 1); // fallback
    }
    
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} - ${endStr}`;
  };


  const fetchLabourWorkspaces = () => {
    if (!id) return;
    const reqId = currentUser?._id || '';
    const url = reqId 
      ? `${BACKEND_URL}/api/project-workspaces/user/${id}?requesterId=${reqId}`
      : `${BACKEND_URL}/api/project-workspaces/user/${id}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.workspaces) {
          setAllWorkspaces(data.workspaces);
        }
      })
      .catch(err => console.error("Error fetching labour workspaces:", err));
  };

  useEffect(() => {
    fetchLabourWorkspaces();
  }, [id, currentUser]);

  // isOwner: true if the logged-in user is the same labour whose profile is being viewed
  const isOwner = currentUser && currentUser._id === id;

  // Default tab initialization
  useEffect(() => {
    if (currentUser && !tabInitialized && allWorkspaces.length > 0) {
      if (!isOwner) {
        setActiveTab('projects');
      }
      setTabInitialized(true);
    }
  }, [currentUser, allWorkspaces, tabInitialized, isOwner]);

  const totalProjects = allWorkspaces.length;
  const completedProjects = allWorkspaces.filter(w => w.status === 'Completed').length;
  const ongoingProjects = allWorkspaces.filter(w => w.status !== 'Completed' && w.status !== 'Cancelled').length;

  let totalPaidAmount = 0;
  let totalAdvanceAmount = 0;
  allWorkspaces.forEach((w: any) => {
    w.labourManagement?.payments?.forEach((p: any) => {
      const labourIdStr = (p.labourId?._id || p.labourId)?.toString();
      if (labourIdStr === id?.toString()) {
        if (p.type === 'Advance') {
          totalAdvanceAmount += (p.amount || 0);
        } else {
          totalPaidAmount += (p.amount || 0);
        }
      }
    });
  });




  const handleMessage = () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to send messages.');
      return;
    }
    router.push({
      pathname: '/chat-room',
      params: {
        receiverId: id,
        name: name,
        role: role,
        avatar: avatar,
      }
    });
  };

  const handleHire = () => {
    Linking.openURL(`tel:+919876543210`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      
      {/* ================= TOP HEADER ================= */}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }} 
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Labour Profile</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Feather name="more-vertical" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Contractor Mode Info Banner */}
        {isContractor && (
          <View style={styles.infoBanner}>
            <Feather name="edit-3" size={14} color="#047857" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 10, color: '#065F46', fontWeight: '600' }}>
              Contractor Mode: Tapping today's date allows editing. Past dates are read-only.
            </Text>
          </View>
        )}

        {/* ================= PROFILE DETAILS CARD ================= */}
        <View style={styles.profileCard}>
          {/* Top Info Section */}
          <View style={styles.profileTopRow}>
            <View style={styles.profileAvatarWrapper}>
              <Image source={displayAvatar ? { uri: displayAvatar } : require('../assets/android-icon-foreground.png')} style={styles.avatarImage} contentFit={displayAvatar ? "cover" : "contain"} />
              {isVerified && (
                <View style={styles.verifiedBadge}>
                  <Feather name="check" size={10} color={COLORS.white} />
                </View>
              )}
            </View>

            <View style={styles.profileTextDetails}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                {isVerified && <Feather name="check-circle" size={14} color={COLORS.green} style={styles.verifiedCheckIcon} />}
              </View>
              
              <Text style={styles.profileRole}>{role}</Text>
              
              <View style={styles.ratingBadge}>
                <Feather name="star" size={11} color={COLORS.gold} style={{ fill: COLORS.gold }} />
                <Text style={styles.ratingText}>{displayRating} ({displayReviews} Reviews)</Text>
              </View>
            </View>
          </View>

          {/* Quick Metadata Badge Grid */}
          <View style={styles.metaBadgeRow}>
            <View style={styles.metaBadge}>
              <Feather name="map-pin" size={11} color={COLORS.teal} style={styles.metaBadgeIcon} />
              <Text style={styles.metaBadgeText}>{displayLocation}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Feather name="award" size={11} color={COLORS.teal} style={styles.metaBadgeIcon} />
              <Text style={styles.metaBadgeText}>{displayExperience}</Text>
            </View>
            {id && (
              <TouchableOpacity 
                style={styles.metaBadge}
                onPress={() => {
                  router.push({
                    pathname: '/followers-list',
                    params: { userId: id, type: 'followers', userName: displayName }
                  });
                }}
              >
                <Feather name="users" size={11} color={COLORS.teal} style={styles.metaBadgeIcon} />
                <Text style={styles.metaBadgeText}>{followersCountVal} Networks</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Project Statistics Row (Visible to everyone) */}
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-around', 
            borderTopWidth: 1, 
            borderTopColor: COLORS.border, 
            marginTop: 14, 
            paddingTop: 12,
            backgroundColor: '#F8FAFC',
            borderRadius: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: '#F1F5F9'
          }}>
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.textDark }}>{totalProjects}</Text>
              <Text style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>Total Projects</Text>
            </View>
            <View style={{ width: 1, backgroundColor: COLORS.border, height: '70%', alignSelf: 'center' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.green }}>{completedProjects}</Text>
              <Text style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>Completed</Text>
            </View>
            <View style={{ width: 1, backgroundColor: COLORS.border, height: '70%', alignSelf: 'center' }} />
            <View style={{ alignItems: 'center', flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.orange }}>{ongoingProjects}</Text>
              <Text style={{ fontSize: 9, color: COLORS.textMuted, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 }}>Ongoing</Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.profileActionsRow}>
            {id && currentUser && currentUser._id !== id && (
              <TouchableOpacity 
                style={[styles.primaryActionBtn, isFollowing && styles.followingActionBtn]} 
                onPress={handleFollowPress}
                activeOpacity={0.7}
              >
                <Feather name={isFollowing ? "check" : "user-plus"} size={13} color={isFollowing ? COLORS.textDark : COLORS.white} style={{ marginRight: 4 }} />
                <Text style={[styles.primaryActionBtnText, isFollowing && { color: COLORS.textDark }]}>
                  {isFollowing ? t('inNetwork') : t('addToNetwork')}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleHire} activeOpacity={0.7}>
              <Feather name="phone" size={13} color={COLORS.teal} style={{ marginRight: 4 }} />
              <Text style={styles.secondaryActionBtnText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.tertiaryActionBtn} onPress={handleMessage} activeOpacity={0.7}>
              <Feather name="message-square" size={13} color={COLORS.blue} style={{ marginRight: 4 }} />
              <Text style={styles.tertiaryActionBtnText}>{t('message')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= SPECIALIZATION SECTION ================= */}
        <View style={styles.specializationSection}>
          <Text style={styles.sectionHeaderTitle}>{t('specialization')}</Text>
          <View style={styles.specializationsWrap}>
            {(specializations && specializations.length > 0 ? specializations : [role]).map((spec, index) => (
              <View key={index} style={styles.specTag}>
                <Text style={styles.specTagText}>{spec}</Text>
              </View>
            ))}
          </View>
        </View>


        {/* ================= SUMMARY STATS (4 Cards) ================= */}
        {isOwner && (
          <View style={styles.statsContainer}>
            <View style={[styles.statBox, styles.statBoxWork]}>
              <Feather name="briefcase" size={14} color="#059669" style={{ marginBottom: 4 }} />
              <Text style={styles.statLabel}>{t('totalProjects') || 'Projects'}</Text>
              <Text style={[styles.statValue, { color: '#059669' }]}>{totalProjects}</Text>
              <Text style={styles.statSubText}>({ongoingProjects} {t('ongoing') || 'Ongoing'})</Text>
            </View>

            <View style={[styles.statBox, styles.statBoxPayment]}>
              <MaterialCommunityIcons name="currency-inr" size={15} color="#2563EB" style={{ marginBottom: 3 }} />
              <Text style={styles.statLabel}>{t('totalPayment') || 'Total Paid'}</Text>
              <Text style={[styles.statValue, { color: '#2563EB' }]}>₹{totalPaidAmount.toLocaleString()}</Text>
              <Text style={styles.statSubText}>({t('allTime') || 'All Time'})</Text>
            </View>

            <View style={[styles.statBox, styles.statBoxAdvance]}>
              <Feather name="folder-minus" size={14} color="#D97706" style={{ marginBottom: 4 }} />
              <Text style={styles.statLabel}>{t('advanceGiven') || 'Advance'}</Text>
              <Text style={[styles.statValue, { color: '#D97706' }]}>₹{totalAdvanceAmount.toLocaleString()}</Text>
              <Text style={styles.statSubText}>({t('allTime') || 'All Time'})</Text>
            </View>

            <View style={[styles.statBox, styles.statBoxPending]}>
              <Feather name="check-circle" size={14} color="#10B981" style={{ marginBottom: 4 }} />
              <Text style={styles.statLabel}>{t('completed') || 'Completed'}</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>{completedProjects}</Text>
              <Text style={styles.statSubText}>({t('projects') || 'Projects'})</Text>
            </View>
          </View>
        )}

        {/* ================= SUB TABS ================= */}
        <View style={styles.tabsContainer}>

          {/* Payments tab only visible to the labour (owner) */}
          {isOwner && (
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'payments' && styles.tabButtonActive]} 
              onPress={() => setActiveTab('payments')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabButtonText, activeTab === 'payments' && styles.tabButtonTextActive]}>
                {t('payments') || 'Payments'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'projects' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('projects')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === 'projects' && styles.tabButtonTextActive]}>
              {t('projects') || 'Projects'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'documents' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('documents')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === 'documents' && styles.tabButtonTextActive]}>
              {t('documents') || 'Documents'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= TAB 1: PAYMENTS CONTENT ================= */}
        {isOwner && activeTab === 'payments' && (
          <View style={styles.paymentsTabContent}>
            {[
              { id: '1', date: '30 May 2024', type: 'Salary Payout', amount: '₹11,000', status: 'Paid', method: 'Bank Transfer' },
              { id: '2', date: '15 May 2024', type: 'Mid-Month Advance', amount: '₹1,000', status: 'Paid', method: 'Cash' },
              { id: '3', date: '04 May 2024', type: 'Emergency Advance', amount: '₹1,000', status: 'Paid', method: 'UPI' }
            ].map((pay) => (
              <View key={pay.id} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View>
                    <Text style={styles.paymentType}>{pay.type}</Text>
                    <Text style={styles.paymentDate}>{pay.date} • {pay.method}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>{pay.amount}</Text>
                </View>
                <View style={styles.paymentDivider} />
                <View style={styles.paymentFooter}>
                  <View style={styles.paidBadge}>
                    <Feather name="check" size={10} color={COLORS.green} />
                    <Text style={styles.paidBadgeText}>{pay.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ================= TAB 2B: PROJECTS / MY WORK CONTENT ================= */}
        {activeTab === 'projects' && (
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
                let allJobs = allWorkspaces.filter((w: any) => w.projectType !== 'Team').length > 0
                  ? allWorkspaces.filter((w: any) => w.projectType !== 'Team').map((w: any, idx: number) => ({
                      id: w._id || `lj-${idx}`,
                      title: w.title || 'General Construction',
                      location: w.contractRequest?.location || 'Mumbai, Maharashtra',
                      date: w.contractRequest?.timeline && w.contractRequest.timeline.includes('202') ? w.contractRequest.timeline : `${12 + idx * 3} Sep 2026`,
                      status: w.status === 'Completed' ? 'Completed' : (idx === 0 ? 'In Progress' : idx === 1 ? 'Accepted' : 'Pending'),
                      image: (idx === 0
                        ? 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'
                        : idx === 1
                          ? 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80'
                          : idx === 2
                            ? 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80'
                            : 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80'),
                      workspaceId: w._id
                    }))
                  : DEFAULT_LABOUR_JOBS;

                let filteredJobs = allJobs.filter((job: any) =>
                  labourWorkSubTab === 'Active'
                    ? job.status !== 'Completed' && job.status !== 'Cancelled'
                    : job.status === 'Completed'
                );

                if (labourWorkSubTab === 'Completed' && filteredJobs.length === 0 && allWorkspaces.filter((w: any) => w.projectType !== 'Team').length === 0) {
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
                    badgeBg = '#DCFCE7';
                    badgeColor = '#16A34A';
                  } else if (job.status === 'Accepted') {
                    badgeBg = '#DBEAFE';
                    badgeColor = '#2563EB';
                  } else if (job.status === 'Completed') {
                    badgeBg = '#DCFCE7';
                    badgeColor = '#16A34A';
                  }

                  return (
                    <TouchableOpacity
                      key={job.id}
                      style={styles.labourJobCard}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (job.workspaceId && isOwner) {
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
        )}

        {/* ================= TAB 3: DOCUMENTS CONTENT ================= */}
        {activeTab === 'documents' && (
          <View style={styles.documentsTabContent}>
            {/* Read Only badge for non-owners */}
             {!isOwner && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
                <Feather name="lock" size={14} color="#D97706" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E' }}>Read Only</Text>
                <Text style={{ fontSize: 11, color: '#B45309', marginLeft: 6 }}>You can only read the document list (downloads disabled).</Text>
              </View>
            )}
            {[
              { name: 'Identity Proof (Aadhaar Card)', type: 'PDF • 1.4 MB', date: 'Uploaded on 12 Mar 2024' },
              { name: 'Labor Services Agreement Contract', type: 'PDF • 2.1 MB', date: 'Uploaded on 15 Mar 2024' },
              { name: 'Bank Details & Account Passbook', type: 'PDF • 950 KB', date: 'Uploaded on 18 Mar 2024' },
            ].map((doc, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.documentCard} 
                activeOpacity={isOwner ? 0.7 : 1.0}
                disabled={!isOwner}
                onPress={() => {
                  if (isOwner) {
                    Alert.alert('Opening Document', `Opening ${doc.name}...`);
                  }
                }}
              >
                <View style={styles.docIconBox}>
                  <FontAwesome5 name="file-pdf" size={20} color="#EF4444" />
                </View>
                <View style={styles.docDetails}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docMeta}>{doc.type} • {doc.date}</Text>
                </View>
                {/* Actions: only visible to owner */}
                {isOwner && (
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={styles.docDownloadBtn} onPress={() => Alert.alert('Downloading', `Downloading ${doc.name}...`)}>
                      <Feather name="download" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.docDownloadBtn, { marginLeft: 4 }]} onPress={() => Alert.alert('Delete', `Are you sure you want to delete ${doc.name}?`)}>
                      <Feather name="trash-2" size={16} color={COLORS.red} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {/* Upload button: visible to owner only */}
            {isOwner && (
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.green, borderStyle: 'dashed', marginTop: 12, backgroundColor: COLORS.greenLight }}
                activeOpacity={0.7}
              >
                <Feather name="upload" size={16} color={COLORS.green} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.green }}>Upload Document</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bgLight 
  },
  scrollContent: { 
    paddingBottom: 40 
  },

  /* HEADER */
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  moreButton: { padding: 4 },

  /* INFO BANNER */
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DEF7EC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BCEFCE',
  },
  infoBannerText: {
    fontSize: 11,
    color: '#03543F',
    fontWeight: '600',
    flex: 1,
  },

  /* PROFILE DETAILS CARD */
  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatarWrapper: {
    position: 'relative',
  },
  avatarImage: { 
    width: 72, 
    height: 72, 
    borderRadius: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  profileTextDetails: { 
    flex: 1, 
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  profileName: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: COLORS.textDark,
  },
  verifiedCheckIcon: {
    marginTop: 1,
  },
  profileRole: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  ratingBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  ratingText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: '#D97706',
  },
  metaBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 14,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
  },
  metaBadgeIcon: {
    color: COLORS.teal,
  },
  metaBadgeText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    width: '100%',
  },
  primaryActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 20,
    height: 38,
  },
  followingActionBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  primaryActionBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 20,
    height: 38,
  },
  secondaryActionBtnText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  tertiaryActionBtn: {
    flex: 0.9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 20,
    height: 38,
  },
  tertiaryActionBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },

  /* SUMMARY STATS ROW */
  statsContainer: { 
    flexDirection: 'row', 
    marginHorizontal: 16, 
    marginTop: 16, 
    gap: 8 
  },
  statBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    borderLeftWidth: 3,
  },
  statBoxWork: {
    borderLeftColor: '#10B981',
  },
  statBoxPayment: {
    borderLeftColor: '#3B82F6',
  },
  statBoxAdvance: {
    borderLeftColor: '#F59E0B',
  },
  statBoxPending: {
    borderLeftColor: '#EF4444',
  },
  statLabel: { 
    fontSize: 9, 
    color: COLORS.textMuted, 
    fontWeight: '700',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: { 
    fontSize: 12, 
    fontWeight: '800', 
    marginVertical: 4,
    textAlign: 'center',
  },
  statSubText: { 
    fontSize: 8, 
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  /* TABS BAR */
  tabsContainer: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border, 
    backgroundColor: COLORS.white,
    marginTop: 20,
  },
  tabButton: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center', 
    borderBottomWidth: 2, 
    borderBottomColor: 'transparent' 
  },
  tabButtonActive: { 
    borderBottomColor: COLORS.green 
  },
  tabButtonText: { 
    fontSize: 12, 
    fontWeight: '600', 
    color: COLORS.textMuted 
  },
  tabButtonTextActive: { 
    color: COLORS.green, 
    fontWeight: '800' 
  },

  /* TAB CONTENT */
  tabContent: {
    paddingTop: 16,
  },

  /* CALENDAR CARD */
  calendarCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    padding: 12,
  },
  calendarLeft: {
    flex: 1.8,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  arrowControls: {
    flexDirection: 'row',
    gap: 8,
  },
  arrowBtn: {
    padding: 2,
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
    borderRadius: 8,
  },
  dayCellEditable: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: COLORS.blue,
    borderRadius: 8,
  },
  dayCellLocked: {
    backgroundColor: '#F8FAFC',
    borderWidth: 0.5,
    borderColor: '#F1F5F9',
  },
  dayCellFuture: {
    backgroundColor: COLORS.white,
    opacity: 0.4,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  dayTextPrevNext: {
    color: '#CBD5E1',
  },
  todayText: {
    color: COLORS.green,
    fontWeight: '800',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
  },
  dotPresent: {
    backgroundColor: '#059669',
  },
  dotHalf: {
    backgroundColor: COLORS.orange,
  },
  dotOvertime: {
    backgroundColor: COLORS.blue,
  },
  dotAbsent: {
    backgroundColor: COLORS.red,
  },
  legendRow: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'flex-start',
    gap: 16,
    paddingLeft: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  /* SUMMARY SIDEBAR */
  summarySidebar: {
    width: 115,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sidebarSectionTitle: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
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
  sidebarDivider: {
    height: 1,
    backgroundColor: '#DCFCE7',
    width: '100%',
    marginVertical: 6,
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
    marginTop: 2,
  },
  percentageLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },

  /* RECENT ACTIVITY TIMELINE */
  activityCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    padding: 14,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  viewAllBtnText: {
    fontSize: 11,
    color: COLORS.teal,
    fontWeight: '700',
  },
  timelineWrapper: {
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 17,
    top: 20,
    bottom: 20,
    width: 1.5,
    backgroundColor: '#E2E8F0',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingLeft: 36,
    position: 'relative',
  },
  timelineNode: {
    position: 'absolute',
    left: 8,
    top: 10,
    width: 20,
    height: 20,
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  nodePresent: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  nodeHalf: {
    borderColor: COLORS.orange,
    backgroundColor: '#FFFBEB',
  },
  nodeOvertime: {
    borderColor: COLORS.blue,
    backgroundColor: '#EFF6FF',
  },
  nodeAbsent: {
    borderColor: COLORS.red,
    backgroundColor: '#FEF2F2',
  },
  timelineContentCard: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineMainInfo: {
    flex: 1.5,
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  timelineHours: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginTop: 3,
  },
  badgePresent: {
    backgroundColor: '#ECFDF5',
  },
  badgeHalf: {
    backgroundColor: '#FFFBEB',
  },
  badgeOvertime: {
    backgroundColor: '#EFF6FF',
  },
  badgeAbsent: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  timelineRightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  advanceLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  advanceValue: {
    fontSize: 11,
    color: COLORS.red,
    fontWeight: '700',
  },
  noAdvanceText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  /* PAYMENTS */
  paymentsTabContent: { 
    paddingHorizontal: 16, 
    gap: 12, 
    marginTop: 16 
  },
  paymentCard: { 
    padding: 14, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 10, 
    backgroundColor: COLORS.white 
  },
  paymentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  paymentType: { 
    fontSize: 12, 
    fontWeight: '700', 
    color: COLORS.textDark 
  },
  paymentDate: { 
    fontSize: 10, 
    color: COLORS.textMuted, 
    marginTop: 2 
  },
  paymentAmount: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: COLORS.textDark 
  },
  paymentDivider: { 
    height: 0.5, 
    backgroundColor: COLORS.border, 
    marginVertical: 10 
  },
  paymentFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  paidBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#ECFDF5', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 10, 
    gap: 4 
  },
  paidBadgeText: { 
    fontSize: 9, 
    color: '#059669', 
    fontWeight: '700' 
  },

  /* PROJECTS TAB */
  projectsListCol: { 
    paddingHorizontal: 16, 
    gap: 12, 
    marginTop: 16 
  },
  projectListItem: { 
    flexDirection: 'row', 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: 10, 
    padding: 10, 
    alignItems: 'center', 
    backgroundColor: COLORS.white 
  },
  projectListImg: { 
    width: 70, 
    height: 70, 
    borderRadius: 6 
  },
  projectListDetails: { 
    flex: 1, 
    marginLeft: 12 
  },
  projectListName: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: COLORS.textDark 
  },
  projectListLoc: { 
    fontSize: 12, 
    color: COLORS.textMuted, 
    marginTop: 2 
  },
  statusBadge: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: COLORS.bgLight,
    marginTop: 6
  },
  statusDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3 
  },
  statusCompleted: { 
    backgroundColor: COLORS.greenLight 
  },
  statusProgress: { 
    backgroundColor: '#FFEDD5' 
  },
  statusCancelled: { 
    backgroundColor: '#FEF2F2' 
  },
  statusBadgeText: { 
    fontSize: 10, 
    fontWeight: '700' 
  },

  /* DOCUMENTS */
  documentsTabContent: {
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 16,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
  },
  docIconBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docDetails: {
    flex: 1,
  },
  docName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  docMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  docDownloadBtn: {
    padding: 6,
  },

  /* MODAL OVERLAY */
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // sleek dark overlay
  },
  modalCard: {
    width: width * 0.9,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
  },
  statusSelectText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formCol: {
    flex: 1,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    justifyContent: 'center',
    backgroundColor: COLORS.bgLight,
  },
  textInput: {
    fontSize: 13,
    color: COLORS.textDark,
    padding: 0,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  cancelBtnText: {
    fontSize: 13,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: COLORS.teal,
  },
  saveBtnText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '700',
  },
  
  followersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  followersText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  followBtn: {
    width: '100%',
    height: 32,
    backgroundColor: '#1BC47D',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  followingBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  followBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
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
  specializationSection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  specializationsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  specDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal,
  },
  specTagText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '600',
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

  // ===== LABOUR MY WORK STYLES =====
  labourWorkSection: {
    marginTop: 4,
    paddingHorizontal: 16,
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
});
