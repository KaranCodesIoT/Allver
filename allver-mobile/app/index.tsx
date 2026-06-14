import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const COLORS = {
  green: '#1BC47D',
  greenDark: '#15A368',
  white: '#FFFFFF',
  textMuted: '#7A8BA0',
  textLight: '#B0BEC5',
  darkBg: '#02122B',
  cardBg: 'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255,255,255,0.06)',
  greenGlow: 'rgba(27, 196, 125, 0.15)',
  greenBorder: 'rgba(27, 196, 125, 0.25)',
};

const FEATURES = [
  { icon: 'users', label: 'Find\nLabour', family: 'feather' },
  { icon: 'hard-hat', label: 'Hire\nContractors', family: 'fa5' },
  { icon: 'clipboard', label: 'Track\nProjects', family: 'feather' },
  { icon: 'bar-chart-2', label: 'Manage\nTeams', family: 'feather' },
];

const ROLES = ['Architect', 'Contractor', 'Labour', 'Client'];

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={require('@/assets/images/bg-welcome.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Multi-layer overlay — heavy on top, lighter on bottom for skyline */}
        <View style={styles.overlayTop} />
        <View style={styles.overlayBottom} />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>

          {/* ─── LOGO SECTION ─── */}
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/images/welcome-logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.tagline}>
              Build. Connect.{' '}
              <Text style={styles.taglineGreen}>Grow.</Text>
            </Text>
          </View>

          {/* ─── HERO COPY ─── */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>
              India's Construction{'\n'}
              <Text style={styles.heroTitleGreen}>Network</Text>
            </Text>
            <View style={styles.accentBar} />
            <Text style={styles.heroSubtitle}>
              Connect with trusted professionals, hire the right people, and manage your projects easily.
            </Text>
          </View>

          {/* ─── BOTTOM ACTIONS ─── */}
          <View style={styles.bottomSection}>

            {/* CTA Buttons */}
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/signup')}
            >
              <Feather name="user-plus" size={18} color={COLORS.white} />
              <Text style={styles.primaryBtnText}>Create Account</Text>
              <View style={styles.arrowCircle}>
                <Feather name="arrow-right" size={16} color={COLORS.green} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.85}
              onPress={() => router.push('/login')}
            >
              <Feather name="log-in" size={18} color={COLORS.green} />
              <Text style={styles.secondaryBtnText}>Login</Text>
            </TouchableOpacity>

            {/* Features Row */}
            <View style={styles.featuresRow}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureCard}>
                  <View style={styles.featureIconWrap}>
                    {f.family === 'fa5' ? (
                      <FontAwesome5 name={f.icon} size={16} color={COLORS.green} />
                    ) : (
                      <Feather name={f.icon as any} size={18} color={COLORS.green} />
                    )}
                  </View>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Role Pills */}
            <View style={styles.rolesRow}>
              {ROLES.map((role, i) => (
                <View key={i} style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{role}</Text>
                </View>
              ))}
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              By continuing, you agree to our{'\n'}
              <Text style={styles.footerLink}>Terms & Conditions</Text>
              {' '}and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>

          </View>

        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

/* ════════════════════════════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  /* Overlay layers — simulates gradient without expo-linear-gradient */
  overlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 18, 43, 0.92)',
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(2, 18, 43, 0)',
  },

  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'android' ? 12 : 8,
  },

  /* ── Logo ── */
  logoSection: {
    alignItems: 'center',
    marginTop: height * 0.02,
  },
  logo: {
    width: 200,
    height: 100,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
    letterSpacing: 1,
    marginTop: 2,
  },
  taglineGreen: {
    color: COLORS.green,
    fontWeight: '700',
  },

  /* ── Hero ── */
  heroSection: {
    marginTop: -10,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 38,
    letterSpacing: -0.3,
  },
  heroTitleGreen: {
    color: COLORS.green,
  },
  accentBar: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.green,
    borderRadius: 2,
    marginTop: 10,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 13.5,
    color: COLORS.textMuted,
    lineHeight: 21,
    maxWidth: 300,
  },

  /* ── Bottom ── */
  bottomSection: {
    width: '100%',
  },

  /* Primary CTA */
  primaryBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.green,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginLeft: 12,
    letterSpacing: 0.2,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Secondary CTA */
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.greenBorder,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 20,
    backgroundColor: 'rgba(27, 196, 125, 0.04)',
  },
  secondaryBtnText: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.2,
  },

  /* Features */
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  featureCard: {
    alignItems: 'center',
    width: '23%',
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureLabel: {
    color: COLORS.textLight,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 13,
    letterSpacing: 0.1,
  },

  /* Role Pills */
  rolesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  rolePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    backgroundColor: COLORS.greenGlow,
  },
  rolePillText: {
    color: COLORS.green,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  /* Footer */
  footer: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
  },
  footerLink: {
    color: COLORS.green,
    fontWeight: '500',
  },
});
