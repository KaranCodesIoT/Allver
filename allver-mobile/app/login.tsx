import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';

const COLORS = {
  green: '#1BC47D',
  greenLight: '#E8FAF0',
  bg: '#F7F8FA',
  white: '#FFFFFF',
  inputBg: '#FFFFFF',
  inputBorder: '#E5E7EB',
  textDark: '#111827',
  textMuted: '#9CA3AF',
  textLabel: '#374151',
  red: '#EF4444',
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
            {/* Back */}
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

            {/* Logo */}
            <View style={styles.logoWrap}>
              <Image
                source={require('@/assets/images/welcome-logo.png')}
                style={styles.logo}
                contentFit="contain"
              />
            </View>

            {/* Heading */}
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your Allver account</Text>

            {/* ─── FORM ─── */}
            <View style={styles.form}>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email <Text style={styles.req}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="mail" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
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

              {/* Forgot Password */}
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit */}
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
                  <Feather name="arrow-right" size={16} color={COLORS.green} />
                </View>
              )}
            </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40, flexGrow: 1 },

  header: { marginTop: 8, marginBottom: 16 },
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

  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 160, height: 80 },

  title: { fontSize: 28, fontWeight: '800', color: COLORS.textDark, marginBottom: 6 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 36 },

  form: { gap: 20 },

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
    height: 52,
  },
  inputIcon: { paddingHorizontal: 14 },
  input: { flex: 1, fontSize: 15, color: COLORS.textDark, height: '100%' },
  eyeBtn: { paddingHorizontal: 14, height: '100%', justifyContent: 'center' },

  forgotBtn: { alignSelf: 'flex-end', marginTop: -4 },
  forgotText: { color: COLORS.green, fontSize: 13, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 36,
    ...Platform.select({
      ios: { shadowColor: COLORS.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', marginLeft: 32 },
  arrowCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  footerLink: { color: COLORS.green, fontSize: 14, fontWeight: '700' },
});
