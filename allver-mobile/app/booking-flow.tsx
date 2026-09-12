import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, Dimensions, Alert, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Fonts } from '../constants/theme';

import SocketService from '../utils/SocketService';

const { width } = Dimensions.get('window');

type FlowStep = 5 | 6 | 7 | 8 | 9 | 10;

export default function BookingFlowScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const jobId = (params.jobId as string) || `job_${Date.now()}`;
  const serviceName = (params.service as string) || 'Painting';
  const location = (params.location as string) || 'Sector 62, Noida';
  const dateStr = (params.date as string) || '10 Sep 2026';
  const priceStr = (params.price as string) || '₹900';

  const initialStep = params.step ? parseInt(params.step as string) as FlowStep : 5;
  const [currentStep, setCurrentStep] = useState<FlowStep>(initialStep);

  // Dynamic Assigned Worker state
  const [assignedWorker, setAssignedWorker] = useState<any>({
    name: 'Ramesh Yadav',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200',
    rating: 4.8,
    reviews: 38,
    experience: '6 Years Experience',
    phone: '+91 98765 43210',
    location: location,
  });

  // Step 5 Animation (Radar Ripple)
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Step 8 Tracking Animation & State
  const trackingAnim = useRef(new Animated.Value(0)).current;
  const [etaMinutes, setEtaMinutes] = useState(12);

  // Step 5 Progress List
  const [step5Status, setStep5Status] = useState({
    notified: true,
    waiting: false,
    confirmed: false,
  });

  // Step 10 Rating state
  const [userRating, setUserRating] = useState(5);
  const [ratedSubmitted, setRatedSubmitted] = useState(false);

  // Step 5 Wave Status & No Worker Fallback State
  const [waveInfo, setWaveInfo] = useState({
    wave: 1,
    radiusText: '3 km',
    waveTitle: 'Group 1 (Nearest Top Workers)',
    message: 'Requesting Group 1 (nearby top workers within 3 km)...',
  });
  const [noWorkersAvailable, setNoWorkersAvailable] = useState(false);

  useEffect(() => {
    if (currentStep === 5) {
      setNoWorkersAvailable(false);

      // Start pulsing animation
      Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();

      // Emit real-time job dispatch request to all available workers
      let currentUser = (global as any).currentUser;
      const clientInfo = {
        userId: currentUser?._id || `client_${Date.now()}`,
        name: currentUser?.fullName || 'Client User',
        avatar: currentUser?.avatarUrl || '',
        phone: currentUser?.phone || currentUser?.phoneNumber || '+91 99999 88888',
      };

      console.log('[BookingFlow] Dispatching multi-wave real-time job request. JobID:', jobId);
      SocketService.emit('client_create_job_request', {
        jobId,
        service: serviceName,
        tier: 'Premium Worker',
        location,
        date: dateStr,
        price: priceStr,
        clientInfo,
      });

      let hasHandledAcceptance = false;

      // 1. Listen for wave expansion updates
      const handleWaveStatus = (statusData: any) => {
        console.log('[BookingFlow] Dispatch wave update:', statusData);
        if (statusData) {
          setWaveInfo({
            wave: statusData.wave || 1,
            radiusText: statusData.radiusText || '3 km',
            waveTitle: statusData.waveTitle || 'Searching Nearby Pool',
            message: statusData.message || 'Requesting nearby workers...',
          });
        }
      };

      // 2. Listen for no-worker-available notification
      const handleNoWorkers = (data: any) => {
        console.log('[BookingFlow] No workers available notification received:', data);
        setNoWorkersAvailable(true);
      };

      // 3. Listen for worker acceptance (First worker wins)
      const handleWorkerAccepted = (data: any) => {
        if (hasHandledAcceptance) return;
        hasHandledAcceptance = true;

        console.log('[BookingFlow] Real-time worker acceptance received:', data);
        if (data && data.worker) {
          setAssignedWorker(data.worker);
          setStep5Status({ notified: true, waiting: true, confirmed: true });
          setTimeout(() => {
            setCurrentStep(6);
          }, 300);
        }
      };

      SocketService.on('job_dispatch_wave_status', handleWaveStatus);
      SocketService.on(`job_dispatch_wave_status_${jobId}`, handleWaveStatus);
      SocketService.on('job_no_workers_available', handleNoWorkers);
      SocketService.on(`job_no_workers_available_${jobId}`, handleNoWorkers);
      SocketService.on('job_assigned_client', handleWorkerAccepted);
      SocketService.on(`job_assigned_client_${jobId}`, handleWorkerAccepted);

      // Auto-progress Step 5 internal indicators for smooth visual feedback
      const t1 = setTimeout(() => {
        setStep5Status((prev) => ({ ...prev, waiting: true }));
      }, 1200);

      const t2 = setTimeout(() => {
        setStep5Status((prev) => ({ ...prev, confirmed: true }));
      }, 2500);

      return () => {
        SocketService.off('job_dispatch_wave_status', handleWaveStatus);
        SocketService.off(`job_dispatch_wave_status_${jobId}`, handleWaveStatus);
        SocketService.off('job_no_workers_available', handleNoWorkers);
        SocketService.off(`job_no_workers_available_${jobId}`, handleNoWorkers);
        SocketService.off('job_assigned_client', handleWorkerAccepted);
        SocketService.off(`job_assigned_client_${jobId}`, handleWorkerAccepted);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (currentStep === 8) {
      // Step 8 Live Tracking animation
      trackingAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(trackingAnim, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          }),
          Animated.timing(trackingAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      const etaInterval = setInterval(() => {
        setEtaMinutes((prev) => (prev > 2 ? prev - 1 : 12));
      }, 3000);

      return () => clearInterval(etaInterval);
    }
  }, [currentStep]);

  const renderStepContent = () => {
    switch (currentStep) {
      /* ================= STEP 5: REQUEST SENT ================= */
      case 5:
        if (noWorkersAvailable) {
          return (
            <View style={styles.stepContainer}>
              <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                  <Feather name="arrow-left" size={24} color="#111827" />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
              </View>

              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#FCA5A5' }}>
                  <Feather name="user-x" size={40} color="#DC2626" />
                </View>

                <Text style={{ fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 }}>
                  No Workers Available
                </Text>

                <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 28 }}>
                  We searched through all matching nearby workers across expanded service areas ({waveInfo.radiusText}), but no worker is currently available to accept your job request.
                </Text>

                <TouchableOpacity
                  style={{ width: '100%', height: 52, borderRadius: 14, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}
                  onPress={() => {
                    setNoWorkersAvailable(false);
                    let currentUser = (global as any).currentUser;
                    SocketService.emit('client_create_job_request', {
                      jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                      service: serviceName,
                      tier: 'Premium Worker',
                      location,
                      date: dateStr,
                      price: priceStr,
                      clientInfo: {
                        userId: currentUser?._id || `client_${Date.now()}`,
                        name: currentUser?.fullName || 'Client User',
                      },
                    });
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>Try Search Again</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ width: '100%', height: 52, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' }}
                  onPress={() => router.back()}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#475569' }}>Change Booking Options</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#2563EB' }}>
                  Wave {waveInfo.wave}/3 • Radius {waveInfo.radiusText}
                </Text>
              </View>
            </View>

            {/* Ola-style Radar Pulse Graphic */}
            <View style={styles.radarGraphicSection}>
              <Animated.View 
                style={[
                  styles.radarPulseCircle,
                  {
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.6, 1.4],
                        })
                      }
                    ],
                    opacity: pulseAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 0],
                    })
                  }
                ]}
              />

              <View style={styles.radarCenterDot}>
                <View style={styles.radarInnerDot} />
              </View>

              {/* Surrounding Worker Dots */}
              <View style={[styles.workerDotWrap, { top: 20, left: 60 }]}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=100' }} style={styles.workerDotImg} />
              </View>
              <View style={[styles.workerDotWrap, { top: 30, right: 60 }]}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100' }} style={styles.workerDotImg} />
              </View>
              <View style={[styles.workerDotWrap, { bottom: 40, left: 40 }]}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100' }} style={styles.workerDotImg} />
              </View>
              <View style={[styles.workerDotWrap, { bottom: 35, right: 45 }]}>
                <Image source={{ uri: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=100' }} style={styles.workerDotImg} />
              </View>
            </View>

            <View style={styles.textCenterBlock}>
              <Text style={styles.radarTitle}>Finding a nearby {serviceName.toLowerCase()}...</Text>
              <Text style={styles.radarSubtitle}>
                {waveInfo.message || "We've sent your request to available workers in your area."}
              </Text>
            </View>

            {/* Status Checklist */}
            <View style={styles.statusChecklistCard}>
              <View style={styles.statusCheckRow}>
                <View style={styles.greenCheckIcon}>
                  <Feather name="check" size={12} color="#FFFFFF" />
                </View>
                <Text style={styles.statusCheckText}>
                  {waveInfo.waveTitle || 'Notifying nearby workers'}
                </Text>
              </View>

              <View style={styles.statusCheckRow}>
                {step5Status.waiting ? (
                  <View style={styles.greenCheckIcon}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.grayRadioDot} />
                )}
                <Text style={[styles.statusCheckText, !step5Status.waiting && styles.grayText]}>
                  Waiting for worker acceptance (Wave {waveInfo.wave}/3)
                </Text>
              </View>

              <View style={styles.statusCheckRow}>
                {step5Status.confirmed ? (
                  <View style={styles.greenCheckIcon}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.grayRadioDot} />
                )}
                <Text style={[styles.statusCheckText, !step5Status.confirmed && styles.grayText]}>
                  Service area: {waveInfo.radiusText}
                </Text>
              </View>
            </View>

            <View style={{ flex: 1 }} />

            <TouchableOpacity 
              style={styles.cancelRequestBtn}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelRequestText}>Cancel Request</Text>
            </TouchableOpacity>
          </View>
        );

      /* ================= STEP 6: WORKER ACCEPTS ================= */
      case 6:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>

            <View style={styles.centerHeroGraphic}>
              <View style={styles.bigCheckCircle}>
                <Feather name="check" size={48} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.textCenterBlock}>
              <Text style={styles.heroTitleBig}>Worker Found!</Text>
              <Text style={styles.heroSubText}>{assignedWorker.name} accepted your request.</Text>
            </View>

            {/* Worker Assigned Card */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              width: '100%',
            }}>
              <Image source={{ uri: assignedWorker.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200' }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>{assignedWorker.name}</Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{assignedWorker.experience || '6 Years Experience'} • ⭐ {assignedWorker.rating || 4.8}</Text>
              </View>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>ACCEPTED</Text>
              </View>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryDetailsCard}>
              <View style={styles.summaryRow}>
                <Feather name="clock" size={18} color="#6B7280" style={styles.summaryRowIcon} />
                <View>
                  <Text style={styles.summaryLabel}>Arriving by</Text>
                  <Text style={styles.summaryValueBold}>9:00 AM</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <FontAwesome5 name="tools" size={16} color="#6B7280" style={styles.summaryRowIcon} />
                <View>
                  <Text style={styles.summaryLabel}>Service</Text>
                  <Text style={styles.summaryValueBold}>{serviceName}</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Feather name="map-pin" size={18} color="#6B7280" style={styles.summaryRowIcon} />
                <View>
                  <Text style={styles.summaryLabel}>Location</Text>
                  <Text style={styles.summaryValueBold}>{location}</Text>
                </View>
              </View>
            </View>

            <View style={{ flex: 1 }} />

            <TouchableOpacity 
              style={styles.primaryGreenBtn}
              onPress={() => setCurrentStep(7)}
            >
              <Text style={styles.primaryGreenBtnText}>View Details</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryWhiteBtn}
              onPress={() => router.push('/chat-room')}
            >
              <Text style={styles.secondaryWhiteBtnText}>Chat (Optional)</Text>
            </TouchableOpacity>
          </View>
        );

      /* ================= STEP 7: ASSIGNED WORKER DETAILS ================= */
      case 7:
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContainerScroll}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => setCurrentStep(6)} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Booking Details</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Worker Avatar & Status */}
            <View style={styles.assignedWorkerHeaderCard}>
              <View style={styles.avatarHardHatWrap}>
                <Image source={{ uri: assignedWorker.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200' }} style={styles.assignedAvatar} />
                <View style={styles.hardHatBadge}>
                  <FontAwesome5 name="hard-hat" size={12} color="#F59E0B" />
                </View>
              </View>
              <View style={styles.assignedBadgeRow}>
                <View style={styles.greenDotSmall} />
                <Text style={styles.assignedBadgeText}>Assigned: {assignedWorker.name}</Text>
              </View>
              <Text style={styles.assignedTitle}>{assignedWorker.name} ({serviceName}) is on the way</Text>
              <Text style={styles.assignedSubText}>Reaching at 9:00 AM • ⭐ {assignedWorker.rating || 4.8}</Text>
            </View>

            {/* Details Breakdown */}
            <View style={styles.detailsBreakdownCard}>
              <View style={styles.breakdownRow}>
                <Feather name="briefcase" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                <View>
                  <Text style={styles.breakdownLabel}>Service</Text>
                  <Text style={styles.breakdownValue}>{serviceName}</Text>
                </View>
              </View>

              <View style={styles.breakdownRow}>
                <Feather name="map-pin" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                <View>
                  <Text style={styles.breakdownLabel}>Location</Text>
                  <Text style={styles.breakdownValue}>{location}</Text>
                </View>
              </View>

              <View style={styles.breakdownRow}>
                <Feather name="clock" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                <View>
                  <Text style={styles.breakdownLabel}>Start Time</Text>
                  <Text style={styles.breakdownValue}>{dateStr}, 9:00 AM</Text>
                </View>
              </View>

              <View style={styles.breakdownRow}>
                <Feather name="dollar-sign" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                <View>
                  <Text style={styles.breakdownLabel}>Estimated Price</Text>
                  <Text style={styles.breakdownValue}>₹800 – ₹1,000 / day</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons Row */}
            <View style={styles.twoBtnRow}>
              <TouchableOpacity style={styles.callOutlinedBtn} onPress={() => Linking.openURL('tel:9876543210')}>
                <Feather name="phone" size={18} color="#111827" style={{ marginRight: 8 }} />
                <Text style={styles.callOutlinedBtnText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.callOutlinedBtn} onPress={() => router.push('/chat-room')}>
                <Feather name="message-square" size={18} color="#111827" style={{ marginRight: 8 }} />
                <Text style={styles.callOutlinedBtnText}>Chat</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.primaryGreenBtn, { marginTop: 12 }]}
              onPress={() => setCurrentStep(8)}
            >
              <Text style={styles.primaryGreenBtnText}>Track Live Location (Step 8)</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      /* ================= STEP 8: LIVE TRACKING ================= */
      case 8:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => setCurrentStep(7)} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Live Location</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Simulated Live Map Container */}
            <View style={styles.simulatedMapBox}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=800' }} 
                style={styles.mapBgImage} 
                contentFit="cover" 
              />
              <View style={styles.mapOverlayTint} />

              {/* Floating ETA Callout */}
              <View style={styles.floatingEtaCallout}>
                <Text style={styles.etaCalloutTitle}>Arriving in</Text>
                <Text style={styles.etaCalloutTime}>{etaMinutes} min</Text>
              </View>

              {/* Animated Moving Worker Pin */}
              <Animated.View 
                style={[
                  styles.mapWorkerPin,
                  {
                    transform: [
                      {
                        translateX: trackingAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-40, 60],
                        })
                      },
                      {
                        translateY: trackingAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [50, -30],
                        })
                      }
                    ]
                  }
                ]}
              >
                <Image source={{ uri: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200' }} style={styles.pinAvatar} />
                <View style={styles.pinHatDot}>
                  <FontAwesome5 name="hard-hat" size={10} color="#F59E0B" />
                </View>
              </Animated.View>
            </View>

            {/* Bottom Sheet Card */}
            <View style={styles.trackingSheetCard}>
              <Text style={styles.trackingSheetTitle}>Your {serviceName.toLowerCase()} is on the way</Text>
              <Text style={styles.trackingSheetSub}>Arriving in {etaMinutes} minutes • {location}</Text>

              {/* Progress Steps Indicator */}
              <View style={styles.trackingProgressRow}>
                <View style={styles.progressStepCol}>
                  <View style={styles.progressCheckIcon}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.progressStepLabel}>Accepted</Text>
                </View>

                <View style={styles.progressLineActive} />

                <View style={styles.progressStepCol}>
                  <View style={styles.progressCheckIcon}>
                    <Feather name="check" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.progressStepLabel}>On the way</Text>
                </View>

                <View style={styles.progressLineActive} />

                <View style={styles.progressStepCol}>
                  <View style={styles.progressRadioActive} />
                  <Text style={styles.progressStepLabel}>Arriving</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.primaryGreenBtn, { marginTop: 16 }]}
                onPress={() => setCurrentStep(9)}
              >
                <Text style={styles.primaryGreenBtnText}>Proceed to Work in Progress (Step 9)</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      /* ================= STEP 9: WORK IN PROGRESS ================= */
      case 9:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => setCurrentStep(8)} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Job in Progress</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.centerHeroGraphic}>
              <View style={[styles.bigCheckCircle, { backgroundColor: '#EFF6FF' }]}>
                <FontAwesome5 name="paint-roller" size={44} color="#2563EB" />
              </View>
            </View>

            <View style={styles.textCenterBlock}>
              <Text style={styles.heroTitleBig}>Work in Progress</Text>
              <Text style={styles.heroSubText}>
                Your {serviceName.toLowerCase()} has started the work. You can track progress or contact the worker if needed.
              </Text>
            </View>

            <View style={{ flex: 1 }} />

            <TouchableOpacity 
              style={styles.secondaryWhiteBtn}
              onPress={() => router.push('/chat-room')}
            >
              <Feather name="message-square" size={18} color="#111827" style={{ marginRight: 8 }} />
              <Text style={styles.secondaryWhiteBtnText}>Chat with Worker</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryWhiteBtn}
              onPress={() => Alert.alert('Report Issue', 'Support team notified. We will call you within 5 minutes.')}
            >
              <Feather name="alert-triangle" size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={[styles.secondaryWhiteBtnText, { color: '#EF4444' }]}>Raise an Issue</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.primaryGreenBtn, { marginTop: 10 }]}
              onPress={() => setCurrentStep(10)}
            >
              <Text style={styles.primaryGreenBtnText}>Complete Job (Step 10)</Text>
            </TouchableOpacity>
          </View>
        );

      /* ================= STEP 10: JOB COMPLETED & RATING ================= */
      case 10:
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContainerScroll}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => setCurrentStep(9)} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
            </View>

            <View style={styles.centerHeroGraphic}>
              <View style={styles.bigCheckCircle}>
                <Feather name="check" size={48} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.textCenterBlock}>
              <Text style={styles.heroTitleBig}>Work Completed!</Text>
              <Text style={styles.heroSubText}>Hope you're satisfied with the service.</Text>
            </View>

            {/* Summary Invoice Card */}
            <View style={styles.detailsBreakdownCard}>
              <View style={styles.breakdownRow}>
                <Feather name="briefcase" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                <View style={styles.rowFlexBetween}>
                  <Text style={styles.breakdownLabel}>Service</Text>
                  <Text style={styles.breakdownValue}>{serviceName}</Text>
                </View>
              </View>

              <View style={styles.breakdownRow}>
                <Feather name="calendar" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                <View style={styles.rowFlexBetween}>
                  <Text style={styles.breakdownLabel}>Date</Text>
                  <Text style={styles.breakdownValue}>{dateStr}</Text>
                </View>
              </View>

              <View style={styles.breakdownRow}>
                <Feather name="dollar-sign" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                <View style={styles.rowFlexBetween}>
                  <Text style={styles.breakdownLabel}>Total Amount</Text>
                  <Text style={[styles.breakdownValue, { fontWeight: '800' }]}>{priceStr}</Text>
                </View>
              </View>

              <View style={styles.breakdownRow}>
                <Feather name="credit-card" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                <View style={styles.rowFlexBetween}>
                  <Text style={styles.breakdownLabel}>Payment</Text>
                  <Text style={[styles.breakdownValue, { color: '#10B981', fontWeight: '700' }]}>
                    🟢 Completed (Online)
                  </Text>
                </View>
              </View>
            </View>

            {/* Star Rating Control */}
            <View style={styles.starRatingSection}>
              <Text style={styles.starRatingHeading}>Rate your experience</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setUserRating(star)} style={{ padding: 6 }}>
                    <Feather 
                      name="star" 
                      size={32} 
                      color={star <= userRating ? '#F59E0B' : '#E5E7EB'} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity 
              style={styles.primaryGreenBtn}
              onPress={() => {
                setRatedSubmitted(true);
                Alert.alert('Thank You!', `Thank you for rating ${userRating} stars!`, [
                  { text: 'OK', onPress: () => router.push('/(tabs)') }
                ]);
              }}
            >
              <Text style={styles.primaryGreenBtnText}>
                {ratedSubmitted ? 'Rating Submitted ✓' : 'Rate Your Experience'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryWhiteBtn}
              onPress={() => router.push('/(tabs)')}
            >
              <Text style={styles.secondaryWhiteBtnText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {renderStepContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  stepContainerScroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

  /* RADAR STEP 5 */
  radarGraphicSection: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  radarPulseCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
    position: 'absolute',
  },
  radarCenterDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarInnerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
  workerDotWrap: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  workerDotImg: {
    width: '100%',
    height: '100%',
  },

  textCenterBlock: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  radarTitle: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  radarSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 13.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },

  statusChecklistCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    gap: 14,
  },
  statusCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenCheckIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  grayRadioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  statusCheckText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  grayText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },

  cancelRequestBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelRequestText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  /* STEP 6 HERO */
  centerHeroGraphic: {
    alignItems: 'center',
    marginVertical: 20,
  },
  bigCheckCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTitleBig: {
    fontFamily: Fonts.sans,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  heroSubText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  summaryDetailsCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryRowIcon: {
    marginRight: 14,
    width: 20,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 1,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },

  primaryGreenBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryGreenBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryWhiteBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    height: 48,
    marginBottom: 10,
  },
  secondaryWhiteBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  /* STEP 7 ASSIGNED WORKER */
  assignedWorkerHeaderCard: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 20,
    marginVertical: 14,
  },
  avatarHardHatWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  assignedAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  hardHatBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  greenDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  assignedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  assignedTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  assignedSubText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#6B7280',
  },

  detailsBreakdownCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginVertical: 14,
    gap: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 1,
  },
  twoBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  callOutlinedBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    height: 46,
    backgroundColor: '#FFFFFF',
  },
  callOutlinedBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  /* STEP 8 LIVE MAP */
  simulatedMapBox: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 14,
  },
  mapBgImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlayTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  floatingEtaCallout: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    alignItems: 'center',
  },
  etaCalloutTitle: {
    fontSize: 11,
    color: '#6B7280',
  },
  etaCalloutTime: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  mapWorkerPin: {
    position: 'absolute',
    top: '45%',
    left: '48%',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  pinHatDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 2,
  },

  trackingSheetCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 18,
  },
  trackingSheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  trackingSheetSub: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  trackingProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  progressStepCol: {
    alignItems: 'center',
  },
  progressCheckIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressRadioActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#10B981',
    backgroundColor: '#FFFFFF',
    marginBottom: 4,
  },
  progressStepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  progressLineActive: {
    flex: 1,
    height: 2,
    backgroundColor: '#10B981',
    marginBottom: 14,
    marginHorizontal: 4,
  },

  rowFlexBetween: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  starRatingSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  starRatingHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
