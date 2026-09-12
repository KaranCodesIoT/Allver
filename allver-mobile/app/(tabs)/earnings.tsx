import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

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
  blueLight: '#DBEAFE',
};

export default function EarningsScreen() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<'This Month' | 'All Time' | 'Payouts'>('This Month');

  const RECENT_PAYMENTS = [
    {
      id: 'pmt-1',
      title: 'Mason Work',
      subtitle: 'Sharma Residence',
      amount: '₹3,500',
      status: 'Paid',
      date: '5 Sept 2026',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80',
      route: '/payment-details',
      params: { id: 'pmt-1' }
    },
    {
      id: 'pmt-2',
      title: 'Plumbing Repair',
      subtitle: 'Dadar, Mumbai',
      amount: '₹2,000',
      status: 'Pending',
      date: '4 Sept 2026',
      image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=200&q=80',
      route: '/payment-status',
      params: { id: 'pmt-2' }
    },
    {
      id: 'pmt-3',
      title: 'Painting Work',
      subtitle: 'Worli, Mumbai',
      amount: '₹1,150',
      status: 'Paid',
      date: '28 Aug 2026',
      image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=200&q=80',
      route: '/payment-details',
      params: { id: 'pmt-3' }
    },
  ];

  const handleSubTabPress = (tab: 'This Month' | 'All Time' | 'Payouts') => {
    if (tab === 'Payouts') {
      router.push('/payout-history');
      return;
    }
    setActiveSubTab(tab);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)');
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ================= SUB TABS ================= */}
        <View style={styles.subTabsRow}>
          {(['This Month', 'All Time', 'Payouts'] as const).map((tab) => {
            const isActive = activeSubTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.subTabBtn, isActive && styles.subTabBtnActive]}
                onPress={() => handleSubTabPress(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>{tab}</Text>
                {isActive && <View style={styles.subTabIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================= TOTAL EARNINGS CARD ================= */}
        <View style={styles.totalEarningsCard}>
          <View style={styles.totalEarningsHeader}>
            <Text style={styles.totalEarningsLabel}>Total Earnings</Text>
            <View style={styles.growthPill}>
              <Feather name="arrow-up-right" size={13} color={COLORS.green} style={{ marginRight: 2 }} />
              <Text style={styles.growthPillText}>+12%</Text>
            </View>
          </View>

          <Text style={styles.totalEarningsValue}>
            {activeSubTab === 'This Month' ? '₹12,450' : '₹48,900'}
          </Text>

          <View style={styles.totalEarningsFooter}>
            <Text style={styles.totalEarningsPeriod}>{activeSubTab === 'This Month' ? 'This Month' : 'All Time'}</Text>
            <Text style={styles.totalEarningsVs}>vs last month</Text>
          </View>
        </View>

        {/* ================= 3 QUICK METRIC CARDS ================= */}
        <View style={styles.metricsRow}>
          {/* Available to Withdraw */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: COLORS.greenLight }]}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color={COLORS.green} />
            </View>
            <Text style={styles.metricLabel}>Available{'\n'}to Withdraw</Text>
            <Text style={styles.metricValue}>₹8,450</Text>
          </View>

          {/* Pending */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: COLORS.orangeLight }]}>
              <Feather name="clock" size={18} color={COLORS.orange} />
            </View>
            <Text style={styles.metricLabel}>Pending{'\n'}&nbsp;</Text>
            <Text style={styles.metricValue}>₹2,000</Text>
          </View>

          {/* Paid */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: COLORS.blueLight }]}>
              <Feather name="credit-card" size={18} color={COLORS.blue} />
            </View>
            <Text style={styles.metricLabel}>Paid{'\n'}&nbsp;</Text>
            <Text style={styles.metricValue}>₹10,450</Text>
          </View>
        </View>

        {/* ================= WITHDRAW BUTTON ================= */}
        <TouchableOpacity
          style={styles.withdrawBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/withdraw-earnings')}
        >
          <Text style={styles.withdrawBtnText}>Withdraw ₹8,450</Text>
          <Feather name="arrow-right" size={18} color={COLORS.white} style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        {/* ================= RECENT PAYMENTS ================= */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Payments</Text>
            <TouchableOpacity onPress={() => router.push('/payout-history')} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.paymentsList}>
            {RECENT_PAYMENTS.map((pmt) => {
              const isPaid = pmt.status === 'Paid';
              return (
                <TouchableOpacity
                  key={pmt.id}
                  style={styles.paymentCard}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: pmt.route as any, params: pmt.params })}
                >
                  <Image source={{ uri: pmt.image }} style={styles.paymentThumb} contentFit="cover" />

                  <View style={styles.paymentDetails}>
                    <Text style={styles.paymentJobTitle} numberOfLines={1}>{pmt.title}</Text>
                    <Text style={styles.paymentJobSub} numberOfLines={1}>{pmt.subtitle}</Text>
                  </View>

                  <View style={styles.paymentRightCol}>
                    <Text style={styles.paymentAmount}>{pmt.amount}</Text>
                    <View style={[
                      styles.statusPill,
                      { backgroundColor: isPaid ? COLORS.greenLight : COLORS.orangeLight }
                    ]}>
                      <Text style={[
                        styles.statusPillText,
                        { color: isPaid ? COLORS.green : COLORS.orange }
                      ]}>
                        {pmt.status}
                      </Text>
                    </View>
                    <Text style={styles.paymentDate}>{pmt.date}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  subTabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginTop: 12,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  subTabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    position: 'relative',
  },
  subTabBtnActive: {},
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  subTabTextActive: {
    color: COLORS.green,
    fontWeight: '700',
  },
  subTabIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 12,
    right: 12,
    height: 2.5,
    backgroundColor: COLORS.green,
    borderRadius: 2,
  },
  totalEarningsCard: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  totalEarningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalEarningsLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  growthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  growthPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.green,
  },
  totalEarningsValue: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 8,
  },
  totalEarningsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalEarningsPeriod: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  totalEarningsVs: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  withdrawBtn: {
    height: 48,
    backgroundColor: COLORS.green,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  withdrawBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  recentSection: {},
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.blue,
  },
  paymentsList: {
    gap: 12,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  paymentThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  paymentDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  paymentJobTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  paymentJobSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  paymentRightCol: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paymentDate: {
    fontSize: 10,
    color: COLORS.textLight,
  },
});
