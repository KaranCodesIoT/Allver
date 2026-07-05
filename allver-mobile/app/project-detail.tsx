import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TextInput, TouchableOpacity, Dimensions, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Feather, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';

const { width } = Dimensions.get('window');

const COLORS = {
  white: '#FFFFFF',
  textDark: '#111827',
  textMuted: '#6B7280',
  bgLight: '#F9FAFB',
  green: '#10B981',
  greenLight: '#D1FAE5',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  border: '#E5E7EB',
  starGold: '#FBBF24',
  purple: '#7C3AED',
  purpleLight: '#F3E8FF',
  bgPage: '#F3F4F6',
};

export default function ProjectDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const clientId = params.clientId as string;
  const titleHint = params.titleHint as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Application Modal state
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [bidCost, setBidCost] = useState('');
  const [bidDuration, setBidDuration] = useState('');
  const [bidProposal, setBidProposal] = useState('');
  const [siteVisitRequired, setSiteVisitRequired] = useState(false);
  const [portfolioMedia, setPortfolioMedia] = useState<string[]>([]);
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

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

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND_URL}/api/contract-requests/user/${clientId}`);
        const data = await res.json();
        
        if (data.requests && data.requests.length > 0) {
          // Find matching request or use the latest pending one
          let match = data.requests.find((r: any) => r.status === 'Pending' && (titleHint ? r.title.toLowerCase().includes(titleHint.toLowerCase()) : true));
          if (!match) {
            match = data.requests[0];
          }
          setProject(match);
        }
      } catch (err) {
        console.error('Error fetching project details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [clientId, titleHint]);

  const [hasApplied, setHasApplied] = useState(false);

  // Check if current user already applied
  useEffect(() => {
    if (!project?._id || !currentUser?._id) return;
    const checkExisting = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/project-bids/request/${project._id}`);
        const data = await res.json();
        if (data.bids) {
          const alreadyBid = data.bids.some((b: any) => 
            (b.professional?._id || b.professional) === currentUser._id
          );
          setHasApplied(alreadyBid);
        }
      } catch (e) {}
    };
    checkExisting();
  }, [project, currentUser]);

  const handleSelectPortfolio = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please grant library permissions to upload media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setIsUploadingPortfolio(true);
      try {
        const urls: string[] = [];
        for (const asset of result.assets) {
          const formData = new FormData();
          const uri = asset.uri;
          let name = asset.fileName || uri.split('/').pop() || 'upload.jpg';
          name = name.split('?')[0].split('#')[0];

          let fileType = asset.mimeType;
          if (!fileType) {
            const match = /\.(\w+)$/.exec(name);
            const ext = match ? match[1].toLowerCase() : 'jpg';
            fileType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
          }

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
          setPortfolioMedia(prev => [...prev, ...urls]);
        } else {
          Alert.alert('Upload Failed', 'Failed to upload media to the server.');
        }
      } catch (err) {
        console.error('Portfolio upload error:', err);
        Alert.alert('Upload Error', 'An error occurred while uploading portfolio.');
      } finally {
        setIsUploadingPortfolio(false);
      }
    }
  };

  const removePortfolioItem = (index: number) => {
    setPortfolioMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleApplySubmit = async () => {
    if (!bidCost.trim() || !bidDuration.trim() || !bidProposal.trim()) {
      Alert.alert('Required Fields', 'Please fill out all bid details.');
      return;
    }

    // Parse cost value to numeric
    const costStr = bidCost.trim().replace(/[^0-9.]/g, '');
    let costValue = parseFloat(costStr) || 0;
    if (costValue < 1000) costValue = costValue * 100000;

    const durationDays = parseInt(bidDuration.trim()) || 0;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/project-bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractRequest: project._id,
          professional: currentUser?._id,
          cost: `₹${bidCost.trim()}`,
          costValue,
          duration: `${bidDuration.trim()}`,
          durationDays,
          proposal: bidProposal.trim(),
          siteVisitRequired,
          portfolioAttachments: portfolioMedia
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setHasApplied(true);
        setTimeout(() => {
          setSuccess(false);
          setApplyModalVisible(false);
          setBidCost('');
          setBidDuration('');
          setBidProposal('');
          setSiteVisitRequired(false);
          setPortfolioMedia([]);
          router.push('/');
        }, 2500);
      } else {
        const errorData = await response.json();
        Alert.alert('Application Failed', errorData.message || 'Something went wrong.');
      }
    } catch (err) {
      console.error('Submit application error:', err);
      Alert.alert('Network Error', 'Could not connect to server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptInvitation = async (requestId: string) => {
    Alert.alert(
      'Accept Hire Request',
      'Are you sure you want to accept this hire request and start the project workspace?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: async () => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/contract-requests/${requestId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'Accepted',
                  professional: currentUser._id
                })
              });
              if (res.ok) {
                const data = await res.json();
                Alert.alert(
                  'Success!',
                  'You have accepted the project. A workspace has been created.',
                  [
                    {
                      text: 'Go to Workspace',
                      onPress: () => {
                        if (data.workspace && data.workspace._id) {
                          router.push({
                            pathname: '/project-progress',
                            params: { workspaceId: data.workspace._id }
                          });
                        } else {
                          router.push('/(tabs)');
                        }
                      }
                    },
                    { text: 'OK', onPress: () => router.push('/(tabs)') }
                  ]
                );
              } else {
                const err = await res.json();
                Alert.alert('Error', err.message || 'Failed to accept invitation.');
              }
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Network error.');
            }
          }
        }
      ]
    );
  };

  const handleRejectInvitation = async (requestId: string) => {
    Alert.alert(
      'Reject Hire Request',
      'Are you sure you want to reject this hire request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/contract-requests/${requestId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  status: 'Rejected',
                  professional: currentUser._id
                })
              });
              if (res.ok) {
                Alert.alert('Rejected', 'You have rejected the hire request.', [
                  { text: 'OK', onPress: () => router.push('/(tabs)') }
                ]);
              } else {
                Alert.alert('Error', 'Failed to reject invitation.');
              }
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Network error.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={styles.loadingText}>Loading project details...</Text>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Feather name="frown" size={40} color={COLORS.textMuted} />
        <Text style={styles.loadingText}>Project not found or already completed.</Text>
        <TouchableOpacity style={styles.backBtnAction} onPress={() => router.back()}>
          <Text style={styles.backBtnActionText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isProfessional = currentUser && ['Architect', 'Contractor'].includes(currentUser.role);
  const clientName = project.client?.fullName || 'Client';
  const clientAvatar = project.client?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=7C3AED&color=fff`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Project Details</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Project Meta Card */}
        <View style={styles.card}>
          <View style={styles.projectHeader}>
            <View style={styles.iconBox}>
              <Feather name="briefcase" size={20} color={COLORS.purple} />
            </View>
            <View style={styles.titleCol}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectLocation}>
                <Feather name="map-pin" size={12} color={COLORS.textMuted} /> {project.location}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Client Budget Range</Text>
              <Text style={styles.detailValue}>{project.budget}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Expected Timeline</Text>
              <Text style={styles.detailValue}>{project.timeline || '90 Days'}</Text>
            </View>
          </View>

          {/* Requirements list */}
          {project.requirements && project.requirements.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Key Requirements</Text>
              <View style={styles.badgeContainer}>
                {project.requirements.map((req: string, idx: number) => (
                  <View key={idx} style={styles.badge}>
                    <Text style={styles.badgeText}>{req}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Project Scope & Description</Text>
            <Text style={styles.descriptionText}>
              {project.description || 'No project description provided by the client.'}
            </Text>
          </View>
        </View>

        {/* Client Info Block */}
        <View style={styles.clientCard}>
          <Text style={styles.clientHeader}>Posted By</Text>
          <View style={styles.clientProfileRow}>
            <Image source={{ uri: clientAvatar }} style={styles.clientAvatar} />
            <View style={styles.clientMeta}>
              <Text style={styles.clientName}>{clientName}</Text>
              <View style={styles.ratingRow}>
                <FontAwesome name="star" size={12} color={COLORS.starGold} />
                <Text style={styles.ratingText}>5.0 (Client Rating)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Apply / Accept / Reject Buttons */}
        {isProfessional && (
          project && project.professional && (project.professional._id || project.professional) === currentUser?._id && project.status === 'Pending' ? (
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 10, marginBottom: 20 }}>
              <TouchableOpacity 
                style={[styles.applyBtn, { flex: 1, backgroundColor: COLORS.green, marginHorizontal: 0 }]} 
                activeOpacity={0.9}
                onPress={() => handleAcceptInvitation(project._id)}
              >
                <Feather name="check" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.applyBtnText}>Accept Hire</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.applyBtn, { flex: 1, backgroundColor: '#EF4444', marginHorizontal: 0 }]} 
                activeOpacity={0.9}
                onPress={() => handleRejectInvitation(project._id)}
              >
                <Feather name="x" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.applyBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          ) : hasApplied ? (
            <View style={[styles.applyBtn, { backgroundColor: '#9CA3AF', marginHorizontal: 20, marginTop: 10 }]}>
              <Feather name="check-circle" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.applyBtnText}>Already Applied</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.applyBtn, { marginHorizontal: 20, marginTop: 10 }]} 
              activeOpacity={0.9}
              onPress={() => setApplyModalVisible(true)}
            >
              <Feather name="send" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.applyBtnText}>Apply to this Project</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      {/* Application Form Modal */}
      <Modal
        visible={applyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setApplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {success ? (
            <View style={styles.successCard}>
              <View style={styles.successIconBox}>
                <Feather name="check" size={40} color={COLORS.white} />
              </View>
              <Text style={styles.successTitle}>Application Submitted!</Text>
              <Text style={styles.successSubtitle}>
                {clientName} has been notified. You will receive updates once they review your bid.
              </Text>
            </View>
          ) : (
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit Proposal</Text>
                <TouchableOpacity onPress={() => setApplyModalVisible(false)} style={styles.closeBtn}>
                  <Feather name="x" size={20} color={COLORS.textDark} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalProjectTitle}>{project.title}</Text>
                
                {/* Cost Bid */}
                <Text style={styles.label}>Your Quotation (₹)</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="Enter your estimated quotation"
                    placeholderTextColor={COLORS.textMuted}
                    value={bidCost}
                    onChangeText={setBidCost}
                  />
                </View>

                {/* Duration proposed */}
                <Text style={styles.label}>Estimated Completion Time</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="clock" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.inputWithIcon}
                    placeholder="e.g. 30 Days"
                    placeholderTextColor={COLORS.textMuted}
                    value={bidDuration}
                    onChangeText={setBidDuration}
                  />
                </View>

                {/* Cover letter / proposal */}
                <Text style={styles.label}>Proposal Message</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Introduce yourself, explain why you're suitable for this project, mention similar work you've completed, and include any important details."
                  placeholderTextColor={COLORS.textMuted}
                  multiline={true}
                  numberOfLines={4}
                  value={bidProposal}
                  onChangeText={setBidProposal}
                />

                {/* Site Visit Checkbox */}
                <Text style={styles.label}>Site Visit</Text>
                <TouchableOpacity 
                  style={styles.checkboxRow} 
                  onPress={() => setSiteVisitRequired(!siteVisitRequired)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, siteVisitRequired && styles.checkboxChecked]}>
                    {siteVisitRequired && <Feather name="check" size={12} color={COLORS.white} />}
                  </View>
                  <Text style={styles.checkboxLabel}>I would like to inspect the site before confirming the final quotation.</Text>
                </TouchableOpacity>

                {/* Attach Portfolio */}
                <Text style={styles.label}>Attach Portfolio <Text style={{ fontWeight: '400', color: COLORS.textMuted }}>(Optional)</Text></Text>
                <TouchableOpacity 
                  style={styles.attachBtn} 
                  onPress={handleSelectPortfolio}
                  activeOpacity={0.8}
                  disabled={isUploadingPortfolio}
                >
                  {isUploadingPortfolio ? (
                    <ActivityIndicator size="small" color={COLORS.purple} />
                  ) : (
                    <>
                      <Feather name="paperclip" size={16} color={COLORS.purple} style={{ marginRight: 6 }} />
                      <Text style={styles.attachBtnText}>Attach Photos/Videos</Text>
                    </>
                  )}
                </TouchableOpacity>

                {portfolioMedia.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.portfolioScroll} style={{ marginTop: 8 }}>
                    {portfolioMedia.map((uri, index) => {
                      const isVideo = uri.toLowerCase().endsWith('.mp4') || uri.toLowerCase().endsWith('.mov') || uri.toLowerCase().endsWith('.avi');
                      return (
                        <View key={index} style={styles.portfolioPreviewWrap}>
                          {isVideo ? (
                            <View style={[styles.portfolioPreview, { backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center' }]}>
                              <Feather name="video" size={18} color={COLORS.white} />
                            </View>
                          ) : (
                            <Image source={{ uri }} style={styles.portfolioPreview} contentFit="cover" />
                          )}
                          <TouchableOpacity style={styles.removePortfolioBtn} onPress={() => removePortfolioItem(index)}>
                            <Feather name="x" size={10} color={COLORS.white} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Submit button */}
                <TouchableOpacity 
                  style={[styles.submitBtn, isSubmitting && { opacity: 0.8 }]} 
                  onPress={handleApplySubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.9}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <>
                      <Text style={styles.submitBtnText}>Submit Proposal</Text>
                      <Feather name="arrow-right" size={16} color={COLORS.white} style={{ marginLeft: 6 }} />
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPage },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12, fontWeight: '600' },
  backBtnAction: { marginTop: 16, backgroundColor: COLORS.purple, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  backBtnActionText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 6, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  /* PROJECT CARD */
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  projectHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleCol: { flex: 1 },
  projectTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 2 },
  projectLocation: { fontSize: 12, color: COLORS.textMuted },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },
  detailsGrid: { flexDirection: 'row', gap: 16, marginBottom: 14 },
  detailItem: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 10,
  },
  detailLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '800', color: COLORS.textDark },
  sectionBlock: { marginTop: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 6 },
  badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { backgroundColor: COLORS.purpleLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 11, color: COLORS.purple, fontWeight: '700' },
  descriptionText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },

  /* CLIENT INFO */
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  clientHeader: { fontSize: 12, color: COLORS.textMuted, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase' },
  clientProfileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clientAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bgLight },
  clientMeta: { flex: 1 },
  clientName: { fontSize: 14, fontWeight: '800', color: COLORS.textDark, marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },

  /* APPLY BUTTON */
  applyBtn: {
    height: 48,
    backgroundColor: COLORS.purple,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, flex: 1 },
  closeBtn: { padding: 6 },
  modalContent: { padding: 16, paddingBottom: 30 },
  modalProjectTitle: { fontSize: 14, fontWeight: '700', color: COLORS.purple, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, marginBottom: 8, marginTop: 12 },
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
  currencySymbol: { fontSize: 16, fontWeight: '700', color: COLORS.textMuted, marginRight: 8 },
  inputIcon: { marginRight: 8 },
  inputWithIcon: { flex: 1, height: '100%', fontSize: 14, color: COLORS.textDark },
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
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  submitBtn: {
    height: 48,
    backgroundColor: COLORS.purple,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 24,
  },
  submitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  /* SUCCESS CARD */
  successCard: {
    backgroundColor: COLORS.white,
    padding: 30,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  successIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 10 },
  successSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgLight },
  checkboxChecked: { backgroundColor: COLORS.purple, borderColor: COLORS.purple },
  checkboxLabel: { flex: 1, fontSize: 13, color: COLORS.textDark, lineHeight: 18 },
  attachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.purple, borderRadius: 8, paddingVertical: 12, backgroundColor: COLORS.purpleLight + '22', marginTop: 8 },
  attachBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.purple },
  portfolioScroll: { gap: 8 },
  portfolioPreviewWrap: { position: 'relative', width: 60, height: 60, borderRadius: 6, overflow: 'hidden' },
  portfolioPreview: { width: '100%', height: '100%' },
  removePortfolioBtn: { position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(0, 0, 0, 0.65)', justifyContent: 'center', alignItems: 'center' },
});
