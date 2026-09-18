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

export default function PrivacyPolicyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Info */}
        <View style={styles.headerCard}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.date}>Last Updated: September 12, 2026</Text>
          <Text style={styles.intro}>
            This Privacy Policy explains how Allver (allver.in) collects, uses, stores, and protects information when you use our website and services.
          </Text>
        </View>

        {/* Section 1 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>1. Information We Collect</Text>
          <Text style={styles.bodyText}>
            We may collect information that you provide directly when using Allver, including:
          </Text>

          <Text style={styles.subHeading}>Account Information</Text>
          <Text style={styles.bodyText}>
            Name, email address, phone number, password, and selected account role.
          </Text>

          <Text style={styles.subHeading}>Professional Profile Information</Text>
          <Text style={styles.bodyText}>
            Location, experience, skills, biography, and portfolio or project information that you choose to provide.
          </Text>

          <Text style={styles.subHeading}>Project & Communication Information</Text>
          <Text style={styles.bodyText}>
            Information you provide through project interactions, messages, quotations, enquiries, and other platform activities.
          </Text>

          <Text style={styles.subHeading}>Support Information</Text>
          <Text style={styles.bodyText}>
            Information you provide when contacting us for support or other enquiries.
          </Text>
        </View>

        {/* Section 2 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>2. How We Use Information</Text>
          <Text style={styles.bodyText}>We use information to:</Text>
          
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Create and maintain your Allver account.</Text>
            <Text style={styles.bulletItem}>• Provide and improve Allver's features and services.</Text>
            <Text style={styles.bulletItem}>• Help users discover relevant construction professionals.</Text>
            <Text style={styles.bulletItem}>• Enable communication and project-related interactions.</Text>
            <Text style={styles.bulletItem}>• Respond to support requests and enquiries.</Text>
            <Text style={styles.bulletItem}>• Maintain platform security and prevent misuse.</Text>
            <Text style={styles.bulletItem}>• Improve the reliability and functionality of our services.</Text>
          </View>
        </View>

        {/* Section 3 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>3. Cookies & Tracking Technologies</Text>
          <Text style={styles.bodyText}>
            Allver uses cookies, web beacons, device identifiers, and similar storage technologies to maintain secure user sessions, remember language and UI preferences, enhance platform speed, and analyze web traffic trends.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Cookies are small data files placed on your device. You can configure your browser or mobile operating system to refuse all cookies or notify you when a cookie is being sent. However, certain interactive features of Allver may not function properly without essential cookies.
          </Text>
        </View>

        {/* Section 4 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>4. Third-Party Advertising & Google AdSense Disclosures</Text>
          <Text style={styles.bodyText}>
            Allver (allver.in) partners with third-party advertising vendors, including Google AdSense, to serve advertisements when you visit our website.
          </Text>
          
          <Text style={[styles.subHeading, { marginTop: 12 }]}>Google AdSense & DoubleClick Cookie</Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to allver.in or other websites across the Internet.</Text>
            <Text style={styles.bulletItem}>• Google's use of advertising cookies enables it and its partners to serve personalized advertisements to users based on their visits to our website and other websites on the Internet.</Text>
            <Text style={styles.bulletItem}>• Users may opt out of personalized advertising by visiting Google Ads Settings at https://www.google.com/settings/ads.</Text>
            <Text style={styles.bulletItem}>• Alternatively, you can opt out of a third-party vendor's use of cookies for personalized advertising by visiting the Network Advertising Initiative or AboutAds at https://www.aboutads.info/choices.</Text>
          </View>

          <Text style={[styles.subHeading, { marginTop: 12 }]}>Log Files & Web Analytics</Text>
          <Text style={styles.bodyText}>
            Like most digital web platforms, Allver gathers certain standard internet log information automatically. This may include Internet Protocol (IP) addresses, browser type, Internet Service Provider (ISP), referring and exit pages, operating system, date/time stamps, and on-site clickstream data. This information is utilized strictly to analyze usage patterns, secure platform infrastructure, and administer website performance.
          </Text>
        </View>

        {/* Section 5 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>5. Third-Party Service Providers</Text>
          <Text style={styles.bodyText}>
            Allver may employ vetted third-party companies and individuals to facilitate core platform operations, including cloud hosting, database storage, user authentication, map geocoding services (Google Maps API), transactional SMS gateways, and payment processing.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            These third parties have access to personal information solely to perform specific tasks on our behalf and are legally obligated under confidentiality terms not to disclose or use your data for any other independent purpose.
          </Text>
        </View>

        {/* Section 6 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>6. Data Security</Text>
          <Text style={styles.bodyText}>
            We take reasonable measures to protect your information from unauthorized access, alteration, disclosure, or destruction.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Communications with Allver servers may be protected using HTTPS/TLS, and sensitive credentials are protected using appropriate security measures.
          </Text>
        </View>

        {/* Section 7 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>7. Your Rights & Account Deletion</Text>
          <Text style={styles.bodyText}>
            You may request access to, correction of, or deletion of your personal information, subject to applicable law and legitimate operational or legal requirements.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>You may contact us at:</Text>
          <TouchableOpacity onPress={handleEmailPress} style={{ marginTop: 4 }}>
            <Text style={styles.linkText}>contact@allver.in</Text>
          </TouchableOpacity>
        </View>

        {/* Section 8 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>8. Changes to This Privacy Policy</Text>
          <Text style={styles.bodyText}>
            We may update this Privacy Policy from time to time to reflect changes to our services, technology, or legal requirements.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            Any updated version will be published on this page with a revised "Last Updated" date.
          </Text>
        </View>

        {/* Section 9 */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>9. Contact Us</Text>
          <Text style={styles.bodyText}>
            For privacy-related questions or requests, contact:
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
  subHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gold,
    marginTop: 12,
    marginBottom: 4,
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
