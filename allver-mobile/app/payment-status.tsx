import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, Dimensions } from 'react-native';
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
  orange: '#D97706',
  orangeLight: '#FEF3C7',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
};

export default function PaymentStatusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const TIMELINE_STEPS = [
    {
      id: 'step-1',
      title: 'Job Completed',
      date: '4 Sept 2026, 11:00 AM',
      description: 'You marked the job as completed.',
      status: 'completed', // completed | active | upcoming
    },
    {
      id: 'step-2',
      title: 'Client Payment',
      date: '4 Sept 2026, 11:30 AM',
      description: 'Client has made the payment.',
      status: 'completed',
    },
    {
      id: 'step-3',
      title: 'Processing',
      date: 'Expected by 7 Sept 2026',
      description: 'Payment is being verified and processed.',
      status: 'active',
    },
    {
      id: 'step-4',
      title: 'Added to Earnings',
      date: '',
      description: 'Will be added after verification.',
      status: 'upcoming',
    },
    {
      id: 'step-5',
      title: 'Available to Withdraw',
      date: '',
      description: 'You can withdraw once it is added to your earnings.',
      status: 'upcoming',
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
            source={{ uri: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80' }}
            style={styles.jobThumb}
            contentFit="cover"
          />
          <View style={styles.jobDetails}>
            <Text style={styles.jobTitle}>Plumbing Repair</Text>
            <Text style={styles.jobSubtitle}>Dadar, Mumbai</Text>
            <View style={styles.amountStatusRow}>
              <Text style={styles.jobAmount}>₹2,000</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
            </View>
            <Text style={styles.jobDateText}>Completed on 4 Sept 2026</Text>
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
                Contact our support team if the payment is delayed.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.contactSupportBtn}
            onPress={() => {
              Linking.openURL('tel:+919876543210');
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
