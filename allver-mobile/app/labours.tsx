import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '../utils/i18n';
import { Fonts } from '../constants/theme';

const COLORS = {
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  orangeBorder: '#FED7AA',
  textDark: '#111827',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E5E7EB',
  white: '#FFFFFF',
  gold: '#F59E0B',
  goldLight: '#FEF3C7',
  goldBorder: '#FDE68A',
  bgLight: '#F8FAFC',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  blueBorder: '#BFDBFE',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  greenBorder: '#DCFCE7',
};

const SERVICE_GROUPS = ['All', 'Civil & Build', 'Finishing', 'Utilities', 'Maintenance'];

const WORKFORCE_SERVICES = [
  {
    id: 'Painting',
    name: 'Painting',
    group: 'Finishing',
    desc: 'Interior & exterior painting, texture, waterproofing',
    icon: 'paint-roller',
    lib: 'FontAwesome5',
    price: '₹800 – ₹1,000 / day',
    popular: true,
  },
  {
    id: 'Masonry',
    name: 'Masonry',
    group: 'Civil & Build',
    desc: 'Brickwork, plastering, concrete & civil repairs',
    icon: 'wall',
    lib: 'MaterialCommunityIcons',
    price: '₹900 – ₹1,200 / day',
    popular: true,
  },
  {
    id: 'Electrical',
    name: 'Electrical',
    group: 'Utilities',
    desc: 'Wiring, fixtures, switches, lighting & circuit repair',
    icon: 'zap',
    lib: 'Feather',
    price: '₹750 – ₹1,000 / day',
    popular: true,
  },
  {
    id: 'Plumbing',
    name: 'Plumbing',
    group: 'Utilities',
    desc: 'Pipe fitting, bathroom sanitaries, drainage & leaks',
    icon: 'faucet',
    lib: 'FontAwesome5',
    price: '₹700 – ₹950 / day',
    popular: false,
  },
  {
    id: 'Carpentry',
    name: 'Carpentry',
    group: 'Finishing',
    desc: 'Furniture, doors, windows, modular fittings & wood repair',
    icon: 'hammer',
    lib: 'FontAwesome5',
    price: '₹850 – ₹1,100 / day',
    popular: false,
  },
  {
    id: 'Tiling',
    name: 'Tiling',
    group: 'Finishing',
    desc: 'Floor tiling, wall tiles, marble & granite polishing',
    icon: 'grid',
    lib: 'MaterialCommunityIcons',
    price: '₹800 – ₹1,050 / day',
    popular: false,
  },
  {
    id: 'Cleaning',
    name: 'Cleaning',
    group: 'Maintenance',
    desc: 'Post-construction cleanup, site debris & deep cleaning',
    icon: 'broom',
    lib: 'MaterialCommunityIcons',
    price: '₹600 – ₹850 / day',
    popular: false,
  },
  {
    id: 'Other',
    name: 'General Work',
    group: 'Civil & Build',
    desc: 'Everyday construction helpers, loading & material shifting',
    icon: 'more-horizontal',
    lib: 'Feather',
    price: '₹500 – ₹750 / day',
    popular: false,
  },
];

const renderCategoryIcon = (service: typeof WORKFORCE_SERVICES[0], color: string) => {
  const size = 26;
  if (service.lib === 'Feather') {
    return <Feather name={service.icon as any} size={size} color={color} />;
  }
  if (service.lib === 'MaterialCommunityIcons') {
    return <MaterialCommunityIcons name={service.icon as any} size={28} color={color} />;
  }
  return <FontAwesome5 name={service.icon as any} size={size} color={color} />;
};

