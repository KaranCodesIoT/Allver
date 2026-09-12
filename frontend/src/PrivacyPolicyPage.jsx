import React, { useEffect } from 'react';
import { Shield, Lock, Mail } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const PrivacyPolicyPage = () => {
  useEffect(() => {
    document.title = "Privacy Policy - Allver";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="allver-page-wrapper">
      <Navbar />

      <main className="av-page-main">
        {/* Header */}
        <section className="av-about-hero">
          <div className="av-section-container">
            <h1 className="av-page-title">
              Privacy Policy
            </h1>
            <p className="av-hero-highlight" style={{ fontSize: '1.1rem', fontWeight: '500' }}>
              Last Updated: September 12, 2026
            </p>
            <p className="av-page-subtitle" style={{ marginTop: '1rem' }}>
              This Privacy Policy explains how Allver (allver.in) collects, uses, stores, and protects information when you use our website and services.
            </p>
          </div>
        </section>

        {/* Content Section */}
        <section className="av-about-section">
          <div className="av-section-container">
            <div className="av-legal-document">

              <div className="av-legal-section">
                <h2>1. Information We Collect</h2>
                <p>
                  We may collect information that you provide directly when using Allver, including:
                </p>
                
                <h3 style={{ fontSize: '1.15rem', color: '#b48c36', marginTop: '1.25rem', marginBottom: '0.35rem', fontWeight: '700' }}>Account Information</h3>
                <p>Name, email address, phone number, password, and selected account role.</p>

                <h3 style={{ fontSize: '1.15rem', color: '#b48c36', marginTop: '1.25rem', marginBottom: '0.35rem', fontWeight: '700' }}>Professional Profile Information</h3>
                <p>Location, experience, skills, biography, and portfolio or project information that you choose to provide.</p>

                <h3 style={{ fontSize: '1.15rem', color: '#b48c36', marginTop: '1.25rem', marginBottom: '0.35rem', fontWeight: '700' }}>Project & Communication Information</h3>
                <p>Information you provide through project interactions, messages, quotations, enquiries, and other platform activities.</p>

                <h3 style={{ fontSize: '1.15rem', color: '#b48c36', marginTop: '1.25rem', marginBottom: '0.35rem', fontWeight: '700' }}>Support Information</h3>
                <p>Information you provide when contacting us for support or other enquiries.</p>
              </div>

              <div className="av-legal-section">
                <h2>2. How We Use Information</h2>
                <p>We use information to:</p>
                <ul>
                  <li>Create and maintain your Allver account.</li>
                  <li>Provide and improve Allver's features and services.</li>
                  <li>Help users discover relevant construction professionals.</li>
                  <li>Enable communication and project-related interactions.</li>
                  <li>Respond to support requests and enquiries.</li>
                  <li>Maintain platform security and prevent misuse.</li>
                  <li>Improve the reliability and functionality of our services.</li>
                </ul>
              </div>

              <div className="av-legal-section">
                <h2>3. Cookies & Storage</h2>
                <p>
                  Allver may use necessary technologies and storage mechanisms to maintain account sessions, preferences, security, and core platform functionality.
                </p>
                <p>
                  Where third-party services are used to provide specific functionality, those services may process information according to their respective privacy policies.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>4. Advertising & Data Sharing</h2>
                <p>
                  Allver does not sell or rent your personal information to third parties.
                </p>
                <p>
                  We do not use your personal information for third-party advertising networks except where such services are specifically disclosed and required for a particular feature.
                </p>
                <p>
                  We may share information with service providers where necessary to operate, maintain, secure, or improve Allver.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>5. Third-Party Services</h2>
                <p>
                  Allver may use third-party service providers for services such as hosting, storage, authentication, communication, analytics, or media delivery.
                </p>
                <p>
                  These providers may process information only as necessary to provide their services to Allver and are subject to their applicable terms and privacy policies.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>6. Data Security</h2>
                <p>
                  We take reasonable measures to protect your information from unauthorized access, alteration, disclosure, or destruction.
                </p>
                <p>
                  Communications with Allver servers may be protected using HTTPS/TLS, and sensitive credentials are protected using appropriate security measures.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>7. Your Rights & Account Deletion</h2>
                <p>
                  You may request access to, correction of, or deletion of your personal information, subject to applicable law and legitimate operational or legal requirements.
                </p>
                <p>You may contact us at:</p>
                <p><a href="mailto:contact@allver.in" style={{ color: '#b48c36', fontWeight: '700' }}>contact@allver.in</a></p>
              </div>

              <div className="av-legal-section">
                <h2>8. Changes to This Privacy Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time to reflect changes to our services, technology, or legal requirements.
                </p>
                <p>
                  Any updated version will be published on this page with a revised "Last Updated" date.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>9. Contact Us</h2>
                <p>
                  For privacy-related questions or requests, contact:
                </p>
                <div className="av-legal-contact-card">
                  <Mail size={18} className="av-gold-icon" />
                  <div>
                    <p><a href="mailto:contact@allver.in">contact@allver.in</a></p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
