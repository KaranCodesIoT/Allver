import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ImageBackground, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';

const COLORS = {
  green: '#16A34A',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  red: '#EF4444',
  bgLight: '#F3F4F6'
};

import { BACKEND_URL } from '../constants/Config';

export default function SignupScreen() {
  const router = useRouter();
  const [role, setRole] = useState('Architect');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');

  const handleSignup = async () => {
    if (!fullName || !email || !password || !city) {
      Alert.alert('Missing Fields', 'Please fill in all mandatory fields.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          email,
          phoneNumber,
          password,
          role,
          city
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Account created successfully!', [
          { text: 'OK', onPress: () => router.push('/login') }
        ]);
      } else {
        Alert.alert('Registration Failed', data.message || 'Something went wrong.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to the server. Make sure your backend is running.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const RoleOption = ({ title, iconName, iconType }: { title: string, iconName: string, iconType: 'Feather' | 'FA5' }) => {
    const isSelected = role === title;
    return (
      <TouchableOpacity 
        style={[styles.roleOption, isSelected && styles.roleOptionSelected]}
        onPress={() => setRole(title)}
      >
        {iconType === 'Feather' ? (
          <Feather name={iconName as any} size={24} color={isSelected ? COLORS.green : COLORS.textDark} />
        ) : (
          <FontAwesome5 name={iconName} size={24} color={isSelected ? COLORS.green : COLORS.textDark} />
        )}
        <Text style={[styles.roleOptionText, isSelected && styles.roleOptionTextSelected]}>{title}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        
        {/* Header Section with Illustration */}
        <ImageBackground 
          source={{ uri: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=1000&auto=format&fit=crop' }} 
          style={styles.headerIllustration}
          imageStyle={{ opacity: 0.2 }}
        >
          <SafeAreaView style={styles.safeArea}>
            <Link href="/" asChild>
              <TouchableOpacity style={styles.backButton}>
                <Feather name="arrow-left" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </Link>
            
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Create Your Account</Text>
              <Text style={styles.headerSubtitle}>
                Join and connect with trusted{'\n'}professionals in construction.
              </Text>
            </View>
          </SafeAreaView>
        </ImageBackground>

        {/* White Form Card */}
        <View style={styles.formCard}>
          
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIconCol}>
              <Feather name="user" size={20} color={COLORS.green} />
            </View>
            <View style={styles.inputContentCol}>
              <Text style={styles.inputLabel}>Full Name <Text style={styles.asterisk}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter your full name" 
                  placeholderTextColor={COLORS.textMuted}
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIconCol}>
              <Feather name="mail" size={20} color={COLORS.green} />
            </View>
            <View style={styles.inputContentCol}>
              <Text style={styles.inputLabel}>Email <Text style={styles.asterisk}>*</Text></Text>
              <View style={styles.inputWrapper}>
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
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIconCol}>
              <Feather name="phone" size={20} color={COLORS.green} />
            </View>
            <View style={styles.inputContentCol}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <View style={[styles.inputWrapper, { paddingLeft: 0 }]}>
                <View style={styles.countryCodeBox}>
                  <Text style={styles.countryCodeText}>+91</Text>
                  <Feather name="chevron-down" size={16} color={COLORS.textDark} />
                </View>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter your phone number" 
                  placeholderTextColor={COLORS.textMuted} 
                  keyboardType="phone-pad" 
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>
              <Text style={styles.inputHelper}>We will send OTP on this number</Text>
            </View>
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIconCol}>
              <Feather name="lock" size={20} color={COLORS.green} />
            </View>
            <View style={styles.inputContentCol}>
              <Text style={styles.inputLabel}>Password <Text style={styles.asterisk}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <TextInput 
                  style={styles.input} 
                  placeholder="Enter your password" 
                  placeholderTextColor={COLORS.textMuted} 
                  secureTextEntry={!showPassword} 
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.inputHelper}>Minimum 6 characters</Text>
            </View>
          </View>

          {/* I am a... Role Selector */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIconCol}>
              <Feather name="users" size={20} color={COLORS.green} />
            </View>
            <View style={styles.inputContentCol}>
              <Text style={styles.inputLabel}>I am a <Text style={styles.asterisk}>*</Text></Text>
              <View style={styles.rolesRow}>
                <RoleOption title="Architect" iconName="compass" iconType="Feather" />
                <RoleOption title="Contractor" iconName="hard-hat" iconType="FA5" />
                <RoleOption title="Labour" iconName="hammer" iconType="FA5" />
                <RoleOption title="Client" iconName="user" iconType="Feather" />
              </View>
            </View>
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <View style={styles.inputIconCol}>
              <Feather name="map-pin" size={20} color={COLORS.green} />
            </View>
            <View style={styles.inputContentCol}>
              <Text style={styles.inputLabel}>City <Text style={styles.asterisk}>*</Text></Text>
              <View style={styles.inputWrapper}>
                <TextInput 
                  style={[styles.input, { marginTop: 0 }]} 
                  placeholder="Select or enter your city" 
                  placeholderTextColor={COLORS.textMuted}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitBtn, isLoading && { opacity: 0.7 }]} 
            onPress={handleSignup}
            disabled={isLoading}
          >
            <Text style={styles.submitBtnText}>{isLoading ? 'Creating Account...' : 'Create Account'}</Text>
          </TouchableOpacity>

          {/* Footer Link */}
          <View style={styles.footerLinkContainer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  scrollContent: { flexGrow: 1 },
  headerIllustration: { width: '100%', height: 260, backgroundColor: '#E0F2FE' },
  safeArea: { flex: 1, paddingHorizontal: 24, paddingTop: 10 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTextContainer: { marginTop: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 },
  headerSubtitle: { fontSize: 14, color: COLORS.textDark, lineHeight: 20 },
  
  formCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -40,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 50,
    flex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5,
  },
  
  inputGroup: { flexDirection: 'row', marginBottom: 25 },
  inputIconCol: { width: 40, paddingTop: 30, alignItems: 'center' },
  inputContentCol: { flex: 1 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  asterisk: { color: COLORS.red },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 48,
    backgroundColor: COLORS.white
  },
  input: { flex: 1, fontSize: 14, color: COLORS.textDark },
  inputHelper: { fontSize: 12, color: COLORS.textMuted, marginTop: 6 },
  eyeIcon: { padding: 5 },
  
  countryCodeBox: { flexDirection: 'row', alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.border, paddingHorizontal: 15, height: '100%', gap: 5 },
  countryCodeText: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  
  rolesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleOption: {
    flex: 1,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  roleOptionSelected: { borderColor: COLORS.green, backgroundColor: '#F0FDF4' },
  roleOptionText: { fontSize: 12, fontWeight: '600', color: COLORS.textDark },
  roleOptionTextSelected: { color: COLORS.green },
  
  submitBtn: { backgroundColor: COLORS.green, borderRadius: 8, paddingVertical: 16, alignItems: 'center', marginTop: 10, marginBottom: 25 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  
  footerLinkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  footerLink: { color: COLORS.green, fontSize: 14, fontWeight: '700' }
});
