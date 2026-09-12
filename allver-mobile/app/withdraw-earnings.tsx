import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#16A34A',
  greenDark: '#15803D',
  greenLight: '#F0FDF4',
  greenBorder: '#DCFCE7',
  textDark: '#0F172A',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  border: '#E2E8F0',
  white: '#FFFFFF',
  bgLight: '#F8FAFC',
  blue: '#2563EB',
};

export default function WithdrawEarningsScreen() {
  const router = useRouter();
  const availableBalance = 8450;
  const [amount, setAmount] = useState('8450');
  const [selectedBankId, setSelectedBankId] = useState('bank-1');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newIfsc, setNewIfsc] = useState('');

  const [banks, setBanks] = useState([
    {
      id: 'bank-1',
      name: 'HDFC Bank',
      accountLast4: '4821',
      isPrimary: true,
    },
  ]);

  const handleWithdraw = () => {
    const num = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to withdraw.');
      return;
    }
    if (num > availableBalance) {
      Alert.alert('Insufficient Balance', `You can only withdraw up to ₹${availableBalance.toLocaleString()}.`);
      return;
    }

    setShowSuccessModal(true);
  };

  const handleAddBank = () => {
    if (!newBankName || !newAccountNumber || !newIfsc) {
      Alert.alert('Missing Details', 'Please fill in all bank details.');
      return;
    }

    const last4 = newAccountNumber.slice(-4);
    const newBank = {
      id: `bank-${Date.now()}`,
      name: newBankName,
      accountLast4: last4 || '0000',
      isPrimary: false,
    };

    setBanks([...banks, newBank]);
    setSelectedBankId(newBank.id);
    setShowAddBankModal(false);
    setNewBankName('');
    setNewAccountNumber('');
    setNewIfsc('');
    Alert.alert('Bank Added', `${newBankName} account ending in ${last4} added successfully.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/earnings');
            }
          }}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Earnings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ================= AVAILABLE BALANCE CARD ================= */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceIconWrap}>
            <MaterialCommunityIcons name="wallet" size={24} color={COLORS.green} />
          </View>
          <View style={styles.balanceMeta}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Text style={styles.balanceValue}>₹{availableBalance.toLocaleString()}</Text>
          </View>
          <Text style={styles.balanceSub}>
            You can withdraw this amount to your bank account.
          </Text>
        </View>

        {/* ================= SELECT BANK ACCOUNT ================= */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Select Bank Account</Text>
          <TouchableOpacity onPress={() => setShowAddBankModal(true)} activeOpacity={0.7}>
            <Text style={styles.manageText}>Manage</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.banksList}>
          {banks.map((bank) => {
            const isSelected = selectedBankId === bank.id;
            return (
              <TouchableOpacity
                key={bank.id}
                style={[styles.bankCard, isSelected && styles.bankCardSelected]}
                onPress={() => setSelectedBankId(bank.id)}
                activeOpacity={0.8}
              >
                <View style={styles.bankIconWrap}>
                  <FontAwesome5 name="university" size={16} color="#DC2626" />
                </View>
                <View style={styles.bankMeta}>
                  <Text style={styles.bankName}>{bank.name}</Text>
                  <Text style={styles.bankAccount}>•••• {bank.accountLast4}</Text>
                </View>
                <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.addBankBtn}
            onPress={() => setShowAddBankModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.addBankIconWrap}>
              <Feather name="plus" size={16} color={COLORS.white} />
            </View>
            <Text style={styles.addBankText}>Add New Bank Account</Text>
            <Feather name="chevron-right" size={18} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </View>

        {/* ================= ENTER AMOUNT ================= */}
        <Text style={styles.sectionTitle}>Enter Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.rupeeSymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={COLORS.textLight}
          />
        </View>

        <TouchableOpacity
          style={styles.fullAmountBtn}
          onPress={() => setAmount(String(availableBalance))}
          activeOpacity={0.7}
        >
          <Text style={styles.fullAmountText}>Withdraw Full Amount</Text>
        </TouchableOpacity>

        {/* ================= WITHDRAW MONEY BUTTON ================= */}
        <TouchableOpacity
          style={styles.withdrawActionBtn}
          onPress={handleWithdraw}
          activeOpacity={0.85}
        >
          <Text style={styles.withdrawActionText}>Withdraw Money</Text>
        </TouchableOpacity>

        {/* ================= SECURITY FOOTNOTE ================= */}
        <View style={styles.securityFootnote}>
          <Feather name="lock" size={14} color={COLORS.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.securityFootnoteText}>
            Your payments are secure and protected with bank-grade security.
          </Text>
        </View>
      </ScrollView>

      {/* ================= ADD BANK MODAL ================= */}
      <Modal visible={showAddBankModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Bank Account</Text>
              <TouchableOpacity onPress={() => setShowAddBankModal(false)}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. State Bank of India, HDFC"
              value={newBankName}
              onChangeText={setNewBankName}
            />

            <Text style={styles.inputLabel}>Account Number</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter full account number"
              value={newAccountNumber}
              onChangeText={setNewAccountNumber}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>IFSC Code</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. HDFC0001234"
              value={newIfsc}
              onChangeText={setNewIfsc}
              autoCapitalize="characters"
            />

            <TouchableOpacity style={styles.saveBankBtn} onPress={handleAddBank} activeOpacity={0.85}>
              <Text style={styles.saveBankBtnText}>Save Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ================= SUCCESS MODAL ================= */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successCheckWrap}>
              <Feather name="check" size={28} color={COLORS.white} />
            </View>
            <Text style={styles.successModalTitle}>Withdrawal Initiated!</Text>
            <Text style={styles.successModalAmount}>₹{parseFloat(amount || '0').toLocaleString()}</Text>
            <Text style={styles.successModalSub}>
              Your withdrawal request has been submitted. The money will be deposited to your bank account within 24 hours.
            </Text>
            <TouchableOpacity
              style={styles.viewPayoutHistoryBtn}
              onPress={() => {
                setShowSuccessModal(false);
                router.replace('/payout-history');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.viewPayoutHistoryText}>View Payout History</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  balanceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  balanceMeta: {
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  balanceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.greenDark,
  },
  balanceSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  manageText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.blue,
  },
  banksList: {
    gap: 10,
    marginBottom: 24,
  },
  bankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
  },
  bankCardSelected: {
    borderColor: COLORS.green,
    backgroundColor: '#F0FDF4',
  },
  bankIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bankMeta: {
    flex: 1,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  bankAccount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.green,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.green,
  },
  addBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
  },
  addBankIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.blue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addBankText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
  },
  rupeeSymbol: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textDark,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    padding: 0,
  },
  fullAmountBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    marginBottom: 24,
  },
  fullAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.blue,
  },
  withdrawActionBtn: {
    height: 50,
    backgroundColor: COLORS.green,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  withdrawActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  securityFootnote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  securityFootnoteText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
    marginBottom: 14,
  },
  saveBankBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBankBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  successCheckWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
  },
  successModalAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.greenDark,
    marginBottom: 10,
  },
  successModalSub: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 20,
  },
  viewPayoutHistoryBtn: {
    width: '100%',
    backgroundColor: COLORS.green,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  viewPayoutHistoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});
