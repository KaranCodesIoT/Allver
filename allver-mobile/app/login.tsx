import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Alert,
  Dimensions, Image, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { useTranslation } from '../utils/i18n';
import { saveToken, saveStoredUser } from '../constants/Auth';
import { OTPWidget } from '@msg91comm/sendotp-react-native';

const { width, height } = Dimensions.get('window');

const COLORS = {
  teal: '#0F4C43',           // Deep teal matching mockup button
  tealDark: '#0B3630',       // Active teal dark
  tealLight: '#D1E8E3',
  gold: '#C4A94D',           // Gold color for lines & border
  goldBorder: '#DFD5C6',     // Metallic gold border
  darkBg: '#13171F',         // Dark slate grey/black matching mockup
  white: '#FFFFFF',
  offWhite: '#F4F5F7',
  inputBg: '#EDEFF2',        // Light grey input background
  inputBorder: '#E5E7EB',
  textDark: '#1E2426',
  textMuted: '#8E9CAE',      // Muted grey for subtitle
  textLabel: '#374151',
  red: '#EF4444',
  cardBg: '#FFFFFF',
};

// Gold lines decorative background
const GoldLines = () => (
  <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
    {/* Top-right diagonal grid lines */}
    <View style={[styles.goldLine, { top: -20, right: 40, height: 280, transform: [{ rotate: '-35deg' }] }]} />
    <View style={[styles.goldLine, { top: -60, right: 90, height: 280, transform: [{ rotate: '-35deg' }] }]} />
    <View style={[styles.goldLine, { top: 40, right: -10, height: 220, transform: [{ rotate: '-35deg' }] }]} />
    
    {/* Intersecting lines */}
    <View style={[styles.goldLine, { top: -40, right: 10, height: 250, transform: [{ rotate: '55deg' }] }]} />
    <View style={[styles.goldLine, { top: 30, right: -50, height: 250, transform: [{ rotate: '55deg' }] }]} />

    {/* Bottom-left lines */}
    <View style={[styles.goldLine, { bottom: -50, left: -20, height: 220, transform: [{ rotate: '-35deg' }] }]} />
    <View style={[styles.goldLine, { bottom: -10, left: 30, height: 180, transform: [{ rotate: '-35deg' }] }]} />
    <View style={[styles.goldLine, { bottom: -40, left: 10, height: 200, transform: [{ rotate: '55deg' }] }]} />
  </View>
);

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (response.ok) {
        await saveToken(data.token);
        await saveStoredUser(data.user);
        (global as any).currentUser = data.user;

        // Apply profile language
        if (data.user?.language) {
          i18n.changeLanguage(data.user.language);
        }

        if (data.user?.role === 'Architect') {
          const done =
            data.user.experience ||
            data.user.firmName ||
            (data.user.specialization?.length > 0) ||
            (data.user.portfolioImages?.length > 0);
          router.replace(done ? '/(tabs)' : '/architect-profile');
        } else if (data.user?.role === 'Contractor') {
          const done =
            data.user.contractorType ||
            data.user.teamSize ||
            (data.user.workCategory?.length > 0) ||
            (data.user.serviceLocation?.length > 0) ||
            data.user.experience;
          router.replace(done ? '/(tabs)' : '/contractor-profile');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Please try again.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Network Error', 'Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Phone OTP Login States & Handlers
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [reqId, setReqId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);

  // Initialize MSG91 Mobile SDK on mount
  React.useEffect(() => {
    const widgetId = "3667626c6f73373934343034";
    const tokenAuth = "511561ThJeUXSNqb2s6a465acdP1";
    try {
      OTPWidget.initializeWidget(widgetId, tokenAuth);
      console.log('[Login] MSG91 Mobile SDK initialized successfully');
    } catch (err) {
      console.error('[Login] Failed to initialize MSG91 Mobile SDK:', err);
    }
  }, []);

  React.useEffect(() => {
    let interval: any;
    if (otpTimer > 0 && otpSent) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpTimer, otpSent]);

  const handleSendOtp = async () => {
    if (!phoneNumber) {
      Alert.alert('Phone Number Required', 'Please enter your phone number.');
      return;
    }
    
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid 10-digit phone number.');
      return;
    }

    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    setIsLoading(true);
    try {
      console.log('[Login] Sending OTP via Mobile SDK for:', formattedPhone);
      const response = await OTPWidget.sendOTP({ identifier: formattedPhone });
      console.log('[Login] MSG91 SDK sendOTP Response:', response);

      if (response && (response.type === 'success' || response.success || response.reqId)) {
        setReqId(response.reqId);
        setOtpSent(true);
        setOtpTimer(30);
        Alert.alert('OTP Sent', `A verification code has been sent to +${formattedPhone}`);
      } else {
        Alert.alert('Error', response?.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      console.error('[Login] SDK sendOTP Error:', err);
      Alert.alert('SDK Error', err?.message || 'Could not trigger OTP. Ensure Mobile Integration is configured.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      Alert.alert('OTP Required', 'Please enter the verification code.');
      return;
    }
    if (!reqId) {
      Alert.alert('Session Expired', 'Please request a new OTP.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;

    setIsLoading(true);
    try {
      console.log('[Login] Verifying OTP via Mobile SDK...');
      const response = await OTPWidget.verifyOTP({ reqId, otp });
      console.log('[Login] MSG91 SDK verifyOTP Response:', response);

      const accessToken = response?.['access-token'] || response?.accessToken || response?.data;

      if (accessToken) {
        console.log('[Login] Mobile SDK Verified. Exchanging accessToken with backend...');
        const responseBackend = await fetch(`${BACKEND_URL}/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken,
            phoneNumber: formattedPhone
          }),
        });

        const data = await responseBackend.json();

        if (responseBackend.ok && data.success) {
          await saveToken(data.token);
          await saveStoredUser(data.user);
          
          (global as any).currentUser = data.user;

          if (data.user?.role === 'Architect') {
            const done =
              data.user.experience ||
              data.user.firmName ||
              (data.user.specialization?.length > 0) ||
              (data.user.portfolioImages?.length > 0);
            router.replace(done ? '/(tabs)' : '/architect-profile');
          } else if (data.user?.role === 'Contractor') {
            const done =
              data.user.contractorType ||
              data.user.teamSize ||
              (data.user.workCategory?.length > 0) ||
              (data.user.serviceLocation?.length > 0) ||
              data.user.experience;
            router.replace(done ? '/(tabs)' : '/contractor-profile');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          Alert.alert('Login Failed', data.message || 'Authentication with server failed.');
        }
      } else {
        Alert.alert('Verification Failed', response?.message || 'Incorrect OTP. Please try again.');
      }
    } catch (err: any) {
      console.error('[Login] SDK verifyOTP Error:', err);
      Alert.alert('Verification Error', err?.message || 'Incorrect OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.outerWrap}>
      <GoldLines />
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Top header section covering full width/height above card */}
            <View style={styles.topHeaderSection}>
              <Image
                source={require('../assets/images/ALLVER IMGS.jpeg')}
                style={styles.topBgImage}
                resizeMode="cover"
              />
              <View style={styles.topOverlayContent}>
                {/* Back button */}
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
                  <Feather name="arrow-left" size={20} color="#1E2426" />
                </TouchableOpacity>

                <View style={styles.welcomeTextContainer}>
                  <Text style={styles.welcomeText}>Welcome Back</Text>
                  <Text style={styles.sloganText}>Build.Connect.Grow</Text>
                </View>
              </View>
            </View>

            {/* ─── FORM CARD ─── */}
            <View style={styles.formCard}>
              {/* Login Mode Toggle tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabButton, loginMode === 'email' && styles.tabButtonActive]}
                  onPress={() => setLoginMode('email')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabButtonText, loginMode === 'email' && styles.tabButtonTextActive]}>
                    Email Login
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, loginMode === 'phone' && styles.tabButtonActive]}
                  onPress={() => setLoginMode('phone')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabButtonText, loginMode === 'phone' && styles.tabButtonTextActive]}>
                    Phone OTP Login
                  </Text>
                </TouchableOpacity>
              </View>

              {loginMode === 'email' ? (
                <>
                  {/* Email */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('email') || 'Email'} <Text style={styles.req}>*</Text></Text>
                    <View style={[
                      styles.inputWrap,
                      isEmailFocused ? styles.inputWrapActive : styles.inputWrapInactive
                    ]}>
                      <Feather name="mail" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder={t('enterEmail') || 'Enter your email'}
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                        onFocus={() => setIsEmailFocused(true)}
                        onBlur={() => setIsEmailFocused(false)}
                      />
                    </View>
                  </View>

                  {/* Password */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('password') || 'Password'} <Text style={styles.req}>*</Text></Text>
                    <View style={[
                      styles.inputWrap,
                      isPasswordFocused ? styles.inputWrapActive : styles.inputWrapInactive
                    ]}>
                      <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder={t('enterPassword') || 'Enter your password'}
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                        <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Forgot Password */}
                  <TouchableOpacity style={styles.forgotBtn} onPress={() => setResetModalVisible(true)}>
                    <Text style={styles.forgotText}>{t('forgotPassword') || 'Forgot Password?'}</Text>
                  </TouchableOpacity>

                  {/* Login Button */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                    onPress={handleLogin}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryBtnText}>
                      {isLoading ? (t('loggingIn') || 'Logging In...') : (t('login') || 'Log In')}
                    </Text>
                    {!isLoading && (
                      <View style={styles.arrowCircle}>
                        <Feather name="arrow-right" size={16} color={COLORS.gold} />
                      </View>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Phone Number Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('phoneNumber') || 'Phone Number'} <Text style={styles.req}>*</Text></Text>
                    <View style={[
                      styles.inputWrap,
                      isPhoneFocused ? styles.inputWrapActive : styles.inputWrapInactive
                    ]}>
                      <Feather name="phone" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder={t('phonePlaceholder') || '10-digit mobile number'}
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="phone-pad"
                        maxLength={15}
                        value={phoneNumber}
                        onChangeText={(text) => {
                          setPhoneNumber(text);
                          if (otpSent) {
                            setOtpSent(false);
                            setReqId(null);
                            setOtp('');
                          }
                        }}
                        onFocus={() => setIsPhoneFocused(true)}
                        onBlur={() => setIsPhoneFocused(false)}
                        editable={!otpSent && !isLoading}
                      />
                    </View>
                  </View>

                  {/* OTP Input */}
                  {otpSent && (
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>{t('otpLabel') || 'Verification Code (OTP)'} <Text style={styles.req}>*</Text></Text>
                      <View style={[
                        styles.inputWrap,
                        isOtpFocused ? styles.inputWrapActive : styles.inputWrapInactive
                      ]}>
                        <Feather name="shield" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder={t('otpPlaceholder') || 'Enter OTP'}
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="number-pad"
                          maxLength={6}
                          value={otp}
                          onChangeText={setOtp}
                          onFocus={() => setIsOtpFocused(true)}
                          onBlur={() => setIsOtpFocused(false)}
                        />
                      </View>
                      
                      {/* Resend OTP Row */}
                      <View style={styles.otpActionRow}>
                        {otpTimer > 0 ? (
                          <Text style={styles.otpTimerText}>{t('resendIn') || 'Resend code in'} {otpTimer}s</Text>
                        ) : (
                          <TouchableOpacity onPress={handleSendOtp} disabled={isLoading}>
                            <Text style={styles.otpResendLink}>{t('resendOtp') || 'Resend OTP'}</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }} style={styles.changePhoneBtn}>
                          <Text style={styles.changePhoneText}>{t('changeNumber') || 'Change Number'}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {/* Action Button */}
                  {!otpSent ? (
                    <TouchableOpacity
                      style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                      onPress={handleSendOtp}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryBtnText}>
                        {isLoading ? (t('sending') || 'Sending...') : (t('sendOtp') || 'Send OTP')}
                      </Text>
                      {!isLoading && (
                        <View style={styles.arrowCircle}>
                          <Feather name="arrow-right" size={16} color={COLORS.gold} />
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                      onPress={handleVerifyOtp}
                      disabled={isLoading}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.primaryBtnText}>
                        {isLoading ? (t('verifying') || 'Verifying...') : (t('verifyAndLogin') || 'Verify & Log In')}
                      </Text>
                      {!isLoading && (
                        <View style={styles.arrowCircle}>
                          <Feather name="arrow-right" size={16} color={COLORS.gold} />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Link href="/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>{t('dontHaveAccount')}</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* ================= RESET PASSWORD MODAL ================= */}
            <Modal
              visible={resetModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setResetModalVisible(false)}
            >
              <View style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <View style={{
                  width: '85%',
                  backgroundColor: COLORS.white,
                  borderRadius: 16,
                  padding: 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  elevation: 5,
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 }}>
                    Reset Password
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16 }}>
                    Enter your registered email and your new password.
                  </Text>

                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                      color: COLORS.textDark,
                      backgroundColor: '#F9FAFB',
                      marginBottom: 12,
                    }}
                    placeholder="Enter your email"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={resetEmail}
                    onChangeText={setResetEmail}
                  />

                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      fontSize: 14,
                      color: COLORS.textDark,
                      backgroundColor: '#F9FAFB',
                      marginBottom: 20,
                    }}
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={true}
                    value={resetNewPassword}
                    onChangeText={setResetNewPassword}
                  />

                  <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: '#F3F4F6',
                      }}
                      disabled={isResetting}
                      onPress={() => setResetModalVisible(false)}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMuted }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 8,
                        backgroundColor: COLORS.teal,
                      }}
                      disabled={isResetting}
                      onPress={async () => {
                        if (!resetEmail.trim() || !resetNewPassword.trim()) {
                          Alert.alert('Error', 'Please fill in both email and new password fields.');
                          return;
                        }
                        setIsResetting(true);
                        try {
                          const res = await fetch(`${BACKEND_URL}/api/reset-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: resetEmail.trim().toLowerCase(), newPassword: resetNewPassword.trim() })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            Alert.alert('Success', 'Password reset successfully! You can now log in.');
                            setResetModalVisible(false);
                            setResetEmail('');
                            setResetNewPassword('');
                          } else {
                            Alert.alert('Error', data.message || 'Failed to reset password.');
                          }
                        } catch (err) {
                          console.error('Password reset error:', err);
                          Alert.alert('Error', 'Network error. Failed to reset password.');
                        } finally {
                          setIsResetting(false);
                        }
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.white }}>
                        {isResetting ? 'Saving...' : 'Reset'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 480,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 40,
    flexGrow: 1,
  },

  /* Top header section covering full width/height above card */
  topHeaderSection: {
    height: 280,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
  },
  topBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  topOverlayContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    paddingBottom: 16,
  },

  /* Gold lines decorative background */
  goldLine: {
    position: 'absolute',
    width: 1.2,
    backgroundColor: COLORS.gold,
    opacity: 0.15,
  },

  /* Back button */
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EAE5DB',
    borderColor: '#DFD5C6',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },

  /* ── FORM CARD SECTION ── */
  formCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 28,
    padding: 24,
    gap: 20,
    flex: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 8 },
    }),
  },

  /* Input Group */
  inputGroup: {},
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLabel,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  req: { color: COLORS.red },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 16,
    height: 56,
    borderWidth: 1.5,
  },
  inputWrapInactive: {
    borderColor: COLORS.inputBg,
  },
  inputWrapActive: {
    borderColor: COLORS.teal,
  },
  inputIcon: {
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textDark,
    height: '100%',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },

  /* Forgot Password */
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Primary Button */
  primaryBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    marginTop: 8,
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: COLORS.teal, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C4A94D',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
  },

  /* Footer */
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
    marginBottom: 10,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: '#1BC47D', // Cyan/green link color to stand out on dark background
    fontSize: 14,
    fontWeight: '700',
  },
  welcomeTextContainer: {
    marginTop: 'auto',
    paddingTop: 24,
    marginBottom: 8,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  sloganText: {
    color: '#DFD5C6', // Metallic gold shade
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
    letterSpacing: 1,
  },
  /* Tab Selector */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDEFF2',
    borderRadius: 16,
    padding: 4,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 3 },
      android: { elevation: 2 },
    }),
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E9CAE',
  },
  tabButtonTextActive: {
    color: COLORS.teal,
    fontWeight: '700',
  },
  /* OTP Details */
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  otpTimerText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  otpResendLink: {
    fontSize: 13,
    color: COLORS.teal,
    fontWeight: '700',
  },
  changePhoneBtn: {
    alignSelf: 'flex-end',
  },
  changePhoneText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textDecorationLine: 'underline',
  },
});
