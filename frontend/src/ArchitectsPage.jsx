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
    // Fetch and seed if needed
    fetch('https://allver.onrender.com/api/professionals/Architect')
      .then(r => r.json())
      .then(async (d) => {
        let list = d.professionals || [];
        // Seed if there are fewer than 4 architects
        if (list.length < 4) {
          console.log('Seeding designers...');
          const seedData = [
            {
              fullName: 'Neha Sharma',
              email: 'neha.sharma@example.com',
              phoneNumber: '9876543212',
              password: 'password123',
              role: 'Architect',
              city: 'Mumbai, Maharashtra',
              experience: '5+ Years',
              shortDesc: 'Specializes in modern, minimal and luxury interior design.',
              rating: 4.8,
              reviews: 124,
              projects: 128,
              avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
            },
            {
              fullName: 'Rohit Mehta',
              email: 'rohit.mehta@example.com',
              phoneNumber: '9876543213',
              password: 'password123',
              role: 'Architect',
              city: 'Pune, Maharashtra',
              experience: '7+ Years',
              shortDesc: 'Expert in space planning, modular kitchen and smart homes.',
              rating: 4.7,
              reviews: 98,
              projects: 96,
              avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
            },
            {
              fullName: 'Priya Nair',
              email: 'priya.nair@example.com',
              phoneNumber: '9876543214',
              password: 'password123',
              role: 'Architect',
              city: 'Bengaluru, Karnataka',
              experience: '6+ Years',
              shortDesc: 'Specializes in contemporary and luxury apartment interiors.',
              rating: 4.9,
              reviews: 156,
              projects: 156,
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            },
            {
              fullName: 'Karan Patel',
              email: 'karan.patel@example.com',
              phoneNumber: '9876543215',
              password: 'password123',
              role: 'Architect',
              city: 'Hyderabad, Telangana',
              experience: '4+ Years',
              shortDesc: 'Modern, minimalist and cost-effective design solutions.',
              rating: 4.6,
              reviews: 72,
              projects: 72,
              avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
            }
          ];

          for (const item of seedData) {
            const exists = list.some(u => u.email === item.email);
            if (!exists) {
              const regRes = await fetch('https://allver.onrender.com/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
              if (regRes.ok) {
                const regData = await regRes.json();
                await fetch(`https://allver.onrender.com/api/user/profile/${regData.user._id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    rating: item.rating,
                    reviews: item.reviews,
                    projects: item.projects,
                    experience: item.experience,
                    shortDesc: item.shortDesc,
                    avatarUrl: item.avatarUrl,
                    firmName: item.fullName === 'Neha Sharma' ? 'Neha Sharma Designs' : 'Freelance Architect'
                  })
                });
              }
            }
          }

          const refetchRes = await fetch('https://allver.onrender.com/api/professionals/Architect');
          const refetchData = await refetchRes.json();
          setArchitects(refetchData.professionals || []);
        } else {
          setArchitects(list);
        }
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
