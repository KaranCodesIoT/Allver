import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';

import Constants from 'expo-constants';

const { width } = Dimensions.get('window');
const isDesktop = width > 768;

const COLORS = {
  blue: '#3B82F6', // Exact blue from the image
  blueLight: '#EFF6FF',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  red: '#EF4444',
};

const debuggerHost = Constants.expoConfig?.hostUri;
const localIp = debuggerHost?.split(':')[0];
const BACKEND_URL = localIp ? `http://${localIp}:5000` : (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');

export default function LoginScreen() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        }
        (global as any).currentUser = data.user;
        // If the user is an Architect, send them to the profile completion screen ONLY if profile setup is not completed yet
        if (data.user && data.user.role === 'Architect') {
          const isProfileSetupDone = 
            data.user.experience || 
            data.user.firmName || 
            (data.user.specialization && data.user.specialization.length > 0) ||
            (data.user.portfolioImages && data.user.portfolioImages.length > 0);

          if (isProfileSetupDone) {
            router.push('/(tabs)');
          } else {
            router.push('/architect-profile');
          }
        } else if (data.user && data.user.role === 'Contractor') {
          const isProfileSetupDone = 
            data.user.contractorType || 
            data.user.teamSize || 
            (data.user.workCategory && data.user.workCategory.length > 0) ||
            (data.user.serviceLocation && data.user.serviceLocation.length > 0) ||
            data.user.experience;

          if (isProfileSetupDone) {
            router.push('/(tabs)');
          } else {
            router.push('/contractor-profile');
          }
        } else {
          // Otherwise, go straight to the Dashboard (tabs)
          router.push('/(tabs)');
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to the server. Make sure your backend is running.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          <View style={[styles.splitContainer, !isDesktop && styles.splitContainerMobile]}>
            
            {/* Left Side (Illustration) */}
            <View style={[styles.leftSide, !isDesktop && styles.leftSideMobile]}>
              <SafeAreaView edges={['top', 'left', 'bottom']} style={styles.leftSafeArea}>
                
                <Link href="/" asChild>
                  <TouchableOpacity style={styles.backButton}>
                    <Feather name="arrow-left" size={20} color={COLORS.textDark} />
                  </TouchableOpacity>
                </Link>

                <View style={styles.leftContent}>
                  <Image 
                    source={{ uri: 'https://images.unsplash.com/photo-1541888086425-d81bb19240f5?q=80&w=800&auto=format&fit=crop' }} 
                    style={styles.illustration} 
                    contentFit="cover"
                  />
                  <Text style={styles.welcomeTitle}>Welcome Back to Allver</Text>
                  <Text style={styles.welcomeSubtitle}>
                    Manage your projects, discover skilled contractors, and collaborate with architects securely in one place.
                  </Text>
                </View>

              </SafeAreaView>
            </View>

            {/* Right Side (Form) */}
            <View style={[styles.rightSide, !isDesktop && styles.rightSideMobile]}>
              <SafeAreaView edges={['top', 'right', 'bottom']} style={styles.rightSafeArea}>
                
                <View style={styles.themeToggleContainer}>
                  <TouchableOpacity style={styles.themeToggle}>
                    <Feather name="moon" size={20} color={COLORS.textDark} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formContainer}>
                  
                  {/* Small Brand Tag */}
                  <View style={styles.brandTag}>
                    <FontAwesome5 name="building" size={14} color={COLORS.blue} />
                    <Text style={styles.brandTagText}>Allver</Text>
                  </View>

                  <Text style={styles.formTitle}>Log In</Text>
                  <Text style={styles.formSubtitle}>Access your construction dashboard</Text>

                  {/* Email Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Email <Text style={styles.asterisk}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="mail" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Enter your email address" 
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>

                  {/* Password Input */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Password <Text style={styles.asterisk}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Feather name="lock" size={18} color={COLORS.textMuted} style={styles.inputIcon} />
                      <TextInput 
                        style={styles.input} 
                        placeholder="Enter password" 
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                        <Feather name={showPassword ? "eye" : "eye-off"} size={18} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity 
                    style={[styles.submitBtn, isLoading && { opacity: 0.7 }]} 
                    onPress={handleLogin}
                    disabled={isLoading}
                  >
                    <Text style={styles.submitBtnText}>{isLoading ? 'Logging In...' : 'Log In'}</Text>
                  </TouchableOpacity>

                  {/* Footer Link */}
                  <View style={styles.footerLinkContainer}>
                    <Text style={styles.footerText}>Don't have an account yet? </Text>
                    <Link href="/" asChild>
                      <TouchableOpacity>
                        <Text style={styles.footerLink}>Create Account</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>

                </View>

              </SafeAreaView>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { flexGrow: 1 },
  
  splitContainer: { flex: 1, flexDirection: 'row' },
  splitContainerMobile: { flexDirection: 'column' },
  
  /* Left Side */
  leftSide: { flex: 1, backgroundColor: COLORS.blueLight },
  leftSideMobile: { minHeight: 400 },
  leftSafeArea: { flex: 1, padding: 24 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  leftContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  illustration: { width: '100%', maxWidth: 400, height: 350, marginBottom: 40, borderRadius: 16 },
  welcomeTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textDark, marginBottom: 12, textAlign: 'center' },
  welcomeSubtitle: { fontSize: 14, color: COLORS.textDark, textAlign: 'center', lineHeight: 22, maxWidth: 350 },

  /* Right Side */
  rightSide: { flex: 1, backgroundColor: COLORS.white },
  rightSideMobile: { flex: undefined },
  rightSafeArea: { flex: 1, padding: 24 },
  themeToggleContainer: { alignItems: 'flex-end', marginBottom: 20 },
  themeToggle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  
  formContainer: { flex: 1, justifyContent: 'center', maxWidth: 450, width: '100%', alignSelf: 'center', paddingVertical: 40 },
  brandTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.blueLight, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6, marginBottom: 20 },
  brandTagText: { color: COLORS.blue, fontSize: 13, fontWeight: '700' },
  formTitle: { fontSize: 32, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 },
  formSubtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 40 },
  
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  asterisk: { color: COLORS.red },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, height: 48, backgroundColor: COLORS.white },
  inputIcon: { paddingHorizontal: 15 },
  input: { flex: 1, height: '100%', fontSize: 14, color: COLORS.textDark },
  eyeBtn: { paddingHorizontal: 15, height: '100%', justifyContent: 'center' },
  
  submitBtn: { backgroundColor: COLORS.blue, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 10, marginBottom: 25 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  
  footerLinkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: COLORS.textMuted, fontSize: 13 },
  footerLink: { color: COLORS.blue, fontSize: 13, fontWeight: '700' }
});
