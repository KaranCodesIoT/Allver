import React, { useState, useEffect, useCallback } from 'react';
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
  gold: '#F59E0B',
  bgLight: '#F9FAFB',
};

const CONTRACTORS_DATA = [
  {
    id: '1',
    name: 'BuildWell Constructions',
    avatar: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop',
    rating: 4.8,
    reviews: 124,
    location: 'Mumbai, Maharashtra',
    experience: '12+ Years',
    specialization: 'Specialized in residential and commercial construction with quality and timely delivery.',
    projects: 156,
    followers: 320,
    firmName: 'BuildWell Construction Group',
    phone: '+91 98765 43210',
    workerCount: '25 Workers Available',
    serviceAreas: 'Mumbai, Navi Mumbai',
    skills: ['RCC Work', 'Brickwork', 'Plumbing', 'Electrical', 'Painting', 'Tile Work', 'False Ceiling', 'Carpentry']
  },
  {
    id: '2',
    name: 'Surya Constructions',
    avatar: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?q=80&w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
    rating: 4.7,
    reviews: 98,
    location: 'Pune, Maharashtra',
    experience: '10+ Years',
    specialization: 'Building your dream with strength, precision and reliability.',
    projects: 112,
    followers: 245,
    firmName: 'Surya Construction Services',
    phone: '+91 98765 43211',
    workerCount: '18 Workers Available',
    serviceAreas: 'Pune, Pimpri Chinchwad',
    skills: ['Renovation', 'Painting', 'Flooring', 'Carpentry', 'Plumbing', 'Electrical']
  },
  {
    id: '3',
    name: 'Shree Ram Builders',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=800&auto=format&fit=crop',
    rating: 4.6,
    reviews: 76,
    location: 'Bengaluru, Karnataka',
    experience: '8+ Years',
    specialization: 'Experts in home construction, renovation and civil work.',
    projects: 98,
    followers: 198,
    firmName: 'Shree Ram Builders & Developers',
    phone: '+91 98765 43212',
    workerCount: '22 Workers Available',
    serviceAreas: 'Bengaluru, Whitefield',
    skills: ['Building Construction', 'Renovation', 'Carpentry', 'Flooring']
  },
  {
    id: '4',
    name: 'Reliable Infra Solutions',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
    coverImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=800&auto=format&fit=crop',
    rating: 4.5,
    reviews: 64,
    location: 'Hyderabad, Telangana',
    experience: '9+ Years',
    specialization: 'Delivering strong and sustainable structures across industries.',
    projects: 86,
    followers: 176,
    firmName: 'Reliable Infra Solutions Ltd',
    phone: '+91 98765 43213',
    workerCount: '15 Workers Available',
    serviceAreas: 'Hyderabad, Secunderabad',
    skills: ['RCC Work', 'Building Construction', 'Renovation']
  }
];

const PREDEFINED_SKILLS = [
  'General Contracting',
  'Civil Construction',
  'Renovation',
  'Interior Fitouts',
  'Electrical Works',
  'Plumbing Works',
  'Masonry Works',
  'HVAC Installation'
];

