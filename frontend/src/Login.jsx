import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Phone, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowLeft, 
  ShieldAlert, 
  Construction, 
  Sun, 
  Moon,
  MessageSquareDiff
} from 'lucide-react';
import welcomeHero from './assets/welcome_hero.png';

const Login = () => {
  const navigate = useNavigate();
  
  // State variables
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // States for process and feedback
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Apply dark mode theme class to page wrapper
  useEffect(() => {
    // Optional: detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSendOtp = async () => {
    if (!phoneNumber) {
      setError('Please enter your phone number first.');
      return;
    }
    
    setOtpLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const response = await fetch('http://localhost:5000/api/login/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        setInfoMessage(data.message);
      } else {
        setError(data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setError('Failed to connect to the server.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMessage('');

    const payload = {
      phoneNumber,
      method: loginMethod,
      ...(loginMethod === 'password' ? { password } : { otp })
    };

    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
          {infoMessage && (
            <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', fontWeight: '600', fontSize: '0.9rem' }}>
              {infoMessage}
            </div>
          )}

          {/* Login Method Tab Selectors */}
          <div className="auth-tab-group">
            <button
              type="button"
              className={`auth-tab-btn ${loginMethod === 'password' ? 'active' : ''}`}
              onClick={() => {
                setLoginMethod('password');
                setError('');
                setInfoMessage('');
              }}
            >
              Password Login
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${loginMethod === 'otp' ? 'active' : ''}`}
              onClick={() => {
                setLoginMethod('otp');
                setError('');
                setInfoMessage('');
              }}
            >
              OTP Verification
            </button>
          </div>

          <form onSubmit={handleSubmit} className="setup-form">
            <div className="form-group">
              <label>Phone Number <span className="required">*</span></label>
              <div className="input-with-icon">
                <Phone size={20} className="lucide" />
                <input 
                  type="tel" 
                  placeholder="Enter registered phone number" 
                  required 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            {/* PASSWORD INPUT BLOCK */}
            {loginMethod === 'password' && (
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
            )}

            {/* OTP INPUT BLOCK */}
            {loginMethod === 'otp' && (
              <div className="form-group">
                <label>OTP (One Time Password) <span className="required">*</span></label>
                <div className="otp-input-combo">
                  <div className="input-with-icon full-width">
                    <ShieldAlert size={20} className="lucide" />
                    <input 
                      type="text" 
                      placeholder="6-digit code" 
                      required={loginMethod === 'otp'} 
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength="6"
                    />
                  </div>
                  <button 
                    type="button" 
                    className="send-otp-btn"
                    onClick={handleSendOtp}
                    disabled={otpLoading}
                  >
                    {otpLoading ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                </div>
                <span className="input-desc">Click Send OTP first to receive your verification code.</span>
              </div>
            )}

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
