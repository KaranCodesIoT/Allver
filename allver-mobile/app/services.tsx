import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
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
  blue: '#2563EB',
  orange: '#EA580C',
  purple: '#7C3AED',
};

const SERVICES = [
  {
    id: 'residential',
    title: 'Residential Construction',
    badge: 'Core Service',
    badgeBg: '#DCFCE7',
    badgeColor: '#15803D',
    icon: 'home',
    lib: 'Feather',
    color: COLORS.primary,
    desc: 'Turnkey home construction, independent villas, duplexes, structural framing, foundation engineering, and multi-storey residential building contracting across India.',
    points: [
      'Comprehensive structural planning and RCC framework execution',
      'End-to-end site management with verified civil contractors',
      'Transparent milestone scheduling and material delivery tracking',
      'Compliance with National Building Code (NBC) standards',
    ],
  },
  {
    id: 'commercial',
    title: 'Commercial Construction & Fitouts',
    badge: 'Enterprise',
    badgeBg: '#DBEAFE',
    badgeColor: '#1D4ED8',
    icon: 'office-building',
    lib: 'MaterialCommunityIcons',
    color: COLORS.blue,
    desc: 'Commercial building structures, retail storefronts, office fitouts, industrial warehouses, and institutional facilities delivered with strict schedule adherence.',
    points: [
      'Large-scale concrete, steel structural framing, and envelope systems',
      'Corporate interior fitouts, modular partitions, and acoustics',
      'Fire safety, MEP (Mechanical, Electrical, Plumbing) integration',
      'Contractor bidding with verifiable portfolio records',
    ],
  },
  {
    id: 'architecture',
    title: 'Architectural Planning & 3D Elevation',
    badge: 'Design Studio',
    badgeBg: '#F3E8FF',
    badgeColor: '#6B21A8',
    icon: 'drafting-compass',
    lib: 'FontAwesome5',
    color: COLORS.purple,
    desc: 'Certified architects providing municipal sanctioned floor plans, 3D exterior elevations, structural load calculations, and sustainable bioclimatic layouts.',
    points: [
      'Custom floor plans aligned with Vastu Shastra and modern aesthetics',
      'Photorealistic 3D rendering and interior walkthrough visualizations',
      'Structural drawings and municipal approval documentation support',
      'Direct collaboration between architect and on-site contractor',
    ],
  },
  {
    id: 'interior',
    title: 'Interior Design & Space Optimization',
    badge: 'Interiors',
    badgeBg: '#FFEDD5',
    badgeColor: '#C2410C',
    icon: 'sofa',
    lib: 'MaterialCommunityIcons',
    color: COLORS.orange,
    desc: 'Bespoke interior concepts, modular kitchen design, false ceilings, customized cabinetry, ambient lighting, and high-end surface finishes.',
    points: [
      'Custom modular kitchens, wardrobes, and living room media units',
      'False ceiling gypsum framing, cove lighting, and acoustics',
      'Flooring selection: Italian marble, vitrified tiles, wooden laminates',
      '3D material sample coordination prior to on-site installation',
    ],
  },
  {
    id: 'renovation',
    title: 'Renovation & Structural Retrofitting',
    badge: 'Restoration',
    badgeBg: '#FEF3C7',
    badgeColor: '#B45309',
    icon: 'hammer',
    lib: 'FontAwesome5',
    color: '#D97706',
    desc: 'Complete restoration of aging properties, structural strengthening, waterproofing, room additions, facade remodeling, and plumbing/electrical rewiring.',
    points: [
      'Detailed pre-renovation structural assessment and dampness audit',
      'Non-destructive load-bearing wall modifications with RCC beam supports',
      'Terrace, basement, and bathroom waterproofing with polymer membranes',
      'Modern electrical load upgrades and solar readiness retrofits',
    ],
  },
  {
    id: 'trades',
    title: 'Specialized Trades & Skilled Workforce',
    badge: 'Daily & Contract',
    badgeBg: '#E0E7FF',
    badgeColor: '#3730A3',
    icon: 'hard-hat',
    lib: 'FontAwesome5',
    color: '#4F46E5',
    desc: 'On-demand access to verified trade professionals for daily wage or milestone tasks across masonry, plumbing, electrical, carpentry, painting, and tiling.',
    points: [
      'Experienced masons for brickwork, plastering, and RCC casting',
      'Certified electricians for concealed wiring, DB dressing, and earthing',
      'Licensed plumbers for CPVC/UPVC piping, drainage, and sanitary fittings',
      'Master painters for putty application, texture finish, and weatherproofing',
    ],
  },
];

export default function ServicesScreen() {
  const router = useRouter();

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
        <Text style={styles.headerTitle}>Construction Services</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>COMPREHENSIVE CATALOG</Text>
          <Text style={styles.heroTitle}>End-to-End Construction Services</Text>
          <Text style={styles.heroDesc}>
            Allver organizes every stage of the Indian construction lifecycle. Whether you are building an independent house, developing a commercial facility, or hiring specialized skilled tradesmen, find qualified professionals on one transparent platform.
          </Text>
        </View>

        {/* Services List */}
        {SERVICES.map((srv) => (
          <View key={srv.id} style={styles.serviceCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: `${srv.color}15` }]}>
                {srv.lib === 'Feather' && <Feather name={srv.icon as any} size={22} color={srv.color} />}
                {srv.lib === 'FontAwesome5' && <FontAwesome5 name={srv.icon as any} size={20} color={srv.color} />}
                {srv.lib === 'MaterialCommunityIcons' && <MaterialCommunityIcons name={srv.icon as any} size={24} color={srv.color} />}
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={[styles.badgePill, { backgroundColor: srv.badgeBg }]}>
                  <Text style={[styles.badgeText, { color: srv.badgeColor }]}>{srv.badge}</Text>
                </View>
                <Text style={styles.serviceTitle}>{srv.title}</Text>
              </View>
            </View>

            <Text style={styles.serviceDesc}>{srv.desc}</Text>

            <View style={styles.pointsList}>
              {srv.points.map((pt, idx) => (
                <View key={idx} style={styles.pointRow}>
                  <Feather name="check-circle" size={15} color={COLORS.primary} style={{ marginTop: 2 }} />
                  <Text style={styles.pointText}>{pt}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  if (srv.id === 'architecture' || srv.id === 'interior') {
                    router.push('/architects');
                  } else if (srv.id === 'trades') {
                    router.push('/labours');
                  } else {
                    router.push('/contractors');
                  }
                }}
              >
                <Text style={styles.actionBtnText}>Browse Qualified Professionals</Text>
                <Feather name="arrow-right" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Quality Assurance Card */}
        <View style={styles.qualityCard}>
          <Text style={styles.qualityTitle}>Allver Quality Standards</Text>
          <Text style={styles.qualityDesc}>
            Every professional profile on Allver undergoes background and credential verification. We promote direct communication between project owners and contractors, transparent milestone-based payments, and verified past project portfolios.
          </Text>
          <View style={styles.linkRow}>
            <TouchableOpacity onPress={() => router.push('/how-it-works')}>
              <Text style={styles.linkText}>Learn How It Works →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/faq')}>
              <Text style={styles.linkText}>Frequently Asked Questions →</Text>
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
    marginBottom: 16,
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
  serviceCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  serviceTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  serviceDesc: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  pointsList: {
    gap: 8,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  pointText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  cardFooter: {
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  qualityCard: {
    backgroundColor: '#FEF9EE',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3E5C8',
    marginTop: 8,
  },
  qualityTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  qualityDesc: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
    marginBottom: 14,
  },
  linkRow: {
    gap: 8,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
});
