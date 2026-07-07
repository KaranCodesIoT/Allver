import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView,
  Platform, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation, SUPPORTED_LANGUAGES, getDeviceLanguage, getLocalLanguage } from '../utils/i18n';
import { getToken, getStoredUser } from '../constants/Auth';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#16A34A',
  greenLight: '#F0FDF4',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F9FAFB',
};

export default function ChooseLanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [selectedCode, setSelectedCode] = useState('en');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // 1. Check if user is logged in
    let user = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { user = JSON.parse(stored); } catch (_) {}
      }
    } else {
      user = (global as any).currentUser;
    }
    setCurrentUser(user);

    // 2. Detect language: local storage -> user profile -> device default
    const storedLang = getLocalLanguage();
    const profileLang = user?.language;
    
    if (storedLang) {
      setSelectedCode(storedLang);
    } else if (profileLang) {
      setSelectedCode(profileLang);
    } else {
      const devLang = getDeviceLanguage();
      setSelectedCode(devLang);
    }
  }, []);

  const handleContinue = async () => {
    setLoading(true);
    try {
      // Save language state
      i18n.changeLanguage(selectedCode);

      // Route based on auth state
      const token = await getToken();
      const storedUserStr = await getStoredUser();

      if (token && storedUserStr) {
        try {
          const user = JSON.parse(storedUserStr);
          (global as any).currentUser = user;
          
          console.log('[Language] Found active session. Redirecting to appropriate screen...');
          if (user?.role === 'Architect') {
            const done =
              user.experience ||
              user.firmName ||
              (user.specialization?.length > 0) ||
              (user.portfolioImages?.length > 0);
            router.replace(done ? '/(tabs)' : '/architect-profile');
          } else if (user?.role === 'Contractor') {
            const done =
              user.contractorType ||
              user.teamSize ||
              (user.workCategory?.length > 0) ||
              (user.serviceLocation?.length > 0) ||
              user.experience;
            router.replace(done ? '/(tabs)' : '/contractor-profile');
          } else {
            router.replace('/(tabs)');
          }
          return;
        } catch (e) {
          console.error('[Language] Failed to parse stored user:', e);
        }
      }

      // Default: Go to signup
      router.replace('/signup');
    } catch (err) {
      console.error(err);
      router.replace('/signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/splash-logo.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={styles.brandName}>ALLVER</Text>
        </View>

        {/* Title Section */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Choose Your Language</Text>
          <Text style={styles.subtitle}>अपनी पसंदीदा भाषा चुनें | ದಯವಿಟ್ಟು ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ</Text>
        </View>

        {/* Language Grid/List */}
        <View style={styles.languageList}>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = selectedCode === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.languageItem, isSelected && styles.languageItemActive]}
                onPress={() => setSelectedCode(lang.code)}
                activeOpacity={0.7}
              >
                <View style={styles.languageDetails}>
                  <Text style={[styles.nativeLabel, isSelected && styles.textActive]}>
                    {lang.nativeLabel}
                  </Text>
                  <Text style={styles.englishLabel}>{lang.label}</Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                  {isSelected && <View style={styles.radioInnerCircle} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <View style={styles.continueContent}>
              <Text style={styles.continueText}>Continue</Text>
              <Feather name="arrow-right" size={18} color={COLORS.white} />
            </View>
          )}
        </TouchableOpacity>

        {/* Login Option for returning users */}
        <TouchableOpacity 
          onPress={async () => {
            i18n.changeLanguage(selectedCode);
            router.replace('/login');
          }}
          style={{ marginTop: 20, paddingVertical: 10 }}
          activeOpacity={0.7}
        >
          <Text style={{ color: COLORS.green, fontWeight: '700', fontSize: 14 }}>
            Already have an account? Log In
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 60,
    height: 60,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F4C43',
    letterSpacing: 2,
    marginTop: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  languageList: {
    width: '100%',
    gap: 12,
    marginBottom: 40,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgLight,
  },
  languageItemActive: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLight,
  },
  languageDetails: {
    flexDirection: 'column',
  },
  nativeLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  textActive: {
    color: COLORS.green,
  },
  englishLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: COLORS.green,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  continueButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#0F4C43',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  continueContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  continueText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
