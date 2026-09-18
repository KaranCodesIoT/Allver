import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Alert,
  Dimensions, Image, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';
import { useTranslation } from '../utils/i18n';
import { saveToken, saveStoredUser, enterGuestMode } from '../constants/Auth';
import { notifyClearActiveJob } from '../context/ActiveJobContext';
import { sendFirebaseOtp, verifyFirebaseOtp, formatIndianPhoneNumber, signInWithGoogle } from '../utils/FirebaseAuthService';

const { width, height } = Dimensions.get('window');

const COLORS = {
  darkBg: '#F8FAFC',         // Soft crisp light background
  cardBg: '#FFFFFF',         // Clean white card background
  cardBorder: '#E2E8F0',     // Subtle slate border
  inputBg: '#F8FAFC',        // Clean light input field background
  inputBorder: '#E2E8F0',    // Input border
  inputBorderFocused: '#016B4F',
  emerald: '#016B4F',        // Rich emerald green CTA
  emeraldDark: '#014432',
  emeraldLight: 'rgba(1, 107, 79, 0.08)',
  gold: '#D97706',           // Warm amber gold for "Allver", script, & icons
  goldLight: '#F59E0B',
  goldBorder: '#FDE68A',
  white: '#FFFFFF',
  offWhite: '#F8FAFC',
  textMuted: '#64748B',      // Subtitle muted slate
  textSubtle: '#94A3B8',     // Placeholder text
  textDark: '#0F172A',       // Crisp dark navy text
  red: '#EF4444',
  teal: '#016B4F',
};

