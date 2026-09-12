import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  CheckCircle2, 
  Sparkles, 
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState({
    submitted: false,
    loading: false,
    error: null
  });

  useEffect(() => {
    document.title = "Contact Allver";
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setStatus({ submitted: false, loading: false, error: 'Please fill in all required fields.' });
      return;
    }

    setStatus({ submitted: false, loading: true, error: null });

    // Simulate clean dispatch
    setTimeout(() => {
      setStatus({ submitted: true, loading: false, error: null });
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 600);
  };

  return (
    <div className="allver-page-wrapper">
      <Navbar />

      <main className="av-page-main">
        {/* Contact Hero */}
        <section className="av-about-hero">
          <div className="av-section-container">
            <h1 className="av-page-title">
              Contact Allver
            </h1>
            <p className="av-hero-highlight">
              Get in Touch with Allver
            </p>
            <p className="av-page-subtitle" style={{ marginTop: '1rem' }}>
              Have a question, suggestion, feedback, or business enquiry? We'd be happy to hear from you.
            </p>
          </div>
        </section>

        {/* Contact Content & Form */}
        <section className="av-about-section">
          <div className="av-section-container">
            <div className="av-contact-layout">
              {/* Left Column: Direct Info */}
              <div className="av-contact-info-col">
                <div className="av-contact-card">
                  <div className="av-contact-card-header">
                    <div className="av-card-icon-wrap">
                      <Mail size={24} />
                    </div>
                    <div>
                      <h3>Contact Us</h3>
                      <p style={{ marginTop: '4px', fontWeight: '700', color: '#0f172a' }}>Official Contact Email</p>
                    </div>
                  </div>
                  <div className="av-email-display-box">
                    <a href="mailto:contact@allver.in" className="av-direct-email">
                      contact@allver.in
                    </a>
                  </div>
                  <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#475569', lineHeight: '1.6' }}>
                    For general enquiries, support, partnerships, feedback, or other questions, please contact us through the email above.
                  </p>
                </div>

                <div className="av-contact-card">
                  <div className="av-contact-card-header">
                    <div className="av-card-icon-wrap">
                      <HelpCircle size={24} />
                    </div>
                    <div>
                      <h3>Support</h3>
                      <p style={{ marginTop: '4px', fontWeight: '700', color: '#0f172a' }}>Dedicated Support Desk</p>
                    </div>
                  </div>
                  <div className="av-email-display-box">
                    <a href="mailto:support@allver.in" className="av-direct-email">
                      support@allver.in
                    </a>
                  </div>
                  <p style={{ marginTop: '12px', fontSize: '0.9rem', color: '#475569', lineHeight: '1.6' }}>
                    For support-related questions, technical assistance, or account help, please contact our support desk directly.
                  </p>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div className="av-contact-form-container">
                <div className="av-form-box">
                  <h2>Send Us a Message</h2>

                  {status.submitted ? (
                    <div className="av-form-success-banner">
                      <CheckCircle2 size={36} className="av-success-icon" />
                      <h3>Thank You!</h3>
                      <p>Your message has been received. Our team will review your enquiry and reach out to you at the provided email address.</p>
                      <button 
                        type="button" 
                        className="av-btn-primary" 
                        onClick={() => setStatus({ submitted: false, loading: false, error: null })}
                        style={{ marginTop: '1.25rem' }}
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="av-contact-form" noValidate>
                      {status.error && (
                        <div className="av-form-error-banner">
                          <AlertCircle size={18} />
                          <span>{status.error}</span>
                        </div>
                      )}

                      <div className="av-form-group">
                        <label htmlFor="name">Full Name <span className="av-required">*</span></label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          placeholder="Enter your full name."
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="av-form-input"
                        />
                      </div>

                      <div className="av-form-group">
                        <label htmlFor="email">Email Address <span className="av-required">*</span></label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          placeholder="Enter your email address."
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="av-form-input"
                        />
                      </div>

                      <div className="av-form-group">
                        <label htmlFor="subject">Subject <span className="av-required">*</span></label>
                        <input
                          type="text"
                          id="subject"
                          name="subject"
                          placeholder="Enter the subject of your enquiry."
                          value={formData.subject}
                          onChange={handleChange}
                          required
                          className="av-form-input"
                        />
                      </div>

                      <div className="av-form-group">
                        <label htmlFor="message">Message <span className="av-required">*</span></label>
                        <textarea
                          id="message"
                          name="message"
                          rows={5}
                          placeholder="Write your message or enquiry here."
                          value={formData.message}
                          onChange={handleChange}
                          required
                          className="av-form-textarea"
                        ></textarea>
                      </div>

                      <button 
                        type="submit" 
                        className="av-btn-primary av-btn-full"
                        disabled={status.loading}
                      >
                        {status.loading ? (
                          <span>Submitting...</span>
                        ) : (
                          <>
                            <span>Submit Message</span>
                            <Send size={16} />
                          </>
                        )}
                      </button>
                    </form>
                  )}
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

export default ContactPage;
