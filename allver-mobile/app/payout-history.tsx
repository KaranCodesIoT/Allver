import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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

export default function PayoutHistoryScreen() {
  const router = useRouter();

  const PAYOUTS = [
    {
      id: 'p-1',
      amount: '₹5,000',
      status: 'Completed',
      bankText: 'Withdraw to HDFC Bank (•••• 4821)',
      dateText: '6 Sept 2026, 10:15 AM',
    },
    {
      id: 'p-2',
      amount: '₹3,000',
      status: 'Completed',
      bankText: 'Withdraw to HDFC Bank (•••• 4821)',
      dateText: '29 Aug 2026, 4:20 PM',
    },
    {
      id: 'p-3',
      amount: '₹2,000',
      status: 'Processing',
      bankText: 'Withdraw to HDFC Bank (•••• 4821)',
      dateText: '6 Sept 2026, 2:10 PM',
    },
    {
      id: 'p-4',
      amount: '₹4,500',
      status: 'Completed',
      bankText: 'Withdraw to HDFC Bank (•••• 4821)',
      dateText: '12 Aug 2026, 11:05 AM',
    },
    {
      id: 'p-5',
      amount: '₹1,500',
      status: 'Failed',
      bankText: 'Withdraw to HDFC Bank (•••• 4821)',
      dateText: '20 Jul 2026, 6:30 PM',
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
        <Text style={styles.headerTitle}>Payout History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.payoutsList}>
          {PAYOUTS.map((payout) => {
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
              <View key={payout.id} style={styles.payoutCard}>
                <View style={[styles.statusIconWrap, { backgroundColor: iconBg }]}>
                  <Feather name={iconName} size={18} color={iconColor} />
                </View>

                <View style={styles.payoutDetails}>
                  <View style={styles.amountStatusRow}>
                    <Text style={styles.payoutAmount}>{payout.amount}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
                      <Text style={[styles.statusBadgeText, { color: badgeColor }]}>
                        {payout.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.bankText}>{payout.bankText}</Text>
                  <Text style={styles.dateText}>{payout.dateText}</Text>
                </View>
              </View>
            );
          })}
        </View>

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
