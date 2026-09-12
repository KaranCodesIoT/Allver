import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';

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

export default function PaymentDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const id = (params.id as string) || 'pmt-1';
  const isPainting = id === 'pmt-3';

  const jobTitle = isPainting ? 'Painting Work' : 'Mason Work';
  const jobSubtitle = isPainting ? 'Worli, Mumbai' : 'Sharma Residence';
  const amount = isPainting ? '₹1,150' : '₹3,500';
  const dateStr = isPainting ? '28 Aug 2026, 4:15 PM' : '5 Sept 2026, 11:30 AM';
  const paymentId = isPainting ? 'ALV-PMT-781924' : 'ALV-PMT-892736';
  const clientName = isPainting ? 'Mrs. Anita Deshmukh' : 'Mr. Rohit Sharma';
  const clientLoc = isPainting ? 'Worli, Mumbai' : 'Andheri, Mumbai';
  const image = isPainting
    ? 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80'
    : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80';

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
          <Image source={{ uri: image }} style={styles.jobThumb} contentFit="cover" />
          <View style={styles.jobDetails}>
            <Text style={styles.jobTitle}>{jobTitle}</Text>
            <Text style={styles.jobSubtitle}>{jobSubtitle}</Text>
            <View style={styles.completedPill}>
              <Text style={styles.completedPillText}>Completed</Text>
            </View>
            <Text style={styles.jobDateText}>{dateStr}</Text>
          </View>
        </View>

        {/* ================= LARGE AMOUNT CARD ================= */}
        <View style={styles.amountCard}>
          <View style={styles.amountHeaderRow}>
            <Text style={styles.amountValue}>{amount}</Text>
            <View style={styles.paidBadge}>
              <Text style={styles.paidBadgeText}>Paid</Text>
            </View>
          </View>
          <Text style={styles.amountSub}>Payment received in your earnings</Text>

          {/* Breakdown Rows */}
          <View style={styles.breakdownBox}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Job Amount</Text>
              <Text style={styles.breakdownVal}>{amount}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>ALLVER Service Fee</Text>
              <Text style={styles.breakdownVal}>₹0</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownTotalLabel}>Worker Earnings</Text>
              <Text style={styles.breakdownTotalVal}>{amount}</Text>
            </View>
          </View>
        </View>

        {/* ================= CLIENT CARD ================= */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Client</Text>
          <View style={styles.clientRow}>
            <View style={styles.clientAvatar}>
              <Feather name="user" size={18} color={COLORS.textMuted} />
            </View>
            <View style={styles.clientMeta}>
              <Text style={styles.clientName}>{clientName}</Text>
              <Text style={styles.clientLoc}>{clientLoc}</Text>
            </View>
          </View>
        </View>

        {/* ================= PAYMENT METADATA ================= */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payment ID</Text>
            <Text style={styles.metaValue}>{paymentId}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Payment Method</Text>
            <Text style={styles.metaValue}>Client Online Payment</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Completed On</Text>
            <Text style={styles.metaValue}>{dateStr}</Text>
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
