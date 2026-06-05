import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, MapPin, Star, Phone, MessageCircle,
  Briefcase, Users, Play, Video, Users2, StarHalf, Heart, Check, ExternalLink, Calendar, Plus
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const MOCK_ARCHITECTS = [
  {
    _id: 'mock-1', fullName: 'Neha Sharma', city: 'Mumbai, Maharashtra',
    experience: '8 Years', firmName: 'Design Space Architects',
    specialization: ['Residential Design', 'Commercial Design', 'Interior Design', 'Landscape', '3D Visualization', 'Renovation', 'Vastu Planning', 'Smart Homes'],
    rating: 4.8, reviews: 124, projects: 128, followers: 256,
    isMock: true, avatar: 'NS', avatarColor: '#10b981',
    phone: '+91 98765 43210',
    cover: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    shortDesc: 'We specialize in residential and commercial architecture with a focus on modern, sustainable, and functional design solutions.'
  },
  {
    _id: 'mock-2', fullName: 'Rohit Mehta', city: 'Pune, Maharashtra',
    experience: '10 Years', firmName: 'Mehta Architects & Associates',
    specialization: ['Urban Planning', 'Green Building', 'Commercial Space', 'Contemporary Design', 'Acoustics', 'Eco-friendly Design'],
    rating: 4.7, reviews: 98, projects: 96, followers: 189,
    isMock: true, avatar: 'RM', avatarColor: '#3b82f6',
    phone: '+91 98765 11223',
    cover: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&q=80',
    shortDesc: 'Leading architect specializing in sustainable contemporary and eco-friendly structures.'
  },
  {
    _id: 'mock-3', fullName: 'Priya Nair', city: 'Bengaluru, Karnataka',
    experience: '7 Years', firmName: 'Nair Interior Architecture',
    specialization: ['Interior Architecture', 'Space Optimization', 'Custom Furniture', 'Lighting Design', 'Luxury Penthouse', 'Color Theory'],
    rating: 4.9, reviews: 156, projects: 156, followers: 218,
    isMock: true, avatar: 'PN', avatarColor: '#8b5cf6',
    phone: '+91 98765 99887',
    cover: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    shortDesc: 'Passionate interior architect focusing on personalized spaces, space optimization, and bespoke luxury furniture.'
  },
  {
    _id: 'mock-4', fullName: 'Karan Patel', city: 'Hyderabad, Telangana',
    experience: '6 Years', firmName: 'KP Design Studio',
    specialization: ['Affordable Housing', 'Prefabrication', 'Renovation', 'Steel Structure', 'Bungalow Planning'],
    rating: 4.6, reviews: 72, projects: 84, followers: 132,
    isMock: true, avatar: 'KP', avatarColor: '#f59e0b',
    phone: '+91 98765 33445',
    cover: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
    shortDesc: 'Innovative engineering and architecture solutions combining prefabrication and affordable design.'
  },
  {
    _id: 'mock-5', fullName: 'Aisha Khan', city: 'Delhi, NCR',
    experience: '9 Years', firmName: 'Khan Restoration & Luxury Design',
    specialization: ['Heritage Restoration', 'Luxury Residential', 'Boutique Hotels', 'Landscape Architecture', 'Art Deco'],
    rating: 4.8, reviews: 110, projects: 98, followers: 310,
    isMock: true, avatar: 'AK', avatarColor: '#ec4899',
    phone: '+91 98765 66778',
    cover: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    shortDesc: 'Award-winning heritage restorer and high-end residential architect.'
  },
  {
    _id: 'mock-6', fullName: 'Sanjay Verma', city: 'Chennai, Tamil Nadu',
    experience: '12 Years', firmName: 'Verma Green Architects',
    specialization: ['Sustainable Design', 'Solar Architecture', 'Urban Landscaping', 'Passive Cooling', 'Community Planning'],
    rating: 4.7, reviews: 89, projects: 120, followers: 204,
    isMock: true, avatar: 'SV', avatarColor: '#06b6d4',
    phone: '+91 98765 55443',
    cover: 'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?auto=format&fit=crop&w=1200&q=80',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    shortDesc: 'Pioneering sustainable and zero-emission building structures with integrated solar and passive cooling technology.'
  }
];

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
  const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'videos', 'team', 'reviews'
  const [videoFilter, setVideoFilter] = useState('All');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(256);
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    let currentUser = null;
    if (userStr) {
      currentUser = JSON.parse(userStr);
    }

    const profileId = id || currentUser?._id;
    if (!profileId) {
      setLoading(false);
      return;
    }

    if (profileId === currentUser?._id) {
      setIsOwnProfile(true);
    }

    // Attempt to load mock architect first
    const mockFind = MOCK_ARCHITECTS.find(a => a._id === profileId);
    if (mockFind) {
      setProfile(mockFind);
      setFollowersCount(mockFind.followers || 256);
      setLoading(false);
    } else {
      // Fetch from API for real registered professionals
      fetch(`http://localhost:5000/api/professional/${profileId}`)
        .then(res => res.json())
        .then(data => {
          if (data.professional) {
            setProfile(data.professional);
            setFollowersCount(256);
            if (data.professional._id === currentUser?._id) {
              setIsOwnProfile(true);
            }
          } else if (profileId === currentUser?._id) {
            // Fallback to local storage if API didn't return professional object directly
            setProfile(currentUser);
            setFollowersCount(256);
          }
          setLoading(false);
        })
        .catch(() => {
          if (profileId === currentUser?._id) {
            setProfile(currentUser);
            setFollowersCount(256);
          }
          setLoading(false);
        });
    }
  }, [id]);

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
  const avatarBg = profile.isMock ? profile.avatarColor : accentColor;
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
                      <button className="pwbc-btn primary-hire-btn" style={{ background: accentColor }}>
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
                      <div key={proj.id} className="tab-project-row">
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
                        <button className="tpr-bookmark-btn" title="Save Project">
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
                        <button className="ttr-view-profile-btn" onClick={() => navigate('/contractors')}>
                          <span>View Profile</span>
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

    </DashboardLayout>
  );
};

export default ArchitectProfilePage;
