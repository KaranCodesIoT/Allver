import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL, resolveAvatarUrl } from '../constants/Config';
import NotificationBell from '../components/NotificationBell';
import { useTranslation } from '../utils/i18n';

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
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
};

export default function SearchResultsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  
  const [searchQuery, setSearchQuery] = useState((params.searchQuery as string) || '');
  const [selectedRole, setSelectedRole] = useState<'All' | 'Contractor' | 'Architect' | 'Labour'>('All');
  
  const [allProfessionals, setAllProfessionals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setIsLoading(true);
        // Fetch all roles concurrently
        const [contractorRes, architectRes, labourRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/professionals/Contractor`),
          fetch(`${BACKEND_URL}/api/professionals/Architect`),
          fetch(`${BACKEND_URL}/api/professionals/Labour`)
        ]);

        const [contractorsData, architectsData, laboursData] = await Promise.all([
          contractorRes.json(),
          architectRes.json(),
          labourRes.json()
        ]);

        const contractors = (contractorsData.professionals || []).map((c: any) => ({ ...c, role: 'Contractor' }));
        const architects = (architectsData.professionals || []).map((a: any) => ({ ...a, role: 'Architect' }));
        const labours = (laboursData.professionals || []).map((l: any) => ({ ...l, role: 'Labour' }));

        setAllProfessionals([...contractors, ...architects, ...labours]);
      } catch (err) {
        console.error('Error fetching search professionals:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Filter list based on search query and selected role
  const filteredList = allProfessionals.filter((item) => {
    const roleMatches = selectedRole === 'All' ? true : item.role === selectedRole;
    
    if (!roleMatches) return false;

    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;

    const name = item.fullName || '';
    const city = item.city || '';
    const experience = item.experience || '';
    const specialization = Array.isArray(item.specialization) 
      ? item.specialization.join(' ') 
      : (item.specialization || '');
    const workCategory = Array.isArray(item.workCategory)
      ? item.workCategory.join(' ')
      : (item.workCategory || '');
    const skillType = item.skillType || '';
    const firmName = item.firmName || '';

    const textToSearch = `${name} ${firmName} ${city} ${experience} ${specialization} ${workCategory} ${skillType} ${item.role}`.toLowerCase();
    return textToSearch.includes(q);
  });

  const navigateToDetail = (item: any) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    if (item.role === 'Architect') {
      const skillsStr = Array.isArray(item.specialization) 
        ? item.specialization.join(',') 
        : (item.specialization || '');
      
      router.push({
        pathname: '/architect-detail',
        params: {
          id: item._id,
          name: item.fullName,
          avatar: resolveAvatarUrl(item.avatarUrl, item.updatedAt) || '',
          coverImage: resolveAvatarUrl(item.cover, item.updatedAt) || '',
          rating: (item.rating || 4.8).toString(),
          reviews: (item.reviews || 0).toString(),
          location: item.city,
          experience: item.experience || 'Entry Level',
          specialization: skillsStr,
          projects: (item.projects || 0).toString(),
          followers: (item.followersCount || 0).toString(),
          firmName: item.firmName || 'Independent Architect',
          phone: item.phoneNumber || '',
          workerCount: 'None',
          serviceAreas: Array.isArray(item.serviceArea) ? item.serviceArea.join(',') : '',
          skills: skillsStr
        }
      });
    } else if (item.role === 'Contractor') {
      const skillsStr = Array.isArray(item.workCategory) 
        ? item.workCategory.join(',') 
        : (item.workCategory || '');

      const areasStr = Array.isArray(item.serviceLocation) 
        ? item.serviceLocation.join(',') 
        : (item.serviceLocation || '');

      router.push({
        pathname: '/contractor-detail',
        params: {
          id: item._id,
          name: item.fullName,
          avatar: resolveAvatarUrl(item.avatarUrl, item.updatedAt) || '',
          coverImage: resolveAvatarUrl(item.cover, item.updatedAt) || '',
          rating: (item.rating || 4.5).toString(),
          reviews: (item.reviews || 0).toString(),
          location: item.city,
          experience: item.experience || 'Entry Level',
          specialization: Array.isArray(item.specialization) 
            ? item.specialization.join(', ') 
            : (item.specialization || 'General Contractor'),
          projects: (item.projects || 0).toString(),
          followers: (item.followersCount || 0).toString(),
          firmName: item.firmName || 'Independent Contractor',
          phone: item.phoneNumber || '',
          workerCount: item.teamSize ? `${item.teamSize} Workers` : '10 Workers',
          serviceAreas: areasStr,
          skills: skillsStr
        }
      });
    } else if (item.role === 'Labour') {
      router.push({
        pathname: '/labour-detail',
        params: {
          id: item._id,
          name: item.fullName,
          role: item.skillType || 'Mason',
          avatar: resolveAvatarUrl(item.avatarUrl, item.updatedAt) || '',
          coverImage: resolveAvatarUrl(item.cover, item.updatedAt) || '',
          rating: (item.rating || 4.6).toString(),
          reviews: (item.reviews || 0).toString(),
          location: item.city,
          experience: item.experience || 'Entry Level',
          specialization: Array.isArray(item.specialization) ? item.specialization.join(',') : (item.specialization || ''),
          projects: (item.projects || 0).toString(),
          followers: (item.followersCount || 0).toString(),
          firmName: 'Freelance Worker',
          phone: item.phoneNumber || '',
          serviceAreas: Array.isArray(item.serviceArea) ? item.serviceArea.join(',') : '',
          skills: Array.isArray(item.specialization) ? item.specialization.join(',') : (item.specialization || '')
        }
      });
    }
  };

  const getRoleColors = (role: string) => {
    switch (role) {
      case 'Architect':
        return { text: COLORS.blue, bg: COLORS.blueLight };
      case 'Contractor':
        return { text: COLORS.green, bg: COLORS.greenLight };
      default:
        return { text: COLORS.orange, bg: COLORS.orangeLight };
    }
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
            <Text style={styles.headerTitle}>{t('searchResults')}</Text>
            <Text style={styles.headerSubtitle}>{t('searchAllCategories')}</Text>
          </View>
        </View>

        {/* Search & Filter Options */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Feather name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchPlaceholderResults')}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Role Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
            {(['All', 'Contractor', 'Architect', 'Labour'] as const).map((role) => {
              const roleLabels: Record<string, string> = {
                'All': t('allProfessionals'),
                'Contractor': t('contractor'),
                'Architect': t('architect'),
                'Labour': t('labour')
              };
              return (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.pill,
                    selectedRole === role && styles.pillActive,
                    selectedRole === role && role !== 'All' && { backgroundColor: getRoleColors(role).bg, borderColor: getRoleColors(role).text }
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text 
                    style={[
                      styles.pillText, 
                      selectedRole === role && styles.pillTextActive,
                      selectedRole === role && role !== 'All' && { color: getRoleColors(role).text }
                    ]}
                  >
                    {roleLabels[role] || role}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* List of Results */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.green} />
          </View>
        ) : filteredList.length === 0 ? (
          <ScrollView contentContainerStyle={styles.centerContainer}>
            <Feather name="search" size={48} color={COLORS.textMuted} style={{ marginBottom: 12 }} />
            <Text style={styles.noResultsTitle}>{t('noResultsFound')}</Text>
            <Text style={styles.noResultsSubtitle}>{t('tryAdjustingKeywords')}</Text>
          </ScrollView>
        ) : (
          <ScrollView bounces={true} contentContainerStyle={styles.scrollContent}>
            {filteredList.map((item) => {
              const avatar = resolveAvatarUrl(item.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=1BC47D&color=fff`;
              const colors = getRoleColors(item.role);
              const skills = item.role === 'Contractor' 
                ? (item.workCategory || []) 
                : (item.role === 'Architect' ? (item.specialization || []) : (item.specialization || []));
              const displaySkills = Array.isArray(skills) ? skills.slice(0, 3).join(', ') : '';

              return (
                <TouchableOpacity 
                  key={item._id} 
                  style={styles.card}
                  onPress={() => navigateToDetail(item)}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardTopRow}>
                    <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
                    
                    <View style={styles.cardInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.nameText} numberOfLines={1}>{item.fullName}</Text>
                        {item.isVerified && (
                          <Feather name="check-circle" size={14} color={COLORS.green} style={styles.verifiedIcon} />
                        )}
                      </View>

                      {/* Role Tag & Rating */}
                      <View style={styles.metaRow}>
                        <View style={[styles.roleTag, { backgroundColor: colors.bg }]}>
                          <Text style={[styles.roleTagText, { color: colors.text }]}>{item.role}</Text>
                        </View>
                        <View style={styles.ratingRow}>
                          <Feather name="star" size={12} color={COLORS.gold} style={styles.starIcon} />
                          <Text style={styles.ratingText}>{item.rating || 4.5}</Text>
                        </View>
                      </View>

                      {/* City & Experience */}
                      <View style={styles.detailsRow}>
                        <Feather name="map-pin" size={12} color={COLORS.textMuted} style={styles.detailIcon} />
                        <Text style={styles.detailText} numberOfLines={1}>{item.city}</Text>
                        <Text style={styles.detailDot}>•</Text>
                        <Feather name="briefcase" size={12} color={COLORS.textMuted} style={styles.detailIcon} />
                        <Text style={styles.detailText} numberOfLines={1}>{item.experience || t('entryLevel')}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Skills preview */}
                  {displaySkills ? (
                    <View style={styles.skillsContainer}>
                      <Text style={styles.skillsLabel}>{t('skills')}: </Text>
                      <Text style={styles.skillsText} numberOfLines={1}>{displaySkills}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { marginRight: 15 },
  headerTextCol: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted },
  
  filterSection: { padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.bgLight, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textDark, padding: 0 },
  
  pillsContainer: { gap: 8, paddingVertical: 4 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  pillActive: { backgroundColor: '#E0F2FE', borderColor: COLORS.blue },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  pillTextActive: { color: COLORS.blue },

  scrollContent: { padding: 15, gap: 12 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  noResultsTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginTop: 10 },
  noResultsSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },

  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, backgroundColor: COLORS.white },
  cardTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, marginRight: 12 },
  cardInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { fontSize: 15, fontWeight: '700', color: COLORS.textDark, flexShrink: 1 },
  verifiedIcon: { marginTop: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  roleTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  roleTagText: { fontSize: 10, fontWeight: '700' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  starIcon: { marginTop: -1 },
  ratingText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailIcon: { opacity: 0.7 },
  detailText: { fontSize: 11, color: COLORS.textMuted, flexShrink: 1 },
  detailDot: { fontSize: 11, color: COLORS.textMuted, paddingHorizontal: 2 },

  skillsContainer: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, alignItems: 'center' },
  skillsLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textDark },
  skillsText: { fontSize: 11, color: COLORS.textMuted, flex: 1 }
});
