import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, AppState, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { getToken, getStoredUser } from '../constants/Auth';
import SocketService from '../utils/SocketService';

export default function ActiveJobBanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [activeJob, setActiveJob] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('');

  // Don't show the banner if already on active-job or booking-flow screen
  const isOnActiveScreen = pathname?.includes('/active-job') || pathname?.includes('/booking-flow');

  const checkActiveJob = useCallback(async () => {
    try {
      let user = (global as any).currentUser;
      if (!user) {
        const stored = await getStoredUser();
        if (stored) {
          try {
            user = typeof stored === 'string' ? JSON.parse(stored) : stored;
            (global as any).currentUser = user;
          } catch (e) {}
        }
      }

      if (!user) return;
      const role = user.role || 'Client';
      setUserRole(role);

      const token = await getToken();
      const endpoint = role === 'Labour' || role === 'Contractor'
        ? `${BACKEND_URL}/api/worker/active-job`
        : `${BACKEND_URL}/api/customer/active-job`;

      const res = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.hasActiveJob && data.activeJob) {
          setActiveJob(data.activeJob);
        } else {
          setActiveJob(null);
        }
      }
    } catch (err) {
      console.warn('[ActiveJobBanner] Check active job failed:', err);
    }
  }, []);

  useEffect(() => {
    checkActiveJob();

    // Recheck when app becomes active
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkActiveJob();
      }
    });

    // Recheck on socket status changes
    const onStatusChanged = () => {
      checkActiveJob();
    };

    SocketService.on('job_status_changed', onStatusChanged);
    SocketService.on('job_payment_completed', onStatusChanged);
    SocketService.on('job_cancelled', onStatusChanged);

    return () => {
      subscription.remove();
      SocketService.off('job_status_changed', onStatusChanged);
      SocketService.off('job_payment_completed', onStatusChanged);
      SocketService.off('job_cancelled', onStatusChanged);
    };
  }, [checkActiveJob]);

  if (!activeJob || isOnActiveScreen) {
    return null;
  }

  const handleResume = () => {
    const isWorker = userRole === 'Labour' || userRole === 'Contractor';
    if (isWorker) {
      router.push({
        pathname: '/active-job',
        params: {
          jobId: activeJob.jobId,
          jobData: JSON.stringify(activeJob)
        }
      });
    } else {
      router.push({
        pathname: '/booking-flow',
        params: {
          jobId: activeJob.jobId,
          service: activeJob.service,
          location: activeJob.clientLocation?.address || activeJob.location || '',
          price: activeJob.price || '₹900'
        }
      });
    }
  };

  const formatStatus = (s: string) => {
    return (s || 'ACTIVE').replace(/_/g, ' ');
  };

  return (
    <View style={[styles.bannerContainer, { paddingTop: Math.max(insets.top, 6) }]}>
      <TouchableOpacity
        style={styles.bannerContent}
        activeOpacity={0.88}
        onPress={handleResume}
      >
        <View style={styles.pulseDot} />
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.bannerTitle} numberOfLines={1}>
              Active Job: {activeJob.service || 'Service'}
            </Text>
            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>
                {formatStatus(activeJob.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.bannerSubtitle} numberOfLines={1}>
            Tap to return to console • #{activeJob.jobId}
          </Text>
        </View>

        <View style={styles.resumeBtn}>
          <Text style={styles.resumeBtnText}>Resume</Text>
          <Feather name="arrow-right" size={14} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }
    })
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  statusPillText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bannerSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  resumeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
