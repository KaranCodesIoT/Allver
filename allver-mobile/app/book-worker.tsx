import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, TextInput, Alert, Platform, ActivityIndicator, Animated, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Fonts } from '../constants/theme';
import { 
  INDIAN_CITIES_COORDINATES as LOCATION_COORDINATES, 
  safeReverseGeocode, 
  safeGeocode, 
  getIndiaMapImageUrl 
} from '../utils/GeocodingService';

const SERVICE_BOOKING_DETAILS: Record<string, {
  title: string;
  headerTitle: string;
  subtitle: string;
  icon: string;
  lib: string;
  priceRange: string;
  buttonLabel: string;
}> = {
  Painting: {
    title: 'Painting',
    headerTitle: 'Painting Worker',
    subtitle: 'Interior & Exterior Painting',
    icon: 'paint-roller',
    lib: 'FontAwesome5',
    priceRange: '₹800 – ₹1,000 / day',
    buttonLabel: 'Book a Painter',
  },
  Masonry: {
    title: 'Masonry',
    headerTitle: 'Masonry Worker',
    subtitle: 'Brickwork, Plaster & Civil Work',
    icon: 'wall',
    lib: 'MaterialCommunityIcons',
    priceRange: '₹900 – ₹1,200 / day',
    buttonLabel: 'Book a Mason',
  },
  Electrical: {
    title: 'Electrical',
    headerTitle: 'Electrical Worker',
    subtitle: 'Wiring, Fixtures & Appliances',
    icon: 'zap',
    lib: 'Feather',
    priceRange: '₹750 – ₹1,000 / day',
    buttonLabel: 'Book an Electrician',
  },
  Plumbing: {
    title: 'Plumbing',
    headerTitle: 'Plumbing Worker',
    subtitle: 'Pipes, Fittings & Sanitary Work',
    icon: 'faucet',
    lib: 'FontAwesome5',
    priceRange: '₹700 – ₹950 / day',
    buttonLabel: 'Book a Plumber',
  },
  Carpentry: {
    title: 'Carpentry',
    headerTitle: 'Carpentry Worker',
    subtitle: 'Furniture, Doors & Woodwork',
    icon: 'hammer',
    lib: 'FontAwesome5',
    priceRange: '₹850 – ₹1,100 / day',
    buttonLabel: 'Book a Carpenter',
  },
  Tiling: {
    title: 'Tiling',
    headerTitle: 'Tiling Worker',
    subtitle: 'Floor, Wall & Marble Tiling',
    icon: 'grid',
    lib: 'MaterialCommunityIcons',
    priceRange: '₹800 – ₹1,050 / day',
    buttonLabel: 'Book a Tile Fitter',
  },
  Cleaning: {
    title: 'Cleaning',
    headerTitle: 'Cleaning Worker',
    subtitle: 'Post-Construction & Deep Cleaning',
    icon: 'broom',
    lib: 'MaterialCommunityIcons',
    priceRange: '₹600 – ₹850 / day',
    buttonLabel: 'Book a Cleaner',
  },
  Other: {
    title: 'General Work',
    headerTitle: 'General Worker',
    subtitle: 'Everyday Work & Material Shifting',
    icon: 'more-horizontal',
    lib: 'Feather',
    priceRange: '₹500 – ₹750 / day',
    buttonLabel: 'Book a Worker',
  },
};

const renderServiceIcon = (lib: string, icon: string, color: string = '#2563EB') => {
  if (lib === 'Feather') return <Feather name={icon as any} size={32} color={color} />;
  if (lib === 'MaterialCommunityIcons') return <MaterialCommunityIcons name={icon as any} size={34} color={color} />;
  return <FontAwesome5 name={icon as any} size={30} color={color} />;
};

