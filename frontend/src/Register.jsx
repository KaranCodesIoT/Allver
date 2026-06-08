import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  Lock, 
  MapPin, 
  Compass, 
  HardHat, 
  Hammer, 
  ArrowLeft,
  Eye,
  EyeOff,
  Construction,
  Mail
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
const constructionHero = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'Client',
    city: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleSelect = (role) => {
    setFormData({ ...formData, role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        // Store registration info in localStorage
        localStorage.setItem('tempUser', JSON.stringify(data.user));
        
        // Redirect to specific profile page based on selected role
        const role = data.user.role;
        if (role === 'Client') {
          navigate('/profile-setup/client');
        } else if (role === 'Architect') {
          navigate('/profile-setup/architect');
        } else if (role === 'Contractor') {
          navigate('/profile-setup/contractor');
        } else if (role === 'Labour') {
          navigate('/profile-setup/labour');
        } else {
          navigate('/');
        }
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch (err) {
      setError('Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      {/* Left Side: Hero/Illustration */}
      <div className="register-hero" style={{ 
        backgroundImage: `linear-gradient(135deg, rgba(13,13,13,0.85) 0%, rgba(17,17,17,0.7) 100%), url(${constructionHero})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        padding: '4rem',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '2rem', left: '2rem', zIndex: 2 }}>
          <button 
            onClick={() => navigate('/')} 
            style={{ border: 'none', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', padding: '0.75rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', color: 'white' }}
          >
            <ArrowLeft size={24} />
          </button>
        </div>
        <h1 style={{ fontSize: '2.8rem', marginBottom: '1rem', color: '#fff', fontWeight: 900, lineHeight: 1.1 }}>Welcome to<br/><span style={{ color: '#F59E0B' }}>Allver</span></h1>
        <p style={{ maxWidth: '400px', fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)' }}>
          The premium marketplace connecting elite construction professionals with high-value projects.
        </p>
      </div>

      {/* Right Side: Form */}
      <div className="register-form-container">
        <div style={{ maxWidth: '500px', width: '100%', margin: '0 auto' }}>
          <h2>Create Your Account</h2>
          <p>Join thousands of professionals and clients today.</p>

          {error && (
            <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Full Name <span>*</span></label>
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
              <label>Email <span>*</span></label>
              <div className="input-with-icon">
                <Mail size={20} className="lucide" />
                <input 
                  type="email" 
                  name="email" 
                  placeholder="Enter your email address" 
                  required 
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>(Optional)</span></label>
              <div className="input-with-icon">
                <Phone size={20} className="lucide" />
                <input 
                  type="tel" 
                  name="phoneNumber" 
                  placeholder="Enter your phone number" 
                  value={formData.phoneNumber}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password <span>*</span></label>
              <div className="input-with-icon">
                <Lock size={20} className="lucide" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  name="password" 
                  placeholder="Create a strong password" 
                  required 
                  value={formData.password}
                  onChange={handleChange}
                  minLength="6"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Minimum 6 characters required</span>
            </div>

            <div className="form-group">
              <label>I am a <span>*</span></label>
              <div className="role-selector">
                <div 
                  className={`role-option ${formData.role === 'Architect' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('Architect')}
                >
                  <Compass size={24} />
                  Architect
                </div>
                <div 
                  className={`role-option ${formData.role === 'Contractor' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('Contractor')}
                >
                  <HardHat size={24} />
                  Contractor
                </div>
                <div 
                  className={`role-option ${formData.role === 'Labour' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('Labour')}
                >
                  <Hammer size={24} />
                  Labour
                </div>
                <div 
                  className={`role-option ${formData.role === 'Client' ? 'selected' : ''}`}
                  onClick={() => handleRoleSelect('Client')}
                >
                  <User size={24} />
                  Client
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>City <span>*</span></label>
              <div className="input-with-icon">
                <MapPin size={20} className="lucide" />
                <input 
                  type="text" 
                  name="city" 
                  placeholder="Select or enter your city" 
                  required 
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--color-contractor)', fontWeight: '700', textDecoration: 'none' }}>Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
