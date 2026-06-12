import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';

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
};

interface CalendarDay {
  day: number;
  isCurrentMonth: boolean;
  status?: 'Present' | 'Half Day' | 'Absent';
  hours?: number;
  advance?: number;
  remarks?: string;
}

const INITIAL_CALENDAR_DAYS: CalendarDay[] = [
  { day: 29, isCurrentMonth: false },
  { day: 30, isCurrentMonth: false },
  { day: 1, isCurrentMonth: true, status: 'Present', hours: 8, advance: 100, remarks: '-' },
  { day: 2, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 3, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 4, isCurrentMonth: true, status: 'Half Day', hours: 4, advance: 100, remarks: '-' },
  { day: 5, isCurrentMonth: true, status: 'Absent', hours: 0, advance: 0, remarks: 'Personal' },
  { day: 6, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 7, isCurrentMonth: true, status: 'Present', hours: 8, advance: 100, remarks: '-' },
  { day: 8, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 9, isCurrentMonth: true, status: 'Present', hours: 8, advance: 100, remarks: '-' },
  { day: 10, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 11, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 12, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 13, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 14, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 15, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 16, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 17, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 18, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 19, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 20, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 21, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 22, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 23, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 24, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 25, isCurrentMonth: true, status: 'Half Day', hours: 4, advance: 100, remarks: '-' },
  { day: 26, isCurrentMonth: true, status: 'Absent', hours: 0, advance: 0, remarks: '-' },
  { day: 27, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 28, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 29, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 30, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 31, isCurrentMonth: true, status: 'Present', hours: 8, advance: 0, remarks: '-' },
  { day: 1, isCurrentMonth: false },
  { day: 2, isCurrentMonth: false },
];

