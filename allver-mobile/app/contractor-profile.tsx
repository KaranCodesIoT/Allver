import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const { width, height } = Dimensions.get('window');

const COLORS = {
  green: '#16A34A',
  greenLight: '#F0FDF4',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  red: '#EF4444',
  bgLight: '#F3F4F6',
  blue: '#3B82F6',
};

const debuggerHost = Constants.expoConfig?.hostUri;
const localIp = debuggerHost?.split(':')[0];
const BACKEND_URL = localIp ? `http://${localIp}:5000` : (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');

// Options Lists
const CONTRACTOR_TYPES = [
  'Civil Contractor',
  'Plumbing Contractor',
  'Electrical Contractor',
  'Renovation Contractor',
  'HVAC Contractor',
  'Painting Contractor',
  'General Contractor'
];

const TEAM_SIZES = [
  '1-5 members',
  '6-15 members',
  '16-30 members',
  '30+ members'
];

const WORK_CATEGORIES = [
  'Building Construction',
  'Renovation',
  'Painting',
  'Flooring',
  'Carpentry',
  'Electrical',
  'Plumbing',
  'Fabrication'
];

const SERVICE_LOCATIONS = [
  'Mumbai',
  'Thane',
  'Navi Mumbai',
  'Pune',
  'Bangalore',
  'Delhi'
];

const EXPERIENCE_OPTIONS = [
  'Less than 1 year',
  '1-3 years',
  '4-6 years',
  '7-10 years',
  '10+ years'
];

export default function ContractorProfileScreen() {
  const router = useRouter();
  
  // State for form inputs
  const [contractorType, setContractorType] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [workCategory, setWorkCategory] = useState<string[]>(['Building Construction', 'Renovation', 'Painting']);
  const [serviceLocation, setServiceLocation] = useState<string[]>(['Mumbai', 'Thane', 'Navi Mumbai']);
  const [experience, setExperience] = useState('');

  // Modal State
  const [activeModal, setActiveModal] = useState<'type' | 'size' | 'category' | 'location' | 'experience' | null>(null);
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let user = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) user = JSON.parse(stored);
    } else {
      user = (global as any).currentUser;
    }
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleSave = async (isSkip = false) => {
    if (!currentUser) {
      router.push('/(tabs)');
      return;
    }

    setSaving(true);

    const payload = isSkip ? {
      experience: 'Less than 1 year',
      contractorType: 'General Contractor',
      teamSize: '1-5 members',
      workCategory: ['Building Construction'],
      serviceLocation: ['Mumbai'],
    } : {
      contractorType: contractorType || 'General Contractor',
      teamSize: teamSize || '1-5 members',
      workCategory: workCategory.length > 0 ? workCategory : ['Building Construction'],
      serviceLocation: serviceLocation.length > 0 ? serviceLocation : ['Mumbai'],
      experience: experience || '1-3 years',
      phone: currentUser.phoneNumber || '',
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/user/profile/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedUser = { ...currentUser, ...payload, ...data.user };
        
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
        (global as any).currentUser = updatedUser;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
      router.push('/(tabs)');
    }
  };

  const handleToggleMultiSelect = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (list.includes(item)) {
      setList(list.filter(x => x !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleRemoveChip = (item: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setList(list.filter(x => x !== item));
  };

  const renderModalContent = () => {
    if (!activeModal) return null;

    let title = '';
    let data: string[] = [];
    let isMulti = false;
    let selectedItems: string[] = [];
    let onSelect: (val: string) => void = () => {};

    if (activeModal === 'type') {
      title = 'Select Contractor Type';
      data = CONTRACTOR_TYPES;
      onSelect = (val) => {
        setContractorType(val);
        setActiveModal(null);
      };
    } else if (activeModal === 'size') {
      title = 'Select Team Size';
      data = TEAM_SIZES;
      onSelect = (val) => {
        setTeamSize(val);
        setActiveModal(null);
      };
    } else if (activeModal === 'experience') {
      title = 'Select Years of Experience';
      data = EXPERIENCE_OPTIONS;
      onSelect = (val) => {
        setExperience(val);
        setActiveModal(null);
      };
    } else if (activeModal === 'category') {
      title = 'Select Work Categories';
      data = WORK_CATEGORIES;
      isMulti = true;
      selectedItems = workCategory;
      onSelect = (val) => handleToggleMultiSelect(val, workCategory, setWorkCategory);
    } else if (activeModal === 'location') {
      title = 'Select Service Locations';
      data = SERVICE_LOCATIONS;
      isMulti = true;
      selectedItems = serviceLocation;
      onSelect = (val) => handleToggleMultiSelect(val, serviceLocation, setServiceLocation);
    }

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.modalCloseBtn}>
              <Feather name="x" size={20} color={COLORS.textDark} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={data}
            keyExtractor={(item) => item}
            style={{ maxHeight: 300 }}
            renderItem={({ item }) => {
              const isSelected = isMulti ? selectedItems.includes(item) : (activeModal === 'type' ? contractorType === item : activeModal === 'size' ? teamSize === item : experience === item);
              return (
                <TouchableOpacity 
                  style={[styles.modalOption, isSelected && styles.modalOptionSelected]} 
                  onPress={() => onSelect(item)}
                >
                  <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>{item}</Text>
                  {isSelected && (
                    <Feather name="check" size={18} color={COLORS.green} />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {isMulti && (
            <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>Contractor Profile</Text>
            <Text style={styles.headerSubtitle}>Complete your profile to get discovered</Text>
          </View>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=200&auto=format&fit=crop' }} 
            style={styles.headerBuildingImage}
            contentFit="cover"
          />
        </View>

        <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Progress Stepper */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperLinesWrapper}>
              <View style={[styles.stepperLine, { backgroundColor: COLORS.green }]} />
              <View style={[styles.stepperLine, { backgroundColor: COLORS.border }]} />
            </View>
            
            <View style={styles.stepperRow}>
              
              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, { backgroundColor: COLORS.green }]}>
                  <Feather name="check" size={14} color={COLORS.white} />
                </View>
                <Text style={styles.stepTextCompleted}>Account Created</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, { backgroundColor: COLORS.green }]}>
                  <Text style={styles.stepNumberActive}>2</Text>
                </View>
                <Text style={styles.stepTextActive}>Contractor Profile</Text>
              </View>

              <View style={styles.stepItem}>
                <View style={[styles.stepCircle, { backgroundColor: COLORS.white, borderColor: COLORS.border, borderWidth: 2 }]}>
                  <Text style={styles.stepNumberInactive}>3</Text>
                </View>
                <Text style={styles.stepTextInactive}>Start Using</Text>
              </View>

            </View>
          </View>

          {/* Banner */}
          <View style={styles.bannerContainer}>
            <Feather name="shield" size={18} color={COLORS.green} style={styles.bannerIcon} />
            <Text style={styles.bannerText}>A complete profile builds trust and helps you get more work.</Text>
          </View>

          {/* Form Content */}
          <View style={styles.formContainer}>

            {/* Contractor Type */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <FontAwesome5 name="hard-hat" size={18} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Contractor Type <Text style={styles.asterisk}>*</Text></Text>
                <TouchableOpacity style={styles.dropdownBox} onPress={() => setActiveModal('type')}>
                  <Text style={[styles.dropdownText, !contractorType && { color: COLORS.textMuted }]}>
                    {contractorType || 'Select contractor type'}
                  </Text>
                  <Feather name="chevron-down" size={20} color={COLORS.textDark} />
                </TouchableOpacity>
                <Text style={styles.helperText}>e.g. Civil Contractor, Plumbing Contractor, Electrical Contractor, etc.</Text>
              </View>
            </View>

            {/* Team Size */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <Feather name="users" size={18} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Team Size <Text style={styles.asterisk}>*</Text></Text>
                <TouchableOpacity style={styles.dropdownBox} onPress={() => setActiveModal('size')}>
                  <Text style={[styles.dropdownText, !teamSize && { color: COLORS.textMuted }]}>
                    {teamSize || 'Select team size'}
                  </Text>
                  <Feather name="chevron-down" size={20} color={COLORS.textDark} />
                </TouchableOpacity>
                <Text style={styles.helperText}>Number of people in your team</Text>
              </View>
            </View>

            {/* Work Category */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <FontAwesome5 name="tools" size={18} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Work Category <Text style={styles.asterisk}>*</Text></Text>
                <TouchableOpacity style={styles.chipsDropdownBox} onPress={() => setActiveModal('category')}>
                  <View style={styles.chipsContainer}>
                    {workCategory.map((cat) => (
                      <View key={cat} style={styles.chipItem}>
                        <Text style={styles.chipText}>{cat}</Text>
                        <TouchableOpacity onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveChip(cat, workCategory, setWorkCategory);
                        }}>
                          <Feather name="x" size={12} color={COLORS.textDark} style={styles.chipIcon} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {workCategory.length === 0 && (
                      <Text style={styles.dropdownTextPlaceholder}>Select work categories</Text>
                    )}
                  </View>
                  <Feather name="chevron-down" size={20} color={COLORS.textDark} style={styles.chipsDropdownIcon} />
                </TouchableOpacity>
                <Text style={styles.helperText}>Select all that apply</Text>
              </View>
            </View>

            {/* Service Location */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <Feather name="map-pin" size={18} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Service Location <Text style={styles.asterisk}>*</Text></Text>
                <TouchableOpacity style={styles.chipsDropdownBox} onPress={() => setActiveModal('location')}>
                  <View style={styles.chipsContainer}>
                    {serviceLocation.map((loc) => (
                      <View key={loc} style={styles.chipItem}>
                        <Text style={styles.chipText}>{loc}</Text>
                        <TouchableOpacity onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveChip(loc, serviceLocation, setServiceLocation);
                        }}>
                          <Feather name="x" size={12} color={COLORS.textDark} style={styles.chipIcon} />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {serviceLocation.length === 0 && (
                      <Text style={styles.dropdownTextPlaceholder}>Select service locations</Text>
                    )}
                  </View>
                  <Feather name="chevron-down" size={20} color={COLORS.textDark} style={styles.chipsDropdownIcon} />
                </TouchableOpacity>
                <Text style={styles.helperText}>Add areas/cities where you provide services</Text>
              </View>
            </View>

            {/* Years of Experience */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <Feather name="award" size={18} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Years of Experience <Text style={styles.asterisk}>*</Text></Text>
                <TouchableOpacity style={styles.dropdownBox} onPress={() => setActiveModal('experience')}>
                  <Text style={[styles.dropdownText, !experience && { color: COLORS.textMuted }]}>
                    {experience || 'Select experience'}
                  </Text>
                  <Feather name="chevron-down" size={20} color={COLORS.textDark} />
                </TouchableOpacity>
                <Text style={styles.helperText}>Total years of experience in this field</Text>
              </View>
            </View>

          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity 
              style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
              onPress={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save & Continue</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.skipBtn, saving && { opacity: 0.7 }]} 
              onPress={() => handleSave(true)}
              disabled={saving}
            >
              <Text style={styles.skipBtnText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Dynamic Overlay Modal Selector */}
      <Modal
        visible={activeModal !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActiveModal(null)}
      >
        {renderModalContent()}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: { paddingBottom: 40 },
  
  /* HEADER */
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backButton: { marginRight: 15 },
  headerTextCol: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted },
  headerBuildingImage: { width: 50, height: 50, borderRadius: 8 },

  /* STEPPER */
  stepperContainer: { paddingVertical: 25, paddingHorizontal: 40, alignItems: 'center', position: 'relative' },
  stepperLinesWrapper: { position: 'absolute', top: 38, left: 60, right: 60, height: 2, flexDirection: 'row' },
  stepperLine: { flex: 1, height: 2 },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  stepItem: { alignItems: 'center', width: 90 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8, zIndex: 2 },
  stepTextCompleted: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  stepTextActive: { fontSize: 10, color: COLORS.green, fontWeight: '700', textAlign: 'center' },
  stepTextInactive: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },
  stepNumberActive: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  stepNumberInactive: { color: COLORS.textMuted, fontSize: 12, fontWeight: '700' },

  /* BANNER */
  bannerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.greenLight, marginHorizontal: 20, padding: 12, borderRadius: 8, marginBottom: 25 },
  bannerIcon: { marginRight: 10 },
  bannerText: { flex: 1, color: COLORS.textDark, fontSize: 12, lineHeight: 18 },

  /* FORM */
  formContainer: { paddingHorizontal: 20 },
  formGroup: { flexDirection: 'row', marginBottom: 25 },
  iconCol: { width: 30, paddingTop: 14 },
  inputCol: { flex: 1 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  asterisk: { color: COLORS.red },
  helperText: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },

  /* DROPDOWN / CHIPS */
  dropdownBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white },
  dropdownText: { fontSize: 14, color: COLORS.textDark },
  dropdownTextPlaceholder: { fontSize: 14, color: COLORS.textMuted },
  
  chipsDropdownBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white },
  chipsContainer: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chipItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight, borderRadius: 16, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.border },
  chipText: { fontSize: 12, color: COLORS.textDark, marginRight: 4 },
  chipIcon: { opacity: 0.6 },
  chipsDropdownIcon: { marginLeft: 'auto', paddingLeft: 5 },

  /* ACTIONS */
  bottomActions: { paddingHorizontal: 20, paddingTop: 10, gap: 15 },
  saveBtn: { backgroundColor: COLORS.green, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  skipBtn: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.green, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
  skipBtnText: { color: COLORS.green, fontSize: 15, fontWeight: '700' },

  /* MODAL OVERLAY STYLE */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: height * 0.6 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  modalCloseBtn: { padding: 5 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalOptionSelected: { backgroundColor: COLORS.greenLight + '44' },
  modalOptionText: { fontSize: 15, color: COLORS.textDark },
  modalOptionTextSelected: { color: COLORS.green, fontWeight: '700' },
  modalDoneBtn: { backgroundColor: COLORS.green, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  modalDoneBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' }
});
