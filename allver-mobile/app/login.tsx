import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Alert,
  Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';

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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

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
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        (global as any).currentUser = data.user;

        if (data.user?.role === 'Architect') {
          const done =
            data.user.experience ||
            data.user.firmName ||
            (data.user.specialization?.length > 0) ||
            (data.user.portfolioImages?.length > 0);
          router.push(done ? '/(tabs)' : '/architect-profile');
        } else if (data.user?.role === 'Contractor') {
          const done =
            data.user.contractorType ||
            data.user.teamSize ||
            (data.user.workCategory?.length > 0) ||
            (data.user.serviceLocation?.length > 0) ||
            data.user.experience;
          router.push(done ? '/(tabs)' : '/contractor-profile');
        } else {
          router.push('/(tabs)');
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Please try again.');
      }
    } catch {
      Alert.alert('Network Error', 'Could not connect to the server.');
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
                source={require('@/assets/images/ALLVER IMGS.jpeg')}
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
              </View>
            </View>

            {/* ─── FORM CARD ─── */}
            <View style={styles.formCard}>
              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email <Text style={styles.req}>*</Text></Text>
                <View style={[
                  styles.inputWrap,
                  isEmailFocused ? styles.inputWrapActive : styles.inputWrapInactive
                ]}>
                  <Feather name="mail" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
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
                <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
                <View style={[
                  styles.inputWrap,
                  isPasswordFocused ? styles.inputWrapActive : styles.inputWrapInactive
                ]}>
                  <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
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
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>
                  {isLoading ? 'Logging In...' : 'Log In'}
                </Text>
                {!isLoading && (
                  <View style={styles.arrowCircle}>
                    <Feather name="arrow-right" size={16} color={COLORS.gold} />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <Link href="/signup" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Create Account</Text>
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
});
