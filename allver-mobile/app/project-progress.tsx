import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions, Platform, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BACKEND_URL } from '../constants/Config';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#F59E0B',
  navy: '#0F172A',
  white: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  bgLight: '#F8FAFC',
  border: '#E2E8F0',
  green: '#22C55E',
  greenLight: '#ECFDF5',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  red: '#EF4444',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
};

interface TimelineUpdate {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  images?: string[];
  icon: string;
  iconColor: string;
  iconBg: string;
  comments?: any[];
  postedBy?: {
    senderId?: string;
    senderName?: string;
    senderRole?: string;
  };
}

export default function ProjectProgressScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserFullName, setCurrentUserFullName] = useState<string>('User');

  // Add / Edit Update states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('General');
  const [formImg, setFormImg] = useState('');

  // Reply states
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const [timelineY, setTimelineY] = useState(0);

  useEffect(() => {
    if (params.focusSection === 'timeline' && timelineY > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: timelineY, animated: true });
      }, 400);
    }
  }, [params.focusSection, timelineY]);

  // Load current user
  useEffect(() => {
    let user = (global as any).currentUser;
    if (!user && Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        try { user = JSON.parse(stored); } catch (e) {}
      }
    }
    if (user?._id) {
      setCurrentUserId(user._id);
      setCurrentUserRole(user.role);
      setCurrentUserFullName(user.fullName || 'User');
    }
  }, []);

  const workspaceId = params.workspaceId as string;

  const isClient = workspace && (workspace.client?._id === currentUserId || workspace.client === currentUserId);
  const isContractor = workspace && (
    workspace.professional?._id === currentUserId || 
    workspace.professional === currentUserId || 
    workspace.contractor?._id === currentUserId || 
    workspace.contractor === currentUserId
  );

  useEffect(() => {
    if (!workspaceId || !currentUserId) return;
    const fetchWorkspace = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}?userId=${currentUserId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.workspace) {
            setWorkspace(data.workspace);
          }
        }
      } catch (err) {
        console.error('Error fetching workspace in progress screen:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspace();
  }, [workspaceId, currentUserId]);

  const handleAddUpdate = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for the update.');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/updates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          category: formCategory,
          img: formImg,
          senderId: currentUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          setShowAddModal(false);
          setFormTitle('');
          setFormDescription('');
          setFormCategory('General');
          setFormImg('');
          Alert.alert('Success', 'Progress update posted successfully!');
        }
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to post progress update.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error. Failed to post progress update.');
    }
  };

  const handleEditUpdate = async () => {
    if (!formTitle.trim() || !editingUpdateId) {
      Alert.alert('Error', 'Please enter a title for the update.');
      return;
    }
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/updates/${editingUpdateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          category: formCategory,
          img: formImg,
          senderId: currentUserId
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          setShowEditModal(false);
          setEditingUpdateId(null);
          setFormTitle('');
          setFormDescription('');
          setFormCategory('General');
          setFormImg('');
          Alert.alert('Success', 'Progress update updated successfully!');
        }
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to edit progress update.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error. Failed to edit progress update.');
    }
  };

  const handlePostComment = async (updateId: string) => {
    if (!replyText.trim()) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/project-workspaces/${workspaceId}/updates/${updateId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: currentUserId,
          senderName: currentUserFullName,
          text: replyText
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.workspace) {
          setWorkspace(data.workspace);
          setActiveReplyId(null);
          setReplyText('');
        }
      } else {
        const err = await res.json();
        Alert.alert('Error', err.message || 'Failed to post reply.');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Network error. Failed to post reply.');
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'task':
      case 'milestone':
        return { icon: 'check-circle', color: COLORS.green, bg: COLORS.greenLight };
      case 'file':
      case 'quotation':
        return { icon: 'file-text', color: COLORS.blue, bg: COLORS.blueLight };
      case 'payment':
        return { icon: 'credit-card', color: COLORS.primary, bg: '#FEF3C7' };
      default:
        return { icon: 'info', color: COLORS.orange, bg: COLORS.orangeLight };
    }
  };

  const projectName = workspace?.title || (params.name as string) || '2BHK Interior Project';
  const projectId = workspace?._id || (params.projectId as string) || 'PR/12345';
  const projectStatus = workspace?.status || (params.status as string) || 'In Progress';
  
  const projectProgress = workspace 
    ? (workspace.status === 'Completed' ? 100 : workspace.status === 'Active' ? 60 : 20)
    : parseInt((params.progress as string) || '60');

  const partner = workspace 
    ? (workspace.client?._id === currentUserId ? workspace.professional : workspace.client)
    : null;
  const contractorName = partner?.fullName || (params.contractor as string) || 'Raj Construction';
  const contractorAvatar = partner?.avatarUrl || (params.contractorAvatar as string) || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80';
  const contractorRating = partner?.rating?.toString() || (params.contractorRating as string) || '4.7';
  const contractorReviews = partner?.reviews?.toString() || (params.contractorReviews as string) || '028';
  
  const startDate = workspace ? new Date(workspace.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : (params.startDate as string) || '10 Apr 2024';
  const endDate = (params.endDate as string) || '10 Jul 2024';

  const totalCostVal = workspace?.quotation?.totalCost || 850000;
  const paidCostVal = workspace?.labourManagement?.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 600000;
  const dueCostVal = Math.max(0, totalCostVal - paidCostVal);

  const totalAmount = workspace ? `₹${totalCostVal.toLocaleString('en-IN')}` : (params.totalAmount as string) || '₹8,50,000';
  const paidAmount = workspace ? `₹${paidCostVal.toLocaleString('en-IN')}` : (params.paidAmount as string) || '₹6,00,000';
  const dueAmount = workspace ? `₹${dueCostVal.toLocaleString('en-IN')}` : (params.dueAmount as string) || '₹2,50,000';

  const timelineUpdates: TimelineUpdate[] = workspace?.updates?.length > 0
    ? workspace.updates.map((up: any) => {
        const iconInfo = getIconForCategory(up.category);
        const dt = new Date(up.createdAt);
        return {
          id: up._id || Math.random().toString(),
          title: up.title,
          description: up.description,
          date: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          time: dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          images: up.img ? [up.img] : [],
          icon: iconInfo.icon,
          iconColor: iconInfo.color,
          iconBg: iconInfo.bg,
          comments: up.comments || [],
          postedBy: up.postedBy || {},
        };
      })
    : [
        {
          id: '1',
          title: 'Quotation Uploaded',
          description: 'Here is the quotation for your reference.',
          date: '10 Apr 2024',
          time: '10:35 AM',
          images: [],
          icon: 'file-text',
          iconColor: COLORS.blue,
          iconBg: COLORS.blueLight,
        },
        {
          id: '2',
          title: 'RCC Work Completed',
          description: 'RCC work completed as per plan.',
          date: '18 Apr 2024',
          time: '04:15 PM',
          images: [
            'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=200&q=80',
            'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=200&q=80',
          ],
          icon: 'check-circle',
          iconColor: COLORS.green,
          iconBg: COLORS.greenLight,
        },
        {
          id: '3',
          title: 'Brick Work Completed',
          description: 'Brick work completed in all rooms.',
          date: '28 Apr 2024',
          time: '11:00 AM',
          images: [
            'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?auto=format&fit=crop&w=200&q=80',
          ],
          icon: 'check-circle',
          iconColor: COLORS.green,
          iconBg: COLORS.greenLight,
        },
        {
          id: '4',
          title: 'Plumbing Work Done',
          description: 'Plumbing work completed.',
          date: '10 May 2024',
          time: '06:40 PM',
          images: [],
          icon: 'tool',
          iconColor: COLORS.orange,
          iconBg: COLORS.orangeLight,
        },
        {
          id: '5',
          title: 'Tiles Work Started',
          description: 'Tiles installation started in kitchen.',
          date: '23 May 2024',
          time: '12:15 PM',
          images: [
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80',
          ],
          icon: 'layers',
          iconColor: COLORS.primary,
          iconBg: '#FEF3C7',
        },
        {
          id: '6',
          title: 'Project Completed',
          description: 'Project completed.',
          date: '05 Jul 2024',
          time: '04:00 PM',
          images: [],
          icon: 'award',
          iconColor: COLORS.green,
          iconBg: COLORS.greenLight,
        },
        {
          id: '7',
          title: 'Home Owner Review',
          description: 'Client shared his experience with us.',
          date: '06 Jul 2024',
          time: '06:30 PM',
          images: [],
          icon: 'star',
          iconColor: COLORS.primary,
          iconBg: '#FEF3C7',
        },
      ];

  const statusColor = projectStatus === 'Completed' ? COLORS.green : COLORS.primary;
  const statusBg = projectStatus === 'Completed' ? COLORS.greenLight : '#FEF3C7';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={COLORS.textDark} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>PROJECT PROGRESS PAGE</Text>
          <Text style={styles.headerSub}>(For {isContractor ? 'Contractor' : 'Home Owner'})</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* PROJECT INFO CARD */}
        <View style={styles.projectCard}>
          <View style={styles.projectCardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.projectTitle}>{projectName}</Text>
              <Text style={styles.projectIdText}>Project ID: {projectId}</Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: statusBg }]}>  
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>{projectStatus}</Text>
            </View>
          </View>

          {/* Contractor */}
          <View style={styles.contractorRow}>
            <Image source={{ uri: contractorAvatar }} style={styles.contractorAvatar} contentFit="cover" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.contractorName}>{contractorName}</Text>
              <View style={styles.contractorRatingRow}>
                <FontAwesome5 name="star" solid size={11} color={COLORS.primary} />
                <Text style={styles.contractorRatingText}>{contractorRating}</Text>
                <Text style={styles.contractorReviewsText}>({contractorReviews} Reviews)</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.viewProfileBtn}
              onPress={() => {
                if (partner) {
                  const isArchitect = partner.role === 'Architect';
                  router.push({
                    pathname: isArchitect ? '/architect-detail' : '/contractor-detail',
                    params: {
                      id: partner._id,
                      name: partner.fullName,
                      avatar: partner.avatarUrl,
                      role: partner.role,
                    }
                  });
                } else {
                  // Fallback
                  router.push('/profile');
                }
              }}
            >
              <Text style={styles.viewProfileBtnText}>View Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Dates & Amount */}
          <View style={styles.datesRow}>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>{startDate}</Text>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>End Date (Est.)</Text>
              <Text style={styles.dateValue}>{endDate}</Text>
            </View>
            <View style={[styles.dateCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.dateLabel}>Total Amount</Text>
              <Text style={[styles.dateValue, { color: COLORS.primary, fontWeight: '800' }]}>{totalAmount}</Text>
            </View>
          </View>
        </View>

        {/* PROGRESS BAR */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={styles.progressPercent}>{projectProgress}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${projectProgress}%` }]} />
          </View>
        </View>

        {/* TIMELINE */}
        <View 
          onLayout={(e) => setTimelineY(e.nativeEvent.layout.y)}
          style={styles.timelineSection}
        >
          <View style={styles.timelineHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.timelineSectionTitle}>Project Updates</Text>
              <Text style={styles.timelineSubtext}>Recent updates and replies to discuss any changes.</Text>
            </View>
            {isContractor && (
              <TouchableOpacity 
                style={styles.addUpdateBtn}
                onPress={() => {
                  setFormTitle('');
                  setFormDescription('');
                  setFormCategory('General');
                  setFormImg('');
                  setShowAddModal(true);
                }}
              >
                <Feather name="plus" size={14} color={COLORS.white} />
                <Text style={styles.addUpdateBtnText}>Add Update</Text>
              </TouchableOpacity>
            )}
          </View>

          {timelineUpdates.map((update, index) => (
            <View key={update.id} style={styles.timelineItem}>
              {/* Vertical line */}
              {index < timelineUpdates.length - 1 && <View style={styles.timelineLine} />}

              {/* Icon */}
              <View style={[styles.timelineIcon, { backgroundColor: update.iconBg }]}>  
                <Feather name={update.icon as any} size={16} color={update.iconColor} />
              </View>

              {/* Content */}
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTitle}>{update.title}</Text>
                <Text style={styles.timelineDesc}>{update.description}</Text>
                <Text style={styles.timelineDate}>{update.date} · {update.time}</Text>

                {/* Images */}
                {update.images && update.images.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineImagesScroll}>
                    {update.images.map((img, imgIdx) => (
                      <Image key={imgIdx} source={{ uri: img }} style={styles.timelineImage} contentFit="cover" />
                    ))}
                  </ScrollView>
                )}

                {/* Existing comments/replies */}
                {update.comments && update.comments.length > 0 && (
                  <View style={styles.commentsList}>
                    {update.comments.map((comment: any, cIdx: number) => (
                      <View key={comment._id || cIdx} style={styles.commentBubble}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentSenderName}>{comment.senderName}</Text>
                          <Text style={styles.commentTime}>
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{comment.text}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Actions row */}
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.replyBtn}
                    onPress={() => {
                      if (activeReplyId === update.id) {
                        setActiveReplyId(null);
                      } else {
                        setActiveReplyId(update.id);
                        setReplyText('');
                      }
                    }}
                  >
                    <Feather name="message-circle" size={13} color={COLORS.blue} />
                    <Text style={styles.replyBtnText}>Reply</Text>
                  </TouchableOpacity>

                  {isContractor && (
                    <TouchableOpacity 
                      style={[styles.replyBtn, { backgroundColor: COLORS.orangeLight, marginLeft: 8 }]}
                      onPress={() => {
                        setEditingUpdateId(update.id);
                        setFormTitle(update.title);
                        setFormDescription(update.description || '');
                        setFormCategory(update.icon === 'check-circle' ? 'Task' : update.icon === 'file-text' ? 'Quotation' : update.icon === 'credit-card' ? 'Payment' : 'General');
                        setFormImg(update.images?.[0] || '');
                        setShowEditModal(true);
                      }}
                    >
                      <Feather name="edit-2" size={12} color={COLORS.orange} />
                      <Text style={[styles.replyBtnText, { color: COLORS.orange }]}>Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Reply Input Field */}
                {activeReplyId === update.id && (
                  <View style={styles.replyInputWrap}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder="Write a reply..."
                      placeholderTextColor={COLORS.textLight}
                      value={replyText}
                      onChangeText={setReplyText}
                    />
                    <TouchableOpacity 
                      style={styles.sendReplyBtn}
                      onPress={() => handlePostComment(update.id)}
                    >
                      <Feather name="send" size={14} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* BOTTOM PAYMENT BAR */}
      <View style={styles.bottomBar}>
        <View style={styles.amountCols}>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Amount</Text>
            <Text style={styles.amountValue}>{totalAmount}</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={[styles.amountValue, { color: COLORS.green }]}>{paidAmount}</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Due</Text>
            <Text style={[styles.amountValue, { color: COLORS.red }]}>{dueAmount}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.payNowBtn} activeOpacity={0.85}>
          <Text style={styles.payNowBtnText}>Pay Now</Text>
        </TouchableOpacity>
      </View>

      {/* ── ADD UPDATE MODAL (Contractor only) ── */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Progress Update</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.modalLabel}>Title *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Plumbing Work Done"
                placeholderTextColor={COLORS.textLight}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe the progress..."
                placeholderTextColor={COLORS.textLight}
                multiline
                value={formDescription}
                onChangeText={setFormDescription}
              />

              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {['General', 'Task', 'Quotation', 'Payment'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, formCategory === cat && styles.categoryChipActive]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text style={[styles.categoryChipText, formCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Image URL (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://example.com/photo.jpg"
                placeholderTextColor={COLORS.textLight}
                value={formImg}
                onChangeText={setFormImg}
              />
            </ScrollView>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddUpdate} activeOpacity={0.85}>
              <Text style={styles.modalSubmitBtnText}>Post Update</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── EDIT UPDATE MODAL (Contractor only) ── */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowEditModal(false)}>
          <TouchableOpacity style={styles.modalCard} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Update</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); setEditingUpdateId(null); }}>
                <Feather name="x" size={22} color={COLORS.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.modalLabel}>Title *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Plumbing Work Done"
                placeholderTextColor={COLORS.textLight}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe the progress..."
                placeholderTextColor={COLORS.textLight}
                multiline
                value={formDescription}
                onChangeText={setFormDescription}
              />

              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.categoryRow}>
                {['General', 'Task', 'Quotation', 'Payment'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, formCategory === cat && styles.categoryChipActive]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text style={[styles.categoryChipText, formCategory === cat && styles.categoryChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Image URL (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://example.com/photo.jpg"
                placeholderTextColor={COLORS.textLight}
                value={formImg}
                onChangeText={setFormImg}
              />
            </ScrollView>

            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleEditUpdate} activeOpacity={0.85}>
              <Text style={styles.modalSubmitBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  scrollContent: { paddingBottom: 20 },

  /* HEADER */
  header: {
    flexDirection: 'row',
    height: 52,
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textDark, letterSpacing: 0.3 },
  headerSub: { fontSize: 11, color: COLORS.textMuted },

  /* PROJECT CARD */
  projectCard: {
    margin: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  projectCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  projectTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textDark, marginBottom: 2 },
  projectIdText: { fontSize: 12, color: COLORS.textMuted },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  /* CONTRACTOR ROW */
  contractorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 14,
  },
  contractorAvatar: { width: 40, height: 40, borderRadius: 20 },
  contractorName: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  contractorRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  contractorRatingText: { fontSize: 12, fontWeight: '700', color: COLORS.textDark },
  contractorReviewsText: { fontSize: 11, color: COLORS.textMuted },
  viewProfileBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.blueLight,
    borderRadius: 8,
  },
  viewProfileBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.blue },

  /* DATES ROW */
  datesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateCol: { flex: 1 },
  dateLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase' },
  dateValue: { fontSize: 13, fontWeight: '700', color: COLORS.textDark },

  /* PROGRESS */
  progressSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textDark },
  progressPercent: { fontSize: 14, fontWeight: '800', color: COLORS.green },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.green,
    borderRadius: 4,
  },

  /* TIMELINE */
  timelineSection: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineSectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  timelineSubtext: { fontSize: 12, color: COLORS.textMuted, marginBottom: 20 },

  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 16,
    top: 36,
    bottom: -20,
    width: 2,
    backgroundColor: COLORS.border,
  },
  timelineIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 1,
  },
  timelineContent: { flex: 1 },
  timelineTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  timelineDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 4 },
  timelineDate: { fontSize: 11, color: COLORS.textLight, marginBottom: 8 },
  timelineImagesScroll: { marginBottom: 8 },
  timelineImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#E2E8F0',
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: COLORS.blueLight,
    borderRadius: 12,
  },
  replyBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.blue },

  /* TIMELINE HEADER ROW */
  timelineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  addUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  addUpdateBtnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },

  /* ACTION ROW */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  /* COMMENTS */
  commentsList: {
    marginTop: 8,
    marginBottom: 4,
    paddingLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  commentBubble: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    marginLeft: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  commentSenderName: { fontSize: 11, fontWeight: '700', color: COLORS.textDark },
  commentTime: { fontSize: 10, color: COLORS.textLight },
  commentText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 16 },

  /* REPLY INPUT */
  replyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  replyInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    height: 38,
  },
  sendReplyBtn: {
    backgroundColor: COLORS.blue,
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  modalLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textDark, marginBottom: 6, marginTop: 12 },
  modalInput: {
    backgroundColor: COLORS.bgLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textDark,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgLight,
  },
  categoryChipActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.green,
  },
  categoryChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  categoryChipTextActive: { color: COLORS.white },
  modalSubmitBtn: {
    backgroundColor: COLORS.green,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSubmitBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  /* BOTTOM PAYMENT BAR */
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  amountCols: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  amountCol: { flex: 1 },
  amountLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  amountValue: { fontSize: 12, fontWeight: '800', color: COLORS.textDark },
  payNowBtn: {
    backgroundColor: COLORS.green,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  payNowBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
});
