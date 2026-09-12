import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';
import { useTranslation } from '../utils/i18n';
import NotificationBell from '../components/NotificationBell';
import { Fonts } from '../constants/theme';

const { width } = Dimensions.get('window');

const COLORS = {
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  gold: '#F59E0B',
  bgLight: '#F9FAFB',
};

const WORKFORCE_SERVICES = [
  { id: 'Painting', name: 'Painting', icon: 'paint-roller', lib: 'FontAwesome5', filterKey: 'Painter' },
  { id: 'Masonry', name: 'Masonry', icon: 'wall', lib: 'MaterialCommunityIcons', filterKey: 'Mason' },
  { id: 'Electrical', name: 'Electrical', icon: 'zap', lib: 'Feather', filterKey: 'Electrician' },
  { id: 'Plumbing', name: 'Plumbing', icon: 'faucet', lib: 'FontAwesome5', filterKey: 'Plumber' },
  { id: 'Carpentry', name: 'Carpentry', icon: 'hammer', lib: 'FontAwesome5', filterKey: 'Carpenter' },
  { id: 'Tiling', name: 'Tiling', icon: 'grid', lib: 'MaterialCommunityIcons', filterKey: 'Tile' },
  { id: 'Cleaning', name: 'Cleaning', icon: 'broom', lib: 'MaterialCommunityIcons', filterKey: 'Cleaner' },
  { id: 'Other', name: 'Other', icon: 'more-horizontal', lib: 'Feather', filterKey: 'Helper' },
];

const renderCategoryIcon = (service: typeof WORKFORCE_SERVICES[0], isSelected: boolean) => {
  const color = isSelected ? '#EA580C' : '#475569';
  const size = 28;
  if (service.lib === 'Feather') {
    return <Feather name={service.icon as any} size={size} color={color} />;
  }
  if (service.lib === 'MaterialCommunityIcons') {
    return <MaterialCommunityIcons name={service.icon as any} size={30} color={color} />;
  }
  return <FontAwesome5 name={service.icon as any} size={size} color={color} />;
};

