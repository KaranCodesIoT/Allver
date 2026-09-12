import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
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
  btnBg: '#F1F5F9',
  btnIcon: '#0F172A',
};

export default function TermsScreen() {
  const router = useRouter();

  const handleEmailPress = () => {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Info */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>Terms of Service</Text>
          <Text style={styles.date}>Last Updated: September 12, 2026</Text>
          <Text style={styles.intro}>
            These Terms of Service govern your use of Allver (allver.in) and its services. By accessing or using Allver, you agree to these Terms.
          </Text>
        </View>

        {/* Section 1 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>1. About Allver</Text>
          <Text style={styles.bodyText}>
            Allver is a digital construction marketplace that helps connect clients with construction professionals, including architects, contractors, interior designers, skilled labourers, and other service providers.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Allver provides a platform for discovery, communication, and construction-related interactions.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>2. User Accounts</Text>
          <Text style={styles.bodyText}>
            Some Allver features may require you to create an account.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>You are responsible for:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Providing accurate information.</Text>
            <Text style={styles.bulletItem}>• Keeping your login credentials secure.</Text>
            <Text style={styles.bulletItem}>• Maintaining the accuracy of your profile.</Text>
            <Text style={styles.bulletItem}>• Using your account only for legitimate purposes.</Text>
          </View>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            You must not impersonate another person or provide misleading information.
          </Text>
        </View>

        {/* Section 3 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>3. Professional Profiles</Text>
          <Text style={styles.bodyText}>
            Construction professionals may create profiles containing information such as their experience, skills, location, services, and portfolio or project information.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Users are responsible for ensuring that the information they provide is accurate and does not violate the rights of others.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Allver does not guarantee that every profile, portfolio, claim, qualification, or work history provided by a user is accurate unless explicitly stated as verified by Allver.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>4. User Conduct</Text>
          <Text style={styles.bodyText}>You agree not to:</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Use Allver for unlawful or fraudulent purposes.</Text>
            <Text style={styles.bulletItem}>• Provide false or misleading information.</Text>
            <Text style={styles.bulletItem}>• Harass, abuse, or threaten other users.</Text>
            <Text style={styles.bulletItem}>• Upload harmful or malicious content.</Text>
            <Text style={styles.bulletItem}>• Attempt to gain unauthorized access to accounts or systems.</Text>
            <Text style={styles.bulletItem}>• Misuse the platform or interfere with its operation.</Text>
            <Text style={styles.bulletItem}>• Use the platform to distribute spam or unsolicited communications.</Text>
          </View>
        </View>

        {/* Section 5 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>5. Connections & Transactions</Text>
          <Text style={styles.bodyText}>
            Allver may help users discover and communicate with construction professionals.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Any agreement, quotation, payment, contract, employment arrangement, or other transaction between users is entered into directly between the relevant parties unless Allver explicitly states otherwise.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Users are responsible for independently evaluating professionals and agreeing on project terms before proceeding.
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>6. Payments & Fees</Text>
          <Text style={styles.bodyText}>
            Certain Allver features or services may be offered for free, while others may be subject to fees or subscription charges.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Where applicable, pricing and payment terms will be communicated before a paid service is used or purchased.
          </Text>
        </View>

        {/* Section 7 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>7. Intellectual Property</Text>
          <Text style={styles.bodyText}>
            The Allver name, branding, website, software, design, and original content are owned by or licensed to Allver unless otherwise stated.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            You may not copy, reproduce, modify, distribute, or commercially exploit Allver's intellectual property without appropriate permission.
          </Text>
        </View>

        {/* Section 8 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>8. User Content</Text>
          <Text style={styles.bodyText}>
            You retain ownership of content that you submit to Allver, subject to the rights necessary for Allver to operate and provide its services.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            By submitting content, you grant Allver permission to use, store, display, and process that content as reasonably necessary to provide the platform's services.
          </Text>
        </View>

        {/* Section 9 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>9. Availability of Services</Text>
          <Text style={styles.bodyText}>
            We aim to keep Allver available and reliable, but we do not guarantee that the platform will always be uninterrupted, error-free, or available at all times.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Features may be modified, suspended, or discontinued when necessary.
          </Text>
        </View>

        {/* Section 10 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>10. Limitation of Responsibility</Text>
          <Text style={styles.bodyText}>
            Allver provides a platform for connecting users and construction professionals.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            We do not guarantee the quality, availability, qualifications, conduct, pricing, performance, or suitability of any user or professional unless explicitly stated.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Users should independently verify information and make their own decisions before entering into agreements or transactions.
          </Text>
        </View>

        {/* Section 11 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>11. Account Suspension or Termination</Text>
          <Text style={styles.bodyText}>
            Allver may suspend or terminate an account where necessary, including for violations of these Terms, misuse of the platform, fraudulent activity, or security concerns.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>Users may request account deletion by contacting:</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:support@allver.in').catch(() => {})} style={{ marginTop: 4 }}>
            <Text style={styles.linkText}>support@allver.in</Text>
          </TouchableOpacity>
        </View>

        {/* Section 12 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>12. Changes to These Terms</Text>
          <Text style={styles.bodyText}>
            We may update these Terms of Service from time to time.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Updated Terms will be published on this page with a revised "Last Updated" date.
          </Text>
        </View>

        {/* Section 13 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>13. Contact Us</Text>
          <Text style={styles.bodyText}>
            For questions regarding these Terms of Service, contact:
          </Text>
          <TouchableOpacity onPress={handleEmailPress} style={{ marginTop: 6 }}>
            <Text style={styles.linkText}>contact@allver.in</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  date: {
    fontSize: 13,
    color: COLORS.gold,
    fontWeight: '700',
    marginBottom: 10,
  },
  intro: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bulletList: {
    marginTop: 8,
  },
  bulletItem: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 6,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gold,
  },
});
