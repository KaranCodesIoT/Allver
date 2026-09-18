import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
  primary: '#10B981',
  primaryDark: '#047857',
  gold: '#B48C36',
  btnBg: '#F1F5F9',
  btnIcon: '#0F172A',
};

const FAQ_DATA = [
  {
    category: 'General Overview',
    questions: [
      {
        q: 'What is Allver and how does the platform work?',
        a: 'Allver (allver.in) is India’s unified digital construction marketplace. It directly connects property owners, commercial developers, licensed general contractors, accredited architects, interior designers, and skilled construction trade workers on a single transparent platform to plan, estimate, staff, and execute building projects efficiently.',
      },
      {
        q: 'Who can register and use the Allver marketplace?',
        a: 'Allver is open to four primary user groups: (1) Clients & Homeowners seeking construction or renovation services, (2) General & Civil Contractors seeking projects or trade workforce, (3) Architects & Interior Designers showcasing design portfolios and acquiring clients, and (4) Skilled Construction Tradesmen (masons, electricians, plumbers, painters, carpenters, tile experts) seeking reliable daily wage or contract work.',
      },
      {
        q: 'In which cities and states does Allver currently operate?',
        a: 'Allver connects construction professionals nationwide across India, with active regional hubs across metropolitan and tier-2 urban regions including Delhi NCR, Mumbai, Bengaluru, Pune, Hyderabad, Jaipur, and expanding tier-2 construction corridors.',
      },
      {
        q: 'Is browsing profiles and posting project requirements free on Allver?',
        a: 'Yes. Clients and property owners can explore public professional directories, review portfolios, and submit project enquiries completely free of charge without mandatory subscription fees.',
      },
    ],
  },
  {
    category: 'Contractors & Hiring',
    questions: [
      {
        q: 'How are contractors and architects vetted on Allver?',
        a: 'Allver emphasizes credibility. Contractors and architects are prompted to submit verifiable identity details, GSTIN/registration documents where applicable, business establishment proofs, and documented photographic evidence of completed real-world project work before receiving verified platform badges.',
      },
      {
        q: 'How do quotations, estimates, and project agreements work?',
        a: 'Clients submit project scope specifications directly to selected professionals or publish an open requirement. Contractors and design leads submit itemized quotations detailing material grades, labor charges, timeline schedules, and milestone payment schedules without intermediary markups.',
      },
      {
        q: 'Can I hire skilled trade workers for daily wage tasks?',
        a: 'Yes. Allver provides a dedicated workforce booking directory where clients and general contractors can hire experienced masons, plumbers, electricians, carpenters, painters, and tile experts for short-term daily wage assignments or task-based contracts with transparent benchmark rates.',
      },
      {
        q: 'What should I do if a project encounters site delays or disputes?',
        a: 'Allver advocates for milestone-based execution where funds are only disbursed upon site verification of agreed construction stages. In case of discrepancies, our dedicated dispute resolution and support desk assists in mediation through documented platform records and chat agreements.',
      },
    ],
  },
  {
    category: 'Design & Architecture',
    questions: [
      {
        q: 'How do architects present their design portfolios on Allver?',
        a: 'Architectural professionals create comprehensive digital studios showcasing floor blueprints, 3D elevations, structural layout diagrams, interior renders, and past client reviews. Prospective clients can browse by architectural style, square footage, and budget classification.',
      },
      {
        q: 'Are architectural drawings and proprietary intellectual property protected?',
        a: 'Yes. Professionals retain full intellectual property ownership of their original drawings and plans. Proprietary blueprints and structural specifications shared within project workspaces are encrypted and protected under our Terms of Service and data confidentiality protocols.',
      },
      {
        q: 'Can an architect collaborate directly with an on-site contractor via Allver?',
        a: 'Yes. Allver project workspaces feature integrated messaging and document sharing, enabling seamless coordination between architectural design consultants and civil execution contractors to ensure physical builds adhere precisely to blueprints.',
      },
    ],
  },
  {
    category: 'Payments, Safety & Security',
    questions: [
      {
        q: 'How are payments processed on Allver?',
        a: 'Allver supports secure digital transactions via certified Indian payment gateways (including UPI, Net Banking, and major debit/credit cards) for platform deposits, milestone holding, and direct worker disbursements, ensuring full financial traceability.',
      },
      {
        q: 'What safety and quality standards does Allver promote?',
        a: 'Allver encourages adherence to the National Building Code of India (NBC) and local municipal bylaws. We recommend on-site safety gear (PPE), compliant structural materials (ISI/BIS certified), and formal written milestone signoffs at every critical structural phase.',
      },
      {
        q: 'How is user personal data and contact information protected?',
        a: 'We adhere to stringent data protection standards governed by the Indian Information Technology Act, 2000. Personal contact details are safeguarded and only disclosed to authorized counterparties upon confirmed project booking or direct enquiry authorization.',
      },
      {
        q: 'How can I reach Allver customer care and grievance support?',
        a: 'You can contact our support team at contact@allver.in or support@allver.in. Inquiries are typically reviewed and answered within 24 to 48 business hours. For regulatory inquiries, our appointed Grievance Officer details are published on our Contact and Terms pages.',
      },
    ],
  },
];