export default function LaboursScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState((params.searchQuery as string) || '');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [activeTier, setActiveTier] = useState((params.type as string) || '');
  const [labours, setLabours] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.type) {
      setActiveTier(params.type as string);
    }
  }, [params.type]);

  useEffect(() => {
    const fetchLabours = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/professionals/Labour`);
        const data = await response.json();
        if (response.ok && data.professionals) {
          setLabours(data.professionals);
        }
      } catch (err) {
        console.error('Error fetching labours:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLabours();
  }, []);

  // Filter categories based on search query
  const filteredServices = WORKFORCE_SERVICES.filter((s) => {
    if (!searchQuery.trim()) return true;
    return s.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter labours
  const filteredLabours = labours.filter((item) => {
    const name = (item.fullName || item.name || '').toLowerCase();
    const skill = (item.skillType || '').toLowerCase();
    
    const workCat = Array.isArray(item.workCategory)
      ? item.workCategory.join(', ').toLowerCase()
      : (item.workCategory || '').toLowerCase();

    const skills = Array.isArray(item.skills)
      ? item.skills.join(', ').toLowerCase()
      : (item.skills || '').toLowerCase();
      
    const matchesSearch = name.includes(searchQuery.toLowerCase()) || 
                          skill.includes(searchQuery.toLowerCase()) ||
                          workCat.includes(searchQuery.toLowerCase()) ||
                          skills.includes(searchQuery.toLowerCase());
    
    const matchesSkill = selectedSkill
      ? skill.includes(selectedSkill.toLowerCase()) ||
        workCat.includes(selectedSkill.toLowerCase()) ||
        skills.includes(selectedSkill.toLowerCase())
      : true;

    const isPremium = (item.rating && item.rating >= 4) || (item.experience && parseInt(item.experience) >= 3) || item.isVerified || item.badge === 'Premium' || item.tier === 'Premium';
    const matchesTier = activeTier === 'Premium' 
      ? isPremium 
      : activeTier === 'General' 
        ? !isPremium 
        : true;
    
    return matchesSearch && matchesSkill && matchesTier;
  });

  const navigateToDetail = (labour: any) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    router.push({
      pathname: '/labour-detail',
      params: {
        id: labour._id || labour.id || '',
        name: labour.fullName,
        role: labour.skillType || 'Labour',
        avatar: resolveAvatarUrl(labour.avatarUrl, labour.updatedAt) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
        experience: (labour.experience || '0') + ' Years Experience',
        location: labour.city || '',
        rating: (labour.rating || 0).toString(),
        reviews: (labour.reviews || 0).toString(),
        contractorName: 'Independent'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Back Row */}
        <View style={styles.topHeaderRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topBackButton}>
            <Feather name="arrow-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>

        {/* Hero Title Header with Circle Badge */}
        <View style={styles.heroHeaderSection}>
          <View style={[
            styles.heroBadgeCircle,
            { backgroundColor: activeTier === 'Premium' ? '#FEF3C7' : activeTier === 'General' ? '#EFF6FF' : '#FFF7ED' }
          ]}>
            {activeTier === 'Premium' ? (
              <FontAwesome5 name="crown" size={22} color="#F59E0B" />
            ) : activeTier === 'General' ? (
              <FontAwesome5 name="users" size={20} color="#2563EB" />
            ) : (
              <FontAwesome5 name="users" size={20} color="#F97316" />
            )}
          </View>

          <View style={styles.heroTitleCol}>
            <Text style={styles.heroTitleText}>
              {activeTier ? `${activeTier} Workers` : 'Skilled Workforce'}
            </Text>
            <Text style={styles.heroSubtitleText}>
              {activeTier === 'Premium' 
                ? 'High quality. Verified. Trusted.' 
                : activeTier === 'General' 
                  ? 'Reliable. Affordable. Everyday work.' 
                  : 'Find top verified workers for your project'}
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBarBox}>
            <Feather name="search" size={18} color="#9CA3AF" style={styles.searchIconLeft} />
            <TextInput
              style={styles.searchInputField}
              placeholder="Search for a service..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView bounces={true} contentContainerStyle={styles.mainScrollContent}>
          {/* 2-Column Category Grid */}
          <View style={styles.categoryGrid}>
            {filteredServices.map((service) => {
              const isSelected = selectedSkill === service.filterKey || selectedSkill === service.name;
              return (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceCardBox,
                    isSelected && styles.serviceCardBoxSelected
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    router.push({
                      pathname: '/book-worker',
                      params: { service: service.name, type: activeTier }
                    });
                  }}
                >
                  <View style={styles.serviceIconWrap}>
                    {renderCategoryIcon(service, isSelected)}
                  </View>
                  <Text style={[styles.serviceTitle, isSelected && styles.serviceTitleSelected]}>
                    {service.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section Divider & Title for Worker Profiles */}
          <View style={styles.workersSectionHeader}>
            <Text style={styles.workersSectionTitle}>
              {selectedSkill ? `${selectedSkill} Profiles` : 'Available Profiles'}
            </Text>
            {selectedSkill !== '' && (
              <TouchableOpacity onPress={() => setSelectedSkill('')}>
                <Text style={styles.clearFilterText}>Clear Selection</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Labour List */}
          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.orange} />
            </View>
          ) : (
            filteredLabours.map((item) => {
              const avatar = resolveAvatarUrl(item.avatarUrl) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop';
              const isAvailable = (item.availability || '').toLowerCase() === 'available';
              return (
                <View key={item._id} style={styles.labourCard}>
                  <View style={styles.cardTopRow}>
                    <Image source={{ uri: avatar }} style={styles.avatarImage} contentFit="cover" />
                    <View style={styles.cardDetailsCol}>
                      <View style={styles.nameRow}>
                        <Text style={styles.nameText}>{item.fullName}</Text>
                      </View>
                      
                      <View style={styles.skillBadge}>
                        <Text style={styles.skillBadgeText}>{item.skillType || 'General Worker'}</Text>
                      </View>

                      <View style={styles.ratingRow}>
                        <Feather name="star" size={13} color={COLORS.gold} style={styles.starIcon} />
                        <Text style={styles.ratingText}>{item.rating || 0}</Text>
                        <Text style={styles.reviewsText}>({item.reviews || 0} {t('reviews')})</Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Feather name="map-pin" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
                        <Text style={styles.metaText}>{item.city || t('notSpecified') || 'Not specified'}</Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Feather name="briefcase" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
                        <Text style={styles.metaText}>{item.experience || '0'} {t('experienceSuffix')}</Text>
                      </View>
                    </View>

                    {/* Availability Badge + View Button */}
                    <View style={styles.rightCol}>
                      <View style={[styles.availabilityBadge, { backgroundColor: isAvailable ? '#ECFDF5' : '#FEF2F2' }]}>
                        <View style={[styles.availabilityDot, { backgroundColor: isAvailable ? '#10B981' : '#EF4444' }]} />
                        <Text style={[styles.availabilityText, { color: isAvailable ? '#10B981' : '#EF4444' }]}>
                          {isAvailable ? t('available') : t('busy')}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.viewProfileButton} onPress={() => navigateToDetail(item)}>
                        <Text style={styles.viewProfileText}>{t('viewProfile')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {!isLoading && filteredLabours.length === 0 && (
            <View style={styles.emptyContainer}>
              <Feather name="alert-circle" size={44} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
              <Text style={styles.emptyText}>{t('noLaboursFound')}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  mainScrollContent: { paddingBottom: 40 },

  /* HEADER */
  topHeaderRow: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topBackButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 6,
  },
  heroBadgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginBottom: 2,
  },
  heroSubtitleText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#6B7280',
  },

  /* SEARCH BAR */
  searchBarContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 14,
  },
  searchIconLeft: {
    marginRight: 8,
  },
  searchInputField: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    height: '100%',
  },

  /* CATEGORY GRID */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 12,
  },
  serviceCardBox: {
    width: (width - 52) / 2,
    height: 110,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  serviceCardBoxSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  serviceIconWrap: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  serviceTitleSelected: {
    color: '#111827',
  },

  /* WORKERS LIST */
  workersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  workersSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F97316',
  },

  /* LABOUR CARDS */
  labourCard: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 15, marginHorizontal: 20, marginBottom: 15, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTopRow: { flexDirection: 'row' },
  avatarImage: { width: 65, height: 65, borderRadius: 32.5 },
  cardDetailsCol: { flex: 1, marginLeft: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  nameText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  
  skillBadge: { backgroundColor: COLORS.orangeLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 5 },
  skillBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.orange },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  starIcon: { marginRight: 4 },
  ratingText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, marginRight: 4 },
  reviewsText: { fontSize: 12, color: COLORS.textMuted },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  metaIcon: { marginRight: 6 },
  metaText: { fontSize: 12, color: COLORS.textMuted },

  rightCol: { alignItems: 'flex-end', justifyContent: 'space-between', marginLeft: 8 },
  
  availabilityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  availabilityDot: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  availabilityText: { fontSize: 10, fontWeight: '700' },

  viewProfileButton: { backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: COLORS.orange, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  viewProfileText: { fontSize: 12, color: COLORS.orange, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
