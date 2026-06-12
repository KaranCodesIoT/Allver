import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, HardHat, Users, Wrench, MapPin, Briefcase } from 'lucide-react';

const ContractorProfileSetup = () => {
  const navigate = useNavigate();
  const [tempUser, setTempUser] = useState(null);

  // Form State
  const [contractorType, setContractorType] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [experience, setExperience] = useState('');
  const [workCategories, setWorkCategories] = useState(['Building Construction', 'Renovation', 'Painting']);
  const [serviceLocations, setServiceLocations] = useState(['Mumbai', 'Thane', 'Navi Mumbai']);

  // Custom Tag Inputs
  const [categoryInput, setCategoryInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

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
  }, [navigate]);

  const handleAddCategory = (e) => {
    if (e.key === 'Enter' && categoryInput.trim()) {
      e.preventDefault();
      if (!workCategories.includes(categoryInput.trim())) {
        setWorkCategories([...workCategories, categoryInput.trim()]);
      }
      setCategoryInput('');
    }
  };

  const handleRemoveCategory = (cat) => {
    setWorkCategories(workCategories.filter(c => c !== cat));
  };

  const handleAddLocation = (e) => {
    if (e.key === 'Enter' && locationInput.trim()) {
      e.preventDefault();
      if (!serviceLocations.includes(locationInput.trim())) {
        setServiceLocations([...serviceLocations, locationInput.trim()]);
      }
      setLocationInput('');
    }
  };

  const handleRemoveLocation = (loc) => {
    setServiceLocations(serviceLocations.filter(l => l !== loc));
  };

  const saveProfileData = async (dataPayload) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`https://allver.onrender.com/api/user/profile/${tempUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataPayload)
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        localStorage.removeItem('tempUser');
        navigate('/');
      } else {
        setError(data.message || 'Failed to save profile details.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!contractorType || !teamSize || !experience) {
      setError('Please fill in all required fields.');
      return;
    }

    saveProfileData({
      contractorType,
      teamSize,
      experience,
      workCategory: workCategories,
      serviceLocation: serviceLocations
    });
  };

  const handleSkip = () => {
    saveProfileData({
      contractorType: contractorType || 'General Contractor',
      teamSize: teamSize || '1-5 people',
      experience: experience || 'Not specified',
      workCategory: workCategories,
      serviceLocation: serviceLocations
    });
  };

  return (
    <div className="profile-setup-page">
      <div className="profile-setup-card large">
        {/* Header Section */}
        <div className="profile-setup-top-section">
          <div className="left-meta">
            <button onClick={() => navigate('/register')} className="back-btn">
              <ArrowLeft size={20} />
            </button>
            <h2>Contractor Profile</h2>
            <p className="subtitle">Complete your profile to get discovered by more clients</p>
          </div>
          <div className="right-illustration">
            {/* Outline contractor/crane SVG */}
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="38" width="8" height="12" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="26" y="22" width="8" height="28" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="42" y="30" width="8" height="20" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 50H55" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="26" cy="10" r="4" stroke="#3b82f6" strokeWidth="2.5"/>
            </svg>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="setup-steps-indicator blue">
          <div className="step-node completed">
            <div className="circle"><Check size={14} /></div>
            <span>Account Created</span>
          </div>
          <div className="step-line active"></div>
          <div className="step-node active">
            <div className="circle">2</div>
            <span>Contractor Profile</span>
          </div>
          <div className="step-line"></div>
          <div className="step-node">
            <div className="circle">3</div>
            <span>Start Using</span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="alert-banner info blue">
          <HardHat size={20} className="alert-icon" />
          <span>A complete profile builds trust and helps you get more work.</span>
        </div>

        {error && <div className="setup-error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label>Contractor Type <span className="required">*</span></label>
            <div className="input-with-icon">
              <HardHat size={20} className="lucide" />
              <select
                required
                value={contractorType}
                onChange={(e) => setContractorType(e.target.value)}
              >
                <option value="" disabled>Select contractor type</option>
                <option value="Civil Contractor">Civil Contractor</option>
                <option value="Plumbing Contractor">Plumbing Contractor</option>
                <option value="Electrical Contractor">Electrical Contractor</option>
                <option value="Painting Contractor">Painting Contractor</option>
                <option value="General Contractor">General Contractor</option>
                <option value="HVAC Contractor">HVAC Contractor</option>
              </select>
            </div>
            <span className="input-desc">e.g. Civil Contractor, Plumbing Contractor, Electrical Contractor, etc.</span>
          </div>

          <div className="form-group">
            <label>Team Size <span className="required">*</span></label>
            <div className="input-with-icon">
              <Users size={20} className="lucide" />
              <select
                required
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
              >
                <option value="" disabled>Select team size</option>
                <option value="1-5 people">1-5 people</option>
                <option value="5-10 people">5-10 people</option>
                <option value="10-20 people">10-20 people</option>
                <option value="20-50 people">20-50 people</option>
                <option value="50+ people">50+ people</option>
              </select>
            </div>
            <span className="input-desc">Number of people in your team</span>
          </div>

          <div className="form-group">
            <label>Work Category <span className="required">*</span></label>
            <div className="tag-field-container">
              <div className="tag-group">
                {workCategories.map((cat, idx) => (
                  <span key={idx} className="badge-tag blue">
                    {cat}
                    <button type="button" onClick={() => handleRemoveCategory(cat)}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Press Enter to add other work categories"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyDown={handleAddCategory}
                className="tag-text-input"
              />
              <span className="input-desc">Select all that apply. Default suggestions shown above.</span>
            </div>
          </div>

          <div className="form-group">
            <label>Service Location <span className="required">*</span></label>
            <div className="tag-field-container">
              <div className="tag-group">
                {serviceLocations.map((loc, idx) => (
                  <span key={idx} className="badge-tag blue">
                    {loc}
                    <button type="button" onClick={() => handleRemoveLocation(loc)}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Press Enter to add other areas/cities"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                onKeyDown={handleAddLocation}
                className="tag-text-input"
              />
              <span className="input-desc">Add areas/cities where you provide services.</span>
            </div>
          </div>

          <div className="form-group">
            <label>Years of Experience <span className="required">*</span></label>
            <div className="input-with-icon">
              <Briefcase size={20} className="lucide" />
              <select
                required
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option value="" disabled>Select experience</option>
                <option value="1-3 years">1-3 Years</option>
                <option value="3-5 years">3-5 Years</option>
                <option value="5-10 years">5-10 Years</option>
                <option value="10+ years">10+ Years</option>
              </select>
            </div>
            <span className="input-desc">Total years of experience in this field</span>
          </div>

          <div className="setup-actions">
            <button type="submit" className="btn-setup-submit blue font-bold" disabled={loading}>
              {loading ? 'Saving Profile...' : 'Save & Continue'}
            </button>
            <button type="button" className="btn-setup-skip blue" onClick={handleSkip} disabled={loading}>
              Skip for Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractorProfileSetup;
