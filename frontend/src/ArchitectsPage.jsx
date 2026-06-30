import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Search, MapPin, Star, Briefcase, Users, CheckCircle2,
  SlidersHorizontal, ChevronDown
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const ArchitectsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [architects, setArchitects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(location.state?.searchVal || '');
  const [locationFilter, setLocationFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [showRatingDrop, setShowRatingDrop] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/professionals/Architect')
      .then(r => r.json())
      .then((d) => {
        setArchitects(d.professionals || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const filtered = architects.filter(p => {
    const nm = (p.fullName || '').toLowerCase();
    const lc = (p.city || p.location || '').toLowerCase();
    const spec = (p.specialization || []).some(s => s.toLowerCase().includes(search.toLowerCase()));
    const firm = (p.firmName || '').toLowerCase().includes(search.toLowerCase());
    const desc = (p.shortDesc || '').toLowerCase().includes(search.toLowerCase());
    
    return (
      (!search || nm.includes(search.toLowerCase()) || spec || firm || lc.includes(search.toLowerCase()) || desc) &&
      (!locationFilter || lc.includes(locationFilter.toLowerCase())) &&
      (!ratingFilter || (p.rating || 4.5) >= parseFloat(ratingFilter))
    );
  });

  return (
    <DashboardLayout pageTitle="Find Architects" pageSubtitle="Hire verified architects & designers for your next project" accentColor="#10b981">
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
      <div className={`listing-status-banner ${architects.length > 0 ? 'green' : 'grey'}`}>
        {architects.length > 0
          ? <><CheckCircle2 size={14} /> {architects.length} registered architect{architects.length !== 1 ? 's' : ''} on platform</>
          : <><SlidersHorizontal size={14} /> No architects registered yet — register as Architect to appear here!</>}
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="listing-loader">Loading architects...</div>
      ) : (
        <div className="listing-cards-grid">
          {filtered.map(prof => {
            const initials = (prof.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
            const avatarBg = '#10b981';
            const specs = prof.specialization || [];
            const specsToUse = specs.length > 0 ? specs : ['Interior Design', 'Residential', 'Renovation'];
            return (
              <div key={prof._id} className="listing-pro-card green-card">
                <div className="lpc-top">
                  <div className="lpc-avatar" style={{ backgroundColor: avatarBg }}>{initials}</div>
                  <div className="lpc-title-block">
                    <div className="lpc-name">
                      Ar. {prof.fullName} <CheckCircle2 size={13} className="lpc-verified" style={{ color: '#10b981' }} />
                    </div>
                    <div className="lpc-firm">{prof.firmName || 'Freelance Architect'}</div>
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
                <p className="lpc-desc">{prof.shortDesc || `Expert in ${specsToUse.slice(0, 2).join(' & ').toLowerCase()} work.`}</p>
                {specsToUse.length > 0 && (
                  <div className="lpc-tags">
                    {specsToUse.slice(0, 3).map((s, i) => <span key={i} className="dl-tag green">{s}</span>)}
                  </div>
                )}
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
    </DashboardLayout>
  );
};

export default ArchitectsPage;