export default function ContractorsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState((params.searchQuery as string) || '');

  const [locationQuery, setLocationQuery] = useState('');
  const [ratingQuery, setRatingQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [contractors, setContractors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSkills, setExpandedSkills] = useState<Record<string, boolean>>({});

  const toggleSkills = useCallback((id: string) => {
    setExpandedSkills(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  useEffect(() => {
    const fetchContractors = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/professionals/Contractor`);
        const data = await response.json();
        if (response.ok && data.professionals) {
          setContractors(data.professionals);
        }
      } catch (err) {
        console.error('Error fetching contractors:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContractors();
  }, []);

  // Filter contractors
  const filteredContractors = contractors.filter((item) => {
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

    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          specs.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          specsPlural.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          workCat.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          skills.toLowerCase().includes(searchQuery.toLowerCase());
    
    const location = item.city || '';
    const matchesLocation = location.toLowerCase().includes(locationQuery.toLowerCase());

    const rating = item.rating || 4.5;
    const matchesRating = ratingQuery ? rating >= parseFloat(ratingQuery) : true;
    
    const matchesSkill = selectedSkill
      ? workCat.toLowerCase().includes(selectedSkill.toLowerCase()) || 
        skills.toLowerCase().includes(selectedSkill.toLowerCase()) ||
        specs.toLowerCase().includes(selectedSkill.toLowerCase()) ||
        specsPlural.toLowerCase().includes(selectedSkill.toLowerCase())
      : true;
    
    return matchesSearch && matchesLocation && matchesRating && matchesSkill;
  });


  const navigateToDetail = (contractor: any) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    const skillsStr = Array.isArray(contractor.workCategory) 
      ? contractor.workCategory.join(',') 
      : (contractor.workCategory || '');

    const areasStr = Array.isArray(contractor.serviceLocation) 
      ? contractor.serviceLocation.join(',') 
      : (contractor.serviceLocation || '');

    router.push({
      pathname: '/contractor-detail',
      params: {
        id: contractor._id,
        name: contractor.fullName,
        avatar: resolveAvatarUrl(contractor.avatarUrl) || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=200&auto=format&fit=crop',
        coverImage: resolveAvatarUrl(contractor.cover) || 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop',
        rating: (contractor.rating || 4.5).toString(),
        reviews: (contractor.reviews || 0).toString(),
        location: contractor.city,
        experience: contractor.experience || 'Entry Level',
        specialization: Array.isArray(contractor.specialization) 
          ? contractor.specialization.join(', ') 
          : (contractor.specialization || 'General Contractor'),
        projects: (contractor.projects || 0).toString(),
        followers: (contractor.followersCount || 0).toString(),
        firmName: contractor.firmName || 'Independent Contractor',
        phone: contractor.phoneNumber || '',
        workerCount: contractor.teamSize ? `${contractor.teamSize} Workers` : '10 Workers',
        serviceAreas: areasStr,
        skills: skillsStr
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
            <Text style={styles.headerTitle}>{t('contractors')}</Text>
            <Text style={styles.headerSubtitle}>{t('findContractorDesc')}</Text>
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

        {/* Contractors List */}
        {isLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.green} />
          </View>
        ) : (
          <ScrollView bounces={true} contentContainerStyle={styles.scrollContent}>
            {filteredContractors.map((item) => {
              const avatar = resolveAvatarUrl(item.avatarUrl) || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=200&auto=format&fit=crop';
              const specialization = Array.isArray(item.specialization) 
                ? item.specialization.join(', ') 
                : (item.specialization || 'General Contractor');
              const followers = item.followersCount || 0;
              return (
                <View key={item._id} style={styles.contractorCard}>
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

                  {/* Skills Pills */}
                  {(() => {
                    const skills: string[] = Array.isArray(item.workCategory)
                      ? item.workCategory
                      : item.workCategory ? item.workCategory.split(',').map((s: string) => s.trim()) : [];
                    if (skills.length === 0) return null;
                    const MAX_VISIBLE = 3;
                    const isExpanded = expandedSkills[item._id] || false;
                    const visibleSkills = isExpanded ? skills : skills.slice(0, MAX_VISIBLE);
                    const hasMore = skills.length > MAX_VISIBLE;
                    return (
                      <View style={styles.skillsSection}>
                        <View style={styles.skillsRow}>
                          {visibleSkills.map((skill, idx) => (
                            <View key={idx} style={styles.skillPill}>
                              <Text style={styles.skillPillText}>{skill}</Text>
                            </View>
                          ))}
                          {hasMore && (
                            <TouchableOpacity
                              style={styles.seeMorePill}
                              onPress={() => toggleSkills(item._id)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.seeMoreText}>
                                {isExpanded ? 'See less' : `+${skills.length - MAX_VISIBLE} more`}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })()}

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

            {filteredContractors.length === 0 && (
              <View style={styles.emptyContainer}>
                <Feather name="alert-circle" size={48} color={COLORS.textMuted} style={{ marginBottom: 15 }} />
                <Text style={styles.emptyText}>{t('noContractorsFound')}</Text>
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
  scrollContent: { paddingHorizontal: 0, paddingBottom: 0, paddingTop: 15 },

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

  /* CONTRACTOR CARDS */
  contractorCard: { backgroundColor: COLORS.white, borderRadius: 0, borderTopWidth: 1, borderBottomWidth: 1, borderLeftWidth: 0, borderRightWidth: 0, borderColor: COLORS.border, padding: 15, marginBottom: 15, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
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

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center' },

  /* SKILLS */
  skillsSection: { marginTop: 10 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillPill: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  skillPillText: { fontSize: 11, color: '#15803D', fontWeight: '600' },
  seeMorePill: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  seeMoreText: { fontSize: 11, color: '#2563EB', fontWeight: '700' },
});
