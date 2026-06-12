import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Star, ChevronDown, CheckCircle2,
  Briefcase, ArrowLeft, Building2, Users
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const ContractorsPage = () => {
  const navigate = useNavigate();
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [minRating, setMinRating] = useState('0');

  useEffect(() => {
    fetch('http://localhost:5000/api/professionals/Contractor')
      .then(res => res.json())
      .then(data => {
        setContractors(data.professionals || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching contractors:', err);
        setLoading(false);
      });
  }, []);

  const filteredContractors = contractors.filter(c => {
    const nameMatch = (c.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const locMatch = (c.city || c.location || '').toLowerCase().includes(locationQuery.toLowerCase());
    const ratingMatch = (c.rating || 0) >= Number(minRating);
    return nameMatch && locMatch && ratingMatch;
  });

  return (
    <DashboardLayout pageTitle="Contractors" pageSubtitle="Find the best contractors for your project" accentColor="#10b981">
      <div className="labour-list-page">
        {/* Mobile-like Header & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a' }}>
            <ArrowLeft size={24} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>Contractor</h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Find the best contractors for your project</p>
          </div>
          <div style={{ width: '24px' }}></div> {/* Spacer for centering */}
        </div>

        <div className="labour-search-container">
          <div className="labour-search-input">
            <Search className="icon" size={20} />
            <input 
              type="text" 
              placeholder="Enter contractor name" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="labour-search-input">
            <MapPin className="icon" size={20} />
            <input 
              type="text" 
              placeholder="Enter location" 
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
            />
          </div>

          <div className="labour-search-input" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <Star className="icon" size={20} />
              <select 
                value={minRating} 
                onChange={(e) => setMinRating(e.target.value)}
                style={{ appearance: 'none', cursor: 'pointer' }}
              >
                <option value="0">Select rating</option>
                <option value="4">4.0+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>
            <ChevronDown size={20} className="icon" />
          </div>
        </div>

        {/* Contractor List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading contractors...</div>
        ) : filteredContractors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No contractors found matching your criteria.</div>
        ) : (
          <div className="labour-list-cards">
            {filteredContractors.map(prof => {
              const avatarLetter = (prof.fullName || 'U')[0].toUpperCase();
              const cats = prof.workCategory || [];
              const desc = prof.shortDesc || `Building your dream with strength, precision and reliability. Specialists in ${cats.slice(0, 2).join(' and ').toLowerCase()}.`;
              
              return (
                <div key={prof._id} className="labour-list-card">
                  <div className="llc-left">
                    {prof.avatarUrl ? (
                      <img src={prof.avatarUrl} alt={prof.fullName} className="llc-avatar" />
                    ) : (
                      <div className="llc-avatar" style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
                        {avatarLetter}
                      </div>
                    )}
                  </div>
                  
                  <div className="llc-middle">
                    <div className="llc-name-row">
                      {prof.fullName} <CheckCircle2 size={16} color="#10b981" fill="#10b981" style={{ color: 'white' }} />
                    </div>
                    
                    <div className="llc-rating-row">
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <span style={{ color: '#0f172a', fontWeight: '800' }}>{prof.rating || 4.7}</span>
                      <span>({prof.reviews || Math.floor(Math.random() * 100 + 50)} Reviews)</span>
                    </div>

                    <div className="llc-meta" style={{ marginBottom: '0.5rem' }}>
                      <div className="llc-meta-item">
                        <MapPin size={14} /> {prof.city || prof.location || 'Mumbai, Maharashtra'}
                      </div>
                      <div className="llc-meta-item" style={{ gridColumn: '1 / -1' }}>
                        <Briefcase size={14} /> <span style={{ fontWeight: '600' }}>{prof.experience || '10+ Years'}</span> Experience
                      </div>
                    </div>

                    <p className="llc-desc">
                      {desc}
                    </p>

                    <div className="llc-stats">
                      <div className="llc-stat-item">
                        <Building2 size={14} /> {prof.projects || Math.floor(Math.random() * 100 + 50)} Projects
                      </div>
                      <div className="llc-stat-item">
                        <Users size={14} /> {prof.followers || Math.floor(Math.random() * 300 + 100)} Followers
                      </div>
                    </div>
                  </div>

                  <div className="llc-right">
                    <button className="llc-view-btn" onClick={() => navigate(`/contractor/${prof._id}`)}>
                      View Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ContractorsPage;
