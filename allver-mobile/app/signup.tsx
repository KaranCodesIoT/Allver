import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Alert, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { useTranslation, getLocalLanguage } from '../utils/i18n';
import { saveToken, saveStoredUser } from '../constants/Auth';
import { sendFirebaseOtp, verifyFirebaseOtp } from '../utils/FirebaseAuthService';

const COLORS = {
  green: '#1BC47D',
  greenLight: '#E8FAF0',
  greenBorder: 'rgba(27, 196, 125, 0.3)',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  inputBg: '#FFFFFF',
  inputBorder: '#E5E7EB',
  inputBorderFocus: '#1BC47D',
  textDark: '#111827',
  textMuted: '#9CA3AF',
  textLabel: '#374151',
  red: '#EF4444',
  teal: '#0F4C43',
};

const ROLES = [
  { title: 'Architect', icon: 'compass', type: 'feather' },
  { title: 'Contractor', icon: 'hard-hat', type: 'fa5' },
  { title: 'Labour', icon: 'tool', type: 'feather' },
  { title: 'Client', icon: 'user', type: 'feather' },
];

const showAlert = (title: string, message: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    alert(`${title}\n\n${message}`);
    if (buttons && buttons.length > 0 && buttons[0].onPress) {
      buttons[0].onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ verifiedPhone?: string; idToken?: string }>();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(params.verifiedPhone ? params.verifiedPhone.replace('+91', '').trim() : '');
  const [firebaseIdToken, setFirebaseIdToken] = useState(params.idToken || '');
  const [isPhoneVerified, setIsPhoneVerified] = useState(!!params.idToken);
  
  // OTP Verification States
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<any>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Client');
  const [city, setCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendTimer]);

  // Sync params if passed
  useEffect(() => {
    if (params.verifiedPhone) {
      setPhoneNumber(params.verifiedPhone.replace('+91', '').trim());
      setIsPhoneVerified(true);
    }
    if (params.idToken) {
      setFirebaseIdToken(params.idToken);
      setIsPhoneVerified(true);
    }
  }, [params.verifiedPhone, params.idToken]);

  const handleSendOtp = async () => {
    const rawDigits = phoneNumber.replace(/\D/g, '');
    if (!rawDigits || rawDigits.length < 10) {
      showAlert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendFirebaseOtp(phoneNumber);
      if (result.success && result.confirmation) {
        setConfirmationResult(result.confirmation);
        setOtpSent(true);
        setResendTimer(30);
        showAlert('OTP Sent', `A 6-digit verification code has been sent to +91 ${rawDigits.slice(-10)}`);
      } else {
        showAlert('OTP Error', result.message || 'Could not send verification code.');
      }
    } catch (err: any) {
      console.error('[SignupScreen] Error sending OTP:', err);
      showAlert('Error', err.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      showAlert('Invalid OTP', 'Please enter the 6-digit code received via SMS.');
      return;
    }

    setIsLoading(true);
    try {
      const verifyRes = await verifyFirebaseOtp(confirmationResult, otpCode);
      if (verifyRes.success && verifyRes.idToken) {
        setFirebaseIdToken(verifyRes.idToken);
        setIsPhoneVerified(true);
        setOtpSent(false);
        showAlert('Verified', 'Phone number verified successfully!');
      } else {
        showAlert('Verification Failed', verifyRes.message || 'Incorrect OTP code.');
      }
    } catch (err: any) {
      console.error('[SignupScreen] OTP verification error:', err);
      showAlert('Error', err.message || 'Failed to verify OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!fullName || !city) {
      showAlert('Missing Fields', 'Please enter your Full Name and City.');
      return;
    }

    // If phone OTP was verified with Firebase
    if (isPhoneVerified && firebaseIdToken) {
      setIsLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/firebase-phone-register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken: firebaseIdToken,
            phoneNumber: phoneNumber.trim(),
            fullName: fullName.trim(),
            role,
            city: city.trim(),
            email: email.trim().toLowerCase(),
            language: getLocalLanguage() || 'en',
          }),
        });

        const data = await response.json();
        if (response.ok && data.success) {
          const signupToken = data.token || data.user?._id;
          if (signupToken) {
            await saveToken(signupToken);
            await saveStoredUser(data.user);
            (global as any).currentUser = data.user;
          }

          showAlert('Success', 'Account created successfully!', [
            {
              text: 'OK',
              onPress: () => {
                if (data.user?.role === 'Architect') {
                  router.replace('/architect-profile');
                } else if (data.user?.role === 'Contractor') {
                  router.replace('/contractor-profile');
                } else {
                  router.replace('/(tabs)');
                }
              },
            },
          ]);
        } else {
          showAlert('Registration Failed', data.message || 'Could not complete registration.');
        }
      } catch (err) {
        console.error('[SignupScreen] Firebase register error:', err);
        showAlert('Network Error', 'Could not connect to the server.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Standard Email + Password Register
    if (!email || !password) {
      showAlert('Missing Fields', 'Please fill in Email and Password, or verify your phone number with OTP.');
      return;
    }
    if (password.length < 6) {
      showAlert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email: email.trim().toLowerCase(),
          phoneNumber,
          password,
          role,
          city,
          language: getLocalLanguage() || 'en'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const signupToken = data.user?._id;
        if (signupToken) {
          await saveToken(signupToken);
          await saveStoredUser(data.user);
          (global as any).currentUser = data.user;
        }

        showAlert('Success', 'Account created successfully!', [
          {
            text: 'OK',
            onPress: () => {
              if (data.user?.role === 'Architect') {
                router.replace('/architect-profile');
              } else if (data.user?.role === 'Contractor') {
                router.replace('/contractor-profile');
              } else {
                router.replace('/(tabs)');
              }
            }
          },
        ]);
      } else {
        showAlert('Registration Failed', data.message || 'Something went wrong.');
      }
    } catch (err) {
      showAlert('Network Error', 'Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
                }}
                style={styles.backBtn}
              >
                <Feather name="arrow-left" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.title}>{t('createAccount')}</Text>
            <Text style={styles.subtitle}>
              {t('joinNetwork')}
            </Text>

            {/* ─── FORM ─── */}
            <View style={styles.form}>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('fullName')} <Text style={styles.req}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="user" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('enterFullName')}
                    placeholderTextColor={COLORS.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('email')} {!isPhoneVerified && <Text style={styles.req}>*</Text>}</Text>
                <View style={styles.inputWrap}>
                  <Feather name="mail" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={isPhoneVerified ? "you@example.com (Optional)" : "you@example.com"}
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Phone (with Firebase OTP Verification) */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.label}>{t('phoneNumber')} {isPhoneVerified && <Text style={{ color: COLORS.green, fontWeight: '700' }}>(Verified ✓)</Text>}</Text>
                  {!isPhoneVerified && phoneNumber.length === 10 && !otpSent && (
                    <TouchableOpacity onPress={handleSendOtp} disabled={isLoading}>
                      <Text style={{ fontSize: 12, color: COLORS.green, fontWeight: '700' }}>
                        Verify with OTP
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[styles.inputWrap, isPhoneVerified && { borderColor: COLORS.green, backgroundColor: COLORS.greenLight }]}>
                  <View style={{ paddingLeft: 14, paddingRight: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textDark }}>+91</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    editable={!isPhoneVerified && !isLoading}
                    onChangeText={(txt) => {
                      setPhoneNumber(txt.replace(/\D/g, ''));
                      setIsPhoneVerified(false);
                      setOtpSent(false);
                    }}
                  />
                  {isPhoneVerified ? (
                    <Feather name="check-circle" size={18} color={COLORS.green} style={styles.inputIcon} />
                  ) : null}
                </View>
              </View>

              {/* Inline OTP Input when OTP is sent */}
              {otpSent && !isPhoneVerified && (
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={styles.label}>Enter 6-digit OTP <Text style={styles.req}>*</Text></Text>
                    {resendTimer > 0 ? (
                      <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600' }}>
                        Resend in {resendTimer}s
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleSendOtp} disabled={isLoading}>
                        <Text style={{ fontSize: 12, color: COLORS.green, fontWeight: '700' }}>
                          Resend OTP
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={[styles.inputWrap, { flex: 1 }]}>
                      <Feather name="shield" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { letterSpacing: 4, fontWeight: '700' }]}
                        placeholder="••••••"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChangeText={setOtpCode}
                      />
                    </View>
                    <TouchableOpacity
                      style={{
                        backgroundColor: COLORS.green,
                        borderRadius: 14,
                        paddingHorizontal: 16,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={handleVerifyOtp}
                      disabled={isLoading}
                    >
                      <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>Verify</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* City */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('city')} <Text style={styles.req}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="map-pin" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('enterCity')}
                    placeholderTextColor={COLORS.textMuted}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('roleLabel')} <Text style={styles.req}>*</Text></Text>
                <View style={styles.roleRow}>
                  {ROLES.map((r) => {
                    const selected = role === r.title;
                    return (
                      <TouchableOpacity
                        key={r.title}
                        style={[styles.roleChip, selected && styles.roleChipSelected]}
                        onPress={() => setRole(r.title)}
                        activeOpacity={0.7}
                      >
                        {r.type === 'fa5' ? (
                          <FontAwesome5
                            name={r.icon}
                            size={13}
                            color={selected ? COLORS.white : COLORS.textMuted}
                          />
                        ) : (
                          <Feather
                            name={r.icon as any}
                            size={14}
                            color={selected ? COLORS.white : COLORS.textMuted}
                          />
                        )}
                        <Text style={[styles.roleChipText, selected && styles.roleChipTextSelected]}>
                          {r.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('password')} {!isPhoneVerified && <Text style={styles.req}>*</Text>}</Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={isPhoneVerified ? "Optional (Min 6 characters)" : "Min 6 characters"}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('confirmPassword')} {!isPhoneVerified && <Text style={styles.req}>*</Text>}</Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={isPhoneVerified ? "Re-enter password (if provided)" : "Re-enter password"}
                    placeholderTextColor={COLORS.textMuted}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {isLoading ? 'Creating Account...' : t('createAccount')}
              </Text>
              {!isLoading && (
                <View style={styles.arrowCircle}>
                  <Feather name="arrow-right" size={16} color={COLORS.green} />
                </View>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>{t('alreadyHaveAccount')}</Text>
                </TouchableOpacity>
              </Link>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },

  header: { marginTop: 8, marginBottom: 20 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
  },

  title: { fontSize: 28, fontWeight: '800', color: COLORS.textDark, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 28 },

  form: { gap: 18 },

  inputGroup: {},
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textLabel, marginBottom: 8, letterSpacing: 0.2 },
  req: { color: COLORS.red },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 14,
    height: 50,
  },
  inputIcon: { paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 14, color: COLORS.textDark, height: '100%' },
  eyeBtn: { paddingHorizontal: 14, height: '100%', justifyContent: 'center' },

  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    backgroundColor: COLORS.white,
    gap: 6,
  },
  roleChipSelected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  roleChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  roleChipTextSelected: { color: COLORS.white },

  primaryBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    paddingHorizontal: 20,
    marginTop: 28,
    ...Platform.select({
      ios: { shadowColor: COLORS.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  primaryBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'center', marginLeft: 28 },
  arrowCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 10 },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  footerLink: { color: COLORS.green, fontSize: 14, fontWeight: '700' },
});
