import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

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
const ARCHITECTS_DATA = [
  {
    id: '1',
    name: 'Ar. Neha Sharma',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    rating: 4.8,
    reviews: 124,
    location: 'Mumbai, Maharashtra',
    experience: '8+ Years',
    specialization: 'Specializes in modern, sustainable and luxury architecture.',
    projects: 128,
    followers: 256,
    firmName: 'Design Space Architects',
    phone: '+91 98765 43210'
  },
  {
    id: '2',
    name: 'Ar. Rohit Mehta',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
    rating: 4.7,
    reviews: 98,
    location: 'Pune, Maharashtra',
    experience: '10+ Years',
    specialization: 'Expert in residential and commercial architecture.',
    projects: 96,
    followers: 189,
    firmName: 'RM Design Studios',
    phone: '+91 98765 43211'
  },
  {
    id: '3',
    name: 'Ar. Priya Nair',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    coverImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
    rating: 4.9,
    reviews: 156,
    location: 'Bengaluru, Karnataka',
    experience: '7+ Years',
    specialization: 'Specializes in interior architecture and space planning.',
    projects: 156,
    followers: 218,
    firmName: 'Studio Priya Architects',
    phone: '+91 98765 43212'
  },
  {
    id: '4',
    name: 'Ar. Karan Patel',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    coverImage: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80',
    rating: 4.6,
    reviews: 72,
    location: 'Hyderabad, Telangana',
    experience: '6+ Years',
    specialization: 'Focus on innovative and cost-effective designs.',
    projects: 84,
    followers: 132,
    firmName: 'KP Architectural Group',
    phone: '+91 98765 43213'
  }
];

