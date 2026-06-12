import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Star, ChevronDown, CheckCircle2,
  Briefcase, ArrowLeft
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const SKILL_COLORS = {
  Mason: '#f59e0b', Carpenter: '#8b5cf6', Electrician: '#3b82f6',
  Plumber: '#10b981', Painter: '#ef4444', Helper: '#6366f1', Other: '#64748b'
};

const getDummySkills = (skillType) => {
  if (skillType === 'Mason') return ['Brick Work', 'Concrete', 'Plaster', 'Tile Work'];
  if (skillType === 'Carpenter') return ['Wood Work', 'Furniture', 'Door Fitting', 'False Ceiling'];
  if (skillType === 'Electrician') return ['Wiring', 'Switch Board', 'Light Fitting', 'Electrical Repair'];
  if (skillType === 'Plumber') return ['Pipe Fitting', 'Bathroom Fitting', 'Water Supply', 'Sanitary Work'];
  return ['General Labour', 'Site Cleaning', 'Material Shifting'];
};

const LabourPage = () => {
  const navigate = useNavigate();
  const [labours, setLabours] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [minRating, setMinRating] = useState('0');

  useEffect(() => {
    fetch('http://localhost:5000/api/professionals/Labour')
      .then(res => res.json())
      .then(data => {
        setLabours(data.professionals || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching labours:', err);
        setLoading(false);
      });
  }, []);

  const filteredLabours = labours.filter(l => {
    const nameMatch = l.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    const locMatch = (l.city || l.location || '').toLowerCase().includes(locationQuery.toLowerCase());
    const ratingMatch = (l.rating || 0) >= Number(minRating);
    return nameMatch && locMatch && ratingMatch;
  });

  return (
    <DashboardLayout pageTitle="Labour" pageSubtitle="Find skilled labour for your project" accentColor="#10b981">
      <div style={{ padding: '1rem 2rem' }}>
        <div className="labour-search-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', marginBottom: '2rem' }}>
          <div className="labour-search-input" style={{ margin: 0 }}>
            <Search className="icon" size={20} />
            <input 
              type="text" 
              placeholder="Enter labour name" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="labour-search-input" style={{ margin: 0 }}>
            <MapPin className="icon" size={20} />
            <input 
              type="text" 
              placeholder="Enter location" 
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
            />
          </div>

          <div className="labour-search-input" style={{ margin: 0, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
              <Star className="icon" size={20} />
              <select 
                value={minRating} 
                onChange={(e) => setMinRating(e.target.value)}
                style={{ appearance: 'none', cursor: 'pointer', width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.95rem', color: '#0f172a' }}
              >
                <option value="0">Select rating (Any)</option>
                <option value="4">4.0+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>
            <ChevronDown size={20} color="#94a3b8" />
          </div>
        </div>

        {/* Labour List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading skilled workers...</div>
        ) : filteredLabours.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No workers found matching your criteria.</div>
        ) : (
          <div className="labour-list-cards">
            {filteredLabours.map(prof => {
              const skills = getDummySkills(prof.skillType);
              const avatarLetter = (prof.fullName || 'U')[0].toUpperCase();
              
              return (
                <div key={prof._id} className="labour-list-card">
                  <div className="llc-left">
                    {prof.avatarUrl ? (
                      <img src={prof.avatarUrl} alt={prof.fullName} className="llc-avatar" />
                    ) : (
                      <div className="llc-avatar" style={{ background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'white' }}>
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
                      <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{prof.rating || 4.8}</span>
                      <span>({prof.reviews || Math.floor(Math.random() * 100 + 20)} Reviews)</span>
                    </div>

                    <div className="llc-meta">
                      <div className="llc-meta-item">
                        <Briefcase size={14} /> {prof.skillType || 'Mason'}
                      </div>
                      <div className="llc-meta-item">
                        <MapPin size={14} /> {prof.city || prof.location || 'Mumbai, Maharashtra'}
                      </div>
                      <div className="llc-meta-item" style={{ gridColumn: '1 / -1' }}>
                        <span style={{ fontWeight: '600' }}>{prof.experience || '12+ Years'}</span> Experience
                      </div>
                    </div>

                    <div className="llc-tags">
                      {skills.map(skill => (
                        <span key={skill} className="llc-tag">{skill}</span>
                      ))}
                    </div>
                  </div>

                  <div className="llc-right">
                    <button className="llc-view-btn" onClick={() => navigate(`/labour/${prof._id}`)}>
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

export default LabourPage;
