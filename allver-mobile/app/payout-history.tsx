import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { getStoredUser } from '../constants/Auth';

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
  red: '#EF4444',
  redLight: '#FEE2E2',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
};

interface WithdrawalItem {
  _id: string;
  amount: number;
  status: string;
  bankName: string;
  accountLast4: string;
  requestedAt: string;
  completedAt?: string;
}

export default function PayoutHistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);

  const fetchWithdrawals = useCallback(async (labourId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/earnings/${labourId}/withdrawals`);
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data.withdrawals || []);
      }
    } catch (err) {
      console.error('Error fetching withdrawal history:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
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
        await fetchWithdrawals(user._id);
      }
      setLoading(false);
    };
    load();
  }, [fetchWithdrawals]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userId) {
      await fetchWithdrawals(userId);
    }
    setRefreshing(false);
  }, [userId, fetchWithdrawals]);

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
          <Text style={styles.headerTitle}>Payout History</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.green} />
          <Text style={{ marginTop: 12, color: COLORS.textMuted, fontSize: 13 }}>Loading payouts...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Payout History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.green]} tintColor={COLORS.green} />
        }
      >
        {withdrawals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="cash-refund" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Payouts Yet</Text>
            <Text style={styles.emptyDesc}>
              When you withdraw money from your available earnings, your payout requests will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.payoutsList}>
            {withdrawals.map((payout) => {
              const isCompleted = payout.status === 'Completed';
              const isProcessing = payout.status === 'Processing';
              const isFailed = payout.status === 'Failed';

              let iconBg = COLORS.greenLight;
              let iconColor = COLORS.green;
              let iconName: any = 'arrow-down';
              let badgeBg = COLORS.greenLight;
              let badgeColor = COLORS.green;

              if (isProcessing) {
                iconBg = COLORS.orangeLight;
                iconColor = COLORS.orange;
                iconName = 'clock';
                badgeBg = COLORS.orangeLight;
                badgeColor = COLORS.orange;
              } else if (isFailed) {
                iconBg = COLORS.redLight;
                iconColor = COLORS.red;
                iconName = 'alert-circle';
                badgeBg = COLORS.redLight;
                badgeColor = COLORS.red;
              }

              return (
                <View key={payout._id} style={styles.payoutCard}>
                  <View style={[styles.statusIconWrap, { backgroundColor: iconBg }]}>
                    <Feather name={iconName} size={18} color={iconColor} />
                  </View>

                  <View style={styles.payoutDetails}>
                    <View style={styles.amountStatusRow}>
                      <Text style={styles.payoutAmount}>{formatCurrency(payout.amount)}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                          {payout.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.bankText}>
                      Withdraw to {payout.bankName} (•••• {payout.accountLast4})
                    </Text>
                    <Text style={styles.dateText}>{formatDate(payout.requestedAt)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ================= INFO BANNER ================= */}
        <View style={styles.infoBanner}>
          <View style={styles.infoIconWrap}>
            <Feather name="info" size={16} color={COLORS.blue} />
          </View>
          <Text style={styles.infoText}>
            Withdrawals are usually completed within 24 hours. In some cases, it may take up to 2-3 business days.
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
  payoutsList: {
    gap: 12,
    marginBottom: 20,
  },
  payoutCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  statusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  payoutDetails: {
    flex: 1,
  },
  amountStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bankText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 3,
  },
  dateText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.blueLight,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
  },
  infoIconWrap: {
    marginRight: 10,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
    fontWeight: '500',
  },
});
