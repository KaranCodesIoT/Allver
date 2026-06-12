import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Dimensions, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';

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
  blue: '#3B82F6'
};

export default function ArchitectProfileScreen() {
  const router = useRouter();
  
  // State for mock inputs
  const [firmName, setFirmName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
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
      specialization: ['Residential'],
    } : {
      firmName: firmName || 'Architect Office',
      experience: '1-3 years',
      specialization: ['Residential', 'Interior Design'],
      whatsappNumber: whatsapp || '',
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Header with Back Button and Title */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
          <View style={styles.headerTextCol}>
            <Text style={styles.headerTitle}>Architect Profile</Text>
            <Text style={styles.headerSubtitle}>Complete your profile to get discovered</Text>
          </View>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=200&auto=format&fit=crop' }} 
            style={styles.headerHouseImage}
            contentFit="cover"
          />
        </View>

        <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Progress Stepper */}
          <View style={styles.stepperContainer}>
            {/* Lines */}
            <View style={styles.stepperLinesWrapper}>
              <View style={[styles.stepperLine, { backgroundColor: COLORS.green }]} />
              <View style={[styles.stepperLine, { backgroundColor: COLORS.border }]} />
            </View>
            
            {/* Steps */}
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
                <Text style={styles.stepTextActive}>Architect Profile</Text>
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
            <Text style={styles.bannerText}>Complete your profile to build trust and get more project inquiries.</Text>
          </View>

          {/* Form Content */}
          <View style={styles.formContainer}>

            {/* Firm Name */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <FontAwesome5 name="building" size={20} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Firm Name <Text style={styles.optionalText}>(Optional)</Text></Text>
                <View style={styles.inputBox}>
                  <TextInput 
                    style={styles.input} 
                    placeholder="Enter your firm / company name" 
                    placeholderTextColor={COLORS.textMuted}
                    value={firmName}
                    onChangeText={setFirmName}
                  />
                </View>
                <Text style={styles.helperText}>You can add this later</Text>
              </View>
            </View>

            {/* Experience */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <FontAwesome5 name="briefcase" size={20} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Experience <Text style={styles.optionalText}>(in years)</Text> <Text style={styles.asterisk}>*</Text></Text>
                <TouchableOpacity style={styles.dropdownBox}>
                  <Text style={styles.dropdownText}>Select your experience</Text>
                  <Feather name="chevron-down" size={20} color={COLORS.textDark} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Portfolio Images */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <Feather name="image" size={20} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Portfolio Images <Text style={styles.asterisk}>*</Text></Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                  {[
                    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=300&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=300&auto=format&fit=crop',
                    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=300&auto=format&fit=crop'
                  ].map((uri, idx) => (
                    <View key={idx} style={styles.portfolioImageWrapper}>
                      <Image source={{ uri }} style={styles.portfolioImage} contentFit="cover" />
                      <TouchableOpacity style={styles.removeImageBtn}>
                        <Feather name="x" size={12} color={COLORS.textDark} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.addImagesBtn}>
                  <Feather name="plus" size={16} color={COLORS.blue} />
                  <Text style={styles.addImagesText}>Add More Images</Text>
                  <Text style={styles.addImagesSub}>Upload project photos (Max 10 images)</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Specialization */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <Feather name="star" size={20} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Specialization <Text style={styles.asterisk}>*</Text></Text>
                <View style={styles.chipsBox}>
                  {['Residential', 'Interior Design', 'Commercial'].map((chip, idx) => (
                    <View key={idx} style={styles.chipItem}>
                      <Text style={styles.chipText}>{chip}</Text>
                      <Feather name="x" size={14} color={COLORS.textDark} style={styles.chipIcon} />
                    </View>
                  ))}
                  <Feather name="chevron-down" size={20} color={COLORS.textDark} style={styles.chipsDropdownIcon} />
                </View>
                <Text style={styles.helperText}>Select all that apply</Text>
              </View>
            </View>

            {/* Service Area */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <Feather name="map-pin" size={20} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Service Area <Text style={styles.optionalText}>(Cities / Areas)</Text> <Text style={styles.asterisk}>*</Text></Text>
                <View style={styles.chipsBox}>
                  {['Mumbai', 'Pune', 'Navi Mumbai'].map((chip, idx) => (
                    <View key={idx} style={styles.chipItem}>
                      <Text style={styles.chipText}>{chip}</Text>
                      <Feather name="x" size={14} color={COLORS.textDark} style={styles.chipIcon} />
                    </View>
                  ))}
                  <Feather name="chevron-down" size={20} color={COLORS.textDark} style={styles.chipsDropdownIcon} />
                </View>
                <Text style={styles.helperText}>Add the cities / areas where you provide services</Text>
              </View>
            </View>

            {/* WhatsApp Number */}
            <View style={styles.formGroup}>
              <View style={styles.iconCol}>
                <FontAwesome5 name="whatsapp" size={20} color={COLORS.green} />
              </View>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>WhatsApp Number <Text style={styles.asterisk}>*</Text></Text>
                <View style={styles.phoneInputBox}>
                  <View style={styles.countryCodeBox}>
                    <Text style={styles.countryCodeText}>+91</Text>
                    <Feather name="chevron-down" size={16} color={COLORS.textDark} />
                  </View>
                  <TextInput 
                    style={styles.phoneInput} 
                    placeholder="98765 43210" 
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="phone-pad"
                    value={whatsapp}
                    onChangeText={setWhatsapp}
                  />
                </View>
                <Text style={styles.helperText}>This number will be shown to clients for easy contact</Text>
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
  headerHouseImage: { width: 50, height: 50, borderRadius: 8 },

  /* STEPPER */
  stepperContainer: { paddingVertical: 25, paddingHorizontal: 40, alignItems: 'center', position: 'relative' },
  stepperLinesWrapper: { position: 'absolute', top: 38, left: 60, right: 60, height: 2, flexDirection: 'row' },
  stepperLine: { flex: 1, height: 2 },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  stepItem: { alignItems: 'center', width: 80 },
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
  iconCol: { width: 30, paddingTop: 3 },
  inputCol: { flex: 1 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 8 },
  optionalText: { fontWeight: '400', color: COLORS.textMuted },
  asterisk: { color: COLORS.red },
  inputBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 12 },
  input: { fontSize: 14, color: COLORS.textDark },
  helperText: { fontSize: 11, color: COLORS.textMuted, marginTop: 6 },

  /* DROPDOWN / CHIPS */
  dropdownBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 15, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { fontSize: 14, color: COLORS.textDark },
  chipsBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chipItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  chipText: { fontSize: 12, color: COLORS.textDark, marginRight: 6 },
  chipIcon: { opacity: 0.5 },
  chipsDropdownIcon: { marginLeft: 'auto', paddingRight: 5 },

  /* PHONE INPUT */
  phoneInputBox: { flexDirection: 'row', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' },
  countryCodeBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight, paddingHorizontal: 15, borderRightWidth: 1, borderRightColor: COLORS.border },
  countryCodeText: { fontSize: 14, color: COLORS.textDark, marginRight: 5 },
  phoneInput: { flex: 1, paddingHorizontal: 15, paddingVertical: 12, fontSize: 14, color: COLORS.textDark },

  /* IMAGES */
  imagesScroll: { flexDirection: 'row', marginBottom: 15 },
  portfolioImageWrapper: { width: 100, height: 75, borderRadius: 8, overflow: 'hidden', marginRight: 10, position: 'relative' },
  portfolioImage: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 5, right: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.white, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity: 0.2, shadowRadius: 2 },
  addImagesBtn: { borderWidth: 1, borderColor: '#BFDBFE', borderStyle: 'dashed', borderRadius: 8, backgroundColor: '#EFF6FF', paddingVertical: 15, alignItems: 'center' },
  addImagesText: { fontSize: 13, fontWeight: '700', color: COLORS.blue, marginTop: 5, marginBottom: 2 },
  addImagesSub: { fontSize: 11, color: COLORS.textMuted },

  /* ACTIONS */
  bottomActions: { paddingHorizontal: 20, paddingTop: 10, gap: 15 },
  saveBtn: { backgroundColor: COLORS.green, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  skipBtn: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.green, borderRadius: 8, paddingVertical: 15, alignItems: 'center' },
  skipBtnText: { color: COLORS.green, fontSize: 15, fontWeight: '700' },

  /* MODALS */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: height * 0.6 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  modalCloseBtn: { padding: 5 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalOptionText: { fontSize: 16, color: COLORS.textDark },
  modalDoneBtn: { backgroundColor: COLORS.green, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  modalDoneBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' }
});
