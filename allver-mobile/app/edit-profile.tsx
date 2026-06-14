import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Dimensions, Platform, KeyboardAvoidingView, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');

const COLORS = {
  green: '#10B981', // Premium emerald/teal accent color matching the web edit profile design
  greenLight: '#E6F4EA',
  textDark: '#1E293B',
  textMuted: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  bgLight: '#F8FAFC',
  blue: '#3B82F6',
  red: '#EF4444',
  redLight: '#FEE2E2',
};

const COUNTRY_LIST = ['India', 'United States', 'United Kingdom', 'UAE', 'Canada', 'Australia', 'Singapore'];

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

const EXPERIENCE_OPTIONS = [
  'Less than 1 year', '1–3 years', '3–5 years', '5–8 years',
  '8–10 years', '10–15 years', '15+ years'
];

const ARCHITECT_SPECS = [
  'Residential Design', 'Commercial Design', 'Interior Design', 'Urban Planning',
  'Landscape Architecture', 'Sustainable Design', '3D Visualization', 'Renovation',
  'Vastu Planning', 'Smart Homes', 'Heritage Restoration', 'Luxury Residential'
];

const PRESET_COVERS = [
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
];

import { BACKEND_URL } from '../constants/Config';

export default function EditProfileScreen() {
  const router = useRouter();
  
  // Refs for web hidden file input elements
  const coverInputRef = useRef<any>(null);
  const avatarInputRef = useRef<any>(null);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState({ cover: false, avatar: false });
  const [tagInput, setTagInput] = useState('');

  // Form Fields State
  const [fullName, setFullName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [about, setAbout] = useState('');
  const [experience, setExperience] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [coverPhoto, setCoverPhoto] = useState('');
  const [specialization, setSpecialization] = useState<string[]>([]);

  // Picker Modals Visibility
  const [experienceModalVisible, setExperienceModalVisible] = useState(false);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [stateModalVisible, setStateModalVisible] = useState(false);
  const [photoPickerVisible, setPhotoPickerVisible] = useState<{ type: 'cover' | 'avatar', visible: boolean }>({ type: 'cover', visible: false });

  const showAlert = (title: string, message: string, buttons?: { text: string, onPress?: () => void }[]) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n${message}`);
      if (buttons && buttons.length > 0 && buttons[0].onPress) {
        buttons[0].onPress();
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  useEffect(() => {
    let user = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) user = JSON.parse(stored);
    } else {
      user = (global as any).currentUser;
    }

    if (!user) {
      showAlert('Session Expired', 'Please log in again.');
      router.replace('/login');
      return;
    }

    setCurrentUser(user);
    setFullName(user.fullName || '');
    setFirmName(user.firmName || '');
    setAbout(user.about || user.shortDesc || '');
    setExperience(user.experience || '');
    setPhone(user.phoneNumber || user.phone || '');
    setWhatsappNumber(user.whatsappNumber || '');
    setCountry(user.country || 'India');
    setState(user.state || '');
    setCity(user.city || '');
    setArea(user.area || '');
    setProfilePhoto(user.avatarUrl || '');
    setCoverPhoto(user.cover || '');
    setSpecialization(user.specialization || []);
  }, []);

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !specialization.includes(trimmed)) {
      setSpecialization([...specialization, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setSpecialization(specialization.filter(t => t !== tag));
  };

  // Web file uploads
  const handleWebUpload = async (e: any, type: 'cover' | 'avatar') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(prev => ({ ...prev, [type === 'cover' ? 'cover' : 'avatar']: true }));
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        if (type === 'cover') {
          setCoverPhoto(data.url);
        } else {
          setProfilePhoto(data.url);
        }
      } else {
        showAlert('Upload Failed', data.message || 'Image upload failed.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Upload Error', 'Could not connect to the upload server.');
    } finally {
      setUploading(prev => ({ ...prev, [type === 'cover' ? 'cover' : 'avatar']: false }));
    }
  };

  // Mobile image picker and upload
  const pickImage = async (type: 'cover' | 'avatar') => {
    if (Platform.OS === 'web') {
      if (type === 'cover') coverInputRef.current?.click();
      else avatarInputRef.current?.click();
      return;
    }

    Alert.alert(
      "Choose an option",
      "Would you like to take a photo or select from your gallery?",
      [
        {
          text: "Camera",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              showAlert('Permission Required', 'Permission to access camera is required!');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: type === 'cover' ? [16, 9] : [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0].uri) {
              uploadMobileImage(result.assets[0].uri, type);
            }
          }
        },
        {
          text: "Gallery",
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              showAlert('Permission Required', 'Permission to access gallery is required!');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: type === 'cover' ? [16, 9] : [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0].uri) {
              uploadMobileImage(result.assets[0].uri, type);
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const uploadMobileImage = async (uri: string, type: 'cover' | 'avatar') => {
    setUploading(prev => ({ ...prev, [type]: true }));
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const fileType = match ? `image/${match[1]}` : `image`;

    formData.append('image', { uri, name: filename, type: fileType } as any);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        if (type === 'cover') setCoverPhoto(data.url);
        else setProfilePhoto(data.url);
      } else {
        showAlert('Upload Failed', data.message || 'Image upload failed.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Upload Error', 'Could not connect to the upload server.');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!fullName.trim()) {
      showAlert('Validation Error', 'Full Name is required.');
      return;
    }

    setSaving(true);

    const payload = {
      fullName,
      firmName,
      about,
      shortDesc: about,
      experience,
      phoneNumber: phone,
      phone,
      whatsappNumber,
      country,
      state,
      city,
      area,
      avatarUrl: profilePhoto,
      cover: coverPhoto,
      specialization,
      role: currentUser?.role || 'Architect'
    };

    try {
      const res = await fetch(`${BACKEND_URL}/api/user/profile/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        const updatedUser = { ...currentUser, ...payload, ...data.user };
        
        // Save back to session stores
        if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
        (global as any).currentUser = updatedUser;

        showAlert('Success', 'Profile updated successfully!', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        showAlert('Error', data.message || 'Failed to save profile changes.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Network Error', 'Server connection failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'RC';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={18} color={COLORS.textDark} />
            <Text style={styles.backButtonText}>Back to Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.saveChangesBtn, saving && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Feather name="save" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                <Text style={styles.saveChangesBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView bounces={true} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* TWO PANEL LAYOUT FOR EDITING */}
          <View style={styles.formContainer}>
            
            {/* LEFT COLUMN: Photos, About */}
            <View style={styles.leftCol}>
              
              {/* Cover Photo */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}><Feather name="image" size={14} /> COVER PHOTO</Text>
                <View style={styles.coverPreviewContainer}>
                  {coverPhoto ? (
                    <Image source={{ uri: coverPhoto }} style={styles.coverPreviewImage} contentFit="cover" />
                  ) : (
                    <View style={styles.coverPlaceholder} />
                  )}
                  
                  <TouchableOpacity 
                    style={styles.changeCoverBtn}
                    onPress={() => pickImage('cover')}
                    disabled={uploading.cover}
                  >
                    {uploading.cover ? (
                      <ActivityIndicator size="small" color={COLORS.textDark} />
                    ) : (
                      <>
                        <Feather name="camera" size={16} color={COLORS.textDark} style={{ marginRight: 6 }} />
                        <Text style={styles.changeCoverBtnText}>Change Cover</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {coverPhoto ? (
                    <TouchableOpacity style={styles.clearCoverBtn} onPress={() => setCoverPhoto('')}>
                      <Feather name="x" size={14} color={COLORS.white} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {Platform.OS === 'web' && React.createElement('input', {
                  type: 'file',
                  accept: 'image/*',
                  ref: coverInputRef,
                  style: { display: 'none' },
                  onChange: (e: any) => handleWebUpload(e, 'cover'),
                })}
              </View>

              {/* Profile Photo */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}><Feather name="user" size={14} /> PROFILE PHOTO</Text>
                <View style={styles.avatarPickerRow}>
                  <View style={styles.avatarPreview}>
                    {profilePhoto ? (
                      <Image source={{ uri: profilePhoto }} style={styles.avatarImage} contentFit="cover" />
                    ) : (
                      <Text style={styles.avatarInitials}>{initials}</Text>
                    )}
                    <TouchableOpacity 
                      style={styles.avatarCamIcon}
                      onPress={() => pickImage('avatar')}
                    >
                      <Feather name="camera" size={12} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.avatarMetaCol}>
                    <Text style={styles.avatarMetaName}>{fullName || 'Your Name'}</Text>
                    <Text style={styles.avatarMetaRole}>{currentUser?.role || 'Architect'} • {city || 'Location'}</Text>
                    <View style={styles.avatarActionButtonsRow}>
                      <TouchableOpacity 
                        style={styles.avatarActionBtn}
                        onPress={() => pickImage('avatar')}
                        disabled={uploading.avatar}
                      >
                        {uploading.avatar ? (
                          <ActivityIndicator size="small" color={COLORS.green} />
                        ) : (
                          <>
                            <Feather name="upload" size={12} color={COLORS.green} style={{ marginRight: 4 }} />
                            <Text style={styles.avatarActionBtnText}>Upload Photo</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      {profilePhoto ? (
                        <TouchableOpacity style={[styles.avatarActionBtn, styles.removeAvatarBtn]} onPress={() => setProfilePhoto('')}>
                          <Feather name="trash-2" size={12} color={COLORS.red} style={{ marginRight: 4 }} />
                          <Text style={[styles.avatarActionBtnText, { color: COLORS.red }]}>Remove</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>

                {Platform.OS === 'web' && React.createElement('input', {
                  type: 'file',
                  accept: 'image/*',
                  ref: avatarInputRef,
                  style: { display: 'none' },
                  onChange: (e: any) => handleWebUpload(e, 'avatar'),
                })}
              </View>

              {/* Bio About */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}><Feather name="file-text" size={14} /> ABOUT / BIO</Text>
                <TextInput
                  style={styles.bioTextInput}
                  placeholder="Write a short professional bio about yourself or your firm…"
                  placeholderTextColor={COLORS.textMuted}
                  multiline={true}
                  numberOfLines={5}
                  maxLength={500}
                  value={about}
                  onChangeText={setAbout}
                />
                <Text style={styles.bioCounterText}>{about.length} / 500 characters</Text>
              </View>

            </View>

            {/* RIGHT COLUMN: Basic Info, Location, Contact */}
            <View style={styles.rightCol}>

              {/* Basic Information */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}><Feather name="edit-3" size={14} /> BASIC INFORMATION</Text>
                
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>FULL NAME <Text style={styles.asterisk}>*</Text></Text>
                  <View style={styles.inputContainer}>
                    <Feather name="user" size={14} color={COLORS.textMuted} style={styles.fieldIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Rohit Chaudhari"
                      placeholderTextColor={COLORS.textMuted}
                      value={fullName}
                      onChangeText={setFullName}
                    />
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>COMPANY / FIRM NAME</Text>
                  <View style={styles.inputContainer}>
                    <Feather name="briefcase" size={14} color={COLORS.textMuted} style={styles.fieldIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Sharma Architects & Associates"
                      placeholderTextColor={COLORS.textMuted}
                      value={firmName}
                      onChangeText={setFirmName}
                    />
                  </View>
                </View>

                <View style={styles.rowFields}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.fieldLabel}>PROFESSION / ROLE</Text>
                    <View style={styles.readOnlyBadge}>
                      <Text style={styles.readOnlyBadgeText}>{currentUser?.role || 'Architect'}</Text>
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>EXPERIENCE</Text>
                    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setExperienceModalVisible(true)}>
                      <Text style={experience ? styles.dropdownTriggerTextSelected : styles.dropdownTriggerText}>
                        {experience || 'Select experience'}
                      </Text>
                      <Feather name="chevron-down" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

              </View>

              {/* Specializations */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}><Feather name="award" size={14} /> SPECIALIZATIONS</Text>
                
                {/* Chip display */}
                <View style={styles.chipsContainer}>
                  {specialization.map((tag) => (
                    <View key={tag} style={styles.chipTag}>
                      <Text style={styles.chipTagText}>{tag}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={styles.chipTagRemoveBtn}>
                        <Feather name="x" size={10} color={COLORS.green} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {specialization.length === 0 && (
                    <Text style={styles.chipsEmptyText}>No specializations added yet</Text>
                  )}
                </View>

                {/* Add Input */}
                <View style={styles.tagInputWrapper}>
                  <Feather name="plus" size={14} color={COLORS.textMuted} style={styles.tagInputIcon} />
                  <TextInput
                    style={styles.tagInput}
                    placeholder="Type & press Enter to add..."
                    placeholderTextColor={COLORS.textMuted}
                    value={tagInput}
                    onChangeText={setTagInput}
                    onSubmitEditing={handleAddTag}
                  />
                  {tagInput ? (
                    <TouchableOpacity style={styles.tagAddButton} onPress={handleAddTag}>
                      <Text style={styles.tagAddButtonText}>Add</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Suggestions */}
                <Text style={styles.suggestionsHeader}>Quick add suggestions:</Text>
                <View style={styles.suggestionsWrapper}>
                  {ARCHITECT_SPECS.filter(tag => !specialization.includes(tag)).map((tag) => (
                    <TouchableOpacity key={tag} style={styles.suggestionChip} onPress={() => setSpecialization([...specialization, tag])}>
                      <Feather name="plus" size={10} color={COLORS.textMuted} style={{ marginRight: 3 }} />
                      <Text style={styles.suggestionChipText}>{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

              </View>

              {/* Location */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}><Feather name="map-pin" size={14} /> LOCATION</Text>
                
                <View style={styles.rowFields}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.fieldLabel}>COUNTRY</Text>
                    <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setCountryModalVisible(true)}>
                      <Text style={styles.dropdownTriggerTextSelected}>{country}</Text>
                      <Feather name="chevron-down" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>STATE / PROVINCE</Text>
                    {country === 'India' ? (
                      <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setStateModalVisible(true)}>
                        <Text style={state ? styles.dropdownTriggerTextSelected : styles.dropdownTriggerText}>
                          {state || 'Select state'}
                        </Text>
                        <Feather name="chevron-down" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.inputContainer}>
                        <TextInput
                          style={styles.textInput}
                          placeholder="State / Province"
                          placeholderTextColor={COLORS.textMuted}
                          value={state}
                          onChangeText={setState}
                        />
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.rowFields}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.fieldLabel}>CITY</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Kalwa"
                        placeholderTextColor={COLORS.textMuted}
                        value={city}
                        onChangeText={setCity}
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>AREA / LOCALITY</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Bandra West"
                        placeholderTextColor={COLORS.textMuted}
                        value={area}
                        onChangeText={setArea}
                      />
                    </View>
                  </View>
                </View>

              </View>

              {/* Contact Details */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}><Feather name="phone" size={14} /> CONTACT DETAILS</Text>
                
                <View style={styles.rowFields}>
                  
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 10 }]}>
                    <Text style={styles.fieldLabel}>PHONE NUMBER</Text>
                    <View style={styles.phoneInputBox}>
                      <View style={styles.phonePrefix}>
                        <Text style={styles.phonePrefixText}>+91</Text>
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="3898521475"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>WHATSAPP NUMBER</Text>
                    <View style={styles.phoneInputBox}>
                      <View style={styles.phonePrefix}>
                        <Feather name="message-circle" size={14} color="#25D366" />
                      </View>
                      <TextInput
                        style={styles.phoneInput}
                        placeholder="Same or different"
                        placeholderTextColor={COLORS.textMuted}
                        keyboardType="phone-pad"
                        value={whatsappNumber}
                        onChangeText={setWhatsappNumber}
                      />
                    </View>
                  </View>

                </View>
                <Text style={styles.phoneFieldHint}>This will appear on your public profile for client contact.</Text>
              </View>

              {/* Bottom Actions */}
              <View style={styles.bottomActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.saveProfileBtn, saving && { opacity: 0.7 }]} 
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Feather name="save" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                      <Text style={styles.saveProfileBtnText}>Save Profile</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* EXPERIENCE SELECTOR MODAL */}
      <Modal visible={experienceModalVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setExperienceModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Experience</Text>
              <TouchableOpacity onPress={() => setExperienceModalVisible(false)}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <TouchableOpacity 
                  key={opt} 
                  style={styles.modalOption} 
                  onPress={() => {
                    setExperience(opt);
                    setExperienceModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{opt}</Text>
                  {experience === opt ? <Feather name="check" size={16} color={COLORS.green} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* COUNTRY SELECTOR MODAL */}
      <Modal visible={countryModalVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCountryModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {COUNTRY_LIST.map((opt) => (
                <TouchableOpacity 
                  key={opt} 
                  style={styles.modalOption} 
                  onPress={() => {
                    setCountry(opt);
                    if (opt !== 'India') setState(''); // Clear states if non-India
                    setCountryModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{opt}</Text>
                  {country === opt ? <Feather name="check" size={16} color={COLORS.green} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* STATE SELECTOR MODAL */}
      <Modal visible={stateModalVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setStateModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setStateModalVisible(false)}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300 }}>
              {INDIA_STATES.map((opt) => (
                <TouchableOpacity 
                  key={opt} 
                  style={styles.modalOption} 
                  onPress={() => {
                    setState(opt);
                    setStateModalVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{opt}</Text>
                  {state === opt ? <Feather name="check" size={16} color={COLORS.green} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* PHOTO PRESET / URL PICKER MODAL (FOR MOBILE EXPO CLIENTS) */}
      <Modal visible={photoPickerVisible.visible} transparent={true} animationType="slide">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setPhotoPickerVisible({ type: 'cover', visible: false })}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {photoPickerVisible.type === 'cover' ? 'Cover' : 'Profile'} Photo</Text>
              <TouchableOpacity onPress={() => setPhotoPickerVisible({ type: 'cover', visible: false })}>
                <Feather name="x" size={20} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.presetHeading}>Choose a beautiful preset:</Text>
            <View style={styles.presetImagesRow}>
              {(photoPickerVisible.type === 'cover' ? PRESET_COVERS : PRESET_AVATARS).map((url, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.presetImageBtn} 
                  onPress={() => {
                    if (photoPickerVisible.type === 'cover') {
                      setCoverPhoto(url);
                    } else {
                      setProfilePhoto(url);
                    }
                    setPhotoPickerVisible({ type: 'cover', visible: false });
                  }}
                >
                  <Image source={{ uri: url }} style={styles.presetThumbnail} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.presetHeading, { marginTop: 15 }]}>Or enter a custom URL:</Text>
            <TextInput
              style={styles.presetUrlInput}
              placeholder="https://example.com/image.jpg"
              placeholderTextColor={COLORS.textMuted}
              onSubmitEditing={(e) => {
                const val = e.nativeEvent.text.trim();
                if (val) {
                  if (photoPickerVisible.type === 'cover') {
                    setCoverPhoto(val);
                  } else {
                    setProfilePhoto(val);
                  }
                }
                setPhotoPickerVisible({ type: 'cover', visible: false });
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  
  /* HEADER */
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { flexDirection: 'row', alignItems: 'center' },
  backButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textDark, marginLeft: 8 },
  saveChangesBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveChangesBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },

  scrollContent: { paddingBottom: 40 },

  /* LAYOUT */
  formContainer: {
    padding: 20,
    flexDirection: width > 768 ? 'row' : 'column',
    gap: 20,
  },
  leftCol: {
    flex: width > 768 ? 1.2 : 1,
    gap: 20,
  },
  rightCol: {
    flex: width > 768 ? 2 : 1,
    gap: 20,
  },

  /* CARDS */
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 16,
    textTransform: 'uppercase',
  },

  /* COVER PHOTO */
  coverPreviewContainer: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  coverPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1E293B',
  },
  coverPreviewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  changeCoverBtn: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 20,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  changeCoverBtnText: { fontSize: 12, color: COLORS.textDark, fontWeight: '600' },
  clearCoverBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* PROFILE PHOTO */
  avatarPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.greenLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 40 },
  avatarInitials: { fontSize: 24, fontWeight: '800', color: COLORS.green },
  avatarCamIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarMetaCol: { flex: 1 },
  avatarMetaName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 4 },
  avatarMetaRole: { fontSize: 13, color: COLORS.textMuted, marginBottom: 12 },
  avatarActionButtonsRow: { flexDirection: 'row', gap: 8 },
  avatarActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
  },
  removeAvatarBtn: { borderColor: COLORS.redLight, backgroundColor: COLORS.redLight + '22' },
  avatarActionBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.green },

  /* BIO */
  bioTextInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textDark,
    height: 100,
    textAlignVertical: 'top',
  },
  bioCounterText: { fontSize: 11, color: COLORS.textMuted, alignSelf: 'flex-end', marginTop: 6 },

  /* FORM INPUT FIELDS */
  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, marginBottom: 8, letterSpacing: 0.3 },
  asterisk: { color: COLORS.red },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
  },
  fieldIcon: { marginRight: 10 },
  textInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.textDark },
  rowFields: { flexDirection: 'row' },
  
  readOnlyBadge: {
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.green + '22',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  readOnlyBadgeText: { fontSize: 14, fontWeight: '700', color: COLORS.green },

  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
  },
  dropdownTriggerText: { fontSize: 14, color: COLORS.textMuted },
  dropdownTriggerTextSelected: { fontSize: 14, color: COLORS.textDark, fontWeight: '500' },

  /* SPECIALIZATIONS */
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
    backgroundColor: COLORS.bgLight,
    marginBottom: 16,
  },
  chipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    borderWidth: 1,
    borderColor: COLORS.green + '22',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipTagText: { fontSize: 12, fontWeight: '600', color: COLORS.green, marginRight: 6 },
  chipTagRemoveBtn: { padding: 2 },
  chipsEmptyText: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  
  tagInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    marginBottom: 16,
  },
  tagInputIcon: { marginRight: 10 },
  tagInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.textDark },
  tagAddButton: {
    backgroundColor: COLORS.green,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagAddButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },

  suggestionsHeader: { fontSize: 11, fontWeight: '800', color: COLORS.textMuted, marginBottom: 8 },
  suggestionsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  suggestionChipText: { fontSize: 12, color: COLORS.textDark, fontWeight: '500' },

  /* PHONE INPUT */
  phoneInputBox: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    flex: 1,
  },
  phonePrefix: {
    backgroundColor: COLORS.bgLight,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  phonePrefixText: { fontSize: 14, fontWeight: '600', color: COLORS.textDark },
  phoneInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, color: COLORS.textDark },
  phoneFieldHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },

  /* BOTTOM ACTIONS */
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: COLORS.textDark, fontSize: 14, fontWeight: '600' },
  saveProfileBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveProfileBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionText: { fontSize: 14, color: COLORS.textDark, fontWeight: '500' },

  /* PRESETS */
  presetHeading: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 10 },
  presetImagesRow: { flexDirection: 'row', gap: 12 },
  presetImageBtn: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.border },
  presetThumbnail: { width: '100%', height: '100%' },
  presetUrlInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: COLORS.textDark,
    marginTop: 8,
  },
});
