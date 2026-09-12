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
  btnBg: '#F1F5F9',
  btnIcon: '#0F172A',
};

export default function AboutScreen() {
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
        <Text style={styles.headerTitle}>About Allver</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>About Allver</Text>
          <Text style={styles.heroSubtitle}>One Platform. Every Construction Need.</Text>
          <Text style={styles.heroDesc}>
            Allver is a digital construction marketplace built to connect clients, contractors, architects, and skilled labour professionals on one platform.
          </Text>
          <Text style={[styles.heroDesc, { marginTop: 8 }]}>
            Our goal is to make construction easier to discover, connect, coordinate, and manage by bringing people and opportunities together digitally.
          </Text>
        </View>

        {/* Mission & Purpose */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF9EE' }]}>
              <Feather name="target" size={20} color={COLORS.gold} />
            </View>
            <Text style={styles.cardTitle}>Our Mission</Text>
            <Text style={styles.cardText}>
              To organize and digitize India's construction and building trade sector by giving construction professionals a credible digital presence and direct access to relevant work opportunities.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: '#E8FBF3' }]}>
              <Feather name="globe" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Our Purpose</Text>
            <Text style={styles.cardText}>
              The construction industry often depends on fragmented local networks, personal references, and offline coordination. Allver aims to simplify this process through a unified digital platform where construction professionals can showcase their work and clients can discover the right people for their projects.
            </Text>
          </View>
        </View>

        {/* What Allver Offers */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>What Allver Offers</Text>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: '#E8FBF3' }]}>
              <Feather name="compass" size={18} color="#10B981" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Architect & Interior Designer Discovery</Text>
              <Text style={styles.featureText}>
                Discover architects and interior designers, explore their profiles and portfolios, and connect with professionals for your project requirements.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="briefcase" size={18} color="#2563EB" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Contractor Discovery</Text>
              <Text style={styles.featureText}>
                Find contractors for residential and commercial construction requirements and connect with them directly.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: '#FFF7ED' }]}>
              <Feather name="users" size={18} color="#EA580C" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Skilled Labour Discovery</Text>
              <Text style={styles.featureText}>
                Connect with skilled construction professionals such as masons, electricians, plumbers, painters, carpenters, and other tradespeople.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIconWrap, { backgroundColor: '#FAF5FF' }]}>
              <Feather name="layers" size={18} color="#7C3AED" />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Digital Construction Workspaces</Text>
              <Text style={styles.featureText}>
                Support better project coordination through digital communication, quotations, project information, and other construction-related tools.
              </Text>
            </View>
          </View>
        </View>

        {/* Why Allver? */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Why Allver?</Text>

          <View style={styles.advantageRow}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.advantageTitle}>Direct Connections</Text>
              <Text style={styles.advantageText}>
                Connect with construction professionals without unnecessary intermediaries.
              </Text>
            </View>
          </View>

          <View style={styles.advantageRow}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.advantageTitle}>Professional Profiles</Text>
              <Text style={styles.advantageText}>
                Professionals can build a digital presence with their experience, skills, and project work.
              </Text>
            </View>
          </View>

          <View style={styles.advantageRow}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.advantageTitle}>Better Discovery</Text>
              <Text style={styles.advantageText}>
                Make it easier for clients to find relevant construction professionals.
              </Text>
            </View>
          </View>

          <View style={styles.advantageRow}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} style={styles.checkIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.advantageTitle}>Digital Coordination</Text>
              <Text style={styles.advantageText}>
                Bring important project communication and information into one place.
              </Text>
            </View>
          </View>
        </View>

        {/* About the Team */}
        <View style={styles.teamCard}>
          <Text style={styles.teamHeader}>About the Team</Text>
          <Text style={styles.teamDesc}>
            Allver is being built by a team passionate about technology and the construction industry, with the vision of making India's construction ecosystem more organized, accessible, and digital.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.contactLabel}>For any questions or enquiries:</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={handleEmailPress}
            activeOpacity={0.8}
          >
            <Feather name="mail" size={16} color={COLORS.gold} />
            <Text style={styles.contactEmail}>contact@allver.in</Text>
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
  heroCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    lineHeight: 30,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  heroDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 14,
  },
  card: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  advantageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.cardWhite,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  checkIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  advantageTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 3,
  },
  advantageText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  teamCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  teamHeader: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  teamDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 14,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gold,
  },
});
