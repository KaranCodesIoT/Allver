import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, MapPin, Target, Hammer, Droplet, Paintbrush, Zap, Scissors, Users, MoreHorizontal } from 'lucide-react';

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
    { id: 'Mason', label: 'Mason', icon: Hammer },
    { id: 'Plumber', label: 'Plumber', icon: Droplet },
    { id: 'Painter', label: 'Painter', icon: Paintbrush },
    { id: 'Electrician', label: 'Electrician', icon: Zap },
    { id: 'Carpenter', label: 'Carpenter', icon: Scissors },
    { id: 'Helper', label: 'Helper', icon: Users },
    { id: 'Other', label: 'Other', icon: MoreHorizontal }
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
        <div className="profile-setup-top-section">
          <div className="left-meta">
            <button onClick={() => navigate('/register')} className="back-btn">
              <ArrowLeft size={20} />
            </button>
            <h2>Labour Profile</h2>
            <p className="subtitle">Complete your profile to get more work opportunities.</p>
          </div>
          <div className="right-illustration">
            {/* Outline Mason SVG */}
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="30" width="16" height="8" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5"/>
              <rect x="28" y="30" width="16" height="8" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5"/>
              <rect x="18" y="20" width="16" height="8" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5"/>
              <rect x="36" y="20" width="16" height="8" rx="1" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5"/>
              <path d="M5 45H55" stroke="#4b5563" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Green Banner */}
        <div className="alert-banner info yellow">
          <CheckCircle2 size={20} className="alert-icon" />
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
                const Icon = opt.icon;
                const isSelected = skillType === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`skill-select-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSkillType(opt.id)}
                  >
                    <Icon size={24} className="skill-icon" />
                    <span>{opt.label}</span>
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
              <MapPin size={20} className="lucide" />
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

          <button type="submit" className="btn-setup-submit yellow font-bold" disabled={loading}>
            {loading ? 'Saving Profile...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LabourProfileSetup;
