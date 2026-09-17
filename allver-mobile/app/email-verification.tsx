import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import EmailVerificationCard from '../components/EmailVerificationCard';
import { getStoredUser, saveStoredUser } from '../constants/Auth';

const COLORS = {
  white: '#FFFFFF',
  bgLight: '#F8FAFC',
  textDark: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  green: '#10B981',
  greenLight: '#D1FAE5',
  greenDark: '#059669',
};

export default function EmailVerificationScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await getStoredUser();
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        } else if ((global as any).currentUser) {
          setCurrentUser((global as any).currentUser);
        }
      } catch (e) {
        console.error('Error loading stored user in EmailVerificationScreen:', e);
      }
    };
    loadUser();
  }, []);

  const handleVerificationSuccess = async (updatedUser: any) => {
    setCurrentUser(updatedUser);
    await saveStoredUser(updatedUser);
    (global as any).currentUser = updatedUser;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Informational Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <MaterialIcons name="mark-email-read" size={32} color={COLORS.green} />
          </View>
          <Text style={styles.heroHeading}>Secure Your Account</Text>
          <Text style={styles.heroDesc}>
            Linking and verifying your email ensures you never miss milestone payments, signed contracts, or client inquiries.
          </Text>
        </View>

        {/* Email Verification Card */}
        <EmailVerificationCard
          initialEmail={currentUser?.email || ''}
          initialVerified={Boolean(currentUser?.emailVerified)}
          userId={currentUser?._id}
          onVerificationSuccess={handleVerificationSuccess}
        />

        {/* How It Works Checklist */}
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>How Verification Works</Text>
          
          <View style={styles.stepRow}>
            <View style={styles.stepNumWrap}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Enter your Email Address</Text>
              <Text style={styles.stepSub}>We will attach this email to your verified phone account.</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumWrap}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Check your Inbox</Text>
              <Text style={styles.stepSub}>Click the secure verification link sent by Firebase Auth.</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={styles.stepNumWrap}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View style={styles.stepTextCol}>
              <Text style={styles.stepTitle}>Confirm in App</Text>
              <Text style={styles.stepSub}>Tap "Already verified? Check again" to synchronize status.</Text>
            </View>
          </View>
        </View>

        {/* Tip / Note */}
        <View style={styles.tipBox}>
          <Feather name="shield" size={16} color={COLORS.greenDark} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.tipText}>
            Your phone number remains your primary login. Adding an email will never create a separate account or overwrite your phone credentials.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bgLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepNumWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  stepSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  tipBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.greenLight,
    padding: 12,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.greenDark,
    lineHeight: 16,
  },
});
