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
  green: '#16A34A',
  greenLight: '#F0FDF4',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F9FAFB',
  gold: '#F59E0B',
};

// Mock data based on the user's second screenshot
const PREDEFINED_SKILLS = [
  'Residential Design',
  'Interior Design',
  'Commercial Design',
  'Landscape Architecture',
  'Urban Planning',
  'Sustainable Design',
  '3D Visualization',
  'Renovation'
];

export default function ArchitectsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState((params.searchQuery as string) || '');

  const [locationQuery, setLocationQuery] = useState('');
  const [ratingQuery, setRatingQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [architects, setArchitects] = useState<any[]>((global as any).cachedArchitects || []);
  const [isLoading, setIsLoading] = useState(!((global as any).cachedArchitects && (global as any).cachedArchitects.length > 0));

  useEffect(() => {
    const fetchArchitects = async () => {
      try {
        const cached = (global as any).cachedArchitects;
        if (!cached || cached.length === 0) {
          setIsLoading(true);
        }
        const response = await fetch(`${BACKEND_URL}/api/professionals/Architect`);
        const data = await response.json();
        if (response.ok && data.professionals) {
          setArchitects(data.professionals);
          (global as any).cachedArchitects = data.professionals;
        }
      } catch (err) {
        console.error('Error fetching architects:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArchitects();
  }, []);

  // Filter architects
  const filteredArchitects = architects.filter((item) => {
    const name = item.fullName || item.name || '';
    const specs = Array.isArray(item.specialization) 
      ? item.specialization.join(', ') 
      : (item.specialization || '');

    const specsPlural = Array.isArray(item.specializations) 
      ? item.specializations.join(', ') 
      : (item.specializations || '');
    
    const workCat = Array.isArray(item.workCategory)
      ? item.workCategory.join(', ')
      : (item.workCategory || '');

    const skills = Array.isArray(item.skills)
      ? item.skills.join(', ')
      : (item.skills || '');
    
    const firmName = item.firmName || '';
    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
      firmName.toLowerCase().includes(searchQuery.trim().toLowerCase()) || 
      specs.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      specsPlural.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      workCat.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      skills.toLowerCase().includes(searchQuery.trim().toLowerCase());
    
    const location = item.city || '';
    const matchesLocation = location.toLowerCase().includes(locationQuery.toLowerCase());
    
    const rating = item.rating || 4.5;
    const matchesRating = ratingQuery ? rating >= parseFloat(ratingQuery) : true;
    
    const matchesSkill = selectedSkill
      ? specs.toLowerCase().includes(selectedSkill.toLowerCase()) || 
        specsPlural.toLowerCase().includes(selectedSkill.toLowerCase()) || 
        workCat.toLowerCase().includes(selectedSkill.toLowerCase()) ||
        skills.toLowerCase().includes(selectedSkill.toLowerCase())
      : true;
    
    return matchesSearch && matchesLocation && matchesRating && matchesSkill;
  });



  const navigateToDetail = (architect: any) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push({
      pathname: '/architect-detail',
      params: {
        id: architect._id,
        name: architect.fullName,
        avatar: resolveAvatarUrl(architect.avatarUrl) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        coverImage: resolveAvatarUrl(architect.cover) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
        rating: (architect.rating || 4.5).toString(),
        reviews: (architect.reviews || 0).toString(),
        location: architect.city,
        experience: architect.experience || 'Entry Level',
        specialization: Array.isArray(architect.specialization) ? architect.specialization.join(', ') : (architect.specialization || 'General Architecture'),
        projects: (architect.projects || 0).toString(),
        followers: (architect.followersCount || 0).toString(),
        firmName: architect.firmName || 'Independent Architect',
        phone: architect.phoneNumber || architect.whatsappNumber || ''
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
            <Text style={styles.headerTitle}>{t('architecture')}</Text>
            <Text style={styles.headerSubtitle}>{t('findArchitectDesc')}</Text>
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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ratingPillScroll} contentContainerStyle={styles.ratingPillRow}>
            <TouchableOpacity
              style={[styles.ratingPill, selectedSkill === '' && styles.ratingPillActive]}
              onPress={() => setSelectedSkill('')}
            >
              <Text style={[styles.ratingPillText, selectedSkill === '' && styles.ratingPillTextActive]}>{t('allSkills')}</Text>
            </TouchableOpacity>
            {PREDEFINED_SKILLS.map((skill) => (
              <TouchableOpacity
                key={skill}
                style={[styles.ratingPill, selectedSkill === skill && styles.ratingPillActive]}
                onPress={() => setSelectedSkill(skill)}
              >
                <Text style={[styles.ratingPillText, selectedSkill === skill && styles.ratingPillTextActive]}>{skill}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Rating Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ratingPillScroll} contentContainerStyle={styles.ratingPillRow}>
            {[
              { label: t('all'), value: '' },
              { label: '⭐ 4.8+', value: '4.8' },
              { label: '⭐ 4.5+', value: '4.5' },
              { label: '⭐ 4.0+', value: '4.0' },
            ].map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.ratingPill, ratingQuery === r.value && styles.ratingPillActive]}
                onPress={() => setRatingQuery(r.value)}
              >
                <Text style={[styles.ratingPillText, ratingQuery === r.value && styles.ratingPillTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Architects List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.green} />
          </View>
        ) : (
          <ScrollView bounces={true} contentContainerStyle={styles.scrollContent}>
            {filteredArchitects.map((item) => {
              const avatar = resolveAvatarUrl(item.avatarUrl) || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80';
              const specialization = Array.isArray(item.specialization) ? item.specialization.join(', ') : (item.specialization || 'General Architecture');
              const followers = item.followersCount || 0;
              return (
                <View key={item._id} style={styles.architectCard}>
                  <View style={styles.cardTopRow}>
                    <Image source={{ uri: avatar }} style={styles.avatarImage} contentFit="cover" />
                    <View style={styles.cardDetailsCol}>
                      <View style={styles.nameRow}>
                        <Text style={styles.nameText}>{item.fullName}</Text>
                        <Feather name="check-circle" size={14} color={COLORS.green} style={styles.verifiedIcon} />
                      </View>
                      
                      <View style={styles.ratingRow}>
                        <Feather name="star" size={13} color={COLORS.gold} style={styles.starIcon} />
                        <Text style={styles.ratingText}>{item.rating || 4.5}</Text>
                        <Text style={styles.reviewsText}>({item.reviews || 0} {t('reviews')})</Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Feather name="map-pin" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
                        <Text style={styles.metaText}>{item.city}</Text>
                      </View>

                      <View style={styles.metaRow}>
                        <Feather name="briefcase" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
                        <Text style={styles.metaText}>{item.experience || t('entryLevel')} {t('experienceSuffix')}</Text>
                      </View>
                    </View>

                    {/* View Profile Button */}
                    <TouchableOpacity style={styles.viewProfileButton} onPress={() => navigateToDetail(item)}>
                      <Text style={styles.viewProfileText}>{t('viewProfile')}</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.specializationText}>{specialization}</Text>

                  {/* Stats Footer inside Card */}
                  <View style={styles.cardStatsRow}>
                    <View style={styles.statItem}>
                      <FontAwesome5 name="briefcase" size={12} color={COLORS.textMuted} style={styles.statIcon} />
                      <Text style={styles.statText}>{item.projects || 0} {t('projectsSuffix')}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <FontAwesome5 name="users" size={12} color={COLORS.textMuted} style={styles.statIcon} />
                      <Text style={styles.statText}>{followers} {t('networksSuffix')}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            {filteredArchitects.length === 0 && (
              <View style={styles.emptyContainer}>
                <Feather name="alert-circle" size={48} color={COLORS.textMuted} style={{ marginBottom: 15 }} />
                <Text style={styles.emptyText}>{t('noArchitectsFound')}</Text>
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
  redDot: { position: 'absolute', top: 5, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: COLORS.white },

  /* FILTERS */
  filterSection: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  filterRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 10, height: 38, backgroundColor: COLORS.bgLight },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textDark, height: '100%' },
  ratingPillScroll: { flexGrow: 0 },
  ratingPillRow: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  ratingPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.border },
  ratingPillActive: { backgroundColor: '#F0FDF4', borderColor: COLORS.green },
  ratingPillText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  ratingPillTextActive: { color: COLORS.green, fontWeight: '700' },

  /* ARCHITECT CARDS */
  architectCard: { backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 15, marginBottom: 15, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardTopRow: { flexDirection: 'row', position: 'relative' },
  avatarImage: { width: 75, height: 75, borderRadius: 37.5 },
  cardDetailsCol: { flex: 1, marginLeft: 15, paddingRight: 90 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  nameText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark },
  verifiedIcon: { marginLeft: 5 },
  
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  starIcon: { marginRight: 4 },
  ratingText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, marginRight: 4 },
  reviewsText: { fontSize: 12, color: COLORS.textMuted },
  
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  metaIcon: { marginRight: 6 },
  metaText: { fontSize: 12, color: COLORS.textMuted },

  viewProfileButton: { position: 'absolute', right: 0, top: 12, backgroundColor: COLORS.greenLight, borderWidth: 1, borderColor: COLORS.green, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  viewProfileText: { fontSize: 12, color: COLORS.green, fontWeight: '600' },

  specializationText: { fontSize: 13, color: COLORS.textMuted, marginTop: 12, lineHeight: 18 },

  cardStatsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 15, paddingTop: 12, gap: 20 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statIcon: { marginRight: 6 },
  statText: { fontSize: 12, color: COLORS.textDark, fontWeight: '600' },

  /* EMPTY CONTAINER */
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },
});
