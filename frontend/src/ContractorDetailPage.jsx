import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Star, CheckCircle2, MapPin, Users, Briefcase,
  Clock, ChevronRight, Heart, Play, ExternalLink, MessageCircle,
  Phone, Calendar, Building2, Wrench, Video
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

/* ──────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────── */

const ContractorDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('projects');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFullAbout, setShowFullAbout] = useState(false);
  const [contractorData, setContractorData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch from API
    fetch(`http://localhost:5000/api/professional/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.professional) {
          const prof = data.professional;
          setContractorData({
            id: prof._id,
            fullName: prof.fullName,
            subtitle: `${prof.contractorType || 'Contractor'} | ${prof.city || 'India'}`,
            coverPhoto: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
            avatar: prof.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C',
            avatarColor: '#3b82f6',
            verified: true,
            followers: 0,
            rating: prof.rating || 0,
            reviews: prof.reviews || 0,
            years: parseInt(prof.experience) || 0,
            workers: prof.teamSize || 0,
            serviceArea: prof.serviceLocation?.join(', ') || prof.city || 'India',
            city: prof.city || 'India',
            phone: prof.whatsappNumber || prof.phoneNumber || '',
            about: prof.shortDesc || prof.about || 'No description available.',
            skills: prof.workCategory || [],
            projects: []
          });
        } else {
          setContractorData(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setContractorData(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Contractor Profile" pageSubtitle="Loading profile..." accentColor="#3b82f6">
        <div className="cdp-loading">Loading contractor profile...</div>
      </DashboardLayout>
    );
  }
  if (!contractorData) {
    return (
      <DashboardLayout pageTitle="Contractor Profile" pageSubtitle="Profile not found" accentColor="#3b82f6">
        <div className="cdp-loading">
          <p>Contractor profile not found.</p>
          <button className="prof-page-back-nav" onClick={() => navigate('/contractors')}>
            <ArrowLeft size={18} /> Back to Contractors
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const c = contractorData;
  const recentProjects = c.projects ? c.projects.slice(0, 3) : [];

  return (
    <DashboardLayout pageTitle={c.fullName} pageSubtitle="Contractor Profile" accentColor="#3b82f6">

      {/* Back */}
      <button className="prof-page-back-nav" onClick={() => navigate('/contractors')}>
        <ArrowLeft size={18} /> Back to Contractors
      </button>

      {/* ═══ COVER + AVATAR SECTION ═══ */}
      <div className="cdp-hero">
        <div className="cdp-cover" style={{ backgroundImage: `url(${c.coverPhoto})` }}>
          <div className="cdp-cover-overlay" />
        </div>
        <div className="cdp-hero-bottom">
          <div className="cdp-avatar-area">
            <div className="cdp-avatar" style={{ background: c.avatarColor }}>
              {c.avatar}
              {c.verified && <span className="cdp-verified-badge"><CheckCircle2 size={16} fill="#3b82f6" color="white" /></span>}
            </div>
          </div>
          <div className="cdp-hero-right">
            <button
              className={`cdp-follow-btn ${isFollowing ? 'following' : ''}`}
              onClick={() => setIsFollowing(!isFollowing)}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
            <span className="cdp-followers-count">
              <Users size={14} /> {isFollowing ? c.followers + 1 : c.followers} Followers
            </span>
          </div>
        </div>
      </div>

      {/* ═══ NAME + INFO ═══ */}
      <div className="cdp-info-section">
        <h1 className="cdp-name">{c.fullName}</h1>
        <p className="cdp-subtitle">{c.subtitle}</p>

        <div className="cdp-stats-row">
          <div className="cdp-stat">
            <Clock size={16} />
            <strong>{c.years} Years Experience</strong>
          </div>
          <div className="cdp-stat-divider" />
          <div className="cdp-stat">
            <Users size={16} />
            <strong>{c.workers} Workers Available</strong>
          </div>
          <div className="cdp-stat-divider" />
          <div className="cdp-stat">
            <MapPin size={16} />
            <div>
              <span className="cdp-stat-label">Service Areas</span>
              <strong>{c.serviceArea}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ ABOUT ═══ */}
      <div className="cdp-card">
        <h2>About</h2>
        <p className="cdp-about-text">
          {showFullAbout ? c.about : c.about.slice(0, 180) + '...'}
          <button className="cdp-read-more" onClick={() => setShowFullAbout(!showFullAbout)}>
            {showFullAbout ? 'Show Less' : 'Read More'}
          </button>
        </p>
      </div>

      {/* ═══ SKILLS & EXPERTISE ═══ */}
      <div className="cdp-card">
        <div className="cdp-card-header">
          <h2>Skills & Expertise</h2>
          <button className="cdp-view-all-link">View All</button>
        </div>
        <div className="cdp-skills-grid">
          {c.skills.map((skill, idx) => (
            <span key={idx} className="cdp-skill-tag">{skill}</span>
          ))}
        </div>
      </div>

      {/* ═══ RECENT PROJECTS ═══ */}
      <div className="cdp-card">
        <div className="cdp-card-header">
          <h2>Recent Projects</h2>
          <button className="cdp-view-all-link" onClick={() => setActiveTab('projects')}>View All</button>
        </div>
        <div className="cdp-recent-projects">
          {recentProjects.map(proj => (
            <div key={proj.id} className="cdp-recent-card" onClick={() => navigate(`/project/${proj.id}`)}>
              <img src={proj.img} alt={proj.name} />
              <div className="cdp-recent-info">
                <h3>{proj.name}</h3>
                <span><MapPin size={11} /> {proj.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ TABBED SECTIONS ═══ */}
      <div className="cdp-tabs-section">
        <div className="cdp-tabs-nav">
          <button className={`cdp-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
            <Briefcase size={16} /> Projects
          </button>
          <button className={`cdp-tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>
            <Video size={16} /> Media
          </button>
          <button className={`cdp-tab ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
            <Users size={16} /> Team
          </button>
        </div>

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="cdp-tab-content">
            {c.projects.map(proj => (
              <div key={proj.id} className="cdp-project-row" onClick={() => navigate(`/project/${proj.id}`)}>
                <img src={proj.img} alt={proj.name} className="cdp-proj-thumb" />
                <div className="cdp-proj-info">
                  <h3>{proj.name}</h3>
                  <span className="cdp-proj-location"><MapPin size={12} /> {proj.location}</span>
                </div>
                <div className="cdp-proj-progress-col">
                  <div className="cdp-progress-bar">
                    <div className="cdp-progress-fill" style={{ width: `${proj.progress}%`, background: proj.progress === 100 ? '#10b981' : '#3b82f6' }} />
                  </div>
                  <span className="cdp-progress-text">{proj.progress}%</span>
                </div>
                <ChevronRight size={18} className="cdp-proj-arrow" />
              </div>
            ))}
          </div>
        )}

        {/* Media Tab */}
        {activeTab === 'media' && (
          <div className="cdp-tab-content">
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No media uploaded yet.</p>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="cdp-tab-content">
            <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>No team members added yet.</p>
          </div>
        )}
      </div>

    </DashboardLayout>
  );
};

export default ContractorDetailPage;
