import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../../constants/Config';
import { getStoredUser, getToken } from '../../constants/Auth';
import SocketService from '../../utils/SocketService';

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

interface EarningsSummary {
  totalEarnings: number;
  totalPending: number;
  totalPaid: number;
  availableToWithdraw: number;
  totalWithdrawn: number;
  growthPercent: number;
  period: string;
}

interface PaymentItem {
  _id: string;
  workspaceId: string;
  projectTitle: string;
  projectType: string;
  client: { fullName: string; avatarUrl?: string; city?: string } | null;
  amount: number;
  type: string;
  status: string;
  date: string;
}

const PROJECT_TYPE_IMAGES: Record<string, string> = {
  Residential: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=200&q=80',
  Commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=200&q=80',
  Renovation: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=200&q=80',
  Interior: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=200&q=80',
  Civil: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=200&q=80',
  default: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=200&q=80',
};

export default function EarningsScreen() {
  const router = useRouter();
  const [activeSubTab, setActiveSubTab] = useState<'This Month' | 'All Time' | 'Payouts'>('This Month');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [walletData, setWalletData] = useState<any>(null);
  const [ledgerTransactions, setLedgerTransactions] = useState<any[]>([]);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0,
    totalPending: 0,
    totalPaid: 0,
    availableToWithdraw: 0,
    totalWithdrawn: 0,
    growthPercent: 0,
    period: 'thisMonth',
  });
  const [recentPayments, setRecentPayments] = useState<PaymentItem[]>([]);
  const [directJobs, setDirectJobs] = useState<any[]>([]);

  const fetchEarningsData = useCallback(async (labourId: string, period: string) => {
    try {
      // Get auth token for authenticated endpoints
      const token = await getToken();
      const authHeaders: Record<string, string> = token
        ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      // Fetch wallet, ledger transactions, direct completed jobs, and workspace earnings in parallel
      const [walletRes, ledgerRes, jobsRes, summaryRes, paymentsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/wallet/${labourId}`, { headers: authHeaders }).catch(() => null),
        fetch(`${BACKEND_URL}/api/wallet/${labourId}/transactions?limit=15`, { headers: authHeaders }).catch(() => null),
        fetch(`${BACKEND_URL}/api/jobs/history/user/${labourId}?role=worker&limit=15`).catch(() => null),
        fetch(`${BACKEND_URL}/api/earnings/${labourId}?period=${period}`, { headers: authHeaders }).catch(() => null),
        fetch(`${BACKEND_URL}/api/earnings/${labourId}/payments?period=${period}&limit=5`, { headers: authHeaders }).catch(() => null),
      ]);

      let wData = null;
      if (walletRes && walletRes.ok) {
        const wJson = await walletRes.json();
        if (wJson.success && wJson.wallet) {
          wData = wJson.wallet;
          setWalletData(wData);
        }
      }

      if (ledgerRes && ledgerRes.ok) {
        const lJson = await ledgerRes.json();
        if (lJson.success && lJson.transactions) {
          setLedgerTransactions(lJson.transactions);
        }
      }

      let directJobsList: any[] = [];
      if (jobsRes && jobsRes.ok) {
        const jJson = await jobsRes.json();
        if (jJson.success && jJson.jobs) {
          directJobsList = jJson.jobs;
          setDirectJobs(directJobsList);
        }
      }

      let sData: any = {};
      if (summaryRes && summaryRes.ok) {
        sData = await summaryRes.json();
      }

      if (paymentsRes && paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setRecentPayments(paymentsData.payments || []);
      }

      // Calculate direct booking completed earnings (e.g. ₹720 net from ₹800 painting job)
      const directJobsTotal = directJobsList.reduce(
        (sum: number, j: any) => sum + (Number(j.workerNetEarning) || Math.round(Number(j.finalAmount || 0) * 0.9)),
        0
      );

      // Wallet (from /api/wallet) and sData (from /api/earnings) both call getWorkerWallet()
      // and return the SAME totalEarnings — avoid double-counting.
      // Priority: wallet > earnings API > directJobsTotal (as fallback)
      const walletNet = Number(wData?.totalEarnings) || Number(wData?.netEarnings) || Number(wData?.totalEarned) || 0;
      const earningsApiNet = Number(sData?.totalEarnings) || Number(sData?.netEarnings) || 0;
      // Use whichever authoritative source is available, falling back to directJobsTotal
      const totalEarned = walletNet || earningsApiNet || directJobsTotal;
      console.log('[Earnings] walletNet:', walletNet, 'earningsApiNet:', earningsApiNet, 'directJobsTotal:', directJobsTotal, '=> totalEarned:', totalEarned);

      const availableToWithdraw = wData
        ? Math.max(0, wData.availableBalance !== undefined ? wData.availableBalance : wData.balance)
        : (sData?.availableToWithdraw || 0);
      const totalWithdrawn = wData?.totalWithdrawn || sData?.totalWithdrawn || 0;
      const totalPaid = totalEarned;

      setSummary({
        totalEarnings: totalEarned,
        totalPending: wData?.pendingWithdrawal || sData?.totalPending || 0,
        totalPaid: totalPaid,
        availableToWithdraw: availableToWithdraw,
        totalWithdrawn: totalWithdrawn,
        growthPercent: sData?.growthPercent || 0,
        period: period,
      });
    } catch (err) {
      console.error('Error fetching earnings data:', err);
    }
  }, []);

  const initUser = useCallback(async () => {
    let user = (global as any).currentUser;
    if (!user) {
      const stored = await getStoredUser();
      if (stored) {
        try {
          user = typeof stored === 'string' ? JSON.parse(stored) : stored;
        } catch (e) {}
      }
    }
    if (user?._id) {
      setUserId(user._id);
      return user._id;
    }
    return null;
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const id = await initUser();
      if (id) {
        const period = activeSubTab === 'This Month' ? 'thisMonth' : 'allTime';
        await fetchEarningsData(id, period);
      }
      setLoading(false);
    };
    load();
  }, [activeSubTab]);

  // Real-time authoritative socket synchronization for wallet & jobs
  useEffect(() => {
    if (!userId) return;

    const handleRealtimeUpdate = (data: any) => {
      console.log('[Earnings] Real-time wallet/job update received:', data);
      const period = activeSubTab === 'This Month' ? 'thisMonth' : 'allTime';
      fetchEarningsData(userId, period);
    };

    SocketService.on('wallet_updated', handleRealtimeUpdate);
    SocketService.on('job_settled', handleRealtimeUpdate);
    SocketService.on('job_payment_completed', handleRealtimeUpdate);
    SocketService.on('job_history_updated', handleRealtimeUpdate);

    return () => {
      SocketService.off('wallet_updated', handleRealtimeUpdate);
      SocketService.off('job_settled', handleRealtimeUpdate);
      SocketService.off('job_payment_completed', handleRealtimeUpdate);
      SocketService.off('job_history_updated', handleRealtimeUpdate);
    };
  }, [userId, activeSubTab, fetchEarningsData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      const period = activeSubTab === 'This Month' ? 'thisMonth' : 'allTime';
      await fetchEarningsData(userId, period);
    }
    setRefreshing(false);
  }, [userId, activeSubTab]);

  const handleSubTabPress = (tab: 'This Month' | 'All Time' | 'Payouts') => {
    if (tab === 'Payouts') {
      router.push('/payout-history');
      return;
    }
    setActiveSubTab(tab);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getPaymentImage = (projectType: string) => {
    return PROJECT_TYPE_IMAGES[projectType] || PROJECT_TYPE_IMAGES.default;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Earnings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13 }}>Loading earnings...</Text>
        </View>
      </SafeAreaView>
    );
  }

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.green]} tintColor={COLORS.green} />
        }
      >
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
            {summary.growthPercent !== 0 && (
              <View style={styles.growthPill}>
                <Feather
                  name={summary.growthPercent > 0 ? 'arrow-up-right' : 'arrow-down-right'}
                  size={13}
                  color={summary.growthPercent > 0 ? COLORS.green : '#EF4444'}
                  style={{ marginRight: 2 }}
                />
                <Text style={[styles.growthPillText, summary.growthPercent < 0 && { color: '#EF4444' }]}>
                  {summary.growthPercent > 0 ? '+' : ''}{summary.growthPercent}%
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.totalEarningsValue}>
            {formatCurrency(summary.totalEarnings)}
          </Text>

          <View style={styles.totalEarningsFooter}>
            <Text style={styles.totalEarningsPeriod}>{activeSubTab === 'This Month' ? 'This Month' : 'All Time'}</Text>
            <Text style={styles.totalEarningsVs}>vs last month</Text>
          </View>
        </View>

        {/* ================= OUTSTANDING COMMISSION BANNER ================= */}
        {walletData?.outstandingBalance > 0 && (
          <View style={{
            backgroundColor: '#FEF2F2',
            borderColor: '#FCA5A5',
            borderWidth: 1,
            borderRadius: 14,
            padding: 14,
            marginHorizontal: 16,
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Feather name="alert-circle" size={22} color="#DC2626" style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B' }}>
                Platform Commission Due: ₹{walletData.outstandingBalance}
              </Text>
              <Text style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                Pending from cash collections. Will be automatically deducted from future online payouts.
              </Text>
            </View>
          </View>
        )}

        {/* ================= 3 QUICK METRIC CARDS ================= */}
        <View style={styles.metricsRow}>
          {/* Available to Withdraw */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: COLORS.greenLight }]}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color={COLORS.green} />
            </View>
            <Text style={styles.metricLabel}>Available{'\n'}to Withdraw</Text>
            <Text style={styles.metricValue}>{formatCurrency(summary.availableToWithdraw)}</Text>
          </View>

          {/* Pending */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: COLORS.orangeLight }]}>
              <Feather name="clock" size={18} color={COLORS.orange} />
            </View>
            <Text style={styles.metricLabel}>Pending{'\n'}&nbsp;</Text>
            <Text style={styles.metricValue}>{formatCurrency(summary.totalPending)}</Text>
          </View>

          {/* Paid */}
          <View style={styles.metricCard}>
            <View style={[styles.metricIconWrap, { backgroundColor: COLORS.blueLight }]}>
              <Feather name="credit-card" size={18} color={COLORS.blue} />
            </View>
            <Text style={styles.metricLabel}>Total Paid{'\n'}&nbsp;</Text>
            <Text style={styles.metricValue}>{formatCurrency(summary.totalPaid)}</Text>
          </View>
        </View>

        {/* ================= WITHDRAW BUTTON ================= */}
        <TouchableOpacity
          style={[styles.withdrawBtn, summary.availableToWithdraw <= 0 && { opacity: 0.5 }]}
          activeOpacity={0.85}
          onPress={() => {
            if (summary.availableToWithdraw > 0) {
              router.push('/withdraw-earnings');
            }
          }}
          disabled={summary.availableToWithdraw <= 0}
        >
          <Text style={styles.withdrawBtnText}>
            {summary.availableToWithdraw > 0
              ? `Withdraw ${formatCurrency(summary.availableToWithdraw)}`
              : 'No Balance to Withdraw'}
          </Text>
          {summary.availableToWithdraw > 0 && (
            <Feather name="arrow-right" size={18} color={COLORS.white} style={{ marginLeft: 6 }} />
          )}
        </TouchableOpacity>

        {/* ================= WALLET LEDGER TRANSACTIONS ================= */}
        {ledgerTransactions && ledgerTransactions.length > 0 && (
          <View style={[styles.recentSection, { marginBottom: 20 }]}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Wallet Ledger & Jobs</Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted }}>Live Authoritative</Text>
            </View>

            <View style={styles.paymentsList}>
              {ledgerTransactions.map((tx: any) => {
                const isCredit = tx.type.includes('CREDIT') || tx.type.includes('EARNING') || tx.amount > 0;
                return (
                  <View key={tx._id} style={styles.paymentCard}>
                    <View style={[
                      styles.metricIconWrap, 
                      { 
                        backgroundColor: isCredit ? COLORS.greenLight : '#FEE2E2',
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        marginRight: 12
                      }
                    ]}>
                      <MaterialCommunityIcons 
                        name={isCredit ? "cash-plus" : "cash-minus"} 
                        size={22} 
                        color={isCredit ? COLORS.green : '#DC2626'} 
                      />
                    </View>

                    <View style={styles.paymentDetails}>
                      <Text style={styles.paymentJobTitle} numberOfLines={1}>
                        {tx.description || tx.type}
                      </Text>
                      <Text style={styles.paymentJobSub} numberOfLines={1}>
                        Balance After: ₹{tx.balanceAfter !== undefined ? tx.balanceAfter : '—'}
                      </Text>
                    </View>

                    <View style={styles.paymentRightCol}>
                      <Text style={[styles.paymentAmount, { color: isCredit ? COLORS.green : '#DC2626' }]}>
                        {isCredit ? '+' : ''}₹{Math.abs(tx.amount)}
                      </Text>
                      <Text style={styles.paymentDate}>
                        {formatDate(tx.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ================= COMPLETED DIRECT JOBS ================= */}
        {directJobs && directJobs.length > 0 && (
          <View style={[styles.recentSection, { marginBottom: 20 }]}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Completed Bookings & Jobs</Text>
              <Text style={{ fontSize: 12, color: COLORS.green, fontWeight: '700' }}>
                {directJobs.length} Completed
              </Text>
            </View>

            <View style={styles.paymentsList}>
              {directJobs.map((j: any) => (
                <View key={j._id || j.jobId} style={styles.paymentCard}>
                  <View style={[
                    styles.metricIconWrap, 
                    { 
                      backgroundColor: '#DCFCE7',
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      marginRight: 12
                    }
                  ]}>
                    <MaterialCommunityIcons 
                      name="briefcase-check" 
                      size={22} 
                      color={COLORS.green} 
                    />
                  </View>

                  <View style={styles.paymentDetails}>
                    <Text style={styles.paymentJobTitle} numberOfLines={1}>
                      {j.service} for {j.clientName || 'Client'}
                    </Text>
                    <Text style={styles.paymentJobSub} numberOfLines={1}>
                      {j.paymentMethod || 'Online'} • {j.clientLocation?.address ? String(j.clientLocation.address).split(',')[0] : 'Mumbai'}
                    </Text>
                  </View>

                  <View style={styles.paymentRightCol}>
                    <Text style={[styles.paymentAmount, { color: COLORS.green }]}>
                      +₹{j.workerNetEarning || Math.round(Number(j.finalAmount) * 0.9)}
                    </Text>
                    <Text style={styles.paymentDate}>
                      {formatDate(j.completedAt || j.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================= RECENT PAYMENTS ================= */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Project Payments</Text>
            <TouchableOpacity onPress={() => router.push('/payout-history')} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentPayments.length === 0 ? (
            <View style={styles.emptyPayments}>
              <MaterialCommunityIcons name="cash-remove" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyPaymentsTitle}>No project payments yet</Text>
              <Text style={styles.emptyPaymentsDesc}>
                Direct bookings and project milestones will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.paymentsList}>
              {recentPayments.map((pmt) => {
                const isPaid = pmt.status === 'Paid';
                return (
                  <TouchableOpacity
                    key={pmt._id}
                    style={styles.paymentCard}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: isPaid ? '/payment-details' : '/payment-status',
                        params: { paymentId: pmt._id, workspaceId: pmt.workspaceId },
                      })
                    }
                  >
                    <Image
                      source={{ uri: getPaymentImage(pmt.projectType) }}
                      style={styles.paymentThumb}
                      contentFit="cover"
                    />

                    <View style={styles.paymentDetails}>
                      <Text style={styles.paymentJobTitle} numberOfLines={1}>
                        {pmt.type === 'Advance' ? `Advance - ${pmt.projectTitle}` : pmt.projectTitle}
                      </Text>
                      <Text style={styles.paymentJobSub} numberOfLines={1}>
                        {pmt.client?.fullName || pmt.projectType}
                      </Text>
                    </View>

                    <View style={styles.paymentRightCol}>
                      <Text style={styles.paymentAmount}>{formatCurrency(pmt.amount)}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: isPaid ? COLORS.greenLight : COLORS.orangeLight },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: isPaid ? COLORS.green : COLORS.orange },
                          ]}
                        >
                          {pmt.status}
                        </Text>
                      </View>
                      <Text style={styles.paymentDate}>{formatDate(pmt.date)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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
  emptyPayments: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyPaymentsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyPaymentsDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
});
