import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Compass, 
  HardHat, 
  Hammer, 
  Layers, 
  CheckCircle2, 
  Target, 
  Globe2, 
  Mail, 
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Search,
  Cpu
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const AboutPage = () => {
  useEffect(() => {
    document.title = "About Allver - India's Construction Marketplace";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="allver-page-wrapper">
      <Navbar />

      <main className="av-page-main">
        {/* Hero Section */}
        <section className="av-about-hero">
          <div className="av-section-container">
            <h1 className="av-page-title">
              About Allver
            </h1>
            <p className="av-hero-highlight">
              One Platform. Every Construction Need.
            </p>
            <p className="av-page-subtitle" style={{ marginTop: '1.25rem' }}>
              Allver is a digital construction marketplace built to connect clients, contractors, architects, and skilled labour professionals on one platform.
            </p>
            <p className="av-page-subtitle" style={{ marginTop: '0.75rem', opacity: 0.9 }}>
              Our goal is to make construction easier to discover, connect, coordinate, and manage by bringing people and opportunities together digitally.
            </p>
          </div>
        </section>

        {/* Mission & Purpose */}
        <section className="av-about-section">
          <div className="av-section-container">
            <div className="av-grid-2col">
              <div className="av-info-card highlighted">
                <div className="av-card-icon-wrap">
                  <Target size={28} />
                </div>
                <h2>Our Mission</h2>
                <p>
                  To organize and digitize India's construction and building trade sector by giving construction professionals a credible digital presence and direct access to relevant work opportunities.
                </p>
              </div>

              <div className="av-info-card">
                <div className="av-card-icon-wrap">
                  <Globe2 size={28} />
                </div>
                <h2>Our Purpose</h2>
                <p>
                  The construction industry often depends on fragmented local networks, personal references, and offline coordination. Allver aims to simplify this process through a unified digital platform where construction professionals can showcase their work and clients can discover the right people for their projects.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What Allver Offers */}
        <section className="av-about-section alt-bg">
          <div className="av-section-container">
            <div className="av-section-header text-center">
              <span className="av-section-kicker">Services & Features</span>
              <h2>What Allver Offers</h2>
            </div>

            <div className="av-features-grid">
              {/* Feature 1 */}
              <div className="av-feature-card">
                <div className="av-feature-icon green">
                  <Compass size={24} />
                </div>
                <h3>Architect & Interior Designer Discovery</h3>
                <p>
                  Discover architects and interior designers, explore their profiles and portfolios, and connect with professionals for your project requirements.
                </p>
                <Link to="/architects" className="av-card-link">Explore Architects <ArrowRight size={14} /></Link>
              </div>

              {/* Feature 2 */}
              <div className="av-feature-card">
                <div className="av-feature-icon blue">
                  <HardHat size={24} />
                </div>
                <h3>Contractor Discovery</h3>
                <p>
                  Find contractors for residential and commercial construction requirements and connect with them directly.
                </p>
                <Link to="/contractors" className="av-card-link">Find Contractors <ArrowRight size={14} /></Link>
              </div>

              {/* Feature 3 */}
              <div className="av-feature-card">
                <div className="av-feature-icon orange">
                  <Hammer size={24} />
                </div>
                <h3>Skilled Labour Discovery</h3>
                <p>
                  Connect with skilled construction professionals such as masons, electricians, plumbers, painters, carpenters, and other tradespeople.
                </p>
                <Link to="/labour" className="av-card-link">View Labour Directory <ArrowRight size={14} /></Link>
              </div>

              {/* Feature 4 */}
              <div className="av-feature-card">
                <div className="av-feature-icon gold">
                  <Layers size={24} />
                </div>
                <h3>Digital Construction Workspaces</h3>
                <p>
                  Support better project coordination through digital communication, quotations, project information, and other construction-related tools.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Allver? */}
        <section className="av-about-section">
          <div className="av-section-container">
            <div className="av-section-header text-center">
              <span className="av-section-kicker">Advantages</span>
              <h2>Why Allver?</h2>
            </div>

            <div className="av-benefits-grid">
              <div className="av-benefit-item">
                <CheckCircle2 className="av-benefit-icon" size={20} />
                <div>
                  <h4>Direct Connections</h4>
                  <p>Connect with construction professionals without unnecessary intermediaries.</p>
                </div>
              </div>

              <div className="av-benefit-item">
                <UserCheck className="av-benefit-icon" size={20} />
                <div>
                  <h4>Professional Profiles</h4>
                  <p>Professionals can build a digital presence with their experience, skills, and project work.</p>
                </div>
              </div>

              <div className="av-benefit-item">
                <Search className="av-benefit-icon" size={20} />
                <div>
                  <h4>Better Discovery</h4>
                  <p>Make it easier for clients to find relevant construction professionals.</p>
                </div>
              </div>

              <div className="av-benefit-item">
                <Cpu className="av-benefit-icon" size={20} />
                <div>
                  <h4>Digital Coordination</h4>
                  <p>Bring important project communication and information into one place.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About the Team */}
        <section className="av-about-section alt-bg">
          <div className="av-section-container">
            <div className="av-team-box">
              <div className="av-team-content">
                <span className="av-section-kicker">Our Team</span>
                <h2>About the Team</h2>
                <p>
                  Allver is being built by a team passionate about technology and the construction industry, with the vision of making India's construction ecosystem more organized, accessible, and digital.
                </p>
                <div className="av-contact-callout">
                  <Mail size={18} className="av-gold-icon" />
                  <div>
                    <strong>For any questions or enquiries:</strong>
                    <p><a href="mailto:contact@allver.in">contact@allver.in</a></p>
                  </div>
                </div>
              </div>
              <div className="av-team-action">
                <Link to="/register" className="av-btn-primary">
                  Join Allver Today <ArrowRight size={16} />
                </Link>
                <Link to="/contact" className="av-btn-outline">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
