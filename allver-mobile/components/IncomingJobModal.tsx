import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Animated, Alert, Platform } from 'react-native';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import SocketService from '../utils/SocketService';

interface IncomingJobModalProps {
  currentUserId?: string;
  currentUserRole?: string;
}

export default function IncomingJobModal({ currentUserId, currentUserRole }: IncomingJobModalProps) {
  const [activeJob, setActiveJob] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const countdownRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Listen for new real-time job broadcast offers
    const handleJobBroadcast = (jobData: any) => {
      console.log('[IncomingJobModal] Received job broadcast:', jobData);
      if (!jobData || !jobData.jobId) return;

      // Get logged-in user & role
      let user = (global as any).currentUser;
      if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('currentUser');
        if (stored) {
          try { user = JSON.parse(stored); } catch (e) {}
        }
      }

      const activeUserId = user?._id || currentUserId;
      const activeUserRole = user?.role || currentUserRole;

      // DO NOT SHOW TO CLIENTS!
      if (activeUserRole === 'Client') {
        console.log('[IncomingJobModal] Suppressing popup: Current user role is Client.');
        return;
      }

      // DO NOT SHOW TO THE CLIENT WHO CREATED THE JOB!
      const creatorId = jobData.clientInfo?.userId || jobData.clientInfo?.id;
      if (creatorId && activeUserId && creatorId.toString() === activeUserId.toString()) {
        console.log('[IncomingJobModal] Suppressing popup: Current user is the creator of this job request.');
        return;
      }

      setActiveJob(jobData);
      const waveDuration = 10;
      setCountdown(waveDuration);
      setModalVisible(true);

      // Reset animation
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: waveDuration * 1000,
        useNativeDriver: false,
      }).start();

      // Clear existing countdown
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setModalVisible(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // 2. Listen for job cancellation / assigned to another worker
    const handleJobCancelledOrAssigned = (data: any) => {
      console.log('[IncomingJobModal] Job assigned or cancelled notification:', data);
      if (activeJob && data.jobId === activeJob.jobId) {
        if (data.winnerId !== currentUserId) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setModalVisible(false);
          setActiveJob(null);
          Alert.alert(
            '⚡ Job Taken',
            data.message || 'This job request was accepted by another worker.'
          );
        }
      }
    };

    // 3. Listen for job already taken error
    const handleJobAlreadyTaken = (data: any) => {
      if (activeJob && data.jobId === activeJob.jobId) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setModalVisible(false);
        setActiveJob(null);
        Alert.alert('⚡ Already Taken', data.message || 'Sorry, this job request was already accepted.');
      }
    };

    // 4. Listen for acceptance success
    const handleJobAcceptedSuccess = (data: any) => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setModalVisible(false);
      Alert.alert(
        '🎉 Booking Confirmed!',
        `You have been assigned to this job request!\nLocation: ${activeJob?.location || 'Nearby Area'}`
      );
      setActiveJob(null);
    };

    SocketService.on('job_request_broadcast', handleJobBroadcast);
    SocketService.on('job_request_cancelled_or_assigned', handleJobCancelledOrAssigned);
    SocketService.on('job_already_taken', handleJobAlreadyTaken);
    SocketService.on('job_accepted_success', handleJobAcceptedSuccess);

    return () => {
      SocketService.off('job_request_broadcast', handleJobBroadcast);
      SocketService.off('job_request_cancelled_or_assigned', handleJobCancelledOrAssigned);
      SocketService.off('job_already_taken', handleJobAlreadyTaken);
      SocketService.off('job_accepted_success', handleJobAcceptedSuccess);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [activeJob, currentUserId]);

  const handleAcceptJob = () => {
    if (!activeJob) return;

    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { user = JSON.parse(stored); } catch (e) {}
      }
    }

    const workerInfo = {
      id: user?._id || currentUserId || `worker_${Date.now()}`,
      name: user?.fullName || 'Ramesh Yadav',
      avatar: user?.avatarUrl || user?.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150',
      rating: user?.rating || 4.8,
      reviews: user?.reviews || 38,
      experience: user?.experience || '6 Years',
      phone: user?.phone || user?.phoneNumber || '+91 98765 43210',
      location: user?.city || activeJob.location || 'Sector 62, Noida',
    };

    console.log('[IncomingJobModal] Emitting worker_accept_job_request for job:', activeJob.jobId);
    SocketService.emit('worker_accept_job_request', {
      jobId: activeJob.jobId,
      workerInfo,
    });
  };

  const handleDeclineJob = () => {
    if (activeJob) {
      SocketService.emit('worker_reject_job_request', { jobId: activeJob.jobId });
    }
    if (countdownRef.current) clearInterval(countdownRef.current);
    setModalVisible(false);
    setActiveJob(null);
  };

  let user = (global as any).currentUser;
  if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try { user = JSON.parse(stored); } catch (e) {}
    }
  }
  const resolvedRole = user?.role || currentUserRole;
  if (resolvedRole === 'Client') return null;

  if (!modalVisible || !activeJob) return null;

  return (
    <Modal visible={modalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          
          {/* Header Banner */}
          <View style={styles.headerBanner}>
            <View style={styles.pulseBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.headerBannerText}>
                {activeJob.waveTitle ? activeJob.waveTitle.toUpperCase() : 'NEW JOB REQUEST NEARBY'}
              </Text>
            </View>
            <Text style={styles.timerText}>{countdown}s</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <Animated.View 
              style={[
                styles.progressBarFill, 
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]} 
            />
          </View>

          {/* Main Job Info */}
          <View style={styles.bodySection}>
            <View style={styles.serviceRow}>
              <View style={styles.iconCircle}>
                <FontAwesome5 name="paint-roller" size={24} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.serviceTitle}>{activeJob.service || 'Painting'} Worker</Text>
                <Text style={styles.serviceSubtitle}>
                  {activeJob.tier || 'Premium Worker'} • {activeJob.radiusText ? `${activeJob.radiusText} Radius` : 'Direct Booking'}
                </Text>
              </View>
            </View>

            {/* Details Grid */}
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Feather name="map-pin" size={16} color="#F97316" style={{ marginRight: 8 }} />
                <Text style={styles.detailText} numberOfLines={1}>
                  {activeJob.location || 'Sector 62, Noida'} ({activeJob.radiusText ? `Within ${activeJob.radiusText} service area` : 'Nearby'})
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Feather name="calendar" size={16} color="#2563EB" style={{ marginRight: 8 }} />
                <Text style={styles.detailText}>{activeJob.date || 'Tomorrow, 10 Sep 2026'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Feather name="dollar-sign" size={16} color="#16A34A" style={{ marginRight: 8 }} />
                <Text style={styles.detailPriceText}>{activeJob.price || '₹800 – ₹1,000 / day'}</Text>
              </View>
            </View>

            <Text style={styles.simultaneousNotice}>
              ⚡ Offering to suitable nearby workers in wave groups. First eligible worker to accept gets the booking!
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineJob} activeOpacity={0.8}>
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptJob} activeOpacity={0.88}>
              <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.acceptBtnText}>ACCEPT JOB</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  headerBannerText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
  },
  bodySection: {
    marginBottom: 20,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  serviceSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  detailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  detailPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A34A',
  },
  simultaneousNotice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  declineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  acceptBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
