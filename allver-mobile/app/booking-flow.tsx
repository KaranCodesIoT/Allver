import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Animated, Dimensions, Alert, Modal, Linking, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, BackHandler, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { Fonts } from '../constants/theme';
import { openRazorpayCheckout } from '../utils/PaymentCheckout';
import { getToken, getStoredUser } from '../constants/Auth';

import SocketService from '../utils/SocketService';
import { getIndiaMapImageUrl, findCoordinatesForLocationText } from '../utils/GeocodingService';
import { getServiceRadiusConfig, BACKEND_URL } from '../constants/Config';

const { width } = Dimensions.get('window');

type FlowStep = 5 | 6 | 7 | 8 | 9 | 10;

export default function BookingFlowScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;

  const hasAlertedCancelRef = useRef(false);
  const userInitiatedCancelRef = useRef(false);
  const syncIntervalRef = useRef<any>(null);

  const params = useLocalSearchParams();

  const jobId = (params.jobId as string) || `job_${Date.now()}`;
  const serviceName = (params.service as string) || 'Painting';
  const location = (params.location as string) || 'Sector 62, Noida';
  const formattedAddress = (params.formattedAddress as string) || location;
  const placeId = (params.placeId as string) || '';
  const dateStr = (params.date as string) || '10 Sep 2026';
  const priceStr = (params.price as string) || '₹900';

  // Intelligent coordinate resolution (avoid defaulting to Noida when location is Kalwa or other city)
  let rawLat = params.latitude ? parseFloat(params.latitude as string) : NaN;
  let rawLng = params.longitude ? parseFloat(params.longitude as string) : NaN;
  const isDefaultNoida = (Math.abs(rawLat - 28.6273) < 0.001 && Math.abs(rawLng - 77.3725) < 0.001);
  const locText = ((formattedAddress || '') + ' ' + (location || '')).toLowerCase();

  if (isNaN(rawLat) || isNaN(rawLng) || (isDefaultNoida && !locText.includes('noida') && !locText.includes('sector 62'))) {
    const matchedCoords = findCoordinatesForLocationText(formattedAddress || location);
    if (matchedCoords) {
      rawLat = matchedCoords.lat;
      rawLng = matchedCoords.lng;
    } else if (isNaN(rawLat) || isNaN(rawLng)) {
      rawLat = 28.6273;
      rawLng = 77.3725;
    }
  }

  const latitude = rawLat;
  const longitude = rawLng;

  const initialStep = params.step ? parseInt(params.step as string) as FlowStep : 5;
  const [currentStep, setCurrentStep] = useState<FlowStep>(initialStep);

  // Dynamic Assigned Worker state (Authoritative worker: Akash Chauhan)
  const [assignedWorker, setAssignedWorker] = useState<any>({
    id: '6a4f0c7d30034d5c126f259e',
    name: 'Akash Chauhan',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200',
    rating: 4.8,
    reviews: 38,
    experience: '6 Years Experience',
    phone: '+91 85236 98754',
    location: location,
    distanceKm: null,
  });

  // Post-Acceptance Lifecycle States
  const [workerJobStatus, setWorkerJobStatus] = useState<string>('WORKER_ACCEPTED');
  const [liveDistanceKm, setLiveDistanceKm] = useState<number | null>(null);
  const [workerCoords, setWorkerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [workStartedAt, setWorkStartedAt] = useState<number | null>(null);
  const [completionData, setCompletionData] = useState<any>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [activeJobChatId, setActiveJobChatId] = useState<string | null>(null);
  const [isPayingOnline, setIsPayingOnline] = useState(false);

  // In-Place Chat State
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatScrollRef = useRef<any>(null);

  // Step 5 Animation (Radar Ripple)
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Step 8 Tracking Animation & State
  const trackingAnim = useRef(new Animated.Value(0)).current;
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  // Step 5 Progress List
  const [step5Status, setStep5Status] = useState({
    notified: true,
    waiting: false,
    confirmed: false,
  });

  // Step 5 Cancel Search Confirmation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  const performCancelSearch = async () => {
    userInitiatedCancelRef.current = true;
    hasAlertedCancelRef.current = true;
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    try {
      SocketService.emit('client_cancel_job_request', { jobId });
      SocketService.emit('cancel_job', { jobId, reason: 'Client cancelled search' });
      SocketService.leaveRoom(`job:${jobId}`);
      fetch(`${BACKEND_URL}/api/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Client cancelled search', cancelledBy: 'client' })
      }).catch((err) => console.warn('[BookingFlow] Cancel API error:', err));
    } catch (e) {
      console.warn('[BookingFlow] Socket error during cancel:', e);
    }
    router.replace('/(tabs)');
  };

  // Step 10 Rating & Receipt state
  const [userRating, setUserRating] = useState(5);
  const [ratedSubmitted, setRatedSubmitted] = useState(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);

  const fetchReceipt = async () => {
    setIsLoadingReceipt(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/payment/receipt/${jobId}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.receipt) {
          setReceiptData(data.receipt);
        }
      }
    } catch (e) {
      console.warn('[BookingFlow] Error fetching receipt:', e);
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const token = await getToken();
      const url = `${BACKEND_URL}/api/payment/receipt/${jobId}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      Linking.openURL(url).catch((err: any) => {
        Alert.alert('Error', 'Unable to open invoice download link: ' + err.message);
      });
    } catch (err: any) {
      Alert.alert('Error', 'Unable to load credentials for download.');
    }
  };

  const handleSubmitCustomerRating = async () => {
    setIsSubmittingRating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${BACKEND_URL}/api/jobs/${jobId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          rating: userRating,
          comment: reviewComment.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRatedSubmitted(true);
        Alert.alert('⭐ Thank You!', `Thank you for rating ${assignedWorker.name} ${userRating} stars!`, [
          { text: 'Done', onPress: () => router.replace('/(tabs)') }
        ]);
      } else {
        Alert.alert('Rating', data.message || 'Could not submit rating.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit rating.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // Step 5 Wave Status & No Worker Fallback State (synced with backend SERVICE_RADIUS_CONFIG)
  const radiusConfig = getServiceRadiusConfig(serviceName);
  const [waveInfo, setWaveInfo] = useState({
    wave: 1,
    radiusText: `${radiusConfig.wave1Km} km`,
    waveTitle: `Group 1 (Nearest ${serviceName} Workers within ${radiusConfig.wave1Km} km)`,
    message: `Searching for available ${serviceName} workers within ${radiusConfig.wave1Km} km...`,
  });
  const [waveSecondsLeft, setWaveSecondsLeft] = useState(20);
  const [noWorkersAvailable, setNoWorkersAvailable] = useState(false);

  // Authoritative server sync for active job state
  const applyAuthoritativeJobData = useCallback((j: any) => {
    if (!j) return;
    if (j.workerInfo || j.assignedWorker || j.workerId) {
      const w = j.workerInfo || j.assignedWorker || j.workerId;
      setAssignedWorker((prev: any) => ({
        ...prev,
        name: w.name || w.fullName || prev.name,
        avatar: w.avatar || w.avatarUrl || prev.avatar,
        rating: w.rating || prev.rating,
        phone: w.phone || prev.phone,
        id: w.id || w.userId || w._id || prev.id,
        distanceKm: j.route?.distance || prev.distanceKm,
      }));
    }
    if (j.status) {
      const st = String(j.status).toUpperCase();
      setWorkerJobStatus(st);
      if (st === 'SEARCHING') {
        setCurrentStep(5);
      } else if (['WORKER_ACCEPTED', 'JOB_ACCEPTED', 'WORKER_ASSIGNED', 'ASSIGNED', 'ACCEPTED'].includes(st)) {
        setCurrentStep((prev) => (prev < 6 ? 6 : prev));
      } else if (['WORKER_EN_ROUTE', 'TRAVELLING', 'WORKER_ON_WAY', 'WORKER_ARRIVED', 'ARRIVED'].includes(st)) {
        setCurrentStep(8);
      } else if (
        ['WORK_STARTED', 'WORK_IN_PROGRESS', 'IN_PROGRESS', 'WORK_COMPLETION_REQUESTED', 'COMPLETION_SUBMITTED', 'CLIENT_CONFIRMED', 'PAYMENT_PENDING', 'PAYMENT_FAILED'].includes(st)
      ) {
        setCurrentStep(9);
      } else if (['COMPLETED', 'PAYMENT_COMPLETED', 'PAYMENT_CONFIRMED', 'SETTLED'].includes(st)) {
        setPaymentConfirmed(true);
        setCurrentStep(10);
      }
    }
    if (j.route?.distance !== undefined && j.route?.distance !== null) setLiveDistanceKm(j.route.distance);
    if (j.route?.duration !== undefined && j.route?.duration !== null) setEtaMinutes(j.route.duration);
    if (j.startedAt) setWorkStartedAt(new Date(j.startedAt).getTime());
    if (j.completionData) setCompletionData(j.completionData);
    if (j.chatId) setActiveJobChatId(j.chatId);
    if (j.workerLocation?.latitude) {
      setWorkerCoords({
        latitude: j.workerLocation.latitude,
        longitude: j.workerLocation.longitude
      });
    }
  }, []);

  const fetchAuthoritativeJobFromApi = useCallback(async () => {
    try {
      const token = await getToken();
      let url = `${BACKEND_URL}/api/customer/active-job`;
      if (jobId && !jobId.startsWith('job_') && jobId.length > 5) {
        url = `${BACKEND_URL}/api/jobs/${jobId}`;
      }

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const data = await res.json();
        const j = data.activeJob || data.job;
        if (j) {
          applyAuthoritativeJobData(j);
        }
      }
    } catch (e) {
      console.warn('[BookingFlow] HTTP active job sync failed:', e);
    }
  }, [jobId, applyAuthoritativeJobData]);

  // Android hardware back protection: safely navigate away without abandoning active job
  useEffect(() => {
    const onBackPress = () => {
      userInitiatedCancelRef.current = true;
      hasAlertedCancelRef.current = true;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      router.replace('/(tabs)');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [router]);

  // Lifecycle socket event listeners
  useEffect(() => {
    let currentUser = (global as any).currentUser;
    const clientUserId = (currentUser?._id && /^[0-9a-fA-F]{24}$/.test(currentUser._id))
      ? currentUser._id
      : '6a4ed79a6d874a11031e34da';

    // Ensure socket is initialized and connected
    SocketService.initialize(clientUserId);

    if (jobId) {
      SocketService.joinRoom(`job:${jobId}`);
    }

    // 1. Initial Authoritative sync via HTTP API immediately
    fetchAuthoritativeJobFromApi();

    // Recheck when app returns from background
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchAuthoritativeJobFromApi();
      }
    });

    // Recheck when socket reconnects
    SocketService.on('connect', fetchAuthoritativeJobFromApi);
    SocketService.on('reconnect', fetchAuthoritativeJobFromApi);

    // 2. Hydrate authoritative job state via socket
    SocketService.emit('get_active_job', { jobId }, (res: any) => {
      if (res && res.success && res.job) {
        applyAuthoritativeJobData(res.job);
      }
    });

    // 2. Authoritative state change listener
    const handleJobStatusChanged = (data: any) => {
      if (data && data.jobId === jobId) {
        console.log('[BookingFlow] Authoritative status changed:', data.status);
        setWorkerJobStatus(data.status);
        if (data.chatId) setActiveJobChatId(data.chatId);
        if (data.route?.distance) setLiveDistanceKm(data.route.distance);
        if (data.route?.duration) setEtaMinutes(data.route.duration);
        if (data.worker) {
          const w = data.worker;
          setAssignedWorker((prev: any) => ({
            ...prev,
            name: w.name || w.fullName || prev.name,
            avatar: w.avatar || w.avatarUrl || prev.avatar,
            rating: w.rating || prev.rating,
            phone: w.phone || prev.phone,
            id: w.id || w.userId || w._id,
          }));
        }
        if (data.status === 'CANCELLED' || data.status === 'CANCELLED_BY_CLIENT' || data.status === 'CANCELLED_BY_WORKER') {
          // Immediately stop background polling interval and clean up listeners
          if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
          }
          SocketService.off('job_status_changed', handleJobStatusChanged);
          SocketService.leaveRoom(`job:${jobId}`);

          const isWorkerCancel = data.status === 'CANCELLED_BY_WORKER';
          const shouldAlert = isWorkerCancel && !userInitiatedCancelRef.current && !hasAlertedCancelRef.current && isFocusedRef.current;
          hasAlertedCancelRef.current = true;

          if (isFocusedRef.current) {
            router.replace('/(tabs)');
          }

          if (shouldAlert) {
            Alert.alert(
              'Booking Cancelled',
              data.reason || 'The worker has cancelled this booking.',
              [{ text: 'OK' }],
              { cancelable: true }
            );
          }
          return;
        }
        if (data.status === 'WORKER_ACCEPTED' || data.status === 'JOB_ACCEPTED') {
          setCurrentStep(6);
        } else if (data.status === 'WORKER_EN_ROUTE' || data.status === 'TRAVELLING') {
          setCurrentStep(8);
        } else if (data.status === 'WORKER_ARRIVED' || data.status === 'ARRIVED') {
          setCurrentStep(8);
        } else if (data.status === 'WORK_STARTED' || data.status === 'WORK_IN_PROGRESS') {
          if (data.startedAt) setWorkStartedAt(new Date(data.startedAt).getTime());
          setCurrentStep(9);
        } else if (
          data.status === 'WORK_COMPLETION_REQUESTED' ||
          data.status === 'COMPLETION_SUBMITTED'
        ) {
          if (data.completionData) setCompletionData(data.completionData);
          setCurrentStep(9);
        } else if (data.status === 'PAYMENT_PENDING' || data.status === 'CLIENT_CONFIRMED') {
          setWorkerJobStatus(data.status);
          setCurrentStep(9);
        } else if (data.status === 'PAYMENT_CONFIRMED') {
          setWorkerJobStatus('PAYMENT_CONFIRMED');
          setCurrentStep(9);
        } else if (data.status === 'SETTLED') {
          setWorkerJobStatus('SETTLED');
          setCurrentStep(9);
        } else if (data.status === 'COMPLETED' || data.status === 'PAYMENT_COMPLETED') {
          setPaymentConfirmed(true);
          setWorkerJobStatus('COMPLETED');
          setCurrentStep(10);
        }
      }
    };

    // 3. Real GPS & Route update listener
    const handleLocationUpdated = (data: any) => {
      if (data && (data.jobId === jobId || !data.jobId)) {
        console.log('[BookingFlow] Real-time worker location updated:', data.distanceKm, data.etaMinutes);
        const d = data.route?.distance !== undefined ? data.route.distance : data.distanceKm;
        const eta = data.route?.duration !== undefined ? data.route.duration : data.etaMinutes;
        if (d !== undefined && d !== null) setLiveDistanceKm(d);
        if (eta !== undefined && eta !== null) setEtaMinutes(eta);
        if (data.workerLocation?.latitude) {
          setWorkerCoords({
            latitude: data.workerLocation.latitude,
            longitude: data.workerLocation.longitude
          });
        }
      }
    };

    // Backwards compatibility listeners
    const handleStatusUpdated = (data: any) => {
      if (data && data.jobId === jobId) {
        setWorkerJobStatus(data.status);
        if (data.status === 'TRAVELLING' || data.status === 'WORKER_EN_ROUTE') {
          setCurrentStep(8);
        } else if (data.status === 'ARRIVED' || data.status === 'WORKER_ARRIVED') {
          setCurrentStep(8);
        } else if (data.status === 'WORK_IN_PROGRESS' || data.status === 'WORK_STARTED') {
          if (data.workStartedAt) setWorkStartedAt(data.workStartedAt);
          setCurrentStep(9);
        }
      }
    };

    const handleLiveLocation = (data: any) => {
      if (data && (data.jobId === jobId || !data.jobId)) {
        const d = data.route?.distance !== undefined ? data.route.distance : data.distanceKm;
        const eta = data.route?.duration !== undefined ? data.route.duration : data.etaMinutes;
        if (d !== undefined && d !== null) setLiveDistanceKm(d);
        if (eta !== undefined && eta !== null) setEtaMinutes(eta);
      }
    };

    const handleCompletionSubmitted = (data: any) => {
      if (data && data.jobId === jobId) {
        setCompletionData(data.completionData);
        setCurrentStep(9);
      }
    };

    const handleCompletedConfirmed = (data: any) => {
      if (data && data.jobId === jobId) {
        setWorkerJobStatus('PAYMENT_PENDING');
      }
    };

    const handlePaymentCompleted = (data: any) => {
      if (data && data.jobId === jobId) {
        setPaymentConfirmed(true);
        setCurrentStep(10);
      }
    };

    SocketService.on('job_status_changed', handleJobStatusChanged);
    SocketService.on('worker_location_updated', handleLocationUpdated);
    SocketService.on('job_status_updated', handleStatusUpdated);
    SocketService.on(`job_status_updated_${jobId}`, handleStatusUpdated);
    SocketService.on('worker_live_location_broadcast', handleLiveLocation);
    SocketService.on(`worker_live_location_broadcast_${jobId}`, handleLiveLocation);
    SocketService.on('job_completion_submitted', handleCompletionSubmitted);
    // Fetch authoritative state on mount and on reconnect
    const syncActiveJob = () => {
      SocketService.emit('get_active_job', { jobId }, (res: any) => {
        if (res && res.success && res.job) {
          const jobData = res.job;
          console.log('[BookingFlow] Reconciled active job from backend:', jobData.status);
          if (jobData.status) {
            setWorkerJobStatus(jobData.status);
            if (jobData.status === 'WORK_COMPLETION_REQUESTED' || jobData.completionData) {
              setCompletionData(jobData.completionData || { finalAmount: jobData.jobAmount || 900 });
              setCurrentStep(9);
            } else if (jobData.status === 'PAYMENT_PENDING' || jobData.status === 'CLIENT_CONFIRMED') {
              setCompletionData(jobData.completionData || { finalAmount: jobData.jobAmount || 900 });
              setCurrentStep(9);
            } else if (jobData.status === 'COMPLETED' || jobData.status === 'SETTLED') {
              setPaymentConfirmed(true);
              setCurrentStep(10);
            } else if (jobData.status === 'WORK_STARTED' || jobData.status === 'WORK_IN_PROGRESS') {
              setCurrentStep(9);
            } else if (jobData.status === 'WORKER_ARRIVED' || jobData.status === 'ARRIVED') {
              setWorkerJobStatus('WORKER_ARRIVED');
              setCurrentStep(8);
            } else if (jobData.status === 'WORKER_EN_ROUTE' || jobData.status === 'TRAVELLING') {
              setWorkerJobStatus('WORKER_EN_ROUTE');
              setCurrentStep(8);
            }
          }
        }
      });
    };

    syncActiveJob();
    SocketService.on('connect', syncActiveJob);
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    syncIntervalRef.current = setInterval(syncActiveJob, 4000);

    return () => {
      appStateSub.remove();
      SocketService.off('connect', fetchAuthoritativeJobFromApi);
      SocketService.off('reconnect', fetchAuthoritativeJobFromApi);
      SocketService.off('connect', syncActiveJob);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      SocketService.off('job_status_changed', handleJobStatusChanged);
      SocketService.off('worker_location_updated', handleLocationUpdated);
      SocketService.off('job_status_updated', handleStatusUpdated);
      SocketService.off(`job_status_updated_${jobId}`, handleStatusUpdated);
      SocketService.off('worker_live_location_broadcast', handleLiveLocation);
      SocketService.off(`worker_live_location_broadcast_${jobId}`, handleLiveLocation);
      SocketService.off('job_completion_submitted', handleCompletionSubmitted);
      SocketService.off(`job_completion_submitted_${jobId}`, handleCompletionSubmitted);
      SocketService.off('job_completed_confirmed', handleCompletedConfirmed);
      SocketService.off(`job_completed_confirmed_${jobId}`, handleCompletedConfirmed);
      SocketService.off('job_payment_completed', handlePaymentCompleted);
      SocketService.off(`job_payment_completed_${jobId}`, handlePaymentCompleted);
    };
  }, [jobId]);

  // Load conversation messages and join rooms when in-place chat modal opens
  useEffect(() => {
    if (!chatModalVisible) return;

    let targetConvoId = activeJobChatId;
    const effectiveUserId = (global as any).currentUser?._id || '6a4ed79a6d874a11031e34da';
    const workerUserId = assignedWorker.id || assignedWorker.userId || assignedWorker._id || '6a4f0c7d30034d5c126f259e';

    const loadMessages = async () => {
      setIsLoadingChat(true);
      try {
        if (!targetConvoId) {
          const convRes = await fetch(`${BACKEND_URL}/api/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: effectiveUserId,
              receiverId: workerUserId,
            }),
          });
          const convData = await convRes.json();
          if (convData.conversation?._id) {
            targetConvoId = convData.conversation._id;
            setActiveJobChatId(targetConvoId);
          }
        }

        if (targetConvoId) {
          SocketService.emit('join_room', { roomId: targetConvoId });
          SocketService.emit('join_room', { roomId: `chat:${targetConvoId}` });

          const msgRes = await fetch(`${BACKEND_URL}/api/conversations/${targetConvoId}/messages`);
          if (msgRes.ok) {
            const data = await msgRes.json();
            if (Array.isArray(data.messages)) {
              setChatMessages(data.messages);
            }
          }
        }
      } catch (err) {
        console.warn('[BookingFlow] Error loading in-place chat messages:', err);
      } finally {
        setIsLoadingChat(false);
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: false }), 250);
      }
    };

    loadMessages();
  }, [chatModalVisible, activeJobChatId]);

  // Real-time socket listener for incoming chat messages
  useEffect(() => {
    const handleReceiveMessage = (data: any) => {
      if (!data || !data.message) return;
      const convoMatch =
        (activeJobChatId && (data.conversationId === activeJobChatId || data.workspaceId === activeJobChatId || data.roomId === activeJobChatId)) ||
        (data.roomId && (data.roomId === `job:${jobId}` || data.roomId === jobId));

      if (convoMatch || !activeJobChatId) {
        const msg = data.message;
        const effectiveUserId = (global as any).currentUser?._id || '6a4ed79a6d874a11031e34da';
        const msgSender = msg.sender && typeof msg.sender === 'object' ? msg.sender._id : msg.sender;

        // Skip our own message from socket echo if already added optimistically
        if (msgSender && String(msgSender) === String(effectiveUserId)) {
          if (msg._id && (msg.tempId || data.tempId)) {
            const matchTempId = msg.tempId || data.tempId;
            setChatMessages((prev) => {
              const alreadyHasReal = prev.some((m) => m._id === msg._id && m.tempId !== matchTempId);
              if (alreadyHasReal) {
                return prev.filter((m) => m.tempId !== matchTempId);
              }
              return prev.map((m) => (m.tempId === matchTempId ? { ...m, _id: msg._id } : m));
            });
          }
          return;
        }

        setChatMessages((prev) => {
          const exists = prev.some(
            (m) =>
              (m._id && msg._id && String(m._id) === String(msg._id)) ||
              (m.tempId && msg.tempId && String(m.tempId) === String(msg.tempId)) ||
              (m.tempId && data.tempId && String(m.tempId) === String(data.tempId))
          );
          if (exists) return prev;
          return [...prev, msg];
        });
        setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    SocketService.on('receive_message', handleReceiveMessage);
    return () => {
      SocketService.off('receive_message', handleReceiveMessage);
    };
  }, [activeJobChatId, jobId]);

  const handleSendChatMessage = async (presetText?: string) => {
    const textToSend = (presetText || chatInputText).trim();
    if (!textToSend || isSendingMessage) return;

    if (!presetText) setChatInputText('');
    setIsSendingMessage(true);

    let targetConvoId = activeJobChatId;
    const effectiveUserId = (global as any).currentUser?._id || '6a4ed79a6d874a11031e34da';
    const workerUserId = assignedWorker.id || assignedWorker.userId || assignedWorker._id || '6a4f0c7d30034d5c126f259e';

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const optimisticMsg = {
      _id: tempId,
      tempId,
      sender: { _id: effectiveUserId, fullName: 'You', role: 'client' },
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      if (!targetConvoId) {
        const convRes = await fetch(`${BACKEND_URL}/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: effectiveUserId,
            receiverId: workerUserId,
          }),
        });
        const convData = await convRes.json();
        if (convData.conversation?._id) {
          targetConvoId = convData.conversation._id;
          setActiveJobChatId(targetConvoId);
          SocketService.emit('join_room', { roomId: targetConvoId });
          SocketService.emit('join_room', { roomId: `chat:${targetConvoId}` });
        }
      }

      if (targetConvoId) {
        // Post to REST API (which automatically persists and broadcasts via Socket.io)
        const res = await fetch(`${BACKEND_URL}/api/conversations/${targetConvoId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: effectiveUserId,
            text: textToSend,
            tempId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const realId = data.message?._id;
          if (realId) {
            setChatMessages((prev) => {
              const alreadyHasReal = prev.some((m) => m._id === realId && m.tempId !== tempId);
              if (alreadyHasReal) {
                return prev.filter((m) => m.tempId !== tempId);
              }
              return prev.map((m) => (m.tempId === tempId ? { ...m, _id: realId } : m));
            });
          }
        }
      }
    } catch (err) {
      console.error('[BookingFlow] Send chat message error:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

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
      const clientUserId = (currentUser?._id && /^[0-9a-fA-F]{24}$/.test(currentUser._id))
        ? currentUser._id
        : '6a4ed79a6d874a11031e34da'; // Registered Client in DB (Sushil Maurya)

      const clientInfo = {
        userId: clientUserId,
        id: clientUserId,
        _id: clientUserId,
        name: currentUser?.fullName || 'Sushil Maurya',
        avatar: currentUser?.avatarUrl || '',
        phone: currentUser?.phone || currentUser?.phoneNumber || '+91 85910 88873',
      };

      const dispatchPayload = {
        jobId,
        service: serviceName,
        tier: 'Premium Worker',
        location,
        latitude,
        longitude,
        formattedAddress,
        placeId,
        date: dateStr,
        price: priceStr,
        clientInfo,
      };

      console.log('[BookingFlow] Dispatching multi-wave real-time job request. JobID:', jobId, 'Coordinates:', latitude, longitude);
      
      // 1. Primary real-time socket emit
      SocketService.emit('client_create_job_request', dispatchPayload);

      // 2. Dual-channel HTTP fallback dispatch (guarantees job creation even if socket is reconnecting)
      const { BACKEND_URL } = require('../constants/Config');
      fetch(`${BACKEND_URL}/api/booking/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dispatchPayload)
      }).then(res => res.json()).then(resData => {
        console.log('[BookingFlow] HTTP Dispatch result:', resData);
      }).catch(err => {
        console.warn('[BookingFlow] HTTP Dispatch non-blocking error:', err.message);
      });

      let hasHandledAcceptance = false;
      setWaveSecondsLeft(20);

      // Live countdown interval for user visibility
      const waveCountdownTimer = setInterval(() => {
        setWaveSecondsLeft((prev) => (prev > 1 ? prev - 1 : 20));
      }, 1000);

      // 1. Listen for search started confirmation
      const handleSearchStarted = (startData: any) => {
        console.log('[BookingFlow] Search started authoritative event:', startData);
        setNoWorkersAvailable(false);
        setStep5Status({ notified: true, waiting: true, confirmed: false });
      };

      // 2. Listen for backend authoritative wave progression updates (Wave 1 -> Wave 2 -> Wave 3)
      const handleWaveStatus = (statusData: any) => {
        console.log('[BookingFlow] Authoritative dispatch wave update from server:', statusData);
        if (statusData) {
          setWaveInfo({
            wave: statusData.wave || 1,
            radiusText: statusData.radiusText || `${statusData.radiusKm || radiusConfig.wave1Km} km`,
            waveTitle: statusData.waveTitle || `Wave ${statusData.wave || 1}/3 • Radius ${statusData.radiusKm || radiusConfig.wave1Km} km`,
            message: statusData.message || `Searching for verified ${serviceName} workers within ${statusData.radiusKm || radiusConfig.wave1Km} km...`,
          });
          setWaveSecondsLeft(Math.round((statusData.timeoutMs || 20000) / 1000));
          setStep5Status((prev) => ({ ...prev, notified: true, waiting: true }));
        }
      };

      // 3. Listen for backend authoritative search exhausted (no workers available)
      const handleNoWorkers = (data: any) => {
        console.log('[BookingFlow] Backend search exhausted - no workers available:', data);
        clearInterval(waveCountdownTimer);
        setNoWorkersAvailable(true);
      };

      // 4. Listen for backend authoritative worker acceptance (atomic single winner)
      const handleWorkerAccepted = (data: any) => {
        if (hasHandledAcceptance) return;
        hasHandledAcceptance = true;
        clearInterval(waveCountdownTimer);

        console.log('[BookingFlow] Authoritative worker acceptance received:', data);
        if (data && data.worker) {
          setAssignedWorker(data.worker);
          setStep5Status({ notified: true, waiting: true, confirmed: true });
          setTimeout(() => {
            setCurrentStep(6);
          }, 300);
        }
      };

      // Listen to both generic and job-specific broadcast channels
      SocketService.on('job_search_started', handleSearchStarted);
      SocketService.on(`job_search_started_${jobId}`, handleSearchStarted);
      SocketService.on('job_dispatch_wave_status', handleWaveStatus);
      SocketService.on(`job_dispatch_wave_status_${jobId}`, handleWaveStatus);
      SocketService.on('job_no_workers_available', handleNoWorkers);
      SocketService.on(`job_no_workers_available_${jobId}`, handleNoWorkers);
      SocketService.on('job_assigned_client', handleWorkerAccepted);
      SocketService.on(`job_assigned_client_${jobId}`, handleWorkerAccepted);

      return () => {
        clearInterval(waveCountdownTimer);
        SocketService.off('job_search_started', handleSearchStarted);
        SocketService.off(`job_search_started_${jobId}`, handleSearchStarted);
        SocketService.off('job_dispatch_wave_status', handleWaveStatus);
        SocketService.off(`job_dispatch_wave_status_${jobId}`, handleWaveStatus);
        SocketService.off('job_no_workers_available', handleNoWorkers);
        SocketService.off('job_assigned_client', handleWorkerAccepted);
        SocketService.off(`job_assigned_client_${jobId}`, handleWorkerAccepted);
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
                    const newJobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                    SocketService.emit('client_create_job_request', {
                      jobId: newJobId,
                      service: serviceName,
                      tier: 'Premium Worker',
                      location,
                      latitude,
                      longitude,
                      formattedAddress,
                      placeId,
                      date: dateStr,
                      price: priceStr,
                      clientInfo: {
                        userId: currentUser?._id || `client_${Date.now()}`,
                        name: currentUser?.fullName || 'Client User',
                        avatar: currentUser?.avatarUrl || '',
                        phone: currentUser?.phone || currentUser?.phoneNumber || '+91 99999 88888',
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
              <TouchableOpacity 
                onPress={() => setShowCancelModal(true)} 
                style={styles.backBtn}
                activeOpacity={0.7}
              >
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
                  Waiting for worker acceptance (Wave {waveInfo.wave}/3 • {waveSecondsLeft}s)
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
              activeOpacity={0.75}
              onPress={() => setShowCancelModal(true)}
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
              <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
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
              <Text style={styles.heroTitleBig}>Booking Confirmed</Text>
              <Text style={styles.heroSubText}>{serviceName} Found ✓</Text>
            </View>

            {/* Worker Assigned Card */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
              width: '100%',
            }}>
              <Image source={{ uri: assignedWorker.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200' }} style={{ width: 56, height: 56, borderRadius: 28 }} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontSize: 17, fontWeight: '800', color: '#0F172A' }}>{assignedWorker.name}</Text>
                <Text style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
                  ⭐ {assignedWorker.rating || 4.8} • {serviceName}
                </Text>
                <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '700', marginTop: 3 }}>
                  📍 {liveDistanceKm !== null ? `${liveDistanceKm} km away` : (assignedWorker.distanceKm !== null ? `${assignedWorker.distanceKm} km away` : 'Connecting GPS...')}
                </Text>
              </View>
              <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>ASSIGNED</Text>
              </View>
            </View>

            {/* Summary Card */}
            <View style={styles.summaryDetailsCard}>
              <View style={styles.summaryRow}>
                <Feather name="map-pin" size={18} color="#6B7280" style={styles.summaryRowIcon} />
                <View>
                  <Text style={styles.summaryLabel}>Arriving at</Text>
                  <Text style={styles.summaryValueBold}>{location}</Text>
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
            </View>

            <View style={{ flex: 1 }} />

            {/* Primary Action: Track Worker */}
            <TouchableOpacity 
              style={[styles.primaryGreenBtn, { backgroundColor: '#2563EB', marginBottom: 10 }]}
              onPress={() => setCurrentStep(8)}
            >
              <Text style={styles.primaryGreenBtnText}>🚗 Track Worker</Text>
            </TouchableOpacity>

            {/* Secondary Action: View Details */}
            <TouchableOpacity 
              style={styles.secondaryWhiteBtn}
              onPress={() => setCurrentStep(7)}
            >
              <Text style={styles.secondaryWhiteBtnText}>View Worker Profile</Text>
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
              <TouchableOpacity style={styles.callOutlinedBtn} onPress={() => Linking.openURL(`tel:${assignedWorker.phone || '9876543210'}`)}>
                <Feather name="phone" size={18} color="#111827" style={{ marginRight: 8 }} />
                <Text style={styles.callOutlinedBtnText}>Call</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.callOutlinedBtn} 
                onPress={() => setChatModalVisible(true)}
              >
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
      case 8: {
        const isArrived = workerJobStatus === 'WORKER_ARRIVED' || workerJobStatus === 'ARRIVED';
        return (
          <View style={styles.stepContainer}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Your {serviceName}</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Simulated Live Map Container */}
            <View style={styles.simulatedMapBox}>
              <Image 
                source={{ uri: getIndiaMapImageUrl(latitude, longitude, 15) }} 
                style={styles.mapBgImage} 
                contentFit="cover" 
              />
              <View style={styles.mapOverlayTint} />

              {/* Floating ETA Callout */}
              <View style={styles.floatingEtaCallout}>
                <Text style={styles.etaCalloutTitle}>{isArrived ? 'Status' : 'Arriving in'}</Text>
                <Text style={styles.etaCalloutTime}>{isArrived ? 'Arrived ✓' : (etaMinutes !== null ? `${etaMinutes} min` : 'Calculating...')}</Text>
              </View>

              {/* Client Destination Site Pin */}
              <View style={styles.mapDestinationPin}>
                <View style={styles.destinationPinBadge}>
                  <Feather name="map-pin" size={13} color="#DC2626" />
                  <Text style={styles.destinationPinText}>Your Site</Text>
                </View>
              </View>

              {/* Worker Real-Time Approaching Pin */}
              <View style={[
                styles.mapWorkerPin,
                isArrived
                  ? { top: '56%', left: '50%' }
                  : {
                      top: `${Math.max(22, Math.min(56, 56 - ((liveDistanceKm || 1.4) / 16) * 30))}%`,
                      left: `${Math.max(22, Math.min(50, 50 - ((liveDistanceKm || 1.4) / 16) * 26))}%`
                    }
              ]}>
                <Image source={{ uri: assignedWorker.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200' }} style={styles.pinAvatar} />
                <View style={styles.pinHatDot}>
                  <FontAwesome5 name="hard-hat" size={10} color="#F59E0B" />
                </View>
              </View>
            </View>

            {/* Bottom Sheet Card */}
            <View style={styles.trackingSheetCard}>
              {isArrived ? (
                <View style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                      <Feather name="check" size={14} color="#FFFFFF" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>{assignedWorker.name} has arrived!</Text>
                  </View>
                  <Text style={styles.trackingSheetSub}>Please meet your worker at {location}.</Text>
                </View>
              ) : (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.trackingSheetTitle}>{assignedWorker.name} is on the way</Text>
                  <Text style={styles.trackingSheetSub}>
                    ETA: {etaMinutes !== null ? `${etaMinutes} min` : 'Calculating...'} • Distance: {liveDistanceKm !== null ? `${liveDistanceKm} km` : 'Calculating...'}
                  </Text>
                </View>
              )}

              {/* Action Buttons Row */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <TouchableOpacity 
                  style={[styles.callOutlinedBtn, { flex: 1, height: 44 }]} 
                  onPress={() => Linking.openURL(`tel:${assignedWorker.phone || '9876543210'}`)}
                >
                  <Feather name="phone" size={16} color="#111827" style={{ marginRight: 6 }} />
                  <Text style={styles.callOutlinedBtnText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.callOutlinedBtn, { flex: 1, height: 44 }]} 
                  onPress={() => setChatModalVisible(true)}
                >
                  <Feather name="message-square" size={16} color="#111827" style={{ marginRight: 6 }} />
                  <Text style={styles.callOutlinedBtnText}>Message</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>
                Booking #{jobId ? jobId : 'ALV12345'}
              </Text>
            </View>
          </View>
        );
      }

      /* ================= STEP 9: WORK IN PROGRESS & COMPLETION ================= */
      case 9:
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContainerScroll}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Job Status</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.centerHeroGraphic}>
              <View style={[styles.bigCheckCircle, { backgroundColor: completionData ? '#DCFCE7' : '#EFF6FF' }]}>
                {completionData ? (
                  <Feather name="check" size={48} color="#10B981" />
                ) : (
                  <FontAwesome5 name="paint-roller" size={44} color="#2563EB" />
                )}
              </View>
            </View>

            <View style={styles.textCenterBlock}>
              <Text style={styles.heroTitleBig}>
                {completionData ? 'Work Completed' : `Your ${serviceName.toLowerCase()} is working`}
              </Text>
              <Text style={styles.heroSubText}>
                {completionData
                  ? `${assignedWorker.name} has submitted this job for completion.`
                  : `${assignedWorker.name} is currently working at ${location}.`}
              </Text>
            </View>

            {completionData ? (
              /* Review & Payment Section */
              <View style={{ width: '100%', marginTop: 10 }}>
                <View style={styles.detailsBreakdownCard}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 12 }}>
                    Payment Summary
                  </Text>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Service Charges</Text>
                    <Text style={styles.breakdownValueBold}>₹{completionData.finalAmount || 900}</Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Allver Platform Fee (10%)</Text>
                    <Text style={styles.breakdownValueBold}>₹{Math.round((Number(completionData.finalAmount) || 900) * 0.10)}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { fontWeight: '800', color: '#0F172A', fontSize: 15 }]}>
                      Total Payable
                    </Text>
                    <Text style={[styles.breakdownValueBold, { fontSize: 18, color: '#2563EB' }]}>
                      ₹{Number(completionData.finalAmount) || 900}
                    </Text>
                  </View>
                  {completionData.notes ? (
                    <Text style={{ fontSize: 12, color: '#64748B', marginTop: 10, fontStyle: 'italic' }}>
                      Worker Notes: "{completionData.notes}"
                    </Text>
                  ) : null}
                </View>

                {workerJobStatus === 'PAYMENT_PENDING' || workerJobStatus === 'CLIENT_CONFIRMED' ? (
                  /* Payment Method Selection */
                  <View style={{ marginTop: 14 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0F172A', marginBottom: 12, textAlign: 'center' }}>
                      Choose Payment Method
                    </Text>
                    
                    {/* CASH Button */}
                    <TouchableOpacity 
                      style={[styles.primaryGreenBtn, { backgroundColor: '#F59E0B', marginBottom: 10 }]}
                      onPress={() => {
                        const amount = Number(completionData?.finalAmount) || 900;
                        const msg = `Please pay ₹${amount} in cash directly to ${assignedWorker.name}. The worker will confirm receipt.`;
                        const handleCashConfirm = () => {
                          SocketService.emit('job_select_payment_method', { jobId, method: 'CASH' });
                          SocketService.emit('job_cash_confirmed', { 
                            jobId, 
                            amount
                          });
                          setWorkerJobStatus('PAYMENT_CONFIRMED');
                        };

                        if (Platform.OS === 'web') {
                          if (typeof window !== 'undefined' && window.confirm(msg)) {
                            handleCashConfirm();
                          }
                        } else {
                          Alert.alert('Pay with Cash', msg, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'I Paid Cash', onPress: handleCashConfirm }
                          ]);
                        }
                      }}
                    >
                      <FontAwesome5 name="money-bill-wave" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryGreenBtnText}>Pay Cash ₹{Number(completionData.finalAmount) || 900}</Text>
                    </TouchableOpacity>

                    {/* ONLINE Button */}
                    <TouchableOpacity 
                      style={[styles.primaryGreenBtn, { backgroundColor: '#2563EB', opacity: isPayingOnline ? 0.7 : 1 }]}
                      disabled={isPayingOnline}
                      onPress={async () => {
                        if (isPayingOnline) return;
                        setIsPayingOnline(true);
                        try {
                          SocketService.emit('job_select_payment_method', { jobId, method: 'ONLINE' });
                          
                          // 1. Obtain user token and profile
                          const token = await getToken();
                          const storedUser = await getStoredUser();

                          const clientPayAmount = Number(completionData?.finalAmount) || 750;

                          // 2. Call authoritative /api/payment/create-order
                          let createRes = await fetch(`${BACKEND_URL}/api/payment/create-order`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                            },
                            body: JSON.stringify({
                              jobId,
                              amount: clientPayAmount,
                              description: `Payment for ${serviceName} job`
                            })
                          });
                          let createData = await createRes.json();

                          // Fallback to /api/payment/create if create-order failed due to authorization header or session mismatch
                          if (!createRes.ok || !createData.success) {
                            console.warn('[Payment] /api/payment/create-order returned non-success, attempting fallback /create:', createData.message);
                            const fallbackRes = await fetch(`${BACKEND_URL}/api/payment/create`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                              },
                              body: JSON.stringify({
                                jobId,
                                amount: clientPayAmount,
                                description: `Payment for ${serviceName} job`
                              })
                            });
                            const fallbackData = await fallbackRes.json();
                            if (fallbackData.success && (fallbackData.payment || fallbackData.orderId)) {
                              createData = {
                                success: true,
                                orderId: fallbackData.payment?.orderId || fallbackData.orderId,
                                gatewayOrderId: fallbackData.payment?.paymentId || fallbackData.gatewayOrderId,
                                amountInPaise: fallbackData.payment?.amountInPaise || (fallbackData.payment?.amount ? Math.round(fallbackData.payment.amount * 100) : undefined),
                                currency: 'INR',
                                keyId: fallbackData.payment?.keyId || fallbackData.keyId
                              };
                            } else {
                              throw new Error(createData.message || fallbackData.message || 'Could not initiate payment order at gateway.');
                            }
                          }

                          const orderId = createData.orderId;
                          const gatewayOrderId = createData.gatewayOrderId;
                          const amountInPaise = createData.amountInPaise;
                          const currency = createData.currency || 'INR';
                          const keyId = createData.keyId;

                          if (!gatewayOrderId || !keyId) {
                            throw new Error('Payment gateway order was not initialized with valid credentials.');
                          }

                          // 3. Open Razorpay Native Checkout UI
                          const options = {
                            description: `Payment for ${serviceName} (#${jobId})`,
                            image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=200',
                            currency: currency,
                            key: keyId,
                            amount: amountInPaise,
                            name: 'Allver',
                            order_id: gatewayOrderId,
                            prefill: {
                              email: storedUser?.email || '',
                              contact: storedUser?.phoneNumber || storedUser?.phone || '',
                              name: storedUser?.fullName || 'Customer'
                            },
                            theme: { color: '#10B981' }
                          };

                          let checkoutResult: any;
                          try {
                            checkoutResult = await openRazorpayCheckout(options);
                          } catch (checkoutErr: any) {
                            console.log('[Razorpay Checkout Cancel/Error]:', checkoutErr);
                            // Razorpay returns error code (code 0 = Payment cancelled by user)
                            const isCancelled = checkoutErr?.code === 0 || checkoutErr?.description?.toLowerCase().includes('cancel');
                            if (isCancelled) {
                              Alert.alert('Payment Cancelled', 'You cancelled the checkout. The job remains pending payment.');
                            } else {
                              Alert.alert('Payment Incomplete', checkoutErr?.description || checkoutErr?.message || 'Payment could not be completed. Please try again.');
                            }
                            return; // Do NOT mark job as paid
                          }

                          const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = checkoutResult || {};
                          if (!razorpay_payment_id) {
                            Alert.alert('Payment Incomplete', 'No payment confirmation received from Razorpay.');
                            return;
                          }

                          // 4. Cryptographically verify and confirm payment with backend
                          let verifyRes = await fetch(`${BACKEND_URL}/api/payment/verify-payment`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                            },
                            body: JSON.stringify({
                              orderId,
                              gatewayOrderId: razorpay_order_id || gatewayOrderId,
                              gatewayPaymentId: razorpay_payment_id,
                              gatewaySignature: razorpay_signature,
                              jobId
                            })
                          });
                          let verifyData = await verifyRes.json();

                          // Fallback to /api/payment/verify if verify-payment had auth issue
                          if (!verifyRes.ok || !verifyData.success) {
                            console.warn('[Payment] /verify-payment returned error, attempting fallback /verify:', verifyData.message);
                            const fallbackVerifyRes = await fetch(`${BACKEND_URL}/api/payment/verify`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                              },
                              body: JSON.stringify({
                                orderId,
                                gatewayOrderId: razorpay_order_id || gatewayOrderId,
                                paymentId: razorpay_payment_id,
                                gatewaySignature: razorpay_signature,
                                jobId
                              })
                            });
                            verifyData = await fallbackVerifyRes.json();
                          }

                          // 5. Check authoritative server settlement confirmation
                          if (verifyData.success && (verifyData.status === 'PAID' || verifyData.verification?.status === 'PAID' || verifyData.verification?.verified)) {
                            SocketService.emit('job_online_payment_initiated', {
                              jobId,
                              paymentId: razorpay_payment_id,
                              orderId,
                              amount: amountInPaise ? amountInPaise / 100 : Number(completionData.finalAmount) || 900
                            });
                            setPaymentConfirmed(true);
                            setWorkerJobStatus('COMPLETED');
                            setCurrentStep(10);
                          } else {
                            Alert.alert('Payment Verification Failed', verifyData.message || 'Payment could not be verified by the server. Please contact support.');
                          }
                        } catch (err: any) {
                          Alert.alert('Payment Error', err.message || 'Something went wrong during payment processing.');
                        } finally {
                          setIsPayingOnline(false);
                        }
                      }}
                    >
                      <Feather name="credit-card" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryGreenBtnText}>
                        {isPayingOnline ? 'Processing Online Payment...' : `Pay Online ₹${Number(completionData.finalAmount) || 900}`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : workerJobStatus === 'PAYMENT_CONFIRMED' || workerJobStatus === 'SETTLED' || workerJobStatus === 'COMPLETED' ? (
                  /* Payment Confirmed / Settled */
                  <View style={{ marginTop: 14, alignItems: 'center' }}>
                    <View style={{ backgroundColor: '#DCFCE7', borderRadius: 50, padding: 16, marginBottom: 12 }}>
                      <Feather name="check-circle" size={40} color="#10B981" />
                    </View>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#10B981' }}>Payment Confirmed</Text>
                    <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center' }}>
                      Job settlement complete. Thank you!
                    </Text>
                    <TouchableOpacity 
                      style={[styles.primaryGreenBtn, { marginTop: 16 }]}
                      onPress={() => setCurrentStep(10)}
                    >
                      <Text style={styles.primaryGreenBtnText}>View Receipt & Rate</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* Confirm Completion Button */
                  <TouchableOpacity 
                    style={[styles.primaryGreenBtn, { backgroundColor: '#10B981', marginTop: 14 }]}
                    onPress={() => {
                      SocketService.emit('client_confirm_completion', { jobId });
                      setWorkerJobStatus('PAYMENT_PENDING');
                    }}
                  >
                    <Text style={styles.primaryGreenBtnText}>✓ Confirm Work Completed</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              /* Work in Progress Info */
              <View style={{ width: '100%', marginTop: 14 }}>
                <View style={styles.detailsBreakdownCard}>
                  <View style={styles.breakdownRow}>
                    <Feather name="clock" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                    <View>
                      <Text style={styles.breakdownLabel}>Work Started</Text>
                      <Text style={styles.breakdownValueBold}>
                        {workStartedAt ? new Date(workStartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '3:42 PM'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.breakdownRow}>
                    <Feather name="activity" size={18} color="#10B981" style={{ marginRight: 14 }} />
                    <View>
                      <Text style={styles.breakdownLabel}>Status</Text>
                      <Text style={[styles.breakdownValueBold, { color: '#059669' }]}>
                        ● Work in progress
                      </Text>
                    </View>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.breakdownRow}>
                    <Feather name="map-pin" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                    <View>
                      <Text style={styles.breakdownLabel}>Location</Text>
                      <Text style={styles.breakdownValueBold}>{location}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.secondaryWhiteBtn, { marginTop: 12 }]}
                  onPress={() => setChatModalVisible(true)}
                >
                  <Feather name="message-square" size={18} color="#111827" style={{ marginRight: 8 }} />
                  <Text style={styles.secondaryWhiteBtnText}>Contact Worker</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        );

      /* ================= STEP 10: JOB COMPLETED & RATING ================= */
      case 10:
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.stepContainerScroll}>
            <View style={styles.headerBar}>
              <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={styles.backBtn}>
                <Feather name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Job Completed</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.centerHeroGraphic}>
              <View style={styles.bigCheckCircle}>
                <Feather name="check" size={48} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.textCenterBlock}>
              <Text style={styles.heroTitleBig}>Payment & Job Completed!</Text>
              <Text style={styles.heroSubText}>Thank you for using Allver. Please rate your worker.</Text>
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
                  <Text style={styles.breakdownLabel}>Worker</Text>
                  <Text style={styles.breakdownValue}>{assignedWorker.name}</Text>
                </View>
              </View>

              <View style={styles.breakdownRow}>
                <Feather name="dollar-sign" size={18} color="#6B7280" style={{ marginRight: 14 }} />
                <View style={styles.rowFlexBetween}>
                  <Text style={styles.breakdownLabel}>Total Amount</Text>
                  <Text style={[styles.breakdownValue, { fontWeight: '800' }]}>
                    ₹{(completionData?.finalAmount ? Number(completionData.finalAmount) + 50 : null) || priceStr}
                  </Text>
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

            {/* Official Receipt & Invoice Buttons */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                style={[styles.secondaryWhiteBtn, { flex: 1, marginBottom: 0 }]}
                onPress={() => {
                  fetchReceipt();
                  setReceiptModalVisible(true);
                }}
              >
                <Feather name="file-text" size={16} color="#0F172A" style={{ marginRight: 6 }} />
                <Text style={styles.secondaryWhiteBtnText}>View Receipt</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryWhiteBtn, { flex: 1, marginBottom: 0, borderColor: '#10B981' }]}
                onPress={handleDownloadInvoice}
              >
                <Feather name="download" size={16} color="#059669" style={{ marginRight: 6 }} />
                <Text style={[styles.secondaryWhiteBtnText, { color: '#059669' }]}>Invoice PDF</Text>
              </TouchableOpacity>
            </View>

            {/* Star Rating Control */}
            <View style={styles.starRatingSection}>
              <Text style={styles.starRatingHeading}>Rate your worker</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setUserRating(star)} style={{ padding: 6 }}>
                    <Feather 
                      name="star" 
                      size={36} 
                      color={star <= userRating ? '#F59E0B' : '#E5E7EB'} 
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 14,
                  color: '#1E293B',
                  backgroundColor: '#F8FAFC',
                  marginTop: 12,
                  minHeight: 60,
                  textAlignVertical: 'top',
                }}
                placeholder="Leave feedback for worker (optional)..."
                placeholderTextColor="#94A3B8"
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
              />
            </View>

            <TouchableOpacity 
              style={[styles.primaryGreenBtn, { marginTop: 14 }]}
              disabled={isSubmittingRating}
              onPress={handleSubmitCustomerRating}
            >
              <Text style={styles.primaryGreenBtnText}>
                {isSubmittingRating ? 'Submitting...' : ratedSubmitted ? 'Rating Submitted ✓' : 'Submit Rating & Finish'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryWhiteBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.secondaryWhiteBtnText}>Return to Home</Text>
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

      {/* In-Place Direct Chat Modal */}
      <Modal
        visible={chatModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChatModalVisible(false)}
      >
        <SafeAreaView style={styles.chatModalContainer} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.chatModalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={styles.chatHeaderAvatarWrapper}>
                <Image
                  source={{ uri: assignedWorker.avatar || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200' }}
                  style={styles.chatHeaderAvatar}
                  contentFit="cover"
                />
                <View style={styles.chatOnlineDot} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.chatHeaderName} numberOfLines={1}>
                  {assignedWorker.name || 'Your Worker'}
                </Text>
                <Text style={styles.chatHeaderSub} numberOfLines={1}>
                  {serviceName} • Active on Job
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={styles.chatHeaderActionBtn}
                onPress={() => Linking.openURL(`tel:${assignedWorker.phone || '9876543210'}`)}
              >
                <Feather name="phone" size={18} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chatHeaderActionBtn, { backgroundColor: '#F1F5F9' }]}
                onPress={() => setChatModalVisible(false)}
              >
                <Feather name="x" size={20} color="#334155" />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          >
            {/* Chat Body */}
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatScrollContent}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
            >
              {/* Privacy / Job Badge */}
              <View style={styles.chatEncryptionNotice}>
                <Feather name="shield" size={12} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={styles.chatEncryptionNoticeText}>
                  Direct communication for Booking #{jobId ? jobId : 'ALV12345'}
                </Text>
              </View>

              {isLoadingChat ? (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 8 }}>
                    Connecting to live chat...
                  </Text>
                </View>
              ) : chatMessages.length === 0 ? (
                <View style={styles.chatEmptyContainer}>
                  <View style={styles.chatEmptyIconCircle}>
                    <Feather name="message-circle" size={32} color="#2563EB" />
                  </View>
                  <Text style={styles.chatEmptyTitle}>Chat directly with {assignedWorker.name}</Text>
                  <Text style={styles.chatEmptySubtitle}>
                    Send messages about your address, gate directions, or landmark updates.
                  </Text>
                </View>
              ) : (
                chatMessages.map((msg, index) => {
                  const effectiveUserId = (global as any).currentUser?._id || '6a4ed79a6d874a11031e34da';
                  const isSenderMe =
                    (msg.sender?._id && (msg.sender._id === effectiveUserId || msg.sender._id === '6a4ed79a6d874a11031e34da')) ||
                    msg.sender === effectiveUserId ||
                    msg.sender === 'client' ||
                    msg.sender?.role === 'client' ||
                    msg.isMe;

                  const timeStr = msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Now';

                  return (
                    <View
                      key={(msg._id ? String(msg._id) : (msg.tempId || 'msg')) + `_${index}`}
                      style={[
                        styles.chatBubbleRow,
                        isSenderMe ? styles.chatBubbleRowMe : styles.chatBubbleRowOther,
                      ]}
                    >
                      <View
                        style={[
                          styles.chatBubble,
                          isSenderMe ? styles.chatBubbleMe : styles.chatBubbleOther,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chatBubbleText,
                            isSenderMe ? styles.chatBubbleTextMe : styles.chatBubbleTextOther,
                          ]}
                        >
                          {msg.text}
                        </Text>
                        <Text
                          style={[
                            styles.chatBubbleTime,
                            isSenderMe ? styles.chatBubbleTimeMe : styles.chatBubbleTimeOther,
                          ]}
                        >
                          {timeStr}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Quick Action Chips */}
            <View style={styles.chatChipsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {[
                  'Where are you right now?',
                  'I am waiting at the gate',
                  'Please call when you reach',
                  'Near the building entrance',
                ].map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.chatChipBtn}
                    onPress={() => handleSendChatMessage(chip)}
                  >
                    <Text style={styles.chatChipText}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Input Composer */}
            <View style={styles.chatInputBar}>
              <TextInput
                style={styles.chatTextInput}
                placeholder={`Message ${assignedWorker.name || 'worker'}...`}
                placeholderTextColor="#94A3B8"
                value={chatInputText}
                onChangeText={setChatInputText}
                multiline
                maxLength={400}
              />
              <TouchableOpacity
                style={[
                  styles.chatSendBtn,
                  { backgroundColor: chatInputText.trim() ? '#2563EB' : '#CBD5E1' },
                ]}
                disabled={!chatInputText.trim() || isSendingMessage}
                onPress={() => handleSendChatMessage()}
              >
                {isSendingMessage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Official In-App Receipt Modal */}
      <Modal
        visible={receiptModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top', 'bottom']}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="check-circle" size={22} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A' }}>Payment Receipt</Text>
            </View>
            <TouchableOpacity onPress={() => setReceiptModalVisible(false)} style={{ padding: 4 }}>
              <Feather name="x" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {isLoadingReceipt ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ marginTop: 12, color: '#64748B', fontSize: 14 }}>Loading receipt...</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
                {/* Header Banner */}
                <View style={{ backgroundColor: '#059669', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View>
                    <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800' }}>Allver</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
                      {receiptData?.businessDetails?.isGstRegistered && receiptData?.businessDetails?.gstin
                        ? 'Official Tax Invoice & Payment Receipt'
                        : 'Official Payment Receipt'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 11 }}>PAID</Text>
                  </View>
                </View>

                <View style={{ padding: 20 }}>
                  {/* Meta details */}
                  <View style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Receipt No.</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>
                        {receiptData?.receiptNumber || `ALV-${new Date().getFullYear()}-XXXXXX`}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Job ID</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>#{jobId}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Worker / Partner</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>
                        {receiptData?.workerName || assignedWorker?.name || 'Service Partner'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>Service</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#0F172A' }}>{serviceName}</Text>
                    </View>
                  </View>

                  {/* Pricing Breakdown */}
                  <View style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: '#334155' }}>Service Standard Rate</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                        ₹{receiptData?.baseAmount || (completionData?.finalAmount ? Number(completionData.finalAmount) : 900)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: '#334155' }}>Platform Convenience Fee</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                        ₹{receiptData?.platformFee || 0}
                      </Text>
                    </View>
                  </View>

                  {/* Total Amount */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Total Paid</Text>
                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#059669' }}>
                      ₹{receiptData?.totalAmount || (completionData?.finalAmount ? Number(completionData.finalAmount) : 900)}
                    </Text>
                  </View>

                  {/* Payment Metadata */}
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginTop: 16, gap: 6 }}>
                    <Text style={{ fontSize: 11, color: '#64748B' }}>
                      Payment Method: <Text style={{ fontWeight: '700', color: '#1E293B' }}>{receiptData?.paymentMethod || 'Online UPI'}</Text>
                    </Text>
                    {receiptData?.gatewayPaymentId ? (
                      <Text style={{ fontSize: 11, color: '#64748B' }}>
                        Ref ID: <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#1E293B' }}>{receiptData.gatewayPaymentId}</Text>
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Footer */}
                <View style={{ backgroundColor: '#F1F5F9', padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                    {receiptData?.businessDetails?.companyName || 'Allver Technologies Pvt. Ltd.'}
                    {receiptData?.businessDetails?.isGstRegistered && receiptData?.businessDetails?.gstin
                      ? ` • GSTIN: ${receiptData.businessDetails.gstin}`
                      : ''}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryGreenBtn, { marginTop: 20, flexDirection: 'row', gap: 8 }]}
              onPress={handleDownloadInvoice}
            >
              <Feather name="download" size={18} color="#FFFFFF" />
              <Text style={styles.primaryGreenBtnText}>Download Printable PDF</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Cancel Search Confirmation Modal (Works on Web & Native) */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.cancelModalBackdrop}>
          <View style={styles.cancelModalCard}>
            <View style={styles.cancelModalIconWrap}>
              <Feather name="alert-triangle" size={28} color="#EF4444" />
            </View>
            <Text style={styles.cancelModalTitle}>Cancel Search?</Text>
            <Text style={styles.cancelModalDesc}>
              Are you sure you want to cancel searching for {serviceName.toLowerCase()} workers?
            </Text>
            <View style={styles.cancelModalBtnRow}>
              <TouchableOpacity
                style={styles.cancelModalKeepBtn}
                onPress={() => setShowCancelModal(false)}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelModalKeepText}>Keep Searching</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelModalConfirmBtn}
                onPress={() => {
                  setShowCancelModal(false);
                  performCancelSearch();
                }}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelModalConfirmText}>Cancel Search</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    width: '100%',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  cancelRequestText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },

  /* CANCEL SEARCH MODAL */
  cancelModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  cancelModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 10,
  },
  cancelModalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  cancelModalTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  cancelModalDesc: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  cancelModalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelModalKeepBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  cancelModalKeepText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  cancelModalConfirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } as any : {}),
  },
  cancelModalConfirmText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
    backgroundColor: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#CBD5E1',
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
    zIndex: 3,
  },
  mapDestinationPin: {
    position: 'absolute',
    top: '56%',
    left: '50%',
    marginLeft: -42,
    marginTop: -15,
    zIndex: 2,
  },
  destinationPinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F87171',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  destinationPinText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 3,
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
  // In-Place Chat Modal Styles
  chatModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  chatModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  chatHeaderAvatarWrapper: {
    position: 'relative',
  },
  chatHeaderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
  },
  chatOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  chatHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  chatHeaderActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatScroll: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  chatScrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  chatEncryptionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  chatEncryptionNoticeText: {
    fontSize: 11,
    color: '#15803D',
    fontWeight: '600',
  },
  chatEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  chatEmptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  chatEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  chatEmptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  chatBubbleRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  chatBubbleRowMe: {
    justifyContent: 'flex-end',
  },
  chatBubbleRowOther: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  chatBubbleMe: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  chatBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatBubbleTextMe: {
    color: '#FFFFFF',
  },
  chatBubbleTextOther: {
    color: '#0F172A',
  },
  chatBubbleTime: {
    fontSize: 10,
    marginTop: 4,
  },
  chatBubbleTimeMe: {
    color: '#BFDBFE',
    textAlign: 'right',
  },
  chatBubbleTimeOther: {
    color: '#94A3B8',
    textAlign: 'left',
  },
  chatChipsContainer: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chatChipBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chatChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0F172A',
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
