import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, MapPin, Star, Briefcase, Users, CheckCircle2,
  SlidersHorizontal, ChevronDown, Phone, X
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';



const ProfileModal = ({ prof, onClose }) => {
  if (!prof) return null;
  const avatarBg = '#3b82f6';
  const initials = (prof.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const categories = prof.workCategory || [];

  return (
    <div className="dl-modal-overlay" onClick={onClose}>
      <div className="dl-modal-card" onClick={e => e.stopPropagation()}>
        <button className="dl-modal-close" onClick={onClose}><X size={20} /></button>
        <div className="dl-modal-header" style={{ background: `linear-gradient(135deg, ${avatarBg}18 0%, #eff6ff 100%)` }}>
          <div className="dl-modal-avatar" style={{ backgroundColor: avatarBg }}>{initials}</div>
          <div className="dl-modal-title-block">
            <h2>{prof.fullName} <CheckCircle2 size={16} style={{ color: '#3b82f6', marginLeft: 8, verticalAlign: 'middle' }} /></h2>
            <p className="dl-modal-firm">{prof.contractorType || 'General Contractor'}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>
              <MapPin size={13} /> {prof.city || 'India'}
            </div>
          </div>
        </div>
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
          <div className="dl-modal-row"><label>Contractor Type</label><span>{prof.contractorType || 'General Contractor'}</span></div>
          {prof.teamSize && <div className="dl-modal-row"><label>Team Size</label><span>{prof.teamSize}</span></div>}
          {categories.length > 0 && (
            <div className="dl-modal-row">
              <label>Work Categories</label>
              <div className="dl-tag-group">
                {categories.map((c, i) => <span key={i} className="dl-tag blue">{c}</span>)}
              </div>
            </div>
          )}
          {prof.serviceLocation?.length > 0 && (
            <div className="dl-modal-row">
              <label>Service Locations</label>
              <div className="dl-tag-group">
                {prof.serviceLocation.map((l, i) => <span key={i} className="dl-tag grey">{l}</span>)}
              </div>
            </div>
          )}
          <div className="dl-modal-actions">
            {prof.whatsappNumber && (
              <a href={`https://wa.me/${prof.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="dl-modal-btn wa">
                <Phone size={15} /> WhatsApp
              </a>
            )}
            <button className="dl-modal-btn blue" onClick={onClose}>Close Profile</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContractorsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(location.state?.searchVal || '');
  const [locationFilter, setLocationFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [showRatingDrop, setShowRatingDrop] = useState(false);
  const [selectedProf, setSelectedProf] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/professionals/Contractor')
      .then(r => r.json())
      .then(d => { setContractors(d.professionals || []); setLoading(false); })
      .catch(() => { setContractors([]); setLoading(false); });
  }, []);

  const displayList = contractors;

  const filtered = displayList.filter(p => {
    const nameMatch = (p.fullName || '').toLowerCase().includes(search.toLowerCase());
    const typeMatch = (p.contractorType || '').toLowerCase().includes(search.toLowerCase());
    const categoryMatch = (p.workCategory || []).some(cat => cat.toLowerCase().includes(search.toLowerCase()));
    
    return (
      (!search || nameMatch || typeMatch || categoryMatch) &&
      (!locationFilter || (p.city || '').toLowerCase().includes(locationFilter.toLowerCase())) &&
      (!ratingFilter || (p.rating || 4.5) >= parseFloat(ratingFilter))
    );
  });

  return (
    <DashboardLayout pageTitle="Find Contractors" pageSubtitle="Hire verified contractors for your construction project" accentColor="#3b82f6">
      {/* Filter Bar */}
      <div className="listing-filter-bar">
        <div className="listing-search-field">
          <Search size={16} />
          <input placeholder="Search by name or type..." value={search} onChange={e => setSearch(e.target.value)} />
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

      {/* Status banner */}
      <div className={`listing-status-banner ${contractors.length > 0 ? 'blue' : 'grey'}`}>
        {contractors.length > 0
          ? <><CheckCircle2 size={14} /> {contractors.length} registered contractor{contractors.length !== 1 ? 's' : ''} on platform</>
          : <><SlidersHorizontal size={14} /> No contractors registered yet — register as Contractor to appear here!</>}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="listing-loader">Loading contractors...</div>
      ) : (
        <div className="listing-cards-grid">
          {filtered.map(prof => {
            const initials = (prof.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const avatarBg = '#3b82f6';
            const cats = prof.workCategory || [];
            return (
              <div key={prof._id} className="listing-pro-card blue-card">
                <div className="lpc-top">
                  <div className="lpc-avatar" style={{ backgroundColor: avatarBg }}>{initials}</div>
                  <div className="lpc-title-block">
                    <div className="lpc-name">{prof.fullName} <CheckCircle2 size={13} className="lpc-verified" style={{ color: '#3b82f6' }} /></div>
                    <div className="lpc-firm">{prof.contractorType || 'General Contractor'}</div>
                    <div className="lpc-rating-row">
                      <Star size={12} fill="#f59e0b" color="#f59e0b" />
                      <span className="lpc-rating">{prof.rating || 4.5}</span>
                      <span className="lpc-reviews">({prof.reviews || 50} reviews)</span>
                    </div>
                  </div>
                </div>
                <div className="lpc-meta">
                  <span><MapPin size={12} /> {prof.city || 'India'}</span>
                  <span><Briefcase size={12} /> {prof.experience || '5+ Years'}</span>
                </div>
                <p className="lpc-desc">{prof.shortDesc || `Expert in ${cats.slice(0, 2).join(' & ').toLowerCase()} work.`}</p>
                {cats.length > 0 && (
                  <div className="lpc-tags">
                    {cats.slice(0, 3).map((c, i) => <span key={i} className="dl-tag blue">{c}</span>)}
                  </div>
                )}
                <div className="lpc-stats">
                  <span><Briefcase size={11} /> {prof.projects || '—'} Projects</span>
                  <span><Users size={11} /> {prof.followers || '—'} Followers</span>
                </div>
                <button className="lpc-view-btn blue" onClick={() => navigate(`/contractor/${prof._id}`)}>View Profile</button>
              </div>
            );
          })}
          {filtered.length === 0 && <p className="listing-empty">No contractors match your filters.</p>}
        </div>
      )}

      {selectedProf && <ProfileModal prof={selectedProf} onClose={() => setSelectedProf(null)} />}
    </DashboardLayout>
  );
};

export default ContractorsPage;
