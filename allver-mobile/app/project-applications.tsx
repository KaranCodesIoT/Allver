import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  red: '#EF4444',
  redLight: '#FEE2E2',
};

export default function ProjectApplicationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const requestId = params.requestId as string;

  // Load project details passed from Home Screen into local state for editing support
  const [projectTitle, setProjectTitle] = useState((params.title as string) || '2BHK Interior Renovation');
  const [projectLocation, setProjectLocation] = useState((params.location as string) || 'Mumbai');
  const [projectBudget, setProjectBudget] = useState((params.budget as string) || '₹10L - ₹15L');
  const [projectTimeline, setProjectTimeline] = useState((params.timeline as string) || '90 Days');
  const [projectDescription, setProjectDescription] = useState((params.description as string) || 'No description provided.');
  const [projectRequirements, setProjectRequirements] = useState((params.requirements as string) || '');
  const requirementsList = projectRequirements ? projectRequirements.split(',') : [];

  const [bids, setBids] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [hasAcceptedContractor, setHasAcceptedContractor] = useState(false);
  const [hasAcceptedArchitect, setHasAcceptedArchitect] = useState(false);
  const [acceptedBidId, setAcceptedBidId] = useState<string | null>(null);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);

  // Fetch real bids from backend
  useEffect(() => {
    if (!requestId) {
      setLoading(false);
      return;
    }
    const fetchBids = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/project-bids/request/${requestId}`);
        const data = await res.json();
        if (data.bids) {
          setBids(data.bids);
          const acceptedContractor = data.bids.find((b: any) => b.status === 'Accepted' && b.professional?.role === 'Contractor');
          const acceptedArchitect = data.bids.find((b: any) => b.status === 'Accepted' && b.professional?.role === 'Architect');
          setHasAcceptedContractor(!!acceptedContractor);
          setHasAcceptedArchitect(!!acceptedArchitect);
          setHasAccepted(!!acceptedContractor || !!acceptedArchitect);
          if (acceptedContractor) {
            setAcceptedBidId(acceptedContractor._id);
          } else if (acceptedArchitect) {
            setAcceptedBidId(acceptedArchitect._id);
          }
        }
      } catch (err) {
        console.error('Error fetching bids:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBids();
  }, [requestId]);

  // Edit & Delete Modal States & Handlers
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editTimeline, setEditTimeline] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const openEditModal = () => {
    setEditTitle(projectTitle);
    setEditLocation(projectLocation);
    setEditBudget(projectBudget);
    setEditTimeline(projectTimeline);
    setEditDescription(projectDescription);
    setEditModalVisible(true);
  };

  const handleUpdateProject = async () => {
    if (!editTitle.trim() || !editLocation.trim() || !editBudget.trim() || !editDescription.trim()) {
      Alert.alert('Required Fields', 'Please fill out all fields.');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/contract-requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          location: editLocation.trim(),
          budget: editBudget.trim(),
          timeline: editTimeline.trim(),
          description: editDescription.trim()
        })
      });

      if (res.ok) {
        setProjectTitle(editTitle.trim());
        setProjectLocation(editLocation.trim());
        setProjectBudget(editBudget.trim());
        setProjectTimeline(editTimeline.trim());
        setProjectDescription(editDescription.trim());
        setEditModalVisible(false);
        Alert.alert('Success', 'Project updated successfully.');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.message || 'Could not update project.');
      }
    } catch (err) {
      console.error('Update project error:', err);
      Alert.alert('Error', 'Could not update project. Check your connection.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteProject = () => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This will permanently delete all applications and bids associated with it.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${BACKEND_URL}/api/contract-requests/${requestId}`, {
                method: 'DELETE'
              });
              if (res.ok) {
                Alert.alert('Deleted', 'Project deleted successfully.', [
                  { text: 'OK', onPress: () => router.replace('/(tabs)/profile') }
                ]);
              } else {
                const data = await res.json();
                Alert.alert('Error', data.message || 'Could not delete project.');
              }
            } catch (err) {
              console.error('Delete project error:', err);
              Alert.alert('Error', 'Could not delete project. Check your network.');
            }
          }
        }
      ]
    );
  };

  const handleMessage = (bid: any) => {
    const prof = bid.professional;
    router.push({
      pathname: '/chat-room',
      params: {
        receiverId: prof._id || prof,
        name: prof.fullName || 'Contractor',
        role: prof.role || 'Contractor',
        avatar: prof.avatarUrl || '',
      }
    });
  };

  const handleAcceptProposal = (bid: any) => {
    const prof = bid.professional || {};
    const profName = prof.fullName || 'Professional';
    const isContractor = prof.role === 'Contractor';
    const isArchitect = prof.role === 'Architect';

    if (isContractor && hasAcceptedContractor) {
      Alert.alert('Already Accepted', 'You have already accepted a contractor bid for this project.');
      return;
    }
    if (isArchitect && hasAcceptedArchitect) {
      Alert.alert('Already Accepted', 'You have already accepted an architect bid for this project.');
      return;
    }

    Alert.alert(
      'Accept Proposal',
      `Are you sure you want to accept the bid from ${profName} for ${bid.cost}?\n\nThis will:\n• Add ${profName} to the project workspace\n• Notify them of acceptance\n• Reject all other pending ${prof.role || 'professional'} bids`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept Bid', 
          style: 'default',
          onPress: async () => {
            setAcceptingBidId(bid._id);
            try {
              const response = await fetch(`${BACKEND_URL}/api/contract-requests/${requestId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  status: 'Accepted',
                  professional: prof._id || prof,
                  bidId: bid._id
                })
              });
              
              if (response.ok) {
                const data = await response.json();
                
                if (isContractor) {
                  setHasAcceptedContractor(true);
                } else if (isArchitect) {
                  setHasAcceptedArchitect(true);
                }
                setHasAccepted(true);
                setAcceptedBidId(bid._id);

                // Update local bid statuses - only reject other bids of the same role
                setBids(prev => prev.map(b => {
                  if (b._id === bid._id) {
                    return { ...b, status: 'Accepted' };
                  }
                  if (b.status === 'Pending' && b.professional?.role === prof.role) {
                    return { ...b, status: 'Rejected' };
                  }
                  return b;
                }));

                Alert.alert(
                  '🎉 Bid Accepted!', 
                  `Project workspace created with ${profName}. All other contractors have been notified.`, 
                  [{ 
                    text: 'View Progress', 
                    onPress: () => {
                      const end = new Date();
                      end.setDate(end.getDate() + (bid.durationDays || 90));
                      const endDateStr = end.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                      router.push({
                        pathname: '/project-progress',
                        params: {
                          workspaceId: data.workspace?._id || '',
                          endDate: endDateStr,
                          progress: '20',
                          status: 'Active',
                          name: projectTitle,
                          contractor: profName,
                          contractorAvatar: prof.avatarUrl || '',
                          contractorRating: (prof.rating || '4.5').toString(),
                          totalAmount: bid.cost,
                        }
                      });
                    }
                  }]
                );
              } else {
                const errData = await response.json();
                Alert.alert('Acceptance Failed', errData.message || 'Something went wrong.');
              }
            } catch (err) {
              console.error('Error accepting proposal:', err);
              Alert.alert('Network Error', 'Could not connect to server.');
            } finally {
              setAcceptingBidId(null);
            }
          }
        }
      ]
    );
  };

  const pendingBids = bids.filter(b => b.status === 'Pending');
  const totalBids = bids.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.purple} />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Project Applications</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Project Info Card */}
        <View style={styles.projectInfoCard}>
          <View style={styles.projectHeader}>
            <View style={styles.projectIconBox}>
              <Feather name="home" size={20} color={COLORS.purple} />
            </View>
            <View style={styles.projectTitleCol}>
              <Text style={styles.projectTitle}>{projectTitle}</Text>
              <Text style={styles.projectLocation}>
                <Feather name="map-pin" size={12} color={COLORS.textMuted} /> {projectLocation}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Budget, Timeline Details */}
          <View style={styles.detailsRow}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Estimated Budget</Text>
              <Text style={styles.detailValue}>{projectBudget}</Text>
            </View>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Timeline Required</Text>
              <Text style={styles.detailValue}>{projectTimeline}</Text>
            </View>
          </View>

          {/* Requirements list */}
          {requirementsList.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Key Requirements</Text>
              <View style={styles.requirementsContainer}>
                {requirementsList.map((req, idx) => (
                  <View key={idx} style={styles.requirementBadge}>
                    <Text style={styles.requirementText}>{req}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Description */}
          {projectDescription ? (
            <>
              <Text style={styles.sectionLabel}>Project Description</Text>
              <Text style={styles.projectDescription}>{projectDescription}</Text>
            </>
          ) : null}

          {/* Edit / Delete actions for Client */}
          {!hasAccepted && (
            <View style={styles.projectActionsRow}>
              <TouchableOpacity 
                style={styles.editProjectBtn} 
                onPress={openEditModal}
                activeOpacity={0.7}
              >
                <Feather name="edit-2" size={14} color={COLORS.purple} />
                <Text style={styles.editProjectBtnText}>Edit Project</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteProjectBtn} 
                onPress={handleDeleteProject}
                activeOpacity={0.7}
              >
                <Feather name="trash-2" size={14} color={COLORS.red} />
                <Text style={styles.deleteProjectBtnText}>Delete Project</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Accepted Banner */}
        {hasAccepted && (
          <View style={styles.acceptedBanner}>
            <Feather name="check-circle" size={18} color={COLORS.green} style={{ marginRight: 8 }} />
            <Text style={styles.acceptedBannerText}>A bid has been accepted for this project</Text>
          </View>
        )}

        {/* Compare Bids Banner - only show if 2+ pending bids and none accepted */}
        {!hasAccepted && pendingBids.length >= 2 && (
          <TouchableOpacity 
            style={styles.compareBidsBanner}
            activeOpacity={0.85}
            onPress={() => router.push({
              pathname: '/project-compare',
              params: {
                requestId: requestId || '',
                title: projectTitle,
                budget: projectBudget,
                timeline: projectTimeline,
                description: projectDescription,
                requirements: projectRequirements
              }
            })}
          >
            <Feather name="git-compare" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
            <Text style={styles.compareBidsBannerText}>Compare Top Bids Side-by-Side</Text>
            <Feather name="chevron-right" size={18} color={COLORS.white} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* Applications Heading */}
        <View style={styles.applicationsHeader}>
          <Text style={styles.applicationsTitle}>
            Applications Received ({totalBids})
          </Text>
          <Text style={styles.applicationsSubtitle}>
            {hasAccepted 
              ? `1 accepted • ${totalBids - 1} not selected`
              : `${pendingBids.length} pending review`
            }
          </Text>
        </View>

        {/* No Applications State */}
        {totalBids === 0 && (
          <View style={styles.emptyState}>
            <Feather name="inbox" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No Applications Yet</Text>
            <Text style={styles.emptySubtitle}>Contractors will start applying once they see your project posting. Check back soon!</Text>
          </View>
        )}

        {/* Contractor Applications List */}
        <View style={styles.applicationsList}>
          {bids.map((bid) => {
            const prof = bid.professional || {};
            const profName = prof.fullName || 'Unknown Contractor';
            const profAvatar = prof.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profName)}&background=7C3AED&color=fff`;
            const profRating = prof.rating || '4.5';
            const profProjects = prof.completedProjects || 0;
            const isAccepted = bid.status === 'Accepted';
            const isRejected = bid.status === 'Rejected';
            const isAcceptingThis = acceptingBidId === bid._id;

            return (
              <View key={bid._id} style={[
                styles.applicationCard,
                isAccepted && styles.acceptedCard,
                isRejected && styles.rejectedCard,
              ]}>
                {/* Status Badge */}
                {isAccepted && (
                  <View style={styles.statusBadgeAccepted}>
                    <Feather name="check-circle" size={12} color={COLORS.white} />
                    <Text style={styles.statusBadgeText}>ACCEPTED</Text>
                  </View>
                )}
                {isRejected && (
                  <View style={styles.statusBadgeRejected}>
                    <Feather name="x-circle" size={12} color={COLORS.white} />
                    <Text style={styles.statusBadgeText}>NOT SELECTED</Text>
                  </View>
                )}

                {/* Contractor Info Row */}
                <View style={styles.contractorHeader}>
                  <Image source={{ uri: profAvatar }} style={styles.contractorAvatar} />
                  <View style={styles.contractorMeta}>
                    <View style={styles.nameRow}>
                      <Text style={styles.contractorName}>{profName}</Text>
                    </View>
                    <Text style={styles.firmName}>{prof.firmName || prof.role || 'Contractor'}</Text>
                    
                    {/* Rating */}
                    <View style={styles.ratingRow}>
                      <FontAwesome name="star" size={12} color={COLORS.starGold} />
                      <Text style={styles.ratingText}>{profRating}</Text>
                      <Text style={styles.projectsText}> • {profProjects} Projects Completed</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                {/* Proposal Details (Cost & Timeline) */}
                <View style={styles.proposalDetails}>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.metricLabel}>Cost Estimate</Text>
                    <Text style={styles.metricValue}>{bid.cost}</Text>
                  </View>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.metricLabel}>Duration Proposed</Text>
                    <Text style={styles.metricValue}>{bid.duration}</Text>
                  </View>
                  <View style={styles.proposalMetric}>
                    <Text style={styles.metricLabel}>Status</Text>
                    <Text style={[styles.metricValue, { 
                      color: isAccepted ? COLORS.green : isRejected ? COLORS.red : COLORS.blue 
                    }]}>
                      {isAccepted ? 'Accepted' : isRejected ? 'Rejected' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {/* Proposal Text */}
                {bid.proposal ? (
                  <View style={styles.proposalTextBox}>
                    <Text style={styles.proposalLabel}>Proposal</Text>
                    <Text style={styles.proposalText} numberOfLines={3}>{bid.proposal}</Text>
                  </View>
                ) : null}

                {/* Action Buttons - only for pending bids */}
                {!isAccepted && !isRejected && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.messageBtn} 
                      onPress={() => handleMessage(bid)}
                      activeOpacity={0.8}
                    >
                      <Feather name="message-circle" size={16} color={COLORS.blue} style={{ marginRight: 6 }} />
                      <Text style={styles.messageBtnText}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.acceptBtn, ((bid.professional?.role === 'Contractor' && hasAcceptedContractor) || (bid.professional?.role === 'Architect' && hasAcceptedArchitect)) && { opacity: 0.5 }]} 
                      onPress={() => handleAcceptProposal(bid)}
                      activeOpacity={0.9}
                      disabled={((bid.professional?.role === 'Contractor' && hasAcceptedContractor) || (bid.professional?.role === 'Architect' && hasAcceptedArchitect)) || isAcceptingThis}
                    >
                      {isAcceptingThis ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Feather name="check" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
                          <Text style={styles.acceptBtnText}>Accept Bid</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* For accepted bids, show View Progress */}
                {isAccepted && (
                  <TouchableOpacity 
                    style={styles.viewProgressBtn}
                    onPress={() => router.push({
                      pathname: '/project-progress',
                      params: { name: projectTitle, contractor: profName }
                    })}
                  >
                    <Feather name="trending-up" size={16} color={COLORS.green} style={{ marginRight: 6 }} />
                    <Text style={styles.viewProgressText}>View Project Progress</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Edit Project Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Project Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Feather name="x" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Project Title</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="e.g. 2BHK Interior Renovation"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="e.g. Mumbai"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Estimated Budget</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editBudget}
                  onChangeText={setEditBudget}
                  placeholder="e.g. ₹10L - ₹15L"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Timeline Required</Text>
                <TextInput
                  style={styles.modalTextInput}
                  value={editTimeline}
                  onChangeText={setEditTimeline}
                  placeholder="e.g. 90 Days"
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.modalTextInput, styles.modalTextArea]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline={true}
                  numberOfLines={4}
                  placeholder="Enter project details..."
                  placeholderTextColor={COLORS.textMuted}
                />
              </View>

              <TouchableOpacity 
                style={[styles.saveModalBtn, isUpdating && { opacity: 0.7 }]} 
                onPress={handleUpdateProject}
                disabled={isUpdating}
                activeOpacity={0.8}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.saveModalBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPage },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white },
  loadingText: { fontSize: 14, color: COLORS.textMuted, marginTop: 12, fontWeight: '600' },
  header: {
    height: 60,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 6,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  
  /* PROJECT INFO CARD */
  projectInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectTitleCol: {
    flex: 1,
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  projectLocation: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 14,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  detailBox: {
    flex: 1,
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginTop: 10,
    marginBottom: 6,
  },
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  requirementBadge: {
    backgroundColor: COLORS.purpleLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  requirementText: {
    fontSize: 11,
    color: COLORS.purple,
    fontWeight: '700',
  },
  projectDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },

  /* ACCEPTED BANNER */
  acceptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.greenLight,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.green,
  },
  acceptedBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },

  /* COMPARE BIDS BANNER */
  compareBidsBanner: {
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  compareBidsBannerText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },

  /* APPLICATIONS HEADING */
  applicationsHeader: {
    marginBottom: 12,
  },
  applicationsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  applicationsSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  /* EMPTY STATE */
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* APPLICATIONS LIST */
  applicationsList: {
    gap: 14,
  },
  applicationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  acceptedCard: {
    borderColor: COLORS.green,
    borderWidth: 1.5,
  },
  rejectedCard: {
    opacity: 0.65,
  },

  /* STATUS BADGES */
  statusBadgeAccepted: {
    position: 'absolute',
    top: -10,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.green,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  statusBadgeRejected: {
    position: 'absolute',
    top: -10,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#9CA3AF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 10,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '900',
  },

  contractorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  contractorAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.bgLight,
  },
  contractorMeta: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contractorName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  firmName: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textDark,
    marginLeft: 4,
  },
  projectsText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  proposalDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgLight,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  proposalMetric: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textDark,
  },

  /* PROPOSAL TEXT */
  proposalTextBox: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  proposalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  proposalText: {
    fontSize: 12,
    color: COLORS.textDark,
    lineHeight: 17,
  },

  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  messageBtn: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.blue,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  messageBtnText: {
    fontSize: 13,
    color: COLORS.blue,
    fontWeight: '700',
  },
  acceptBtn: {
    flex: 1.2,
    height: 38,
    backgroundColor: COLORS.green,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '700',
  },

  /* VIEW PROGRESS */
  viewProgressBtn: {
    height: 38,
    borderWidth: 1.5,
    borderColor: COLORS.green,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.greenLight,
  },
  viewProgressText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '700',
  },

  /* CLIENT PROJECT ACTIONS */
  projectActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  editProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
    gap: 6,
  },
  editProjectBtnText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: '#FEE2E2',
    gap: 6,
  },
  deleteProjectBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
  },

  /* EDIT MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textDark,
  },
  modalForm: {
    padding: 20,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
    backgroundColor: COLORS.bgLight,
  },
  modalTextArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveModalBtn: {
    backgroundColor: COLORS.purple,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveModalBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
