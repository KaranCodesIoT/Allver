import React, { useState, useEffect } from 'react';
import {
  Search, MapPin, Star, Briefcase, Users, CheckCircle2,
  SlidersHorizontal, ChevronDown, X, Hammer
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const SKILL_COLORS = {
  Mason: '#f59e0b', Carpenter: '#8b5cf6', Electrician: '#3b82f6',
  Plumber: '#10b981', Painter: '#ef4444', Helper: '#6366f1', Other: '#64748b'
};

const MOCK_LABOUR = [
  {
    _id: 'mock-l1', fullName: 'Ramesh Yadav', city: 'Mumbai, Maharashtra',
    experience: '12+ Years', skillType: 'Mason', availability: 'Available',
    workTags: ['Brick Work', 'Concrete', 'Plaster', 'Tile Work'],
    rating: 4.8, reviews: 124, isMock: true, avatar: 'RY', avatarColor: '#f59e0b',
    shortDesc: 'Expert mason with 12+ years in brick work, concrete and plastering.'
  },
  {
    _id: 'mock-l2', fullName: 'Suresh Kumar', city: 'Pune, Maharashtra',
    experience: '10+ Years', skillType: 'Carpenter', availability: 'Available',
    workTags: ['Wood Work', 'Furniture', 'Door Fitting', 'False Ceiling'],
    rating: 4.7, reviews: 98, isMock: true, avatar: 'SK', avatarColor: '#8b5cf6',
    shortDesc: 'Skilled carpenter specializing in furniture, door fitting and false ceilings.'
  },
  {
    _id: 'mock-l3', fullName: 'Imran Shaikh', city: 'Navi Mumbai, Maharashtra',
    experience: '8+ Years', skillType: 'Electrician', availability: 'Available',
    workTags: ['Wiring', 'Switch Board', 'Light Fitting', 'Electrical Repair'],
    rating: 4.6, reviews: 76, isMock: true, avatar: 'IS', avatarColor: '#3b82f6',
    shortDesc: 'Certified electrician for wiring, switch board and light fitting work.'
  },
  {
    _id: 'mock-l4', fullName: 'Ravi Verma', city: 'Thane, Maharashtra',
    experience: '7+ Years', skillType: 'Plumber', availability: 'Available',
    workTags: ['Pipe Fitting', 'Bathroom Fitting', 'Water Supply', 'Sanitary Work'],
    rating: 4.5, reviews: 64, isMock: true, avatar: 'RV', avatarColor: '#10b981',
    shortDesc: 'Expert plumber for pipe fitting, bathroom and sanitary installations.'
  },
  {
    _id: 'mock-l5', fullName: 'Arun Patil', city: 'Nagpur, Maharashtra',
    experience: '6+ Years', skillType: 'Painter', availability: 'Available',
    workTags: ['Interior Painting', 'Exterior Painting', 'Texture', 'Polish'],
    rating: 4.6, reviews: 55, isMock: true, avatar: 'AP', avatarColor: '#ef4444',
    shortDesc: 'Professional painter for interior, exterior, texture and polish work.'
  },
  {
    _id: 'mock-l6', fullName: 'Dev Sharma', city: 'Kolhapur, Maharashtra',
    experience: '5+ Years', skillType: 'Helper', availability: 'Not Available',
    workTags: ['General Help', 'Lifting', 'Site Cleaning', 'Material Handling'],
    rating: 4.3, reviews: 40, isMock: true, avatar: 'DS', avatarColor: '#6366f1',
    shortDesc: 'General site helper with experience in material handling and site maintenance.'
  }
];

const ProfileModal = ({ prof, onClose }) => {
  if (!prof) return null;
  const skillColor = SKILL_COLORS[prof.skillType] || '#f59e0b';
  const avatarBg = prof.isMock ? prof.avatarColor : skillColor;
  const initials = prof.isMock ? prof.avatar
    : (prof.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const tags = prof.isMock ? prof.workTags : [];
  const isAvailable = prof.availability === 'Available';

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal-card" onClick={e => e.stopPropagation()}>
        <button className="dl-modal-close" onClick={onClose}><X size={20} /></button>
        <div className="dl-modal-header" style={{ background: `linear-gradient(135deg, ${avatarBg}18 0%, #fffbeb 100%)` }}>
          <div className="dl-modal-avatar" style={{ backgroundColor: avatarBg }}>{initials}</div>
          <div className="dl-modal-title-block">
            <h2>{prof.fullName} <CheckCircle2 size={16} style={{ color: '#10b981', marginLeft: 8, verticalAlign: 'middle' }} /></h2>
            <p className="dl-modal-firm" style={{ color: skillColor, fontWeight: 700 }}>{prof.skillType || 'Skilled Worker'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>
              <MapPin size={13} /> {prof.city || prof.location || 'India'}
            </div>
          </div>
        </div>
        <div className="dl-modal-stats-row">
          <div className="dl-stat-box"><strong>{prof.reviews || '—'}</strong><span>Reviews</span></div>
          <div className="dl-stat-box" style={{ color: '#f59e0b' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={14} fill="#f59e0b" /> {prof.rating || '4.5'}
            </strong>
            <span>Rating</span>
          </div>
          <div className="dl-stat-box">
            <strong style={{ color: isAvailable ? '#10b981' : '#ef4444' }}>
              {isAvailable ? '● Active' : '● Busy'}
            </strong>
            <span>Status</span>
          </div>
        </div>
        <div className="dl-modal-body">
          <div className="dl-modal-row"><label>Experience</label><span>{prof.experience || 'Not specified'}</span></div>
          <div className="dl-modal-row">
            <label>Availability</label>
            <span className="dl-avail-badge" style={{
              color: isAvailable ? '#166534' : '#991b1b',
              backgroundColor: isAvailable ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${isAvailable ? '#bbf7d0' : '#fca5a5'}`
            }}>
              <span className="dl-avail-dot" style={{ backgroundColor: isAvailable ? '#10b981' : '#ef4444' }}></span>
              {isAvailable ? 'Available for Work' : 'Not Available Currently'}
            </span>
          </div>
          {tags.length > 0 && (
            <div className="dl-modal-row">
              <label>Skills & Work</label>
              <div className="dl-tag-group">
                {tags.map((t, i) => <span key={i} className="dl-tag orange">{t}</span>)}
              </div>
            </div>
          )}
          <div className="dl-modal-actions">
            <button className="dl-modal-btn orange" onClick={onClose}>Close Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LabourPage = () => {
  const [labourList, setLabourList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [showSkillDrop, setShowSkillDrop] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);

  const skillOptions = ['Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter', 'Helper', 'Other'];

  useEffect(() => {
    fetch('http://localhost:5000/api/professionals/Labour')
      .then(r => r.json())
      .then(d => { setLabourList(d.professionals || []); setLoading(false); })
      .catch(() => { setLabourList([]); setLoading(false); });
  }, []);

  const displayList = labourList.length > 0 ? labourList : MOCK_LABOUR;

  const filtered = displayList.filter(p =>
    (!search || (p.fullName || '').toLowerCase().includes(search.toLowerCase())) &&
    (!locationFilter || (p.city || p.location || '').toLowerCase().includes(locationFilter.toLowerCase())) &&
    (!skillFilter || (p.skillType || '') === skillFilter)
  );

  return (
    <DashboardLayout pageTitle="Find Skilled Labour" pageSubtitle="Connect with verified workers for your project" accentColor="#f59e0b">
      {/* Filter Bar */}
      <div className="listing-filter-bar">
        <div className="listing-search-field">
          <Search size={16} />
          <input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="listing-search-field">
          <MapPin size={16} />
          <input placeholder="Filter by location..." value={locationFilter} onChange={e => setLocationFilter(e.target.value)} />
        </div>
        <div className="listing-rating-selector" onClick={() => setShowSkillDrop(!showSkillDrop)}>
          <Hammer size={15} />
          <span>{skillFilter || 'Skill Type'}</span>
          <ChevronDown size={15} />
          {showSkillDrop && (
            <div className="listing-rating-menu">
              <div className="listing-rating-opt" onClick={() => { setSkillFilter(''); setShowSkillDrop(false); }}>All Skills</div>
              {skillOptions.map(s => (
                <div key={s} className="listing-rating-opt" style={{ color: SKILL_COLORS[s] }}
                  onClick={() => { setSkillFilter(s); setShowSkillDrop(false); }}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status banner */}
      <div className={`listing-status-banner ${labourList.length > 0 ? 'orange' : 'grey'}`}>
        {labourList.length > 0
          ? <><CheckCircle2 size={14} /> {labourList.length} registered worker{labourList.length !== 1 ? 's' : ''} on platform</>
          : <><SlidersHorizontal size={14} /> Showing sample workers — register as Labour to appear here!</>}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="listing-loader">Loading workers...</div>
      ) : (
        <div className="listing-cards-grid">
          {filtered.map(prof => {
            const skillColor = SKILL_COLORS[prof.skillType] || '#f59e0b';
            const avatarBg = prof.isMock ? prof.avatarColor : skillColor;
            const initials = prof.isMock ? prof.avatar
              : (prof.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const tags = prof.isMock ? prof.workTags : [];
            const isAvailable = prof.availability === 'Available';

            return (
              <div key={prof._id} className="listing-pro-card orange-card">
                <div className="lpc-top">
                  <div className="lpc-avatar" style={{ backgroundColor: avatarBg }}>{initials}</div>
                  <div className="lpc-title-block">
                    <div className="lpc-name">{prof.fullName} <CheckCircle2 size={13} className="lpc-verified" style={{ color: '#10b981' }} /></div>
                    <div className="lpc-skill-badge" style={{ color: skillColor, backgroundColor: `${skillColor}18`, borderColor: `${skillColor}44` }}>
                      <Hammer size={11} /> {prof.skillType || 'Worker'}
                    </div>
                    <div className="lpc-rating-row">
                      <Star size={12} fill="#f59e0b" color="#f59e0b" />
                      <span className="lpc-rating">{prof.rating || 4.5}</span>
                      <span className="lpc-reviews">({prof.reviews || 40} reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="lpc-meta">
                  <span><MapPin size={12} /> {prof.city || prof.location || 'India'}</span>
                  <span><Briefcase size={12} /> {prof.experience || '5+ Years'}</span>
                </div>
                <p className="lpc-desc">{prof.shortDesc || `Skilled ${prof.skillType || 'worker'} available for projects.`}</p>

                <div className="lpc-avail-row">
                  <span className="lpc-avail-dot" style={{ backgroundColor: isAvailable ? '#10b981' : '#ef4444' }}></span>
                  <span style={{ color: isAvailable ? '#166534' : '#991b1b', fontSize: '0.78rem', fontWeight: 700 }}>
                    {isAvailable ? 'Available' : 'Not Available'}
                  </span>
                </div>

                {tags.length > 0 && (
                  <div className="lpc-tags">
                    {tags.slice(0, 3).map((t, i) => <span key={i} className="dl-tag orange">{t}</span>)}
                  </div>
                )}
                <button className="lpc-view-btn orange" onClick={() => setSelectedProf(prof)}>View Profile</button>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="listing-empty">No workers match your filters.</p>}
        </div>
      )}

      {selectedProf && <ProfileModal prof={selectedProf} onClose={() => setSelectedProf(null)} />}
    </DashboardLayout>
  );
};

export default LabourPage;