export default function LabourDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Load params with fallbacks
  const name = (params.name as string) || 'Ramesh Yadav';
  const role = (params.role as string) || 'Mason';
  const avatar = (params.avatar as string) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop';
  const experience = (params.experience as string) || '12+ Years Experience';
  const location = (params.location as string) || 'Mumbai, Maharashtra';
  const rating = (params.rating as string) || '4.8';
  const reviews = (params.reviews as string) || '124';
  const contractorName = (params.contractorName as string) || 'BuildWell Contractors';

  const [activeTab, setActiveTab] = useState<'attendance' | 'payments' | 'documents'>('attendance');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // States for editable attendance
  const [days, setDays] = useState<CalendarDay[]>(INITIAL_CALENDAR_DAYS);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  
  // Form edit states
  const [editStatus, setEditStatus] = useState<'Present' | 'Half Day' | 'Absent'>('Present');
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

  // Load persisted attendance when name changes
  useEffect(() => {
    const key = `attendance_${name}`;
    let saved = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      saved = localStorage.getItem(key);
    } else {
      saved = (global as any)[key];
    }

    if (saved) {
      try {
        setDays(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing saved attendance:', e);
      }
    } else {
      setDays(INITIAL_CALENDAR_DAYS);
    }
  }, [name]);

  // Determine if editing is enabled (if current user is a Contractor or if we are in mock mode)
  const isContractor = !currentUser || currentUser.role === 'Contractor';

  // Calculate stats dynamically
  const presentCount = days.filter(d => d.isCurrentMonth && d.status === 'Present').length;
  const halfCount = days.filter(d => d.isCurrentMonth && d.status === 'Half Day').length;
  const absentCount = days.filter(d => d.isCurrentMonth && d.status === 'Absent').length;
  
  const totalWeight = presentCount + (halfCount * 0.5);
  const activeDaysCount = presentCount + halfCount + absentCount;
  const attendancePercentage = activeDaysCount > 0 ? Math.round((totalWeight / activeDaysCount) * 100) : 100;
  const attendanceStatusLabel = attendancePercentage >= 90 ? 'Good' : (attendancePercentage >= 75 ? 'Average' : 'Low');

  // Load selected day into editing form states
  const handleDayPress = (dayObj: CalendarDay) => {
    if (!isContractor || !dayObj.isCurrentMonth) return;
    
    setSelectedDay(dayObj);
    setEditStatus(dayObj.status || 'Present');
    setEditHours(dayObj.hours?.toString() || '8.0');
    setEditAdvance(dayObj.advance?.toString() || '0');
    setEditRemarks(dayObj.remarks || '');
  };

  const saveAttendance = () => {
    if (!selectedDay) return;

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

    const updatedDays = days.map(d => {
      if (d.isCurrentMonth && d.day === selectedDay.day) {
        return {
          ...d,
          status: editStatus,
          hours: parsedHours,
          advance: parsedAdvance,
          remarks: editRemarks || '-'
        };
      }
      return d;
    });

    setDays(updatedDays);

    // Persist changes
    const key = `attendance_${name}`;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(updatedDays));
    }
    (global as any)[key] = JSON.stringify(updatedDays);

    setSelectedDay(null);
  };

  // Build Recent Activity dynamically from the last 4 days that have logs
  const getRecentActivity = () => {
    const activeDays = days
      .filter(d => d.isCurrentMonth && d.status)
      .sort((a, b) => b.day - a.day) // latest first
      .slice(0, 4); // get top 4

    return activeDays.map(d => ({
      date: `${d.day < 10 ? '0' + d.day : d.day} May 2024, ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(2024, 4, d.day).getDay()]}`,
      hours: `${d.hours?.toFixed(1) || '0.0'} Hours`,
      status: d.status || 'Present',
      advance: d.advance || 0
    }));
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
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
            <Text style={styles.infoBannerText}>
              Contractor Mode: Tap any day in the calendar grid to mark attendance.
            </Text>
          </View>
        )}

        {/* ================= PROFILE DETAILS CARD ================= */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatarWrapper}>
            <Image source={{ uri: avatar }} style={styles.avatarImage} contentFit="cover" />
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
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActionsColumn}>
            <TouchableOpacity style={styles.messageBtn} onPress={handleMessage} activeOpacity={0.7}>
              <Feather name="message-square" size={13} color={COLORS.teal} style={{ marginRight: 6 }} />
              <Text style={styles.messageBtnText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.hireBtn} onPress={handleHire} activeOpacity={0.8}>
              <Feather name="briefcase" size={13} color={COLORS.white} style={{ marginRight: 6 }} />
              <Text style={styles.hireBtnText}>Hire / Give Work</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= SUMMARY STATS (4 Cards) ================= */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Feather name="calendar" size={14} color={COLORS.textMuted} style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>Total Days Worked</Text>
            <Text style={styles.statValue}>{activeDaysCount} Days</Text>
            <Text style={styles.statSubText}>(This Month)</Text>
          </View>

          <View style={styles.statBox}>
            <MaterialCommunityIcons name="currency-inr" size={15} color={COLORS.textMuted} style={{ marginBottom: 3 }} />
            <Text style={styles.statLabel}>Total Payment</Text>
            <Text style={styles.statValue}>₹ {(presentCount * 400 + halfCount * 200).toLocaleString()}</Text>
            <Text style={styles.statSubText}>(This Month)</Text>
          </View>

          <View style={styles.statBox}>
            <Feather name="folder-minus" size={14} color={COLORS.textMuted} style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>Advance Given</Text>
            <Text style={styles.statValue}>₹ {days.reduce((acc, d) => acc + (d.advance || 0), 0).toLocaleString()}</Text>
            <Text style={styles.statSubText}>(This Month)</Text>
          </View>

          <View style={styles.statBox}>
            <Feather name="file-text" size={14} color={COLORS.textMuted} style={{ marginBottom: 4 }} />
            <Text style={styles.statLabel}>Pending Payment</Text>
            <Text style={styles.statValue}>₹ {((presentCount * 400 + halfCount * 200) - days.reduce((acc, d) => acc + (d.advance || 0), 0)).toLocaleString()}</Text>
            <Text style={styles.statSubText}>(This Month)</Text>
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
              Attendance
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'payments' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('payments')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === 'payments' && styles.tabButtonTextActive]}>
              Payments
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'documents' && styles.tabButtonActive]} 
            onPress={() => setActiveTab('documents')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabButtonText, activeTab === 'documents' && styles.tabButtonTextActive]}>
              Documents
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
                  <View style={styles.monthSelector}>
                    <Feather name="calendar" size={16} color={COLORS.textDark} style={{ marginRight: 6 }} />
                    <Text style={styles.monthText}>May 2024</Text>
                    <Feather name="chevron-down" size={14} color={COLORS.textDark} style={{ marginLeft: 4 }} />
                  </View>
                  <View style={styles.arrowControls}>
                    <TouchableOpacity style={styles.arrowBtn}><Feather name="chevron-left" size={16} color={COLORS.textDark} /></TouchableOpacity>
                    <TouchableOpacity style={styles.arrowBtn}><Feather name="chevron-right" size={16} color={COLORS.textDark} /></TouchableOpacity>
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
                    const isToday = d.day === 7 && d.isCurrentMonth;
                    return (
                      <TouchableOpacity 
                        key={idx} 
                        style={[
                          styles.dayCell, 
                          isContractor && d.isCurrentMonth && styles.dayCellEditable
                        ]}
                        onPress={() => handleDayPress(d)}
                        disabled={!isContractor || !d.isCurrentMonth}
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
                            d.status === 'Present' ? styles.dotPresent : d.status === 'Half Day' ? styles.dotHalf : styles.dotAbsent
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
                  <Text style={styles.summaryStatLabel}>Absent Days</Text>
                  <Text style={[styles.summaryStatValue, { color: COLORS.red }]}>{absentCount}</Text>
                </View>

                <View style={styles.sidebarDivider} />

                <Text style={styles.sidebarSectionTitle}>Attendance %</Text>
                <Text style={styles.percentageText}>{attendancePercentage}%</Text>
                <Text style={styles.percentageLabel}>{attendanceStatusLabel}</Text>
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
                        {act.status === 'Absent' && (
                          <View style={[styles.nodeCircle, styles.nodeAbsent]}>
                            <Feather name="x" size={12} color={COLORS.red} />
                          </View>
                        )}
                      </View>

                      {/* Content Row */}
                      <View style={styles.timelineContentCard}>
                        <View style={styles.timelineMainInfo}>
                          <Text style={styles.timelineDate}>{act.date}</Text>
                          <Text style={styles.timelineHours}>{act.hours}</Text>
                          <View style={[
                            styles.statusBadge,
                            act.status === 'Present' ? styles.badgePresent : act.status === 'Half Day' ? styles.badgeHalf : styles.badgeAbsent
                          ]}>
                            <Text style={[
                              styles.statusBadgeText,
                              act.status === 'Present' ? { color: COLORS.green } : act.status === 'Half Day' ? { color: COLORS.orange } : { color: COLORS.red }
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
                      </View>

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
              <Text style={styles.modalTitle}>Edit Attendance - May {selectedDay.day}</Text>
              <TouchableOpacity onPress={() => setSelectedDay(null)}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Status Picker Row */}
            <Text style={styles.inputLabel}>Attendance Status</Text>
            <View style={styles.statusButtonsRow}>
              {(['Present', 'Half Day', 'Absent'] as const).map(status => {
                const isSelected = editStatus === status;
                const statusColor = status === 'Present' ? COLORS.green : status === 'Half Day' ? COLORS.orange : COLORS.red;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusSelectBtn,
                      isSelected && { borderColor: statusColor, backgroundColor: statusColor + '10' }
                    ]}
                    onPress={() => {
                      setEditStatus(status);
                      setEditHours(status === 'Present' ? '8.0' : status === 'Half Day' ? '4.0' : '0.0');
                    }}
                  >
                    <View style={[
                      styles.statusDot, 
                      { position: 'relative', marginTop: 0, marginRight: 6 },
                      status === 'Present' ? styles.dotPresent : status === 'Half Day' ? styles.dotHalf : styles.dotAbsent
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
                    style={styles.textInput} 
                    value={editHours} 
                    onChangeText={setEditHours}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formCol}>
                <Text style={styles.inputLabel}>Advance Given (₹)</Text>
                <View style={styles.inputWrapper}>
                  <TextInput 
                    style={styles.textInput} 
                    value={editAdvance} 
                    onChangeText={setEditAdvance}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Remarks Input */}
            <Text style={styles.inputLabel}>Remarks</Text>
            <View style={[styles.inputWrapper, { height: 40 }]}>
              <TextInput 
                style={styles.textInput} 
                value={editRemarks} 
                onChangeText={setEditRemarks}
                placeholder="Optional remark..."
                placeholderTextColor={COLORS.textMuted}
              />
            </View>

            {/* Modal Buttons */}
            <View style={styles.modalButtons}>
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
            </View>

          </View>
        </View>
      )}

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
    borderRadius: 6,
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
    borderRadius: 6,
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
    backgroundColor: '#F8FAFC',
    borderWidth: 0.5,
    borderColor: '#F1F5F9',
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
    width: 105,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sidebarSectionTitle: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  summaryStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 2,
  },
  summaryStatLabel: {
    fontSize: 8,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  summaryStatValue: {
    fontSize: 8,
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
});
