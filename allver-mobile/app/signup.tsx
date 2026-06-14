import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, Platform, Alert, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter, Link } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';

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
};

const ROLES = [
  { title: 'Architect', icon: 'compass', type: 'feather' },
  { title: 'Contractor', icon: 'hard-hat', type: 'fa5' },
  { title: 'Labour', icon: 'tool', type: 'feather' },
  { title: 'Client', icon: 'user', type: 'feather' },
];

export default function SignupScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Client');
  const [city, setCity] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !city) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phoneNumber, password, role, city }),
      });
      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => router.push('/login') },
        ]);
      } else {
        Alert.alert('Registration Failed', data.message || 'Something went wrong.');
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

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join India's largest construction network
            </Text>

            {/* ─── FORM ─── */}
            <View style={styles.form}>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name <Text style={styles.req}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="user" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor={COLORS.textMuted}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email <Text style={styles.req}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="mail" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>
              </View>

              {/* Phone (optional) */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrap}>
                  <Feather name="phone" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+91 XXXXX XXXXX"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
              </View>

              {/* City */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>City <Text style={styles.req}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="map-pin" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mumbai, Delhi"
                    placeholderTextColor={COLORS.textMuted}
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              {/* Role Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>I am a <Text style={styles.req}>*</Text></Text>
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
                <Text style={styles.label}>Password <Text style={styles.req}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 characters"
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
                <Text style={styles.label}>Confirm Password <Text style={styles.req}>*</Text></Text>
                <View style={styles.inputWrap}>
                  <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
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
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Text>
              {!isLoading && (
                <View style={styles.arrowCircle}>
                  <Feather name="arrow-right" size={16} color={COLORS.green} />
                </View>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Login</Text>
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
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 28,
    ...Platform.select({
      ios: { shadowColor: COLORS.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center', marginLeft: 32 },
  arrowCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center' },

  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 10 },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  footerLink: { color: COLORS.green, fontSize: 14, fontWeight: '700' },
});