export default function FAQScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<string | null>('0-0');

  const toggleAccordion = (id: string) => {
    setExpandedIndex((prev) => (prev === id ? null : id));
  };

  const filteredCategories = FAQ_DATA.map((cat, catIdx) => {
    const filteredQuestions = cat.questions.filter(
      (item) =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...cat, catIdx, questions: filteredQuestions };
  }).filter((cat) => cat.questions.length > 0);

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
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={styles.heroBadge}>KNOWLEDGE BASE</Text>
          <Text style={styles.heroTitle}>Frequently Asked Questions</Text>
          <Text style={styles.heroDesc}>
            Find detailed answers regarding hiring contractors, posting project requirements, verification protocols, trade wages, and platform terms.
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search FAQs (e.g. verification, payment, hiring)..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Feather name="x" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* FAQ Accordions by Category */}
        {filteredCategories.map((cat) => (
          <View key={cat.category} style={styles.categoryWrap}>
            <Text style={styles.categoryTitle}>{cat.category}</Text>

            {cat.questions.map((item, qIdx) => {
              const id = `${cat.catIdx}-${qIdx}`;
              const isExpanded = expandedIndex === id;

              return (
                <View key={qIdx} style={styles.faqCard}>
                  <TouchableOpacity
                    style={styles.faqHeader}
                    onPress={() => toggleAccordion(id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestionText}>{item.q}</Text>
                    <Feather
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={COLORS.textDark}
                      style={{ marginLeft: 8 }}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.faqAnswerWrap}>
                      <Text style={styles.faqAnswerText}>{item.a}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {filteredCategories.length === 0 && (
          <View style={styles.emptyWrap}>
            <Feather name="help-circle" size={40} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No matching answers found</Text>
            <Text style={styles.emptySubtitle}>Try searching with different keywords or contact our support team directly.</Text>
          </View>
        )}

        {/* Support Callout */}
        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Still have questions?</Text>
          <Text style={styles.supportDesc}>
            Can’t find the answer you are looking for? Our dedicated construction support team is here to assist with project enquiries and onboarding.
          </Text>
          <TouchableOpacity
            style={styles.supportBtn}
            onPress={() => router.push('/contact')}
          >
            <Text style={styles.supportBtnText}>Contact Allver Support Desk</Text>
            <Feather name="arrow-right" size={15} color="#FFFFFF" />
          </TouchableOpacity>
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardWhite,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: COLORS.textDark,
  },
  categoryWrap: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  faqCard: {
    backgroundColor: COLORS.cardWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 8,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '700',
    color: COLORS.textDark,
    lineHeight: 20,
  },
  faqAnswerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  faqAnswerText: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  supportCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginTop: 10,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  supportDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  supportBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
