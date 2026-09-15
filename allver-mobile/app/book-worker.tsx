import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { Fonts } from '../constants/theme';
import {
  INDIAN_CITIES_COORDINATES as LOCATION_COORDINATES,
  getGooglePlacePredictions,
  getGooglePlaceDetails,
  detailedReverseGeocode,
  getIndiaMapImageUrl,
  findCoordinatesForLocationText,
  PlacePrediction,
  GeocodedLocationDetails,
} from '../utils/GeocodingService';
import { GOOGLE_MAPS_API_KEY } from '../constants/Config';
import { isGuestUser } from '../constants/Auth';
import LoginRequiredModal from '../components/LoginRequiredModal';

const SERVICE_BOOKING_DETAILS: Record<
  string,
  {
    title: string;
    headerTitle: string;
    subtitle: string;
    icon: string;
    lib: string;
    priceRange: string;
    buttonLabel: string;
  }
> = {
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
  const { width: windowWidth } = useWindowDimensions();

  const serviceName = (params.service as string) || 'Painting';
  const serviceInfo = SERVICE_BOOKING_DETAILS[serviceName] || SERVICE_BOOKING_DETAILS.Painting;

  // Selected Location State
  const [location, setLocation] = useState('Sector 62, Noida');
  const [locationDetails, setLocationDetails] = useState<GeocodedLocationDetails>({
    lat: 28.6273,
    lng: 77.3725,
    formattedAddress: 'Sector 62, Noida, Uttar Pradesh, India',
    shortAddress: 'Sector 62, Noida',
    placeId: 'ChIJz2x0_TnlDDkR9HkQ_o26kGE',
  });

  const [selectedDate, setSelectedDate] = useState('Tomorrow, 10 Sep 2026');

  // Dynamic Location-Aware Pricing State
  const [pricingEstimate, setPricingEstimate] = useState<{
    priceRange: string;
    locationNote: string;
    zone: string;
    zoneName: string;
    loading: boolean;
  }>({
    priceRange: serviceInfo.priceRange,
    locationNote: 'Based on standard market daily rates',
    zone: 'DEFAULT',
    zoneName: 'Standard Market Area',
    loading: false,
  });

  // Fetch Authoritative Dynamic Price Estimate whenever service or location changes
  useEffect(() => {
    let isMounted = true;
    const fetchEstimate = async () => {
      try {
        setPricingEstimate((prev) => ({ ...prev, loading: true }));
        const { BACKEND_URL } = require('../constants/Config');
        const lat = locationDetails?.lat || 0;
        const lng = locationDetails?.lng || 0;
        const queryParams = new URLSearchParams({
          service: serviceName,
          latitude: String(lat),
          longitude: String(lng),
          location: location || '',
          formattedAddress: locationDetails?.formattedAddress || location || '',
          unit: 'day',
        });

        const res = await fetch(`${BACKEND_URL}/api/pricing/estimate?${queryParams.toString()}`);
        const data = await res.json();

        if (isMounted && data.success && data.estimate) {
          setPricingEstimate({
            priceRange: data.estimate.formattedPriceRange,
            locationNote: data.estimate.locationNote,
            zone: data.estimate.zone,
            zoneName: data.estimate.zoneName,
            loading: false,
          });
        } else if (isMounted) {
          setPricingEstimate((prev) => ({ ...prev, loading: false }));
        }
      } catch (err) {
        if (isMounted) {
          setPricingEstimate((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    fetchEstimate();
    return () => {
      isMounted = false;
    };
  }, [serviceName, locationDetails?.lat, locationDetails?.lng, locationDetails?.formattedAddress, location]);

  // Modals
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [guestModalVisible, setGuestModalVisible] = useState(false);

  // Map and Search Temp State
  const [tempLocation, setTempLocation] = useState(location);
  const [tempLocationData, setTempLocationData] = useState<GeocodedLocationDetails>(locationDetails);
  const [mapCoords, setMapCoords] = useState({ lat: 28.6273, lng: 77.3725 });

  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  // Google Places Suggestions
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const searchDebounceRef = useRef<any>(null);

  // Zoom Level (12 to 19)
  const [zoomLevel, setZoomLevel] = useState(16);
  const radarPulseAnim = useRef(new Animated.Value(0.6)).current;
  const pinOffsetY = useRef(new Animated.Value(0)).current;
  const mapPanOffset = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Web Google Map container & instance references
  const webMapContainerRef = useRef<HTMLDivElement | null>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const isWebProgrammaticMove = useRef(false);

  // Restore saved location when editing a booking or opening with existing params
  useEffect(() => {
    if (params.latitude && params.longitude) {
      const lat = parseFloat(params.latitude as string);
      const lng = parseFloat(params.longitude as string);
      const addr = (params.formattedAddress as string) || (params.location as string) || 'Selected Location';
      const pid = (params.placeId as string) || '';
      const restored: GeocodedLocationDetails = {
        lat,
        lng,
        formattedAddress: addr,
        shortAddress: (params.location as string) || addr,
        placeId: pid,
      };
      setLocation((params.location as string) || addr);
      setLocationDetails(restored);
      setTempLocation((params.location as string) || addr);
      setTempLocationData(restored);
      setMapCoords({ lat, lng });
    } else if (params.location) {
      const locStr = params.location as string;
      setLocation(locStr);
      setTempLocation(locStr);
      const matched = findCoordinatesForLocationText(locStr);
      if (matched) {
        const details: GeocodedLocationDetails = {
          lat: matched.lat,
          lng: matched.lng,
          formattedAddress: locStr,
          shortAddress: locStr,
          placeId: `loc_${Date.now()}`,
        };
        setLocationDetails(details);
        setTempLocationData(details);
        setMapCoords({ lat: matched.lat, lng: matched.lng });
      }
    } else {
      // Auto-locate client's live GPS location on entry
      handleUseCurrentLocation(true);
    }
  }, [params.latitude, params.longitude, params.location, params.formattedAddress, params.placeId]);

  // Pulse animation for center accuracy ring
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
  }, [radarPulseAnim]);

  const bouncePin = useCallback(() => {
    pinOffsetY.setValue(-20);
    Animated.spring(pinOffsetY, {
      toValue: 0,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [pinOffsetY]);

  // Initialize Web Google Map instance when modal opens on web
  useEffect(() => {
    if (Platform.OS !== 'web' || !locationModalVisible) return;

    const initWebGoogleMap = () => {
      const win = typeof window !== 'undefined' ? (window as any) : null;
      if (!win || !win.google || !win.google.maps || !webMapContainerRef.current) return;

      const map = new win.google.maps.Map(webMapContainerRef.current, {
        center: { lat: mapCoords.lat, lng: mapCoords.lng },
        zoom: zoomLevel,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }],
          },
        ],
      });

      googleMapInstanceRef.current = map;

      map.addListener('dragstart', () => {
        setIsDraggingMap(true);
        Animated.spring(pinOffsetY, { toValue: -24, useNativeDriver: true }).start();
      });

      map.addListener('idle', async () => {
        setIsDraggingMap(false);
        Animated.spring(pinOffsetY, { toValue: 0, friction: 4, tension: 40, useNativeDriver: true }).start();

        if (isWebProgrammaticMove.current) {
          isWebProgrammaticMove.current = false;
          return;
        }

        const center = map.getCenter();
        if (!center) return;

        const nextLat = center.lat();
        const nextLng = center.lng();
        setMapCoords({ lat: nextLat, lng: nextLng });

        setIsReverseGeocoding(true);
        try {
          const details = await detailedReverseGeocode(nextLat, nextLng);
          setTempLocation(details.shortAddress || details.formattedAddress);
          setTempLocationData(details);
        } catch (err) {
          console.warn('Web reverse geocode error:', err);
        } finally {
          setIsReverseGeocoding(false);
        }
      });
    };

    const timer = setTimeout(initWebGoogleMap, 250);
    return () => clearTimeout(timer);
  }, [locationModalVisible]);

  const handleZoomIn = () => {
    const next = Math.min(zoomLevel + 1, 19);
    setZoomLevel(next);
    if (Platform.OS === 'web' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(next);
    }
  };

  const handleZoomOut = () => {
    const next = Math.max(zoomLevel - 1, 12);
    setZoomLevel(next);
    if (Platform.OS === 'web' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(next);
    }
  };

  // Live Google Places Search Autocomplete
  const handleLocationSearchTextChange = (text: string) => {
    setTempLocation(text);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!text.trim() || text.trim().length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowPredictions(true);

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await getGooglePlacePredictions(text);
        setPredictions(results);
      } catch (err) {
        console.error('Error fetching Google Place predictions:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  // Select a Google Place Suggestion
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setShowPredictions(false);
    setPredictions([]);
    setIsSearching(true);

    try {
      const details = await getGooglePlaceDetails(prediction.placeId);
      if (details) {
        setMapCoords({ lat: details.lat, lng: details.lng });
        setTempLocation(details.shortAddress || details.formattedAddress);
        setTempLocationData(details);
        bouncePin();

        if (Platform.OS === 'web' && googleMapInstanceRef.current) {
          isWebProgrammaticMove.current = true;
          googleMapInstanceRef.current.panTo({ lat: details.lat, lng: details.lng });
          googleMapInstanceRef.current.setZoom(17);
          setZoomLevel(17);
        }
      } else {
        setTempLocation(prediction.mainText);
      }
    } catch (err) {
      console.error('Error selecting prediction:', err);
      setTempLocation(prediction.mainText);
    } finally {
      setIsSearching(false);
    }
  };

  // Interactive PanResponder for draggable Google Map on Native
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        setIsDraggingMap(true);
        setShowPredictions(false);
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

        // Convert pixel displacement to coordinate deltas based on zoomLevel
        const zoomFactor = Math.pow(2, zoomLevel - 15);
        const deltaLat = -gestureState.dy * (0.00035 / zoomFactor);
        const deltaLng = gestureState.dx * (0.00035 / zoomFactor);

        const nextLat = mapCoords.lat + deltaLat;
        const nextLng = mapCoords.lng + deltaLng;
        setMapCoords({ lat: nextLat, lng: nextLng });

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
          }),
        ]).start();

        // Perform Google Reverse Geocoding when map dragging ends
        setIsReverseGeocoding(true);
        try {
          const details = await detailedReverseGeocode(nextLat, nextLng);
          setTempLocation(details.shortAddress || details.formattedAddress);
          setTempLocationData(details);
        } catch (err) {
          console.warn('Reverse geocode error on map drag:', err);
        } finally {
          setIsReverseGeocoding(false);
        }
      },
    })
  ).current;

  // Select Popular Indian Landmarks
  const handleSelectPopularLoc = async (locName: string) => {
    setShowPredictions(false);
    setTempLocation(locName);

    const match = LOCATION_COORDINATES[locName];
    if (match) {
      setMapCoords({ lat: match.lat, lng: match.lng });
      bouncePin();

      if (Platform.OS === 'web' && googleMapInstanceRef.current) {
        isWebProgrammaticMove.current = true;
        googleMapInstanceRef.current.panTo({ lat: match.lat, lng: match.lng });
      }

      setIsReverseGeocoding(true);
      try {
        const details = await detailedReverseGeocode(match.lat, match.lng);
        setTempLocation(details.shortAddress || locName);
        setTempLocationData(details);
      } catch (err) {
        setTempLocationData({
          lat: match.lat,
          lng: match.lng,
          formattedAddress: `${locName}, India`,
          shortAddress: locName,
          placeId: match.placeId || `loc_${Date.now()}`,
          state: match.state,
        });
      } finally {
        setIsReverseGeocoding(false);
      }
    }
  };

  // GPS Use Current Location (Browser Geolocation on Web / Expo Location on Native)
  const handleUseCurrentLocation = async (silent: boolean = false) => {
    setShowPredictions(false);
    setIsLocating(true);

    // 1. Web Browser Geolocation
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setMapCoords({ lat: latitude, lng: longitude });
          bouncePin();

          if (googleMapInstanceRef.current) {
            isWebProgrammaticMove.current = true;
            googleMapInstanceRef.current.panTo({ lat: latitude, lng: longitude });
            googleMapInstanceRef.current.setZoom(17);
            setZoomLevel(17);
          }

          setIsReverseGeocoding(true);
          try {
            const details = await detailedReverseGeocode(latitude, longitude);
            setTempLocation(details.shortAddress || details.formattedAddress);
            setTempLocationData(details);
            setLocation(details.shortAddress || details.formattedAddress);
            setLocationDetails(details);
          } catch (e) {
            console.warn('Reverse geocode error:', e);
          } finally {
            setIsLocating(false);
            setIsReverseGeocoding(false);
          }
        },
        (err) => {
          console.warn('Browser geolocation error:', err);
          if (!silent) {
            Alert.alert(
              'Location Access Denied',
              'Location permission was denied by your browser. Please enable location permissions or search manually.'
            );
          }
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
      return;
    }

    // 2. Native Expo Location
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) {
          Alert.alert(
            'Location Permission Denied',
            'Location permission was denied. You can still search for your location using the search box.'
          );
        }
        setIsLocating(false);
        return;
      }

      let pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setMapCoords({ lat: latitude, lng: longitude });
      bouncePin();

      setIsReverseGeocoding(true);
      const details = await detailedReverseGeocode(latitude, longitude);
      setTempLocation(details.shortAddress || details.formattedAddress);
      setTempLocationData(details);
      setLocation(details.shortAddress || details.formattedAddress);
      setLocationDetails(details);
    } catch (err) {
      console.warn('Live location error:', err);
      if (!silent) {
        Alert.alert('Location Error', 'Unable to fetch current GPS location. Please select manually.');
      }
    } finally {
      setIsLocating(false);
      setIsReverseGeocoding(false);
    }
  };

  const handleConfirmLocation = () => {
    if (tempLocation.trim()) {
      setLocation(tempLocation.trim());
      setLocationDetails(tempLocationData);
    }
    setLocationModalVisible(false);
  };

  const DATE_OPTIONS = [
    'Today, 9 Sep 2026',
    'Tomorrow, 10 Sep 2026',
    'Day after, 11 Sep 2026',
    'Weekend, 13 Sep 2026',
  ];

  // Booking action: passes all location coordinates and place ID to booking-flow
  const handleBooking = () => {
    if (isGuestUser()) {
      setGuestModalVisible(true);
      return;
    }
    const generatedJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    router.push({
      pathname: '/booking-flow',
      params: {
        step: '5',
        jobId: generatedJobId,
        service: serviceInfo.title,
        location: location,
        latitude: String(locationDetails.lat),
        longitude: String(locationDetails.lng),
        formattedAddress: locationDetails.formattedAddress || location,
        placeId: locationDetails.placeId || '',
        date: selectedDate,
        price: pricingEstimate.priceRange || serviceInfo.priceRange,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/labours');
            }
          }}
          style={styles.backBtn}
        >
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
              setShowPredictions(false);
              setLocationModalVisible(true);
              // Make client's live location the default on change location
              handleUseCurrentLocation(true);
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
              <Text style={styles.priceText}>
                {pricingEstimate.loading ? 'Updating rates...' : (pricingEstimate.priceRange || serviceInfo.priceRange)}
              </Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(true)} style={styles.infoIconBtn}>
                <Feather name="info" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.priceSubtext}>{pricingEstimate.locationNote}</Text>
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
            <Text style={styles.trustText}>Verified & trained tradesmen</Text>
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
            <Text style={styles.trustText}>Free replacement guarantee if needed</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Button */}
      <View style={styles.bottomBarContainer}>
        <TouchableOpacity style={styles.bookButton} activeOpacity={0.88} onPress={handleBooking}>
          <Text style={styles.bookButtonText}>{serviceInfo.buttonLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Real Google Maps Location Picker Modal */}
      <Modal visible={locationModalVisible} transparent animationType="slide">
        <SafeAreaView style={styles.mapModalSafeArea} edges={['top', 'bottom']}>
          {/* Header Bar */}
          <View style={styles.mapModalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowPredictions(false);
                setLocationModalVisible(false);
              }}
              style={styles.mapModalCloseBtn}
            >
              <Feather name="x" size={22} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.mapModalHeaderTitle}>Select Booking Location</Text>
            <View style={{ width: 32 }} />
          </View>

          {/* Search Box with Real Google Suggestions */}
          <View style={styles.mapSearchWrapper}>
            <View style={styles.mapSearchBox}>
              <Feather name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.mapSearchInput}
                value={tempLocation}
                onChangeText={handleLocationSearchTextChange}
                placeholder="Search street, society, landmark, city..."
                placeholderTextColor="#9CA3AF"
                onFocus={() => {
                  if (predictions.length > 0) setShowPredictions(true);
                }}
              />
              {isSearching ? (
                <ActivityIndicator size="small" color="#F97316" style={{ marginRight: 4 }} />
              ) : tempLocation !== '' ? (
                <TouchableOpacity
                  onPress={() => {
                    setTempLocation('');
                    setPredictions([]);
                    setShowPredictions(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Google Places Live Suggestions Dropdown */}
            {showPredictions && predictions.length > 0 && (
              <View style={styles.predictionsDropdown}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                  style={{ maxHeight: 220 }}
                >
                  {predictions.map((p) => (
                    <TouchableOpacity
                      key={p.placeId}
                      style={styles.predictionItem}
                      onPress={() => handleSelectPrediction(p)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.predictionIconWrap}>
                        <Feather name="map-pin" size={14} color="#F97316" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.predictionMainText} numberOfLines={1}>
                          {p.mainText}
                        </Text>
                        <Text style={styles.predictionSecondaryText} numberOfLines={1}>
                          {p.secondaryText}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  <View style={styles.googleAttributionRow}>
                    <Text style={styles.googleAttributionText}>powered by Google</Text>
                  </View>
                </ScrollView>
              </View>
            )}
          </View>

          {/* GPS Current Location Button */}
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

          {/* Real Google Map Interactive Canvas */}
          <View style={styles.liveMapCanvas} {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}>
            {Platform.OS === 'web' ? (
              <div
                ref={webMapContainerRef as any}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
            ) : (
              <Animated.View
                style={[
                  styles.mapTileContainer,
                  {
                    transform: [
                      { translateX: mapPanOffset.x },
                      { translateY: mapPanOffset.y },
                    ],
                  },
                ]}
              >
                <Image
                  source={{
                    uri: getIndiaMapImageUrl(mapCoords.lat, mapCoords.lng, zoomLevel),
                  }}
                  style={styles.liveMapImage}
                  contentFit="cover"
                />
              </Animated.View>
            )}

            {/* Google Maps Live Badge & Coords */}
            <View style={styles.googleMapsBadge}>
              <FontAwesome5 name="google" size={12} color="#4285F4" style={{ marginRight: 5 }} />
              <Text style={styles.googleMapsText}>
                Google Maps ({mapCoords.lat.toFixed(4)}, {mapCoords.lng.toFixed(4)})
              </Text>
            </View>

            {/* Zoom Controls (+ / -) */}
            <View style={styles.floatingZoomBox}>
              <TouchableOpacity
                style={styles.zoomControlBtn}
                onPress={handleZoomIn}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={18} color="#111827" />
              </TouchableOpacity>
              <View style={styles.zoomDivider} />
              <Text style={styles.zoomPercentageText}>z{zoomLevel}</Text>
              <View style={styles.zoomDivider} />
              <TouchableOpacity
                style={styles.zoomControlBtn}
                onPress={handleZoomOut}
                activeOpacity={0.8}
              >
                <Feather name="minus" size={18} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Floating GPS Recenter Button */}
            <TouchableOpacity
              style={styles.floatingRecenterBtn}
              activeOpacity={0.85}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Animated.spring(mapPanOffset, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: true,
                  }).start();
                }
                handleUseCurrentLocation();
              }}
            >
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#2563EB" />
            </TouchableOpacity>

            {/* Fixed Centered Pin with Pulsing Accuracy Ring */}
            <View style={styles.centerMapPinWrap} pointerEvents="none">
              <Animated.View
                style={[
                  styles.blinkitAccuracyRing,
                  {
                    transform: [{ scale: radarPulseAnim }],
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.pinCalloutTooltip,
                  isDraggingMap && styles.pinCalloutTooltipActive,
                ]}
              >
                <Text style={styles.pinCalloutText}>
                  {isDraggingMap ? 'Release to pin location' : 'Pin Service Location'}
                </Text>
              </Animated.View>

              <Animated.View
                style={{
                  transform: [{ translateY: pinOffsetY }],
                }}
              >
                <FontAwesome5 name="map-marker-alt" size={40} color="#EA4335" />
              </Animated.View>

              <View style={styles.pinShadowDot} />
            </View>

            {/* Drag Hint Badge */}
            <View style={styles.dragHintBadge} pointerEvents="none">
              <Feather name="move" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.dragHintText}>
                {isDraggingMap ? 'Dragging location...' : 'Drag map to change pinned address'}
              </Text>
            </View>
          </View>

          {/* Popular Locations Quick Select */}
          <View style={styles.popularLocSection}>
            <Text style={styles.popularLocHeading}>Popular Areas:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularLocRow}
            >
              {[
                'Sector 62, Noida',
                'Indirapuram, Ghaziabad',
                'Connaught Place, Delhi',
                'Cyber City, Gurugram',
                'Sector 18, Noida',
                'Bandra Kurla Complex, Mumbai',
                'Koramangala, Bengaluru',
              ].map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.locChip, tempLocation.includes(loc.split(',')[0]) && styles.locChipSelected]}
                  onPress={() => handleSelectPopularLoc(loc)}
                >
                  <Text
                    style={[
                      styles.locChipText,
                      tempLocation.includes(loc.split(',')[0]) && styles.locChipTextSelected,
                    ]}
                  >
                    {loc}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Bottom Confirm Location Sheet */}
          <View style={styles.confirmLocationFooter}>
            <View style={styles.selectedAddressPreview}>
              <View style={[styles.cardIconWrap, { backgroundColor: '#FFEDD5', marginRight: 10 }]}>
                {isReverseGeocoding ? (
                  <ActivityIndicator size="small" color="#F97316" />
                ) : (
                  <Feather name="map-pin" size={18} color="#F97316" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewAddressLabel}>
                  {isReverseGeocoding ? 'Resolving address from Google Maps...' : 'Selected Address'}
                </Text>
                <Text style={styles.previewAddressText} numberOfLines={2}>
                  {tempLocation || 'Sector 62, Noida'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.confirmLocationBtn}
              onPress={handleConfirmLocation}
              activeOpacity={0.88}
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
                <Text style={[styles.dateOptionText, selectedDate === d && styles.dateOptionTextSelected]}>
                  {d}
                </Text>
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
              Rates are calculated based on standard daily working hours (8 hrs) for verified professionals in{' '}
              {pricingEstimate.zoneName || location}. Payments are held securely in Allver escrow until work completion.
            </Text>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => setInfoModalVisible(false)}>
              <Text style={styles.modalConfirmBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <LoginRequiredModal
        visible={guestModalVisible}
        onClose={() => setGuestModalVisible(false)}
        title="Login required"
        message="Create an account or login to book verified workers."
        actionSource="Booking a Worker"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 100,
  },
  serviceHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  serviceHeroTextCol: {
    flex: 1,
  },
  serviceHeroTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  serviceHeroSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#64748B',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTextCol: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  actionBtnLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF7ED',
  },
  actionBtnLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
  },
  sectionMargin: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  priceBannerCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  infoIconBtn: {
    padding: 4,
  },
  priceSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  trustFeaturesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    marginRight: 10,
  },
  trustText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 4,
  },
  bookButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#F97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  bookButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* ================= MAP MODAL STYLES ================= */
  mapModalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  mapModalHeader: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mapModalCloseBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapModalHeaderTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mapSearchWrapper: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    zIndex: 50,
  },
  mapSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 46,
    paddingHorizontal: 12,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    height: '100%',
  },
  predictionsDropdown: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    overflow: 'hidden',
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  predictionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  predictionMainText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  predictionSecondaryText: {
    fontSize: 11,
    color: '#64748B',
  },
  googleAttributionRow: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
    backgroundColor: '#F8FAFC',
  },
  googleAttributionText: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  useGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  useGpsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  liveMapCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    minHeight: 260,
  },
  mapTileContainer: {
    width: '100%',
    height: '100%',
  },
  liveMapImage: {
    width: '100%',
    height: '100%',
  },
  googleMapsBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  googleMapsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  floatingZoomBox: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 5,
    alignItems: 'center',
    paddingVertical: 2,
    width: 36,
    zIndex: 15,
  },
  zoomControlBtn: {
    width: 36,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    width: 22,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  zoomPercentageText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
    marginVertical: 3,
  },
  floatingRecenterBtn: {
    position: 'absolute',
    bottom: 46,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 15,
  },
  centerMapPinWrap: {
    position: 'absolute',
    top: '40%',
    left: '46%',
    alignItems: 'center',
    zIndex: 10,
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
    bottom: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    zIndex: 10,
  },
  dragHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  popularLocSection: {
    paddingVertical: 8,
  },
  popularLocHeading: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  popularLocRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  locChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locChipSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#F97316',
  },
  locChipText: {
    fontSize: 11.5,
    color: '#475569',
    fontWeight: '500',
  },
  locChipTextSelected: {
    color: '#EA580C',
    fontWeight: '700',
  },
  confirmLocationFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  selectedAddressPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  previewAddressLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  previewAddressText: {
    fontSize: 13.5,
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

  /* ================= OTHER MODALS ================= */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheetBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  dateOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateOptionSelected: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    borderRadius: 8,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  dialogBody: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalConfirmBtn: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