export default function LaboursScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();

  const [searchQuery, setSearchQuery] = useState((params.searchQuery as string) || '');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [activeTier, setActiveTier] = useState<string>((params.type as string) || '');

  useEffect(() => {
    if (params.type) {
      setActiveTier(params.type as string);
    }
  }, [params.type]);

  // Responsive column layout calculation
  const containerMaxWidth = Math.min(windowWidth, 1000);
  const isDesktop = windowWidth >= 900;
  const isTablet = windowWidth >= 600 && windowWidth < 900;
  const numColumns = isDesktop ? 4 : isTablet ? 3 : 2;

  // Filter services by search query and group
  const filteredServices = useMemo(() => {
    return WORKFORCE_SERVICES.filter((service) => {
      const matchesSearch =
        !searchQuery.trim() ||
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.group.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesGroup =
        selectedGroup === 'All' || service.group === selectedGroup;

      return matchesSearch && matchesGroup;
    });
  }, [searchQuery, selectedGroup]);

  const handleServicePress = (service: typeof WORKFORCE_SERVICES[0]) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push({
      pathname: '/book-worker',
      params: { service: service.id, type: activeTier || 'Standard' },
    });
  };

  const isPremium = activeTier === 'Premium';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          bounces={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.responsiveWrapper, { maxWidth: containerMaxWidth }]}>
            {/* Top Back Row */}
            <View style={styles.topHeaderRow}>
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/(tabs)');
                  }
                }}
                style={styles.topBackButton}
                activeOpacity={0.7}
              >
                <Feather name="arrow-left" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Hero Header Section */}
            <View style={styles.heroHeaderSection}>
              <View
                style={[
                  styles.heroBadgeCircle,
                  {
                    backgroundColor: isPremium
                      ? COLORS.goldLight
                      : activeTier === 'General'
                      ? COLORS.blueLight
                      : COLORS.orangeLight,
                  },
                ]}
              >
                {isPremium ? (
                  <FontAwesome5 name="crown" size={22} color={COLORS.gold} />
                ) : activeTier === 'General' ? (
                  <FontAwesome5 name="users" size={20} color={COLORS.blue} />
                ) : (
                  <FontAwesome5 name="hard-hat" size={22} color={COLORS.orange} />
                )}
              </View>

              <View style={styles.heroTitleCol}>
                <Text style={styles.heroTitleText}>
                  {activeTier ? `${activeTier} Workers` : 'Book Skilled Workers'}
                </Text>
                <Text style={styles.heroSubtitleText}>
                  {isPremium
                    ? 'High quality. Verified. Trusted.'
                    : activeTier === 'General'
                    ? 'Reliable. Affordable. Everyday work.'
                    : 'On-demand verified construction and maintenance workforce'}
                </Text>
              </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
              <View style={styles.searchBarBox}>
                <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIconLeft} />
                <TextInput
                  style={styles.searchInputField}
                  placeholder="Search for a service (e.g., Painting, Masonry, Plumbing)..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Feather name="x" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Service Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsContainer}
            >
              {SERVICE_GROUPS.map((group) => {
                const isSelected = selectedGroup === group;
                return (
                  <TouchableOpacity
                    key={group}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setSelectedGroup(group)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}
                    >
                      {group}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Services Grid Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Select a Service to Book</Text>
              <Text style={styles.sectionCountText}>
                {filteredServices.length} {filteredServices.length === 1 ? 'Service' : 'Services'} Available
              </Text>
            </View>

            {/* Responsive Services Grid */}
            <View style={styles.categoryGrid}>
              {filteredServices.map((service) => {
                const cardWidth =
                  numColumns === 4
                    ? '23.5%'
                    : numColumns === 3
                    ? '31.5%'
                    : '48%';

                return (
                  <TouchableOpacity
                    key={service.id}
                    style={[styles.serviceCardBox, { width: cardWidth as any }]}
                    activeOpacity={0.85}
                    onPress={() => handleServicePress(service)}
                  >
                    {service.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>Popular</Text>
                      </View>
                    )}

                    <View style={styles.serviceIconWrap}>
                      {renderCategoryIcon(service, COLORS.orange)}
                    </View>

                    <Text style={styles.serviceTitle} numberOfLines={1}>
                      {service.name}
                    </Text>

                    <Text style={styles.serviceDesc} numberOfLines={2}>
                      {service.desc}
                    </Text>

                    <View style={styles.serviceFooter}>
                      <Text style={styles.servicePrice} numberOfLines={1}>
                        {service.price}
                      </Text>
                      <View style={styles.bookActionPill}>
                        <Text style={styles.bookActionText}>Book</Text>
                        <Feather name="chevron-right" size={14} color={COLORS.orange} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {filteredServices.length === 0 && (
              <View style={styles.emptyContainer}>
                <Feather name="search" size={44} color={COLORS.textLight} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>No services found</Text>
                <Text style={styles.emptySubtitle}>
                  Try searching for another keyword or select "All" categories.
                </Text>
              </View>
            )}

            {/* How It Works Workflow Steps */}
            <View style={styles.howItWorksCard}>
              <Text style={styles.howItWorksTitle}>How Booking Works</Text>
              <View style={styles.stepsRow}>
                <View style={styles.stepItem}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepItemTitle}>Choose Trade</Text>
                  <Text style={styles.stepItemDesc}>Pick the service category you need</Text>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepItemTitle}>Set Details</Text>
                  <Text style={styles.stepItemDesc}>Specify location, count & start date</Text>
                </View>

                <View style={styles.stepDivider} />

                <View style={styles.stepItem}>
                  <View style={styles.stepNumberCircle}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepItemTitle}>Instant Dispatch</Text>
                  <Text style={styles.stepItemDesc}>Verified worker assigned to site</Text>
                </View>
              </View>
            </View>

            {/* Trust Badges Section */}
            <View style={styles.trustBanner}>
              <View style={styles.trustItem}>
                <View style={[styles.trustIconWrap, { backgroundColor: COLORS.greenLight }]}>
                  <Feather name="shield" size={18} color={COLORS.green} />
                </View>
                <View style={styles.trustTextCol}>
                  <Text style={styles.trustHeading}>KYC Verified</Text>
                  <Text style={styles.trustSub}>Identity and skill checked</Text>
                </View>
              </View>

              <View style={styles.trustItem}>
                <View style={[styles.trustIconWrap, { backgroundColor: COLORS.blueLight }]}>
                  <Feather name="check-circle" size={18} color={COLORS.blue} />
                </View>
                <View style={styles.trustTextCol}>
                  <Text style={styles.trustHeading}>Fair Pricing</Text>
                  <Text style={styles.trustSub}>Transparent standard daily rates</Text>
                </View>
              </View>

              <View style={styles.trustItem}>
                <View style={[styles.trustIconWrap, { backgroundColor: COLORS.orangeLight }]}>
                  <Feather name="clock" size={18} color={COLORS.orange} />
                </View>
                <View style={styles.trustTextCol}>
                  <Text style={styles.trustHeading}>On-Time Delivery</Text>
                  <Text style={styles.trustSub}>Prompt workforce deployment</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  responsiveWrapper: {
    width: '100%',
    alignSelf: 'center',
  },

  /* HEADER */
  topHeaderRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  heroHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 8,
  },
  heroBadgeCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroTitleCol: {
    flex: 1,
  },
  heroTitleText: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 3,
  },
  heroSubtitleText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  /* SEARCH BAR */
  searchBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 14,
  },
  searchIconLeft: {
    marginRight: 10,
  },
  searchInputField: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    height: '100%',
  },

  /* FILTER PILLS */
  filterPillsContainer: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: COLORS.orangeLight,
    borderColor: COLORS.orange,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  filterPillTextActive: {
    color: COLORS.orange,
    fontWeight: '700',
  },

  /* SECTION HEADER */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  sectionCountText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },

  /* CATEGORY GRID */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 28,
  },
  serviceCardBox: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    padding: 14,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  popularBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: COLORS.orangeLight,
    borderWidth: 1,
    borderColor: COLORS.orangeBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: COLORS.orange,
  },
  serviceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  serviceDesc: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    lineHeight: 16,
    marginBottom: 12,
    minHeight: 32,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  servicePrice: {
    fontSize: 11.5,
    fontWeight: '700',
    color: COLORS.textDark,
    flex: 1,
  },
  bookActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orangeLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 6,
  },
  bookActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.orange,
    marginRight: 2,
  },

  /* EMPTY STATE */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  /* HOW IT WORKS */
  howItWorksCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
  },
  howItWorksTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 14,
    textAlign: 'center',
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.orange,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepNumberText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  stepItemTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 2,
    textAlign: 'center',
  },
  stepItemDesc: {
    fontSize: 10,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  stepDivider: {
    width: 14,
    height: 1,
    backgroundColor: '#CBD5E1',
    marginTop: 14,
  },

  /* TRUST BANNER */
  trustBanner: {
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trustIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trustTextCol: {
    flex: 1,
  },
  trustHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 1,
  },
  trustSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
