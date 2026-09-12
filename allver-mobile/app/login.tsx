import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Alert,
  Dimensions, Image, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { useTranslation } from '../utils/i18n';
import { saveToken, saveStoredUser } from '../constants/Auth';
import { sendFirebaseOtp, verifyFirebaseOtp, formatIndianPhoneNumber } from '../utils/FirebaseAuthService';

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

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  // Mode: 'phone' (default OTP) or 'email' (legacy fallback)
  const [authMode, setAuthMode] = useState<'phone' | 'email'>('phone');

  // Phone OTP States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<any>(null);

  // Email States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Focus & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Forgot Password Modal
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Timer countdown
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
      console.error('[LoginScreen] Error sending OTP:', err);
      showAlert('Error', err.message || 'Failed to send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndLogin = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      showAlert('Invalid OTP', 'Please enter the 6-digit code received via SMS.');
      return;
    }

    setIsLoading(true);
    try {
      const verifyRes = await verifyFirebaseOtp(confirmationResult, otpCode);
      if (!verifyRes.success || !verifyRes.idToken) {
        showAlert('Verification Failed', verifyRes.message || 'Incorrect OTP.');
        setIsLoading(false);
        return;
      }

      console.log('[LoginScreen] Firebase verification passed. Verifying with backend...');
      const response = await fetch(`${BACKEND_URL}/api/auth/firebase-phone-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: verifyRes.idToken,
          phoneNumber: verifyRes.phoneNumber || phoneNumber
        }),
      });

      const data = await response.json();
      console.log('[LoginScreen] Backend phone login response:', data);

      if (response.ok && data.success) {
        if (data.isNewUser) {
          // Unregistered user -> direct to signup with verified credentials
          showAlert('New User', 'Your phone number is verified! Please complete your registration details.', [
            {
              text: 'Complete Signup',
              onPress: () => {
                router.push({
                  pathname: '/signup',
                  params: {
                    verifiedPhone: data.phoneNumber || phoneNumber,
                    idToken: verifyRes.idToken
                  }
                });
              }
            }
          ]);
          return;
        }

        // Existing user login success
        await saveToken(data.token);
        await saveStoredUser(data.user);
        (global as any).currentUser = data.user;

        if (data.user?.language) {
          i18n.changeLanguage(data.user.language);
        }

        if (data.user?.role === 'Architect') {
          const done =
            data.user.experience ||
            data.user.firmName ||
            (data.user.specialization?.length > 0) ||
            (data.user.portfolioImages?.length > 0);
          router.replace(done ? '/(tabs)' : '/architect-profile' as any);
        } else if (data.user?.role === 'Contractor') {
          const done =
            data.user.contractorType ||
            data.user.teamSize ||
            (data.user.workCategory?.length > 0) ||
            (data.user.serviceLocation?.length > 0) ||
            data.user.experience;
          router.replace(done ? '/(tabs)' : '/contractor-profile' as any);
        } else {
          router.replace('/(tabs)');
        }
      } else {
        showAlert('Login Failed', data.message || 'Unable to authenticate user on server.');
      }
    } catch (err: any) {
      console.error('[LoginScreen] Phone verification error:', err);
      showAlert('Network Error', 'Could not complete login. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      showAlert('Missing Fields', 'Please enter both email and password.');
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

        if (data.user?.language) {
          i18n.changeLanguage(data.user.language);
        }

        if (data.user?.role === 'Architect') {
          const done =
            data.user.experience ||
            data.user.firmName ||
            (data.user.specialization?.length > 0) ||
            (data.user.portfolioImages?.length > 0);
          router.replace(done ? '/(tabs)' : '/architect-profile' as any);
        } else if (data.user?.role === 'Contractor') {
          const done =
            data.user.contractorType ||
            data.user.teamSize ||
            (data.user.workCategory?.length > 0) ||
            (data.user.serviceLocation?.length > 0) ||
            data.user.experience;
          router.replace(done ? '/(tabs)' : '/contractor-profile' as any);
        } else {
          router.replace('/(tabs)');
        }
      } else {
        showAlert('Login Failed', data.message || 'Please try again.');
      }
    } catch (err) {
      showAlert('Network Error', 'Could not connect to the server.');
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
              {authMode === 'phone' ? (
                /* ================= PHONE NUMBER + OTP FLOW ================= */
                <>
                  {/* Phone Number Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mobile Number <Text style={styles.req}>*</Text></Text>
                    <View style={[
                      styles.inputWrap,
                      isPhoneFocused ? styles.inputWrapActive : styles.inputWrapInactive
                    ]}>
                      <View style={styles.countryCodeBadge}>
                        <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 10-digit mobile number"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="phone-pad"
                        maxLength={10}
                        value={phoneNumber}
                        onChangeText={(txt) => {
                          setPhoneNumber(txt.replace(/\D/g, ''));
                          if (otpSent) setOtpSent(false);
                        }}
                        onFocus={() => setIsPhoneFocused(true)}
                        onBlur={() => setIsPhoneFocused(false)}
                        editable={!isLoading}
                      />
                      {phoneNumber.length === 10 && !otpSent && (
                        <Feather name="check-circle" size={18} color="#16A34A" style={{ marginRight: 12 }} />
                      )}
                    </View>
                  </View>

                  {/* OTP Input Field (Shows after OTP is sent) */}
                  {otpSent && (
                    <View style={styles.inputGroup}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.label}>Enter 6-digit OTP <Text style={styles.req}>*</Text></Text>
                        {resendTimer > 0 ? (
                          <Text style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: '600' }}>
                            Resend in {resendTimer}s
                          </Text>
                        ) : (
                          <TouchableOpacity onPress={handleSendOtp} disabled={isLoading}>
                            <Text style={{ fontSize: 12, color: COLORS.teal, fontWeight: '700' }}>
                              Resend OTP
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={[
                        styles.inputWrap,
                        isOtpFocused ? styles.inputWrapActive : styles.inputWrapInactive
                      ]}>
                        <Feather name="shield" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, { letterSpacing: 4, fontSize: 16, fontWeight: '700' }]}
                          placeholder="••••••"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="numeric"
                          maxLength={6}
                          value={otpCode}
                          onChangeText={setOtpCode}
                          onFocus={() => setIsOtpFocused(true)}
                          onBlur={() => setIsOtpFocused(false)}
                          editable={!isLoading}
                        />
                      </View>
                    </View>
                  )}

                  {/* Submit Action Button */}
                  <TouchableOpacity
                    style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                    onPress={otpSent ? handleVerifyOtpAndLogin : handleSendOtp}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Text style={styles.primaryBtnText}>
                          {otpSent ? 'Verify & Log In' : 'Get OTP on SMS'}
                        </Text>
                        <View style={styles.arrowCircle}>
                          <Feather name="arrow-right" size={16} color={COLORS.gold} />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Toggle Mode Link */}
                  <TouchableOpacity
                    style={{ alignSelf: 'center', marginTop: 16 }}
                    onPress={() => setAuthMode('email')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: '600' }}>
                      Or log in with <Text style={{ color: COLORS.teal, fontWeight: '700' }}>Email & Password</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* ================= EMAIL + PASSWORD FLOW ================= */
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
                    onPress={handleEmailLogin}
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

                  {/* Toggle Mode Link */}
                  <TouchableOpacity
                    style={{ alignSelf: 'center', marginTop: 16 }}
                    onPress={() => setAuthMode('phone')}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 12, color: COLORS.textMuted, fontWeight: '600' }}>
                      Log in with <Text style={{ color: COLORS.teal, fontWeight: '700' }}>Phone OTP SMS</Text>
                    </Text>
                  </TouchableOpacity>
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

            {/* Legal & Info Links */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 18, marginBottom: 8 }}>
              <TouchableOpacity onPress={() => router.push('/about')}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>About</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: '#CBD5E1' }}>•</Text>
              <TouchableOpacity onPress={() => router.push('/contact')}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Contact</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: '#CBD5E1' }}>•</Text>
              <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Privacy</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 10, color: '#CBD5E1' }}>•</Text>
              <TouchableOpacity onPress={() => router.push('/terms')}>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Terms</Text>
              </TouchableOpacity>
            </View>

            {/* Hidden recaptcha container for web */}
            {Platform.OS === 'web' && (
              <View id="recaptcha-container" style={{ display: 'none' }} />
            )}

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
                padding: 20
              }}>
                <View style={{
                  backgroundColor: COLORS.white,
                  borderRadius: 16,
                  padding: 24,
                  width: '100%',
                  maxWidth: 380,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 8
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 }}>
                    Reset Password
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 16, lineHeight: 18 }}>
                    Enter your registered email address and new password.
                  </Text>

                  <View style={{ marginBottom: 14 }}>
                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                      style={{
                        backgroundColor: COLORS.inputBg,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: COLORS.inputBorder,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: COLORS.textDark
                      }}
                      placeholder="Enter your email"
                      placeholderTextColor={COLORS.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                    />
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                      style={{
                        backgroundColor: COLORS.inputBg,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: COLORS.inputBorder,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: COLORS.textDark
                      }}
                      placeholder="Enter new password"
                      placeholderTextColor={COLORS.textMuted}
                      secureTextEntry
                      value={resetNewPassword}
                      onChangeText={setResetNewPassword}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
                    <TouchableOpacity
                      style={{ paddingVertical: 10, paddingHorizontal: 16 }}
                      onPress={() => setResetModalVisible(false)}
                    >
                      <Text style={{ fontSize: 14, color: COLORS.textMuted, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        backgroundColor: COLORS.teal,
                        paddingVertical: 10,
                        paddingHorizontal: 20,
                        borderRadius: 8
                      }}
                      onPress={async () => {
                        if (!resetEmail || !resetNewPassword) {
                          showAlert('Missing Fields', 'Please fill in both email and new password.');
                          return;
                        }
                        setIsResetting(true);
                        try {
                          const res = await fetch(`${BACKEND_URL}/api/user/reset-password`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              email: resetEmail.trim().toLowerCase(),
                              newPassword: resetNewPassword
                            })
                          });
                          const resData = await res.json();
                          if (res.ok) {
                            showAlert('Success', 'Password has been updated. You can now log in.');
                            setResetModalVisible(false);
                            setResetEmail('');
                            setResetNewPassword('');
                          } else {
                            showAlert('Failed', resData.message || 'Error resetting password.');
                          }
                        } catch (e) {
                          showAlert('Error', 'Could not connect to server.');
                        } finally {
                          setIsResetting(false);
                        }
                      }}
                      disabled={isResetting}
                    >
                      <Text style={{ fontSize: 14, color: COLORS.white, fontWeight: '700' }}>
                        {isResetting ? 'Saving...' : 'Update Password'}
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

});
