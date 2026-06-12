import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#10B981', // Accent green for appreciations
  teal: '#0F766E', // Green/Teal from categories
  textDark: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  bgLight: '#F8FAFC',
  blue: '#3B82F6',
  badgeGold: '#F59E0B',
};

const CATEGORIES = [
  { name: 'All', icon: 'border-all', iconType: 'Feather' },
  { name: 'Architecture', icon: 'building', iconType: 'FA5' },
  { name: 'Interior', icon: 'couch', iconType: 'FA5' },
  { name: 'Construction', icon: 'tools', iconType: 'FA5' },
  { name: 'Renovation', icon: 'paint-roller', iconType: 'FA5' },
];

interface ProjectCardData {
  id: string;
  title: string;
  location: string;
  size: string;
  cost?: string;
  type: string;
  duration?: string;
  imageCount?: number;
  image: string;
  creator: {
    name: string;
    role: string;
    avatar: string;
  };
  appreciations: number;
  comments: number;
  hasAppreciated?: boolean;
  hasBookmarked?: boolean;
}

const FEATURED_PROJECTS_DATA: ProjectCardData[] = [
  {
    id: 'f1',
    title: 'Modern Minimal Villa',
    location: 'Mumbai',
    size: '2,500 sq.ft',
    cost: '₹45 - 50 L',
    type: 'Residential',
    duration: '0:45',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    creator: {
      name: 'Neha Sharma',
      role: 'Architect',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80'
    },
    appreciations: 128,
    comments: 12
  },
  {
    id: 'f2',
    title: 'Commercial Office Building',
    location: 'Bengaluru',
    size: '12,000 sq.ft',
    cost: '₹2.2 - 2.8 Cr',
    type: 'Commercial',
    duration: '1:10',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80',
    creator: {
      name: 'Ar. Rohit Patel',
      role: 'Architect',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
    },
    appreciations: 96,
    comments: 8
  }
];

const RECENT_PROJECTS_DATA: ProjectCardData[] = [
  {
    id: 'r1',
    title: 'Scandinavian Interior',
    location: 'Pune',
    size: '1,800 sq.ft',
    cost: '₹18 - 22 L',
    type: 'Interior',
    imageCount: 8,
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80',
    creator: {
      name: 'DesignEdge',
      role: 'Interior Studio',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
    },
    appreciations: 73,
    comments: 6
  },
  {
    id: 'r2',
    title: 'Luxury Kitchen Design',
    location: 'Delhi',
    size: '350 sq.ft',
    cost: '₹8 - 12 L',
    type: 'Interior',
    imageCount: 6,
    image: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=600&q=80',
    creator: {
      name: 'Studio Fort',
      role: 'Interior Designer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
    },
    appreciations: 54,
    comments: 3
  },
  {
    id: 'r3',
    title: 'On-Going Site Progress',
    location: 'Hyderabad',
    size: '3,200 sq.ft',
    type: 'Residential',
    duration: '0:30',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
    creator: {
      name: 'BuildRight Projects',
      role: 'Contractor',
      avatar: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&w=150&q=80'
    },
    appreciations: 61,
    comments: 4
  }
];

