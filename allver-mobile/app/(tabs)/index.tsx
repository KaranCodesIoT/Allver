import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, useWindowDimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const COLORS = {
  white: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#6B7280',
  bgLight: '#F9FAFB',
  green: '#10B981',
  greenLight: '#D1FAE5',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  orange: '#F97316',
  orangeLight: '#FFEDD5',
  purple: '#7C3AED',
  purpleLight: '#F3E8FF',
  yellow: '#F59E0B',
  yellowLight: '#FEF3C7',
  border: '#E5E7EB',
  starGold: '#FBBF24',
};

// Custom data matching the mockup screenshot
const PROJECTS_DATA = [
  {
    id: '1',
    title: 'Luxury Villa Construction',
    location: 'Jaipur, Rajasthan',
    status: 'On Track',
    statusBg: '#DCFCE7',
    statusColor: '#15803D',
    progress: 75,
    workers: 12,
    dueDate: '12 May',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: '2',
    title: 'Office Renovation',
    location: 'Gurugram, Haryana',
    status: 'In Progress',
    statusBg: '#DBEAFE',
    statusColor: '#1D4ED8',
    progress: 32,
    workers: 8,
    dueDate: '28 May',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop'
  }
];

const PROFESSIONALS_DATA = [
  {
    id: '2',
    name: 'Rahul Contractor',
    role: 'Civil Contractor',
    experience: '4-6 years Experience',
    projects: '15 Projects Completed',
    skills: ['Residential Construction', 'Commercial Construction', 'Renovation', 'Civil Work'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=120&auto=format&fit=crop',
    color: '#2563EB',
    rating: 4.8,
    reviews: 126,
    location: 'Pune, Maharashtra',
    firmName: 'Rahul Construction Services',
    phone: '+91 98765 43211',
    specialization: 'Expertise in building construction, renovation work, and concrete foundations.',
    workerCount: '15 Workers Available',
    serviceAreas: 'Pune, Pimpri Chinchwad',
    skillsList: ['RCC Work', 'Brickwork', 'Plumbing', 'Electrical', 'Painting', 'Tile Work']
  },
  {
    id: '1',
    name: 'Ar. Rohit Sharma',
    role: 'Architect',
    experience: '3-5 years Experience',
    projects: '18 Projects Completed',
    skills: ['Architecture & Design', 'Interior Design'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=120&auto=format&fit=crop',
    color: '#10B981',
    rating: 4.9,
    reviews: 98,
    location: 'Mumbai, Maharashtra',
    firmName: 'Sharma & Associates',
    phone: '+91 98765 43210',
    specialization: 'Specialized in modern architecture, residential planning, and premium interior design.'
  },
  {
    id: '3',
    name: 'Amit Labour Supplier',
    role: 'Labour Supplier',
    experience: '3-5 years Experience',
    projects: '30 Projects Completed',
    skills: ['Renovation', 'Electrical Work', 'Plumbing', 'Painting', 'Civil Work'],
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=120&auto=format&fit=crop',
    color: '#F97316',
    rating: 4.7,
    reviews: 86,
    location: 'Mumbai, Maharashtra',
    contractorName: 'BuildWell Constructions'
  }
];

const SERVICES_DATA = [
  { id: '1', title: 'Residential\nConstruction', icon: 'home', color: '#EA580C', bgColor: '#FFEDD5', library: 'Feather' },
  { id: '2', title: 'Commercial\nConstruction', icon: 'office-building', color: '#F59E0B', bgColor: '#FEF3C7', library: 'MaterialCommunityIcons' },
  { id: '3', title: 'Architecture\n& Design', icon: 'drafting-compass', color: '#059669', bgColor: '#D1FAE5', library: 'FontAwesome5' },
  { id: '4', title: 'Interior\nDesign', icon: 'sofa', color: '#7C3AED', bgColor: '#F3E8FF', library: 'MaterialCommunityIcons' },
  { id: '5', title: 'Renovation', icon: 'hammer', color: '#EA580C', bgColor: '#FFEDD5', library: 'FontAwesome5' },
  { id: '6', title: 'Electrical\nWork', icon: 'zap', color: '#EAB308', bgColor: '#FEFCE8', library: 'Feather' },
  { id: '7', title: 'Plumbing', icon: 'faucet', color: '#06B6D4', bgColor: '#ECFEFF', library: 'FontAwesome5' },
  { id: '8', title: 'Painting', icon: 'paint-roller', color: '#EC4899', bgColor: '#FDF2F8', library: 'MaterialCommunityIcons' },
  { id: '9', title: 'Civil\nWork', icon: 'hard-hat', color: '#10B981', bgColor: '#D1FAE5', library: 'FontAwesome5' },
  { id: '10', title: 'More\nServices', icon: 'grid', color: '#6B7280', bgColor: '#F3F4F6', library: 'Feather' },
];

const ACTIVITIES_DATA = [
  {
    id: '1',
    title: 'Rahul Contractor accepted your project invitation',
    project: 'Luxury Villa Construction',
    time: '2h ago',
    icon: 'user-check',
    color: '#16A34A',
    bgColor: '#DCFCE7'
  },
  {
    id: '2',
    title: 'Ankit Kumar marked attendance',
    detail: '12 Workers',
    project: 'Office Renovation',
    time: '4h ago',
    icon: 'check-square',
    color: '#2563EB',
    bgColor: '#DBEAFE'
  },
  {
    id: '3',
    title: '50 Cement Bags delivered',
    project: 'Luxury Villa Construction',
    time: '6h ago',
    icon: 'truck',
    color: '#EA580C',
    bgColor: '#FFEDD5'
  },
  {
    id: '4',
    title: 'New quotation received from Amit Supplier',
    project: 'Office Renovation',
    time: '8h ago',
    icon: 'file-text',
    color: '#9333EA',
    bgColor: '#F3E8FF'
  }
];

export default function DashboardScreen() {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  React.useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try {
          user = JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
    }
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const userName = currentUser?.fullName || 'Rohit';

  // Set exactly 4 columns per row for Browse by Service grid
  const numCols = 4;
  const gridGap = 8;
  const gridPadding = 16;
  const totalGapWidth = gridGap * (numCols - 1);
  const availableGridWidth = screenWidth - (gridPadding * 2) - totalGapWidth;
  const srvCardWidth = Math.floor(availableGridWidth / numCols);

  const handleToggleService = (serviceName: string) => {
    // Standardize title for matching (remove newlines)
    const cleanedTitle = serviceName.replace('\n', ' ');
    if (selectedService === cleanedTitle) {
      setSelectedService(null);
    } else {
      setSelectedService(cleanedTitle);
    }
  };

  const handleViewProfile = (prof: typeof PROFESSIONALS_DATA[0]) => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }

    if (prof.role === 'Architect') {
      router.push({
        pathname: '/architect-detail',
        params: {
          id: prof.id,
          name: prof.name,
          avatar: prof.avatar,
          coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop',
          firmName: prof.firmName,
          experience: prof.experience.split(' ')[0],
          projects: prof.projects.split(' ')[0],
          followers: '192',
          phone: prof.phone,
          reviews: prof.reviews.toString(),
          rating: prof.rating.toString(),
          role: prof.role,
          location: prof.location,
          specialization: prof.specialization
        }
      });
    } else if (prof.role.includes('Contractor')) {
      router.push({
        pathname: '/contractor-detail',
        params: {
          id: prof.id,
          name: prof.name,
          avatar: prof.avatar,
          coverImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop',
          rating: prof.rating.toString(),
          reviews: prof.reviews.toString(),
          location: prof.location,
          experience: prof.experience.split(' ')[0],
          specialization: prof.specialization,
          projects: prof.projects.split(' ')[0],
          followers: '256',
          firmName: prof.firmName || 'Contracting Services',
          phone: prof.phone || '+91 98765 43210',
          workerCount: prof.workerCount || '18 Workers Available',
          serviceAreas: prof.serviceAreas || 'Mumbai, Pune',
          skills: prof.skillsList ? prof.skillsList.join(',') : 'Civil Work,RCC Work,Renovation'
        }
      });
    } else {
      router.push({
        pathname: '/labour-detail',
        params: {
          name: prof.name,
          role: prof.role,
          avatar: prof.avatar,
          experience: prof.experience.split(' ')[0] + ' Years Experience',
          location: prof.location,
          rating: prof.rating.toString(),
          reviews: prof.reviews.toString(),
          contractorName: prof.contractorName || 'BuildWell Constructions'
        }
      });
    }
  };

  const renderServiceIcon = (item: typeof SERVICES_DATA[0]) => {
    if (item.library === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={item.icon as any} size={20} color={item.color} />;
    } else if (item.library === 'FontAwesome5') {
      return <FontAwesome5 name={item.icon as any} size={16} color={item.color} />;
    } else {
      return <Feather name={item.icon as any} size={20} color={item.color} />;
    }
  };

  const renderActivityIcon = (iconName: string, color: string) => {
    if (iconName === 'user-check') return <Feather name="user-check" size={14} color={color} />;
    if (iconName === 'check-square') return <Feather name="check-square" size={14} color={color} />;
    if (iconName === 'truck') return <FontAwesome5 name="truck" size={12} color={color} />;
    return <Feather name="file-text" size={14} color={color} />;
  };

  // Filter logic
  const filteredProfessionals = PROFESSIONALS_DATA.filter((p) => {
    if (selectedService) {
      return p.skills.some(s => s.toLowerCase().includes(selectedService.toLowerCase()));
    }
    if (searchQuery) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             p.role.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* ================= STATIC HEADER ================= */}
      <View style={styles.headerContainer}>
        <View style={styles.logoRow}>
          <Image 
            source={require('@/assets/images/allver-logo.svg')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <View style={styles.headerIconsRow}>
            
            <TouchableOpacity style={styles.iconBadgeBtn}>
              <Feather name="bell" size={20} color={COLORS.textDark} />
              <View style={styles.badgeCircle}><Text style={styles.badgeText}>3</Text></View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.iconBadgeBtn}
              onPress={() => router.push('/chats')}
            >
              <Feather name="message-square" size={20} color={COLORS.textDark} />
              <View style={styles.badgeCircle}><Text style={styles.badgeText}>5</Text></View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.avatarBtn}
              onPress={() => router.push('/profile')}
            >
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop' }} 
                style={styles.avatarImage}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ================= GREETING ================= */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greetingText}>Welcome {userName} !</Text>
          <Text style={styles.subtitleText}>Let's build something great today!</Text>
        </View>


        {/* ================= SEARCH BAR ================= */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBarWrapper}>
            <Feather name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search architects, contractors, labour, services..." 
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterBtn}>
              <Feather name="sliders" size={18} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= QUICK ACTIONS ================= */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
            
            <TouchableOpacity style={[styles.actionCard, { backgroundColor: COLORS.yellowLight }]}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#FDE68A' }]}>
                <Feather name="plus" size={18} color="#D97706" />
              </View>
              <Text style={styles.actionCardTitle}>Post Project</Text>
              <Text style={styles.actionCardDesc}>Get started</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: COLORS.blueLight }]}
              onPress={() => router.push('/contractors')}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#BFDBFE' }]}>
                <FontAwesome5 name="users" size={14} color="#2563EB" />
              </View>
              <Text style={styles.actionCardTitle}>Find Contractor</Text>
              <Text style={styles.actionCardDesc}>Hire experts</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: COLORS.greenLight }]}
              onPress={() => router.push('/architects')}
            >
              <View style={[styles.actionIconCircle, { backgroundColor: '#A7F3D0' }]}>
                <FontAwesome5 name="user-tie" size={14} color="#059669" />
              </View>
              <Text style={styles.actionCardTitle}>Find Architect</Text>
              <Text style={styles.actionCardDesc}>Design your dream</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, { backgroundColor: COLORS.purpleLight }]}>
              <View style={[styles.actionIconCircle, { backgroundColor: '#E9D5FF' }]}>
                <Feather name="clipboard" size={16} color="#7C3AED" />
              </View>
              <Text style={styles.actionCardTitle}>Track Project</Text>
              <Text style={styles.actionCardDesc}>Stay updated</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>

        {/* ================= MY PROJECTS ================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>My Projects</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsScroll}>
            {PROJECTS_DATA.map((proj) => (
              <View key={proj.id} style={styles.projectCard}>
                
                {/* Cover Image Area */}
                <View style={styles.projectImageWrapper}>
                  <Image source={{ uri: proj.image }} style={styles.projectImage} />
                  
                  {/* Status Overlay */}
                  <View style={[styles.projectStatusBadge, { backgroundColor: proj.statusBg }]}>
                    <Text style={[styles.projectStatusText, { color: proj.statusColor }]}>{proj.status}</Text>
                  </View>


                </View>

                {/* Body Content */}
                <View style={styles.projectCardBody}>
                  <Text style={styles.projectTitleText}>{proj.title}</Text>
                  <View style={styles.iconLabelRow}>
                    <Feather name="map-pin" size={12} color={COLORS.textMuted} style={styles.cardInfoIcon} />
                    <Text style={styles.projectDetailText}>{proj.location}</Text>
                  </View>
                  
                  <View style={styles.projectDivider} />

                  {/* Statistics metrics */}
                  <View style={styles.projectMetricsRow}>
                    <View style={styles.metricItem}>
                      <FontAwesome5 name="users" size={10} color={COLORS.textMuted} style={styles.metricIcon} />
                      <Text style={styles.metricText}>{proj.workers} Workers</Text>
                    </View>
                    <View style={styles.metricItem}>
                      <Feather name="calendar" size={11} color={COLORS.textMuted} style={styles.metricIcon} />
                      <Text style={styles.metricText}>{proj.dueDate} Due</Text>
                    </View>
                  </View>



                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ================= FEATURED PROFESSIONALS ================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Featured Professionals</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCardsScroll}>
            {filteredProfessionals.map((prof) => (
              <View key={prof.id} style={styles.professionalCard}>
                
                {/* Header Info */}
                <View style={styles.profCardHeader}>
                  <Image source={{ uri: prof.avatar }} style={styles.profAvatar} />
                  <View style={styles.profTitleCol}>
                    <View style={styles.nameVerifiedRow}>
                      <Text style={styles.profName} numberOfLines={1}>{prof.name}</Text>
                      <MaterialCommunityIcons name="decagram-check" size={14} color="#10B981" style={styles.verifiedIcon} />
                    </View>
                    <Text style={styles.profSubText}>{prof.role}</Text>
                    
                    {/* Rating */}
                    <View style={styles.ratingRow}>
                      <FontAwesome name="star" size={12} color={COLORS.starGold} />
                      <Text style={styles.ratingValueText}>{prof.rating}</Text>
                      <Text style={styles.reviewsCountText}>({prof.reviews})</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.projectDivider} />

                {/* Stat Row */}
                <View style={styles.profStatsRow}>
                  <Feather name="file-text" size={13} color={COLORS.textMuted} style={styles.profStatIcon} />
                  <Text style={styles.profStatText}>{prof.projects}</Text>
                </View>

                {/* View Profile Outline Button */}
                <TouchableOpacity 
                  style={[styles.profBtn, { borderColor: prof.color }]} 
                  onPress={() => handleViewProfile(prof)}
                >
                  <Text style={[styles.profBtnText, { color: prof.color }]}>View Profile</Text>
                </TouchableOpacity>

              </View>
            ))}

            {filteredProfessionals.length === 0 && (
              <View style={styles.emptyCard}>
                <Feather name="info" size={24} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No professionals found</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* ================= BROWSE BY SERVICE ================= */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Browse by Service</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>

          <View style={styles.servicesGrid}>
            {[
              ...SERVICES_DATA.slice(0, 7),
              SERVICES_DATA.find(s => s.id === '10') || SERVICES_DATA[9]
            ].map((srv) => {
              const cleanedTitle = srv.title.replace('\n', ' ');
              const isSelected = selectedService === cleanedTitle;
              return (
                <TouchableOpacity 
                  key={srv.id} 
                  style={[
                    styles.serviceCard,
                    { width: srvCardWidth },
                    isSelected && { borderColor: srv.color, borderWidth: 1.5 }
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleToggleService(srv.title)}
                >
                  <View style={[styles.serviceIconWrapper, { backgroundColor: srv.bgColor }]}>
                    {renderServiceIcon(srv)}
                  </View>
                  <Text style={styles.serviceTitle} numberOfLines={2}>
                    {srv.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ================= RECENT ACTIVITY ================= */}
        <View style={[styles.sectionContainer, { paddingBottom: 30 }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity><Text style={styles.viewAllText}>View All</Text></TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            {ACTIVITIES_DATA.map((act) => (
              <TouchableOpacity key={act.id} style={styles.activityItem} activeOpacity={0.7}>
                <View style={[styles.activityIconCircle, { backgroundColor: act.bgColor }]}>
                  {renderActivityIcon(act.icon, act.color)}
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityTitleText} numberOfLines={1}>{act.title}</Text>
                  <Text style={styles.activityProjectText}>
                    {act.detail ? `${act.detail} • ` : ''}{act.project}
                  </Text>
                </View>
                <View style={styles.activityTimeCol}>
                  <Text style={styles.activityTimeText}>{act.time}</Text>
                  <Feather name="chevron-right" size={14} color={COLORS.textMuted} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingBottom: 20 },
  
  /* STATIC HEADER */
  headerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: COLORS.white,
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoImage: {
    width: 125,
    height: 30,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBadgeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeCircle: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

  /* GREETING */
  greetingContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  subtitleText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },

  /* SEARCH BAR */
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    height: 44,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: COLORS.textDark,
  },
  filterBtn: {
    padding: 6,
    marginLeft: 8,
  },

  /* SECTIONS */
  sectionContainer: {
    marginTop: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.blue,
  },

  /* QUICK ACTIONS */
  quickActionsScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 4,
  },
  actionCard: {
    width: 105,
    height: 105,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 2,
  },
  actionCardDesc: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  /* HORIZONTAL CARDS SCROLL */
  horizontalCardsScroll: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 8,
  },

  /* MY PROJECTS */
  projectCard: {
    width: 260,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  projectImageWrapper: {
    height: 120,
    position: 'relative',
  },
  projectImage: {
    width: '100%',
    height: '100%',
  },
  projectStatusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  projectStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressPercentageOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  progressPercentageText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '800',
  },
  projectCardBody: {
    padding: 14,
  },
  projectTitleText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  iconLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardInfoIcon: {
    marginRight: 4,
  },
  projectDetailText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  projectDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  projectMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 4,
  },
  metricText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  progressBarWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressBarTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textDark,
  },

  /* FEATURED PROFESSIONALS */
  professionalCard: {
    width: 220,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  profCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  profTitleCol: {
    flex: 1,
  },
  nameVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profName: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
    flex: 1,
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  profSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginVertical: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingValueText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textDark,
    marginLeft: 3,
    marginRight: 2,
  },
  reviewsCountText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  profStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profStatIcon: {
    marginRight: 6,
  },
  profStatText: {
    fontSize: 11,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  profBtn: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  profBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  emptyCard: {
    width: 150,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
  },

  /* BROWSE BY SERVICE */
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  serviceCard: {
    height: 80,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  serviceIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  serviceTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    lineHeight: 11,
  },

  /* RECENT ACTIVITY */
  activityList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  activityIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  activityProjectText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  activityTimeCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTimeText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
});
