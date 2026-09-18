import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { getStoredUser } from '../constants/Auth';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#16A34A',
  greenDark: '#15803D',
  greenLight: '#F0FDF4',
  greenBorder: '#DCFCE7',
  textDark: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  white: '#FFFFFF',
  bgLight: '#F8FAFC',
  orange: '#D97706',
  orangeLight: '#FEF3C7',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
};

const PROJECT_TYPE_IMAGES: Record<string, string> = {
  Residential: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80',
  Commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
  Renovation: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
  Interior: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80',
  Civil: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80',
  default: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80',
};

interface PaymentDetail {
  _id: string;
  workspaceId: string;
  projectTitle: string;
  projectType: string;
  client: { fullName: string; avatarUrl?: string; city?: string } | null;
  contractor: { fullName: string; avatarUrl?: string } | null;
  amount: number;
  type: string;
  status: string;
  date: string;
  paymentId: string;
}

export default function PaymentStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const paymentId = params.paymentId as string;

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PaymentDetail | null>(null);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        let user = (global as any).currentUser;
        if (!user) {
          const stored = await getStoredUser();
          if (stored) {
            user = typeof stored === 'string' ? JSON.parse(stored) : stored;
          }
        }
        if (!user?._id || !paymentId) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${BACKEND_URL}/api/earnings/${user._id}/payments/${paymentId}`);
        if (res.ok) {
          const data = await res.json();
          setPayment(data.payment);
        }
      } catch (err) {
        console.error('Error fetching payment detail for status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayment();
  }, [paymentId]);

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
  
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatShortDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getExpectedClearDate = (dateStr: string) => {
    const d = new Date(new Date(dateStr).getTime() + 3 * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/earnings')} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.green} />
        </View>
      </SafeAreaView>
    );
  }

  if (!payment) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/earnings')} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Payment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPaid = payment.status === 'Paid';
  const imageUri = PROJECT_TYPE_IMAGES[payment.projectType] || PROJECT_TYPE_IMAGES.default;

  const TIMELINE_STEPS = [
    {
      id: 'step-1',
      title: payment.type === 'Advance' ? 'Advance Requested' : 'Work Milestone Recorded',
      date: formatDate(payment.date),
      description: 'Recorded by contractor for project.',
      status: 'completed',
    },
    {
      id: 'step-2',
      title: 'Contractor Payment Recorded',
      date: formatDate(payment.date),
      description: 'Payment has been logged in project workspace.',
      status: 'completed',
    },
    {
      id: 'step-3',
      title: 'Processing',
      date: isPaid ? 'Completed' : `Expected by ${getExpectedClearDate(payment.date)}`,
      description: isPaid ? 'Payment verification complete.' : 'Payment is in 3-day verification holding period.',
      status: isPaid ? 'completed' : 'active',
    },
    {
      id: 'step-4',
      title: 'Added to Earnings',
      date: isPaid ? formatDate(payment.date) : '',
      description: isPaid ? 'Successfully credited to your earnings.' : 'Will be added automatically after verification.',
      status: isPaid ? 'completed' : 'upcoming',
    },
    {
      id: 'step-5',
      title: 'Available to Withdraw',
      date: isPaid ? 'Available Now' : '',
      description: isPaid ? 'You can withdraw this amount now.' : 'You can withdraw once verified.',
      status: isPaid ? 'completed' : 'upcoming',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/earnings');
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Status</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ================= JOB MINI CARD ================= */}
        <View style={styles.jobMiniCard}>
          <Image
            source={{ uri: imageUri }}
            style={styles.jobThumb}
            contentFit="cover"
          />
          <View style={styles.jobDetails}>
            <Text style={styles.jobTitle}>{payment.projectTitle}</Text>
            <Text style={styles.jobSubtitle}>{payment.client?.city || payment.projectType}</Text>
            <View style={styles.amountStatusRow}>
              <Text style={styles.jobAmount}>{formatCurrency(payment.amount)}</Text>
              <View style={[styles.pendingBadge, isPaid && { backgroundColor: COLORS.greenLight }]}>
                <Text style={[styles.pendingBadgeText, isPaid && { color: COLORS.green }]}>
                  {payment.status}
                </Text>
              </View>
            </View>
            <Text style={styles.jobDateText}>Recorded on {formatShortDate(payment.date)}</Text>
          </View>
        </View>

        {/* ================= TIMELINE CARD ================= */}
        <View style={styles.timelineCard}>
          {TIMELINE_STEPS.map((step, idx) => {
            const isLast = idx === TIMELINE_STEPS.length - 1;
            const isCompleted = step.status === 'completed';
            const isActive = step.status === 'active';
            const isUpcoming = step.status === 'upcoming';

            return (
              <View key={step.id} style={styles.stepContainer}>
                {/* Left Line & Icon Col */}
                <View style={styles.stepLineCol}>
                  <View style={[
                    styles.stepIconCircle,
                    isCompleted && styles.stepIconCircleCompleted,
                    isActive && styles.stepIconCircleActive,
                    isUpcoming && styles.stepIconCircleUpcoming,
                  ]}>
                    {isCompleted && <Feather name="check" size={13} color={COLORS.white} />}
                    {isActive && <Feather name="clock" size={12} color={COLORS.orange} />}
                    {isUpcoming && <View style={styles.upcomingDot} />}
                  </View>

                  {!isLast && (
                    <View style={[
                      styles.stepConnectorLine,
                      isCompleted && styles.stepConnectorLineCompleted,
                    ]} />
                  )}
                </View>

                {/* Right Details Col */}
                <View style={[styles.stepDetailsCol, isLast && { paddingBottom: 0 }]}>
                  <View style={styles.stepTitleRow}>
                    <Text style={[
                      styles.stepTitle,
                      isUpcoming && styles.stepTitleUpcoming
                    ]}>
                      {step.title}
                    </Text>
                  </View>

                  {step.date ? (
                    <Text style={[
                      styles.stepDate,
                      isActive && styles.stepDateActive
                    ]}>
                      {step.date}
                    </Text>
                  ) : null}

                  <Text style={[
                    styles.stepDesc,
                    isUpcoming && styles.stepDescUpcoming
                  ]}>
                    {step.description}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ================= NEED HELP BOX ================= */}
        <View style={styles.helpCard}>
          <View style={styles.helpTopRow}>
            <View style={styles.helpIconWrap}>
              <Feather name="info" size={16} color={COLORS.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.helpTitle}>Need help?</Text>
              <Text style={styles.helpDesc}>
                Contact our support team if you have questions regarding this payment.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.contactSupportBtn}
            onPress={() => {
              Linking.openURL('mailto:support@allver.in?subject=Payment%20Support%20Request');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.contactSupportText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  jobMiniCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  jobThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  jobDetails: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  jobSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  amountStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  jobAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  pendingBadge: {
    backgroundColor: COLORS.orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.orange,
  },
  jobDateText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  timelineCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  stepContainer: {
    flexDirection: 'row',
  },
  stepLineCol: {
    alignItems: 'center',
    width: 28,
    marginRight: 12,
  },
  stepIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepIconCircleCompleted: {
    backgroundColor: COLORS.green,
  },
  stepIconCircleActive: {
    backgroundColor: COLORS.orangeLight,
    borderWidth: 2,
    borderColor: COLORS.orange,
  },
  stepIconCircleUpcoming: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  upcomingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  stepConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  stepConnectorLineCompleted: {
    backgroundColor: COLORS.green,
  },
  stepDetailsCol: {
    flex: 1,
    paddingBottom: 24,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  stepTitleUpcoming: {
    color: COLORS.textMuted,
  },
  stepDate: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  stepDateActive: {
    color: COLORS.orange,
    fontWeight: '600',
  },
  stepDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  stepDescUpcoming: {
    color: COLORS.textLight,
  },
  helpCard: {
    backgroundColor: COLORS.blueLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 16,
    padding: 16,
  },
  helpTopRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  helpIconWrap: {
    marginRight: 10,
    marginTop: 2,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 2,
  },
  helpDesc: {
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 16,
  },
  contactSupportBtn: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  contactSupportText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.blue,
  },
});
