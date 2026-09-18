import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Linking,
  Platform,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  BackHandler,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';

import SocketService from '../utils/SocketService';
import { getIndiaMapImageUrl } from '../utils/GeocodingService';
import { Fonts } from '../constants/theme';
import { BACKEND_URL } from '../constants/Config';
import { getToken, getStoredUser } from '../constants/Auth';

const { width } = Dimensions.get('window');

function parsePlatformRate(priceVal: any, pricingEstimate?: any): number {
  if (pricingEstimate?.minDailyRate) {
    const minD = Number(pricingEstimate.minDailyRate);
    if (!isNaN(minD) && minD > 0 && minD < 100000) return minD;
  }
  if (priceVal) {
    const match = String(priceVal).match(/₹?\s*([\d,]+)/);
    if (match && match[1]) {
      const parsed = parseInt(match[1].replace(/,/g, ''), 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) return parsed;
    }
  }
  return 800; // fallback standard rate for Thane/Kalwa
}

export type WorkerJobStatus =
  | 'SEARCHING'
  | 'WORKER_ACCEPTED'
  | 'JOB_ACCEPTED'
  | 'ACCEPTED'
  | 'WORKER_EN_ROUTE'
  | 'TRAVELLING'
  | 'WORKER_ARRIVED'
  | 'ARRIVED'
  | 'WORK_STARTED'
  | 'WORK_IN_PROGRESS'
  | 'WORK_COMPLETION_REQUESTED'
  | 'COMPLETION_SUBMITTED'
  | 'CLIENT_CONFIRMED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'SETTLED'
  | 'PAYMENT_COMPLETED'
  | 'COMPLETED'
  | 'PAYMENT_RECEIVED'
  | 'CANCELLED'
  | 'ARCHIVED';

