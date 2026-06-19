import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, MapPin, Star, Phone, MessageCircle,
  Briefcase, Users, Play, Video, Users2, StarHalf, Heart, Check, ExternalLink, Calendar, Plus, X,
  Loader2, Upload, Image, Save, Tag, Clock
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';



const MOCK_PROJECTS = [
  { id: 'p1', name: 'Greenwood Villa', location: 'Navi Mumbai', status: 'Completed', year: 2024, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
  { id: 'p2', name: 'Palm Beach Apartment Interior', location: 'Mumbai', status: 'In Progress', year: 2024, img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80' },
  { id: 'p3', name: 'Corporate Office Design', location: 'Navi Mumbai', status: 'Completed', year: 2023, img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80' },
  { id: 'p4', name: 'Luxury Bungalow Design', location: 'Pune', status: 'Completed', year: 2023, img: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80' },
  { id: 'p5', name: 'Hill View Residence', location: 'Mumbai', status: 'In Progress', year: 2024, img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80' }
];

const MOCK_VIDEOS = [
  { id: 'v1', title: 'Modern Villa Walkthrough', duration: '0:30', category: 'Videos', type: 'video', url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80' },
  { id: 'v2', title: 'Apartment Interior Tour', duration: '0:45', category: 'Videos', type: 'video', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80' },
  { id: 'v3', title: 'Construction Timelapse', duration: '0:25', category: 'Videos', type: 'video', url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80' },
  { id: 'v4', title: 'Bungalow Exterior Design', duration: '0:32', category: 'Reels', type: 'video', url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=600&q=80' },
  { id: 'v5', title: 'Living Room Walkthrough', duration: '0:29', category: 'Videos', type: 'video', url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80' },
  { id: 'v6', title: 'Site Progress Update', duration: '0:40', category: 'Videos', type: 'video', url: 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=600&q=80' },
  { id: 'p1', title: 'Luxury Kitchen Design', duration: '', category: 'Photos', type: 'photo', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80' },
  { id: 'p2', title: 'Minimalist Bedroom Layout', duration: '', category: 'Photos', type: 'photo', url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80' }
];

const MOCK_TEAM = [
  { id: 't1', name: 'Mitesh Construction', role: 'Contractor', experience: '12 Years Experience', specialization: 'Specializes in Residential Projects', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80' },
  { id: 't2', name: 'BuildWell Contractors', role: 'Contractor', experience: '8 Years Experience', specialization: 'Specializes in Commercial Projects', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 't3', name: 'Shree Builders', role: 'Contractor', experience: '10 Years Experience', specialization: 'Specializes in Villas & Bungalows', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80' },
  { id: 't4', name: 'Nexus Constructions', role: 'Contractor', experience: '6 Years Experience', specialization: 'Specializes in Interiors & Renovation', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
  { id: 't5', name: 'Reliable Buildcon', role: 'Contractor', experience: '9 Years Experience', specialization: 'Specializes in Structural Masonry', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80' }
];

const MOCK_REVIEWS = [
  {
    id: 'r1', name: 'Neha Sharma', rating: 5, date: '2 days ago',
    comment: 'Excellent design sense and great attention to detail. The team was professional and very cooperative throughout the project.',
    imgs: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=200&q=80',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=200&q=80'
    ]
  },
  {
    id: 'r2', name: 'Vikram Patel', rating: 4, date: '1 week ago',
    comment: 'Highly skilled professionals. They understood our requirements perfectly and delivered beyond expectations.',
    imgs: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=200&q=80'
    ]
  },
  {
    id: 'r3', name: 'Priya Nair', rating: 5, date: '3 weeks ago',
    comment: 'Amazing execution and design aesthetics. Very happy with the sustainability elements built into the design.',
    imgs: []
  }
];

const ArchitectProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'videos', 'team', 'reviews' (Labour only shows 'videos' and 'reviews')
  const [videoFilter, setVideoFilter] = useState('All');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(256);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireRequestSuccess, setHireRequestSuccess] = useState(false);
  const [hireStep, setHireStep] = useState(1); // 1 = form, 2 = review
  const [hireErrors, setHireErrors] = useState({});
  const [hireAttachmentUploading, setHireAttachmentUploading] = useState(false);
  const [hireForm, setHireForm] = useState({
    // Common
    clientName: '', companyName: '', mobileNumber: '', email: '',
    title: '', projectType: 'Residential', location: '',
    budget: '', startDate: '', expectedCompletionDate: '',
    description: '', attachmentUrl: '', attachmentName: '', priority: 'Normal',
    // Architect-specific
    plotArea: '', builtUpArea: '', designRequirements: '', needSiteVisits: false,
    // Contractor-specific
    constructionType: '', totalArea: '', materialResponsibility: '', labourIncluded: false, estimatedProjectDuration: '',
    // Labour-specific
    labourCategory: '', workingDuration: '', dailyMonthlyContract: 'Daily', accommodationProvided: false
  });

  const [activeUploadType, setActiveUploadType] = useState(null); // 'photo', 'video', or null
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaProjectName, setMediaProjectName] = useState('');
  const [mediaProjectType, setMediaProjectType] = useState('');
  const [mediaLocation, setMediaLocation] = useState('');
  const [mediaDescription, setMediaDescription] = useState('');
  const [mediaVideoCategory, setMediaVideoCategory] = useState('Videos'); // 'Videos' or 'Reels'
  const [mediaVideoTags, setMediaVideoTags] = useState('');
  const [mediaVideoDuration, setMediaVideoDuration] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaFilePreview, setMediaFilePreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [selectedMediaDetail, setSelectedMediaDetail] = useState(null);

  // Review states
  const [reviews, setReviews] = useState([]);
  const [reviewsStats, setReviewsStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    reviewText: '',
    projectImages: []
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Team states
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [allProfessionals, setAllProfessionals] = useState([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamRoleFilter, setTeamRoleFilter] = useState('All');
  const [addingMember, setAddingMember] = useState(null); // memberId being added
  const [removingMember, setRemovingMember] = useState(null); // memberId being removed
  const [teamActionMsg, setTeamActionMsg] = useState('');

  const handleReviewImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    setSubmitError('');
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (res.ok) {
        setReviewForm(prev => ({
          ...prev,
          projectImages: [...prev.projectImages, data.url]
        }));
      } else {
        setSubmitError(data.message || 'Image upload failed');
      }
    } catch (err) {
      console.error('Error uploading review image:', err);
      setSubmitError('Network error uploading image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveReviewImage = (indexToRemove) => {
    setReviewForm(prev => ({
      ...prev,
      projectImages: prev.projectImages.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please log in to submit a review.');
      return;
    }
    if (!reviewForm.reviewText.trim()) {
      setSubmitError('Review comment is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await fetch(`http://localhost:5000/api/professional/${profile._id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reviewer: currentUser._id,
          rating: reviewForm.rating,
          reviewText: reviewForm.reviewText.trim(),
          projectImages: reviewForm.projectImages
        })
      });

      const data = await res.json();

      if (res.ok) {
        // Update reviews list and stats in real-time
        setReviews(prev => [data.review, ...prev]);
        setReviewsStats(data.stats);
        
        // Also update local profile state rating and review count
        setProfile(prev => ({
          ...prev,
          rating: data.stats.averageRating,
          reviews: data.stats.totalReviews
        }));

        // Reset review form and close modal
        setReviewForm({
          rating: 5,
          reviewText: '',
          projectImages: []
        });
        setShowReviewModal(false);
      } else {
        setSubmitError(data.message || 'Failed to submit review.');
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setSubmitError('Network error submitting review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch all professionals for Add Team Member modal
  const fetchAllProfessionals = async (search = '', roleFilter = 'All') => {
    setLoadingProfessionals(true);
    try {
      let url = 'http://localhost:5000/api/professionals';
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter !== 'All') params.append('role', roleFilter);
      if (params.toString()) url += '?' + params.toString();
      const res = await fetch(url);
      const data = await res.json();
      setAllProfessionals(data.professionals || []);
    } catch (err) {
      console.error('Error fetching professionals:', err);
    } finally {
      setLoadingProfessionals(false);
    }
  };

  const handleOpenAddTeamModal = () => {
    setTeamSearch('');
    setTeamRoleFilter('All');
    setTeamActionMsg('');
    setShowAddTeamModal(true);
    fetchAllProfessionals('', 'All');
  };

  const handleAddTeamMember = async (memberId) => {
    setAddingMember(memberId);
    setTeamActionMsg('');
    try {
      const res = await fetch(`http://localhost:5000/api/professional/${profile._id}/team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });
      const data = await res.json();
      if (res.ok) {
        setTeamMembers(data.teamMembers);
        setTeamActionMsg('Member added successfully!');
      } else {
        setTeamActionMsg(data.message || 'Failed to add member.');
      }
    } catch (err) {
      setTeamActionMsg('Network error adding member.');
    } finally {
      setAddingMember(null);
    }
  };

  const handleRemoveTeamMember = async (memberId) => {
    if (!window.confirm('Remove this member from your team?')) return;
    setRemovingMember(memberId);
    try {
      const res = await fetch(`http://localhost:5000/api/professional/${profile._id}/team/${memberId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m._id !== memberId));
      } else {
        alert(data.message || 'Failed to remove member.');
      }
    } catch (err) {
      alert('Network error removing member.');
    } finally {
      setRemovingMember(null);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    let currUser = null;
    if (userStr) {
      currUser = JSON.parse(userStr);
      setCurrentUser(currUser);
    }

    // Reset ownership flag on every navigation
    setIsOwnProfile(false);
    setLoading(true);

    const profileId = id || currUser?._id;
    if (!profileId) {
      setLoading(false);
      setLoadingReviews(false);
      setLoadingTeam(false);
      return;
    }

    // Fetch reviews
    setLoadingReviews(true);
    fetch(`http://localhost:5000/api/professional/${profileId}/reviews`)
      .then(res => res.json())
      .then(data => {
        if (data.reviews) {
          setReviews(data.reviews);
          setReviewsStats(data.stats);
        }
        setLoadingReviews(false);
      })
      .catch(err => {
        console.error('Error loading reviews:', err);
        setLoadingReviews(false);
      });

    // Fetch team members
    setLoadingTeam(true);
    fetch(`http://localhost:5000/api/professional/${profileId}/team`)
      .then(res => res.json())
      .then(data => {
        setTeamMembers(data.teamMembers || []);
        setLoadingTeam(false);
      })
      .catch(err => {
        console.error('Error loading team:', err);
        setLoadingTeam(false);
      });

    if (profileId === currUser?._id) {
      setIsOwnProfile(true);
    }

    // Fetch from API for real registered professionals
    fetch(`http://localhost:5000/api/professional/${profileId}`)
      .then(res => res.json())
      .then(data => {
        if (data.professional) {
          setProfile(data.professional);
          setFollowersCount(data.professional.followers || 0);
          if (data.professional._id === currUser?._id) {
            setIsOwnProfile(true);
          }
          if (data.professional.role === 'Labour') {
            setActiveTab('videos');
          }
        } else if (profileId === currUser?._id) {
          setProfile(currUser);
          setFollowersCount(0);
          if (currUser?.role === 'Labour') {
            setActiveTab('videos');
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (profileId === currUser?._id) {
          setProfile(currUser);
          setFollowersCount(0);
          if (currUser?.role === 'Labour') {
            setActiveTab('videos');
          }
        }
        setLoading(false);
      });
  }, [id]);

  const getDefaultHireForm = (user) => ({
    clientName: user?.fullName || '', companyName: '', mobileNumber: user?.phoneNumber || user?.phone || '',
    email: user?.email || '', title: '', projectType: 'Residential', location: '',
    budget: '', startDate: '', expectedCompletionDate: '', description: '',
    attachmentUrl: '', attachmentName: '', priority: 'Normal',
    plotArea: '', builtUpArea: '', designRequirements: '', needSiteVisits: false,
    constructionType: '', totalArea: '', materialResponsibility: '', labourIncluded: false, estimatedProjectDuration: '',
    labourCategory: '', workingDuration: '', dailyMonthlyContract: 'Daily', accommodationProvided: false
  });

  const validateHireForm = () => {
    const errs = {};
    if (!hireForm.clientName.trim()) errs.clientName = 'Your name is required';
    if (!hireForm.mobileNumber.trim()) errs.mobileNumber = 'Mobile number is required';
    if (hireForm.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(hireForm.email)) errs.email = 'Invalid email address';
    if (!hireForm.title.trim()) errs.title = 'Project title is required';
    if (!hireForm.location.trim()) errs.location = 'Location is required';
    if (!hireForm.budget.trim()) errs.budget = 'Budget range is required';
    if (!hireForm.startDate) errs.startDate = 'Start date is required';
    if (!hireForm.description.trim()) errs.description = 'Description is required';
    setHireErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleHireAttachmentUpload = async (file) => {
    if (!file) return;
    setHireAttachmentUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setHireForm(prev => ({ ...prev, attachmentUrl: data.url, attachmentName: file.name }));
      }
    } catch (err) { console.error('Attachment upload error:', err); }
    finally { setHireAttachmentUploading(false); }
  };

  const handleHireSubmit = async () => {
    if (!currentUser || !profile) return;
    try {
      const response = await fetch('http://localhost:5000/api/contract-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: currentUser._id, professional: profile._id, professionalRole: roleName,
          ...hireForm
        })
      });
      const data = await response.json();
      if (response.ok) {
        setHireRequestSuccess(true);
        setTimeout(() => {
          setHireRequestSuccess(false);
          setShowHireModal(false);
          setHireStep(1);
          setHireForm(getDefaultHireForm(currentUser));
        }, 4000);
      } else {
        alert(data.message || 'Failed to send hire request');
      }
    } catch (err) {
      console.error('Error sending request:', err);
      alert('Error connecting to server.');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setMediaFilePreview(null);
    }

    // Auto-detect duration for video files
    if (file.type.startsWith('video/')) {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoEl.src);
        const totalSec = Math.round(videoEl.duration);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setMediaVideoDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
      };
      videoEl.src = URL.createObjectURL(file);
    }
  };

  const handleMediaUploadSubmit = async (e) => {
    e.preventDefault();
    if (!mediaFile) {
      setMediaError('Please choose a file to upload.');
      return;
    }
    if (!mediaTitle.trim()) {
      setMediaError('Title / Caption is required.');
      return;
    }
    if (!mediaLocation.trim()) {
      setMediaError('Location is required.');
      return;
    }

    setUploadProgress(true);
    setMediaError('');

    const formData = new FormData();
    formData.append('image', mediaFile);

    try {
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok) {
        const tagsArray = activeUploadType === 'video'
          ? mediaVideoTags.split(',').map(t => t.trim()).filter(Boolean)
          : [];
        const newMediaItem = {
          url: data.url,
          title: mediaTitle.trim(),
          type: activeUploadType,
          category: activeUploadType === 'photo' ? 'Photos' : mediaVideoCategory,
          projectName: mediaProjectName.trim(),
          projectType: mediaProjectType.trim(),
          location: mediaLocation.trim(),
          description: mediaDescription.trim(),
          duration: activeUploadType === 'video' ? mediaVideoDuration : '',
          tags: tagsArray,
          createdAt: new Date()
        };

        const currentMedia = profile.media || [];
        const updatedMedia = [...currentMedia, newMediaItem];

        const updateRes = await fetch(`http://localhost:5000/api/user/profile/${profile._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ media: updatedMedia })
        });

        const updateData = await updateRes.json();

        if (updateRes.ok) {
          setProfile(prev => ({ ...prev, media: updatedMedia }));
          // Update localStorage
          const userStr = localStorage.getItem('currentUser');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user._id === profile._id) {
              user.media = updatedMedia;
              localStorage.setItem('currentUser', JSON.stringify(user));
            }
          }
          // Reset states
          setMediaTitle('');
          setMediaProjectName('');
          setMediaProjectType('');
          setMediaLocation('');
          setMediaDescription('');
          setMediaVideoTags('');
          setMediaVideoDuration('');
          setMediaFile(null);
          setMediaFilePreview(null);
          setActiveUploadType(null);
        } else {
          setMediaError(updateData.message || 'Failed to update profile media.');
        }
      } else {
        setMediaError(data.message || 'Failed to upload media file.');
      }
    } catch (err) {
      console.error(err);
      setMediaError('Network error uploading media.');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleRemoveMedia = async (indexToRemove) => {
    if (!window.confirm('Are you sure you want to delete this media item?')) return;
    
    const currentMedia = profile.media || [];
    const updatedMedia = currentMedia.filter((_, idx) => idx !== indexToRemove);
    
    try {
      const updateRes = await fetch(`http://localhost:5000/api/user/profile/${profile._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ media: updatedMedia })
      });
      
      const updateData = await updateRes.json();
      
      if (updateRes.ok) {
        setProfile(prev => ({ ...prev, media: updatedMedia }));
        // Update localstorage if it is own profile
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user._id === profile._id) {
            user.media = updatedMedia;
            localStorage.setItem('currentUser', JSON.stringify(user));
          }
        }
      } else {
        alert(updateData.message || 'Failed to delete media.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting media.');
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Loading Profile..." pageSubtitle="" accentColor="#10b981">
        <div className="profile-page-loader">
          <div className="spinner"></div>
          <p>Loading profile details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout pageTitle="Profile Not Found" pageSubtitle="" accentColor="#10b981">
        <div className="profile-not-found-container">
          <h2>Oops!</h2>
          <p>We couldn't find the requested profile.</p>
          <button className="back-to-listings-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} /> Back to Home
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Role adaptation
  const roleName = profile.role || 'Architect';
  const pageTitle = roleName === 'Architect' ? `Ar. ${profile.fullName}` : profile.fullName;
  const pageSubtitle = profile.firmName || (roleName === 'Client' ? 'Client Profile' : `${roleName} Profile`);
  const accentColor = roleName === 'Architect' ? '#10b981' : roleName === 'Contractor' ? '#3b82f6' : roleName === 'Labour' ? '#f59e0b' : '#8b5cf6';

  const initials = (profile.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarBg = accentColor;
  const showCover = profile.cover || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80';
  const showAvatar = profile.avatarUrl || null;

  const handleFollowToggle = () => {
    if (isFollowing) {
      setFollowersCount(prev => prev - 1);
    } else {
      setFollowersCount(prev => prev + 1);
    }
    setIsFollowing(!isFollowing);
  };

  // Subtitle info row
  const renderSubtitleInfo = () => {
    if (roleName === 'Architect') {
      return (
        <p className="pwbc-subtitle-info">
          <span>{profile.firmName || 'Freelance Architect'}</span>
          <span className="dot">•</span>
          <span>Architect</span>
          <span className="dot">•</span>
          <span>Interior Designer</span>
          <span className="dot">•</span>
          <span>{profile.city || 'India'}</span>
        </p>
      );
    } else if (roleName === 'Contractor') {
      return (
        <p className="pwbc-subtitle-info">
          <span>{profile.contractorType || 'General Contractor'}</span>
          <span className="dot">•</span>
          <span>Contractor</span>
          <span className="dot">•</span>
          <span>{profile.city || 'India'}</span>
        </p>
      );
    } else if (roleName === 'Labour') {
      return (
        <p className="pwbc-subtitle-info">
          <span>{profile.skillType || 'Skilled Worker'}</span>
          <span className="dot">•</span>
          <span>Labour / Worker</span>
          <span className="dot">•</span>
          <span>{profile.city || 'India'}</span>
        </p>
      );
    } else {
      return (
        <p className="pwbc-subtitle-info">
          <span>Client</span>
          <span className="dot">•</span>
          <span>{profile.city || 'India'}</span>
        </p>
      );
    }
  };

  // Stats Grid
  const renderStatsGrid = () => {
    if (roleName === 'Client') {
      return (
        <div className="pwbc-stats-grid">
          <div className="pwbc-stat-box">
            <Calendar className="stat-icon star" size={20} color={accentColor} />
            <div className="stat-text">
              <h3>June 2026</h3>
              <p>Joined Since</p>
            </div>
          </div>

          <div className="pwbc-stat-box">
            <Briefcase className="stat-icon projects" size={20} color={accentColor} />
            <div className="stat-text">
              <h3>{profile.projectType || 'Residential'}</h3>
              <p>Project Requirement</p>
            </div>
          </div>

          <div className="pwbc-stat-box">
            <MapPin className="stat-icon location" size={20} color={accentColor} />
            <div className="stat-text">
              <h3>{profile.city || 'India'}</h3>
              <p>Location</p>
            </div>
          </div>
        </div>
      );
    } else if (roleName === 'Labour') {
      return (
        <div className="pwbc-stats-grid">
          <div className="pwbc-stat-box">
            <Star className="stat-icon star" size={20} fill="#f59e0b" color="#f59e0b" />
            <div className="stat-text">
              <h3>{profile.experience || '3+ Years'}</h3>
              <p>Experience</p>
            </div>
          </div>

          <div className="pwbc-stat-box">
            <CheckCircle2 className="stat-icon projects" size={20} color={accentColor} />
            <div className="stat-text">
              <h3>{profile.availability || 'Available'}</h3>
              <p>Availability Status</p>
            </div>
          </div>

          <div className="pwbc-stat-box">
            <MapPin className="stat-icon location" size={20} color={accentColor} />
            <div className="stat-text">
              <h3>{profile.city || 'India'}</h3>
              <p>Operational Base</p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="pwbc-stats-grid">
          <div className="pwbc-stat-box">
            <Star className="stat-icon star" size={20} fill="#f59e0b" color="#f59e0b" />
            <div className="stat-text">
              <h3>{profile.experience || '8+ Years'}</h3>
              <p>Experience</p>
            </div>
          </div>

          <div className="pwbc-stat-box">
            <Briefcase className="stat-icon projects" size={20} color={accentColor} />
            <div className="stat-text">
              <h3>{profile.projects || '120+'} Projects</h3>
              <p>Completed & Active</p>
            </div>
          </div>

          <div className="pwbc-stat-box">
            <MapPin className="stat-icon location" size={20} color={accentColor} />
            <div className="stat-text">
              <h3>{profile.city || 'India'}</h3>
              <p>Operational Base</p>
            </div>
          </div>
        </div>
      );
    }
  };

  const getSpecializations = () => {
    if (roleName === 'Architect') {
      return profile.specialization || ['Residential Design', 'Commercial Design', 'Interior Design', 'Renovation'];
    } else if (roleName === 'Contractor') {
      return profile.workCategory || ['Building Construction', 'Renovation', 'Civil Work'];
    } else if (roleName === 'Labour') {
      return [profile.skillType || 'General Labour', 'Construction Helper'];
    } else {
      return [profile.projectType || 'Construction Project'];
    }
  };

  const getAboutText = () => {
    if (profile.shortDesc) return profile.shortDesc;
    if (roleName === 'Client') {
      return `Looking for ${profile.projectType || 'residential construction'} projects in ${profile.city || 'Mumbai'}.`;
    }
    return `We specialize in ${roleName.toLowerCase()} services with a focus on modern, high-quality, and functional design solutions.`;
  };

  // Portfolio items mapping
  const portfolioImagesList = profile.portfolioImages && profile.portfolioImages.length > 0
    ? profile.portfolioImages
    : [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80',
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=300&q=80'
      ];

  const projectsList = profile.portfolioImages && profile.portfolioImages.length > 0
    ? profile.portfolioImages.map((img, index) => ({
        id: `p-${index}`,
        name: `Project ${index + 1}`,
        location: profile.city || 'Mumbai',
        status: 'Completed',
        year: 2024 - index,
        img: img
      }))
    : MOCK_PROJECTS;

  const mediaList = profile.media && profile.media.length > 0
    ? profile.media
    : MOCK_VIDEOS;
  const displayMediaList = mediaList.filter(item => {
    if (videoFilter === 'All') return true;
    if (videoFilter === 'Photos') return item.type === 'photo';
    if (videoFilter === 'Videos') return item.type === 'video' && item.category === 'Videos';
    if (videoFilter === 'Reels') return item.type === 'video' && item.category === 'Reels';
    return true;
  });

  const hasLiveReviews = reviews && reviews.length > 0;

  // Compute stats based on whether we have live reviews or fallback mock reviews
  const displayRating = hasLiveReviews ? reviewsStats.averageRating : (profile.rating || 0);
  const displayReviewCount = hasLiveReviews ? reviewsStats.totalReviews : (profile.reviews || 0);

  // If there are live reviews, compute breakdown percentages. Otherwise, use seeded/simulated breakdown.
  let displayBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (hasLiveReviews) {
    displayBreakdown = reviewsStats.breakdown;
  } else if (displayReviewCount > 0) {
    const total = displayReviewCount;
    displayBreakdown[5] = Math.round(total * 0.77);
    displayBreakdown[4] = Math.round(total * 0.17);
    displayBreakdown[3] = Math.max(0, Math.round(total * 0.04));
    displayBreakdown[2] = Math.max(0, total - displayBreakdown[5] - displayBreakdown[4] - displayBreakdown[3]);
    displayBreakdown[1] = 0;
  }

  // Display reviews list
  const displayReviewsList = hasLiveReviews 
    ? reviews.map(r => ({
        id: r._id,
        name: r.reviewer?.fullName || 'Anonymous User',
        rating: r.rating,
        date: new Date(r.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
        comment: r.reviewText,
        imgs: r.projectImages || []
      }))
    : MOCK_REVIEWS;

  return (
    <DashboardLayout pageTitle={pageTitle} pageSubtitle={pageSubtitle} accentColor={accentColor}>
      
      {/* ── Return Arrow Button ── */}
      {!isOwnProfile && (
        <button className="prof-page-back-nav" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back
        </button>
      )}

      {/* ── Profile Header Banner Area ── */}
      <div className="prof-web-banner-card">
        {/* Cover Photo */}
        <div className="pwbc-cover" style={{ backgroundImage: `url(${showCover})` }}>
          <div className="pwbc-cover-overlay"></div>
          {/* Followers count badge */}
          {roleName !== 'Client' && (
            <div className="pwbc-followers-badge">
              <Users size={16} />
              <span><strong>{followersCount}</strong> Followers</span>
            </div>
          )}
        </div>

        {/* Profile Details Block */}
        <div className="pwbc-info-container">
          <div className="pwbc-profile-pic-box">
            <div className="pwbc-avatar" style={{ backgroundColor: showAvatar ? 'transparent' : avatarBg }}>
              {showAvatar ? <img src={showAvatar} alt={profile.fullName} className="avatar-img" /> : initials}
            </div>
            {roleName !== 'Client' && (
              <div className="pwbc-verified-badge" title="Verified Professional" style={{ backgroundColor: accentColor }}>
                <Check size={16} />
              </div>
            )}
          </div>

          <div className="pwbc-header-info">
            <div className="pwbc-title-row">
              <h1 className="pwbc-name">{pageTitle}</h1>
              
              {/* Desktop Actions */}
              <div className="pwbc-actions">
                {isOwnProfile ? (
                  <button 
                    className="pwbc-btn primary-hire-btn" 
                    style={{ background: accentColor }}
                    onClick={() => navigate('/edit-profile')}
                  >
                    <span>✏ Edit Profile</span>
                  </button>
                ) : (
                  <>
                    {roleName !== 'Client' && (
                      <button className={`pwbc-btn follow-btn ${isFollowing ? 'following' : ''}`} onClick={handleFollowToggle}>
                        {isFollowing ? <Check size={16} /> : <Plus size={16} />}
                        <span>{isFollowing ? 'Following' : 'Follow'}</span>
                      </button>
                    )}
                    
                    {(profile.whatsappNumber || profile.phone || profile.phoneNumber) ? (
                      <a 
                        href={`https://wa.me/${(profile.whatsappNumber || profile.phone || profile.phoneNumber).replace(/\s+/g, '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="pwbc-btn whatsapp-btn"
                      >
                        <MessageCircle size={16} />
                        <span>Chat on WhatsApp</span>
                      </a>
                    ) : null}

                    <button className="pwbc-btn message-btn">
                      <MessageCircle size={16} />
                      <span>Message</span>
                    </button>

                    {roleName !== 'Client' && (
                      <button 
                        className="pwbc-btn primary-hire-btn" 
                        style={{ background: accentColor }}
                        onClick={() => {
                          if (!currentUser) {
                            alert('Please login to send a hire request.');
                            navigate('/login');
                            return;
                          }
                          setShowHireModal(true);
                        }}
                      >
                        <span>Hire / Give Contract</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {renderSubtitleInfo()}

            {(profile.phone || profile.phoneNumber) && (
              <p className="pwbc-contact-info">
                <Phone size={14} />
                <span>{profile.phone || profile.phoneNumber}</span>
              </p>
            )}
          </div>
        </div>

        {/* Dynamic Key Stats Grid */}
        {renderStatsGrid()}
      </div>

      {/* ── Two Column Details Layout ── */}
      <div className="prof-web-columns-layout">
        
        {/* Left Column: About & Specializations */}
        <div className="pw-left-column">
          {/* About Section */}
          <div className="pw-section-card">
            <h2 className="pw-section-title">About</h2>
            <p className="pw-section-desc">{getAboutText()}</p>
          </div>

          {/* Specialization Section */}
          <div className="pw-section-card">
            <h2 className="pw-section-title">
              {roleName === 'Architect' ? 'Specialization' : roleName === 'Contractor' ? 'Work Categories' : roleName === 'Labour' ? 'Skill Types' : 'Project Interests'}
            </h2>
            <div className="pw-tags-group">
              {getSpecializations().map((s, idx) => (
                <span key={idx} className="pw-spec-tag">{s}</span>
              ))}
            </div>
          </div>

          {/* Portfolio Highlights */}
          {roleName !== 'Client' && roleName !== 'Labour' && (
            <div className="pw-section-card">
              <div className="pw-section-header-row">
                <h2 className="pw-section-title">Portfolio Highlights</h2>
                <button className="pw-view-all-btn" onClick={() => setActiveTab('projects')}>View All</button>
              </div>
              <div className="pw-highlights-grid">
                <div className="pw-highlight-card" onClick={() => setActiveTab('projects')}>
                  <div className="pwh-thumb" style={{ backgroundImage: `url('${portfolioImagesList[0]}')` }}>
                    <div className="pwh-overlay"><Play size={18} fill="white" /></div>
                  </div>
                  <h3>Exterior Projects</h3>
                </div>
                <div className="pw-highlight-card" onClick={() => setActiveTab('projects')}>
                  <div className="pwh-thumb" style={{ backgroundImage: `url('${portfolioImagesList[1]}')` }}>
                    <div className="pwh-overlay"><Play size={18} fill="white" /></div>
                  </div>
                  <h3>Interior Projects</h3>
                </div>
                <div className="pw-highlight-card" onClick={() => setActiveTab('projects')}>
                  <div className="pwh-thumb" style={{ backgroundImage: `url('${portfolioImagesList[2]}')` }}>
                    <div className="pwh-overlay"><Play size={18} fill="white" /></div>
                  </div>
                  <h3>Ongoing Projects</h3>
                </div>
                <div className="pw-highlight-card" onClick={() => setActiveTab('projects')}>
                  <div className="pwh-thumb" style={{ backgroundImage: `url('${portfolioImagesList[3]}')` }}>
                    <div className="pwh-overlay"><Play size={18} fill="white" /></div>
                  </div>
                  <h3>Design Plans</h3>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Dashboard Panels */}
        {roleName !== 'Client' ? (
          <div className="pw-right-column">
            
            {/* Tab Navigation Menu */}
            <div className="pw-tabs-nav">
              {roleName !== 'Labour' && (
                <button className={`pw-tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
                  <Briefcase size={16} />
                  <span>Projects</span>
                </button>
              )}
              <button className={`pw-tab-btn ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>
                <Video size={16} />
                <span>Videos</span>
              </button>
              {roleName !== 'Labour' && (
                <button className={`pw-tab-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
                  <Users2 size={16} />
                  <span>Team</span>
                </button>
              )}
              <button className={`pw-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>
                <Star size={16} />
                <span>Reviews</span>
              </button>
            </div>

            {/* Dynamic Tab Pane Render */}
            <div className="pw-tab-content-panel">
              {activeTab === 'projects' && (
                <div className="tab-pane-fade">
                  <div className="tab-projects-list">
                    {projectsList.map(proj => (
                      <div 
                        key={proj.id} 
                        className="tab-project-row clickable-row" 
                        onClick={() => navigate(`/project/${proj.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <img src={proj.img} alt={proj.name} className="tpr-thumb" />
                        <div className="tpr-details">
                          <div className="tpr-title-row">
                            <h3>{proj.name}</h3>
                            <span className={`tpr-status-badge ${proj.status.toLowerCase().replace(' ', '-')}`}>
                              {proj.status}
                            </span>
                          </div>
                          <p className="tpr-location-year">
                            <MapPin size={12} /> {proj.location} <span className="sep">•</span> {proj.year}
                          </p>
                        </div>
                        <button 
                          className="tpr-bookmark-btn" 
                          title="Save Project"
                          onClick={(e) => {
                            e.stopPropagation();
                            // bookmark logic if any
                          }}
                        >
                          <Heart size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'videos' && (
                <div className="tab-pane-fade">
                  {/* Media Action Buttons (Only visible to profile owner) */}
                  {isOwnProfile && (
                    <div className="media-actions-bar" style={{
                      display: 'flex',
                      gap: '1rem',
                      marginBottom: '1.5rem',
                      alignItems: 'center'
                    }}>
                      <button 
                        onClick={() => {
                          setActiveUploadType(activeUploadType === 'photo' ? null : 'photo');
                          setMediaError('');
                          setMediaFile(null);
                          setMediaFilePreview(null);
                          setMediaTitle('');
                          setMediaProjectName('');
                          setMediaProjectType('');
                          setMediaLocation('');
                          setMediaDescription('');
                          setMediaVideoTags('');
                          setMediaVideoDuration('');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: activeUploadType === 'photo' ? '#10b981' : '#f1f5f9',
                          color: activeUploadType === 'photo' ? 'white' : '#1e293b',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '0.75rem',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: activeUploadType === 'photo' ? '0 4px 12px rgba(16, 185, 129, 0.2)' : 'none'
                        }}
                      >
                        <Image size={16} />
                        <span>Upload Photo</span>
                      </button>

                      <button 
                        onClick={() => {
                          setActiveUploadType(activeUploadType === 'video' ? null : 'video');
                          setMediaError('');
                          setMediaFile(null);
                          setMediaFilePreview(null);
                          setMediaTitle('');
                          setMediaProjectName('');
                          setMediaProjectType('');
                          setMediaLocation('');
                          setMediaDescription('');
                          setMediaVideoTags('');
                          setMediaVideoDuration('');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: activeUploadType === 'video' ? '#3b82f6' : '#f1f5f9',
                          color: activeUploadType === 'video' ? 'white' : '#1e293b',
                          border: 'none',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '0.75rem',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: activeUploadType === 'video' ? '0 4px 12px rgba(59, 130, 246, 0.2)' : 'none'
                        }}
                      >
                        <Video size={16} />
                        <span>Upload Video</span>
                      </button>
                    </div>
                  )}

                  {/* Form that opens when a button is clicked */}
                  {isOwnProfile && activeUploadType && (
                    <form onSubmit={handleMediaUploadSubmit} style={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '1rem',
                      padding: '1.5rem',
                      marginBottom: '2rem',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {activeUploadType === 'photo' ? <Image size={18} color="#10b981" /> : <Video size={18} color="#3b82f6" />}
                          {activeUploadType === 'photo' ? 'Upload New Photo' : 'Upload New Video'}
                        </h3>
                        <button 
                          type="button" 
                          onClick={() => setActiveUploadType(null)}
                          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* File Picker Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            {activeUploadType === 'photo' ? 'Select Photo *' : 'Select Video *'}
                          </label>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <input 
                              type="file" 
                              accept={activeUploadType === 'photo' ? 'image/*' : 'video/*'} 
                              id="media-file-input" 
                              style={{ display: 'none' }}
                              onChange={handleFileChange}
                            />
                            <label 
                              htmlFor="media-file-input" 
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1.5px dashed #cbd5e1',
                                padding: '0.65rem 1.25rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Upload size={14} />
                              {mediaFile ? 'Change File' : 'Choose File'}
                            </label>
                            {mediaFile && (
                              <span style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                                ✓ {mediaFile.name}
                              </span>
                            )}
                          </div>
                          {mediaFilePreview && (
                            <div style={{ marginTop: '0.5rem', maxWidth: '180px', maxHeight: '120px', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                              <img src={mediaFilePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                        </div>

                        {/* Video Category selector (Only for Video) */}
                        {activeUploadType === 'video' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              Video Category *
                            </label>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input 
                                  type="radio" 
                                  name="modalVideoCategory" 
                                  value="Videos" 
                                  checked={mediaVideoCategory === 'Videos'} 
                                  onChange={() => setMediaVideoCategory('Videos')}
                                /> Normal Video
                              </label>
                              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                <input 
                                  type="radio" 
                                  name="modalVideoCategory" 
                                  value="Reels" 
                                  checked={mediaVideoCategory === 'Reels'} 
                                  onChange={() => setMediaVideoCategory('Reels')}
                                /> Reel
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Title Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            {activeUploadType === 'photo' ? 'Photo Title / Caption *' : 'Video Title / Caption *'}
                          </label>
                          <input 
                            type="text" 
                            placeholder={activeUploadType === 'photo' ? "Enter photo title/caption" : "Enter video title/caption"}
                            value={mediaTitle}
                            onChange={e => setMediaTitle(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '0.5rem',
                              fontSize: '0.9rem',
                              outline: 'none',
                              background: '#fafbfd'
                            }}
                          />
                        </div>

                        {/* Project Name Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            Project Name <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>(optional)</span>
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g. Greenwood Villa"
                            value={mediaProjectName}
                            onChange={e => setMediaProjectName(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '0.5rem',
                              fontSize: '0.9rem',
                              outline: 'none',
                              background: '#fafbfd'
                            }}
                          />
                        </div>

                        {/* Project Type Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            Project Type <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>(optional)</span>
                          </label>
                          <select 
                            value={mediaProjectType}
                            onChange={e => setMediaProjectType(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '0.5rem',
                              fontSize: '0.9rem',
                              outline: 'none',
                              background: '#fafbfd',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">Select project type</option>
                            <option value="Residential">Residential</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Interior">Interior</option>
                            <option value="Landscape">Landscape</option>
                            <option value="Urban Design">Urban Design</option>
                            <option value="Renovation">Renovation</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Location Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            Location *
                          </label>
                          <input 
                            type="text" 
                            placeholder="e.g. Bandra, Mumbai"
                            value={mediaLocation}
                            onChange={e => setMediaLocation(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '0.5rem',
                              fontSize: '0.9rem',
                              outline: 'none',
                              background: '#fafbfd'
                            }}
                          />
                        </div>

                        {/* Description Field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                            {activeUploadType === 'video' ? 'Description / About this video' : 'Description'}
                            <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}> (optional)</span>
                          </label>
                          <textarea 
                            placeholder={activeUploadType === 'video'
                              ? 'Describe the project, design highlights, or context of this video...'
                              : 'Describe this gallery item, design elements used, structural highlights...'}
                            value={mediaDescription}
                            onChange={e => setMediaDescription(e.target.value)}
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '0.75rem 1rem',
                              border: '1.5px solid #cbd5e1',
                              borderRadius: '0.5rem',
                              fontSize: '0.9rem',
                              outline: 'none',
                              background: '#fafbfd',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>

                        {/* Duration Field (Video Only) */}
                        {activeUploadType === 'video' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={14} color="#475569" />
                              Duration
                              <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 400 }}>(auto-detected on file select)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. 1:30 (auto-detected or enter manually)"
                              value={mediaVideoDuration}
                              onChange={e => setMediaVideoDuration(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '0.5rem',
                                fontSize: '0.9rem',
                                outline: 'none',
                                background: '#fafbfd'
                              }}
                            />
                          </div>
                        )}

                        {/* Tags Field (Video Only) */}
                        {activeUploadType === 'video' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Tag size={14} color="#475569" />
                              Tags
                              <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 400 }}>(optional, comma-separated)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Interior Design, Modern House, Villa, Office, Renovation"
                              value={mediaVideoTags}
                              onChange={e => setMediaVideoTags(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                border: '1.5px solid #cbd5e1',
                                borderRadius: '0.5rem',
                                fontSize: '0.9rem',
                                outline: 'none',
                                background: '#fafbfd'
                              }}
                            />
                            {mediaVideoTags && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                                {mediaVideoTags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                                  <span key={i} style={{
                                    background: '#eff6ff',
                                    color: '#1e40af',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '2rem',
                                    padding: '2px 10px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700
                                  }}>#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {mediaError && (
                        <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, marginTop: '1rem' }}>
                          {mediaError}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', justifyContent: 'flex-end' }}>
                        <button 
                          type="button" 
                          onClick={() => {
                            setActiveUploadType(null);
                            setMediaVideoTags('');
                            setMediaVideoDuration('');
                          }}
                          style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            padding: '0.65rem 1.25rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit" 
                          disabled={uploadProgress}
                          style={{
                            background: activeUploadType === 'photo' ? '#10b981' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '0.65rem 1.5rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.88rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          {uploadProgress ? <Loader2 size={14} className="ep-spin" /> : <Save size={14} />}
                          <span>{uploadProgress ? 'Uploading...' : 'Publish to Gallery'}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Video Filters */}
                  <div className="tab-video-filters">
                    {['All', 'Photos', 'Videos', 'Reels'].map(cat => (
                      <button
                        key={cat}
                        className={`video-filter-pill ${videoFilter === cat ? 'active' : ''}`}
                        onClick={() => setVideoFilter(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Media Grid */}
                  <div className="tab-videos-grid">
                    {displayMediaList.length === 0 ? (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8' }}>
                        <p style={{ fontSize: '1rem', fontWeight: 600 }}>No photos or videos found.</p>
                      </div>
                    ) : (
                      displayMediaList.map((item, index) => {
                        const isVideo = item.type === 'video';
                        return (
                          <div 
                            key={index} 
                            className="tab-video-card" 
                            style={{ position: 'relative', cursor: 'pointer' }}
                            onClick={() => setSelectedMediaDetail(item)}
                          >
                            {isVideo ? (
                              <div 
                                className="tvc-thumb" 
                                style={{ 
                                  background: '#000', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center',
                                  backgroundImage: item.url.includes('unsplash.com') ? `url(${item.url})` : 'none',
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center'
                                }}
                              >
                                {!item.url.includes('unsplash.com') && (
                                  <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} controls={false} />
                                )}
                                <div className="tvc-play-overlay" style={{ opacity: 1, background: 'rgba(0,0,0,0.15)' }}>
                                  <Play size={24} fill="white" color="white" />
                                </div>
                                <span className="tvc-duration" style={{ background: '#3b82f6', color: 'white' }}>Video</span>
                              </div>
                            ) : (
                              <div className="tvc-thumb" style={{ backgroundImage: `url(${item.url})` }}>
                                <div className="tvc-play-overlay" style={{ opacity: 0 }} />
                                <span className="tvc-duration" style={{ background: '#10b981', color: 'white' }}>Photo</span>
                              </div>
                            )}
                            <div className="tvc-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <h3 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', fontWeight: 750, color: '#1e293b' }}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                                  {item.title || (isVideo ? 'Video' : 'Photo')}
                                </span>
                                {isOwnProfile && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveMedia(index);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      transition: 'color 0.2s'
                                    }}
                                    title="Delete Media"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </h3>
                              <span className="tvc-category" style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{item.category}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="tab-pane-fade">
                  {/* Add Team Member button — visible only to profile owner */}
                  {isOwnProfile && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                      <button
                        className="pwbc-btn primary-hire-btn"
                        style={{ background: accentColor, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        onClick={handleOpenAddTeamModal}
                      >
                        <Plus size={16} />
                        <span>Add Team Member</span>
                      </button>
                    </div>
                  )}

                  {loadingTeam ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <Loader2 size={24} className="ep-spin" style={{ margin: '0 auto 1rem', color: accentColor }} />
                      <p>Loading team...</p>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="team-empty-state">
                      <Users2 size={40} style={{ color: '#475569', marginBottom: '0.75rem' }} />
                      <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                        {isOwnProfile ? 'No team members yet. Click "Add Team Member" to get started.' : 'No team members added yet.'}
                      </p>
                    </div>
                  ) : (
                    <div className="tab-team-list">
                      {teamMembers.map(member => {
                        const memberRole = member.role || 'Professional';
                        const memberExp = member.experience ? `${member.experience} Experience` : '';
                        const memberSpec = member.specialization?.[0] || member.skillType || member.contractorType || '';
                        const memberSpecText = memberSpec ? `Specializes in ${memberSpec}` : '';
                        const memberAvatar = member.avatarUrl || null;
                        const memberInitials = (member.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                        const memberRoleColor = memberRole === 'Architect' ? '#10b981' : memberRole === 'Contractor' ? '#3b82f6' : '#f59e0b';
                        const memberProfilePath = memberRole === 'Architect' ? `/architect/${member._id}` : memberRole === 'Contractor' ? `/contractor/${member._id}` : `/labour/${member._id}`;

                        return (
                          <div key={member._id} className="tab-team-row">
                            {memberAvatar ? (
                              <img src={memberAvatar} alt={member.fullName} className="ttr-avatar" />
                            ) : (
                              <div className="ttr-avatar ttr-avatar-fallback" style={{ background: memberRoleColor }}>
                                {memberInitials}
                              </div>
                            )}
                            <div className="ttr-info">
                              <div className="ttr-name-row">
                                <h3>{member.fullName}</h3>
                                <span className="ttr-role-badge" style={{ background: `${memberRoleColor}22`, color: memberRoleColor, border: `1px solid ${memberRoleColor}44` }}>{memberRole}</span>
                              </div>
                              {memberExp && <p className="ttr-exp">{memberExp}</p>}
                              {memberSpecText && <p className="ttr-spec">{memberSpecText}</p>}
                              {member.city && <p className="ttr-city"><MapPin size={11} /> {member.city}</p>}
                            </div>
                            <div className="ttr-actions">
                              <button className="ttr-view-profile-btn" onClick={() => navigate(memberProfilePath)}>
                                <span>View Profile</span>
                                <ExternalLink size={12} />
                              </button>
                              {isOwnProfile && (
                                <button
                                  className="ttr-remove-btn"
                                  onClick={() => handleRemoveTeamMember(member._id)}
                                  disabled={removingMember === member._id}
                                  title="Remove from team"
                                >
                                  {removingMember === member._id ? <Loader2 size={14} className="ep-spin" /> : <X size={14} />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="tab-pane-fade">
                  {/* Write Review Button (hidden for profile owner) */}
                  {!isOwnProfile && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                      <button
                        className="pwbc-btn primary-hire-btn"
                        style={{ background: accentColor, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        onClick={() => {
                          if (!currentUser) {
                            alert('Please login to write a review.');
                            navigate('/login');
                            return;
                          }
                          setShowReviewModal(true);
                        }}
                      >
                        <Plus size={16} />
                        <span>Write Review</span>
                      </button>
                    </div>
                  )}

                  {loadingReviews ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <Loader2 size={24} className="ep-spin" style={{ margin: '0 auto 1rem', color: accentColor }} />
                      <p>Loading reviews...</p>
                    </div>
                  ) : (
                    <>
                      {/* Ratings Breakdown Summary */}
                      <div className="tab-reviews-summary-card">
                        <div className="trsc-score-block">
                          <h1>{displayRating > 0 ? displayRating : '0.0'}</h1>
                          <div className="trsc-stars-row">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const starVal = i + 1;
                              if (displayRating >= starVal) {
                                return <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />;
                              } else if (displayRating >= starVal - 0.5) {
                                return <StarHalf key={i} size={15} fill="#f59e0b" color="#f59e0b" />;
                              } else {
                                return <Star key={i} size={15} fill="none" color="#cbd5e1" />;
                              }
                            })}
                          </div>
                          <p>({displayReviewCount} {displayReviewCount === 1 ? 'Review' : 'Reviews'})</p>
                        </div>
                        <div className="trsc-bars-column">
                          {[5, 4, 3, 2, 1].map((star) => {
                            const count = displayBreakdown[star] || 0;
                            const percent = displayReviewCount > 0 ? Math.round((count / displayReviewCount) * 100) : 0;
                            return (
                              <div key={star} className="trsc-bar-row">
                                <span>{star} ★</span>
                                <div className="bar-bg">
                                  <div 
                                    className="bar-fill" 
                                    style={{ 
                                      width: `${percent}%`, 
                                      background: accentColor 
                                    }}
                                  />
                                </div>
                                <span>{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Individual Reviews List */}
                      <div className="tab-reviews-list">
                        {displayReviewsList.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#94a3b8', background: 'white', border: '1px solid #f1f5f9', borderRadius: '1.25rem' }}>
                            <Star size={32} style={{ color: '#cbd5e1', margin: '0 auto 1rem' }} />
                            <p style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>No reviews yet.</p>
                            <p style={{ fontSize: '0.88rem', marginTop: '0.25rem' }}>Be the first to rate and write a review for this professional!</p>
                          </div>
                        ) : (
                          displayReviewsList.map(rev => (
                            <div key={rev.id} className="tab-review-card">
                              <div className="trc-header">
                                <div className="trc-user-info">
                                  <div className="trc-user-avatar">
                                    {rev.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0, 2)}
                                  </div>
                                  <div>
                                    <h3>{rev.name}</h3>
                                    <div className="trc-rating-stars">
                                      {Array.from({ length: Math.round(rev.rating) }).map((_, i) => (
                                        <Star key={i} size={12} fill="#f59e0b" color="#f59e0b" />
                                      ))}
                                      {Array.from({ length: 5 - Math.round(rev.rating) }).map((_, i) => (
                                        <Star key={i} size={12} fill="none" color="#cbd5e1" />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <span className="trc-date">{rev.date}</span>
                              </div>
                              <p className="trc-comment">{rev.comment}</p>
                              {rev.imgs && rev.imgs.length > 0 && (
                                <div className="trc-images-grid">
                                  {rev.imgs.map((img, i) => (
                                    <img 
                                      key={i} 
                                      src={img} 
                                      alt={`review-img-${i}`} 
                                      className="trc-thumb" 
                                      onClick={() => setSelectedMediaDetail({ type: 'photo', url: img, title: 'Project Image', category: 'Reviews' })}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="pw-right-column">
            <div className="pw-section-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <Users size={48} style={{ color: accentColor, margin: '0 auto 1rem' }} />
              <h3>Client Account Dashboard</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                You are logged in as a Client. Browse Architects, Contractors, and Labour to hire professionals for your projects.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button className="pwbc-btn primary-hire-btn" style={{ width: '100%', justifyContent: 'center', background: accentColor }} onClick={() => navigate('/architects')}>
                  Browse Architects
</button>
                <button className="pwbc-btn message-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/contractors')}>
                  Browse Contractors
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Render Hire Request Modal ── */}
      {showHireModal && (() => {
        const labelStyle = { fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' };
        const inputStyle = (err) => ({ padding: '0.6rem 0.85rem', border: `1.5px solid ${err ? '#f87171' : '#e2e8f0'}`, borderRadius: '0.5rem', fontSize: '0.88rem', background: '#fafbfd', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' });
        const errStyle = { fontSize: '0.73rem', color: '#ef4444', fontWeight: 600, marginTop: '2px', display: 'block' };
        return (
          <div className="dl-modal-overlay" onClick={() => { setShowHireModal(false); setHireStep(1); }}>
            <div className="dl-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '660px', width: '95%', borderRadius: '1.25rem', overflow: 'hidden', padding: 0 }}>
              <button className="dl-modal-close" onClick={() => { setShowHireModal(false); setHireStep(1); }}>
                <X size={20} />
              </button>

              {/* Gradient Header */}
              <div style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #6366f1 100%)`, padding: '1.5rem 2rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '0.75rem', padding: '0.6rem', display: 'flex' }}>
                    <Briefcase size={22} color="white" />
                  </div>
                  <div>
                    <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                      {roleName === 'Labour' ? 'Hire Labour' : roleName === 'Contractor' ? 'Give Contract' : 'Hire Architect'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.82rem', margin: 0 }}>
                      {profile.fullName} · {roleName}
                    </p>
                  </div>
                </div>
                {!hireRequestSuccess && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', alignItems: 'center' }}>
                    {[1, 2].map(s => (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: s <= hireStep ? 'white' : 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, color: s <= hireStep ? accentColor : 'rgba(255,255,255,0.5)', boxShadow: s === hireStep ? '0 0 0 3px rgba(255,255,255,0.35)' : 'none' }}>{s}</div>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600 }}>{s === 1 ? 'Fill Details' : 'Review & Send'}</span>
                        {s < 2 && <div style={{ width: 28, height: 2, background: 'rgba(255,255,255,0.25)', borderRadius: 2, margin: '0 0.2rem' }} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ maxHeight: '68vh', overflowY: 'auto', padding: '1.75rem 2rem' }}>

                {/* ── SUCCESS STATE ── */}
                {hireRequestSuccess ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={40} color="#10b981" />
                    </div>
                    <h4 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Request Sent Successfully!</h4>
                    <p style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '340px', lineHeight: 1.6, margin: 0 }}>
                      Your request has been sent to <strong>{profile.fullName}</strong>. They'll be notified and can accept or decline the request.
                    </p>
                  </div>

                ) : hireStep === 2 ? (
                  /* ── REVIEW SCREEN ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ background: '#f8fafc', borderRadius: '0.875rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.1rem', borderBottom: '1px solid #e2e8f0', background: hireForm.priority === 'Urgent' ? '#fef3c7' : '#f0f9ff' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Priority</span>
                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.78rem', fontWeight: 800, background: hireForm.priority === 'Urgent' ? '#f59e0b' : '#3b82f6', color: 'white' }}>{hireForm.priority}</span>
                      </div>
                      {[
                        { label: 'Client Name', val: hireForm.clientName },
                        { label: 'Company', val: hireForm.companyName || '—' },
                        { label: 'Mobile', val: hireForm.mobileNumber },
                        { label: 'Email', val: hireForm.email || '—' },
                        { label: 'Project Title', val: hireForm.title },
                        { label: 'Project Type', val: hireForm.projectType },
                        { label: 'Location', val: hireForm.location },
                        { label: 'Budget', val: hireForm.budget },
                        { label: 'Start Date', val: hireForm.startDate },
                        { label: 'Completion Date', val: hireForm.expectedCompletionDate || '—' },
                        ...(roleName === 'Architect' ? [
                          { label: 'Plot Area', val: hireForm.plotArea || '—' },
                          { label: 'Built-up Area', val: hireForm.builtUpArea || '—' },
                          { label: 'Site Visits', val: hireForm.needSiteVisits ? 'Yes' : 'No' },
                          { label: 'Design Req.', val: hireForm.designRequirements || '—' },
                        ] : []),
                        ...(roleName === 'Contractor' ? [
                          { label: 'Construction Type', val: hireForm.constructionType || '—' },
                          { label: 'Total Area', val: hireForm.totalArea || '—' },
                          { label: 'Material By', val: hireForm.materialResponsibility || '—' },
                          { label: 'Labour Included', val: hireForm.labourIncluded ? 'Yes' : 'No' },
                          { label: 'Est. Duration', val: hireForm.estimatedProjectDuration || '—' },
                        ] : []),
                        ...(roleName === 'Labour' ? [
                          { label: 'Labour Category', val: hireForm.labourCategory || '—' },
                          { label: 'Working Duration', val: hireForm.workingDuration || '—' },
                          { label: 'Contract Type', val: hireForm.dailyMonthlyContract || '—' },
                          { label: 'Accommodation', val: hireForm.accommodationProvided ? 'Yes' : 'No' },
                        ] : []),
                      ].map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 1.1rem', borderBottom: '1px solid #f1f5f9', gap: '1rem' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.label}</span>
                          <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700, textAlign: 'right' }}>{row.val}</span>
                        </div>
                      ))}
                      {hireForm.description && (
                        <div style={{ padding: '0.85rem 1.1rem', borderTop: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Description</span>
                          <p style={{ fontSize: '0.87rem', color: '#334155', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{hireForm.description}</p>
                        </div>
                      )}
                      {hireForm.attachmentName && (
                        <div style={{ padding: '0.75rem 1.1rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.82rem', color: '#6366f1', fontWeight: 600 }}>📎 {hireForm.attachmentName}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => setHireStep(1)} style={{ flex: 1, padding: '0.75rem', border: '1.5px solid #e2e8f0', background: 'white', borderRadius: '0.625rem', cursor: 'pointer', fontWeight: 700, color: '#475569', fontSize: '0.9rem' }}>← Edit</button>
                      <button onClick={handleHireSubmit} style={{ flex: 2, padding: '0.75rem', background: `linear-gradient(135deg, ${accentColor}, #6366f1)`, color: 'white', borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.95rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>✦ Send Request</button>
                    </div>
                  </div>

                ) : (
                  /* ── FORM SCREEN ── */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                    {/* Priority */}
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      {['Normal', 'Urgent'].map(p => (
                        <button key={p} type="button" onClick={() => setHireForm(f => ({ ...f, priority: p }))} style={{ flex: 1, padding: '0.55rem', borderRadius: '0.625rem', border: `2px solid ${hireForm.priority === p ? (p === 'Urgent' ? '#f59e0b' : accentColor) : '#e2e8f0'}`, background: hireForm.priority === p ? (p === 'Urgent' ? '#fef3c7' : '#eff6ff') : 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: hireForm.priority === p ? (p === 'Urgent' ? '#92400e' : accentColor) : '#94a3b8' }}>
                          {p === 'Urgent' ? '🔴' : '🟢'} {p}
                        </button>
                      ))}
                    </div>

                    {/* Your Info */}
                    <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Information</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Your Name *</label>
                        <input id="hire-clientName" type="text" value={hireForm.clientName} onChange={e => setHireForm(f => ({ ...f, clientName: e.target.value }))} placeholder="Full name" style={inputStyle(hireErrors.clientName)} />
                        {hireErrors.clientName && <span style={errStyle}>{hireErrors.clientName}</span>}
                      </div>
                      <div>
                        <label style={labelStyle}>Company Name</label>
                        <input id="hire-companyName" type="text" value={hireForm.companyName} onChange={e => setHireForm(f => ({ ...f, companyName: e.target.value }))} placeholder="(optional)" style={inputStyle(false)} />
                      </div>
                      <div>
                        <label style={labelStyle}>Mobile Number *</label>
                        <input id="hire-mobile" type="tel" value={hireForm.mobileNumber} onChange={e => setHireForm(f => ({ ...f, mobileNumber: e.target.value }))} placeholder="+91 9876543210" style={inputStyle(hireErrors.mobileNumber)} />
                        {hireErrors.mobileNumber && <span style={errStyle}>{hireErrors.mobileNumber}</span>}
                      </div>
                      <div>
                        <label style={labelStyle}>Email</label>
                        <input id="hire-email" type="email" value={hireForm.email} onChange={e => setHireForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" style={inputStyle(hireErrors.email)} />
                        {hireErrors.email && <span style={errStyle}>{hireErrors.email}</span>}
                      </div>
                    </div>

                    {/* Project Info */}
                    <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.25rem' }}>Project Information</div>
                    <div>
                      <label style={labelStyle}>Project Title *</label>
                      <input id="hire-title" type="text" value={hireForm.title} onChange={e => setHireForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. 3BHK Home Construction" style={inputStyle(hireErrors.title)} />
                      {hireErrors.title && <span style={errStyle}>{hireErrors.title}</span>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label style={labelStyle}>Project Type *</label>
                        <select id="hire-projectType" value={hireForm.projectType} onChange={e => setHireForm(f => ({ ...f, projectType: e.target.value }))} style={inputStyle(false)}>
                          {roleName === 'Architect' && <><option>Residential</option><option>Commercial</option><option>Interior</option><option>Landscape</option></>}
                          {roleName === 'Contractor' && <><option>Residential</option><option>Commercial</option><option>Industrial</option><option>Renovation</option></>}
                          {roleName === 'Labour' && <><option>Construction</option><option>Plumbing</option><option>Electrical</option><option>Painting</option><option>Carpentry</option><option>General Labour</option></>}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Location *</label>
                        <input id="hire-location" type="text" value={hireForm.location} onChange={e => setHireForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Pune, MH" style={inputStyle(hireErrors.location)} />
                        {hireErrors.location && <span style={errStyle}>{hireErrors.location}</span>}
                      </div>
                      <div>
                        <label style={labelStyle}>Budget Range *</label>
                        <input id="hire-budget" type="text" value={hireForm.budget} onChange={e => setHireForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. ₹5L – ₹10L" style={inputStyle(hireErrors.budget)} />
                        {hireErrors.budget && <span style={errStyle}>{hireErrors.budget}</span>}
                      </div>
                      <div>
                        <label style={labelStyle}>Start Date *</label>
                        <input id="hire-startDate" type="date" value={hireForm.startDate} onChange={e => setHireForm(f => ({ ...f, startDate: e.target.value }))} style={inputStyle(hireErrors.startDate)} />
                        {hireErrors.startDate && <span style={errStyle}>{hireErrors.startDate}</span>}
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={labelStyle}>Expected Completion Date</label>
                        <input id="hire-completionDate" type="date" value={hireForm.expectedCompletionDate} onChange={e => setHireForm(f => ({ ...f, expectedCompletionDate: e.target.value }))} style={inputStyle(false)} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Project Description *</label>
                      <textarea id="hire-description" rows={3} value={hireForm.description} onChange={e => setHireForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe work required, materials, preferences, special requirements..." style={{ ...inputStyle(hireErrors.description), resize: 'none' }} />
                      {hireErrors.description && <span style={errStyle}>{hireErrors.description}</span>}
                    </div>

                    {/* Architect-specific */}
                    {roleName === 'Architect' && (<>
                      <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.25rem' }}>Architect Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div><label style={labelStyle}>Plot Area (sq ft)</label><input id="hire-plotArea" type="text" value={hireForm.plotArea} onChange={e => setHireForm(f => ({ ...f, plotArea: e.target.value }))} placeholder="e.g. 1200 sq ft" style={inputStyle(false)} /></div>
                        <div><label style={labelStyle}>Built-up Area (sq ft)</label><input id="hire-builtUpArea" type="text" value={hireForm.builtUpArea} onChange={e => setHireForm(f => ({ ...f, builtUpArea: e.target.value }))} placeholder="e.g. 900 sq ft" style={inputStyle(false)} /></div>
                      </div>
                      <div><label style={labelStyle}>Design Requirements</label><input id="hire-designReq" type="text" value={hireForm.designRequirements} onChange={e => setHireForm(f => ({ ...f, designRequirements: e.target.value }))} placeholder="e.g. Vastu compliant, minimalist style" style={inputStyle(false)} /></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.65rem 0.9rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', cursor: 'pointer' }} onClick={() => setHireForm(f => ({ ...f, needSiteVisits: !f.needSiteVisits }))}>
                        <div style={{ width: 20, height: 20, borderRadius: '5px', background: hireForm.needSiteVisits ? accentColor : 'white', border: `2px solid ${hireForm.needSiteVisits ? accentColor : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{hireForm.needSiteVisits && <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}</div>
                        <span style={{ fontSize: '0.87rem', fontWeight: 600, color: '#334155' }}>Site visits required</span>
                      </div>
                    </>)}

                    {/* Contractor-specific */}
                    {roleName === 'Contractor' && (<>
                      <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.25rem' }}>Contractor Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div><label style={labelStyle}>Construction Type</label><select id="hire-constrType" value={hireForm.constructionType} onChange={e => setHireForm(f => ({ ...f, constructionType: e.target.value }))} style={inputStyle(false)}><option value="">Select...</option><option>RCC Frame</option><option>Load Bearing</option><option>Steel Structure</option><option>Prefab</option></select></div>
                        <div><label style={labelStyle}>Total Area (sq ft)</label><input id="hire-totalArea" type="text" value={hireForm.totalArea} onChange={e => setHireForm(f => ({ ...f, totalArea: e.target.value }))} placeholder="e.g. 2000 sq ft" style={inputStyle(false)} /></div>
                        <div><label style={labelStyle}>Material Responsibility</label><select id="hire-materialResp" value={hireForm.materialResponsibility} onChange={e => setHireForm(f => ({ ...f, materialResponsibility: e.target.value }))} style={inputStyle(false)}><option value="">Select...</option><option value="Client">Client</option><option value="Contractor">Contractor</option></select></div>
                        <div><label style={labelStyle}>Est. Project Duration</label><input id="hire-duration" type="text" value={hireForm.estimatedProjectDuration} onChange={e => setHireForm(f => ({ ...f, estimatedProjectDuration: e.target.value }))} placeholder="e.g. 6 months" style={inputStyle(false)} /></div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.65rem 0.9rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', cursor: 'pointer' }} onClick={() => setHireForm(f => ({ ...f, labourIncluded: !f.labourIncluded }))}>
                        <div style={{ width: 20, height: 20, borderRadius: '5px', background: hireForm.labourIncluded ? accentColor : 'white', border: `2px solid ${hireForm.labourIncluded ? accentColor : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{hireForm.labourIncluded && <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}</div>
                        <span style={{ fontSize: '0.87rem', fontWeight: 600, color: '#334155' }}>Labour included in contract</span>
                      </div>
                    </>)}

                    {/* Labour-specific */}
                    {roleName === 'Labour' && (<>
                      <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.25rem' }}>Labour Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div><label style={labelStyle}>Labour Category</label><select id="hire-labourCat" value={hireForm.labourCategory} onChange={e => setHireForm(f => ({ ...f, labourCategory: e.target.value }))} style={inputStyle(false)}><option value="">Select...</option><option>Mason</option><option>Carpenter</option><option>Electrician</option><option>Plumber</option><option>Painter</option><option>Welder</option><option>Helper</option><option>Other</option></select></div>
                        <div><label style={labelStyle}>Working Duration</label><input id="hire-workingDur" type="text" value={hireForm.workingDuration} onChange={e => setHireForm(f => ({ ...f, workingDuration: e.target.value }))} placeholder="e.g. 15 days" style={inputStyle(false)} /></div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={labelStyle}>Contract Type</label>
                          <div style={{ display: 'flex', gap: '0.6rem' }}>
                            {['Daily', 'Monthly'].map(ct => (
                              <button key={ct} type="button" onClick={() => setHireForm(f => ({ ...f, dailyMonthlyContract: ct }))} style={{ flex: 1, padding: '0.6rem', borderRadius: '0.5rem', border: `2px solid ${hireForm.dailyMonthlyContract === ct ? accentColor : '#e2e8f0'}`, background: hireForm.dailyMonthlyContract === ct ? '#eff6ff' : 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.87rem', color: hireForm.dailyMonthlyContract === ct ? accentColor : '#94a3b8' }}>{ct}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f8fafc', padding: '0.65rem 0.9rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', cursor: 'pointer' }} onClick={() => setHireForm(f => ({ ...f, accommodationProvided: !f.accommodationProvided }))}>
                        <div style={{ width: 20, height: 20, borderRadius: '5px', background: hireForm.accommodationProvided ? accentColor : 'white', border: `2px solid ${hireForm.accommodationProvided ? accentColor : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{hireForm.accommodationProvided && <span style={{ color: 'white', fontSize: '0.7rem', fontWeight: 900 }}>✓</span>}</div>
                        <span style={{ fontSize: '0.87rem', fontWeight: 600, color: '#334155' }}>Accommodation will be provided</span>
                      </div>
                    </>)}

                    {/* Attachment */}
                    <div style={{ fontSize: '0.73rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.25rem' }}>Attachments (Optional)</div>
                    <div style={{ position: 'relative', border: '2px dashed #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', textAlign: 'center', background: '#fafbfc' }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleHireAttachmentUpload(f); }}>
                      {hireAttachmentUploading ? (
                        <p style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: 600, margin: 0 }}>⏳ Uploading...</p>
                      ) : hireForm.attachmentName ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700 }}>✓ {hireForm.attachmentName}</span>
                          <button type="button" onClick={() => setHireForm(f => ({ ...f, attachmentUrl: '', attachmentName: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem' }}>✕</button>
                        </div>
                      ) : (
                        <label htmlFor="hire-attachment" style={{ cursor: 'pointer', display: 'block' }}>
                          <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', color: '#64748b' }}>📎 Drag & drop or click to upload</p>
                          <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.75rem', color: '#94a3b8' }}>Images, PDF, Drawings (max 10MB)</p>
                          <span style={{ display: 'inline-block', background: accentColor, color: 'white', padding: '0.35rem 1rem', borderRadius: '2rem', fontSize: '0.8rem', fontWeight: 700 }}>Browse Files</span>
                          <input id="hire-attachment" type="file" accept="image/*,.pdf,.dwg" onChange={e => { if (e.target.files[0]) handleHireAttachmentUpload(e.target.files[0]); e.target.value = ''; }} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>

                    {/* Next */}
                    <button type="button" onClick={() => { if (validateHireForm()) setHireStep(2); }} style={{ width: '100%', padding: '0.85rem', background: `linear-gradient(135deg, ${accentColor}, #6366f1)`, color: 'white', borderRadius: '0.75rem', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '1rem', boxShadow: '0 4px 20px rgba(99,102,241,0.35)', marginTop: '0.25rem' }}>
                      Review & Continue →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Render Write Review Modal ── */}
      {showReviewModal && (() => {
        const labelStyle = { fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' };
        const textareaStyle = (err) => ({ padding: '0.75rem 1rem', border: `1.5px solid ${err ? '#f87171' : '#e2e8f0'}`, borderRadius: '0.5rem', fontSize: '0.88rem', background: '#fafbfd', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' });
        const errStyle = { fontSize: '0.73rem', color: '#ef4444', fontWeight: 600, marginTop: '2px', display: 'block' };
        return (
          <div className="dl-modal-overlay" onClick={() => { setShowReviewModal(false); setSubmitError(''); }}>
            <div className="dl-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%', borderRadius: '1.25rem', overflow: 'hidden', padding: 0 }}>
              <button className="dl-modal-close" onClick={() => { setShowReviewModal(false); setSubmitError(''); }}>
                <X size={20} />
              </button>

              {/* Gradient Header */}
              <div style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #6366f1 100%)`, padding: '1.5rem 2rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.18)', borderRadius: '0.75rem', padding: '0.6rem', display: 'flex' }}>
                    <Star size={22} color="white" fill="white" />
                  </div>
                  <div>
                    <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                      Write a Review
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.82rem', margin: 0 }}>
                      For {profile.fullName}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleReviewSubmit} style={{ padding: '1.75rem 2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Rating Selector */}
                  <div>
                    <label style={labelStyle}>Rate your experience *</label>
                    <div className="star-selector-container">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="star-selector-btn"
                          onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                        >
                          <Star
                            size={28}
                            fill={(hoveredStar || reviewForm.rating) >= star ? "#f59e0b" : "none"}
                            color={(hoveredStar || reviewForm.rating) >= star ? "#f59e0b" : "#cbd5e1"}
                          />
                        </button>
                      ))}
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#64748b', marginLeft: '6px' }}>
                        {reviewForm.rating} {reviewForm.rating === 1 ? 'Star' : 'Stars'}
                      </span>
                    </div>
                  </div>

                  {/* Review Text */}
                  <div>
                    <label style={labelStyle}>Your Review *</label>
                    <textarea
                      rows={4}
                      placeholder="Share details of your experience working with this professional. What did you like? What could be improved?"
                      value={reviewForm.reviewText}
                      onChange={e => setReviewForm(prev => ({ ...prev, reviewText: e.target.value }))}
                      style={textareaStyle(!reviewForm.reviewText && submitError)}
                    />
                    {!reviewForm.reviewText && submitError && <span style={errStyle}>{submitError}</span>}
                  </div>

                  {/* Optional Project Images */}
                  <div>
                    <label style={labelStyle}>Project Images (Optional)</label>
                    <div style={{ position: 'relative', border: '2px dashed #e2e8f0', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center', background: '#fafbfc' }}>
                      {uploadingImage ? (
                        <p style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <Loader2 size={16} className="ep-spin" /> Uploading image...
                        </p>
                      ) : (
                        <label htmlFor="review-image-input" style={{ cursor: 'pointer', display: 'block' }}>
                          <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>📎 Click to add photo</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>Images (PNG, JPG) max 5MB</p>
                          <input
                            id="review-image-input"
                            type="file"
                            accept="image/*"
                            onChange={handleReviewImageUpload}
                            style={{ display: 'none' }}
                          />
                        </label>
                      )}
                    </div>

                    {/* Previews */}
                    {reviewForm.projectImages.length > 0 && (
                      <div className="uploaded-images-preview-row">
                        {reviewForm.projectImages.map((imgUrl, index) => (
                          <div key={index} className="upload-preview-thumbnail">
                            <img src={imgUrl} alt={`preview-${index}`} />
                            <button
                              type="button"
                              className="upload-preview-remove-btn"
                              onClick={() => handleRemoveReviewImage(index)}
                              title="Remove image"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {submitError && reviewForm.reviewText && (
                    <p style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>
                      {submitError}
                    </p>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => { setShowReviewModal(false); setSubmitError(''); }}
                      style={{
                        background: '#f1f5f9',
                        color: '#475569',
                        border: 'none',
                        padding: '0.65rem 1.25rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || uploadingImage}
                      style={{
                        background: `linear-gradient(135deg, ${accentColor}, #6366f1)`,
                        color: 'white',
                        border: 'none',
                        padding: '0.65rem 1.5rem',
                        borderRadius: '0.5rem',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)'
                      }}
                    >
                      {isSubmitting ? <Loader2 size={14} className="ep-spin" /> : null}
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Review'}</span>
                    </button>
                  </div>

                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ── Render Media Lightbox / Detail Modal ── */}
      {selectedMediaDetail && (
        <div className="dl-modal-overlay" onClick={() => setSelectedMediaDetail(null)} style={{ zIndex: 9999 }}>
          <div className="dl-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%' }}>
            <button className="dl-modal-close" onClick={() => setSelectedMediaDetail(null)}>
              <X size={20} />
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
              {/* Media Preview Container */}
              <div style={{ 
                width: '100%', 
                maxHeight: '450px', 
                background: '#000', 
                borderRadius: '0.75rem', 
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedMediaDetail.type === 'video' ? (
                  <video src={selectedMediaDetail.url} style={{ maxWidth: '100%', maxHeight: '450px' }} controls autoPlay />
                ) : (
                  <img src={selectedMediaDetail.url} alt={selectedMediaDetail.title} style={{ maxWidth: '100%', maxHeight: '450px', objectFit: 'contain' }} />
                )}
              </div>

              {/* Media Metadata Details */}
              <div style={{ padding: '0.5rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 850, color: '#0f172a', marginBottom: '0.25rem' }}>{selectedMediaDetail.title}</h2>
                    <p style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                      Uploaded on {new Date(selectedMediaDetail.createdAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span style={{ 
                    padding: '0.35rem 0.75rem', 
                    borderRadius: '2rem', 
                    fontSize: '0.78rem', 
                    fontWeight: 700,
                    background: selectedMediaDetail.type === 'photo' ? '#ecfdf5' : '#eff6ff',
                    color: selectedMediaDetail.type === 'photo' ? '#065f46' : '#1e40af',
                    border: `1px solid ${selectedMediaDetail.type === 'photo' ? '#a7f3d0' : '#bfdbfe'}`
                  }}>
                    {selectedMediaDetail.category}
                  </span>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                  gap: '1rem',
                  background: '#f8fafc',
                  padding: '1rem',
                  borderRadius: '0.75rem',
                  marginTop: '1.25rem',
                  border: '1px solid #e2e8f0'
                }}>
                  {selectedMediaDetail.projectName && (
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Project Name</span>
                      <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{selectedMediaDetail.projectName}</strong>
                    </div>
                  )}
                  {selectedMediaDetail.projectType && (
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Project Type</span>
                      <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{selectedMediaDetail.projectType}</strong>
                    </div>
                  )}
                  {selectedMediaDetail.location && (
                    <div>
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Location</span>
                      <strong style={{ fontSize: '0.9rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={13} color="#ef4444" /> {selectedMediaDetail.location}
                      </strong>
                    </div>
                  )}
                </div>

                {selectedMediaDetail.description && (
                  <div style={{ marginTop: '1.25rem' }}>
                    <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 750, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.35rem' }}>Description</span>
                    <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedMediaDetail.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Team Member Modal ── */}
      {showAddTeamModal && (() => {
        const currentTeamIds = new Set(teamMembers.map(m => m._id));
        const filtered = allProfessionals.filter(p => {
          if (p._id === profile?._id) return false; // exclude self
          if (teamRoleFilter !== 'All' && p.role !== teamRoleFilter) return false;
          return true;
        });

        return (
          <div className="dl-modal-overlay" onClick={() => setShowAddTeamModal(false)} style={{ zIndex: 9999 }}>
            <div
              className="dl-modal-card atm-modal"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '640px', width: '95%', padding: 0, overflow: 'hidden' }}
            >
              {/* Modal Header */}
              <div className="atm-header" style={{ background: accentColor }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Users2 size={20} color="#fff" />
                  <h2 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Add Team Member</h2>
                </div>
                <button className="dl-modal-close atm-close-btn" onClick={() => setShowAddTeamModal(false)}>
                  <X size={18} />
                </button>
              </div>

              {/* Search + Filter */}
              <div className="atm-search-bar">
                <div className="atm-search-input-wrap">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by name, city or specialization..."
                    value={teamSearch}
                    onChange={e => {
                      setTeamSearch(e.target.value);
                      fetchAllProfessionals(e.target.value, teamRoleFilter);
                    }}
                    className="atm-search-input"
                  />
                  {teamSearch && (
                    <button onClick={() => { setTeamSearch(''); fetchAllProfessionals('', teamRoleFilter); }} className="atm-clear-btn">
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Role Filter Pills */}
                <div className="atm-filter-pills">
                  {['All', 'Architect', 'Contractor', 'Labour'].map(r => (
                    <button
                      key={r}
                      className={`atm-pill ${teamRoleFilter === r ? 'active' : ''}`}
                      style={teamRoleFilter === r ? { background: accentColor, color: '#fff', borderColor: accentColor } : {}}
                      onClick={() => { setTeamRoleFilter(r); fetchAllProfessionals(teamSearch, r); }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Feedback Message */}
              {teamActionMsg && (
                <div className={`atm-action-msg ${teamActionMsg.includes('successfully') ? 'success' : 'error'}`}>
                  {teamActionMsg.includes('successfully')
                    ? <Check size={14} />
                    : <X size={14} />}
                  <span>{teamActionMsg}</span>
                </div>
              )}

              {/* Professionals List */}
              <div className="atm-list">
                {loadingProfessionals ? (
                  <div className="atm-loading">
                    <Loader2 size={22} className="ep-spin" style={{ color: accentColor }} />
                    <span>Loading professionals...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="atm-empty">
                    <Users2 size={32} style={{ color: '#475569', marginBottom: '0.5rem' }} />
                    <p>No professionals found.</p>
                  </div>
                ) : (
                  filtered.map(pro => {
                    const proRole = pro.role || 'Professional';
                    const proRoleColor = proRole === 'Architect' ? '#10b981' : proRole === 'Contractor' ? '#3b82f6' : '#f59e0b';
                    const proInitials = (pro.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    const proSpec = pro.specialization?.[0] || pro.skillType || pro.contractorType || '';
                    const isAlreadyAdded = currentTeamIds.has(pro._id);
                    const isBeingAdded = addingMember === pro._id;

                    return (
                      <div key={pro._id} className="atm-pro-row">
                        {/* Avatar */}
                        {pro.avatarUrl ? (
                          <img src={pro.avatarUrl} alt={pro.fullName} className="atm-pro-avatar" />
                        ) : (
                          <div className="atm-pro-avatar atm-pro-avatar-fallback" style={{ background: proRoleColor }}>
                            {proInitials}
                          </div>
                        )}

                        {/* Info */}
                        <div className="atm-pro-info">
                          <div className="atm-pro-name-row">
                            <span className="atm-pro-name">{pro.fullName}</span>
                            <span className="atm-pro-role-badge" style={{ background: `${proRoleColor}22`, color: proRoleColor, border: `1px solid ${proRoleColor}44` }}>
                              {proRole}
                            </span>
                          </div>
                          <div className="atm-pro-meta">
                            {pro.city && <span><MapPin size={11} /> {pro.city}</span>}
                            {pro.experience && <span><Briefcase size={11} /> {pro.experience}</span>}
                            {proSpec && <span>{proSpec}</span>}
                          </div>
                          {pro.rating > 0 && (
                            <div className="atm-pro-rating">
                              <Star size={11} fill="#f59e0b" color="#f59e0b" />
                              <span>{pro.rating.toFixed(1)}</span>
                              {pro.reviews > 0 && <span style={{ color: '#94a3b8' }}>({pro.reviews})</span>}
                            </div>
                          )}
                        </div>

                        {/* Add Button */}
                        <button
                          className={`atm-add-btn ${isAlreadyAdded ? 'added' : ''}`}
                          style={isAlreadyAdded ? {} : { background: accentColor }}
                          onClick={() => !isAlreadyAdded && !isBeingAdded && handleAddTeamMember(pro._id)}
                          disabled={isAlreadyAdded || isBeingAdded}
                        >
                          {isBeingAdded ? (
                            <Loader2 size={14} className="ep-spin" />
                          ) : isAlreadyAdded ? (
                            <><Check size={13} /><span>Added</span></>
                          ) : (
                            <><Plus size={13} /><span>Add</span></>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="atm-footer">
                <span style={{ color: '#64748b', fontSize: '0.82rem' }}>
                  {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} in team
                </span>
                <button className="atm-done-btn" style={{ background: accentColor }} onClick={() => setShowAddTeamModal(false)}>
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
};

export default ArchitectProfilePage;
