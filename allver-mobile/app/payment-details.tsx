import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
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

export default function PaymentDetailsScreen() {
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
        console.error('Error fetching payment detail:', err);
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/earnings')} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Details</Text>
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
          <Text style={styles.headerTitle}>Payment Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>Payment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageUri = PROJECT_TYPE_IMAGES[payment.projectType] || PROJECT_TYPE_IMAGES.default;
  const isPaid = payment.status === 'Paid';

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
        <Text style={styles.headerTitle}>Payment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ================= JOB MINI CARD ================= */}
        <View style={styles.jobMiniCard}>
          <Image source={{ uri: imageUri }} style={styles.jobThumb} contentFit="cover" />
          <View style={styles.jobDetails}>
            <Text style={styles.jobTitle}>{payment.projectTitle}</Text>
            <Text style={styles.jobSubtitle}>{payment.client?.city || payment.projectType}</Text>
            <View style={styles.completedPill}>
              <Text style={styles.completedPillText}>{isPaid ? 'Completed' : 'Processing'}</Text>
            </View>
            <Text style={styles.jobDateText}>{formatDate(payment.date)}</Text>
          </View>
        </View>

        {/* ================= LARGE AMOUNT CARD ================= */}
        <View style={styles.amountCard}>
          <View style={styles.amountHeaderRow}>
            <Text style={styles.amountValue}>{formatCurrency(payment.amount)}</Text>
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>{payment.status}</Text>
            </View>
          </View>
          <Text style={styles.amountSub}>Payment received in your earnings</Text>

          {/* Breakdown Rows */}
          <View style={styles.breakdownBox}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{payment.type === 'Advance' ? 'Advance Amount' : 'Job Amount'}</Text>
              <Text style={styles.breakdownVal}>{formatCurrency(payment.amount)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>ALLVER Service Fee</Text>
              <Text style={styles.breakdownVal}>₹0</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Worker Earnings</Text>
              <Text style={styles.breakdownTotalVal}>{formatCurrency(payment.amount)}</Text>
            </View>
          </View>
        </View>

        {/* ================= CLIENT CARD ================= */}
        {payment.client && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Client</Text>
            <View style={styles.clientRow}>
              <View style={styles.clientAvatar}>
                <Feather name="user" size={18} color={COLORS.textMuted} />
              </View>
              <View style={styles.clientMeta}>
                <Text style={styles.clientName}>{payment.client.fullName}</Text>
                <Text style={styles.clientLoc}>{payment.client.city || ''}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ================= PAYMENT METADATA ================= */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payment ID</Text>
            <Text style={styles.metaValue}>{payment.paymentId}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payment Type</Text>
            <Text style={styles.metaValue}>{payment.type}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payment Method</Text>
            <Text style={styles.metaValue}>Contractor Payment</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{isPaid ? 'Completed On' : 'Recorded On'}</Text>
            <Text style={styles.metaValue}>{formatDate(payment.date)}</Text>
          </View>
        </View>

        {/* ================= SUCCESS ALERT BANNER ================= */}
        <View style={styles.successBanner}>
          <View style={styles.successIconWrap}>
            <Feather name="check-circle" size={18} color={COLORS.green} />
          </View>
          <Text style={styles.successBannerText}>
            Payment has been successfully added to your ALLVER earnings.
          </Text>
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
  completedPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  completedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.green,
  },
  jobDateText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  amountCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  amountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  paidBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paidBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
  },
  amountSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  breakdownBox: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12,
    padding: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },
  breakdownTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  breakdownTotalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientMeta: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  clientLoc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  metaCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  metaDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 12,
    padding: 14,
  },
  successIconWrap: {
    marginRight: 10,
  },
  successBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.greenDark,
    fontWeight: '600',
    lineHeight: 16,
  },
});
