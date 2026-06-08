import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, MapPin, Target } from 'lucide-react';

const LabourProfileSetup = () => {
  const navigate = useNavigate();
  const [tempUser, setTempUser] = useState(null);

  // Form State
  const [skillType, setSkillType] = useState('');
  const [location, setLocation] = useState('');
  const [availability, setAvailability] = useState('Available');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('tempUser');
    if (!userStr) {
      navigate('/register');
      return;
    }
    const user = JSON.parse(userStr);
    setTempUser(user);
    setLocation(user.city || '');
  }, [navigate]);

  const skillOptions = [
    { 
      id: 'Mason', 
      label: 'Mason', 
      iconSvg: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="skill-icon-svg">
          <rect x="3" y="14" width="10" height="6" rx="1" fill="currentColor" fillOpacity="0.1"/>
          <rect x="13" y="14" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.1"/>
          <rect x="7" y="8" width="10" height="6" rx="1" fill="currentColor" fillOpacity="0.1"/>
          <path d="M16 4 L21 9 L17 13 L12 8 Z" fill="currentColor" fillOpacity="0.3"/>
          <path d="M12 8 L8 12 L5 12" />
        </svg>
      )
    },
    { 
      id: 'Plumber', 
      label: 'Plumber', 
      iconSvg: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="skill-icon-svg">
          <path d="M5 12h14" />
          <path d="M17 12V7a2 2 0 0 0-2-2H9" />
          <path d="M9 3v4" />
          <path d="M19 10a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1h-4v-5h4z" fill="currentColor" fillOpacity="0.15" />
          <path d="M12 15v3a2 2 0 0 0 2 2" />
        </svg>
      )
    },
    { 
      id: 'Painter', 
      label: 'Painter', 
      iconSvg: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="skill-icon-svg">
          <rect x="4" y="3" width="14" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
          <path d="M18 6h3v6h-7M14 12v8a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-8" />
        </svg>
      )
    },
    { 
      id: 'Electrician', 
      label: 'Electrician', 
      iconSvg: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="skill-icon-svg">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" fillOpacity="0.15"/>
        </svg>
      )
    },
    { 
      id: 'Carpenter', 
      label: 'Carpenter', 
      iconSvg: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="skill-icon-svg">
          <path d="M18 3 L21 6 L7 20 L3 20 L3 16 Z" fill="currentColor" fillOpacity="0.15" />
          <path d="M7 20 L9 18 M11 16 L13 14 M15 12 L17 10" />
          <path d="M3 16h4v4" />
        </svg>
      )
    },
    { 
      id: 'Helper', 
      label: 'Helper', 
      iconSvg: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="skill-icon-svg">
          <circle cx="19" cy="17" r="2" fill="currentColor" fillOpacity="0.15"/>
          <path d="M4 8h5l4 6h6" />
          <path d="M6 14l2-6" />
          <path d="M13 14 L17 9 L20 9" />
          <path d="M3 16 L6 14 L9 16" />
        </svg>
      )
    },
    { 
      id: 'Other', 
      label: 'Other', 
      iconSvg: (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="skill-icon-svg">
          <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="18" cy="12" r="1.5" fill="currentColor"/>
        </svg>
      )
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!skillType) {
      setError('Please select a Skill Type.');
      return;
    }
    if (!location) {
      setError('Location is a required field.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:5000/api/user/profile/${tempUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillType,
          location,
          availability
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.removeItem('tempUser');
        navigate('/');
      } else {
        setError(data.message || 'Failed to update profile.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-setup-page">
      <div className="profile-setup-card large">
        {/* Header Block */}
        <div className="profile-setup-top-section labour-header">
          <button onClick={() => navigate('/register')} className="back-btn">
            <ArrowLeft size={20} />
          </button>
          
          <div className="header-text-center">
            <h2>Labour Profile</h2>
            <p className="subtitle">Complete your profile to get more work opportunities.</p>
          </div>
          
          <div className="right-illustration labour-worker-illustration">
            {/* Detailed Worker SVG */}
            <svg width="150" height="90" viewBox="0 0 150 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Bricks */}
              <rect x="75" y="72" width="22" height="8" rx="1" fill="#C0563C" stroke="#fff" strokeWidth="1"/>
              <rect x="98" y="72" width="22" height="8" rx="1" fill="#B24C33" stroke="#fff" strokeWidth="1"/>
              <rect x="121" y="72" width="22" height="8" rx="1" fill="#C0563C" stroke="#fff" strokeWidth="1"/>
              <rect x="86" y="63" width="22" height="8" rx="1" fill="#B24C33" stroke="#fff" strokeWidth="1"/>
              <rect x="109" y="63" width="22" height="8" rx="1" fill="#C0563C" stroke="#fff" strokeWidth="1"/>
              <rect x="97" y="54" width="22" height="8" rx="1" fill="#B24C33" stroke="#fff" strokeWidth="1"/>

              {/* Worker Body */}
              {/* Shirt */}
              <path d="M25 80 C25 55, 65 55, 65 80 Z" fill="#4A5568"/>
              {/* Vest (Orange) */}
              <path d="M29 80 L36 62 L54 62 L61 80 Z" fill="#F97316"/>
              {/* Silver strips */}
              <rect x="34" y="64" width="4" height="16" fill="#E2E8F0"/>
              <rect x="52" y="64" width="4" height="16" fill="#E2E8F0"/>
              <rect x="34" y="70" width="22" height="3" fill="#E2E8F0"/>

              {/* Face/Neck */}
              <rect x="41" y="50" width="8" height="6" fill="#FDBA74"/>
              <circle cx="45" cy="46" r="8" fill="#FDBA74"/>
              {/* Eyes */}
              <circle cx="42" cy="45" r="1" fill="#1E293B"/>
              <circle cx="48" cy="45" r="1" fill="#1E293B"/>
              {/* Smile */}
              <path d="M43 49 Q45 51, 47 49" stroke="#1E293B" strokeWidth="1" strokeLinecap="round" fill="none"/>
              {/* Mustache */}
              <path d="M41 48 C43 47.5, 47 47.5, 49 48" stroke="#1E293B" strokeWidth="1.5" strokeLinecap="round" fill="none"/>

              {/* Hard Hat */}
              <path d="M36 39 C36 26, 54 26, 54 39 Z" fill="#EAB308"/>
              <path d="M32 38h26v2H32z" fill="#CA8A04" rx="1"/>

              {/* Arm holding trowel */}
              <path d="M25 74 Q18 70, 14 62" fill="none" stroke="#FDBA74" strokeWidth="6" strokeLinecap="round"/>
              <path d="M25 74 Q18 70, 14 62" fill="none" stroke="#4A5568" strokeWidth="7.5" strokeLinecap="round"/>
              <circle cx="13" cy="60" r="3" fill="#FDBA74"/>
              {/* Trowel */}
              <path d="M7 55 L15 50 L11 44 Z" fill="#94A3B8" stroke="#475569" strokeWidth="0.75"/>
              <path d="M11 58 L11 54 L12 51" stroke="#334155" strokeWidth="1.5" fill="none"/>
              <rect x="9" y="58" width="4" height="3" rx="0.5" fill="#78350F"/>

              {/* Arm placing brick */}
              <path d="M64 74 Q74 68, 82 62" fill="none" stroke="#FDBA74" strokeWidth="6" strokeLinecap="round"/>
              <path d="M64 74 Q74 68, 82 62" fill="none" stroke="#4A5568" strokeWidth="7.5" strokeLinecap="round"/>
              <circle cx="83" cy="61" r="3" fill="#FDBA74"/>
              {/* Brick in hand */}
              <rect x="85" y="55" width="12" height="7" rx="0.5" fill="#F97316" stroke="#C2410C" strokeWidth="0.75"/>
            </svg>
          </div>
        </div>

        {/* Green Banner */}
        <div className="alert-banner info">
          <ShieldCheck size={20} className="alert-icon" />
          <span>Complete your profile to appear in local work searches.</span>
        </div>

        {error && <div className="setup-error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="setup-form">
          {/* Skill Type Grid */}
          <div className="form-group">
            <label>Skill Type <span className="required">*</span></label>
            <p className="input-desc">Select your main skill</p>
            <div className="skill-selector-grid">
              {skillOptions.map((opt) => {
                const isSelected = skillType === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`skill-select-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSkillType(opt.id)}
                  >
                    <div className="skill-icon-wrapper">
                      {opt.iconSvg}
                    </div>
                    <span className="skill-label">{opt.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Location Input */}
          <div className="form-group">
            <label>Location <span className="required">*</span></label>
            <p className="input-desc">Select your work location</p>
            <div className="input-with-icon">
              <MapPin size={20} className="lucide location-pin-icon" style={{ color: '#10b981' }} />
              <input
                type="text"
                placeholder="Enter area / city / locality"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <button
                type="button"
                className="input-right-btn"
                onClick={() => setLocation(tempUser?.city || 'Mumbai')}
                title="Use registered city"
              >
                <Target size={18} />
              </button>
            </div>
          </div>

          {/* Availability Toggle */}
          <div className="form-group">
            <label>Availability <span className="required">*</span></label>
            <p className="input-desc">Are you available for work?</p>
            <div className="availability-selector">
              <div
                className={`avail-card green ${availability === 'Available' ? 'selected' : ''}`}
                onClick={() => setAvailability('Available')}
              >
                <div className="radio-dot"></div>
                <div className="avail-info">
                  <span className="title">Available</span>
                  <span className="desc">I am looking for work</span>
                </div>
              </div>

              <div
                className={`avail-card red ${availability === 'Not Available' ? 'selected' : ''}`}
                onClick={() => setAvailability('Not Available')}
              >
                <div className="radio-dot"></div>
                <div className="avail-info">
                  <span className="title">Not Available</span>
                  <span className="desc">Not available right now</span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-setup-submit green font-bold" disabled={loading}>
            {loading ? 'Saving Profile...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LabourProfileSetup;
