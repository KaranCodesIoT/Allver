import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Star, Briefcase, Users, CheckCircle2,
  SlidersHorizontal, ChevronDown, Phone, X, Filter
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';



// Profile Detail Modal
const ProfileModal = ({ prof, onClose }) => {
  if (!prof) return null;
  const avatarBg = '#10b981';
  const initials = (prof.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const specialization = prof.specialization || [];

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal-card" onClick={e => e.stopPropagation()}>
        <button className="dl-modal-close" onClick={onClose}><X size={20} /></button>

        {/* Modal Header */}
        <div className="dl-modal-header" style={{ background: `linear-gradient(135deg, ${avatarBg}18 0%, #f0fdf4 100%)` }}>
          <div className="dl-modal-avatar" style={{ backgroundColor: avatarBg }}>{initials}</div>
          <div className="dl-modal-title-block">
            <h2>Ar. {prof.fullName}
              <CheckCircle2 size={16} style={{ color: '#10b981', marginLeft: 8, verticalAlign: 'middle' }} />
            </h2>
            <p className="dl-modal-firm">{prof.firmName || 'Freelance Architect'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>
              <MapPin size={13} /> {prof.city || 'India'}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="dl-modal-stats-row">
          <div className="dl-stat-box"><strong>{prof.projects || '—'}</strong><span>Projects</span></div>
          <div className="dl-stat-box"><strong>{prof.reviews || '—'}</strong><span>Reviews</span></div>
          <div className="dl-stat-box" style={{ color: '#f59e0b' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={14} fill="#f59e0b" /> {prof.rating || '4.5'}
            </strong>
            <span>Rating</span>
          </div>
          <div className="dl-stat-box"><strong>{prof.followers || '—'}</strong><span>Followers</span></div>
        </div>

        <div className="dl-modal-body">
          <div className="dl-modal-row"><label>Experience</label><span>{prof.experience || 'Not specified'}</span></div>
          {specialization.length > 0 && (
            <div className="dl-modal-row">
              <label>Specialization</label>
              <div className="dl-tag-group">
                {specialization.map((s, i) => <span key={i} className="dl-tag green">{s}</span>)}
              </div>
            </div>
          )}
          {prof.serviceArea?.length > 0 && (
            <div className="dl-modal-row">
              <label>Service Areas</label>
              <div className="dl-tag-group">
                {prof.serviceArea.map((a, i) => <span key={i} className="dl-tag grey">{a}</span>)}
              </div>
            </div>
          )}
          {prof.portfolioImages?.length > 0 && (
            <div className="dl-modal-row">
              <label>Portfolio</label>
              <div className="dl-portfolio-grid">
                {prof.portfolioImages.slice(0, 4).map((img, i) => (
                  <img key={i} src={img} alt={`portfolio-${i}`} className="dl-portfolio-thumb" />
                ))}
              </div>
            </div>
          )}
          <div className="dl-modal-actions">
            {prof.whatsappNumber && (
              <a href={`https://wa.me/${prof.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="dl-modal-btn wa">
                <Phone size={15} /> WhatsApp
              </a>
            )}
            <button className="dl-modal-btn green" onClick={onClose}>Close Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ArchitectsPage = () => {
  const navigate = useNavigate();
  const [architects, setArchitects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [showRatingDrop, setShowRatingDrop] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/professionals/Architect')
      .then(r => r.json())
      .then(d => { setArchitects(d.professionals || []); setLoading(false); })
      .catch(() => { setArchitects([]); setLoading(false); });
  }, []);

  const displayList = architects;

  const filtered = displayList.filter(p => {
    const nm = (p.fullName || '').toLowerCase();
    const lc = (p.city || p.location || '').toLowerCase();
    return (
      (!search || nm.includes(search.toLowerCase())) &&
      (!locationFilter || lc.includes(locationFilter.toLowerCase())) &&
      (!ratingFilter || (p.rating || 4.5) >= parseFloat(ratingFilter))
    );
  });

  return (
    <DashboardLayout pageTitle="Find Architects" pageSubtitle="Browse verified architects for your project" accentColor="#10b981">
      {/* ── Search + Filter Bar ── */}
      <div className="listing-filter-bar">
        <div className="listing-search-field">
          <Search size={16} />
          <input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="listing-search-field">
          <MapPin size={16} />
          <input placeholder="Filter by location..." value={locationFilter} onChange={e => setLocationFilter(e.target.value)} />
        </div>
        <div className="listing-rating-selector" onClick={() => setShowRatingDrop(!showRatingDrop)}>
          <Star size={15} />
          <span>{ratingFilter ? `${ratingFilter}+ Stars` : 'Min Rating'}</span>
          <ChevronDown size={15} />
          {showRatingDrop && (
            <div className="listing-rating-menu">
              {['', '3', '3.5', '4', '4.5'].map(r => (
                <div key={r} className="listing-rating-opt" onClick={() => { setRatingFilter(r); setShowRatingDrop(false); }}>
                  {r ? `${r}+ Stars` : 'All Ratings'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Status banner ── */}
      <div className={`listing-status-banner ${architects.length > 0 ? 'green' : 'grey'}`}>
        {architects.length > 0
          ? <><CheckCircle2 size={14} /> {architects.length} registered architect{architects.length !== 1 ? 's' : ''} on platform</>
          : <><SlidersHorizontal size={14} /> No architects registered yet — register as Architect to appear here!</>}
      </div>

      {/* ── Cards Grid ── */}
      {loading ? (
        <div className="listing-loader">Loading architects...</div>
      ) : (
        <div className="listing-cards-grid">
          {filtered.map(prof => {
            const initials = (prof.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const avatarBg = '#10b981';
            const specs = prof.specialization || [];
            return (
              <div key={prof._id} className="listing-pro-card green-card">
                {/* Card Top */}
                <div className="lpc-top">
                  <div className="lpc-avatar" style={{ backgroundColor: avatarBg }}>{initials}</div>
                  <div className="lpc-title-block">
                    <div className="lpc-name">Ar. {prof.fullName} <CheckCircle2 size={13} className="lpc-verified" /></div>
                    <div className="lpc-firm">{prof.firmName || 'Freelance'}</div>
                    <div className="lpc-rating-row">
                      <Star size={12} fill="#f59e0b" color="#f59e0b" />
                      <span className="lpc-rating">{prof.rating || 4.5}</span>
                      <span className="lpc-reviews">({prof.reviews || 50} reviews)</span>
                    </div>
                  </div>
                </div>

                {/* Meta info */}
                <div className="lpc-meta">
                  <span><MapPin size={12} /> {prof.city || 'India'}</span>
                  <span><Briefcase size={12} /> {prof.experience || '5+ Years'}</span>
                </div>

                <p className="lpc-desc">{prof.shortDesc || `Expert in ${specs.slice(0, 2).join(', ').toLowerCase()} architecture.`}</p>

                {/* Tags */}
                {specs.length > 0 && (
                  <div className="lpc-tags">
                    {specs.slice(0, 3).map((s, i) => <span key={i} className="dl-tag green">{s}</span>)}
                  </div>
                )}

                {/* Stats row */}
                <div className="lpc-stats">
                  <span><Briefcase size={11} /> {prof.projects || '—'} Projects</span>
                  <span><Users size={11} /> {prof.followers || '—'} Followers</span>
                </div>

                <button className="lpc-view-btn green" onClick={() => navigate(`/architect/${prof._id}`)}>View Profile</button>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="listing-empty">No architects match your filters.</p>}
        </div>
      )}

      {selectedProf && <ProfileModal prof={selectedProf} onClose={() => setSelectedProf(null)} />}
    </DashboardLayout>
  );
};

export default ArchitectsPage;
