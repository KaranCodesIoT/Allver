import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, usePathname, useSegments } from 'expo-router';
import { useActiveJob, isAuthOrPublicRoute } from '../context/ActiveJobContext';

const getServiceThumbnail = (title: string, image?: string) => {
  if (image && !image.includes('placeholder') && !image.includes('default') && !image.includes('via.placeholder')) {
    return image;
  }
  const t = (title || '').toLowerCase();
  if (t.includes('paint')) return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=300&auto=format&fit=crop';
  if (t.includes('mason') || t.includes('brick')) return 'https://images.unsplash.com/photo-1541888946425-d0fbb186f5f7?q=80&w=300&auto=format&fit=crop';
  if (t.includes('plumb')) return 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?q=80&w=300&auto=format&fit=crop';
  if (t.includes('electr')) return 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=300&auto=format&fit=crop';
  if (t.includes('carpent')) return 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?q=80&w=300&auto=format&fit=crop';
  return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=300&auto=format&fit=crop';
};

export default function ActiveJobBanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { activeJob, activeJobUserId, userRole } = useActiveJob();

  // Don't show the banner if on auth/public screen or already on active-job screen
  const isAuthScreen = isAuthOrPublicRoute(pathname, segments);
  const isOnActiveScreen = pathname?.includes('/active-job') || pathname?.includes('/booking-flow');

  // Authenticated session validation
  const currentUser = (global as any).currentUser;
  const isAuthenticated = Boolean(currentUser && currentUser._id && activeJobUserId === currentUser._id);

  // Strict multi-layer auth & route guard
  if (!activeJob || isOnActiveScreen || isAuthScreen || !isAuthenticated) {
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
      let targetStep: number = 8;
      const st = (activeJob.status || '').toUpperCase();
      if (st === 'SEARCHING') {
        targetStep = 5;
      } else if (['WORKER_ASSIGNED', 'ASSIGNED', 'WORKER_ACCEPTED', 'ACCEPTED'].includes(st)) {
        targetStep = 7;
      } else if (['WORK_COMPLETION_REQUESTED', 'COMPLETION_SUBMITTED', 'CLIENT_CONFIRMED', 'PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(st)) {
        targetStep = 9;
      } else if (['PAYMENT_CONFIRMED', 'PAYMENT_COMPLETED'].includes(st)) {
        targetStep = 10;
      }

      router.push({
        pathname: '/booking-flow',
        params: {
          jobId: activeJob.jobId,
          step: targetStep.toString(),
          service: activeJob.service,
          location: activeJob.clientLocation?.address || activeJob.location || '',
          price: activeJob.price || '₹900'
        }
      });
    }
  };

  const rawService = activeJob.service || activeJob.title || 'Painting';
  const serviceTitle = rawService.toLowerCase().endsWith('service')
    ? rawService
    : `${rawService} Service`;

  const dateObj = activeJob.startedAt || activeJob.createdAt;
  const formattedDate = dateObj
    ? new Date(dateObj).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '12 Mar 2024';

  const thumbUri = getServiceThumbnail(serviceTitle, activeJob.image);

  const getStatusLabel = () => {
    const s = (activeJob.status || '').toUpperCase();
    if (s === 'SEARCHING') return 'Searching';
    if (s === 'COMPLETED' || s === 'SETTLED') return 'Completed';
    return 'In Progress';
  };

  return (
    <View style={[styles.bannerContainer, { paddingTop: Math.max(insets.top, 8) }]}>
      <TouchableOpacity
        style={styles.bannerContent}
        activeOpacity={0.88}
        onPress={handleResume}
      >
        <Image
          source={{ uri: thumbUri }}
          style={styles.circleThumb}
          contentFit="cover"
        />

        <View style={styles.centerDetails}>
          <Text style={styles.categoryLabel}>ACTIVE JOB</Text>
          <Text style={styles.jobTitle} numberOfLines={1}>
            {serviceTitle}
          </Text>
          <Text style={styles.startedDateText} numberOfLines={1}>
            Started on {formattedDate}
          </Text>
        </View>

        <View style={styles.rightActions}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusPillText}>
              {getStatusLabel()}
            </Text>
          </View>
          <View style={styles.viewDetailsBtn}>
            <Text style={styles.viewDetailsBtnText}>View Details</Text>
          </View>
        </View>

        <Feather name="chevron-right" size={22} color="#0F172A" style={{ marginLeft: 6 }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }
    })
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6FEF9',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  circleThumb: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  centerDetails: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  jobTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
    marginBottom: 2,
  },
  startedDateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  rightActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#16A34A',
    marginRight: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  viewDetailsBtn: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  viewDetailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