export default function ActiveJobScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const userInitiatedCancelRef = useRef(false);
  const params = useLocalSearchParams();

  const jobId = (params.jobId as string) || '';
  let initialJobData: any = {};
  if (params.jobData) {
    try {
      initialJobData = JSON.parse(params.jobData as string);
    } catch (e) {}
  }

  const [job, setJob] = useState<any>({
    jobId,
    service: initialJobData.service || 'Painting',
    location: initialJobData.location || initialJobData.formattedAddress || 'Kalwa, Thane',
    latitude: initialJobData.latitude || 19.1982,
    longitude: initialJobData.longitude || 72.9968,
    formattedAddress: initialJobData.formattedAddress || initialJobData.location || 'Kalwa, Thane',
    price: initialJobData.price || '₹900',
    date: initialJobData.date || 'Today',
    clientInfo: initialJobData.clientInfo || {
      name: 'Client',
      phone: '',
      avatar: '',
    },
    route: initialJobData.route || { distance: 1.4, duration: 6 },
    chatId: initialJobData.chatId || null,
    status: initialJobData.status || 'WORKER_ACCEPTED',
    paymentMethod: initialJobData.paymentMethod || null,
  });

  const [status, setStatus] = useState<WorkerJobStatus>(
    (initialJobData.status as WorkerJobStatus) || 'WORKER_ACCEPTED'
  );

  // Live worker GPS coordinates
  const [workerCoords, setWorkerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distanceToClientKm, setDistanceToClientKm] = useState<number>(
    initialJobData.route?.distance || 1.4
  );

  // Stopwatch timer for WORK_STARTED / WORK_IN_PROGRESS
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  // Work completion submission modal
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const platformAmount = useMemo(() => {
    return parsePlatformRate(job.price, job.pricingEstimate);
  }, [job.price, job.pricingEstimate]);
  const finalAmount = job.completionData?.finalAmount || platformAmount;
  const [workNotes, setWorkNotes] = useState('');

  // In-place chat state
  const [workerChatModalVisible, setWorkerChatModalVisible] = useState(false);
  const [workerChatMessages, setWorkerChatMessages] = useState<any[]>([]);
  const [workerChatInput, setWorkerChatInput] = useState('');
  const [isSendingWorkerChat, setIsSendingWorkerChat] = useState(false);
  const workerChatScrollRef = useRef<any>(null);

  // Cancel Job Modal
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('Client unreachable');
  const [isCashSubmitting, setIsCashSubmitting] = useState(false);

  // Track last alerted status to prevent repeated blocking alert dialogs
  const lastAlertedStatusRef = useRef<string | null>(null);

  // Location streaming interval for EN_ROUTE state
  const locIntervalRef = useRef<any>(null);

  // Join shared job room and listen to authoritative events
  useEffect(() => {
    if (jobId) {
      SocketService.joinRoom(`job:${jobId}`);
    }
    if (job.chatId) {
      SocketService.joinRoom(`chat:${job.chatId}`);
    }

    // 1. Fetch authoritative job state from server on mount
    SocketService.emit('get_active_job', { jobId }, (res: any) => {
      if (res && res.success && res.job) {
        setJob((prev: any) => ({ ...prev, ...res.job }));
        if (res.job.status && res.job.status !== 'SEARCHING') {
          setStatus(res.job.status as WorkerJobStatus);
        }
        if (res.job.route?.distance) {
          setDistanceToClientKm(res.job.route.distance);
        }
        if (res.job.chatId) {
          SocketService.joinRoom(`chat:${res.job.chatId}`);
        }
      }
    });

    // 2. Authoritative state change listener
    const handleStatusChanged = (data: any) => {
      if (data && data.jobId === jobId) {
        console.log('[ActiveJob] Authoritative job status changed:', data.status);
        setStatus(data.status as WorkerJobStatus);
        if (data.route?.distance) {
          setDistanceToClientKm(data.route.distance);
        }
        if (data.chatId) {
          setJob((prev: any) => ({ ...prev, chatId: data.chatId }));
          SocketService.joinRoom(`chat:${data.chatId}`);
        }
        if (data.payment) {
          setJob((prev: any) => ({ ...prev, payment: data.payment, paymentMethod: data.paymentMethod || prev.paymentMethod }));
        }

        // Only alert once per state transition to prevent alert stacking / freeze on mobile
        if (lastAlertedStatusRef.current !== data.status) {
          lastAlertedStatusRef.current = data.status;

          if (data.status === 'CANCELLED' || data.status === 'CANCELLED_BY_CLIENT' || data.status === 'CANCELLED_BY_WORKER') {
            const shouldAlert = !userInitiatedCancelRef.current && isFocusedRef.current;
            if (isFocusedRef.current) {
              router.replace('/(tabs)');
            }
            if (shouldAlert) {
              Alert.alert('Job Cancelled', data.reason || 'This booking has been cancelled.', [
                { text: 'OK' }
              ], { cancelable: true });
            }
          }
        }
      }
    };

    // 3. Status updated listener (backwards compatibility)
    const handleStatusUpdated = (data: any) => {
      if (data && data.jobId === jobId) {
        setStatus(data.status as WorkerJobStatus);
      }
    };

    const handleCompletedConfirmed = (data: any) => {
      if (data && data.jobId === jobId) {
        setStatus('PAYMENT_PENDING');
      }
    };

    const handlePaymentCompleted = (data: any) => {
      if (data && data.jobId === jobId) {
        setStatus('COMPLETED');
        if (lastAlertedStatusRef.current !== 'COMPLETED') {
          lastAlertedStatusRef.current = 'COMPLETED';
          Alert.alert(
            '💰 Payment Received!',
            `Payment of ₹${data.payment?.amount || finalAmount} received successfully.`,
            [
              {
                text: 'Finish & Return to Dashboard',
                onPress: () => router.replace('/(tabs)'),
              },
            ]
          );
        }
      }
    };

    const handleJobSettled = (data: any) => {
      if (data && data.jobId === jobId) {
        setStatus('SETTLED');
      }
    };

    SocketService.on('job_status_changed', handleStatusChanged);
    SocketService.on('job_status_updated', handleStatusUpdated);
    SocketService.on(`job_status_updated_${jobId}`, handleStatusUpdated);
    SocketService.on('job_completed_confirmed', handleCompletedConfirmed);
    SocketService.on(`job_completed_confirmed_${jobId}`, handleCompletedConfirmed);
    SocketService.on('job_payment_completed', handlePaymentCompleted);
    SocketService.on(`job_payment_completed_${jobId}`, handlePaymentCompleted);
    SocketService.on('job_settled', handleJobSettled);
    SocketService.on(`job_settled_${jobId}`, handleJobSettled);

    // Fetch authoritative state on mount and on reconnect
    const syncActiveJob = () => {
      SocketService.emit('get_active_job', { jobId }, (res: any) => {
        if (res && res.success && res.job) {
          const jobData = res.job;
          console.log('[ActiveJob] Reconciled active job from backend:', jobData.status);
          if (jobData.status) {
            setStatus(jobData.status as WorkerJobStatus);
            setJob((prev: any) => ({ ...prev, ...jobData }));
          }
        }
      });
    };

    syncActiveJob();
    SocketService.on('connect', syncActiveJob);

    return () => {
      SocketService.off('connect', syncActiveJob);
      SocketService.off('job_status_changed', handleStatusChanged);
      SocketService.off('job_status_updated', handleStatusUpdated);
      SocketService.off(`job_status_updated_${jobId}`, handleStatusUpdated);
      SocketService.off('job_completed_confirmed', handleCompletedConfirmed);
      SocketService.off(`job_completed_confirmed_${jobId}`, handleCompletedConfirmed);
      SocketService.off('job_payment_completed', handlePaymentCompleted);
      SocketService.off(`job_payment_completed_${jobId}`, handlePaymentCompleted);
      SocketService.off('job_settled', handleJobSettled);
      SocketService.off(`job_settled_${jobId}`, handleJobSettled);
      if (timerRef.current) clearInterval(timerRef.current);
      if (locIntervalRef.current) clearInterval(locIntervalRef.current);
    };
  }, [jobId, job.chatId]);

  // Handle WORK_STARTED / WORK_IN_PROGRESS timer
  useEffect(() => {
    const isWorking = status === 'WORK_STARTED' || status === 'WORK_IN_PROGRESS';
    if (isWorking) {
      if (job.startedAt) {
        const diffSecs = Math.max(0, Math.floor((Date.now() - new Date(job.startedAt).getTime()) / 1000));
        setElapsedSeconds(diffSecs);
      }
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, job.startedAt]);

  // Handle periodic real GPS streaming while EN_ROUTE / TRAVELLING
  useEffect(() => {
    const isEnRoute = status === 'WORKER_EN_ROUTE' || status === 'TRAVELLING';
    if (isEnRoute) {
      const sendLocation = async () => {
        try {
          let user = (global as any).currentUser;
          const { status: perm } = await Location.getForegroundPermissionsAsync();
          if (perm === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            if (loc && loc.coords) {
              setWorkerCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

              // Emit authoritative real GPS update to backend
              SocketService.emit('worker_location_update', {
                jobId,
                workerId: user?._id,
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                heading: loc.coords.heading || 0,
                speed: loc.coords.speed || 0,
                timestamp: Date.now()
              });

              // Calculate distance to client
              const clientLat = job.latitude || 19.1982;
              const clientLng = job.longitude || 72.9968;
              const R = 6371;
              const dLat = ((clientLat - loc.coords.latitude) * Math.PI) / 180;
              const dLon = ((clientLng - loc.coords.longitude) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((loc.coords.latitude * Math.PI) / 180) *
                  Math.cos((clientLat * Math.PI) / 180) *
                  Math.sin(dLon / 2) *
                  Math.sin(dLon / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const dist = Math.round(R * c * 10) / 10;
              setDistanceToClientKm(dist);
            }
          }
        } catch (e) {
          console.warn('[ActiveJob] Location sync error:', e);
        }
      };

      sendLocation();
      locIntervalRef.current = setInterval(sendLocation, 6000);
    } else {
      if (locIntervalRef.current) clearInterval(locIntervalRef.current);
    }

    return () => {
      if (locIntervalRef.current) clearInterval(locIntervalRef.current);
    };
  }, [status, jobId, job.latitude, job.longitude]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format start time string
  const formatStartTime = (ts: any) => {
    if (!ts) return 'Just now';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // --- ACTIONS ---

  const handleStartNavigation = () => {
    const lat = job.latitude || 19.1982;
    const lng = job.longitude || 72.9968;
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `google.navigation:q=${lat},${lng}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    Linking.openURL(url as string).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    });
  };

  const handleStartTravelling = () => {
    setStatus('WORKER_EN_ROUTE');
    SocketService.emit('worker_start_trip', { jobId });
    SocketService.emit('worker_update_job_status', { jobId, status: 'WORKER_EN_ROUTE' });
  };

  const handleConfirmArrival = () => {
    setStatus('WORKER_ARRIVED');
    SocketService.emit('worker_arrived', { jobId });
    SocketService.emit('worker_update_job_status', { jobId, status: 'WORKER_ARRIVED' });
  };

  const handleStartWork = () => {
    setStatus('WORK_STARTED');
    setElapsedSeconds(0);
    SocketService.emit('worker_start_work', { jobId });
    SocketService.emit('worker_update_job_status', {
      jobId,
      status: 'WORK_STARTED',
      meta: { startedAt: Date.now() },
    });
  };

  const handleSubmitCompletion = () => {
    setCompleteModalVisible(false);
    setStatus('WORK_COMPLETION_REQUESTED');
    SocketService.emit('worker_submit_completion', {
      jobId,
      finalAmount: platformAmount,
      notes: workNotes,
      photos: [],
    });
  };

  const handleConfirmCashReceived = () => {
    Alert.alert(
      'Confirm Cash Received',
      `Did you receive ₹${platformAmount} in cash directly from ${clientName}?\n\nAllver commission of 10% (₹${Math.round(platformAmount * 0.1)}) will be deducted from your wallet balance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Yes, Received ₹${platformAmount}`,
          onPress: () => {
            setIsCashSubmitting(true);
            SocketService.emit('job_cash_confirmed', {
              jobId,
              amount: platformAmount,
            });
            setTimeout(() => setIsCashSubmitting(false), 2000);
          },
        },
      ]
    );
  };

  const handleCancelJob = () => {
    Alert.alert(
      'Confirm Cancellation',
      `Are you sure you want to cancel this booking?\nReason: ${cancelReason}`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Confirm Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              SocketService.emit('client_cancel_job_request', { jobId });
              SocketService.emit('worker_cancel_job', {
                jobId,
                reason: cancelReason,
              });
              await fetch(`${BACKEND_URL}/api/jobs/${jobId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: cancelReason, cancelledBy: 'client' })
              }).catch(() => {});
            } catch (e) {}

            userInitiatedCancelRef.current = true;
            setCancelModalVisible(false);
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const handleCancelSearch = () => {
    Alert.alert(
      'Cancel Search',
      'Are you sure you want to cancel searching for workers?',
      [
        { text: 'Keep Searching', style: 'cancel' },
        {
          text: 'Cancel Search',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Emit socket cancel events
              SocketService.emit('client_cancel_job_request', { jobId });
              SocketService.emit('cancel_job', { jobId, reason: 'Client cancelled search' });
              
              // 2. Fallback REST API call
              await fetch(`${BACKEND_URL}/api/jobs/${jobId}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Client cancelled search', cancelledBy: 'client' })
              }).catch(() => {});
            } catch (e) {}

            Alert.alert('Search Cancelled', 'Your job search request has been cancelled.', [
              { text: 'OK', onPress: () => router.replace('/(tabs)') }
            ]);
          }
        }
      ]
    );
  };


  // Load conversation messages and join rooms when worker chat modal opens
  useEffect(() => {
    if (!workerChatModalVisible) return;

    let targetConvoId = job.chatId;
    const workerUserId = '6a4f0c7d30034d5c126f259e';
    const clientUserId = job.clientUserId || job.clientId || (job.clientInfo?._id) || '6a4ed79a6d874a11031e34da';

    const loadMessages = async () => {
      try {
        if (!targetConvoId) {
          const convRes = await fetch(`${BACKEND_URL}/api/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: workerUserId,
              receiverId: clientUserId,
            }),
          });
          const convData = await convRes.json();
          if (convData.conversation?._id) {
            targetConvoId = convData.conversation._id;
            setJob((prev: any) => ({ ...prev, chatId: targetConvoId }));
          }
        }

        if (targetConvoId) {
          SocketService.emit('join_room', { roomId: targetConvoId });
          SocketService.emit('join_room', { roomId: `chat:${targetConvoId}` });

          const msgRes = await fetch(`${BACKEND_URL}/api/conversations/${targetConvoId}/messages`);
          if (msgRes.ok) {
            const data = await msgRes.json();
            if (Array.isArray(data.messages)) {
              setWorkerChatMessages(data.messages);
            }
          }
        }
      } catch (err) {
        console.warn('[ActiveJob] Error loading chat messages:', err);
      } finally {
        setTimeout(() => workerChatScrollRef.current?.scrollToEnd({ animated: false }), 250);
      }
    };

    loadMessages();
  }, [workerChatModalVisible, job.chatId]);

  // Real-time socket listener for incoming chat messages
  useEffect(() => {
    const handleReceiveMessage = (data: any) => {
      if (!data || !data.message) return;
      const convoMatch =
        (job.chatId && (data.conversationId === job.chatId || data.workspaceId === job.chatId || data.roomId === job.chatId)) ||
        (data.roomId && (data.roomId === `job:${jobId}` || data.roomId === jobId));

      if (convoMatch || !job.chatId) {
        const msg = data.message;
        const workerUserId = '6a4f0c7d30034d5c126f259e';
        const msgSender = msg.sender && typeof msg.sender === 'object' ? msg.sender._id : msg.sender;

        // Skip our own message from socket echo if already added optimistically
        if (msgSender && String(msgSender) === String(workerUserId)) {
          if (msg._id && (msg.tempId || data.tempId)) {
            const matchTempId = msg.tempId || data.tempId;
            setWorkerChatMessages((prev) => {
              const alreadyHasReal = prev.some((m) => m._id === msg._id && m.tempId !== matchTempId);
              if (alreadyHasReal) {
                return prev.filter((m) => m.tempId !== matchTempId);
              }
              return prev.map((m) => (m.tempId === matchTempId ? { ...m, _id: msg._id } : m));
            });
          }
          return;
        }

        setWorkerChatMessages((prev) => {
          const exists = prev.some(
            (m) =>
              (m._id && msg._id && String(m._id) === String(msg._id)) ||
              (m.tempId && msg.tempId && String(m.tempId) === String(msg.tempId)) ||
              (m.tempId && data.tempId && String(m.tempId) === String(data.tempId))
          );
          if (exists) return prev;
          return [...prev, msg];
        });
        setTimeout(() => workerChatScrollRef.current?.scrollToEnd({ animated: true }), 100);
      }
    };

    SocketService.on('receive_message', handleReceiveMessage);
    return () => {
      SocketService.off('receive_message', handleReceiveMessage);
    };
  }, [job.chatId, jobId]);

  const handleSendWorkerChatMessage = async (presetText?: string) => {
    const textToSend = (presetText || workerChatInput).trim();
    if (!textToSend || isSendingWorkerChat) return;

    if (!presetText) setWorkerChatInput('');
    setIsSendingWorkerChat(true);

    let targetConvoId = job.chatId;
    const workerUserId = '6a4f0c7d30034d5c126f259e';
    const clientUserId = job.clientUserId || job.clientId || (job.clientInfo?._id) || '6a4ed79a6d874a11031e34da';

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const optimisticMsg = {
      _id: tempId,
      tempId,
      sender: { _id: workerUserId, fullName: 'Akash Chauhan', role: 'Worker' },
      text: textToSend,
      createdAt: new Date().toISOString(),
    };

    setWorkerChatMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => workerChatScrollRef.current?.scrollToEnd({ animated: true }), 80);

    try {
      if (!targetConvoId) {
        const convRes = await fetch(`${BACKEND_URL}/api/conversations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: workerUserId,
            receiverId: clientUserId,
          }),
        });
        const convData = await convRes.json();
        if (convData.conversation?._id) {
          targetConvoId = convData.conversation._id;
          setJob((prev: any) => ({ ...prev, chatId: targetConvoId }));
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
            senderId: workerUserId,
            text: textToSend,
            tempId,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const realId = data.message?._id;
          if (realId) {
            setWorkerChatMessages((prev) => {
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
      console.error('[ActiveJob] Send chat error:', err);
    } finally {
      setIsSendingWorkerChat(false);
    }
  };

  const handleOpenChat = () => {
    setWorkerChatModalVisible(true);
  };


  // Safe back press protection (prevents silent job abandonment)
  const handleBackPress = () => {
    const isTerminal = ['COMPLETED', 'SETTLED', 'PAYMENT_RECEIVED', 'CANCELLED', 'ARCHIVED'].includes(status);
    if (!isTerminal) {
      Alert.alert(
        'Active Job In Progress',
        'Your job is active. You can minimize the console and return to the Dashboard. Your progress will NOT be lost.',
        [
          { text: 'Stay on Job', style: 'cancel' },
          {
            text: 'Minimize Console',
            onPress: () => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)');
              }
            }
          }
        ]
      );
    } else {
      router.replace('/(tabs)');
    }
  };

  // Android hardware back button protection
  useEffect(() => {
    const onBackPress = () => {
      handleBackPress();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [status]);

  // Authoritative active job hydrate on mount, app resume, and socket reconnect
  useEffect(() => {
    const fetchActiveJob = async () => {
      try {
        const token = await getToken();
        let url = `${BACKEND_URL}/api/worker/active-job`;
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
          const active = data.activeJob || data.job;
          if (active) {
            setJob((prev: any) => ({ ...prev, ...active }));
            if (active.status) {
              setStatus(active.status as WorkerJobStatus);
            }
          }
        }
      } catch (e) {
        console.warn('[ActiveJob] Fetch active job failed:', e);
      }
    };

    fetchActiveJob();

    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchActiveJob();
      }
    });

    SocketService.on('connect', fetchActiveJob);
    SocketService.on('reconnect', fetchActiveJob);
    SocketService.on('job_status_changed', fetchActiveJob);
    SocketService.on('job_payment_completed', fetchActiveJob);

    return () => {
      appStateSub.remove();
      SocketService.off('connect', fetchActiveJob);
      SocketService.off('reconnect', fetchActiveJob);
      SocketService.off('job_status_changed', fetchActiveJob);
      SocketService.off('job_payment_completed', fetchActiveJob);
    };
  }, [jobId]);

  const clientName = job.clientInfo?.name || job.clientInfo?.fullName || 'Sushil Maurya';
  const clientPhone = job.clientInfo?.phone || '+91 85910 88873';
  const isSearchingStage = status === 'SEARCHING' || status === 'FINDING_WORKER' || status === 'PENDING';
  const isAcceptedStage = status === 'WORKER_ACCEPTED' || status === 'JOB_ACCEPTED' || status === 'ACCEPTED';
  const isEnRouteStage = status === 'WORKER_EN_ROUTE' || status === 'TRAVELLING';
  const isArrivedStage = status === 'WORKER_ARRIVED' || status === 'ARRIVED';
  const isWorkingStage = status === 'WORK_STARTED' || status === 'WORK_IN_PROGRESS';
  const isCompletionSubmitted = status === 'WORK_COMPLETION_REQUESTED' || status === 'COMPLETION_SUBMITTED';
  const isPendingPayment = status === 'CLIENT_CONFIRMED' || status === 'PAYMENT_PENDING';
  const isJobCompleted = status === 'COMPLETED' || status === 'PAYMENT_COMPLETED' || status === 'PAYMENT_RECEIVED' || status === 'SETTLED' || status === 'PAYMENT_CONFIRMED';
  const canCancelJob = isSearchingStage || isAcceptedStage || isEnRouteStage || isArrivedStage || isWorkingStage;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Job Console</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>
            {status.replace(/_/g, ' ')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Client & Service Card */}
        <View style={styles.clientCard}>
          <View style={styles.clientRow}>
            <Image
              source={{
                uri:
                  job.clientInfo?.avatar ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150',
              }}
              style={styles.clientAvatar}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.clientName}>{clientName}</Text>
              <Text style={styles.serviceSubtitle}>{job.service} Service</Text>
              <View style={styles.locationPinRow}>
                <Feather name="map-pin" size={13} color="#64748B" />
                <Text style={styles.locationText} numberOfLines={1}>
                  {job.formattedAddress || job.location}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Communication Buttons */}
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => Linking.openURL(`tel:${clientPhone}`)}
            >
              <Feather name="phone" size={16} color="#2563EB" />
              <Text style={styles.contactBtnText}>Call Client</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactBtn, { marginLeft: 10 }]}
              onPress={handleOpenChat}
            >
              <Feather name="message-square" size={16} color="#059669" />
              <Text style={[styles.contactBtnText, { color: '#059669' }]}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <Image
            source={{ uri: getIndiaMapImageUrl(job.latitude || 19.1982, job.longitude || 72.9968, 15) }}
            style={styles.mapImage}
            contentFit="cover"
          />
          <View style={styles.mapOverlay}>
            <View style={styles.destinationPin}>
              <Feather name="map-pin" size={18} color="#DC2626" />
              <Text style={styles.pinText}>Client Site: {job.formattedAddress || job.location || 'Site Location'}</Text>
            </View>
          </View>
        </View>

        {/* STAGE SPECIFIC CONSOLES */}

        {/* 0. STAGE: SEARCHING */}
        {isSearchingStage && (
          <View style={styles.actionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 10 }} />
              <Text style={styles.cardTitle}>Searching for Nearby Workers...</Text>
            </View>
            <Text style={styles.cardDesc}>
              Broadcasting your request to verified {job.service || 'service'} professionals near your location. You can cancel search anytime if you change your mind.
            </Text>

            <TouchableOpacity
              style={styles.cancelSearchBtn}
              onPress={handleCancelSearch}
              activeOpacity={0.85}
            >
              <Feather name="x-circle" size={18} color="#DC2626" style={{ marginRight: 8 }} />
              <Text style={styles.cancelSearchBtnText}>Cancel Search</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. STAGE: WORKER_ACCEPTED */}
        {isAcceptedStage && (
          <View style={styles.actionCard}>
            <Text style={styles.cardTitle}>Job Accepted</Text>
            <Text style={styles.cardDesc}>
              Navigate to {job.formattedAddress || job.location}. When you are ready to depart, tap below to notify the client.
            </Text>

            <View style={styles.distanceBadgeRow}>
              <Feather name="navigation-2" size={14} color="#2563EB" />
              <Text style={styles.distanceBadgeText}>
                Distance to client: {distanceToClientKm} km
              </Text>
            </View>

            <TouchableOpacity style={styles.navBtn} onPress={handleStartNavigation}>
              <Feather name="navigation" size={18} color="#2563EB" />
              <Text style={styles.navBtnText}>Open Navigation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryActionBtn} onPress={handleStartTravelling}>
              <Text style={styles.primaryActionText}>🚗 I'm On The Way</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. STAGE: WORKER_EN_ROUTE */}
        {isEnRouteStage && (
          <View style={styles.actionCard}>
            <View style={styles.liveBannerRow}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveBannerText}>Live GPS Broadcasting to Client</Text>
            </View>
            <Text style={styles.cardDesc}>
              You're on the way. Client is tracking your approach in real-time.
            </Text>

            <View style={styles.distanceBadgeRow}>
              <Feather name="map-pin" size={14} color="#2563EB" />
              <Text style={styles.distanceBadgeText}>
                Remaining Distance: {distanceToClientKm} km
              </Text>
            </View>

            <TouchableOpacity style={styles.navBtn} onPress={handleStartNavigation}>
              <Feather name="navigation" size={18} color="#2563EB" />
              <Text style={styles.navBtnText}>Open Navigation</Text>
            </TouchableOpacity>

            {distanceToClientKm <= 0.3 && (
              <View style={styles.nearClientBanner}>
                <Feather name="check-circle" size={16} color="#16A34A" />
                <Text style={styles.nearClientText}>You're near the client location</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#16A34A' }]}
              onPress={handleConfirmArrival}
            >
              <Text style={styles.primaryActionText}>📍 I've Arrived</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. STAGE: WORKER_ARRIVED */}
        {isArrivedStage && (
          <View style={styles.actionCard}>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <View style={styles.arrivedCircle}>
                <Feather name="check" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>Client has been reached</Text>
              <Text style={styles.cardDesc}>
                Meet {clientName} to verify work scope. When you begin the service, tap Start Work.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#2563EB' }]}
              onPress={handleStartWork}
            >
              <Text style={styles.primaryActionText}>🔨 Start Work</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 4. STAGE: WORK_STARTED / WORK_IN_PROGRESS */}
        {isWorkingStage && (
          <View style={styles.actionCard}>
            <Text style={styles.cardTitle}>WORK IN PROGRESS</Text>
            <Text style={styles.serviceSubtitle}>{job.service} Service</Text>
            
            <View style={styles.startedAtBanner}>
              <Feather name="calendar" size={14} color="#475569" />
              <Text style={styles.startedAtText}>
                Started: {formatStartTime(job.startedAt)}
              </Text>
            </View>

            <View style={styles.timerDisplayWrap}>
              <Feather name="clock" size={24} color="#2563EB" />
              <Text style={styles.timerDisplayText}>{formatTime(elapsedSeconds)}</Text>
            </View>

            <Text style={styles.cardDesc}>
              Work is actively underway. When finished, submit work completion with final bill details.
            </Text>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#059669' }]}
              onPress={() => setCompleteModalVisible(true)}
            >
              <Text style={styles.primaryActionText}>✓ Complete Work</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. STAGE: WORK_COMPLETION_REQUESTED */}
        {isCompletionSubmitted && (
          <View style={styles.actionCard}>
            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <View style={[styles.arrivedCircle, { backgroundColor: '#F59E0B' }]}>
                <Feather name="clock" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>Work Submitted for Review</Text>
              <Text style={styles.cardDesc}>
                Submitted Amount: ₹{finalAmount}. Waiting for {clientName} to inspect work and confirm completion.
              </Text>
            </View>
          </View>
        )}

        {/* 6. STAGE: CLIENT_CONFIRMED / PAYMENT_PENDING */}
        {isPendingPayment && (
          <View style={styles.actionCard}>
            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <View style={[styles.arrivedCircle, { backgroundColor: '#10B981' }]}>
                <Feather name="check" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>Work Approved by Client!</Text>
              <Text style={styles.cardDesc}>
                {clientName} confirmed completion. Total bill payable: ₹{finalAmount}
              </Text>
            </View>

            {/* Financial Commission Details */}
            <View style={styles.settlementBox}>
              <View style={styles.settlementRow}>
                <Text style={styles.settlementLabel}>Total Bill Amount</Text>
                <Text style={styles.settlementValue}>₹{finalAmount}</Text>
              </View>
              <View style={styles.settlementRow}>
                <Text style={styles.settlementLabel}>Allver Platform Fee (10%)</Text>
                <Text style={[styles.settlementValue, { color: '#DC2626' }]}>
                  -₹{Math.round(Number(finalAmount) * 0.1)}
                </Text>
              </View>
              <View style={[styles.settlementRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.settlementLabel, { fontWeight: '700', color: '#0F172A' }]}>Your Net Earnings</Text>
                <Text style={[styles.settlementValue, { fontWeight: '800', color: '#16A34A', fontSize: 16 }]}>
                  ₹{Math.round(Number(finalAmount) * 0.9)}
                </Text>
              </View>
            </View>

            {/* Cash Collection Button */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#F59E0B', marginTop: 14 }]}
              onPress={handleConfirmCashReceived}
              disabled={isCashSubmitting}
            >
              <FontAwesome5 name="money-bill-wave" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionText}>
                {isCashSubmitting ? 'Confirming Cash...' : `💵 Confirm Cash Received (₹${finalAmount})`}
              </Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 10 }}>
              If client chose Online Payment, payment will settle automatically once verified.
            </Text>
          </View>
        )}

        {/* 7. STAGE: COMPLETED / SETTLED / PAYMENT_RECEIVED */}
        {isJobCompleted && (
          <View style={styles.actionCard}>
            <View style={{ alignItems: 'center', marginVertical: 10 }}>
              <View style={[styles.arrivedCircle, { backgroundColor: '#10B981' }]}>
                <Feather name="check-circle" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.cardTitle}>Payment Confirmed & Settled! 🎉</Text>
              <Text style={styles.cardDesc}>
                This booking has been processed and your Allver wallet ledger updated.
              </Text>
            </View>

            {/* Financial Ledger Breakdown */}
            <View style={styles.settlementBox}>
              <View style={styles.settlementRow}>
                <Text style={styles.settlementLabel}>Payment Method</Text>
                <Text style={[styles.settlementValue, { fontWeight: '700' }]}>
                  {job.paymentMethod || job.payment?.method || 'Cash / Online'}
                </Text>
              </View>
              <View style={styles.settlementRow}>
                <Text style={styles.settlementLabel}>Gross Service Charges</Text>
                <Text style={styles.settlementValue}>
                  ₹{job.payment?.amount || platformAmount}
                </Text>
              </View>
              <View style={styles.settlementRow}>
                <Text style={styles.settlementLabel}>Platform Commission (10%)</Text>
                <Text style={[styles.settlementValue, { color: '#DC2626' }]}>
                  -₹{job.payment?.platformFee || Math.round(platformAmount * 0.1)}
                </Text>
              </View>
              <View style={[styles.settlementRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 8, marginTop: 4 }]}>
                <Text style={[styles.settlementLabel, { fontWeight: '700', color: '#0F172A' }]}>Net Credited to Wallet</Text>
                <Text style={[styles.settlementValue, { fontWeight: '800', color: '#16A34A', fontSize: 16 }]}>
                  +₹{job.payment?.workerEarning || Math.round(platformAmount * 0.9)}
                </Text>
              </View>
              <View style={[styles.settlementRow, { marginTop: 4 }]}>
                <Text style={styles.settlementLabel}>Ledger Status</Text>
                <Text style={[styles.settlementValue, { color: '#059669', fontWeight: '700' }]}>SETTLED ✓</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#10B981', marginTop: 14 }]}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.primaryActionText}>
                ✓ Finish & Return to Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Cancel Job Link (Active stages) */}
        {canCancelJob && (
          <TouchableOpacity
            style={styles.cancelLinkBtn}
            onPress={() => setCancelModalVisible(true)}
          >
            <Feather name="slash" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.cancelLinkText}>Report Problem / Cancel Booking</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Completion Details Modal */}
      <Modal
        visible={completeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCompleteModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Complete Work & Submit Bill</Text>
            <Text style={styles.modalSub}>
              Review the platform-set rate and optional work notes for {clientName}.
            </Text>

            {/* Read-Only Platform Authoritative Rate */}
            <Text style={styles.inputLabel}>Platform Authoritative Rate</Text>
            <View style={{
              backgroundColor: '#F8FAFC',
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#0F172A' }}>₹{platformAmount}</Text>
                  <Text style={{ fontSize: 14, color: '#64748B', marginLeft: 4, fontWeight: '600' }}>/ day</Text>
                </View>
                <View style={{
                  backgroundColor: '#DCFCE7',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                  <Feather name="shield" size={12} color="#16A34A" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#16A34A' }}>Fixed by Allver</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: '#64748B', marginTop: 8, lineHeight: 18 }}>
                {job.pricingEstimate?.locationNote || `Authoritative rate based on standard market rates for ${job.service} in your area.`}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Work Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g. Completed 2 coats of paint. Cleaned site."
              value={workNotes}
              onChangeText={setWorkNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCompleteModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSubmitCompletion}
              >
                <Text style={styles.modalSubmitText}>Submit to Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Job Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Booking</Text>
            <Text style={styles.modalSub}>
              Please choose a reason for cancelling this booking:
            </Text>

            {[
              'Client unreachable / not at location',
              'Incorrect service requirements',
              'Client requested cancellation',
              'Safety or site hazard',
              'Emergency / Unable to complete',
            ].map((reason) => (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonOption,
                  cancelReason === reason && styles.reasonOptionActive,
                ]}
                onPress={() => setCancelReason(reason)}
              >
                <Feather
                  name={cancelReason === reason ? 'check-circle' : 'circle'}
                  size={16}
                  color={cancelReason === reason ? '#DC2626' : '#94A3B8'}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    styles.reasonText,
                    cancelReason === reason && styles.reasonTextActive,
                  ]}
                >
                  {reason}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={[styles.modalBtnRow, { marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Keep Booking</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#DC2626' }]}
                onPress={handleCancelJob}
              >
                <Text style={styles.modalSubmitText}>Confirm Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* In-Place Worker Chat Modal */}
      <Modal
        visible={workerChatModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setWorkerChatModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F1F5F9',
            backgroundColor: '#FFFFFF',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View style={{ position: 'relative' }}>
                <Image
                  source={{ uri: job.clientInfo?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=150' }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#E2E8F0' }}
                  contentFit="cover"
                />
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: '#10B981',
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                }} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }} numberOfLines={1}>
                  {clientName}
                </Text>
                <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' }} numberOfLines={1}>
                  Client • Active Booking
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: '#EFF6FF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => Linking.openURL(`tel:${clientPhone}`)}
              >
                <Feather name="phone" size={18} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => setWorkerChatModalVisible(false)}
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
              ref={workerChatScrollRef}
              style={{ flex: 1, backgroundColor: '#F8FAFC' }}
              contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => workerChatScrollRef.current?.scrollToEnd({ animated: false })}
            >
              {/* Notice */}
              <View style={{
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
              }}>
                <Feather name="shield" size={12} color="#16A34A" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 11, color: '#15803D', fontWeight: '600' }}>
                  Direct communication for Job #{jobId}
                </Text>
              </View>

              {workerChatMessages.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 }}>
                  <View style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#EFF6FF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 14,
                  }}>
                    <Feather name="message-circle" size={32} color="#2563EB" />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B', textAlign: 'center' }}>
                    Chat directly with {clientName}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                    Send arrival updates, location questions, or material confirmations.
                  </Text>
                </View>
              ) : (
                workerChatMessages.map((msg, index) => {
                  const workerUserId = '6a4f0c7d30034d5c126f259e';
                  const isSenderMe =
                    (msg.sender?._id && msg.sender._id === workerUserId) ||
                    msg.sender === workerUserId ||
                    msg.sender === 'worker' ||
                    msg.sender?.role === 'Worker' ||
                    msg.isMe;

                  const timeStr = msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Now';

                  return (
                    <View
                      key={(msg._id ? String(msg._id) : (msg.tempId || 'worker_msg')) + `_${index}`}
                      style={{
                        flexDirection: 'row',
                        marginBottom: 10,
                        justifyContent: isSenderMe ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <View
                        style={{
                          maxWidth: '80%',
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 18,
                          backgroundColor: isSenderMe ? '#10B981' : '#FFFFFF',
                          borderBottomRightRadius: isSenderMe ? 4 : 18,
                          borderBottomLeftRadius: isSenderMe ? 18 : 4,
                          borderWidth: isSenderMe ? 0 : 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            lineHeight: 20,
                            color: isSenderMe ? '#FFFFFF' : '#0F172A',
                          }}
                        >
                          {msg.text}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            marginTop: 4,
                            color: isSenderMe ? '#D1FAE5' : '#94A3B8',
                            textAlign: isSenderMe ? 'right' : 'left',
                          }}
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
            <View style={{ backgroundColor: '#F8FAFC', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
                {[
                  'I have reached your location',
                  'On my way, arriving in 5 mins',
                  'Waiting near the main gate',
                  'Please confirm apartment number',
                ].map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={{
                      backgroundColor: '#FFFFFF',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}
                    onPress={() => handleSendWorkerChatMessage(chip)}
                  >
                    <Text style={{ fontSize: 12, color: '#334155', fontWeight: '500' }}>{chip}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Input Composer */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: '#FFFFFF',
              borderTopWidth: 1,
              borderTopColor: '#E2E8F0',
              gap: 8,
            }}>
              <TextInput
                style={{
                  flex: 1,
                  minHeight: 40,
                  maxHeight: 90,
                  backgroundColor: '#F1F5F9',
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  fontSize: 14,
                  color: '#0F172A',
                }}
                placeholder={`Message ${clientName}...`}
                placeholderTextColor="#94A3B8"
                value={workerChatInput}
                onChangeText={setWorkerChatInput}
                multiline
                maxLength={400}
              />
              <TouchableOpacity
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: workerChatInput.trim() ? '#10B981' : '#CBD5E1',
                }}
                disabled={!workerChatInput.trim() || isSendingWorkerChat}
                onPress={() => handleSendWorkerChatMessage()}
              >
                {isSendingWorkerChat ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
  },
  scrollContent: {
    padding: 16,
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  serviceSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },
  locationPinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  contactRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 6,
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationPin: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  pinText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 2,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  distanceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  distanceBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
    marginLeft: 6,
  },
  nearClientBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  nearClientText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 6,
  },
  startedAtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  startedAtText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginLeft: 6,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  navBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 8,
  },
  primaryActionBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  liveBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  liveBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  arrivedCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerDisplayWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  timerDisplayText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1E40AF',
    marginLeft: 10,
    fontVariant: ['tabular-nums'],
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  amountInput: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  notesInput: {
    minHeight: 70,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: 'row',
  },
  modalCancelBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginRight: 10,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#059669',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  settlementBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    width: '100%',
  },
  settlementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  settlementLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  settlementValue: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  cancelLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 10,
  },
  cancelLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  reasonOptionActive: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    flex: 1,
  },
  reasonTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  cancelSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  cancelSearchBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
});
