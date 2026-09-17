import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import {
  getFirebaseCurrentUser,
  linkEmailAndSendVerification,
  reloadAndCheckEmailVerification,
  isValidEmailFormat
} from '../utils/FirebaseAuthService';

interface EmailVerificationCardProps {
  initialEmail?: string;
  initialVerified?: boolean;
  userId?: string;
  onVerificationSuccess?: (user: any) => void;
}

const COLORS = {
  green: '#10B981',
  greenDark: '#059669',
  greenLight: '#D1FAE5',
  greenText: '#065F46',
  orange: '#F59E0B',
  orangeLight: '#FEF3C7',
  orangeText: '#92400E',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  blueText: '#1E40AF',
  red: '#EF4444',
  redLight: '#FEE2E2',
  redText: '#991B1B',
  white: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  bgLight: '#F8FAFC',
};

export default function EmailVerificationCard({
  initialEmail = '',
  initialVerified = false,
  userId,
  onVerificationSuccess
}: EmailVerificationCardProps) {
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(initialVerified);
  const [isEditing, setIsEditing] = useState(false);
  
  // Async states
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; title?: string; message: string } | null>(null);
  
  // Resend cooldown timer
  const [cooldown, setCooldown] = useState(0);

  // Initialize from props or active Firebase user
  useEffect(() => {
    const fbUser = getFirebaseCurrentUser();
    const fbEmail = fbUser?.email || '';
    const fbVerified = Boolean(fbUser?.emailVerified);

    const effectiveEmail = fbEmail || (initialEmail && !initialEmail.endsWith('@allver.app') ? initialEmail : '');
    const effectiveVerified = fbVerified || initialVerified;

    setEmail(effectiveEmail);
    setIsVerified(effectiveVerified);
    setIsEditing(!effectiveEmail || !effectiveVerified);
  }, [initialEmail, initialVerified]);

  // Cooldown interval ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendVerification = async () => {
    setNotice(null);
    const trimmed = email.trim();

    if (!trimmed) {
      setNotice({
        type: 'error',
        title: 'Missing Email',
        message: 'Please enter your email address.'
      });
      return;
    }

    if (!isValidEmailFormat(trimmed)) {
      setNotice({
        type: 'error',
        title: 'Invalid Email',
        message: 'Please enter a valid email address (e.g. name@example.com).'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await linkEmailAndSendVerification(trimmed);
      if (result.success) {
        if (result.emailVerified) {
          setIsVerified(true);
          setIsEditing(false);
          setNotice({
            type: 'success',
            title: 'Already Verified',
            message: 'Your email address is already verified!'
          });
        } else {
          setNotice({
            type: 'success',
            title: 'Verification Email Sent',
            message: result.message || 'Verification email sent. Please check your inbox and click the verification link.'
          });
          setCooldown(result.cooldownSeconds || 60);
          setIsEditing(false);
        }
      } else {
        setNotice({
          type: 'error',
          title: result.title || 'Unable to Send Email',
          message: result.message || 'Could not send verification email. Please try again.'
        });
        if (result.cooldownSeconds) {
          setCooldown(result.cooldownSeconds);
        }
      }
    } catch (e: any) {
      setNotice({
        type: 'error',
        title: 'Something went wrong',
        message: 'Could not send email. Please check your connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setNotice(null);
    setCheckingStatus(true);
    try {
      const result = await reloadAndCheckEmailVerification(userId);
      if (result.success && result.emailVerified) {
        setIsVerified(true);
        setIsEditing(false);
        setNotice({
          type: 'success',
          title: 'Email Verified',
          message: 'Your email address is now verified and saved to your Allver account!'
        });
        if (result.user && onVerificationSuccess) {
          onVerificationSuccess(result.user);
        }
      } else if (result.success && !result.emailVerified) {
        setNotice({
          type: 'info',
          title: 'Verification Pending',
          message: 'Email not verified yet. Please click the link sent to your inbox, then tap "Already verified? Check again".'
        });
      } else {
        setNotice({
          type: 'error',
          title: result.title || 'Check Failed',
          message: result.message || 'Could not verify status. Please try again.'
        });
      }
    } catch (e: any) {
      setNotice({
        type: 'error',
        title: 'Error Checking Status',
        message: 'Network error. Please try again.'
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Feather name="mail" size={18} color={COLORS.green} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.cardTitle}>Email Address</Text>
          <Text style={styles.cardSubtitle}>Receive project updates, contracts & receipts</Text>
        </View>
        {isVerified && (
          <View style={styles.verifiedTag}>
            <MaterialIcons name="verified" size={16} color={COLORS.green} />
            <Text style={styles.verifiedTagText}>Verified</Text>
          </View>
        )}
      </View>

      {/* Notice Banner */}
      {notice && (
        <View style={[
          styles.noticeBanner,
          notice.type === 'success' && styles.noticeBannerSuccess,
          notice.type === 'error' && styles.noticeBannerError,
          notice.type === 'info' && styles.noticeBannerInfo,
        ]}>
          <Feather
            name={notice.type === 'success' ? 'check-circle' : notice.type === 'error' ? 'alert-circle' : 'info'}
            size={16}
            color={notice.type === 'success' ? COLORS.greenDark : notice.type === 'error' ? COLORS.red : COLORS.blue}
            style={styles.noticeIcon}
          />
          <View style={styles.noticeContent}>
            {notice.title && (
              <Text style={[
                styles.noticeTitle,
                notice.type === 'success' && { color: COLORS.greenText },
                notice.type === 'error' && { color: COLORS.redText },
                notice.type === 'info' && { color: COLORS.blueText },
              ]}>{notice.title}</Text>
            )}
            <Text style={[
              styles.noticeMessage,
              notice.type === 'success' && { color: COLORS.greenText },
              notice.type === 'error' && { color: COLORS.redText },
              notice.type === 'info' && { color: COLORS.blueText },
            ]}>{notice.message}</Text>
          </View>
          <TouchableOpacity onPress={() => setNotice(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={14} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* State A: Verified */}
      {isVerified && !isEditing ? (
        <View style={styles.verifiedContainer}>
          <View style={styles.verifiedBox}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>📧 Email Verified ✓</Text>
            </View>
            <Text style={styles.verifiedEmailText}>{email}</Text>
          </View>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => setIsEditing(true)}
          >
            <Feather name="edit-2" size={14} color={COLORS.textMuted} />
            <Text style={styles.changeBtnText}>Change Email</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* State B: Input / Pending Verification */
        <View style={styles.inputSection}>
          <View style={styles.inputWrapper}>
            <Feather name="at-sign" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={text => {
                setEmail(text);
                if (notice) setNotice(null);
              }}
              placeholder="user@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading && !checkingStatus}
            />
            {email.length > 0 && (
              <TouchableOpacity onPress={() => setEmail('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x-circle" size={16} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>

          {/* Primary Action Button: Send / Resend Verification */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              (loading || cooldown > 0 || !email.trim()) && styles.actionBtnDisabled
            ]}
            onPress={handleSendVerification}
            disabled={loading || cooldown > 0 || !email.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="send" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Verification Email'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary Action: Already Verified? Check Again */}
          {email.trim().length > 0 && !isVerified && (
            <TouchableOpacity
              style={styles.checkAgainBtn}
              onPress={handleCheckStatus}
              disabled={checkingStatus}
            >
              {checkingStatus ? (
                <ActivityIndicator size="small" color={COLORS.greenDark} />
              ) : (
                <>
                  <Feather name="refresh-cw" size={14} color={COLORS.greenDark} style={{ marginRight: 6 }} />
                  <Text style={styles.checkAgainBtnText}>Already verified? Check again</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Cancel Editing if already verified previously */}
          {isVerified && (
            <TouchableOpacity
              style={styles.cancelEditBtn}
              onPress={() => setIsEditing(false)}
            >
              <Text style={styles.cancelEditBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  verifiedContainer: {
    marginTop: 4,
  },
  verifiedBox: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.greenLight,
    alignItems: 'center',
  },
  verifiedBadge: {
    backgroundColor: COLORS.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  verifiedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.greenDark,
  },
  verifiedEmailText: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 6,
    gap: 6,
  },
  changeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  inputSection: {
    marginTop: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textDark,
    height: '100%',
  },
  actionBtn: {
    backgroundColor: COLORS.green,
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  actionBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  checkAgainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
  },
  checkAgainBtnText: {
    color: COLORS.greenDark,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelEditBtn: {
    alignItems: 'center',
    marginTop: 6,
    paddingVertical: 6,
  },
  cancelEditBtnText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  noticeBannerSuccess: {
    backgroundColor: COLORS.greenLight,
  },
  noticeBannerError: {
    backgroundColor: COLORS.redLight,
  },
  noticeBannerInfo: {
    backgroundColor: COLORS.blueLight,
  },
  noticeIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  noticeMessage: {
    fontSize: 12,
    lineHeight: 16,
  },
});
