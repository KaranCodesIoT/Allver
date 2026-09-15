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
import { notifyClearActiveJob } from '../context/ActiveJobContext';
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
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<any>(null);

  // In-App Notification Banner State
  interface BannerNotice {
    type: 'error' | 'success' | 'info';
    title?: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
  }
  const [bannerNotice, setBannerNotice] = useState<BannerNotice | null>(null);

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

  // Unregistered / New Phone Prompt Modal
  const [unregisteredModalVisible, setUnregisteredModalVisible] = useState(false);
  const [unregisteredPhoneData, setUnregisteredPhoneData] = useState<{
    phoneNumber: string;
    idToken: string;
  } | null>(null);

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
      console.error('[LoginScreen] Error sending OTP:', err);
      setBannerNotice({
        type: 'error',
        title: 'Something went wrong',
        message: 'Please check your internet connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndLogin = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      setBannerNotice({
        type: 'error',
        title: 'Incorrect OTP',
        message: 'Please check the OTP and try again.',
        actionText: 'Try Again',
        onAction: () => setOtpCode(''),
      });
      return;
    }

    setBannerNotice(null);
    setIsLoading(true);

    try {
      const verifyRes = await verifyFirebaseOtp(confirmationResult, otpCode);
      if (!verifyRes.success || !verifyRes.idToken) {
        const isExpired = verifyRes.code === 'auth/session-expired' || verifyRes.code === 'EXPIRED_OTP';
        setBannerNotice({
          type: 'error',
          title: verifyRes.title || (isExpired ? 'This OTP has expired.' : 'Incorrect OTP'),
          message: verifyRes.message || (isExpired ? 'Please request a new OTP to continue.' : 'Please check the OTP and try again.'),
          actionText: isExpired ? 'Resend OTP' : 'Try Again',
          onAction: isExpired ? () => handleSendOtp() : () => setOtpCode(''),
        });
        setIsLoading(false);
        return;
      }

      console.log(`[LoginScreen] Firebase verification passed. ID token acquired (length: ${verifyRes.idToken.length}). Target endpoint: ${BACKEND_URL}/api/auth/firebase-phone-login`);
      
      const endpoint = `${BACKEND_URL}/api/auth/firebase-phone-login`;
      let response: Response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${verifyRes.idToken}`,
          },
          body: JSON.stringify({
            idToken: verifyRes.idToken,
            phoneNumber: verifyRes.phoneNumber || phoneNumber
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (netErr: any) {
        const isTimeout = netErr?.name === 'AbortError';
        console.error(`[LoginScreen] ${isTimeout ? 'Timeout (15s)' : 'Network error'} reaching backend endpoint (${endpoint}):`, netErr?.message || netErr);
        setBannerNotice({
          type: 'error',
          title: isTimeout ? 'Request Timed Out' : 'Connection Error',
          message: isTimeout
            ? `Backend did not respond in 15 seconds. Please verify server connectivity at ${BACKEND_URL}.`
            : `Could not reach backend server at ${BACKEND_URL}. Please check your network connection.`,
        });
        setIsLoading(false);
        return;
      }

      console.log(`[LoginScreen] Backend HTTP Status: ${response.status} ${response.statusText}`);

      let data: any;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.error(`[LoginScreen] JSON parsing error from backend (HTTP ${response.status}):`, parseErr);
        setBannerNotice({
          type: 'error',
          title: 'Server Error',
          message: `Server returned non-JSON response (HTTP ${response.status}).`,
        });
        setIsLoading(false);
        return;
      }

      console.log(`[LoginScreen] Backend response (HTTP ${response.status}):`, JSON.stringify(data));

      if (response.status === 401) {
        console.warn('[LoginScreen] HTTP 401 Unauthorized:', data?.message);
        setBannerNotice({
          type: 'error',
          title: 'Authentication Expired',
          message: data?.message || 'Firebase session expired. Please request a new OTP.',
        });
        setIsLoading(false);
        return;
      }

      if (response.status === 403) {
        console.warn('[LoginScreen] HTTP 403 Forbidden:', data?.message);
        setBannerNotice({
          type: 'error',
          title: 'Verification Mismatch',
          message: data?.message || 'Phone number does not match verified credentials.',
        });
        setIsLoading(false);
        return;
      }

      if (response.status === 404) {
        console.warn('[LoginScreen] HTTP 404 Not Found at endpoint:', endpoint);
        setBannerNotice({
          type: 'error',
          title: 'Endpoint Not Found',
          message: `Endpoint ${endpoint} was not found on the backend.`,
        });
        setIsLoading(false);
        return;
      }

      if (response.status === 429) {
        setBannerNotice({
          type: 'error',
          title: 'Too many OTP attempts',
          message: 'Please wait a while before requesting another OTP.',
        });
        setIsLoading(false);
        return;
      }

      if (response.status >= 500) {
        console.error('[LoginScreen] HTTP 500 Server Error:', data?.message);
        setBannerNotice({
          type: 'error',
          title: 'Server Error',
          message: data?.message || 'The server encountered an error processing your login. Please try again.',
        });
        setIsLoading(false);
        return;
      }

      if (response.ok && data.success) {
        if (data.isNewUser) {
          // Unregistered user -> present dedicated in-app modal (no browser alert)
          setUnregisteredPhoneData({
            phoneNumber: data.phoneNumber || phoneNumber,
            idToken: verifyRes.idToken
          });
          setUnregisteredModalVisible(true);
          return;
        }

        // Existing user login success - ensure clean active job state before caching new user
        notifyClearActiveJob();
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
        setBannerNotice({
          type: 'error',
          title: 'Login Failed',
          message: data.message || 'Unable to authenticate user on server.',
        });
      }
    } catch (err: any) {
      console.error('[LoginScreen] Phone verification error:', err);
      setBannerNotice({
        type: 'error',
        title: 'Something went wrong',
        message: 'Please check your internet connection and try again.',
      });
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
        notifyClearActiveJob();
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

              {authMode === 'phone' ? (
                /* ================= PHONE NUMBER + OTP FLOW ================= */
                <>
                  {/* Phone Number Input */}
                  <View style={styles.inputGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={styles.label}>Mobile Number <Text style={styles.req}>*</Text></Text>
                      {otpSent && (
                        <TouchableOpacity
                          onPress={() => {
                            setOtpSent(false);
                            setOtpCode('');
                            setConfirmationResult(null);
                            setBannerNotice(null);
                          }}
                        >
                          <Text style={{ fontSize: 12, color: COLORS.teal, fontWeight: '700' }}>
                            Change number
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <View style={[
                      styles.inputWrap,
                      phoneError ? styles.inputWrapError : isPhoneFocused ? styles.inputWrapActive : styles.inputWrapInactive
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
                          if (phoneError) setPhoneError(null);
                          if (otpSent) setOtpSent(false);
                        }}
                        onFocus={() => setIsPhoneFocused(true)}
                        onBlur={() => setIsPhoneFocused(false)}
                        editable={!isLoading && !otpSent}
                      />
                      {phoneNumber.length === 10 && !otpSent && !phoneError && (
                        <Feather name="check-circle" size={18} color="#16A34A" style={{ marginRight: 12 }} />
                      )}
                    </View>

                    {phoneError && (
                      <Text style={styles.inlineErrorText}>{phoneError}</Text>
                    )}
                  </View>

                  {/* OTP Input Field (Shows after OTP is sent) */}
                  {otpSent && (
                    <View style={styles.inputGroup}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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

            {/* ================= UNREGISTERED PHONE / NEW USER MODAL ================= */}
            <Modal
              visible={unregisteredModalVisible}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setUnregisteredModalVisible(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={styles.unregisteredCard}>
                  {/* Icon badge */}
                  <View style={styles.unregIconContainer}>
                    <View style={styles.unregIconCircle}>
                      <Feather name="user-plus" size={30} color={COLORS.teal} />
                    </View>
                  </View>

                  {/* Verified Phone badge */}
                  <View style={styles.phoneBadge}>
                    <Feather name="check-circle" size={14} color="#059669" />
                    <Text style={styles.phoneBadgeText}>
                      +91 {(unregisteredPhoneData?.phoneNumber || phoneNumber).replace(/\D/g, '').slice(-10)} • Verified
                    </Text>
                  </View>

                  {/* Title & Subtitle */}
                  <Text style={styles.unregTitle}>
                    You're new to Allver
                  </Text>

                  <Text style={styles.unregSubtitle}>
                    This mobile number isn't registered with Allver yet.
                  </Text>

                  {/* Action Buttons */}
                  <View style={{ width: '100%', marginTop: 24, gap: 12 }}>
                    <TouchableOpacity
                      style={styles.unregCreateBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        const verifiedNum = unregisteredPhoneData?.phoneNumber || phoneNumber;
                        const token = unregisteredPhoneData?.idToken || '';
                        setUnregisteredModalVisible(false);
                        router.push({
                          pathname: '/signup',
                          params: {
                            verifiedPhone: verifiedNum,
                            idToken: token,
                          },
                        });
                      }}
                    >
                      <Text style={styles.unregCreateBtnText}>Create Account</Text>
                      <Feather name="arrow-right" size={18} color={COLORS.white} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.unregCancelBtn}
                      activeOpacity={0.7}
                      onPress={() => {
                        setUnregisteredModalVisible(false);
                        setUnregisteredPhoneData(null);
                        setOtpCode('');
                        setOtpSent(false);
                        setConfirmationResult(null);
                        setPhoneNumber('');
                        setPhoneError(null);
                        setBannerNotice(null);
                      }}
                    >
                      <Text style={styles.unregCancelBtnText}>Try another number</Text>
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

  /* In-App Notification Banner Styles */
  bannerContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    gap: 10,
    marginBottom: 4,
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
    backgroundColor: '#DC2626',
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
  inputWrapError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  countryCodeBadge: {
    paddingLeft: 14,
    paddingRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
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

  /* Unregistered Phone / New User Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 22, 40, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unregisteredCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  unregIconContainer: {
    marginBottom: 16,
  },
  unregIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E6FFFA',
    borderWidth: 2,
    borderColor: '#99F6E4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  phoneBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  unregTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  unregSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  unregCreateBtn: {
    backgroundColor: COLORS.teal,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: COLORS.teal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  unregCreateBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  unregCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  unregCancelBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
