import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  Construction, 
  Sun, 
  Moon
} from 'lucide-react';
import welcomeHero from './assets/welcome_hero.png';

const Login = () => {
  const navigate = useNavigate();
  
  // State variables
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // States for process and feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Apply dark mode theme class to page wrapper
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Save to active session
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        navigate('/');
      } else {
        setError(data.message || 'Login failed.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`register-page ${isDarkMode ? 'dark-theme-mode' : ''}`}>
      {/* Theme Toggle Button */}
      <button 
        type="button" 
        className="theme-mode-toggle"
        onClick={toggleDarkMode}
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Left Side: Hero Banner */}
      <div className="register-hero">
        <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
          <button 
            onClick={() => navigate('/')} 
            className="back-btn-round"
            title="Go to landing page"
          >
            <ArrowLeft size={24} />
          </button>
        </div>
        <img src={welcomeHero} alt="Allver Login Hero" />
        <h1 className="hero-heading">Welcome Back to Allver</h1>
        <p className="hero-text">
          Manage your projects, discover skilled contractors, and collaborate with architects securely in one place.
        </p>
      </div>

      {/* Right Side: Authentication Form Card */}
      <div className="register-form-container login-layout-card">
        <div style={{ maxWidth: '440px', width: '100%', margin: '0 auto' }}>
          
          <div className="login-header-block">
            <div className="brand-badge">
              <Construction size={22} />
              <span>Allver</span>
            </div>
            <h2>Log In</h2>
            <p>Access your construction dashboard</p>
          </div>

          {/* Feedback Banners */}
          {error && <div className="setup-error-msg">{error}</div>}

          <form onSubmit={handleSubmit} className="setup-form">
            <div className="form-group">
              <label>Email <span className="required">*</span></label>
              <div className="input-with-icon">
                <Mail size={20} className="lucide" />
                <input 
                  type="email" 
                  placeholder="Enter your email address" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password <span className="required">*</span></label>
              <div className="input-with-icon">
                <Lock size={20} className="lucide" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-eye"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit btn-login-action" disabled={loading}>
              {loading ? 'Logging you in...' : 'Log In'}
            </button>
          </form>

          <div className="auth-footer-prompt">
            Don't have an account yet? <Link to="/register" className="register-link-span">Create Account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