export default function DiscoverScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('All');
  const [featuredProjects, setFeaturedProjects] = useState<ProjectCardData[]>(FEATURED_PROJECTS_DATA);
  const [recentProjects, setRecentProjects] = useState<ProjectCardData[]>(RECENT_PROJECTS_DATA);

  const toggleAppreciation = (id: string, isFeatured: boolean) => {
    const updater = (list: ProjectCardData[]) => 
      list.map(proj => {
        if (proj.id === id) {
          const state = !proj.hasAppreciated;
          return {
            ...proj,
            hasAppreciated: state,
            appreciations: state ? proj.appreciations + 1 : proj.appreciations - 1
          };
        }
        return proj;
      });

    if (isFeatured) {
      setFeaturedProjects(updater);
    } else {
      setRecentProjects(updater);
    }
  };

  const toggleBookmark = (id: string, isFeatured: boolean) => {
    const updater = (list: ProjectCardData[]) => 
      list.map(proj => {
        if (proj.id === id) {
          return { ...proj, hasBookmarked: !proj.hasBookmarked };
        }
        return proj;
      });

    if (isFeatured) {
      setFeaturedProjects(updater);
    } else {
      setRecentProjects(updater);
    }
  };

  const renderProjectCard = (item: ProjectCardData, isFeatured: boolean) => {
    const cardWidth = isFeatured ? width * 0.84 : width * 0.76;
    
    return (
      <View key={item.id} style={[styles.projectCard, { width: cardWidth }]}>
        
        {/* Image Section */}
        <View style={styles.cardImageContainer}>
          <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
          
          {/* Top-Right Tag: Video or Image Count */}
          {item.duration && (
            <View style={styles.topRightOverlay}>
              <Feather name="play" size={10} color={COLORS.white} style={{ marginRight: 3 }} />
              <Text style={styles.overlayText}>{item.duration}</Text>
            </View>
          )}

          {item.imageCount && (
            <View style={styles.topRightOverlay}>
              <Feather name="image" size={10} color={COLORS.white} style={{ marginRight: 3 }} />
              <Text style={styles.overlayText}>{item.imageCount}</Text>
            </View>
          )}

          {/* Bottom-Left Tag: Location */}
          <View style={styles.locationOverlay}>
            <Feather name="map-pin" size={10} color={COLORS.textDark} style={{ marginRight: 3 }} />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.cardContent}>
          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          
          {/* Specs / Metadata */}
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Feather name="maximize-2" size={11} color={COLORS.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.specText}>{item.size}</Text>
            </View>

            {item.cost && (
              <View style={styles.specItem}>
                <MaterialCommunityIcons name="currency-inr" size={12} color={COLORS.textMuted} style={{ marginRight: 2 }} />
                <Text style={styles.specText}>{item.cost}</Text>
              </View>
            )}

            <View style={styles.specItem}>
              <Feather name="home" size={11} color={COLORS.textMuted} style={{ marginRight: 4 }} />
              <Text style={styles.specText}>{item.type}</Text>
            </View>
          </View>

          {/* Creator Profile Row */}
          <View style={styles.creatorRow}>
            <View style={styles.creatorProfile}>
              <Image source={{ uri: item.creator.avatar }} style={styles.creatorAvatar} />
              <Text style={styles.creatorName} numberOfLines={1}>
                {item.creator.role}: {item.creator.name}
              </Text>
            </View>
            <TouchableOpacity style={styles.optionsBtn}>
              <Feather name="more-vertical" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Actions & Interactions Row */}
          <View style={styles.actionsRow}>
            <View style={styles.leftActions}>
              <TouchableOpacity 
                style={styles.actionItem} 
                onPress={() => toggleAppreciation(item.id, isFeatured)}
                activeOpacity={0.7}
              >
                <Feather 
                  name="heart" 
                  size={15} 
                  color={item.hasAppreciated ? COLORS.green : COLORS.textMuted}
                  style={item.hasAppreciated && { fill: COLORS.green }}
                />
                <Text style={[styles.appreciationsCount, item.hasAppreciated && { color: COLORS.green }]}>
                  {item.appreciations} Appreciations
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionItem} activeOpacity={0.7}>
                <Feather name="message-square" size={15} color={COLORS.textMuted} />
                <Text style={styles.commentsCount}>{item.comments}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              onPress={() => toggleBookmark(item.id, isFeatured)}
              activeOpacity={0.7}
            >
              <Feather 
                name="bookmark" 
                size={16} 
                color={item.hasBookmarked ? COLORS.teal : COLORS.textMuted}
                style={item.hasBookmarked && { fill: COLORS.teal }}
              />
            </TouchableOpacity>
          </View>
        </View>

      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>Explore inspiring projects and ideas</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="bell" size={20} color={COLORS.textDark} />
            <View style={styles.badge}><Text style={styles.badgeText}>3</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/chats')}>
            <Feather name="message-square" size={20} color={COLORS.textDark} />
            <View style={styles.badge}><Text style={styles.badgeText}>5</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop' }} 
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= SCROLL CONTENT ================= */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Categories Horizontal Row */}
        <View style={styles.categoriesSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.name;
              return (
                <TouchableOpacity
                  key={cat.name}
                  style={[styles.categoryCard, isActive && styles.categoryCardActive]}
                  onPress={() => setActiveCategory(cat.name)}
                  activeOpacity={0.8}
                >
                  {cat.icon !== '' && (
                    cat.iconType === 'Feather' ? (
                      <Feather name={cat.icon as any} size={13} color={isActive ? COLORS.white : COLORS.textDark} style={{ marginRight: 6 }} />
                    ) : (
                      <FontAwesome5 name={cat.icon} size={13} color={isActive ? COLORS.white : COLORS.textDark} style={{ marginRight: 6 }} />
                    )
                  )}
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.filterBtn}>
            <Feather name="sliders" size={16} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>

        {/* Featured Projects Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Projects</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.horizontalScrollContent}
            decelerationRate="fast"
            snapToInterval={width * 0.84 + 16}
          >
            {featuredProjects
              .filter(p => activeCategory === 'All' || p.creator.role === activeCategory || (activeCategory === 'Renovation' && p.type === 'Renovation'))
              .map(p => renderProjectCard(p, true))}

            {featuredProjects.filter(p => activeCategory === 'All' || p.creator.role === activeCategory || (activeCategory === 'Renovation' && p.type === 'Renovation')).length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No featured projects in this category</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* Recent Projects Section */}
        <View style={[styles.sectionContainer, { marginBottom: 30 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Projects</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.horizontalScrollContent}
            decelerationRate="fast"
            snapToInterval={width * 0.76 + 16}
          >
            {recentProjects
              .filter(p => activeCategory === 'All' || p.creator.role === activeCategory || p.creator.role.includes(activeCategory) || (activeCategory === 'Renovation' && p.type === 'Renovation'))
              .map(p => renderProjectCard(p, false))}

            {recentProjects.filter(p => activeCategory === 'All' || p.creator.role === activeCategory || p.creator.role.includes(activeCategory) || (activeCategory === 'Renovation' && p.type === 'Renovation')).length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No recent projects in this category</Text>
              </View>
            )}
          </ScrollView>
        </View>

      </ScrollView>

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
  },
  
  /* HEADER */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitles: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
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
  profileBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },

  /* CATEGORIES */
  categoriesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  categoriesScroll: {
    gap: 8,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  categoryCardActive: {
    backgroundColor: COLORS.teal,
    borderColor: COLORS.teal,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },

  /* SECTION STRUCTURE */
  sectionContainer: {
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  viewAllText: {
    fontSize: 12,
    color: COLORS.teal,
    fontWeight: '700',
  },
  horizontalScrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },

  /* PROJECT CARDS */
  projectCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageContainer: {
    height: 190,
    width: '100%',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  topRightOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  overlayText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  locationOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  locationText: {
    color: COLORS.textDark,
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  creatorProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  creatorName: {
    fontSize: 12,
    color: COLORS.textDark,
    fontWeight: '600',
    flex: 1,
  },
  optionsBtn: {
    padding: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appreciationsCount: {
    fontSize: 11,
    color: COLORS.green,
    fontWeight: '700',
  },
  commentsCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },

  /* EMPTY */
  emptyContainer: {
    width: width - 32,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
