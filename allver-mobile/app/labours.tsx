import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';
import { useTranslation } from '../utils/i18n';
import NotificationBell from '../components/NotificationBell';


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

const PREDEFINED_SKILLS = [
  'Mason',
  'Electrician',
  'Plumber',
  'Painter',
  'Carpenter',
  'Welder',
  'Tile Fitter',
  'Helper'
];

export default function LaboursScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState((params.searchQuery as string) || '');

  const [locationQuery, setLocationQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [labours, setLabours] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    
    const location = (item.city || '').toLowerCase();
    const matchesLocation = location.includes(locationQuery.toLowerCase());
    
    const matchesAvailability = availabilityFilter 
      ? (item.availability || '').toLowerCase() === availabilityFilter.toLowerCase() 
      : true;
      
    const matchesSkill = selectedSkill
      ? skill.includes(selectedSkill.toLowerCase()) ||
        workCat.includes(selectedSkill.toLowerCase()) ||
        skills.includes(selectedSkill.toLowerCase())
      : true;
    
    return matchesSearch && matchesLocation && matchesAvailability && matchesSkill;
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
        avatar: resolveAvatarUrl(labour.avatarUrl) || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop',
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
        {/* Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>{t('labourers')}</Text>
            <Text style={styles.headerSubtitle}>{t('findLabourDesc')}</Text>
          </View>
          <NotificationBell size={22} color={COLORS.textDark} style={styles.notificationBtn} />
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.filterSection}>
          <View style={styles.filterRow}>
            <View style={[styles.searchBox, { flex: 1 }]}>
              <Feather name="search" size={14} color={COLORS.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('nameOrSkill')}
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <View style={[styles.searchBox, { flex: 1 }]}>
              <Feather name="map-pin" size={14} color={COLORS.textMuted} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder={t('location')}
                placeholderTextColor={COLORS.textMuted}
                value={locationQuery}
                onChangeText={setLocationQuery}
              />
            </View>
          </View>

          {/* Skill Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, selectedSkill === '' && styles.pillActive]}
              onPress={() => setSelectedSkill('')}
            >
              <Text style={[styles.pillText, selectedSkill === '' && styles.pillTextActive]}>{t('allSkills')}</Text>
            </TouchableOpacity>
            {PREDEFINED_SKILLS.map((skill) => (
              <TouchableOpacity
                key={skill}
                style={[styles.pill, selectedSkill === skill && styles.pillActive]}
                onPress={() => setSelectedSkill(skill)}
              >
                <Text style={[styles.pillText, selectedSkill === skill && styles.pillTextActive]}>{skill}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Availability Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll} contentContainerStyle={styles.pillRow}>
            {[
              { label: t('all'), value: '' },
              { label: `✅ ${t('available')}`, value: 'Available' },
              { label: t('busy'), value: 'Not Available' },
            ].map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.pill, availabilityFilter === r.value && styles.pillActive]}
                onPress={() => setAvailabilityFilter(r.value)}
              >
                <Text style={[styles.pillText, availabilityFilter === r.value && styles.pillTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Labour List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.orange} />
          </View>
        ) : (
          <ScrollView bounces={true} contentContainerStyle={styles.scrollContent}>
            {filteredLabours.map((item) => {
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
            })}

            {filteredLabours.length === 0 && (
              <View style={styles.emptyContainer}>
                <Feather name="alert-circle" size={48} color={COLORS.textMuted} style={{ marginBottom: 15 }} />
                <Text style={styles.emptyText}>{t('noLaboursFound')}</Text>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { padding: 20, paddingBottom: 40 },

  /* HEADER */
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { marginRight: 15 },
  headerTextCol: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted },
  notificationBtn: { position: 'relative', padding: 5 },

  /* FILTERS */
  filterSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  filterRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 10, height: 38, backgroundColor: COLORS.bgLight },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textDark, height: '100%' },
  pillScroll: { flexGrow: 0 },
  pillRow: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  pill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.border },
  pillActive: { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange },
  pillText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  pillTextActive: { color: COLORS.orange, fontWeight: '700' },

  /* LABOUR CARDS */
  labourCard: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 15, marginBottom: 15, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
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
