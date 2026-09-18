import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { sendFirebaseOtp, verifyFirebaseOtp, verifyAndLinkPhoneWithBackend } from '../utils/FirebaseAuthService';

const { width } = Dimensions.get('window');

const COLORS = {
  dark: '#0F172A',
  emerald: '#016B4F',
  emeraldLight: 'rgba(1, 107, 79, 0.08)',
  gold: '#D97706',
  white: '#FFFFFF',
  slate: '#64748B',
  border: '#E2E8F0',
  cardBg: '#FFFFFF',
  inputBg: '#F8FAFC',
  red: '#EF4444',
  redLight: '#FEE2E2',
  green: '#10B981',
  greenLight: '#D1FAE5',
};

interface PhoneVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: any) => void;
  actionTitle?: string;
  initialPhone?: string;
}

export default function PhoneVerificationModal({
  visible,
  onClose,
  onSuccess,
  actionTitle = 'continue',
  initialPhone = '',
}: PhoneVerificationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible && initialPhone) {
      setPhoneNumber(initialPhone.replace(/\D/g, '').slice(-10));
    }
    if (!visible) {
      // Reset state when closed
      setOtpSent(false);
      setOtpCode('');
      setConfirmationResult(null);
      setNotice(null);
      setPhoneError(null);
      setIsLoading(false);
    }
  }, [visible, initialPhone]);

  useEffect(() => {
    if (resendTimer > 0) {
      timerRef.current = setTimeout(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resendTimer]);

  const validatePhone = (num: string): boolean => {
    const digits = num.replace(/\D/g, '');
    if (digits.length !== 10 || !/^[6-9]\d{9}$/.test(digits)) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number.');
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const handleSendOtp = async () => {
    if (!validatePhone(phoneNumber)) return;

    setNotice(null);
    setIsLoading(true);

    try {
      const result = await sendFirebaseOtp(phoneNumber);
      if (result.success && result.confirmation) {
        setConfirmationResult(result.confirmation);
        setOtpSent(true);
        setResendTimer(30);
        setNotice({
          type: 'success',
          message: `6-digit verification code sent to +91 ${phoneNumber}`,
        });
      } else {
        setNotice({
          type: 'error',
          message: result.message || 'Could not send verification code. Please try again.',
        });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: 'Something went wrong sending OTP. Please check your connection.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      setNotice({
        type: 'error',
        message: 'Please enter the complete 6-digit OTP.',
      });
      return;
    }

    setNotice(null);
    setIsLoading(true);

    try {
      const verifyRes = await verifyFirebaseOtp(confirmationResult, otpCode);
      if (!verifyRes.success || !verifyRes.idToken) {
        setNotice({
          type: 'error',
          message: verifyRes.message || 'Incorrect or expired OTP. Please try again.',
        });
        setIsLoading(false);
        return;
      }

      // Link phone number with backend
      const linkRes = await verifyAndLinkPhoneWithBackend(
        verifyRes.idToken,
        verifyRes.phoneNumber || phoneNumber
      );

      if (linkRes.success) {
        setNotice({
          type: 'success',
          message: 'Phone verified successfully! Continuing...',
        });
        setTimeout(() => {
          onSuccess(linkRes.user);
          onClose();
        }, 600);
      } else {
        setNotice({
          type: 'error',
          message: linkRes.message || 'Could not verify phone on Allver server.',
        });
      }
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: 'Verification failed. Please check your connection.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isLoading) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              if (!isLoading) onClose();
            }}
          />
          <View style={styles.modalCard}>
            {/* Header / Shield Icon */}
            <View style={styles.headerRow}>
              <View style={styles.shieldBadge}>
                <Feather name="shield" size={22} color={COLORS.emerald} />
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!isLoading) onClose();
                }}
                style={styles.closeBtn}
                disabled={isLoading}
              >
                <Feather name="x" size={20} color={COLORS.slate} />
              </TouchableOpacity>
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.modalTitle}>Verify your phone number</Text>
            <Text style={styles.modalSubtitle}>
              A verified phone number is required to <Text style={{ color: COLORS.dark, fontWeight: '700' }}>{actionTitle}</Text>.
            </Text>

            {/* Notice Banner */}
            {notice && (
              <View
                style={[
                  styles.noticeBox,
                  notice.type === 'error' ? styles.noticeError : styles.noticeSuccess,
                ]}
              >
                <Feather
                  name={notice.type === 'error' ? 'alert-circle' : 'check-circle'}
                  size={16}
                  color={notice.type === 'error' ? COLORS.red : COLORS.green}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.noticeText,
                    { color: notice.type === 'error' ? COLORS.red : COLORS.green },
                  ]}
                >
                  {notice.message}
                </Text>
              </View>
            )}

            {!otpSent ? (
              /* Step 1: Phone input */
              <View style={{ marginTop: 16 }}>
                <Text style={styles.inputLabel}>Mobile Number</Text>
                <View style={[styles.phoneInputWrap, phoneError && { borderColor: COLORS.red }]}>
                  <View style={styles.countryBadge}>
                    <View style={styles.miniFlag}>
                      <View style={{ height: 3.5, backgroundColor: '#FF9933' }} />
                      <View style={{ height: 3.5, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
                        <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: '#000080' }} />
                      </View>
                      <View style={{ height: 3.5, backgroundColor: '#138808' }} />
                    </View>
                    <Text style={styles.countryCode}>+91</Text>
                  </View>
                  <View style={styles.inputDivider} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={COLORS.slate}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={(txt) => {
                      setPhoneNumber(txt.replace(/\D/g, ''));
                      if (phoneError) setPhoneError(null);
                    }}
                    editable={!isLoading}
                    autoFocus
                  />
                </View>
                {phoneError && <Text style={styles.errorText}>{phoneError}</Text>}

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                  onPress={handleSendOtp}
                  disabled={isLoading}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Send Verification OTP</Text>
                      <Feather name="arrow-right" size={16} color={COLORS.white} style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* Step 2: OTP verification */
              <View style={{ marginTop: 16 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.inputLabel}>Enter 6-digit OTP</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setOtpSent(false);
                      setOtpCode('');
                      setNotice(null);
                    }}
                    disabled={isLoading}
                  >
                    <Text style={styles.changeNumberText}>Change number</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.phoneInputWrap}>
                  <Feather name="key" size={18} color={COLORS.slate} style={{ marginLeft: 14, marginRight: 8 }} />
                  <TextInput
                    style={[styles.textInput, { letterSpacing: 8, fontSize: 18, fontWeight: '700' }]}
                    placeholder="••••••"
                    placeholderTextColor={COLORS.slate}
                    keyboardType="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChangeText={setOtpCode}
                    editable={!isLoading}
                    autoFocus
                  />
                </View>

                {resendTimer > 0 ? (
                  <Text style={styles.resendTimerText}>Resend code in {resendTimer}s</Text>
                ) : (
                  <TouchableOpacity onPress={handleSendOtp} disabled={isLoading} style={{ marginTop: 8 }}>
                    <Text style={styles.resendBtnText}>Resend OTP</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.primaryBtnText}>Verify & Continue</Text>
                      <Feather name="check" size={16} color={COLORS.white} style={{ marginLeft: 8 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.cardBg,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  shieldBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.emeraldLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.slate,
    lineHeight: 20,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  noticeError: {
    backgroundColor: COLORS.redLight,
  },
  noticeSuccess: {
    backgroundColor: COLORS.greenLight,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  changeNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.emerald,
  },
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    height: 52,
  },
  countryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  miniFlag: {
    width: 16,
    height: 10.5,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 6,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  inputDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  textInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: COLORS.dark,
    paddingHorizontal: 12,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      outlineWidth: 0,
      outlineColor: 'transparent',
      boxShadow: 'none',
    } as any : {}),
  },
  errorText: {
    fontSize: 12,
    color: COLORS.red,
    marginTop: 6,
    fontWeight: '600',
  },
  resendTimerText: {
    fontSize: 12,
    color: COLORS.slate,
    marginTop: 8,
    textAlign: 'center',
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.emerald,
    textAlign: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.emerald,
    borderRadius: 14,
    height: 50,
    marginTop: 20,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
