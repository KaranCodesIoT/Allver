import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const COLORS = {
  bgLight: '#F8FAFC',
  cardWhite: '#FFFFFF',
  borderLight: '#E2E8F0',
  textDark: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  gold: '#B48C36',
  goldBg: '#FEF9EE',
  goldBorder: '#F3E5C8',
  primary: '#10B981',
  primaryDark: '#0F4C43',
  inputBg: '#F8FAFC',
  inputBorder: '#CBD5E1',
  inputFocusBorder: '#B48C36',
  btnBg: '#F1F5F9',
  btnIcon: '#0F172A',
  red: '#EF4444',
  green: '#10B981',
};

export default function ContactScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      if (Platform.OS === 'web') {
        alert('Please fill in all required fields.');
      } else {
        Alert.alert('Required Fields', 'Please fill in all required fields.');
      }
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    }, 600);
  };

  const handleDirectEmail = () => {
    Linking.openURL('mailto:contact@allver.in').catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="arrow-left" size={22} color={COLORS.btnIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Allver</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Card */}
          <View style={styles.headerCard}>
            <Text style={styles.title}>Contact Allver</Text>
            <Text style={styles.subtitle}>Get in Touch with Allver</Text>
            <Text style={styles.desc}>
              Have a question, suggestion, feedback, or business enquiry? We'd be happy to hear from you.
            </Text>
          </View>

          {/* Contact Us Direct Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardSectionHeader}>Contact Us</Text>
            <Text style={styles.infoLabel}>Official Contact Email</Text>
            
            <TouchableOpacity
              style={styles.emailRow}
              onPress={handleDirectEmail}
              activeOpacity={0.8}
            >
              <Feather name="mail" size={18} color={COLORS.gold} />
              <Text style={styles.emailText}>contact@allver.in</Text>
            </TouchableOpacity>

            <Text style={styles.infoSubtext}>
              For general enquiries, support, partnerships, feedback, or other questions, please contact us through the email above.
            </Text>
          </View>

          {/* Support Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.cardSectionHeader}>Support</Text>
            <Text style={styles.infoLabel}>Dedicated Support Desk</Text>
            
            <TouchableOpacity
              style={styles.emailRow}
              onPress={() => Linking.openURL('mailto:support@allver.in').catch(() => {})}
              activeOpacity={0.8}
            >
              <Feather name="help-circle" size={18} color={COLORS.gold} />
              <Text style={styles.emailText}>support@allver.in</Text>
            </TouchableOpacity>

            <Text style={styles.infoSubtext}>
              For support-related questions, please provide as much relevant information as possible so that our team can assist you.
            </Text>
          </View>

          {/* Contact Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formHeader}>Send Us a Message</Text>

            {submitted ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={48} color={COLORS.green} />
                <Text style={styles.successTitle}>Thank You!</Text>
                <Text style={styles.successDesc}>
                  Your message has been received. Our team will review your enquiry and reach out to you at the provided email address.
                </Text>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => setSubmitted(false)}
                >
                  <Text style={styles.resetBtnText}>Send Another Message</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Full Name <Text style={{ color: COLORS.red }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name."
                    placeholderTextColor={COLORS.textMuted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Email Address <Text style={{ color: COLORS.red }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address."
                    placeholderTextColor={COLORS.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Subject <Text style={{ color: COLORS.red }}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter the subject of your enquiry."
                    placeholderTextColor={COLORS.textMuted}
                    value={subject}
                    onChangeText={setSubject}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Message <Text style={{ color: COLORS.red }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Write your message or enquiry here."
                    placeholderTextColor={COLORS.textMuted}
                    value={message}
                    onChangeText={setMessage}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Message</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.cardWhite,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.btnBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gold,
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gold,
  },
  infoSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  formHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.textDark,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  submitBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 12,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  resetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FEF9EE',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3E5C8',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
  },
});
