import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Camera, Plus, X, Building2, Briefcase, Award, MapPin, Phone } from 'lucide-react';

const ArchitectProfileSetup = () => {
  const navigate = useNavigate();
  const [tempUser, setTempUser] = useState(null);
  
  // Form State
  const [firmName, setFirmName] = useState('');
  const [experience, setExperience] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [specializations, setSpecializations] = useState(['Residential', 'Interior Design', 'Commercial']);
  const [serviceAreas, setServiceAreas] = useState(['Mumbai', 'Pune', 'Navi Mumbai']);
  
  // Custom Tag Inputs
  const [specInput, setSpecInput] = useState('');
  const [areaInput, setAreaInput] = useState('');
  
  // Portfolio Images State (starts empty for real uploads)
  const [portfolioImages, setPortfolioImages] = useState([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  const handleAddSpec = (e) => {
    if (e.key === 'Enter' && specInput.trim()) {
      e.preventDefault();
      if (!specializations.includes(specInput.trim())) {
        setSpecializations([...specializations, specInput.trim()]);
      }
      setSpecInput('');
    }
  };

  const handleRemoveSpec = (spec) => {
    setSpecializations(specializations.filter(s => s !== spec));
  };

  const handleAddArea = (e) => {
    if (e.key === 'Enter' && areaInput.trim()) {
      e.preventDefault();
      if (!serviceAreas.includes(areaInput.trim())) {
        setServiceAreas([...serviceAreas, areaInput.trim()]);
      }
      setAreaInput('');
    }
  };

  const handleRemoveArea = (area) => {
    setServiceAreas(serviceAreas.filter(a => a !== area));
  };

  const handleRemoveImage = (index) => {
    setPortfolioImages(portfolioImages.filter((_, i) => i !== index));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (portfolioImages.length >= 10) {
      alert('Maximum 10 images allowed.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setPortfolioImages([...portfolioImages, data.url]);
      } else {
        setError(data.message || 'Image upload failed.');
      }
    } catch (err) {
      setError('Connection to upload server failed.');
    } finally {
      setUploading(false);
    }
  };

  const saveProfileData = async (dataPayload) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/user/profile/${tempUser._id}`, {
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
    if (!experience) {
      setError('Experience is a required field.');
      return;
    }
    if (!whatsappNumber) {
      setError('WhatsApp Number is a required field.');
      return;
    }
    if (portfolioImages.length === 0) {
      setError('Please add at least one portfolio image.');
      return;
    }

    saveProfileData({
      firmName,
      experience,
      portfolioImages,
      specialization: specializations,
      serviceArea: serviceAreas,
      whatsappNumber
    });
  };

  const handleSkip = () => {
    // Save minimal/empty values and proceed
    saveProfileData({
      firmName: firmName || 'N/A',
      experience: experience || 'Not specified',
      whatsappNumber: whatsappNumber || tempUser?.phoneNumber || '',
      portfolioImages: portfolioImages,
      specialization: specializations,
      serviceArea: serviceAreas
    });
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
            <h2>Architect Profile</h2>
            <p className="subtitle">Complete your profile to get discovered</p>
          </div>
          <div className="right-illustration">
            {/* Outline sketch house icon */}
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 50V25L30 10L50 25V50" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 50V35H38V50" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M15 50H45" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M42 20V12H47V23.7" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="setup-steps-indicator">
          <div className="step-node completed">
            <div className="circle"><Check size={14} /></div>
            <span>Account Created</span>
          </div>
          <div className="step-line active"></div>
          <div className="step-node active">
            <div className="circle">2</div>
            <span>Architect Profile</span>
          </div>
          <div className="step-line"></div>
          <div className="step-node">
            <div className="circle">3</div>
            <span>Start Using</span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="alert-banner info">
          <Award size={20} className="alert-icon" />
          <span>Complete your profile to build trust and get more project inquiries.</span>
        </div>

        {error && <div className="setup-error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label>Firm Name <span className="optional">(Optional)</span></label>
            <div className="input-with-icon">
              <Building2 size={20} className="lucide" />
              <input
                type="text"
                placeholder="Enter your firm / company name"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
              />
            </div>
            <span className="input-desc">You can add this later</span>
          </div>

          <div className="form-group">
            <label>Experience (in years) <span className="required">*</span></label>
            <div className="input-with-icon">
              <Briefcase size={20} className="lucide" />
              <select
                required
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option value="" disabled>Select your experience</option>
                <option value="1-3 years">1-3 Years</option>
                <option value="3-5 years">3-5 Years</option>
                <option value="5-10 years">5-10 Years</option>
                <option value="10+ years">10+ Years</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Portfolio Images <span className="required">*</span></label>
            <div className="portfolio-manager">
              <div className="portfolio-grid">
                {portfolioImages.map((img, idx) => (
                  <div key={idx} className="portfolio-thumb">
                    <img src={img} alt={`portfolio-${idx}`} />
                    <button type="button" className="remove-img-btn" onClick={() => handleRemoveImage(idx)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                
                {portfolioImages.length < 10 && (
                  <label className="add-portfolio-btn" style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}>
                    <Plus size={24} />
                    <span>{uploading ? 'Uploading...' : 'Add Image'}</span>
                    <span className="sub">Upload project photo (Max 10)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      style={{ display: 'none' }} 
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Specialization <span className="required">*</span></label>
            <div className="tag-field-container">
              <div className="tag-group">
                {specializations.map((spec, idx) => (
                  <span key={idx} className="badge-tag">
                    {spec}
                    <button type="button" onClick={() => handleRemoveSpec(spec)}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Press Enter to add other specializations"
                value={specInput}
                onChange={(e) => setSpecInput(e.target.value)}
                onKeyDown={handleAddSpec}
                className="tag-text-input"
              />
              <span className="input-desc">Select all that apply. Default suggestions shown above.</span>
            </div>
          </div>

          <div className="form-group">
            <label>Service Area (Cities / Areas) <span className="required">*</span></label>
            <div className="tag-field-container">
              <div className="tag-group">
                {serviceAreas.map((area, idx) => (
                  <span key={idx} className="badge-tag">
                    {area}
                    <button type="button" onClick={() => handleRemoveArea(area)}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Press Enter to add other cities"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                onKeyDown={handleAddArea}
                className="tag-text-input"
              />
              <span className="input-desc">Add the cities / areas where you provide services.</span>
            </div>
          </div>

          <div className="form-group">
            <label>WhatsApp Number <span className="required">*</span></label>
            <div className="tel-group">
              <select className="dial-code-select" defaultValue="+91">
                <option value="+91">+91 (IN)</option>
                <option value="+1">+1 (US)</option>
                <option value="+44">+44 (UK)</option>
              </select>
              <div className="input-with-icon full-width">
                <Phone size={18} className="lucide" />
                <input
                  type="tel"
                  placeholder="98765 43210"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                />
              </div>
            </div>
            <span className="input-desc">This number will be shown to clients for easy contact</span>
          </div>

          <div className="setup-actions">
            <button type="submit" className="btn-setup-submit font-bold" disabled={loading}>
              {loading ? 'Saving Profile...' : 'Save & Continue'}
            </button>
            <button type="button" className="btn-setup-skip" onClick={handleSkip} disabled={loading}>
              Skip for Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ArchitectProfileSetup;
