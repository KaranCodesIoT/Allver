import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

interface LoginRequiredModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  actionSource?: string;
}

const COLORS = {
  overlay: 'rgba(3, 7, 18, 0.82)',
  cardBg: '#0C121E',
  cardBorder: '#1E2B3E',
  emerald: '#016B4F',
  emeraldLight: 'rgba(1, 107, 79, 0.18)',
  gold: '#F3C769',
  goldLight: '#F7D58B',
  white: '#FFFFFF',
  textMuted: '#94A3B8',
  textSubtle: '#64748B',
};

export default function LoginRequiredModal({
  visible,
  onClose,
  title = 'Login required',
  message = 'Create an account or login to continue.',
  actionSource,
}: LoginRequiredModalProps) {
  const router = useRouter();

  if (!visible) return null;

  const handleContinueLogin = () => {
    onClose();
    router.push('/login');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Top Close Button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Feather name="x" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>

              {/* Icon with Gold & Emerald Glow */}
              <View style={styles.iconRing}>
                <View style={styles.iconInner}>
                  <Feather name="lock" size={24} color={COLORS.gold} />
                </View>
              </View>

              {/* Title & Description */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Action Context Pill (if provided) */}
              {actionSource ? (
                <View style={styles.actionPill}>
                  <Feather name="info" size={12} color={COLORS.gold} style={{ marginRight: 6 }} />
                  <Text style={styles.actionPillText} numberOfLines={1}>
                    Required for {actionSource}
                  </Text>
                </View>
              ) : null}

              {/* Unlocked Benefits list */}
              <View style={styles.benefitsContainer}>
                <View style={styles.benefitRow}>
                  <View style={styles.bulletCheck}>
                    <Feather name="check" size={11} color={COLORS.gold} />
                  </View>
                  <Text style={styles.benefitText}>Direct hire, instant quotes & project posting</Text>
                </View>

                <View style={styles.benefitRow}>
                  <View style={styles.bulletCheck}>
                    <Feather name="check" size={11} color={COLORS.gold} />
                  </View>
                  <Text style={styles.benefitText}>Secure in-app chat & direct voice calls</Text>
                </View>

                <View style={styles.benefitRow}>
                  <View style={styles.bulletCheck}>
                    <Feather name="check" size={11} color={COLORS.gold} />
                  </View>
                  <Text style={styles.benefitText}>Save favorites, track jobs & payment protection</Text>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.btnRow}>
                {/* Primary CTA: Mobile OTP */}
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={handleContinueLogin}
                  activeOpacity={0.85}
                >
                  <Feather name="phone" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryBtnText}>Continue with Mobile OTP</Text>
                </TouchableOpacity>

                {/* Secondary Option: Dismiss / Continue as Guest */}
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryBtnText}>Keep Exploring as Guest</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
      web: {
        boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)',
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.emeraldLight,
    borderWidth: 1.5,
    borderColor: 'rgba(1, 107, 79, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#070C15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243, 199, 105, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(243, 199, 105, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(243, 199, 105, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 18,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.goldLight,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: '#101725',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  bulletCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(243, 199, 105, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  benefitText: {
    fontSize: 12.5,
    color: '#CBD5E1',
    flex: 1,
    lineHeight: 17,
  },
  btnRow: {
    width: '100%',
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    backgroundColor: COLORS.emerald,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: COLORS.emerald,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: '100%',
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
});
