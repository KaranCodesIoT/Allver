import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, TextInput, Alert, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';
import { useTranslation } from '../utils/i18n';

import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

const PROJECT_TYPE_IMAGES: Record<string, string> = {
  'Residential': 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80',
  'Commercial': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=300&q=80',
  'Interior': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80',
  'Renovation': 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=300&q=80',
  'General': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80',
};

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

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  status?: 'Present' | 'Half Day' | 'Absent' | 'Overtime';
  hours?: number;
  advance?: number;
  remarks?: string;
  latitude?: number;
  longitude?: number;
}




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

  const [activeTab, setActiveTab] = useState<'attendance' | 'payments' | 'documents'>('attendance');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allWorkspaces, setAllWorkspaces] = useState<any[]>([]);
  
  // States for Follow/Unfollow
  const [followersCountVal, setFollowersCountVal] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);

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

  // States for editable attendance
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isReadOnlyModal, setIsReadOnlyModal] = useState(false);

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  const handleOpenMonthPicker = () => {
    setPickerYear(currentYear);
    setShowMonthPicker(true);
  };

  const handlePrevPickerYear = () => {
    setPickerYear(prev => prev - 1);
  };

  const handleNextPickerYear = () => {
    setPickerYear(prev => prev + 1);
  };

  const handleSelectMonth = (monthIdx: number) => {
    setCurrentMonth(monthIdx);
    setCurrentYear(pickerYear);
    setShowMonthPicker(false);
  };

  const getMonthName = (monthIdx: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthIdx];
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const generateCalendar = (year: number, month: number) => {
    const todayDate = new Date();
    const isThisMonth = todayDate.getFullYear() === year && todayDate.getMonth() === month;
    const today = todayDate.getDate();

    const totalDays = new Date(year, month + 1, 0).getDate();
    let firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun, 1 is Mon
    const paddingDays = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const prevMonthDays = new Date(year, month, 0).getDate();
    const daysList: CalendarDay[] = [];

    // Prev month padding
    for (let i = paddingDays - 1; i >= 0; i--) {
      daysList.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dayOfWeek = d.getDay();
      let status: 'Present' | 'Half Day' | 'Absent' | 'Overtime' | undefined = undefined;
      let hours = undefined;

      const compToday = new Date();
      compToday.setHours(0, 0, 0, 0);
      const cellDate = new Date(year, month, i);
      cellDate.setHours(0, 0, 0, 0);

      const isPast = cellDate < compToday;
      const isToday = cellDate.getTime() === compToday.getTime();

      // Past and today days start with no status — only real marked attendance is shown
      // (status and hours remain undefined until explicitly set by contractor/labour)

      daysList.push({
        day: i,
        isCurrentMonth: true,
        status,
        hours,
        advance: 0,
        remarks: '-'
      });
    }

    // Next month padding
    const totalCells = daysList.length > 35 ? 42 : 35;
    const nextMonthPadding = totalCells - daysList.length;
    for (let i = 1; i <= nextMonthPadding; i++) {
      daysList.push({ day: i, isCurrentMonth: false });
    }

    return daysList;
  };
  
  // Form edit states
  const [editStatus, setEditStatus] = useState<'Present' | 'Half Day' | 'Absent' | 'Overtime'>('Present');
  const [editHours, setEditHours] = useState('8.0');
  const [editAdvance, setEditAdvance] = useState('0');
  const [editRemarks, setEditRemarks] = useState('');

  // 1. Load current user profile session to check role
  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        user = JSON.parse(stored);
      }
    }
    if (user) {
      setCurrentUser(user);
    }
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

  // Purge ALL legacy attendance cache keys on mount and whenever month/year changes
  // This ensures new users never see stale mock data
  useEffect(() => {
    // Clear any old-format keys from localStorage
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('attendance_') || k.startsWith('att_v2_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    }

    // Clear any old-format keys from global memory
    const globalObj = global as any;
    Object.keys(globalObj).forEach(k => {
      if (k.startsWith('attendance_') || k.startsWith('att_v2_')) {
        delete globalObj[k];
      }
    });

    // Generate base calendar and merge with backend workspace attendance
    const initialDays = generateCalendar(currentYear, currentMonth);
    const populated = mergeAttendanceData(initialDays, allWorkspaces, currentYear, currentMonth, id);
    setDays(populated);
  }, [name, currentYear, currentMonth, allWorkspaces, id]);

  const fetchLabourWorkspaces = () => {
    if (!id) return;
    fetch(`${BACKEND_URL}/api/project-workspaces/user/${id}`)
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
  }, [id]);

  const formatDateString = (year: number, month: number, day: number) => {
    const m = month + 1;
    const d = day;
    return `${year}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`;
  };

  const mergeAttendanceData = (
    calendarDays: CalendarDay[], 
    workspacesList: any[], 
    year: number, 
    month: number, 
    userId: string
  ) => {
    return calendarDays.map(d => {
      if (!d.isCurrentMonth) return d;
      
      const dateStr = formatDateString(year, month, d.day);
      let foundStatus: any;
      let foundHours: number | undefined;
      let foundLatitude: number | undefined;
      let foundLongitude: number | undefined;
      let foundAdvance = 0;
      let foundRemarks = '-';

      workspacesList.forEach((w: any) => {
        const attRecord = w.labourManagement?.attendance?.find((a: any) => a.date === dateStr);
        if (attRecord) {
          const matchingRecord = attRecord.records?.find(
            (r: any) => (r.labourId?._id || r.labourId)?.toString() === userId.toString()
          );
          if (matchingRecord) {
            foundStatus = matchingRecord.status;
            foundHours = matchingRecord.hours;
            foundLatitude = matchingRecord.latitude;
            foundLongitude = matchingRecord.longitude;
          }
        }

        w.labourManagement?.payments?.forEach((p: any) => {
          const pDate = new Date(p.date);
          const pYear = pDate.getFullYear();
          const pMonth = pDate.getMonth();
          const pDay = pDate.getDate();
          if (pYear === year && pMonth === month && pDay === d.day && (p.labourId?._id || p.labourId)?.toString() === userId.toString()) {
            if (p.type === 'Advance') {
              foundAdvance += p.amount || 0;
            }
          }
        });
      });

      return {
        ...d,
        status: foundStatus || d.status,
        hours: foundHours !== undefined ? foundHours : d.hours,
        advance: foundAdvance || d.advance,
        remarks: foundRemarks,
        latitude: foundLatitude,
        longitude: foundLongitude
      };
    });
  };

  // Determine if editing is enabled (Only Contractor role can edit/mark attendance, labourers cannot)
  const isContractor = currentUser && currentUser.role === 'Contractor';
  const isLabour = currentUser && currentUser.role === 'Labour' && currentUser._id === id;
  const canEdit = isContractor;

  // Calculate stats dynamically
  const presentCount = days.filter(d => d.isCurrentMonth && d.status === 'Present').length;
  const halfCount = days.filter(d => d.isCurrentMonth && d.status === 'Half Day').length;
  const absentCount = days.filter(d => d.isCurrentMonth && d.status === 'Absent').length;
  const overtimeCount = days.filter(d => d.isCurrentMonth && d.status === 'Overtime').length;
  
  const totalWeight = presentCount + (halfCount * 0.5) + (overtimeCount * 1.5);
  const activeDaysCount = presentCount + halfCount + absentCount + overtimeCount;
  const attendancePercentage = activeDaysCount > 0 ? Math.round((totalWeight / activeDaysCount) * 100) : 100;
  const attendanceStatusLabel = attendancePercentage >= 90 ? 'Good' : (attendancePercentage >= 75 ? 'Average' : 'Low');
  
  const totalEarnings = presentCount * 400 + halfCount * 200 + overtimeCount * 600;

  // Load selected day into editing form states
  const handleDayPress = (dayObj: CalendarDay) => {
    if (!dayObj.isCurrentMonth) return;

    const todayDate = new Date();
    const isToday = todayDate.getFullYear() === currentYear && 
                    todayDate.getMonth() === currentMonth && 
                    dayObj.day === todayDate.getDate();

    // Past dates or non-contractor/non-labour views will be read-only
    setIsReadOnlyModal(!isToday || !canEdit);
    
    setSelectedDay(dayObj);
    setEditStatus(dayObj.status || 'Present');
    setEditHours(dayObj.hours?.toString() || '0.0');
    setEditAdvance(dayObj.advance?.toString() || '0');
    setEditRemarks(dayObj.remarks || '');
  };

  const saveAttendance = async () => {
    if (!selectedDay) return;

    if (!isContractor) {
      Alert.alert('Forbidden', 'Only the assigned contractor can mark or edit attendance.');
      return;
    }

    // Ensure selected date is today
    const todayDate = new Date();
    const isToday = todayDate.getFullYear() === currentYear && 
                    todayDate.getMonth() === currentMonth && 
                    selectedDay.day === todayDate.getDate();

    if (!isToday) {
      Alert.alert('Error', 'Only today\'s attendance can be edited.');
      return;
    }

    const parsedHours = parseFloat(editHours);
    const parsedAdvance = parseInt(editAdvance, 10);

    if (isNaN(parsedHours) || parsedHours < 0 || parsedHours > 24) {
      Alert.alert('Invalid Hours', 'Please enter a valid hours count between 0 and 24.');
      return;
    }

    if (isNaN(parsedAdvance) || parsedAdvance < 0) {
      Alert.alert('Invalid Advance', 'Please enter a valid advance amount.');
      return;
    }

    // Resolve target workspace ID
    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId && allWorkspaces.length > 0) {
      const contractorWs = allWorkspaces.find(
        (w: any) => (w.contractor?._id || w.contractor)?.toString() === currentUser?._id?.toString() || 
                    (w.professional?._id || w.professional)?.toString() === currentUser?._id?.toString()
      );
      if (contractorWs) {
        targetWorkspaceId = contractorWs._id;
      } else {
        targetWorkspaceId = allWorkspaces[0]._id;
      }
    }

    if (!targetWorkspaceId) {
      Alert.alert('Error', 'No active project workspace found to save attendance.');
      return;
    }

    const dateStr = formatDateString(currentYear, currentMonth, selectedDay.day);

    // Save Attendance to Backend
    try {
      const attRes = await fetch(`${BACKEND_URL}/api/project-workspaces/${targetWorkspaceId}/labour/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          records: [{
            labourId: id,
            status: editStatus,
            hours: parsedHours,
            latitude: selectedDay.latitude,
            longitude: selectedDay.longitude
          }],
          senderId: currentUser._id
        })
      });

      if (!attRes.ok) {
        const errData = await attRes.json();
        Alert.alert('Error', errData.message || 'Failed to save attendance.');
        return;
      }

      // If advance is specified, save Payment to Backend
      if (parsedAdvance > 0) {
        const payRes = await fetch(`${BACKEND_URL}/api/project-workspaces/${targetWorkspaceId}/labour/payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            labourId: id,
            amount: parsedAdvance,
            type: 'Advance',
            senderId: currentUser._id
          })
        });

        if (!payRes.ok) {
          console.warn('Failed to record advance payment on backend.');
        }
      }

      // Reload workspaces to update UI with latest from DB
      fetchLabourWorkspaces();
      Alert.alert('Success', 'Attendance recorded successfully.');

    } catch (err) {
      console.error('Error saving attendance:', err);
      Alert.alert('Error', 'Failed to save attendance due to a network error.');
      return;
    }

    setSelectedDay(null);
  };

  const handleLabourCheckIn = async () => {
    if (!selectedDay) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for GPS check-in.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      let targetWorkspaceId = workspaceId;
      if (!targetWorkspaceId && allWorkspaces.length > 0) {
        targetWorkspaceId = allWorkspaces[0]._id;
      }

      if (!targetWorkspaceId) {
        Alert.alert('Error', 'No active project workspace found to check in.');
        return;
      }

      const dateStr = formatDateString(currentYear, currentMonth, selectedDay.day);

      const response = await fetch(`${BACKEND_URL}/api/project-workspaces/${targetWorkspaceId}/labour/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          records: [{
            labourId: id,
            status: selectedDay.status || 'Present',
            hours: selectedDay.hours || 0,
            latitude: lat,
            longitude: lng
          }],
          senderId: currentUser._id
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        Alert.alert('Error', errData.message || 'Failed to check in.');
        return;
      }

      fetchLabourWorkspaces();
      Alert.alert('Success', 'Checked in successfully! GPS location stamped.');
      setSelectedDay(null);

    } catch (err) {
      console.error('Error during labour check-in:', err);
      Alert.alert('Error', 'Failed to check in due to a network or GPS error.');
    }
  };

  // Build Recent Activity dynamically from all workspaces (all months)
  const getRecentActivity = () => {
    const activities: any[] = [];

    allWorkspaces.forEach((w: any) => {
      // 1. Gather Attendance Records
      if (w.labourManagement?.attendance) {
        w.labourManagement.attendance.forEach((att: any) => {
          const match = att.records?.find(
            (r: any) => (r.labourId?._id || r.labourId)?.toString() === id.toString()
          );
          if (match && match.status) {
            activities.push({
              dateRaw: new Date(att.date),
              hours: `${match.hours?.toFixed(1) || '0.0'} Hours`,
              status: match.status,
              advance: 0,
              rawDay: {
                day: new Date(att.date).getDate(),
                isCurrentMonth: new Date(att.date).getMonth() === currentMonth && new Date(att.date).getFullYear() === currentYear,
                status: match.status,
                hours: match.hours,
                advance: 0,
                remarks: match.remarks || '-'
              }
            });
          }
        });
      }

      // 2. Gather Payments/Advances
      if (w.labourManagement?.payments) {
        w.labourManagement.payments.forEach((p: any) => {
          if ((p.labourId?._id || p.labourId)?.toString() === id.toString()) {
            const pDate = new Date(p.date);
            activities.push({
              dateRaw: pDate,
              hours: p.type === 'Advance' ? `Advance: ₹${p.amount}` : `Paid: ₹${p.amount}`,
              status: p.type === 'Advance' ? 'Half Day' : 'Present', // Use visual status icons as mapping
              advance: p.amount || 0,
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
        rawDay: act.rawDay
      };
    });
  };

  const handleMessage = () => {
    Linking.openURL(`sms:+919876543210?body=Hello ${name}, I saw your labour profile under ${contractorName} on Allver and wanted to contact you.`);
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
          <View style={styles.profileAvatarWrapper}>
            <Image source={avatar ? { uri: avatar } : require('../assets/android-icon-foreground.png')} style={styles.avatarImage} contentFit={avatar ? "cover" : "contain"} />
            <View style={styles.verifiedBadge}>
              <Feather name="check" size={10} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.profileTextDetails}>
            <Text style={styles.profileName}>{name}</Text>
            
            <View style={styles.ratingRow}>
              <Feather name="star" size={12} color={COLORS.gold} style={{ fill: COLORS.gold }} />
              <Text style={styles.ratingText}>{rating} ({reviews} Reviews)</Text>
            </View>

            <View style={styles.metaRow}>
              <Feather name="briefcase" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
              <Text style={styles.metaText}>{role}</Text>
            </View>

            <View style={styles.metaRow}>
              <Feather name="map-pin" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
              <Text style={styles.metaText}>{location}</Text>
            </View>

            <View style={styles.metaRow}>
              <Feather name="award" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
              <Text style={styles.metaText}>{experience}</Text>
            </View>
            
            {id && (
              <TouchableOpacity 
                style={styles.followersContainer}
                onPress={() => {
                  router.push({
                    pathname: '/followers-list',
                    params: { userId: id, type: 'followers', userName: name }
                  });
                }}
              >
                <Feather name="users" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
                <Text style={styles.followersText}>{followersCountVal} Networks</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActionsColumn}>
            {id && currentUser && currentUser._id !== id && (
              <TouchableOpacity 
                style={[styles.followBtn, isFollowing && styles.followingBtn]} 
                onPress={handleFollowPress}
                activeOpacity={0.7}
              >
                <Feather name={isFollowing ? "check" : "user-plus"} size={12} color={isFollowing ? COLORS.textDark : COLORS.white} style={{ marginRight: 4 }} />
                <Text style={[styles.followBtnText, isFollowing && { color: COLORS.textDark }]}>
                  {isFollowing ? t('inNetwork') : t('addToNetwork')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.messageBtn} onPress={handleMessage} activeOpacity={0.7}>
              <Feather name="message-square" size={13} color={COLORS.teal} style={{ marginRight: 6 }} />
              <Text style={styles.messageBtnText}>{t('message')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= SPECIALIZATION SECTION ================= */}
        <View style={styles.specializationSection}>
          <Text style={styles.sectionHeaderTitle}>{t('specialization')}</Text>
          <View style={styles.specializationsWrap}>
            {(specializations && specializations.length > 0 ? specializations : [role]).map((spec, index) => (
              <View key={index} style={styles.specTag}>
                <View style={styles.specDot} />
                <Text style={styles.specTagText}>{spec}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ================= PORTFOLIO HIGHLIGHTS ================= */}
        {portfolioProjects.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textDark }}>{t('portfolioHighlights')}</Text>
              <TouchableOpacity onPress={() => router.push({ pathname: '/portfolio-highlights', params: { userId: id } })}>
                <Text style={{ fontSize: 13, color: COLORS.orange, fontWeight: '700' }}>{t('viewAll')} ›</Text>
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

        {/* ================= SUMMARY STATS (4 Cards) ================= */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Feather name="calendar" size={14} color={COLORS.textMuted} style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>{t('totalDaysWorked')}</Text>
            <Text style={styles.statValue}>{activeDaysCount} {t('days') || 'Days'}</Text>
            <Text style={styles.statSubText}>({t('thisMonth')})</Text>
          </View>

          <View style={styles.statBox}>
            <MaterialCommunityIcons name="currency-inr" size={15} color={COLORS.textMuted} style={{ marginBottom: 3 }} />
            <Text style={styles.statLabel}>{t('totalPayment')}</Text>
            <Text style={styles.statValue}>₹ {totalEarnings.toLocaleString()}</Text>
            <Text style={styles.statSubText}>({t('thisMonth')})</Text>
          </View>

          <View style={styles.statBox}>
            <Feather name="folder-minus" size={14} color={COLORS.textMuted} style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>{t('advanceGiven')}</Text>
            <Text style={styles.statValue}>₹ {days.reduce((acc, d) => acc + (d.advance || 0), 0).toLocaleString()}</Text>
            <Text style={styles.statSubText}>({t('thisMonth')})</Text>
          </View>

          <View style={styles.statBox}>
            <Feather name="file-text" size={14} color={COLORS.textMuted} style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>{t('pendingPayment')}</Text>
            <Text style={styles.statValue}>₹ {(totalEarnings - days.reduce((acc, d) => acc + (d.advance || 0), 0)).toLocaleString()}</Text>
            <Text style={styles.statSubText}>({t('thisMonth')})</Text>
          </View>
        </View>

        {/* ================= SUB TABS ================= */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'attendance' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('attendance')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === 'attendance' && styles.tabButtonTextActive]}>
              {t('attendance')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'payments' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('payments')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === 'payments' && styles.tabButtonTextActive]}>
              {t('payments')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'documents' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('documents')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === 'documents' && styles.tabButtonTextActive]}>
              {t('documents')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================= TAB 1: ATTENDANCE CONTENT ================= */}
        {activeTab === 'attendance' && (
          <View style={styles.tabContent}>
            
            {/* Calendar & Summary Card Wrapper */}
            <View style={styles.calendarCard}>
              
              {/* Calendar Left Section */}
              <View style={styles.calendarLeft}>
                {/* Header Month Selector */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity style={styles.monthSelector} onPress={handleOpenMonthPicker} activeOpacity={0.7}>
                    <Feather name="calendar" size={16} color={COLORS.textDark} style={{ marginRight: 6 }} />
                    <Text style={styles.monthText}>{`${getMonthName(currentMonth)} ${currentYear}`}</Text>
                    <Feather name="chevron-down" size={14} color={COLORS.textDark} style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                  <View style={styles.arrowControls}>
                    <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevMonth}>
                      <Feather name="chevron-left" size={16} color={COLORS.textDark} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.arrowBtn} onPress={handleNextMonth}>
                      <Feather name="chevron-right" size={16} color={COLORS.textDark} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Days of Week Row */}
                <View style={styles.weekdaysRow}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => (
                    <Text key={w} style={styles.weekdayText}>{w}</Text>
                  ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                  {days.map((d, idx) => {
                    const todayDate = new Date();
                    const isToday = todayDate.getFullYear() === currentYear && 
                                    todayDate.getMonth() === currentMonth && 
                                    d.day === todayDate.getDate() && 
                                    d.isCurrentMonth;
                    
                    const cellDate = new Date(currentYear, currentMonth, d.day);
                    cellDate.setHours(0, 0, 0, 0);
                    const compToday = new Date();
                    compToday.setHours(0, 0, 0, 0);
                    const isFuture = d.isCurrentMonth && cellDate > compToday;

                    return (
                      <TouchableOpacity 
                        key={idx} 
                        style={[
                          styles.dayCell, 
                          canEdit && d.isCurrentMonth && isToday && styles.dayCellEditable,
                          canEdit && d.isCurrentMonth && !isToday && !isFuture && styles.dayCellLocked,
                          isFuture && styles.dayCellFuture
                        ]}
                        onPress={() => handleDayPress(d)}
                        disabled={!d.isCurrentMonth || isFuture}
                        activeOpacity={0.6}
                      >
                        <Text style={[
                          styles.dayText, 
                          !d.isCurrentMonth && styles.dayTextPrevNext,
                          isToday && styles.todayText
                        ]}>
                          {d.day < 10 ? `0${d.day}` : d.day}
                        </Text>
                        
                        {/* Dot indicator */}
                        {d.isCurrentMonth && d.status && (
                          <View style={[
                            styles.statusDot, 
                            d.status === 'Present' ? styles.dotPresent : d.status === 'Half Day' ? styles.dotHalf : d.status === 'Overtime' ? styles.dotOvertime : styles.dotAbsent
                          ]} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Legend Row */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.statusDot, styles.dotPresent, { position: 'relative', marginRight: 5 }]} />
                    <Text style={styles.legendText}>Present</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.statusDot, styles.dotHalf, { position: 'relative', marginRight: 5 }]} />
                    <Text style={styles.legendText}>Half Day</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.statusDot, styles.dotOvertime, { position: 'relative', marginRight: 5 }]} />
                    <Text style={styles.legendText}>Overtime</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.statusDot, styles.dotAbsent, { position: 'relative', marginRight: 5 }]} />
                    <Text style={styles.legendText}>Absent</Text>
                  </View>
                </View>

              </View>

              {/* Summary Sidebar Right Section */}
              <View style={styles.summarySidebar}>
                <View style={styles.sidebarIconBox}>
                  <MaterialCommunityIcons name="finance" size={18} color="#059669" />
                </View>
                
                <Text style={styles.sidebarSectionTitle}>Attendance Summary</Text>
                
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatLabel}>Present Days</Text>
                  <Text style={[styles.summaryStatValue, { color: COLORS.green }]}>{presentCount}</Text>
                </View>

                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatLabel}>Half Days</Text>
                  <Text style={[styles.summaryStatValue, { color: COLORS.orange }]}>{halfCount}</Text>
                </View>

                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatLabel}>Overtime Days</Text>
                  <Text style={[styles.summaryStatValue, { color: COLORS.blue }]}>{overtimeCount}</Text>
                </View>

                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatLabel}>Absent Days</Text>
                  <Text style={[styles.summaryStatValue, { color: COLORS.red }]}>{absentCount}</Text>
                </View>
              </View>

            </View>

            {/* ================= RECENT ACTIVITY TIMELINE ================= */}
            <View style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <Text style={styles.activityTitle}>Recent Activity</Text>
                <TouchableOpacity><Text style={styles.viewAllBtnText}>View All</Text></TouchableOpacity>
              </View>

              <View style={styles.timelineWrapper}>
                {/* Vertical Line */}
                <View style={styles.timelineLine} />

                {getRecentActivity().map((act, idx) => {
                  return (
                    <View key={idx} style={styles.timelineItem}>
                      
                      {/* Timeline Icon Node */}
                      <View style={styles.timelineNode}>
                        {act.status === 'Present' && (
                          <View style={[styles.nodeCircle, styles.nodePresent]}>
                            <Feather name="check" size={12} color="#059669" />
                          </View>
                        )}
                        {act.status === 'Half Day' && (
                          <View style={[styles.nodeCircle, styles.nodeHalf]}>
                            <Feather name="clock" size={12} color={COLORS.orange} />
                          </View>
                        )}
                        {act.status === 'Overtime' && (
                          <View style={[styles.nodeCircle, styles.nodeOvertime]}>
                            <Feather name="clock" size={12} color={COLORS.blue} />
                          </View>
                        )}
                        {act.status === 'Absent' && (
                          <View style={[styles.nodeCircle, styles.nodeAbsent]}>
                            <Feather name="x" size={12} color={COLORS.red} />
                          </View>
                        )}
                      </View>

                      {/* Content Row */}
                      <TouchableOpacity 
                        style={styles.timelineContentCard}
                        onPress={() => handleDayPress(act.rawDay)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.timelineMainInfo}>
                          <Text style={styles.timelineDate}>{act.date}</Text>
                          <Text style={styles.timelineHours}>{act.hours}</Text>
                          <View style={[
                            styles.statusBadge,
                            act.status === 'Present' ? styles.badgePresent : act.status === 'Half Day' ? styles.badgeHalf : act.status === 'Overtime' ? styles.badgeOvertime : styles.badgeAbsent
                          ]}>
                            <Text style={[
                                styles.statusBadgeText,
                                act.status === 'Present' ? { color: COLORS.green } : act.status === 'Half Day' ? { color: COLORS.orange } : act.status === 'Overtime' ? { color: COLORS.blue } : { color: COLORS.red }
                            ]}>{act.status}</Text>
                          </View>
                        </View>

                        <View style={styles.timelineRightInfo}>
                          {act.advance > 0 ? (
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.advanceLabel}>Advance</Text>
                              <Text style={styles.advanceValue}>₹{act.advance}</Text>
                            </View>
                          ) : (
                            <Text style={styles.noAdvanceText}>-</Text>
                          )}
                          <Feather name="chevron-right" size={16} color={COLORS.textMuted} style={{ marginLeft: 8 }} />
                        </View>
                      </TouchableOpacity>

                    </View>
                  );
                })}

                {getRecentActivity().length === 0 && (
                  <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>No attendance marked yet</Text>
                  </View>
                )}
              </View>
            </View>

          </View>
        )}

        {/* ================= TAB 2: PAYMENTS CONTENT ================= */}
        {activeTab === 'payments' && (
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

        {/* ================= TAB 3: DOCUMENTS CONTENT ================= */}
        {activeTab === 'documents' && (
          <View style={styles.documentsTabContent}>
            {[
              { name: 'Identity Proof (Aadhaar Card)', type: 'PDF • 1.4 MB', date: 'Uploaded on 12 Mar 2024' },
              { name: 'Labor Services Agreement Contract', type: 'PDF • 2.1 MB', date: 'Uploaded on 15 Mar 2024' },
              { name: 'Bank Details & Account Passbook', type: 'PDF • 950 KB', date: 'Uploaded on 18 Mar 2024' },
            ].map((doc, idx) => (
              <TouchableOpacity key={idx} style={styles.documentCard} activeOpacity={0.7}>
                <View style={styles.docIconBox}>
                  <FontAwesome5 name="file-pdf" size={20} color="#EF4444" />
                </View>
                <View style={styles.docDetails}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docMeta}>{doc.type} • {doc.date}</Text>
                </View>
                <TouchableOpacity style={styles.docDownloadBtn}>
                  <Feather name="download" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>

      {/* ================= EDIT MODAL OVERLAY ================= */}
      {selectedDay && (
        <View style={styles.overlayContainer}>
          <TouchableOpacity 
            style={styles.overlayBg} 
            activeOpacity={1} 
            onPress={() => setSelectedDay(null)} 
          />
          
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{isReadOnlyModal ? 'View Attendance' : 'Edit Attendance'} - {getMonthName(currentMonth)} {selectedDay.day}</Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Status Picker Row */}
            <Text style={styles.inputLabel}>Attendance Status</Text>
            <View style={styles.statusButtonsRow}>
              {(['Present', 'Half Day', 'Overtime', 'Absent'] as const).map(status => {
                const isSelected = editStatus === status;
                const statusColor = status === 'Present' ? COLORS.green : status === 'Half Day' ? COLORS.orange : status === 'Overtime' ? COLORS.blue : COLORS.red;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusSelectBtn,
                      isSelected && { borderColor: statusColor, backgroundColor: statusColor + '10' }
                    ]}
                    disabled={isReadOnlyModal}
                    onPress={() => {
                      setEditStatus(status);
                      setEditHours(status === 'Present' ? '8.0' : status === 'Half Day' ? '4.0' : status === 'Overtime' ? '12.0' : '0.0');
                    }}
                  >
                    <View style={[
                      styles.statusDot, 
                      { position: 'relative', marginTop: 0, marginRight: 6 },
                      status === 'Present' ? styles.dotPresent : status === 'Half Day' ? styles.dotHalf : status === 'Overtime' ? styles.dotOvertime : styles.dotAbsent
                    ]} />
                    <Text style={[styles.statusSelectText, isSelected && { color: statusColor, fontWeight: '800' }]}>
                      {status}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Hours Input */}
            <View style={styles.formRow}>
              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Hours Worked</Text>
                <View style={styles.inputWrapper}>
                  <TextInput 
                    style={[styles.textInput, isReadOnlyModal && { backgroundColor: '#F1F5F9', color: COLORS.textMuted }]} 
                    value={editHours} 
                    onChangeText={setEditHours}
                    keyboardType="numeric"
                    editable={!isReadOnlyModal}
                  />
                </View>
              </View>

              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Advance Given (₹)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput 
                    style={[styles.textInput, isReadOnlyModal && { backgroundColor: '#F1F5F9', color: COLORS.textMuted }]} 
                    value={editAdvance} 
                    onChangeText={setEditAdvance}
                    keyboardType="numeric"
                    editable={!isReadOnlyModal}
                  />
                </View>
              </View>
            </View>

            {/* Remarks Input */}
            <Text style={styles.inputLabel}>Remarks</Text>
            <View style={[styles.inputWrapper, { height: 40 }]}>
              <TextInput 
                style={[styles.textInput, isReadOnlyModal && { backgroundColor: '#F1F5F9', color: COLORS.textMuted }]} 
                value={editRemarks} 
                onChangeText={setEditRemarks}
                placeholder="Optional remark..."
                placeholderTextColor={COLORS.textMuted}
                editable={!isReadOnlyModal}
              />
            </View>

            {/* GPS Stamping Indicator / Display */}
            {selectedDay?.latitude && selectedDay?.longitude ? (
              <View style={{ marginTop: 12, padding: 10, backgroundColor: '#E6FDF5', borderRadius: 8, borderWidth: 1, borderColor: '#A7F3D0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Feather name="map-pin" size={14} color="#10B981" />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#047857' }}>📍 GPS Attendance Stamp</Text>
                </View>
                <Text style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
                  Coordinates: {selectedDay.latitude.toFixed(6)}, {selectedDay.longitude.toFixed(6)}
                </Text>
                <TouchableOpacity 
                  style={{
                    backgroundColor: '#10B981',
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 6,
                    alignItems: 'center',
                    alignSelf: 'flex-start'
                  }}
                  onPress={() => {
                    const url = `https://www.google.com/maps/search/?api=1&query=${selectedDay.latitude},${selectedDay.longitude}`;
                    Linking.openURL(url).catch(err => console.error("Couldn't load map", err));
                  }}
                >
                  <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: '700' }}>View on Google Maps</Text>
                </TouchableOpacity>
              </View>
            ) : (
              !isReadOnlyModal && editStatus !== 'Absent' && (
                <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, backgroundColor: isLabour ? '#E6FDF5' : '#EFF6FF', borderRadius: 6, borderWidth: 1, borderColor: isLabour ? '#A7F3D0' : '#BFDBFE' }}>
                  <Feather name="info" size={14} color={isLabour ? '#10B981' : '#3B82F6'} />
                  <Text style={{ fontSize: 11, color: isLabour ? '#047857' : '#1D4ED8', fontWeight: '600' }}>
                    {isLabour 
                      ? "GPS location will be stamped automatically upon saving." 
                      : "Editing as Contractor. Existing GPS check-in data will be preserved."}
                  </Text>
                </View>
              )
            )}

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
              {isReadOnlyModal ? (
                <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.cancelBtn, { flex: 1 }]} 
                    onPress={() => setSelectedDay(null)}
                  >
                    <Text style={styles.cancelBtnText}>Close</Text>
                  </TouchableOpacity>
                  {isLabour && !selectedDay?.latitude && (
                    <TouchableOpacity 
                      style={[styles.modalBtn, styles.saveBtn, { flex: 1.5, backgroundColor: '#10B981' }]} 
                      onPress={handleLabourCheckIn}
                    >
                      <Text style={styles.saveBtnText}>Check In (GPS)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.cancelBtn]} 
                    onPress={() => setSelectedDay(null)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.modalBtn, styles.saveBtn]} 
                    onPress={saveAttendance}
                  >
                    <Text style={styles.saveBtnText}>Save</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

          </View>
        </View>
      )}

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

      {/* Month/Year Picker Modal */}
      <Modal
        visible={showMonthPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMonthPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { width: width * 0.85, padding: 20 }]}>
            {/* Year Selector Row */}
            <View style={styles.pickerYearRow}>
              <TouchableOpacity onPress={handlePrevPickerYear} style={styles.pickerArrowBtn} activeOpacity={0.7}>
                <Feather name="chevron-left" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
              <Text style={styles.pickerYearText}>{pickerYear}</Text>
              <TouchableOpacity onPress={handleNextPickerYear} style={styles.pickerArrowBtn} activeOpacity={0.7}>
                <Feather name="chevron-right" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Months Grid */}
            <View style={styles.pickerMonthsGrid}>
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((mName, index) => {
                const isSelected = index === currentMonth && pickerYear === currentYear;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pickerMonthCell,
                      isSelected && styles.pickerMonthCellActive
                    ]}
                    onPress={() => handleSelectMonth(index)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.pickerMonthText,
                      isSelected && styles.pickerMonthTextActive
                    ]}>
                      {mName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Close Button */}
            <TouchableOpacity 
              style={styles.pickerCloseBtn}
              onPress={() => setShowMonthPicker(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerCloseBtnText}>Cancel</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
  },
  profileAvatarWrapper: {
    position: 'relative',
  },
  avatarImage: { 
    width: 66, 
    height: 66, 
    borderRadius: 33 
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  profileTextDetails: { 
    flex: 1, 
    marginLeft: 12 
  },
  profileName: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: COLORS.textDark, 
    marginBottom: 4 
  },
  ratingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    marginBottom: 6 
  },
  ratingText: { 
    fontSize: 11, 
    fontWeight: '700', 
    color: COLORS.textDark 
  },
  metaRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginBottom: 2 
  },
  metaIcon: { 
    color: COLORS.textMuted 
  },
  metaText: { 
    fontSize: 11, 
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  headerActionsColumn: { 
    width: 100, 
    gap: 6, 
    justifyContent: 'center' 
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 15,
    paddingVertical: 5,
    backgroundColor: COLORS.white,
  },
  messageBtnText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: COLORS.teal 
  },
  hireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
    borderRadius: 15,
    paddingVertical: 5,
  },
  hireBtnText: { 
    fontSize: 10, 
    fontWeight: '700', 
    color: COLORS.white 
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
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  statLabel: { 
    fontSize: 8, 
    color: COLORS.textMuted, 
    fontWeight: '700',
    textAlign: 'center',
  },
  statValue: { 
    fontSize: 12, 
    fontWeight: '800', 
    color: COLORS.textDark, 
    marginVertical: 2 
  },
  statSubText: { 
    fontSize: 8, 
    color: COLORS.textMuted 
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
    alignItems: 'center',
    marginVertical: 8,
    paddingLeft: 36,
    position: 'relative',
    height: 48,
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
});
