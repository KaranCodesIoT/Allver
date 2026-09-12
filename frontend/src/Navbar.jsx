import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, HardHat, Compass, Hammer } from 'lucide-react';
import allverLogo from './assets/allver-logo.png';

const Navbar = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [proDropdownOpen, setProDropdownOpen] = useState(false);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="av-navbar">
      <div className="av-navbar-inner">
        <Link to="/" className="av-brand" onClick={() => setMobileMenuOpen(false)}>
          <img src={allverLogo} alt="Allver" className="av-brand-logo" />
          <div className="av-brand-text">
            <span className="av-brand-name" style={{ color: '#0f172a', fontWeight: '900', letterSpacing: '2px', fontSize: '1.25rem' }}>ALLVER</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="av-nav-links">
          <Link to="/" className={isActive('/') ? 'active' : ''}>
            Home
          </Link>
          <Link to="/about" className={isActive('/about') ? 'active' : ''}>
            About
          </Link>
          <Link to="/contact" className={isActive('/contact') ? 'active' : ''}>
            Contact
          </Link>

          {/* For Professionals Dropdown */}
          <div 
            className="av-nav-dropdown"
            onMouseEnter={() => setProDropdownOpen(true)}
            onMouseLeave={() => setProDropdownOpen(false)}
          >
            <button 
              type="button" 
              className={`av-nav-dropdown-btn ${isActive('/contractors') || isActive('/architects') || isActive('/labour') ? 'active' : ''}`}
            >
              For Professionals <ChevronDown size={14} className={proDropdownOpen ? 'rotate-180' : ''} />
            </button>
            {proDropdownOpen && (
              <div className="av-dropdown-menu">
                <Link to="/contractors" className="av-dropdown-item">
                  <HardHat size={16} />
                  <div>
                    <strong>Contractors</strong>
                    <span>Find projects & build teams</span>
                  </div>
                </Link>
                <Link to="/architects" className="av-dropdown-item">
                  <Compass size={16} />
                  <div>
                    <strong>Architects</strong>
                    <span>Showcase designs & get clients</span>
                  </div>
                </Link>
                <Link to="/labour" className="av-dropdown-item">
                  <Hammer size={16} />
                  <div>
                    <strong>Labourers</strong>
                    <span>Find verified daily work</span>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Desktop Actions */}
        <div className="av-nav-actions">
          <Link to="/login" className="av-btn-login">Login</Link>
          <Link to="/register" className="av-btn-signup">Sign Up</Link>
          <button 
            type="button" 
            className="av-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="av-mobile-menu">
          <nav className="av-mobile-nav-links">
            <Link 
              to="/" 
              className={`av-mobile-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/about" 
              className={`av-mobile-link ${isActive('/about') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link 
              to="/contact" 
              className={`av-mobile-link ${isActive('/contact') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Contact
            </Link>

            <div className="av-mobile-section-divider">For Professionals</div>
            <Link 
              to="/contractors" 
              className={`av-mobile-link ${isActive('/contractors') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <HardHat size={16} /> Contractors
            </Link>
            <Link 
              to="/architects" 
              className={`av-mobile-link ${isActive('/architects') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Compass size={16} /> Architects
            </Link>
            <Link 
              to="/labour" 
              className={`av-mobile-link ${isActive('/labour') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Hammer size={16} /> Labourers
            </Link>

            <div className="av-mobile-auth-btns">
              <Link 
                to="/login" 
                className="av-btn-login"
                onClick={() => setMobileMenuOpen(false)}
                style={{ textAlign: 'center', width: '100%', display: 'block' }}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                className="av-btn-signup"
                onClick={() => setMobileMenuOpen(false)}
                style={{ textAlign: 'center', width: '100%', display: 'block' }}
              >
                Sign Up
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