export default function ArchitectsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [ratingQuery, setRatingQuery] = useState('');
  const [showRatingDropdown, setShowRatingDropdown] = useState(false);

  // Filter architects
  const filteredArchitects = ARCHITECTS_DATA.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = item.location.toLowerCase().includes(locationQuery.toLowerCase());
    const matchesRating = ratingQuery ? item.rating >= parseFloat(ratingQuery) : true;
    return matchesSearch && matchesLocation && matchesRating;
  });

  const handleSelectRating = (rating: string) => {
    setRatingQuery(rating);
    setShowRatingDropdown(false);
  };

  const navigateToDetail = (architect: typeof ARCHITECTS_DATA[0]) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    router.push({
      pathname: '/architect-detail',
      params: {
        id: architect.id,
        name: architect.name,
        avatar: architect.avatar,
        coverImage: architect.coverImage,
        rating: architect.rating.toString(),
        reviews: architect.reviews.toString(),
        location: architect.location,
        experience: architect.experience,
        specialization: architect.specialization,
        projects: architect.projects.toString(),
        followers: architect.followers.toString(),
        firmName: architect.firmName,
        phone: architect.phone
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
            <Text style={styles.headerTitle}>Architecture</Text>
            <Text style={styles.headerSubtitle}>Find the best architects for your project</Text>
          </View>
          <TouchableOpacity style={styles.notificationBtn}>
            <Feather name="bell" size={22} color={COLORS.textDark} />
            <View style={styles.redDot} />
          </TouchableOpacity>
        </View>

        {/* Search & Filter Bar */}
        <View style={styles.filterSection}>
          <View style={styles.searchBox}>
            <Feather name="user" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter architect name"
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.searchBox}>
            <Feather name="map-pin" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter location"
              placeholderTextColor={COLORS.textMuted}
              value={locationQuery}
              onChangeText={setLocationQuery}
            />
            <TouchableOpacity style={styles.locationGps}>
              <Feather name="navigation" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Rating Dropdown Trigger */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity 
              style={styles.dropdownTrigger} 
              onPress={() => setShowRatingDropdown(!showRatingDropdown)}
            >
              <Feather name="star" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
              <Text style={[styles.dropdownValue, !ratingQuery && { color: COLORS.textMuted }]}>
                {ratingQuery ? `${ratingQuery}+ Rating` : 'Select rating'}
              </Text>
              <Feather name={showRatingDropdown ? "chevron-up" : "chevron-down"} size={18} color={COLORS.textDark} />
            </TouchableOpacity>

            {showRatingDropdown && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity style={styles.dropdownOption} onPress={() => handleSelectRating('')}>
                  <Text style={styles.dropdownOptionText}>All Ratings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownOption} onPress={() => handleSelectRating('4.8')}>
                  <Text style={styles.dropdownOptionText}>4.8+ Excellent</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownOption} onPress={() => handleSelectRating('4.7')}>
                  <Text style={styles.dropdownOptionText}>4.7+ Very Good</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownOption} onPress={() => handleSelectRating('4.5')}>
                  <Text style={styles.dropdownOptionText}>4.5+ Good</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Architects List */}
        <ScrollView bounces={true} contentContainerStyle={styles.scrollContent}>
          {filteredArchitects.map((item) => (
            <View key={item.id} style={styles.architectCard}>
              <View style={styles.cardTopRow}>
                <Image source={{ uri: item.avatar }} style={styles.avatarImage} contentFit="cover" />
                <View style={styles.cardDetailsCol}>
                  <View style={styles.nameRow}>
                    <Text style={styles.nameText}>{item.name}</Text>
                    <Feather name="check-circle" size={14} color={COLORS.green} style={styles.verifiedIcon} />
                  </View>
                  
                  <View style={styles.ratingRow}>
                    <Feather name="star" size={13} color={COLORS.gold} style={styles.starIcon} />
                    <Text style={styles.ratingText}>{item.rating}</Text>
                    <Text style={styles.reviewsText}>({item.reviews} Reviews)</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Feather name="map-pin" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
                    <Text style={styles.metaText}>{item.location}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Feather name="briefcase" size={12} color={COLORS.textMuted} style={styles.metaIcon} />
                    <Text style={styles.metaText}>{item.experience} Experience</Text>
                  </View>
                </View>

                {/* View Profile Button */}
                <TouchableOpacity style={styles.viewProfileButton} onPress={() => navigateToDetail(item)}>
                  <Text style={styles.viewProfileText}>View Profile</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.specializationText}>{item.specialization}</Text>

              {/* Stats Footer inside Card */}
              <View style={styles.cardStatsRow}>
                <View style={styles.statItem}>
                  <FontAwesome5 name="briefcase" size={12} color={COLORS.textMuted} style={styles.statIcon} />
                  <Text style={styles.statText}>{item.projects} Projects</Text>
                </View>
                <View style={styles.statItem}>
                  <FontAwesome5 name="users" size={12} color={COLORS.textMuted} style={styles.statIcon} />
                  <Text style={styles.statText}>{item.followers} Followers</Text>
                </View>
              </View>
            </View>
          ))}

          {filteredArchitects.length === 0 && (
            <View style={styles.emptyContainer}>
              <Feather name="alert-circle" size={48} color={COLORS.textMuted} style={{ marginBottom: 15 }} />
              <Text style={styles.emptyText}>No architects found matching your criteria.</Text>
            </View>
          )}
        </ScrollView>
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
  filterSection: { paddingHorizontal: 20, paddingTop: 15, gap: 10 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, height: 44, backgroundColor: COLORS.bgLight },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textDark, height: '100%' },
  locationGps: { padding: 5 },

  /* DROPDOWN */
  dropdownContainer: { position: 'relative', zIndex: 10 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, height: 44, backgroundColor: COLORS.bgLight },
  dropdownValue: { flex: 1, fontSize: 14, color: COLORS.textDark },
  dropdownMenu: { position: 'absolute', top: 48, left: 0, right: 0, backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, paddingVertical: 5 },
  dropdownOption: { paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: COLORS.border },
  dropdownOptionText: { fontSize: 14, color: COLORS.textDark },

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
