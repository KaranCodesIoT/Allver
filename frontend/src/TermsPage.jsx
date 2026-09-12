import React, { useEffect } from 'react';
import { Mail } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const TermsPage = () => {
  useEffect(() => {
    document.title = "Terms of Service - Allver";
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
              Terms of Service
            </h1>
            <p className="av-hero-highlight" style={{ fontSize: '1.1rem', fontWeight: '500' }}>
              Last Updated: September 12, 2026
            </p>
            <p className="av-page-subtitle" style={{ marginTop: '1rem' }}>
              These Terms of Service govern your use of Allver (allver.in) and its services. By accessing or using Allver, you agree to these Terms.
            </p>
          </div>
        </section>

        {/* Terms Content */}
        <section className="av-about-section">
          <div className="av-section-container">
            <div className="av-legal-document">

              <div className="av-legal-section">
                <h2>1. About Allver</h2>
                <p>
                  Allver is a digital construction marketplace that helps connect clients with construction professionals, including architects, contractors, interior designers, skilled labourers, and other service providers.
                </p>
                <p>
                  Allver provides a platform for discovery, communication, and construction-related interactions.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>2. User Accounts</h2>
                <p>Some Allver features may require you to create an account.</p>
                <p>You are responsible for:</p>
                <ul>
                  <li>Providing accurate information.</li>
                  <li>Keeping your login credentials secure.</li>
                  <li>Maintaining the accuracy of your profile.</li>
                  <li>Using your account only for legitimate purposes.</li>
                </ul>
                <p>You must not impersonate another person or provide misleading information.</p>
              </div>

              <div className="av-legal-section">
                <h2>3. Professional Profiles</h2>
                <p>
                  Construction professionals may create profiles containing information such as their experience, skills, location, services, and portfolio or project information.
                </p>
                <p>
                  Users are responsible for ensuring that the information they provide is accurate and does not violate the rights of others.
                </p>
                <p>
                  Allver does not guarantee that every profile, portfolio, claim, qualification, or work history provided by a user is accurate unless explicitly stated as verified by Allver.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>4. User Conduct</h2>
                <p>You agree not to:</p>
                <ul>
                  <li>Use Allver for unlawful or fraudulent purposes.</li>
                  <li>Provide false or misleading information.</li>
                  <li>Harass, abuse, or threaten other users.</li>
                  <li>Upload harmful or malicious content.</li>
                  <li>Attempt to gain unauthorized access to accounts or systems.</li>
                  <li>Misuse the platform or interfere with its operation.</li>
                  <li>Use the platform to distribute spam or unsolicited communications.</li>
                </ul>
              </div>

              <div className="av-legal-section">
                <h2>5. Connections & Transactions</h2>
                <p>
                  Allver may help users discover and communicate with construction professionals.
                </p>
                <p>
                  Any agreement, quotation, payment, contract, employment arrangement, or other transaction between users is entered into directly between the relevant parties unless Allver explicitly states otherwise.
                </p>
                <p>
                  Users are responsible for independently evaluating professionals and agreeing on project terms before proceeding.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>6. Payments & Fees</h2>
                <p>
                  Certain Allver features or services may be offered for free, while others may be subject to fees or subscription charges.
                </p>
                <p>
                  Where applicable, pricing and payment terms will be communicated before a paid service is used or purchased.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>7. Intellectual Property</h2>
                <p>
                  The Allver name, branding, website, software, design, and original content are owned by or licensed to Allver unless otherwise stated.
                </p>
                <p>
                  You may not copy, reproduce, modify, distribute, or commercially exploit Allver's intellectual property without appropriate permission.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>8. User Content</h2>
                <p>
                  You retain ownership of content that you submit to Allver, subject to the rights necessary for Allver to operate and provide its services.
                </p>
                <p>
                  By submitting content, you grant Allver permission to use, store, display, and process that content as reasonably necessary to provide the platform's services.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>9. Availability of Services</h2>
                <p>
                  We aim to keep Allver available and reliable, but we do not guarantee that the platform will always be uninterrupted, error-free, or available at all times.
                </p>
                <p>
                  Features may be modified, suspended, or discontinued when necessary.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>10. Limitation of Responsibility</h2>
                <p>
                  Allver provides a platform for connecting users and construction professionals.
                </p>
                <p>
                  We do not guarantee the quality, availability, qualifications, conduct, pricing, performance, or suitability of any user or professional unless explicitly stated.
                </p>
                <p>
                  Users should independently verify information and make their own decisions before entering into agreements or transactions.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>11. Account Suspension or Termination</h2>
                <p>
                  Allver may suspend or terminate an account where necessary, including for violations of these Terms, misuse of the platform, fraudulent activity, or security concerns.
                </p>
                <p>Users may request account deletion by contacting:</p>
                <p><a href="mailto:support@allver.in" style={{ color: '#b48c36', fontWeight: '700' }}>support@allver.in</a> or <a href="mailto:contact@allver.in" style={{ color: '#b48c36', fontWeight: '700' }}>contact@allver.in</a></p>
              </div>

              <div className="av-legal-section">
                <h2>12. Changes to These Terms</h2>
                <p>
                  We may update these Terms of Service from time to time.
                </p>
                <p>
                  Updated Terms will be published on this page with a revised "Last Updated" date.
                </p>
              </div>

              <div className="av-legal-section">
                <h2>13. Contact Us</h2>
                <p>
                  For questions regarding these Terms of Service, contact:
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

export default TermsPage;