export default function BookWorkerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const serviceName = (params.service as string) || 'Painting';
  const serviceInfo = SERVICE_BOOKING_DETAILS[serviceName] || SERVICE_BOOKING_DETAILS.Painting;

  const [location, setLocation] = useState('Sector 62, Noida');
  const [selectedDate, setSelectedDate] = useState('Tomorrow, 10 Sep 2026');

  // Modals
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  const [tempLocation, setTempLocation] = useState(location);
  const [isLocating, setIsLocating] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  // Dynamic Map Coordinates (Default: Noida Sector 62)
  const [mapCoords, setMapCoords] = useState({ lat: 28.6273, lng: 77.3725 });

  // Blinkit Style Interactive Zoom Scale
  const [zoomScale, setZoomScale] = useState(1.4);
  const zoomAnim = useRef(new Animated.Value(1.4)).current;
  const radarPulseAnim = useRef(new Animated.Value(0.6)).current;

  // Map Animations & Gesture PanResponder
  const pinOffsetY = useRef(new Animated.Value(0)).current;
  const mapPanOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(radarPulseAnim, {
          toValue: 1.25,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(radarPulseAnim, {
          toValue: 0.65,
          duration: 1600,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleZoomIn = () => {
    const next = Math.min(zoomScale + 0.35, 3.0);
    setZoomScale(next);
    Animated.spring(zoomAnim, {
      toValue: next,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const handleZoomOut = () => {
    const next = Math.max(zoomScale - 0.35, 0.8);
    setZoomScale(next);
    Animated.spring(zoomAnim, {
      toValue: next,
      friction: 6,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const bouncePin = () => {
    pinOffsetY.setValue(-20);
    Animated.spring(pinOffsetY, {
      toValue: 0,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDraggingMap(true);
        Animated.spring(pinOffsetY, {
          toValue: -24,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        mapPanOffset.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: async (evt, gestureState) => {
        setIsDraggingMap(false);
        const deltaLat = -gestureState.dy * 0.00015;
        const deltaLng = gestureState.dx * 0.00015;

        setMapCoords((prev) => {
          const nextLat = prev.lat + deltaLat;
          const nextLng = prev.lng + deltaLng;

          // Trigger safe reverse geocode for new coordinates
          safeReverseGeocode(nextLat, nextLng)
            .then((resolved) => {
              if (resolved) {
                setTempLocation(resolved);
              } else {
                setTempLocation(`Location (${nextLat.toFixed(4)}, ${nextLng.toFixed(4)})`);
              }
            })
            .catch(() => {
              setTempLocation(`Location (${nextLat.toFixed(4)}, ${nextLng.toFixed(4)})`);
            });

          return { lat: nextLat, lng: nextLng };
        });

        Animated.parallel([
          Animated.spring(mapPanOffset, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }),
          Animated.spring(pinOffsetY, {
            toValue: 0,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          })
        ]).start();
      },
    })
  ).current;

  const handleSelectPopularLoc = (locName: string) => {
    setTempLocation(locName);
    if (LOCATION_COORDINATES[locName]) {
      setMapCoords(LOCATION_COORDINATES[locName]);
      bouncePin();
    }
  };

  const handleLocationSearch = async (text: string) => {
    setTempLocation(text);
    if (!text.trim()) return;

    try {
      const coords = await safeGeocode(text);
      if (coords) {
        setMapCoords(coords);
        bouncePin();
      }
    } catch (e) {
      console.log('Geocoding search error:', e);
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setIsLocating(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access GPS location was denied. Please select manually.');
        setIsLocating(false);
        return;
      }

      let pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setMapCoords({ lat: latitude, lng: longitude });
      bouncePin();

      const resolvedAddr = await safeReverseGeocode(latitude, longitude);
      setTempLocation(resolvedAddr || `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    } catch (err) {
      console.warn('Live location fallback applied:', err);
      setTempLocation('Sector 62, Noida');
    } finally {
      setIsLocating(false);
    }
  };

  const DATE_OPTIONS = [
    'Today, 9 Sep 2026',
    'Tomorrow, 10 Sep 2026',
    'Day after, 11 Sep 2026',
    'Weekend, 13 Sep 2026',
  ];

  const handleBooking = () => {
    const generatedJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    router.push({
      pathname: '/booking-flow',
      params: {
        step: '5',
        jobId: generatedJobId,
        service: serviceInfo.title,
        location: location,
        date: selectedDate,
        price: serviceInfo.priceRange,
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{serviceInfo.headerTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* Service Hero Banner Card */}
        <View style={styles.serviceHeroCard}>
          <View style={styles.serviceIconCircle}>
            {renderServiceIcon(serviceInfo.lib, serviceInfo.icon, '#2563EB')}
          </View>
          <View style={styles.serviceHeroTextCol}>
            <Text style={styles.serviceHeroTitle}>{serviceInfo.title}</Text>
            <Text style={styles.serviceHeroSubtitle}>{serviceInfo.subtitle}</Text>
          </View>
        </View>

        {/* Location Selection Card */}
        <View style={styles.infoCard}>
          <View style={[styles.cardIconWrap, { backgroundColor: '#FFEDD5' }]}>
            <Feather name="map-pin" size={20} color="#F97316" />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardLabel}>Your Location</Text>
            <Text style={styles.cardValue}>{location}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => {
              setTempLocation(location);
              setLocationModalVisible(true);
            }} 
            style={styles.actionBtnLink}
          >
            <Text style={styles.actionBtnLinkText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Date Selection Card */}
        <TouchableOpacity 
          style={styles.infoCard} 
          activeOpacity={0.8}
          onPress={() => setDateModalVisible(true)}
        >
          <View style={[styles.cardIconWrap, { backgroundColor: '#EFF6FF' }]}>
            <Feather name="calendar" size={20} color="#2563EB" />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardLabel}>When do you need the worker?</Text>
            <Text style={styles.cardValue}>{selectedDate}</Text>
          </View>
          <Feather name="chevron-right" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Estimated Price Section */}
        <View style={styles.sectionMargin}>
          <Text style={styles.sectionHeading}>Estimated Price</Text>
          <View style={styles.priceBannerCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceText}>{serviceInfo.priceRange}</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(true)} style={styles.infoIconBtn}>
                <Feather name="info" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.priceSubtext}>Based on market rates in your area</Text>
          </View>
        </View>

        {/* Trust / Benefits List */}
        <View style={styles.trustFeaturesCard}>
          <View style={styles.trustRow}>
            <View style={styles.checkIconWrap}>
              <Feather name="check" size={14} color="#10B981" />
            </View>
            <Text style={styles.trustText}>Nearby available workers</Text>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.checkIconWrap}>
              <Feather name="check" size={14} color="#10B981" />
            </View>
            <Text style={styles.trustText}>Verified & trained</Text>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.checkIconWrap}>
              <Feather name="check" size={14} color="#10B981" />
            </View>
            <Text style={styles.trustText}>Secure payment via Allver</Text>
          </View>

          <View style={styles.trustRow}>
            <View style={styles.checkIconWrap}>
              <Feather name="check" size={14} color="#10B981" />
            </View>
            <Text style={styles.trustText}>Free replacement if needed</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Button */}
      <View style={styles.bottomBarContainer}>
        <TouchableOpacity style={styles.bookButton} activeOpacity={0.88} onPress={handleBooking}>
          <Text style={styles.bookButtonText}>{serviceInfo.buttonLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Live Google Map Based Location Picker Modal */}
      <Modal visible={locationModalVisible} transparent animationType="slide">
        <SafeAreaView style={styles.mapModalSafeArea} edges={['top', 'bottom']}>
          {/* Header Bar */}
          <View style={styles.mapModalHeader}>
            <TouchableOpacity onPress={() => setLocationModalVisible(false)} style={styles.mapModalCloseBtn}>
              <Feather name="x" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.mapModalHeaderTitle}>Select Booking Location</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Search Box */}
          <View style={styles.mapSearchContainer}>
            <View style={styles.mapSearchBox}>
              <Feather name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.mapSearchInput}
                value={tempLocation}
                onChangeText={handleLocationSearch}
                placeholder="Search area, street, city..."
                placeholderTextColor="#9CA3AF"
              />
              {tempLocation !== '' && (
                <TouchableOpacity onPress={() => setTempLocation('')}>
                  <Feather name="x" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* GPS Current Location Quick Button */}
          <TouchableOpacity 
            style={styles.useGpsBtn} 
            activeOpacity={0.8}
            onPress={handleUseCurrentLocation}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 8 }} />
            ) : (
              <Feather name="crosshair" size={18} color="#2563EB" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.useGpsBtnText}>
              {isLocating ? 'Locating your GPS...' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>

          {/* Live Dynamic Interactive Map Box Area with PanResponder */}
          <View style={styles.liveMapCanvas} {...panResponder.panHandlers}>
            <Animated.View 
              style={[
                styles.mapTileContainer,
                {
                  transform: [
                    { scale: zoomAnim },
                    { translateX: mapPanOffset.x },
                    { translateY: mapPanOffset.y }
                  ]
                }
              ]}
            >
              <Image 
                source={{ 
                  uri: getIndiaMapImageUrl(mapCoords.lat, mapCoords.lng, Math.round(15 * zoomScale))
                }} 
                style={styles.liveMapImage} 
                contentFit="cover" 
              />
              <View style={styles.liveMapGridOverlay} />
            </Animated.View>

            {/* Map Google Badge Tag & Live Coordinates */}
            <View style={styles.googleMapsBadge}>
              <FontAwesome5 name="google" size={12} color="#4285F4" style={{ marginRight: 5 }} />
              <Text style={styles.googleMapsText}>
                Google Maps ({mapCoords.lat.toFixed(4)}, {mapCoords.lng.toFixed(4)})
              </Text>
            </View>

            {/* Floating Right Zoom Controls Box (Blinkit / Swiggy Style) */}
            <View style={styles.floatingZoomBox}>
              <TouchableOpacity style={styles.zoomControlBtn} onPress={handleZoomIn} activeOpacity={0.8}>
                <Feather name="plus" size={18} color="#111827" />
              </TouchableOpacity>
              <View style={styles.zoomDivider} />
              <Text style={styles.zoomPercentageText}>{Math.round(zoomScale * 100)}%</Text>
              <View style={styles.zoomDivider} />
              <TouchableOpacity style={styles.zoomControlBtn} onPress={handleZoomOut} activeOpacity={0.8}>
                <Feather name="minus" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Floating GPS Re-Center Compass Button */}
            <TouchableOpacity 
              style={styles.floatingRecenterBtn} 
              activeOpacity={0.85} 
              onPress={() => {
                Animated.spring(mapPanOffset, {
                  toValue: { x: 0, y: 0 },
                  useNativeDriver: true,
                }).start();
                handleUseCurrentLocation();
              }}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#2563EB" />
            </TouchableOpacity>

            {/* Blinkit Precision Accuracy Pulsing Ring */}
            <View style={styles.centerMapPinWrap} pointerEvents="none">
              <Animated.View 
                style={[
                  styles.blinkitAccuracyRing,
                  {
                    transform: [{ scale: radarPulseAnim }]
                  }
                ]}
              />

              <Animated.View 
                style={[
                  styles.pinCalloutTooltip,
                  isDraggingMap && styles.pinCalloutTooltipActive
                ]}
              >
                <Text style={styles.pinCalloutText}>
                  {isDraggingMap ? 'Release to pin here' : 'Selected Location'}
                </Text>
              </Animated.View>

              <Animated.View
                style={{
                  transform: [{ translateY: pinOffsetY }]
                }}
              >
                <FontAwesome5 name="map-marker-alt" size={40} color="#EA4335" />
              </Animated.View>

              <View style={styles.pinShadowDot} />
            </View>

            <View style={styles.dragHintBadge} pointerEvents="none">
              <Feather name="move" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.dragHintText}>
                {isDraggingMap ? 'Dragging location...' : 'Drag map or tap + / - to zoom building level'}
              </Text>
            </View>
          </View>

          {/* Popular Locations Quick Select */}
          <View style={styles.popularLocSection}>
            <Text style={styles.popularLocHeading}>Popular Areas:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularLocRow}>
              {[
                'Sector 62, Noida',
                'Indirapuram, Ghaziabad',
                'Connaught Place, Delhi',
                'Cyber City, Gurugram',
                'Sector 18, Noida',
              ].map((loc) => (
                <TouchableOpacity 
                  key={loc} 
                  style={[styles.locChip, tempLocation === loc && styles.locChipSelected]}
                  onPress={() => handleSelectPopularLoc(loc)}
                >
                  <Text style={[styles.locChipText, tempLocation === loc && styles.locChipTextSelected]}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bottom Confirm Location Sheet */}
          <View style={styles.confirmLocationFooter}>
            <View style={styles.selectedAddressPreview}>
              <Feather name="map-pin" size={20} color="#F97316" style={{ marginRight: 10, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewAddressLabel}>Selected Location</Text>
                <Text style={styles.previewAddressText} numberOfLines={2}>{tempLocation || 'Sector 62, Noida'}</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.confirmLocationBtn}
              onPress={() => {
                if (tempLocation.trim()) setLocation(tempLocation.trim());
                setLocationModalVisible(false);
              }}
            >
              <Text style={styles.confirmLocationBtnText}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Select Date Modal */}
      <Modal visible={dateModalVisible} transparent animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setDateModalVisible(false)}
        >
          <View style={styles.modalSheetBox} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Select Required Date</Text>
            {DATE_OPTIONS.map((d) => (
              <TouchableOpacity 
                key={d} 
                style={[styles.dateOptionRow, selectedDate === d && styles.dateOptionSelected]}
                onPress={() => {
                  setSelectedDate(d);
                  setDateModalVisible(false);
                }}
              >
                <Text style={[styles.dateOptionText, selectedDate === d && styles.dateOptionTextSelected]}>{d}</Text>
                {selectedDate === d && <Feather name="check" size={18} color="#F97316" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Info Price Modal */}
      <Modal visible={infoModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlayCenter} 
          activeOpacity={1} 
          onPress={() => setInfoModalVisible(false)}
        >
          <View style={styles.dialogCard}>
            <Text style={styles.dialogTitle}>Price Breakdown</Text>
            <Text style={styles.dialogBody}>
              Rates are calculated based on standard daily working hours (8 hrs) for verified professionals in {location}. Payments are held securely in Allver escrow until work completion.
            </Text>
            <TouchableOpacity 
              style={styles.modalConfirmBtn} 
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.modalConfirmBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Booking Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlayCenter} 
          activeOpacity={1} 
          onPress={() => setSuccessModalVisible(false)}
        >
          <View style={styles.dialogCard}>
            <View style={styles.successIconCircle}>
              <Feather name="check" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.dialogTitle}>Booking Requested!</Text>
            <Text style={styles.dialogBody}>
              Your request for {serviceInfo.title} in {location} for {selectedDate} has been dispatched. We are assigning nearby verified workers.
            </Text>
            <TouchableOpacity 
              style={styles.modalConfirmBtn} 
              onPress={() => {
                setSuccessModalVisible(false);
                router.push('/(tabs)');
              }}
            >
              <Text style={styles.modalConfirmBtnText}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100,
  },

  /* HERO CARD */
  serviceHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginVertical: 12,
  },
  serviceIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  serviceHeroTextCol: {
    flex: 1,
  },
  serviceHeroTitle: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  serviceHeroSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#6B7280',
  },

  /* INFO CARDS */
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextCol: {
    flex: 1,
  },
  cardLabel: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  cardValue: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: '#6B7280',
  },
  actionBtnLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionBtnLinkText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },

  /* PRICE SECTION */
  sectionMargin: {
    marginTop: 22,
  },
  sectionHeading: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  priceBannerCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 16,
    padding: 18,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceText: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  infoIconBtn: {
    padding: 4,
  },
  priceSubtext: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    color: '#6B7280',
  },

  /* TRUST FEATURES CARD */
  trustFeaturesCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    gap: 12,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  trustText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
  },

  /* BOTTOM BAR */
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  bookButton: {
    backgroundColor: '#F97316',
    borderRadius: 16,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheetBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#111827',
    marginBottom: 16,
  },
  modalConfirmBtn: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  dateOptionSelected: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  dateOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  dateOptionTextSelected: {
    color: '#F97316',
    fontWeight: '700',
  },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  dialogTitle: {
    fontFamily: Fonts.sans,
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  dialogBody: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  /* LIVE MAP LOCATION PICKER MODAL */
  mapModalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mapModalCloseBtn: {
    padding: 4,
  },
  mapModalHeaderTitle: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  mapSearchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  mapSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 14,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    height: '100%',
  },
  useGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 8,
  },
  useGpsBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
  },
  liveMapCanvas: {
    flex: 1,
    position: 'relative',
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapTileContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  liveMapImage: {
    width: '100%',
    height: '100%',
  },
  liveMapGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  googleMapsBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleMapsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  floatingZoomBox: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
    alignItems: 'center',
    paddingVertical: 4,
    width: 36,
    zIndex: 15,
  },
  zoomControlBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    width: 24,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  zoomPercentageText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#374151',
    marginVertical: 4,
  },
  floatingRecenterBtn: {
    position: 'absolute',
    bottom: 50,
    right: 12,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 15,
  },
  blinkitAccuracyRing: {
    position: 'absolute',
    top: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(37, 99, 235, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(37, 99, 235, 0.45)',
  },
  centerMapPinWrap: {
    position: 'absolute',
    top: '38%',
    left: '45%',
    alignItems: 'center',
    zIndex: 10,
  },
  pinCalloutTooltip: {
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pinCalloutTooltipActive: {
    backgroundColor: '#F97316',
  },
  pinCalloutText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pinShadowDot: {
    width: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginTop: 2,
  },
  dragHintBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    zIndex: 10,
  },
  dragHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  popularLocSection: {
    paddingVertical: 10,
  },
  popularLocHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  popularLocRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  locChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locChipSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  locChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  locChipTextSelected: {
    color: '#EA580C',
    fontWeight: '700',
  },
  confirmLocationFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  selectedAddressPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  previewAddressLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  previewAddressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 1,
  },
  confirmLocationBtn: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmLocationBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
