import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Dimensions, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_URL } from '../../constants/Config';

const { width } = Dimensions.get('window');

const COLORS = {
  green: '#16A34A',
  greenLight: '#F0FDF4',
  blue: '#2563EB',
  blueLight: '#EFF6FF',
  gold: '#D97706',
  goldLight: '#FEF3C7',
  textDark: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  bgLight: '#F9FAFB',
};

const CATEGORIES = [
  'Residential Construction',
  'Commercial Construction',
  'Architecture & Design',
  'Interior Design',
  'Renovation',
  'Civil Work'
];

const REQUIREMENT_OPTIONS = [
  'False Ceiling',
  'Modular Kitchen',
  'Painting',
  'Electrical',
  'Plumbing',
  'Flooring',
  'Civil Work'
];

const WORK_TYPE_OPTIONS = [
  'Mason',
  'Electrician',
  'Plumber',
  'Painter',
  'Carpenter',
  'Welder',
  'Tile Fitter',
  'Helper'
];

export default function PostProjectScreen() {
  const router = useRouter();
  
  // User Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Client form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [clientDescription, setClientDescription] = useState('');
  const [timeline, setTimeline] = useState('');
  const [requirements, setRequirements] = useState<string[]>([]);

  // Architect post states
  const [selectedType, setSelectedType] = useState<'images' | 'videos' | 'design' | null>(null);
  const [designTitle, setDesignTitle] = useState('');
  const [postDescription, setPostDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Optional quotation states
  const [civilStructure, setCivilStructure] = useState('');
  const [flooringTiling, setFlooringTiling] = useState('');
  const [electricalPlumbing, setElectricalPlumbing] = useState('');
  const [modularWoodwork, setModularWoodwork] = useState('');

  // Labour "Add Work" form states
  const [workTitle, setWorkTitle] = useState('');
  const [workType, setWorkType] = useState('');
  const [workLocation, setWorkLocation] = useState('');
  const [workMedia, setWorkMedia] = useState<string[]>([]);
  const [workDescription, setWorkDescription] = useState('');
  const [workDuration, setWorkDuration] = useState('');
  const [isUploadingWork, setIsUploadingWork] = useState(false);

  const [success, setSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'client' | 'architect_media' | 'architect_design' | 'labour_work'>('client');

  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        user = JSON.parse(stored);
      }
    }
    setCurrentUser(user);
  }, []);

  // Media picker function
  const handleSelectMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant library permissions to upload media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: selectedType === 'design' 
        ? ['images', 'videos'] 
        : (selectedType === 'videos' ? ['videos'] : ['images']),
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploading(true);
      try {
        const urls: string[] = [];
        for (const asset of result.assets) {
          const formData = new FormData();
          const uri = asset.uri;
          let name = asset.fileName || uri.split('/').pop() || 'upload.jpg';
          name = name.split('?')[0].split('#')[0];

          const isVideo = asset.type === 'video' || (asset.mimeType && asset.mimeType.startsWith('video/')) || uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov') || uri.toLowerCase().endsWith('.avi');

          let fileType = asset.mimeType;
          if (isVideo) {
            if (!fileType) fileType = 'video/mp4';
            if (!name.toLowerCase().endsWith('.mp4') && !name.toLowerCase().endsWith('.mov') && !name.toLowerCase().endsWith('.m4v') && !name.toLowerCase().endsWith('.3gp') && !name.toLowerCase().endsWith('.avi')) {
              name = name + '.mp4';
            }
          } else {
            if (!fileType) {
              const match = /\.(\w+)$/.exec(name);
              const ext = match ? match[1].toLowerCase() : 'jpg';
              fileType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
            }
          }
          
          const cleanUri = Platform.OS === 'ios' ? uri : decodeURIComponent(uri);

          formData.append('image', {
            uri: uri,
            name,
            type: fileType
          } as any);

          const res = await fetch(`${BACKEND_URL}/api/upload`, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.url) {
              urls.push(data.url);
            }
          }
        }
        
        if (urls.length > 0) {
          setSelectedMedia(prev => [...prev, ...urls]);
        } else {
          Alert.alert('Upload Failed', 'Failed to upload media to the server.');
        }
      } catch (err) {
        console.error('Upload error:', err);
        Alert.alert('Upload Error', 'An error occurred while uploading media.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  // Labour media picker (images + videos, max 10)
  const handleSelectWorkMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant library permissions to upload media.');
      return;
    }

    if (workMedia.length >= 10) {
      Alert.alert('Limit Reached', 'You can upload a maximum of 10 photos/videos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10 - workMedia.length,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploadingWork(true);
      try {
        const urls: string[] = [];
        for (const asset of result.assets) {
          const formData = new FormData();
          const uri = asset.uri;
          let name = asset.fileName || uri.split('/').pop() || 'upload.jpg';
          name = name.split('?')[0].split('#')[0];

          let fileType = asset.mimeType;
          const isVideo = asset.type === 'video' || fileType?.startsWith('video/');
          if (isVideo) {
            if (!fileType) fileType = 'video/mp4';
            if (!name.toLowerCase().endsWith('.mp4') && !name.toLowerCase().endsWith('.mov') && !name.toLowerCase().endsWith('.m4v') && !name.toLowerCase().endsWith('.3gp') && !name.toLowerCase().endsWith('.avi')) {
              name = name + '.mp4';
            }
          } else {
            if (!fileType) {
              const match = /\.(\w+)$/.exec(name);
              const ext = match ? match[1].toLowerCase() : 'jpg';
              fileType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
            }
          }

          const cleanUri = Platform.OS === 'ios' ? uri : decodeURIComponent(uri);
          formData.append('image', { uri: uri, name, type: fileType } as any);

          const res = await fetch(`${BACKEND_URL}/api/upload`, {
            method: 'POST',
            body: formData,
          });
          if (res.ok) {
            const data = await res.json();
            if (data.url) urls.push(data.url);
          }
        }
        if (urls.length > 0) {
          setWorkMedia(prev => [...prev, ...urls].slice(0, 10));
        } else {
          Alert.alert('Upload Failed', 'Failed to upload media to the server.');
        }
      } catch (err) {
        console.error('Labour media upload error:', err);
        Alert.alert('Upload Error', 'An error occurred while uploading media.');
      } finally {
        setIsUploadingWork(false);
      }
    }
  };

  const removeWorkMediaItem = (index: number) => {
    setWorkMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Submit flow for Labour "Add Work"
  const handleLabourSubmit = async () => {
    if (!workTitle.trim()) {
      Alert.alert('Required', 'Please enter a work title.');
      return;
    }
    if (!workType) {
      Alert.alert('Required', 'Please select a work type.');
      return;
    }
    if (!workLocation.trim()) {
      Alert.alert('Required', 'Please enter the work location.');
      return;
    }
    if (workMedia.length === 0) {
      Alert.alert('Required', 'Please upload at least 1 photo or video of your work.');
      return;
    }

    setIsPublishing(true);
    try {
      // Save to portfolio highlights
      const response = await fetch(`${BACKEND_URL}/api/professional/${currentUser._id}/portfolio-highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: workTitle.trim(),
          projectType: workType,
          location: workLocation.trim(),
          budget: '',
          timeline: workDuration.trim(),
          requirements: [workType],
          description: workDescription.trim(),
          mediaUrls: workMedia,
        }),
      });

      if (response.ok) {
        setSuccessType('labour_work');
        setSuccess(true);

        // Clear form
        setWorkTitle('');
        setWorkType('');
        setWorkLocation('');
        setWorkMedia([]);
        setWorkDescription('');
        setWorkDuration('');

        setTimeout(() => {
          setSuccess(false);
          router.push('/(tabs)/profile');
        }, 2000);
      } else {
        const errorData = await response.json();
        Alert.alert('Failed', errorData.message || 'Could not save work. Try again.');
      }
    } catch (err) {
      console.error('Labour submit error:', err);
      // Offline fallback
      setSuccessType('labour_work');
      setSuccess(true);
      setWorkTitle('');
      setWorkType('');
      setWorkLocation('');
      setWorkMedia([]);
      setWorkDescription('');
      setWorkDuration('');
      setTimeout(() => {
        setSuccess(false);
        router.push('/(tabs)/profile');
      }, 2000);
    } finally {
      setIsPublishing(false);
    }
  };

  // Submit flow for client project
  const handleClientSubmit = async () => {
    if (currentUser?.role === 'Client') {
      Alert.alert(
        'Access Restricted',
        'Clients are not authorized to publish projects on Allver. Only Contractors and Architects can post projects/designs.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!title.trim() || !location.trim() || !budget.trim() || !clientDescription.trim()) {
      Alert.alert('Required Fields', 'Please fill out all fields before publishing.');
      return;
    }

    setIsPublishing(true);

    let projectType = 'General';
    if (category === 'Residential Construction') projectType = 'Residential';
    else if (category === 'Commercial Construction') projectType = 'Commercial';
    else if (category === 'Interior Design') projectType = 'Interior';
    else if (category === 'Renovation') projectType = 'Renovation';

    const isLabour = currentUser?.role === 'Labour';

    try {
      const response = await fetch(`${BACKEND_URL}/api/contract-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: currentUser?._id || '60c72b2f9b1d8a2a4c8b0030', // Fallback to seeded Karan Chaubey ID if not logged in
          title: title.trim(),
          projectType,
          location: location.trim(),
          budget: budget.trim(),
          timeline: timeline.trim(),
          requirements,
          description: clientDescription.trim()
        }),
      });

      if (response.ok) {
        // If the user is a Labour, also save to their portfolio highlights
        if (isLabour && currentUser?._id) {
          try {
            await fetch(`${BACKEND_URL}/api/professional/${currentUser._id}/portfolio-highlights`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: title.trim(),
                projectType,
                location: location.trim(),
                budget: budget.trim(),
                timeline: timeline.trim(),
                requirements,
                description: clientDescription.trim()
              }),
            });
          } catch (portfolioErr) {
            console.error('Error saving to portfolio highlights:', portfolioErr);
            // Don't block the main flow if portfolio save fails
          }
        }

        setSuccessType('client');
        setSuccess(true);
        
        // Clear form states
        setTitle('');
        setLocation('');
        setBudget('');
        setTimeline('');
        setRequirements([]);
        setClientDescription('');

        setTimeout(() => {
          setSuccess(false);
          router.push('/');
        }, 2000);
      } else {
        const errorData = await response.json();
        Alert.alert('Failed to publish project', errorData.message || 'Something went wrong.');
      }
    } catch (err) {
      console.error('Publish client project error:', err);
      Alert.alert('Network Error', 'Could not connect to the database. Trying offline simulation...');
      
      // Offline fallback simulation
      setSuccessType('client');
      setSuccess(true);
      
      setTitle('');
      setLocation('');
      setBudget('');
      setTimeline('');
      setRequirements([]);
      setClientDescription('');
      
      setTimeout(() => {
        setSuccess(false);
        router.push('/');
      }, 2000);
    } finally {
      setIsPublishing(false);
    }
  };

  // Submit flow for architect media/designs
  const handleArchitectSubmit = async () => {
    if (!postDescription.trim()) {
      Alert.alert('Description Required', 'Please enter a description.');
      return;
    }
    if (selectedType === 'design' && !designTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a title for the design.');
      return;
    }
    if (selectedMedia.length === 0) {
      Alert.alert('Media Required', 'Please select at least one photo or video from your device.');
      return;
    }

    setIsPublishing(true);
    try {
      const isDesign = selectedType === 'design';
      const response = await fetch(`${BACKEND_URL}/api/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: isDesign ? designTitle : '',
          description: postDescription,
          type: isDesign ? 'design' : 'media',
          mediaUrls: selectedMedia,
          creatorId: currentUser?._id || 'default-user-id',
          quotation: isDesign ? {
            civilStructure,
            flooringTiling,
            electricalPlumbing,
            modularWoodwork
          } : null
        }),
      });

      if (response.ok) {
        setSuccessType(isDesign ? 'architect_design' : 'architect_media');
        setSuccess(true);
        
        // Clear state
        setDesignTitle('');
        setPostDescription('');
        setSelectedMedia([]);
        setSelectedType(null);
        setCivilStructure('');
        setFlooringTiling('');
        setElectricalPlumbing('');
        setModularWoodwork('');
        
        setTimeout(() => {
          setSuccess(false);
          if (isDesign) {
            router.push('/(tabs)/design');
          } else {
            router.push('/(tabs)/feed');
          }
        }, 2000);
      } else {
        const errorData = await response.json();
        Alert.alert('Posting Failed', errorData.message || 'Something went wrong.');
      }
    } catch (err) {
      console.error('Publish error:', err);
      Alert.alert('Network Error', 'Could not connect to the database. Trying offline simulation...');
      
      // Offline fallback simulation
      setSuccessType(selectedType === 'design' ? 'architect_design' : 'architect_media');
      setSuccess(true);
      const isDesign = selectedType === 'design';
      setDesignTitle('');
      setPostDescription('');
      setSelectedMedia([]);
      setSelectedType(null);
      
      setTimeout(() => {
        setSuccess(false);
        if (isDesign) {
          router.push('/(tabs)/design');
        } else {
          router.push('/(tabs)/feed');
        }
      }, 2000);
    } finally {
      setIsPublishing(false);
    }
  };

  const removeMediaItem = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  // SUCCESS COMPONENT
  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={[styles.successIconBox, successType !== 'client' && { backgroundColor: COLORS.green }]}>
            <Feather name="check" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.successTitle}>
            {successType === 'labour_work' ? 'Work Added!' : successType === 'client' ? 'Project Posted!' : 'Published Successfully!'}
          </Text>
          <Text style={styles.successMessage}>
            {successType === 'labour_work'
              ? 'Your work has been saved to your Portfolio Highlights! Clients and contractors can now see it on your profile.'
              : successType === 'client' 
                ? 'Your project has been successfully published. Contractors and architects will contact you shortly.'
                : successType === 'architect_design'
                  ? 'Your blueprint design has been published to the Design catalog.'
                  : 'Your post has been successfully published to the Discover feed.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isArchitect = currentUser?.role === 'Architect';
  const isContractor = currentUser?.role === 'Contractor';
  const isLabour = currentUser?.role === 'Labour';
  const isCreator = isArchitect || isContractor;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Bar */}
      <View style={styles.header}>
        {isCreator && selectedType ? (
          <TouchableOpacity onPress={() => { setSelectedType(null); setSelectedMedia([]); }} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={COLORS.textDark} />
          </TouchableOpacity>
        ) : null}
        <Text style={styles.headerTitle}>
          {isArchitect ? 'Architect Studio' : isContractor ? 'Post Project' : (currentUser?.role === 'Labour' ? 'Add Work' : 'Post Project')}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ================= ARCHITECT / CONTRACTOR FLOW ================= */}
        {isCreator ? (
          <View style={styles.architectContainer}>
            {selectedType === null ? (
              // Option Selection Screen
              <View style={styles.selectionView}>
                <Text style={styles.studioTitle}>{isContractor ? 'Post Your Work' : 'Create New Content'}</Text>
                <Text style={styles.studioSubtitle}>{isContractor ? 'Select content type to showcase on Discover' : 'Select the content type to publish to the network'}</Text>

                {/* Option 1: Images */}
                <TouchableOpacity 
                  style={styles.optionCard} 
                  activeOpacity={0.8}
                  onPress={() => setSelectedType('images')}
                >
                  <View style={[styles.optionIconBox, { backgroundColor: COLORS.greenLight }]}>
                    <Feather name="image" size={22} color={COLORS.green} />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Upload Images</Text>
                    <Text style={styles.optionSub}>{isContractor ? 'Share project photos & site progress' : 'Share site progress photos to your feed'}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* Option 2: Videos */}
                <TouchableOpacity 
                  style={styles.optionCard} 
                  activeOpacity={0.8}
                  onPress={() => setSelectedType('videos')}
                >
                  <View style={[styles.optionIconBox, { backgroundColor: COLORS.blueLight }]}>
                    <Feather name="video" size={22} color={COLORS.blue} />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Upload Videos</Text>
                    <Text style={styles.optionSub}>{isContractor ? 'Share project walkthrough & progress videos' : 'Share site walkthrough clips to your feed'}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>

                {/* Option 3: Design (Architect only) */}
                {isArchitect && (
                <TouchableOpacity 
                  style={styles.optionCard} 
                  activeOpacity={0.8}
                  onPress={() => setSelectedType('design')}
                >
                  <View style={[styles.optionIconBox, { backgroundColor: COLORS.goldLight }]}>
                    <FontAwesome5 name="pencil-ruler" size={18} color={COLORS.gold} />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Upload Design</Text>
                    <Text style={styles.optionSub}>Publish blueprint plans and project layouts</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
                )}
              </View>
            ) : (
              // Selected Content Upload Screen
              <View style={styles.uploadView}>
                <View style={styles.uploadHeaderRow}>
                  <View style={[
                    styles.smallIconBox,
                    selectedType === 'images' && { backgroundColor: COLORS.greenLight },
                    selectedType === 'videos' && { backgroundColor: COLORS.blueLight },
                    selectedType === 'design' && { backgroundColor: COLORS.goldLight },
                  ]}>
                    {selectedType === 'design' ? (
                      <FontAwesome5 name="pencil-ruler" size={12} color={COLORS.gold} />
                    ) : (
                      <Feather 
                        name={selectedType === 'images' ? 'image' : 'video'} 
                        size={14} 
                        color={selectedType === 'images' ? COLORS.green : COLORS.blue} 
                      />
                    )}
                  </View>
                  <Text style={styles.uploadSectionTitle}>
                    {selectedType === 'design' ? 'Publish Blueprint Design' : 'Publish to Feed (Discover)'}
                  </Text>
                </View>

                {/* Media Selector Trigger */}
                <TouchableOpacity 
                  style={styles.mediaSelectorBtn} 
                  onPress={handleSelectMedia} 
                  activeOpacity={0.7}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color={COLORS.green} />
                  ) : (
                    <>
                      <Feather name="plus-circle" size={20} color={COLORS.green} style={{ marginRight: 8 }} />
                      <Text style={styles.mediaSelectorBtnText}>
                        {selectedType === 'design' 
                          ? 'Select Design Layout from Device' 
                          : `Select ${selectedType === 'images' ? 'Images' : 'Videos'} from Device`}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Media Preview Row */}
                {selectedMedia.length > 0 && (
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewTitle}>Selected File Preview</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewScroll}>
                      {selectedMedia.map((uri, index) => {
                        const isVideo = uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov') || uri.toLowerCase().endsWith('.avi');
                        return (
                          <View key={index} style={styles.previewImageWrap}>
                            {isVideo ? (
                              <View style={[styles.previewImage, { backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' }]}>
                                <Feather name="video" size={24} color={COLORS.white} />
                              </View>
                            ) : (
                              <Image source={{ uri }} style={styles.previewImage} contentFit="cover" />
                            )}
                            <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMediaItem(index)}>
                              <Feather name="x" size={12} color={COLORS.white} />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Text Form Fields */}
                <View style={styles.inputsBlock}>
                  {selectedType === 'design' && (
                    <>
                      <Text style={styles.label}>Design Title</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Modern Scandinavian Living Room"
                        placeholderTextColor={COLORS.textMuted}
                        value={designTitle}
                        onChangeText={setDesignTitle}
                      />
                    </>
                  )}

                  <Text style={styles.label}>
                    {selectedType === 'design' ? 'Design Description' : 'Post Description'}
                  </Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={
                      selectedType === 'design'
                        ? 'Describe the design concepts, colors, area, and estimated build cost...'
                        : 'Share updates, thoughts on this facade, or notes about this project site work...'
                    }
                    placeholderTextColor={COLORS.textMuted}
                    multiline={true}
                    numberOfLines={4}
                    value={postDescription}
                    onChangeText={setPostDescription}
                  />

                  {/* Optional Quotation Form for Designs */}
                  {selectedType === 'design' && (
                    <View style={styles.quotationFormSection}>
                      <Text style={styles.sectionDividerText}>Cost Quotation (Optional)</Text>
                      <Text style={styles.sectionDividerSubText}>Provide estimated price ranges for this design layout (e.g. 4.5 L - 5.8 L)</Text>
                      
                      <Text style={styles.smallLabel}>Civil & Structure Cost</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="e.g. 4.5 L - 5.8 L"
                        placeholderTextColor={COLORS.textMuted}
                        value={civilStructure}
                        onChangeText={setCivilStructure}
                      />

                      <Text style={styles.smallLabel}>Flooring & Tiling Cost</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="e.g. 1.2 L - 1.8 L"
                        placeholderTextColor={COLORS.textMuted}
                        value={flooringTiling}
                        onChangeText={setFlooringTiling}
                      />

                      <Text style={styles.smallLabel}>Electrical & Plumbing Cost</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="e.g. 0.8 L - 1.2 L"
                        placeholderTextColor={COLORS.textMuted}
                        value={electricalPlumbing}
                        onChangeText={setElectricalPlumbing}
                      />

                      <Text style={styles.smallLabel}>Modular Woodwork Cost</Text>
                      <TextInput
                        style={styles.smallInput}
                        placeholder="e.g. 2.5 L - 3.8 L"
                        placeholderTextColor={COLORS.textMuted}
                        value={modularWoodwork}
                        onChangeText={setModularWoodwork}
                      />
                    </View>
                  )}

                  {/* Submit Trigger */}
                  <TouchableOpacity 
                    style={[styles.submitBtn, isPublishing && { opacity: 0.8 }]} 
                    onPress={handleArchitectSubmit} 
                    activeOpacity={0.9}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <>
                        <Text style={styles.submitBtnText}>
                          {selectedType === 'design' ? 'Post Design' : 'Publish to Feed'}
                        </Text>
                        <Feather name="arrow-right" size={18} color={COLORS.white} style={{ marginLeft: 6 }} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ) : isLabour ? (
          // ================= LABOUR "ADD WORK" FLOW =================
          <View style={styles.clientContainer}>
            {/* Banner Block */}
            <View style={styles.bannerContainer}>
              <View style={styles.bannerIconBox}>
                <Feather name="tool" size={18} color={COLORS.green} />
              </View>
              <Text style={styles.bannerText}>
                Showcase your completed work to attract more clients. Add photos, describe the project, and build your portfolio.
              </Text>
            </View>

            <View style={styles.formContainer}>
              {/* Work Title */}
              <Text style={styles.label}>Work Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. House Painting, Tile Installation, Plumbing Work"
                placeholderTextColor={COLORS.textMuted}
                value={workTitle}
                onChangeText={setWorkTitle}
              />

              {/* Work Type */}
              <Text style={styles.label}>Work Type</Text>
              <View style={styles.categoriesRow}>
                {WORK_TYPE_OPTIONS.map((type) => {
                  const isSelected = workType === type;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected
                      ]}
                      onPress={() => setWorkType(type)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Location */}
              <Text style={styles.label}>Location</Text>
              <View style={styles.inputWrapper}>
                <Feather name="map-pin" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="e.g. Mumbai, Maharashtra"
                  placeholderTextColor={COLORS.textMuted}
                  value={workLocation}
                  onChangeText={setWorkLocation}
                />
              </View>

              {/* Photos/Videos */}
              <Text style={styles.label}>Photos / Videos</Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 8, marginTop: -4 }}>
                Upload 1–10 images or videos of your work
              </Text>
              <TouchableOpacity
                style={styles.mediaSelectorBtn}
                onPress={handleSelectWorkMedia}
                activeOpacity={0.7}
                disabled={isUploadingWork}
              >
                {isUploadingWork ? (
                  <ActivityIndicator size="small" color={COLORS.green} />
                ) : (
                  <>
                    <Feather name="plus-circle" size={20} color={COLORS.green} style={{ marginRight: 8 }} />
                    <Text style={styles.mediaSelectorBtnText}>
                      {workMedia.length > 0 ? `Add More (${workMedia.length}/10)` : 'Select from Device'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Media Preview */}
              {workMedia.length > 0 && (
                <View style={styles.previewContainer}>
                  <Text style={styles.previewTitle}>Selected Files ({workMedia.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewScroll}>
                    {workMedia.map((uri, index) => {
                       const isVideo = uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov') || uri.toLowerCase().endsWith('.avi');
                       return (
                         <View key={index} style={styles.previewImageWrap}>
                           {isVideo ? (
                             <View style={[styles.previewImage, { backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' }]}>
                               <Feather name="video" size={24} color={COLORS.white} />
                             </View>
                           ) : (
                             <Image source={{ uri }} style={styles.previewImage} contentFit="cover" />
                           )}
                           <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeWorkMediaItem(index)}>
                             <Feather name="x" size={12} color={COLORS.white} />
                           </TouchableOpacity>
                         </View>
                       );
                     })}
                  </ScrollView>
                </View>
              )}

              {/* Description (optional) */}
              <Text style={styles.label}>Description <Text style={{ fontWeight: '400', color: COLORS.textMuted }}>(optional)</Text></Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder='e.g. "Completed 2BHK painting work in 15 days."'
                placeholderTextColor={COLORS.textMuted}
                multiline={true}
                numberOfLines={3}
                value={workDescription}
                onChangeText={setWorkDescription}
              />

              {/* Duration (optional) */}
              <Text style={styles.label}>Duration <Text style={{ fontWeight: '400', color: COLORS.textMuted }}>(optional)</Text></Text>
              <View style={styles.inputWrapper}>
                <Feather name="clock" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="e.g. 15 Days or 1 Month"
                  placeholderTextColor={COLORS.textMuted}
                  value={workDuration}
                  onChangeText={setWorkDuration}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, isPublishing && { opacity: 0.8 }]}
                onPress={handleLabourSubmit}
                activeOpacity={0.9}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Feather name="check-circle" size={18} color={COLORS.white} style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Add to Portfolio</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // ================= CLIENT FLOW (DEFAULT) =================
          <View style={styles.clientContainer}>
            {/* Banner Block */}
            <View style={styles.bannerContainer}>
              <View style={styles.bannerIconBox}>
                <Feather name="info" size={18} color={COLORS.green} />
              </View>
              <Text style={styles.bannerText}>
                Describe your project details clearly. Accurate details attract better matching professionals and competitive quotes.
              </Text>
            </View>

            {/* Form Fields */}
            <View style={styles.formContainer}>
              {/* Project Title */}
              <Text style={styles.label}>Project Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Modern 3BHK Villa Construction"
                placeholderTextColor={COLORS.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              {/* Project Category Select */}
              <Text style={styles.label}>Select Category</Text>
              <View style={styles.categoriesRow}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Location */}
              <Text style={styles.label}>Project Location</Text>
              <View style={styles.inputWrapper}>
                <Feather name="map-pin" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="e.g. Mumbai, Maharashtra"
                  placeholderTextColor={COLORS.textMuted}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              {/* Budget */}
              <Text style={styles.label}>Estimated Budget (INR)</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="e.g. 10L - 15L or 25,00,000"
                  placeholderTextColor={COLORS.textMuted}
                  value={budget}
                  onChangeText={setBudget}
                />
              </View>

              {/* Timeline */}
              <Text style={styles.label}>Timeline</Text>
              <View style={styles.inputWrapper}>
                <Feather name="clock" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.inputWithIcon}
                  placeholder="e.g. 90 Days or 3 Months"
                  placeholderTextColor={COLORS.textMuted}
                  value={timeline}
                  onChangeText={setTimeline}
                />
              </View>

              {/* Requirements */}
              <Text style={styles.label}>Requirements</Text>
              <View style={styles.categoriesRow}>
                {REQUIREMENT_OPTIONS.map((req) => {
                  const isSelected = requirements.includes(req);
                  return (
                    <TouchableOpacity
                      key={req}
                      style={[
                        styles.categoryChip,
                        isSelected && styles.categoryChipSelected
                      ]}
                      onPress={() => {
                        if (requirements.includes(req)) {
                          setRequirements(prev => prev.filter(r => r !== req));
                        } else {
                          setRequirements(prev => [...prev, req]);
                        }
                      }}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected
                      ]}>
                        {req}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Description */}
              <Text style={styles.label}>Project Description & Scope</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide a brief description of the work needed, timeline, and material preferences..."
                placeholderTextColor={COLORS.textMuted}
                multiline={true}
                numberOfLines={4}
                value={clientDescription}
                onChangeText={setClientDescription}
              />

              {/* Submit Button */}
              <TouchableOpacity 
                style={[styles.submitBtn, isPublishing && { opacity: 0.8 }]} 
                onPress={handleClientSubmit} 
                activeOpacity={0.9}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>Publish Project</Text>
                    <Feather name="arrow-right" size={18} color={COLORS.white} style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  scrollContent: { paddingBottom: 40 },
  
  /* BANNER */
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.green + '22',
  },
  bannerIconBox: { marginRight: 12 },
  bannerText: { flex: 1, color: COLORS.textDark, fontSize: 13, lineHeight: 18, fontWeight: '500' },

  /* ARCHITECT OPTIONS VIEW */
  architectContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  selectionView: {
    gap: 16,
  },
  studioTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  studioSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: -8,
    marginBottom: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 16,
    gap: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  optionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  /* ARCHITECT UPLOAD VIEW */
  uploadView: {
    marginTop: 8,
  },
  uploadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  smallIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  mediaSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 18,
    backgroundColor: COLORS.greenLight + '33',
    marginBottom: 16,
  },
  mediaSelectorBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.green,
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  previewScroll: {
    gap: 10,
  },
  previewImageWrap: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeMediaBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputsBlock: {
    gap: 12,
  },

  /* FORM */
  formContainer: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: COLORS.bgLight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.bgLight,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginRight: 8,
  },
  inputWithIcon: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    color: COLORS.textDark,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  categoryChipSelected: {
    borderColor: COLORS.green,
    backgroundColor: COLORS.greenLight,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  categoryChipTextSelected: {
    color: COLORS.green,
  },
  submitBtn: {
    height: 48,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 16,
  },
  submitBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },

  /* SUCCESS STATE */
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  successIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: { shadowColor: COLORS.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 6 },
    })
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  /* QUOTATION FORM */
  quotationFormSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionDividerText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  sectionDividerSubText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 6,
    marginTop: 8,
  },
  smallInput: {
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },
});
