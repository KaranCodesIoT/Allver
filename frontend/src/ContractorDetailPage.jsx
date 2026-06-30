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
  const [realWorkspaces, setRealWorkspaces] = useState([]);
  const [realTeam, setRealTeam] = useState([]);
  const [realReviews, setRealReviews] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(`https://allver.onrender.com/api/professional/${id}`).then(res => res.json()),
      fetch(`https://allver.onrender.com/api/project-workspaces/user/${id}`).then(res => res.json()),
      fetch(`https://allver.onrender.com/api/professional/${id}/team`).then(res => res.json()),
      fetch(`https://allver.onrender.com/api/user/reviews/${id}`).then(res => res.json())
    ])
      .then(([profData, wsData, teamData, revData]) => {
        if (profData.professional) {
          setContractorData(profData.professional);
        }
        if (wsData.workspaces) {
          setRealWorkspaces(wsData.workspaces);
        }
        if (teamData.team) {
          setRealTeam(teamData.team);
        }
        if (revData.reviews) {
          setRealReviews(revData.reviews);
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
              {realWorkspaces.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.9rem' }}>
                  No performed projects yet.
                </div>
              ) : (
                realWorkspaces.map((ws, idx) => {
                  const isCompleted = ws.status === 'Completed';
                  const isCancelled = ws.status === 'Cancelled';
                  const progressVal = isCompleted ? 100 : isCancelled ? 0 : 60;
                  const statusClass = isCompleted ? 'completed' : isCancelled ? 'cancelled' : 'ongoing';
                  const statusText = isCompleted ? 'Completed' : isCancelled ? 'Cancelled' : 'Ongoing';
                  const image = ws.projectType === 'Interior' 
                    ? 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80' 
                    : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80';
                  
                  return (
                    <div 
                      key={ws._id || idx} 
                      className="cp-project-card" 
                      style={{ cursor: 'pointer' }} 
                      onClick={() => navigate('/', { state: { activeTab: 'workspaces', selectedWorkspace: ws._id } })}
                    >
                      <img src={image} alt="Project" />
                      <div className="cp-project-info">
                        <div>
                          <div className="cp-project-title">{ws.title}</div>
                          <div className="cp-project-loc">{ws.client?.city || ws.client?.location || 'Thane'}</div>
                          <div className={`cp-project-status ${statusClass}`}><div className="dot"></div> {statusText}</div>
                        </div>
                        <div className="cp-progress-bar-container">
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Progress</span>
                          <div className="cp-progress-bar">
                            <div className="cp-progress-fill" style={{ width: `${progressVal}%`, background: isCompleted ? '#22c55e' : isCancelled ? '#ef4444' : '#3b82f6' }}></div>
                          </div>
                          <span className="cp-progress-text">{progressVal}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div>
              {!c.portfolioImages || c.portfolioImages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.9rem' }}>
                  No media uploaded yet.
                </div>
              ) : (
                <div className="cp-media-grid">
                  {c.portfolioImages.map((img, idx) => (
                    <div key={idx} className="cp-media-item">
                      <img src={img} alt="media" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <div>
              {realTeam.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b', fontSize: '0.9rem' }}>
                  No team members available.
                </div>
              ) : (
                realTeam.map((member, idx) => {
                  const memberName = member.fullName || member.name;
                  const memberRole = member.skillType || member.role || 'Team Member';
                  const memberAvatar = member.avatarUrl || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80';
                  return (
                    <div key={member._id || idx} className="cp-team-card">
                      <img src={memberAvatar} alt={memberName} className="cp-team-avatar" />
                      <div className="cp-team-info">
                        <div className="cp-team-name">{memberName}</div>
                        <div className="cp-team-role">{memberRole}</div>
                        <div className="cp-team-exp">{member.experience || 'No'} Experience</div>
                      </div>
                      <div className="cp-team-badge" style={{ marginRight: '10px' }}>{member.availability || 'Available'}</div>
                      <button 
                        className="cp-follow-btn" 
                        style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'white', color: '#0f172a', border: '1px solid #e2e8f0' }}
                        onClick={() => navigate(`/labour/manage/team-member`)}
                      >
                        Project Dashboard
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
};

export default ContractorDetailPage;
