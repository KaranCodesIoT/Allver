import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, MapPin, Star, Phone, MessageCircle,
  Briefcase, Users, Play, Video, Users2, StarHalf, Heart, Check, ExternalLink, Calendar, Plus, X
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
  { id: 'v1', title: 'Modern Villa Walkthrough', duration: '0:30', category: 'Walkthrough', thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80' },
  { id: 'v2', title: 'Apartment Interior Tour', duration: '0:45', category: 'Walkthrough', thumbnail: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80' },
  { id: 'v3', title: 'Construction Timelapse', duration: '0:25', category: 'Timelapse', thumbnail: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80' },
  { id: 'v4', title: 'Bungalow Exterior Design', duration: '0:32', category: 'Reels', thumbnail: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=400&q=80' },
  { id: 'v5', title: 'Living Room Walkthrough', duration: '0:29', category: 'Walkthrough', thumbnail: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80' },
  { id: 'v6', title: 'Site Progress Update', duration: '0:40', category: 'Timelapse', thumbnail: 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=400&q=80' }
];

const MOCK_TEAM = [
  { id: 't1', name: 'Mitesh Construction', role: 'Contractor', experience: '12 Years Experience', specialization: 'Specializes in Residential Projects', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80' },
  { id: 't2', name: 'BuildWell Contractors', role: 'Contractor', experience: '8 Years Experience', specialization: 'Specializes in Commercial Projects', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: 't3', name: 'Shree Builders', role: 'Contractor', experience: '10 Years Experience', specialization: 'Specializes in Villas & Bungalows', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80' },
  { id: 't4', name: 'Nexus Constructions', role: 'Contractor', experience: '6 Years Experience', specialization: 'Specializes in Interiors & Renovation', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
  { id: 't5', name: 'Reliable Buildcon', role: 'Contractor', experience: '9 Years Experience', specialization: 'Specializes in Structural Masonry', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80' },
  { id: 'team-member', name: 'Akash Chauhan', role: 'Labour', experience: '5 Years Experience', specialization: 'Specializes in Masonry and Brickwork', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80' }
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
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'videos', 'team', 'reviews'
  const [videoFilter, setVideoFilter] = useState('All');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(256);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [contractRequests, setContractRequests] = useState([]);
  const [realWorkspaces, setRealWorkspaces] = useState([]);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireRequestSuccess, setHireRequestSuccess] = useState(false);
  const [hireForm, setHireForm] = useState({
    title: '',
    projectType: 'Residential',
    location: '',
    budget: '',
    startDate: '',
    description: ''
  });

  const handleRequestAction = async (requestId, status) => {
    try {
      const response = await fetch(`http://localhost:5000/api/contract-requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      const data = await response.json();
      if (response.ok) {
        if (currentUser) {
          fetch(`http://localhost:5000/api/contract-requests/user/${currentUser._id}`)
            .then(res => res.json())
            .then(d => setContractRequests(d.requests || []))
            .catch(err => console.error(err));
          fetch(`http://localhost:5000/api/project-workspaces/user/${currentUser._id}`)
            .then(res => res.json())
            .then(d => setRealWorkspaces(d.workspaces || []))
            .catch(err => console.error(err));
        }
        
        if (status === 'Accepted' && data.workspace) {
          alert(`Contract request accepted! Redirecting to workspace...`);
          navigate('/', { state: { activeTab: 'workspaces', selectedWorkspace: data.workspace._id } });
        } else {
          alert(`Contract request ${status.toLowerCase()}!`);
        }
      } else {
        alert(data.message || 'Failed to update request');
      }
    } catch (err) {
      console.error('Error updating request status:', err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    let currUser = null;
    if (userStr) {
      currUser = JSON.parse(userStr);
      setCurrentUser(currUser);
      // Fetch contract requests
      fetch(`http://localhost:5000/api/contract-requests/user/${currUser._id}`)
        .then(res => res.json())
        .then(data => setContractRequests(data.requests || []))
        .catch(err => console.error('Error fetching requests in profile:', err));
    }

    // Reset ownership flag on every navigation
    setIsOwnProfile(false);
    setLoading(true);

    const profileId = id || currUser?._id;
    if (!profileId) {
      setLoading(false);
      return;
    }

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
        } else if (profileId === currUser?._id) {
          setProfile(currUser);
          setFollowersCount(0);
        }
        setLoading(false);
      })
      .catch(() => {
        if (profileId === currUser?._id) {
          setProfile(currUser);
          setFollowersCount(0);
        }
        setLoading(false);
      });

    // Fetch real workspaces for the profile user
    fetch(`http://localhost:5000/api/project-workspaces/user/${profileId}`)
      .then(res => res.json())
      .then(data => setRealWorkspaces(data.workspaces || []))
      .catch(err => console.error('Error fetching profile workspaces:', err));
  }, [id]);

  const handleHireSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !profile) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/contract-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client: currentUser._id,
          professional: profile._id,
          title: hireForm.title,
          projectType: 'General',
          location: hireForm.location,
          budget: hireForm.budget,
          startDate: new Date().toISOString().split('T')[0],
          description: hireForm.description
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setHireRequestSuccess(true);
        setTimeout(() => {
          setHireRequestSuccess(false);
          setShowHireModal(false);
          setHireForm({
            title: '',
            projectType: 'General',
            location: '',
            budget: '',
            startDate: '',
            description: ''
          });
        }, 4000);
      } else {
        alert(data.message || 'Failed to send hire request');
      }
    } catch (err) {
      console.error('Error sending request:', err);
      alert('Error connecting to server.');
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

  const dbProjects = realWorkspaces.map(ws => ({
    id: ws._id,
    name: ws.title,
    location: ws.client?.city || ws.client?.location || 'Mumbai',
    status: ws.status === 'Active' ? 'In Progress' : ws.status,
    year: new Date(ws.createdAt).getFullYear() || 2026,
    img: ws.projectType === 'Interior' 
      ? 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80' 
      : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    isReal: true
  }));

  const baseProjectsList = profile.portfolioImages && profile.portfolioImages.length > 0
    ? profile.portfolioImages.map((img, index) => ({
        id: `p-${index}`,
        name: `Project ${index + 1}`,
        location: profile.city || 'Mumbai',
        status: 'Completed',
        year: 2024 - index,
        img: img
      }))
    : MOCK_PROJECTS;

  const projectsList = [...dbProjects, ...baseProjectsList];

  return (
    <DashboardLayout pageTitle={pageTitle} pageSubtitle={pageSubtitle} accentColor={accentColor}>
      
      {/* Pending Hires / Contract Requests Alert Banner */}
      {isOwnProfile && contractRequests.filter(r => {
        const profId = (r.professional?._id || r.professional || '').toString();
        const currId = (currentUser?._id || '').toString();
        return profId === currId && r.status === 'Pending';
      }).length > 0 && (
        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '0.75rem',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          textAlign: 'left'
        }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 'bold', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔔 You have pending work requests!
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
            {contractRequests.filter(r => {
              const profId = (r.professional?._id || r.professional || '').toString();
              const currId = (currentUser?._id || '').toString();
              return profId === currId && r.status === 'Pending';
            }).map(req => (
              <div key={req._id} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', background: 'white', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.72rem', background: '#dbeafe', color: '#1e40af', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      New Work Request
                    </span>
                    <div style={{ fontSize: '0.92rem', color: '#0f172a', fontWeight: 'bold', marginTop: '4px' }}>
                      Project: {req.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '2px' }}>
                      <strong>From:</strong> {req.client?.fullName || 'Someone'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleRequestAction(req._id, 'Accepted')}
                      style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.45rem 1rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Accept Discussion
                    </button>
                    <button
                      onClick={() => handleRequestAction(req._id, 'Rejected')}
                      style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.45rem 1rem', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
                
                <div style={{ background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div><strong>Location:</strong> {req.location}</div>
                  <div><strong>Budget:</strong> {req.budget}</div>
                  {req.description && <div style={{ marginTop: '2px', borderTop: '1px solid #e2e8f0', paddingTop: '4px' }}><strong>Description:</strong> {req.description}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          {roleName !== 'Client' && (
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
              <button className={`pw-tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
                <Briefcase size={16} />
                <span>Projects</span>
              </button>
              <button className={`pw-tab-btn ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>
                <Video size={16} />
                <span>Videos</span>
              </button>
              <button className={`pw-tab-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
                <Users2 size={16} />
                <span>Team</span>
              </button>
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
                        onClick={() => {
                          if (proj.isReal) {
                            navigate('/', { state: { activeTab: 'workspaces', selectedWorkspace: proj.id } });
                          } else {
                            navigate(`/project/${proj.id}`);
                          }
                        }}
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
                  {/* Video Filters */}
                  <div className="tab-video-filters">
                    {['All', 'Reels', 'Walkthrough', 'Timelapse'].map(cat => (
                      <button
                        key={cat}
                        className={`video-filter-pill ${videoFilter === cat ? 'active' : ''}`}
                        onClick={() => setVideoFilter(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Videos Grid */}
                  <div className="tab-videos-grid">
                    {MOCK_VIDEOS
                      .filter(v => videoFilter === 'All' || v.category === videoFilter)
                      .map(vid => (
                        <div key={vid.id} className="tab-video-card">
                          <div className="tvc-thumb" style={{ backgroundImage: `url(${vid.thumbnail})` }}>
                            <div className="tvc-play-overlay">
                              <Play size={20} fill="white" color="white" />
                            </div>
                            <span className="tvc-duration">{vid.duration}</span>
                          </div>
                          <div className="tvc-info">
                            <h3>{vid.title}</h3>
                            <span className="tvc-category">{vid.category}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeTab === 'team' && (
                <div className="tab-pane-fade">
                  <div className="tab-team-list">
                    {MOCK_TEAM.map(member => (
                      <div key={member.id} className="tab-team-row">
                        <img src={member.img} alt={member.name} className="ttr-avatar" />
                        <div className="ttr-info">
                          <div className="ttr-name-row">
                            <h3>{member.name}</h3>
                            <span className="ttr-role-badge">{member.role}</span>
                          </div>
                          <p className="ttr-exp">{member.experience}</p>
                          <p className="ttr-spec">{member.specialization}</p>
                        </div>
                        <button 
                          className="ttr-view-profile-btn" 
                          onClick={() => {
                            if (member.role === 'Labour' || member.id === 'team-member') {
                              navigate('/labour/manage/team-member');
                            } else {
                              navigate(`/contractor/${member.id}`);
                            }
                          }}
                        >
                          <span>Project Dashboard</span>
                          <ExternalLink size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="tab-pane-fade">
                  {/* Ratings Breakdown Summary */}
                  <div className="tab-reviews-summary-card">
                    <div className="trsc-score-block">
                      <h1>{profile.rating || 4.8}</h1>
                      <div className="trsc-stars-row">
                        {[1, 2, 3, 4].map(n => <Star key={n} size={15} fill="#f59e0b" color="#f59e0b" />)}
                        <StarHalf size={15} fill="#f59e0b" color="#f59e0b" />
                      </div>
                      <p>({profile.reviews || 124} Reviews)</p>
                    </div>
                    <div className="trsc-bars-column">
                      <div className="trsc-bar-row">
                        <span>5 ★</span>
                        <div className="bar-bg"><div className="bar-fill" style={{ width: '82%' }}></div></div>
                        <span>96</span>
                      </div>
                      <div className="trsc-bar-row">
                        <span>4 ★</span>
                        <div className="bar-bg"><div className="bar-fill" style={{ width: '15%' }}></div></div>
                        <span>21</span>
                      </div>
                      <div className="trsc-bar-row">
                        <span>3 ★</span>
                        <div className="bar-bg"><div className="bar-fill" style={{ width: '3%' }}></div></div>
                        <span>5</span>
                      </div>
                      <div className="trsc-bar-row">
                        <span>2 ★</span>
                        <div className="bar-bg"><div className="bar-fill" style={{ width: '0%' }}></div></div>
                        <span>2</span>
                      </div>
                      <div className="trsc-bar-row">
                        <span>1 ★</span>
                        <div className="bar-bg"><div className="bar-fill" style={{ width: '0%' }}></div></div>
                        <span>0</span>
                      </div>
                    </div>
                  </div>

                  {/* Individual Reviews List */}
                  <div className="tab-reviews-list">
                    {MOCK_REVIEWS.map(rev => (
                      <div key={rev.id} className="tab-review-card">
                        <div className="trc-header">
                          <div className="trc-user-info">
                            <div className="trc-user-avatar">{rev.name.split(' ').map(n=>n[0]).join('')}</div>
                            <div>
                              <h3>{rev.name}</h3>
                              <div className="trc-rating-stars">
                                {Array.from({ length: rev.rating }).map((_, i) => (
                                  <Star key={i} size={12} fill="#f59e0b" color="#f59e0b" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <span className="trc-date">{rev.date}</span>
                        </div>
                        <p className="trc-comment">{rev.comment}</p>
                        {rev.imgs.length > 0 && (
                          <div className="trc-images-grid">
                            {rev.imgs.map((img, i) => (
                              <img key={i} src={img} alt={`review-img-${i}`} className="trc-thumb" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
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
      {showHireModal && (
        <div className="dl-modal-overlay" onClick={() => setShowHireModal(false)}>
          <div className="dl-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="dl-modal-close" onClick={() => setShowHireModal(false)}>
              <X size={20} />
            </button>
            
            <div className="dl-modal-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <div className="dl-modal-title-block">
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Briefcase size={24} style={{ color: accentColor }} />
                  Hire {profile.role || 'Contractor'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>
                  Send work request details to {profile.fullName} to initiate a contract discussion
                </p>
              </div>
            </div>

            {hireRequestSuccess ? (
              <div className="dl-modal-body" style={{ padding: '3.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center' }}>
                  <CheckCircle2 size={64} />
                </div>
                <h4 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#0f172a' }}>Work Request Sent!</h4>
                <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '380px', margin: '0 auto', lineHeight: '1.5' }}>
                  Your request has been sent to {profile.fullName}. You will be notified once they review and accept the discussion.
                </p>
              </div>
            ) : (
              <form onSubmit={handleHireSubmit} className="dl-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-row">
                   <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Project Name *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 2BHK Plumbing & Electrical Work"
                    value={hireForm.title}
                    onChange={(e) => setHireForm({...hireForm, title: e.target.value})}
                    style={{
                      padding: '0.65rem 0.85rem',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                      background: '#fafbfd',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-row">
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Location *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Thane"
                      value={hireForm.location}
                      onChange={(e) => setHireForm({...hireForm, location: e.target.value})}
                      style={{
                        padding: '0.65rem 0.85rem',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        background: '#fafbfd',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div className="form-row">
                     <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Expected Budget *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. ₹2L - ₹4L"
                      value={hireForm.budget}
                      onChange={(e) => setHireForm({...hireForm, budget: e.target.value})}
                      style={{
                        padding: '0.65rem 0.85rem',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        background: '#fafbfd',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                <div className="form-row">
                   <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Short Requirement *</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Provide a brief summary of the work and requirements..."
                    style={{
                      padding: '0.65rem 0.85rem',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                      background: '#fafbfd',
                      fontFamily: 'inherit',
                      resize: 'none',
                      outline: 'none',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                    value={hireForm.description}
                    onChange={(e) => setHireForm({...hireForm, description: e.target.value})}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn-cancel"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      color: '#64748b'
                    }}
                    onClick={() => setShowHireModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-get-started"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: accentColor,
                      color: 'white',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600',
                      boxShadow: `0 4px 14px 0 rgba(59, 130, 246, 0.3)`
                    }}
                  >
                    Send Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ArchitectProfilePage;
