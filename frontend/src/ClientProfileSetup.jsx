import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Building, ArrowLeft, CheckCircle2, Target } from 'lucide-react';

const ClientProfileSetup = () => {
  const navigate = useNavigate();
  const [tempUser, setTempUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    location: '',
    projectType: ''
  });
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
    setFormData((prev) => ({
      ...prev,
      fullName: user.fullName || '',
      location: user.city || ''
    }));
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.location || !formData.projectType) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:5000/api/user/profile/${tempUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          location: formData.location,
          projectType: formData.projectType
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Set the active session and remove temp session
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
      <div className="profile-setup-card">
        {/* Header */}
        <div className="profile-setup-header">
          <button onClick={() => navigate('/register')} className="back-btn">
            <ArrowLeft size={20} />
          </button>
          <h2>Client Profile</h2>
          <p className="subtitle">Tell us a little about yourself to get started.</p>
        </div>

        {/* Success Alert Banner */}
        <div className="alert-banner">
          <CheckCircle2 size={20} className="alert-icon" />
          <span>Your profile helps us personalize your experience.</span>
        </div>

        {error && <div className="setup-error-msg">{error}</div>}

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-group">
            <label>Name <span className="required">*</span></label>
            <p className="input-desc">Enter your full name</p>
            <div className="input-with-icon">
              <User size={20} className="lucide" />
              <input
                type="text"
                name="fullName"
                placeholder="Enter your full name"
                required
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Location <span className="required">*</span></label>
            <p className="input-desc">Enter your location</p>
            <div className="input-with-icon">
              <MapPin size={20} className="lucide" />
              <input
                type="text"
                name="location"
                placeholder="Enter your area / city / locality"
                required
                value={formData.location}
                onChange={handleChange}
              />
              <button 
                type="button" 
                className="input-right-btn"
                onClick={() => setFormData({ ...formData, location: tempUser?.city || 'Mumbai' })}
                title="Use registered city"
              >
                <Target size={18} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Project Type <span className="required">*</span></label>
            <p className="input-desc">Select the type of project you are looking for</p>
            <div className="input-with-icon">
              <Building size={20} className="lucide" />
              <select
                name="projectType"
                required
                value={formData.projectType}
                onChange={handleChange}
              >
                <option value="" disabled>Select project type</option>
                <option value="Residential">Residential Construction</option>
                <option value="Commercial">Commercial Project</option>
                <option value="Renovation">Interior Design / Renovation</option>
                <option value="Infrastructure">Infrastructure Project</option>
                <option value="Other">Other Project</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn-setup-submit" disabled={loading}>
            {loading ? 'Saving Profile...' : 'Done'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientProfileSetup;
