import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const COLORS = {
  bgLight: '#F8FAFC',
  cardWhite: '#FFFFFF',
  borderLight: '#E2E8F0',
  textDark: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  primary: '#10B981',
  primaryDark: '#047857',
  gold: '#B48C36',
  btnBg: '#F1F5F9',
  btnIcon: '#0F172A',
};

const STEPS = [
  {
    number: '01',
    title: 'Define Your Requirements',
    desc: 'Specify your construction or renovation needs—ranging from architectural drawings and full civil construction to specialized electrical or plumbing work. State your site location, scope, and target schedule.',
    icon: 'file-text',
  },
  {
    number: '02',
    title: 'Discover & Compare Verified Experts',
    desc: 'Explore comprehensive profiles of licensed contractors, accredited architects, and experienced trade workers. Review past completed projects, customer ratings, specialized skills, and verified credentials.',
    icon: 'search',
  },
  {
    number: '03',
    title: 'Direct Quotations & Agreement',
    desc: 'Communicate directly with professionals through our platform. Receive itemized quotations, negotiate terms, agree on material specifications, and set milestone payment schedules without intermediary markups.',
    icon: 'check-square',
  },
  {
    number: '04',
    title: 'Execute, Track & Complete',
    desc: 'Coordinate project progress through shared digital timelines, chat channels, and milestone verification. Ensure work complies with agreed building standards before final project signoff and release.',
    icon: 'shield',
  },
];

const AUDIENCES = [
  {
    id: 'clients',
    title: 'For Clients & Homeowners',
    icon: 'home',
    points: [
      'Access vetted civil contractors, architects, and trade workers in your city',
      'Compare transparent estimates without unexpected hidden contractor markups',
      'Retain complete oversight of site milestones, schedules, and deliverables',
      'Direct communication channel with all on-site professional leads',
    ],
  },
  {
    id: 'contractors',
    title: 'For General Contractors & Builders',
    icon: 'briefcase',
    points: [
      'Expand regional project pipeline and win verified residential/commercial leads',
      'Showcase portfolio of completed structures with verified site photography',
      'Staff specialized tradesmen on-demand to balance workforce requirements',
      'Maintain documented agreements and transparent milestone approvals',
    ],
  },
  {
    id: 'architects',
    title: 'For Architects & Interior Designers',
    icon: 'compass',
    points: [
      'Publish high-resolution design portfolios and 3D elevation renderings',
      'Connect with clients seeking modern structural and interior blueprints',
      'Bridge the communication gap between architectural plans and site execution',
      'Establish a recognized digital brand in the Indian construction ecosystem',
    ],
  },
  {
    id: 'labour',
    title: 'For Skilled Trade Workforce',
    icon: 'users',
    points: [
      'Direct access to daily wage and contract work without middleman cuts',
      'Transparent fair wage benchmarks for masons, plumbers, electricians, painters',
      'Build a verifiable track record of consistent, high-quality trade execution',
      'Prompt payment settlements directly upon verified task completion',
    ],
  },
];

export default function HowItWorksScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'clients' | 'contractors' | 'architects' | 'labour'>('clients');

  const currentAudience = AUDIENCES.find((a) => a.id === activeTab) || AUDIENCES[0];

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
        <Text style={styles.headerTitle}>How Allver Works</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>SIMPLE & TRANSPARENT</Text>
          <Text style={styles.heroTitle}>A Modern Approach to Construction Hiring</Text>
          <Text style={styles.heroDesc}>
            Traditional construction in India often suffers from fragmented networks, opaque pricing, and communication gaps. Allver brings all stakeholders onto one unified digital platform.
          </Text>
        </View>

        {/* 4-Step Process */}
        <Text style={styles.sectionHeading}>The 4-Step Process</Text>
        {STEPS.map((step) => (
          <View key={step.number} style={styles.stepCard}>
            <View style={styles.stepTop}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>{step.number}</Text>
              </View>
              <View style={styles.stepIconWrap}>
                <Feather name={step.icon as any} size={18} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
        ))}

        {/* Role Breakdown Tabs */}
        <Text style={[styles.sectionHeading, { marginTop: 16 }]}>Tailored for Every Stakeholder</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {AUDIENCES.map((aud) => (
            <TouchableOpacity
              key={aud.id}
              style={[styles.tabBtn, activeTab === aud.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(aud.id as any)}
            >
              <Text style={[styles.tabBtnText, activeTab === aud.id && styles.tabBtnTextActive]}>
                {aud.title.replace('For ', '')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Audience Card */}
        <View style={styles.audienceCard}>
          <Text style={styles.audienceTitle}>{currentAudience.title}</Text>
          <View style={styles.pointsWrap}>
            {currentAudience.points.map((pt, idx) => (
              <View key={idx} style={styles.audiencePointRow}>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={{ marginTop: 1 }} />
                <Text style={styles.audiencePointText}>{pt}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA Card */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Ready to Start Your Construction Project?</Text>
          <Text style={styles.ctaDesc}>
            Join thousands of property owners, general contractors, architects, and skilled tradesmen building smarter across India.
          </Text>
          <View style={styles.ctaBtnRow}>
            <TouchableOpacity
              style={styles.ctaPrimaryBtn}
              onPress={() => router.push('/contractors')}
            >
              <Text style={styles.ctaPrimaryBtnText}>Explore Contractors</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondaryBtn}
              onPress={() => router.push('/contact')}
            >
              <Text style={styles.ctaSecondaryBtnText}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgLight },
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textDark },
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  contentContainer: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  heroBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
    lineHeight: 28,
  },
  heroDesc: {
    fontSize: 13.5,
    color: '#CBD5E1',
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  stepCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 12,
  },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stepNumberBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  tabsScroll: {
    gap: 8,
    paddingBottom: 8,
    marginBottom: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  audienceCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 20,
  },
  audienceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  pointsWrap: {
    gap: 10,
  },
  audiencePointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  audiencePointText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  ctaCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 8,
  },
  ctaDesc: {
    fontSize: 13,
    color: '#15803D',
    lineHeight: 19,
    marginBottom: 16,
  },
  ctaBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaPrimaryBtn: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  ctaPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  ctaSecondaryBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  ctaSecondaryBtnText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '700',
  },
});
