import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Star, CheckCircle2, MapPin, Users, Briefcase,
  Clock, ChevronRight, Heart, Play, ExternalLink, MessageCircle,
  Phone, Calendar, Building2, Wrench, Video
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

/* ──────────────────────────────────────────
   MOCK DATA — Contractors dynamic profiles
   ────────────────────────────────────────── */

const MOCK_CONTRACTORS_DETAILS = {
  'mock-c1': {
    id: 'mock-c1',
    fullName: 'BuildWell Constructions',
    subtitle: 'Civil Contractor | Mumbai, Maharashtra',
    coverPhoto: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    avatar: 'BW',
    avatarColor: '#3b82f6',
    verified: true,
    followers: 320,
    rating: 4.8,
    reviews: 124,
    years: 12,
    workers: 45,
    serviceArea: 'Mumbai, Navi Mumbai, Thane',
    city: 'Mumbai, Maharashtra',
    phone: '9876543210',
    about: 'BuildWell Constructions is a premier civil contracting company specializing in residential and commercial construction. With over 12 years of experience, we have successfully delivered over 150 projects, ensuring timely delivery and the highest standards of safety and quality.',
    skills: ['RCC Work', 'Brickwork', 'Concrete Pouring', 'Slab Work', 'Foundation Repair', 'Tile Work', 'Plastering'],
    projects: [
      { id: 'p1', name: '2BHK Residential Construction', location: 'Navi Mumbai', status: 'Ongoing', progress: 65, year: 2024, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80' },
      { id: 'p2', name: '3BHK Villa Project', location: 'Panvel, Navi Mumbai', status: 'Completed', progress: 100, year: 2024, img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80' },
      { id: 'p3', name: 'Interior Work', location: 'Kharghar', status: 'Ongoing', progress: 40, year: 2024, img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=400&q=80' },
      { id: 'p4', name: 'Renovation Project', location: 'Belapur, Navi Mumbai', status: 'Ongoing', progress: 30, year: 2024, img: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=400&q=80' }
    ]
  },
  'mock-c2': {
    id: 'mock-c2',
    fullName: 'Surya Constructions',
    subtitle: 'General Contractor | Pune, Maharashtra',
    coverPhoto: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80',
    avatar: 'SC',
    avatarColor: '#f59e0b',
    verified: true,
    followers: 245,
    rating: 4.7,
    reviews: 98,
    years: 10,
    workers: 35,
    serviceArea: 'Pune, Pimpri-Chinchwad',
    city: 'Pune, Maharashtra',
    phone: '9865327410',
    about: 'Surya Constructions is dedicated to building strength, precision, and reliability in every structure. We manage turnkey residential projects, home extensions, and complex structural renovations with a strong focus on engineering precision.',
    skills: ['Excavation', 'Brickwork', 'Roofing', 'False Ceiling', 'Electrical Wiring', 'Plumbing Fitting'],
    projects: [
      { id: 'p1', name: 'Luxury Villa Construction', location: 'Koregaon Park, Pune', status: 'Completed', progress: 100, year: 2023, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80' },
      { id: 'p2', name: 'Residential Row House', location: 'Baner, Pune', status: 'Ongoing', progress: 80, year: 2024, img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80' }
    ]
  },
  'mock-c3': {
    id: 'mock-c3',
    fullName: 'Shree Ram Builders',
    subtitle: 'Civil Contractor | Bengaluru, Karnataka',
    coverPhoto: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=1200&q=80',
    avatar: 'SR',
    avatarColor: '#ef4444',
    verified: true,
    followers: 198,
    rating: 4.6,
    reviews: 76,
    years: 8,
    workers: 30,
    serviceArea: 'Bengaluru, Whitefield, Electronic City',
    city: 'Bengaluru, Karnataka',
    phone: '9123456789',
    about: 'Experts in home construction, modern villa builders, and renovation services. We use high-quality raw materials and provide end-to-end building project management.',
    skills: ['Structure Construction', 'Wall Plastering', 'Painting', 'Tiling & Flooring', 'Sanitary Work'],
    projects: [
      { id: 'p1', name: 'Independent Duplex House', location: 'Whitefield', status: 'Completed', progress: 100, year: 2023, img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=400&q=80' }
    ]
  },
  'mock-c4': {
    id: 'mock-c4',
    fullName: 'Reliable Infra Solutions',
    subtitle: 'General Contractor | Hyderabad, Telangana',
    coverPhoto: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
    avatar: 'RI',
    avatarColor: '#6366f1',
    verified: true,
    followers: 176,
    rating: 4.5,
    reviews: 64,
    years: 9,
    workers: 40,
    serviceArea: 'Hyderabad, Secunderabad',
    city: 'Hyderabad, Telangana',
    phone: '9000112233',
    about: 'Delivering strong and sustainable structures across industries. Specializing in commercial builds, warehousing infrastructure, and civil projects.',
    skills: ['RCC Foundations', 'Steel Structural Fabrications', 'Roofing Systems', 'Industrial Flooring'],
    projects: [
      { id: 'p1', name: 'Commercial Warehouse Build', location: 'Secunderabad', status: 'Completed', progress: 100, year: 2023, img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80' }
    ]
  }
};

// Default fallback contractor
const DEFAULT_CONTRACTOR = {
  id: 'raj-construction',
  fullName: 'Raj Construction Services',
  subtitle: 'Residential Contractor | Navi Mumbai',
  coverPhoto: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
  avatar: 'RC',
  avatarColor: '#3b82f6',
  verified: true,
  followers: 256,
  rating: 4.8,
  reviews: 124,
  years: 5,
  workers: 25,
  serviceArea: 'Mumbai, Navi Mumbai',
  city: 'Navi Mumbai, Maharashtra',
  phone: '9136354231',
  about: 'We are a trusted team of construction professionals specializing in residential projects. From planning to completion, we ensure quality, on-time delivery and customer satisfaction. Our team handles everything from foundation work to interior finishing with the highest standards.',
  skills: ['RCC Work', 'Brickwork', 'Plumbing', 'Electrical', 'Painting', 'Tile Work', 'False Ceiling', 'Carpentry'],
  projects: [
    { id: 'p1', name: '2BHK Residential Construction', location: 'Navi Mumbai', status: 'Ongoing', progress: 65, year: 2024, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80' },
    { id: 'p2', name: '3BHK Villa Project', location: 'Panvel, Navi Mumbai', status: 'Completed', progress: 100, year: 2024, img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80' },
    { id: 'p3', name: 'Interior Work', location: 'Kharghar', status: 'Ongoing', progress: 40, year: 2024, img: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=400&q=80' },
    { id: 'p4', name: 'Renovation Project', location: 'Belapur, Navi Mumbai', status: 'Ongoing', progress: 30, year: 2024, img: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=400&q=80' }
  ]
};

const MOCK_MEDIA = [
  { id: 'm1', type: 'image', src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80' },
  { id: 'm2', type: 'image', src: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80' },
  { id: 'm3', type: 'image', src: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=400&q=80' },
  { id: 'm4', type: 'video', src: 'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=400&q=80', duration: '0:33' },
  { id: 'm5', type: 'image', src: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80' },
  { id: 'm6', type: 'image', src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80' },
];

const MOCK_TEAM = [
  { id: 'mock-l1', name: 'Ramesh Yadav', role: 'Site Supervisor', experience: '10 Years Experience', rating: 4.8, reviews: 124, avatar: 'RY', color: '#10b981', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80', status: 'Available' },
  { id: 'mock-l2', name: 'Suresh Patil', role: 'Mason', experience: '10 Years Experience', rating: 4.6, reviews: 89, avatar: 'SP', color: '#f59e0b', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', status: 'Available' },
  { id: 'mock-l3', name: 'Ravi Singh', role: 'Carpenter', experience: '7 Years Experience', rating: 4.7, reviews: 102, avatar: 'RS', color: '#3b82f6', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', status: 'Available' },
  { id: 'mock-l4', name: 'Imran Shaikh', role: 'Electrician', experience: '8 Years Experience', rating: 4.5, reviews: 67, avatar: 'IS', color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80', status: 'Available' },
  { id: 'mock-l5', name: 'Mahesh Gupta', role: 'Electrician', experience: '6 Years Experience', rating: 4.9, reviews: 156, avatar: 'MG', color: '#ef4444', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80', status: 'Available' },
  { id: 'mock-l6', name: 'Anil Naik', role: 'Painter', experience: '5 Years Experience', rating: 4.4, reviews: 54, avatar: 'AN', color: '#06b6d4', img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80', status: 'Available' },
];

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
    // Dynamic load
    if (MOCK_CONTRACTORS_DETAILS[id]) {
      setContractorData(MOCK_CONTRACTORS_DETAILS[id]);
      setLoading(false);
    } else {
      // Fetch or Fallback
      fetch(`http://localhost:5000/api/professionals/details/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.professional) {
            const prof = data.professional;
            setContractorData({
              id: prof._id,
              fullName: prof.fullName,
              subtitle: `${prof.contractorType || 'Contractor'} | ${prof.city || 'India'}`,
              coverPhoto: DEFAULT_CONTRACTOR.coverPhoto,
              avatar: prof.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'C',
              avatarColor: '#3b82f6',
              verified: true,
              followers: prof.followers || 150,
              rating: prof.rating || 4.5,
              reviews: prof.reviews || 35,
              years: parseInt(prof.experience) || 5,
              workers: prof.teamSize || 20,
              serviceArea: prof.serviceLocation?.join(', ') || prof.city || 'India',
              city: prof.city || 'India',
              phone: prof.whatsappNumber || '9136354231',
              about: prof.shortDesc || DEFAULT_CONTRACTOR.about,
              skills: prof.workCategory || DEFAULT_CONTRACTOR.skills,
              projects: DEFAULT_CONTRACTOR.projects
            });
          } else {
            setContractorData(DEFAULT_CONTRACTOR);
          }
          setLoading(false);
        })
        .catch(() => {
          // Fallback to default mock contractor
          setContractorData(DEFAULT_CONTRACTOR);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Contractor Profile" pageSubtitle="Loading profile..." accentColor="#3b82f6">
        <div className="cdp-loading">Loading contractor profile...</div>
      </DashboardLayout>
    );
  }

  const c = contractorData || DEFAULT_CONTRACTOR;
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
            <div className="cdp-media-grid">
              {MOCK_MEDIA.map(item => (
                <div key={item.id} className="cdp-media-item">
                  <img src={item.src} alt="media" />
                  {item.type === 'video' && (
                    <div className="cdp-media-play">
                      <Play size={20} fill="white" color="white" />
                      <span>{item.duration}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="cdp-tab-content">
            <div className="cdp-team-grid">
              {MOCK_TEAM.map(member => (
                <div key={member.id} className="cdp-team-card" onClick={() => navigate(`/labour/${member.id}`)}>
                  <img src={member.img} alt={member.name} className="cdp-team-img" />
                  <div className="cdp-team-info">
                    <div className="cdp-team-top-row">
                      <h3>{member.name}</h3>
                      <span className="cdp-team-status-pill">Available</span>
                    </div>
                    <span className="cdp-team-role">{member.role}</span>
                    <div className="cdp-team-rating">
                      <Star size={12} fill="#f59e0b" color="#f59e0b" />
                      <span>{member.rating} ({member.reviews} Reviews)</span>
                    </div>
                    <span className="cdp-team-exp">{member.experience}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </DashboardLayout>
  );
};

export default ContractorDetailPage;