// Exact abstract curved ribbons & ambient lighting matching mockup
const BackgroundDecor = () => (
  <View style={[StyleSheet.absoluteFillObject, { overflow: 'hidden' }]} pointerEvents="none">
    {/* Ambient radial glow top center behind logo */}
    <View style={styles.topAmbientGlow} />

    {/* Warm golden-bronze curved sweep bottom-left curving across card */}
    <View style={styles.goldCurvedSweep} />
    <View style={styles.goldCurvedSweepInner} />

    {/* Deep emerald curved ribbon swooping on right edge */}
    <View style={styles.emeraldCurvedRibbon} />
    <View style={styles.emeraldCurvedRibbonInner} />

    {/* Fine geometric accent lines */}
    <View style={[styles.fineAccentLine, { top: -20, right: 30, height: 320, transform: [{ rotate: '-35deg' }] }]} />
    <View style={[styles.fineAccentLine, { top: 50, right: 80, height: 260, transform: [{ rotate: '-35deg' }] }]} />
    <View style={[styles.fineAccentLine, { top: 120, right: -15, height: 280, transform: [{ rotate: '55deg' }] }]} />
    <View style={[styles.fineAccentLine, { bottom: -30, left: -20, height: 180, transform: [{ rotate: '-35deg' }] }]} />
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

  // Focus & Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);

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


  const handleGoogleSignIn = async () => {
    setBannerNotice(null);
    setIsLoading(true);

    try {
      const googleRes = await signInWithGoogle();
      if (!googleRes.success || !googleRes.idToken) {
        if (googleRes.code === 'CANCELLED') {
          setIsLoading(false);
          return;
        }
        setBannerNotice({
          type: 'error',
          title: googleRes.title || 'Google Sign-In Failed',
          message: googleRes.message || 'Could not complete Google authentication.',
        });
        setIsLoading(false);
        return;
      }

      console.log(`[LoginScreen] Google Firebase auth passed. ID token acquired (len: ${googleRes.idToken.length})`);

      const endpoint = `${BACKEND_URL}/api/auth/firebase-google-login`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${googleRes.idToken}`,
        },
        body: JSON.stringify({ idToken: googleRes.idToken }),
      });

      const data = await response.json();
      console.log(`[LoginScreen] Backend Google login HTTP ${response.status}:`, data);

      if (response.ok && data.success) {
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
          message: data.message || 'Unable to authenticate Google account on server.',
        });
      }
    } catch (err: any) {
      console.error('[LoginScreen] Error during Google Sign-In:', err);
      setBannerNotice({
        type: 'error',
        title: 'Sign-In Error',
        message: 'Network error communicating with server. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.outerWrap}>
      <BackgroundDecor />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <ScrollView
            style={{ flex: 1, backgroundColor: '#F8FAFC' }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            {/* Top Area: Back Circle (left) & Skip for now (right) */}
            <View style={styles.topNavRow}>
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
                }}
                style={styles.topBackCircle}
                activeOpacity={0.7}
                accessibilityLabel="Go back"
              >
                <Feather name="arrow-left" size={20} color="#0F172A" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  try {
                    await enterGuestMode();
                  } catch (e) {
                    console.error('Error entering guest mode:', e);
                  }
                  router.replace('/(tabs)');
                }}
                style={styles.skipBtn}
                activeOpacity={0.7}
                accessibilityLabel="Skip for now"
              >
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </TouchableOpacity>
            </View>


            {/* Welcome Section */}
            <View style={styles.heroSection}>
              <Text style={styles.heroTitle}>
                Welcome{'\n'}to <Text style={styles.heroTitleGold}>Allver</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                India’s construction ecosystem{'\n'}in your hands.
              </Text>
            </View>

            {/* Value Proposition Chips */}
            <View style={styles.featuresWrap}>
              <View style={styles.featureCardsRow}>
                <View style={styles.featureCard}>
                  <View style={styles.featureIconBadge}>
                    <Feather name="users" size={14} color="#D97706" />
                  </View>
                  <Text style={styles.featureCardText} numberOfLines={1} adjustsFontSizeToFit>Find Professionals</Text>
                </View>

                <View style={styles.featureCard}>
                  <View style={styles.featureIconBadge}>
                    <Feather name="briefcase" size={14} color="#D97706" />
                  </View>
                  <Text style={styles.featureCardText} numberOfLines={1} adjustsFontSizeToFit>Get Projects</Text>
                </View>

                <View style={styles.featureCard}>
                  <View style={styles.featureIconBadge}>
                    <Feather name="bar-chart-2" size={14} color="#D97706" />
                  </View>
                  <Text style={styles.featureCardText} numberOfLines={1} adjustsFontSizeToFit>Grow Together</Text>
                </View>
              </View>
            </View>

            {/* ─── MAIN AUTH CARD (Glassmorphic) ─── */}
            <View style={styles.mainAuthCard}>
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
                      size={18}
                      color={bannerNotice.type === 'error' ? '#EF4444' : bannerNotice.type === 'success' ? '#10B981' : '#3B82F6'}
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
                    <Feather name="x" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              )}

                {/* ================= PHONE NUMBER + OTP FLOW ================= */}
                  {/* Header Row */}
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardHeaderTitle}>Mobile Number</Text>
                    {otpSent ? (
                      <TouchableOpacity
                        onPress={() => {
                          setOtpSent(false);
                          setOtpCode('');
                          setConfirmationResult(null);
                          setBannerNotice(null);
                        }}
                      >
                        <Text style={styles.changeNumberText}>Change number</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.cardHeaderSubtitle}>We’ll send you a 6-digit OTP</Text>
                    )}
                  </View>

                  {/* Phone Input Box */}
                  <View style={[
                    styles.phoneInputWrap,
                    phoneError ? styles.phoneInputWrapError : isPhoneFocused ? styles.phoneInputWrapFocused : null
                  ]}>
                    <View style={styles.countryBadge}>
                      <View style={styles.miniFlag}>
                        <View style={{ height: 3.5, backgroundColor: '#FF9933' }} />
                        <View style={{ height: 3.5, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                          <View style={{ width: 2.5, height: 2.5, borderRadius: 1.25, backgroundColor: '#000080' }} />
                        </View>
                        <View style={{ height: 3.5, backgroundColor: '#138808' }} />
                      </View>
                      <Text style={styles.countryCode}>+91</Text>
                      <Feather name="chevron-down" size={13} color="#94A3B8" />
                    </View>
                    <View style={styles.countryDivider} />
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="Enter 10-digit mobile number"
                      placeholderTextColor="#64748B"
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
                      <Feather name="check-circle" size={18} color="#10B981" style={{ marginRight: 14 }} />
                    )}
                  </View>

                  {phoneError && (
                    <Text style={styles.inlineErrorText}>{phoneError}</Text>
                  )}

                  {/* OTP Input Field (Shows after OTP is sent) */}
                  {otpSent && (
                    <View style={{ marginTop: 14 }}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardHeaderTitle}>Enter 6-digit OTP</Text>
                        {resendTimer > 0 ? (
                          <Text style={styles.cardHeaderSubtitle}>
                            Resend in {resendTimer}s
                          </Text>
                        ) : (
                          <TouchableOpacity onPress={handleSendOtp} disabled={isLoading}>
                            <Text style={styles.changeNumberText}>
                              Resend OTP
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={[
                        styles.phoneInputWrap,
                        isOtpFocused ? styles.phoneInputWrapFocused : null
                      ]}>
                        <Feather name="shield" size={18} color="#94A3B8" style={{ marginLeft: 16, marginRight: 10 }} />
                        <TextInput
                          style={[styles.phoneInput, { letterSpacing: 6, fontSize: 18, fontWeight: '700' }]}
                          placeholder="••••••"
                          placeholderTextColor="#64748B"
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

                  {/* Primary Emerald Action Button */}
                  <TouchableOpacity
                    style={[styles.emeraldPrimaryBtn, isLoading && { opacity: 0.7 }]}
                    onPress={otpSent ? handleVerifyOtpAndLogin : handleSendOtp}
                    disabled={isLoading}
                    activeOpacity={0.88}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.emeraldPrimaryBtnText}>
                          {otpSent ? 'Verify & Log In' : 'Get OTP on SMS'}
                        </Text>
                        <View style={styles.emeraldArrowCircle}>
                          <Feather name="arrow-right" size={16} color="#FFFFFF" />
                        </View>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* OR Divider */}
                  <View style={styles.orDividerWrap}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>OR</Text>
                    <View style={styles.orLine} />
                  </View>

                  {/* Continue with Google Button */}
                  <TouchableOpacity
                    style={styles.secondaryOutlineBtn}
                    onPress={handleGoogleSignIn}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    <FontAwesome5 name="google" size={16} color="#DB4437" style={{ marginRight: 10 }} />
                    <Text style={styles.secondaryOutlineBtnText}>Continue with Google</Text>
                  </TouchableOpacity>

              {/* Sign Up Prompt inside card */}
              <View style={styles.signupRow}>
                <Text style={styles.signupText}>Don’t have an account? </Text>
                <Link href="/signup" asChild>
                  <TouchableOpacity>
                    <Text style={styles.signupLink}>Sign Up</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>

            {/* Bottom Trust Badges Footer */}
            <View style={styles.bottomTrustRow}>
              <View style={styles.trustBadgeItem}>
                <Feather name="shield" size={14} color="#7D8B9B" />
                <Text style={styles.trustBadgeText}>Secure</Text>
              </View>
              <Text style={styles.trustBadgeDivider}>|</Text>
              <View style={styles.trustBadgeItem}>
                <Feather name="users" size={14} color="#7D8B9B" />
                <Text style={styles.trustBadgeText}>Trusted</Text>
              </View>
              <Text style={styles.trustBadgeDivider}>|</Text>
              <View style={styles.trustBadgeItem}>
                <Feather name="feather" size={14} color="#7D8B9B" />
                <Text style={styles.trustBadgeText}>For a Better Built India</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>




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
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: 480,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 16,
    paddingBottom: 20,
    backgroundColor: '#F8FAFC',
  },

  /* Ambient radial and curved ribbons */
  topAmbientGlow: {
    position: 'absolute',
    top: -100,
    left: '15%',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(1, 107, 79, 0.05)',
    opacity: 0.8,
  },
  goldCurvedSweep: {
    position: 'absolute',
    bottom: 80,
    left: -120,
    width: 380,
    height: 480,
    borderRadius: 240,
    borderTopWidth: 2,
    borderRightWidth: 1.5,
    borderTopColor: 'rgba(217, 119, 6, 0.15)',
    borderRightColor: 'rgba(217, 119, 6, 0.08)',
    backgroundColor: 'rgba(245, 158, 11, 0.02)',
    transform: [{ rotate: '-25deg' }],
  },
  goldCurvedSweepInner: {
    position: 'absolute',
    bottom: 120,
    left: -90,
    width: 320,
    height: 420,
    borderRadius: 210,
    borderTopWidth: 1,
    borderTopColor: 'rgba(217, 119, 6, 0.1)',
    transform: [{ rotate: '-28deg' }],
  },
  emeraldCurvedRibbon: {
    position: 'absolute',
    top: 60,
    right: -130,
    width: 320,
    height: 480,
    borderRadius: 240,
    borderLeftWidth: 1.8,
    borderBottomWidth: 1,
    borderLeftColor: 'rgba(1, 107, 79, 0.15)',
    borderBottomColor: 'rgba(1, 107, 79, 0.08)',
    backgroundColor: 'rgba(1, 107, 79, 0.02)',
    transform: [{ rotate: '38deg' }],
  },
  emeraldCurvedRibbonInner: {
    position: 'absolute',
    top: 130,
    right: -100,
    width: 260,
    height: 400,
    borderRadius: 200,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(1, 107, 79, 0.1)',
    transform: [{ rotate: '42deg' }],
  },
  fineAccentLine: {
    position: 'absolute',
    width: 1,
    backgroundColor: '#D97706',
    opacity: 0.12,
  },

  /* Top Navigation: Back Circle & Skip for now */
  topNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    zIndex: 10,
  },
  topBackCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },

  /* Brand Logo & Tagline */
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 18,
  },
  brandLogoWrapper: {
    backgroundColor: '#070C15',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  brandLogoImage: {
    width: 140,
    height: 62,
  },
  brandTagline: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 3.5,
    marginTop: 8,
  },

  /* Welcome Section */
  heroSection: {
    marginTop: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  heroTitle: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroTitleGold: {
    color: '#D97706',
  },
  heroSubtitle: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    fontWeight: '400',
    maxWidth: '90%',
    textAlign: 'center',
  },

  /* Value Proposition Chips + Motivational Brand Element */
  featuresWrap: {
    marginBottom: 14,
    width: '100%',
  },
  featureCardsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  featureIconBadge: {
    marginBottom: 3,
    alignItems: 'center',
  },
  featureCardText: {
    color: '#1E293B',
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* ── MAIN AUTH CARD (Glassmorphic White) ── */
  mainAuthCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 26,
    padding: 22,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  /* In-App Notification Banner */
  bannerContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    gap: 10,
    marginBottom: 14,
  },
  bannerError: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  bannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
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
    color: '#065F46',
  },
  bannerTextInfo: {
    color: '#1E40AF',
  },
  bannerActionBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
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

  /* Card Header Row */
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardHeaderSubtitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '400',
  },
  changeNumberText: {
    color: '#016B4F',
    fontSize: 12,
    fontWeight: '700',
  },
  forgotPasswordLink: {
    color: '#016B4F',
    fontSize: 13,
    fontWeight: '600',
  },

  /* Phone Input Wrap */
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 54,
  },
  phoneInputWrapFocused: {
    borderColor: '#016B4F',
    backgroundColor: '#FFFFFF',
  },
  phoneInputWrapError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    gap: 6,
  },
  miniFlag: {
    width: 18,
    height: 11,
    borderRadius: 2,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    marginRight: 2,
  },
  countryCode: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  countryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    color: '#0F172A',
    fontSize: 15,
    paddingRight: 12,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      outlineWidth: 0,
      outlineColor: 'transparent',
      boxShadow: 'none',
    } as any : {}),
  },
  inlineErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginLeft: 4,
  },

  /* Primary Emerald Button */
  emeraldPrimaryBtn: {
    backgroundColor: '#016B4F',
    borderRadius: 27,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#016B4F',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        backgroundImage: 'linear-gradient(180deg, #02805E 0%, #016B4F 60%, #014E3A 100%)',
        boxShadow: '0 6px 20px rgba(1, 107, 79, 0.25)',
      },
    }),
  },
  emeraldPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emeraldArrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },

  /* OR Divider */
  orDividerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  orText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  /* Secondary Outline Button */
  secondaryOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  secondaryOutlineBtnText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  /* Sign Up Prompt inside card */
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  signupText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  signupLink: {
    color: '#016B4F',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Bottom Trust Badges Footer */
  bottomTrustRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 6,
    gap: 12,
  },
  trustBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustBadgeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  trustBadgeDivider: {
    color: '#CBD5E1',
    fontSize: 12,
  },

  /* Unregistered Phone / New User Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  unregisteredCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
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
    backgroundColor: 'rgba(1, 107, 79, 0.1)',
    borderWidth: 2,
    borderColor: '#016B4F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(1, 107, 79, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(1, 107, 79, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  phoneBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#016B4F',
    letterSpacing: 0.5,
  },
  unregTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  unregSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  unregCreateBtn: {
    backgroundColor: '#016B4F',
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  unregCreateBtnText: {
    color: '#FFFFFF',
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
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
