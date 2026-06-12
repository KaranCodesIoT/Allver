import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, MoreVertical, CheckCircle2, Star, MapPin, 
  Users, Grid, PlaySquare, Users as TeamIcon, FileBadge
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const ContractorDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('projects');
  const [isFollowing, setIsFollowing] = useState(false);
  const [contractorData, setContractorData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://allver.onrender.com/api/professional/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.professional) {
          setContractorData(data.professional);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <DashboardLayout pageTitle="Profile"><div style={{ textAlign: 'center', padding: '3rem' }}>Loading profile...</div></DashboardLayout>;
  }

  if (!contractorData) {
    return <DashboardLayout pageTitle="Profile"><div style={{ textAlign: 'center', padding: '3rem' }}>Profile not found</div></DashboardLayout>;
  }

  const c = contractorData;
  const avatarLetter = (c.fullName || 'C')[0].toUpperCase();
  const cats = c.workCategory || ['RCC Work', 'Brickwork', 'Plumbing', 'Electrical', 'Painting', 'Tile Work', 'False Ceiling', 'Carpentry'];
  const followersCount = isFollowing ? (c.followers || 256) + 1 : (c.followers || 256);

  // Fallback images
  const coverImg = c.cover || 'https://images.unsplash.com/photo-1541888087405-eb317f223f66?auto=format&fit=crop&w=800&q=80';
  const recentProjImgs = [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=300&q=80',
    'https://images.unsplash.com/photo-1600566753086-00f18efc2291?auto=format&fit=crop&w=300&q=80'
  ];

  return (
    <DashboardLayout pageTitle="Contractor Profile" accentColor="#10b981">
      <div className="cp-page-container">
        
        {/* Top Nav (Floating over cover) */}
        <div className="cp-top-nav">
          <button onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <button><MoreVertical size={20} /></button>
        </div>

        {/* Cover Image */}
        <img src={coverImg} alt="Cover" className="cp-cover" />

        {/* Header Content */}
        <div className="cp-header-content">
          <div className="cp-header-top-row">
            {c.avatarUrl ? (
              <img src={c.avatarUrl} alt="Avatar" className="cp-avatar" />
            ) : (
              <div className="cp-avatar">{avatarLetter}</div>
            )}
            
            <div className="cp-follow-card">
              <button 
                className="cp-follow-btn" 
                style={isFollowing ? { background: 'white', color: '#0f172a', border: '1px solid #0f172a' } : {}}
                onClick={() => setIsFollowing(!isFollowing)}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              <div className="cp-followers-count">
                <span>{followersCount}</span>
                Followers
              </div>
            </div>
          </div>

          <div className="cp-name-row">
            {c.fullName} <CheckCircle2 size={18} color="#10b981" fill="#10b981" style={{ color: 'white' }} />
          </div>
          <div className="cp-subtitle">
            {c.contractorType || 'Residential Contractor'} | {c.city || 'Navi Mumbai'}
          </div>

          <div className="cp-stats-row">
            <div className="cp-stat-item">
              <Star size={16} />
              <div>
                <strong>{c.experience || '5 Years'}</strong>
                Experience
              </div>
            </div>
            <div className="cp-stat-item">
              <Users size={16} />
              <div>
                <strong>{c.teamSize || '25 Workers'}</strong>
                Available
              </div>
            </div>
            <div className="cp-stat-item">
              <MapPin size={16} />
              <div>
                <strong>Service Areas</strong>
                {c.serviceLocation?.join(', ') || 'Mumbai, Navi Mumbai'}
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="cp-section">
          <div className="cp-section-header">
            <h3>About</h3>
          </div>
          <p className="cp-about-text">
            {c.about || 'We are a trusted team of construction professionals specializing in residential projects. From planning to completion, we ensure quality, on-time delivery and customer satisfaction.'}
            <span className="cp-view-all" style={{ marginLeft: '5px' }}>Read More</span>
          </p>
        </div>

        {/* Skills Section */}
        <div className="cp-section">
          <div className="cp-section-header">
            <h3>Skills & Expertise</h3>
            <span className="cp-view-all">View All</span>
          </div>
          <div className="cp-skills-grid">
            {cats.map((skill, idx) => (
              <div key={idx} className="cp-skill-pill">{skill}</div>
            ))}
          </div>
        </div>

        {/* Recent Projects Preview */}
        <div className="cp-section" style={{ borderBottom: 'none' }}>
          <div className="cp-section-header">
            <h3>Recent Projects</h3>
            <span className="cp-view-all" onClick={() => setActiveTab('projects')}>View All</span>
          </div>
          <div className="cp-recent-grid">
            {recentProjImgs.map((img, idx) => (
              <img key={idx} src={img} alt="Project" />
            ))}
          </div>
        </div>

        {/* Sticky Tab Bar */}
        <div className="cp-tab-bar">
          <button className={`cp-tab ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => setActiveTab('projects')}>
            <Grid size={22} />
          </button>
          <button className={`cp-tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>
            <PlaySquare size={22} />
          </button>
          <button className={`cp-tab ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
            <TeamIcon size={22} />
          </button>
          <button className="cp-tab" onClick={() => alert('Documents coming soon')}>
            <FileBadge size={22} />
          </button>
        </div>

        {/* Tab Contents */}
        <div className="cp-tab-content">
          
          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div>
              <div className="cp-project-card">
                <img src={recentProjImgs[0]} alt="Project" />
                <div className="cp-project-info">
                  <div>
                    <div className="cp-project-title">2BHK Residential Construction</div>
                    <div className="cp-project-loc">Navi Mumbai</div>
                    <div className="cp-project-status ongoing"><div className="dot"></div> Ongoing</div>
                  </div>
                  <div className="cp-progress-bar-container">
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Progress</span>
                    <div className="cp-progress-bar">
                      <div className="cp-progress-fill" style={{ width: '60%' }}></div>
                    </div>
                    <span className="cp-progress-text">60%</span>
                  </div>
                </div>
              </div>

              <div className="cp-project-card">
                <img src={recentProjImgs[1]} alt="Project" />
                <div className="cp-project-info">
                  <div>
                    <div className="cp-project-title">3BHK Villa Project</div>
                    <div className="cp-project-loc">Panvel, Navi Mumbai</div>
                    <div className="cp-project-status completed"><div className="dot"></div> Completed</div>
                  </div>
                  <div className="cp-progress-bar-container">
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Progress</span>
                    <div className="cp-progress-bar">
                      <div className="cp-progress-fill" style={{ width: '100%', background: '#3b82f6' }}></div>
                    </div>
                    <span className="cp-progress-text">100%</span>
                  </div>
                </div>
              </div>

              <div className="cp-project-card">
                <img src={recentProjImgs[2]} alt="Project" />
                <div className="cp-project-info">
                  <div>
                    <div className="cp-project-title">Interior Work</div>
                    <div className="cp-project-loc">Kharghar, Navi Mumbai</div>
                    <div className="cp-project-status ongoing"><div className="dot"></div> Ongoing</div>
                  </div>
                  <div className="cp-progress-bar-container">
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Progress</span>
                    <div className="cp-progress-bar">
                      <div className="cp-progress-fill" style={{ width: '40%' }}></div>
                    </div>
                    <span className="cp-progress-text">40%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div>
              <div className="cp-media-filters">
                <button className="cp-media-filter active">All</button>
                <button className="cp-media-filter">Photos</button>
                <button className="cp-media-filter">Videos</button>
              </div>
              <div className="cp-media-grid">
                <div className="cp-media-item"><img src={recentProjImgs[0]} alt="media" /></div>
                <div className="cp-media-item">
                  <img src={recentProjImgs[1]} alt="media" />
                  <div className="cp-media-duration">0:30</div>
                </div>
                <div className="cp-media-item"><img src={recentProjImgs[2]} alt="media" /></div>
                <div className="cp-media-item"><img src={recentProjImgs[3]} alt="media" /></div>
                <div className="cp-media-item">
                  <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=300&q=80" alt="media" />
                  <div className="cp-media-duration">0:45</div>
                </div>
                <div className="cp-media-item"><img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80" alt="media" /></div>
              </div>
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div>
              {[
                { name: 'Ramesh Yadav', role: 'Site Supervisor', exp: '8 Years Experience', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80' },
                { name: 'Suresh Patil', role: 'Mason', exp: '10 Years Experience', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
                { name: 'Ravi Singh', role: 'Carpenter', exp: '7 Years Experience', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80' },
                { name: 'Imran Shaikh', role: 'Electrician', exp: '6 Years Experience', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80' },
              ].map((member, idx) => (
                <div key={idx} className="cp-team-card">
                  <img src={member.img} alt={member.name} className="cp-team-avatar" />
                  <div className="cp-team-info">
                    <div className="cp-team-name">{member.name}</div>
                    <div className="cp-team-role">{member.role}</div>
                    <div className="cp-team-exp">{member.exp}</div>
                  </div>
                  <div className="cp-team-badge" style={{ marginRight: '10px' }}>Available</div>
                  <button 
                    className="cp-follow-btn" 
                    style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'white', color: '#0f172a', border: '1px solid #e2e8f0' }}
                    onClick={() => navigate(`/labour/manage/team-member`)}
                  >
                    Project Dashboard
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContractorDetailPage;
