import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="av-footer" id="footer" role="contentinfo" aria-label="Site Footer">
      <div className="av-footer-inner">
        <h3 className="av-footer-heading">Allver Platform & Support</h3>
        
        <nav className="av-footer-nav" aria-label="Footer Navigation">
          <Link to="/about" className="av-footer-nav-link">About Us</Link>
          <span className="av-footer-dot" aria-hidden="true">·</span>
          <Link to="/contact" className="av-footer-nav-link">Contact Support</Link>
          <span className="av-footer-dot" aria-hidden="true">·</span>
          <Link to="/privacy-policy" className="av-footer-nav-link">Privacy Policy</Link>
          <span className="av-footer-dot" aria-hidden="true">·</span>
          <Link to="/terms" className="av-footer-nav-link">Terms of Service</Link>
        </nav>

        <p className="av-footer-copyright">
          © 2026 Allver Construction Marketplace (<span className="av-footer-domain">allver.in</span>). All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
