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
import { notifyClearActiveJob } from '../context/ActiveJobContext';
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
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [firebaseIdToken, setFirebaseIdToken] = useState(params.idToken || '');
  const [isPhoneVerified, setIsPhoneVerified] = useState(!!params.idToken);
  
  // OTP Verification States
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<any>(null);

  // In-app banner notice
  interface BannerNotice {
    type: 'error' | 'success' | 'info';
    title?: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
  }
  const [bannerNotice, setBannerNotice] = useState<BannerNotice | null>(null);

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
      const raw = String(params.verifiedPhone).replace(/\D/g, '');
      setPhoneNumber(raw.slice(-10));
      setIsPhoneVerified(true);
    }
    if (params.idToken) {
      setFirebaseIdToken(String(params.idToken));
      setIsPhoneVerified(true);
    }
  }, [params.verifiedPhone, params.idToken]);

  const validateIndianMobile = (num: string): { valid: boolean; error?: string } => {
    const digits = num.replace(/\D/g, '');
    if (!digits || digits.length === 0) {
      return { valid: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
      return { valid: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    return { valid: true };
  };

  const handleSendOtp = async () => {
    const validation = validateIndianMobile(phoneNumber);
    if (!validation.valid) {
      setPhoneError(validation.error || 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setPhoneError(null);
    setBannerNotice(null);
    setIsLoading(true);

    try {
      const result = await sendFirebaseOtp(phoneNumber);
      if (result.success && result.confirmation) {
        setConfirmationResult(result.confirmation);
        setOtpSent(true);
        setResendTimer(30);
        setBannerNotice({
          type: 'success',
          title: 'OTP Sent',
          message: `A 6-digit verification code has been sent to +91 ${phoneNumber.replace(/\D/g, '').slice(-10)}`,
        });
      } else {
        setBannerNotice({
          type: 'error',
          title: result.title || 'OTP Error',
          message: result.message || 'Could not send verification code.',
        });
      }
    } catch (err: any) {
      console.error('[SignupScreen] Error sending OTP:', err);
      setBannerNotice({
        type: 'error',
        title: 'Something went wrong',
        message: 'Please check your internet connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      setBannerNotice({
        type: 'error',
        title: 'Incorrect OTP',
        message: 'Please enter the 6-digit code received via SMS.',
        actionText: 'Try Again',
        onAction: () => setOtpCode(''),
      });
      return;
    }

    setBannerNotice(null);
    setIsLoading(true);

    try {
      const verifyRes = await verifyFirebaseOtp(confirmationResult, otpCode);
      if (verifyRes.success && verifyRes.idToken) {
        setFirebaseIdToken(verifyRes.idToken);
        setIsPhoneVerified(true);
        setOtpSent(false);
        setBannerNotice({
          type: 'success',
          title: 'Phone Verified',
          message: 'Phone number verified successfully! You can now finish creating your account.',
        });
      } else {
        const isExpired = verifyRes.code === 'auth/session-expired' || verifyRes.code === 'EXPIRED_OTP';
        setBannerNotice({
          type: 'error',
          title: verifyRes.title || (isExpired ? 'This OTP has expired.' : 'Incorrect OTP'),
          message: verifyRes.message || (isExpired ? 'Please request a new OTP to continue.' : 'Please check the OTP and try again.'),
          actionText: isExpired ? 'Resend OTP' : 'Try Again',
          onAction: isExpired ? () => handleSendOtp() : () => setOtpCode(''),
        });
      }
    } catch (err: any) {
      console.error('[SignupScreen] OTP verification error:', err);
      setBannerNotice({
        type: 'error',
        title: 'Something went wrong',
        message: 'Please check your internet connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setBannerNotice(null);

    if (!fullName || !fullName.trim()) {
      setBannerNotice({
        type: 'error',
        title: 'Missing Field',
        message: 'Please enter your Full Name.',
      });
      return;
    }

    const validation = validateIndianMobile(phoneNumber);
    if (!validation.valid) {
      setPhoneError(validation.error || 'Please enter a valid 10-digit mobile number.');
      setBannerNotice({
        type: 'error',
        title: 'Invalid Phone Number',
        message: 'Please enter a valid 10-digit mobile number.',
      });
      return;
    }

    if (!city || !city.trim()) {
      setBannerNotice({
        type: 'error',
        title: 'Missing Field',
        message: 'Please enter your City.',
      });
      return;
    }

    // Phone verification is COMPULSORY for new account creation
    if (!isPhoneVerified || !firebaseIdToken) {
      if (!otpSent) {
        setBannerNotice({
          type: 'info',
          title: 'Verification Required',
          message: 'Please verify your mobile number with OTP before creating an account.',
          actionText: 'Get OTP',
          onAction: handleSendOtp,
        });
        return;
      }
      setBannerNotice({
        type: 'info',
        title: 'OTP Required',
        message: 'Please enter the 6-digit OTP code received on your phone and tap Verify.',
      });
      return;
    }

    if (password && password.length < 6) {
      setBannerNotice({
        type: 'error',
        title: 'Weak Password',
        message: 'Password must be at least 6 characters if provided.',
      });
      return;
    }

    if (password && password !== confirmPassword) {
      setBannerNotice({
        type: 'error',
        title: 'Password Mismatch',
        message: 'Passwords do not match.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const rawDigits = phoneNumber.replace(/\D/g, '');
      const response = await fetch(`${BACKEND_URL}/api/auth/firebase-phone-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: firebaseIdToken,
          phoneNumber: rawDigits.slice(-10),
          fullName: fullName.trim(),
          role,
          city: city.trim(),
          email: email && email.trim() ? email.trim().toLowerCase() : undefined,
          password: password && password.trim() ? password.trim() : undefined,
          language: getLocalLanguage() || 'en',
        }),
      });

      let data: any;
      try {
        data = await response.json();
      } catch (e) {
        setBannerNotice({
          type: 'error',
          title: 'Server Error',
          message: 'Unexpected server response. Please try again.',
        });
        setIsLoading(false);
        return;
      }

      if (response.ok && data.success) {
        const signupToken = data.token || data.user?._id;
        if (signupToken) {
          notifyClearActiveJob();
          await saveToken(signupToken);
          await saveStoredUser(data.user);
          (global as any).currentUser = data.user;
        }

        if (data.user?.role === 'Architect') {
          router.replace('/architect-profile');
        } else if (data.user?.role === 'Contractor') {
          router.replace('/contractor-profile');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        setBannerNotice({
          type: 'error',
          title: 'Registration Failed',
          message: data.message || 'Could not complete registration.',
        });
      }
    } catch (err) {
      console.error('[SignupScreen] Firebase register error:', err);
      setBannerNotice({
        type: 'error',
        title: 'Something went wrong',
        message: 'Please check your internet connection and try again.',
      });
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

            {/* Verified Phone Banner */}
            {isPhoneVerified && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#ECFDF5',
                borderWidth: 1,
                borderColor: '#A7F3D0',
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 20,
              }}>
                <Feather name="check-circle" size={18} color="#059669" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46' }}>
                    Phone Verified (+91 {phoneNumber.slice(-10)})
                  </Text>
                  <Text style={{ fontSize: 12, color: '#047857', marginTop: 1 }}>
                    Enter your details below to finish setting up your Allver account.
                  </Text>
                </View>
              </View>
            )}

            {/* In-App Notification Banner */}
            {bannerNotice && (
              <View style={[
                styles.bannerContainer,
                bannerNotice.type === 'error' ? styles.bannerError :
                bannerNotice.type === 'success' ? styles.bannerSuccess : styles.bannerInfo
              ]}>
                <View style={styles.bannerIconCol}>
                  <Feather
                    name={bannerNotice.type === 'error' ? 'alert-circle' : bannerNotice.type === 'success' ? 'check-circle' : 'info'}
                    size={20}
                    color={bannerNotice.type === 'error' ? '#DC2626' : bannerNotice.type === 'success' ? '#16A34A' : '#2563EB'}
                  />
                </View>
                <View style={styles.bannerTextCol}>
                  {bannerNotice.title ? (
                    <Text style={[
                      styles.bannerTitle,
                      bannerNotice.type === 'error' ? styles.bannerTextError :
                      bannerNotice.type === 'success' ? styles.bannerTextSuccess : styles.bannerTextInfo
                    ]}>
                      {bannerNotice.title}
                    </Text>
                  ) : null}
                  <Text style={[
                    styles.bannerMessage,
                    bannerNotice.type === 'error' ? styles.bannerTextError :
                    bannerNotice.type === 'success' ? styles.bannerTextSuccess : styles.bannerTextInfo
                  ]}>
                    {bannerNotice.message}
                  </Text>
                  {bannerNotice.actionText && bannerNotice.onAction && (
                    <TouchableOpacity
                      style={styles.bannerActionBtn}
                      onPress={bannerNotice.onAction}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.bannerActionBtnText}>{bannerNotice.actionText}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.bannerCloseBtn}
                  onPress={() => setBannerNotice(null)}
                >
                  <Feather name="x" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>
            )}

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

              {/* Phone (Compulsory with Firebase OTP Verification) */}
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.label}>
                    {t('phoneNumber') || 'Phone Number'} <Text style={styles.req}>*</Text>
                    {isPhoneVerified && <Text style={{ color: COLORS.green, fontWeight: '700' }}> (Verified ✓)</Text>}
                  </Text>
                  {!isPhoneVerified && phoneNumber.length === 10 && !otpSent && (
                    <TouchableOpacity
                      onPress={handleSendOtp}
                      disabled={isLoading}
                      style={{
                        backgroundColor: '#ECFDF5',
                        borderWidth: 1,
                        borderColor: '#A7F3D0',
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#047857', fontWeight: '700' }}>
                        {isLoading ? 'Sending...' : 'Verify with OTP'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {!isPhoneVerified && otpSent && (
                    <TouchableOpacity onPress={handleSendOtp} disabled={isLoading || resendTimer > 0}>
                      <Text style={{ fontSize: 12, color: resendTimer > 0 ? COLORS.textMuted : COLORS.green, fontWeight: '700' }}>
                        {resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend OTP'}
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
                      setFirebaseIdToken('');
                    }}
                  />
                  {isPhoneVerified ? (
                    <Feather name="check-circle" size={18} color={COLORS.green} style={styles.inputIcon} />
                  ) : null}
                </View>
                {phoneError && (
                  <Text style={styles.inlineErrorText}>{phoneError}</Text>
                )}
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
                        paddingHorizontal: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      onPress={handleVerifyOtp}
                      disabled={isLoading}
                    >
                      <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>Verify</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Email (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('email')} <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 'normal' }}>(Optional)</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="mail" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com (Optional)"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

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

              {/* Password (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('password')} <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 'normal' }}>(Optional)</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Optional (Min 6 characters)"
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

              {/* Confirm Password (Optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('confirmPassword')} <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 'normal' }}>(Optional)</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password (if provided)"
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

  /* In-App Notification Banner Styles */
  bannerContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerSuccess: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  bannerInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  bannerIconCol: {
    marginTop: 2,
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  bannerTextError: {
    color: '#991B1B',
  },
  bannerTextSuccess: {
    color: '#166534',
  },
  bannerTextInfo: {
    color: '#1E40AF',
  },
  bannerActionBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  bannerActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bannerCloseBtn: {
    padding: 2,
  },

  /* Inline Error */
  inlineErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },
});
