import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, CheckCircle2, ShieldCheck, Clock,
  ArrowRight, Paintbrush, Hammer, Wrench, Zap,
  Layers, Sparkles, HardHat, PhoneCall, HelpCircle
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const WORKFORCE_SERVICES = [
  {
    id: 'Painting',
    name: 'Painting Services',
    category: 'Finishing',
    desc: 'Interior, exterior, texture painting, wall waterproofing & POP finishing',
    rate: '₹800 – ₹1,000 / day',
    icon: Paintbrush,
    popular: true,
    color: '#ef4444',
    bg: '#fef2f2'
  },
  {
    id: 'Masonry',
    name: 'Masonry & Civil Work',
    category: 'Civil & Build',
    desc: 'Brick masonry, plastering, concrete casting, foundation & civil repairs',
    rate: '₹900 – ₹1,200 / day',
    icon: HardHat,
    popular: true,
    color: '#f59e0b',
    bg: '#fffbeb'
  },
  {
    id: 'Electrical',
    name: 'Electrical Work',
    category: 'Utilities',
    desc: 'House wiring, switchboards, MCB repair, lights, fans & appliance installation',
    rate: '₹750 – ₹1,000 / day',
    icon: Zap,
    popular: true,
    color: '#3b82f6',
    bg: '#eff6ff'
  },
  {
    id: 'Plumbing',
    name: 'Plumbing & Sanitation',
    category: 'Utilities',
    desc: 'Pipeline installation, tap & sanitary fittings, water tanks & leak repairs',
    rate: '₹700 – ₹950 / day',
    icon: Wrench,
    popular: false,
    color: '#10b981',
    bg: '#ecfdf5'
  },
  {
    id: 'Carpentry',
    name: 'Carpentry & Woodwork',
    category: 'Finishing',
    desc: 'Custom furniture, door & window frames, modular kitchens & lock repair',
    rate: '₹850 – ₹1,100 / day',
    icon: Hammer,
    popular: false,
    color: '#8b5cf6',
    bg: '#f5f3ff'
  },
  {
    id: 'Tiling',
    name: 'Tile & Stone Laying',
    category: 'Finishing',
    desc: 'Floor tiling, wall tiles, bathroom granite, marble polishing & grouting',
    rate: '₹800 – ₹1,050 / day',
    icon: Layers,
    popular: false,
    color: '#06b6d4',
    bg: '#ecfeff'
  },
  {
    id: 'Cleaning',
    name: 'Post-Construction Cleaning',
    category: 'Maintenance',
    desc: 'Deep cleaning, paint stain removal, site debris clearing & floor scrubbing',
    rate: '₹600 – ₹850 / day',
    icon: Sparkles,
    popular: false,
    color: '#14b8a6',
    bg: '#f0fdfa'
  },
  {
    id: 'Other',
    name: 'General Construction Helpers',
    category: 'Civil & Build',
    desc: 'Everyday construction helpers, loading/unloading, site assistance & material shifting',
    rate: '₹500 – ₹750 / day',
    icon: HardHat,
    popular: false,
    color: '#64748b',
    bg: '#f8fafc'
  },
];

const CATEGORIES = ['All', 'Civil & Build', 'Finishing', 'Utilities', 'Maintenance'];

const LabourPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [bookingModal, setBookingModal] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    city: '',
    workersCount: '1',
    startDate: '',
    notes: ''
  });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  const filteredServices = WORKFORCE_SERVICES.filter(service => {
    const matchesSearch =
      !searchQuery.trim() ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || service.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleBookService = (service) => {
    setBookingModal(service);
    setBookingSubmitted(false);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setBookingSubmitted(true);
    setTimeout(() => {
      setBookingModal(null);
      setBookingSubmitted(false);
      setBookingForm({
        name: '',
        phone: '',
        city: '',
        workersCount: '1',
        startDate: '',
        notes: ''
      });
    }, 2000);
  };

  return (
    <DashboardLayout pageTitle="Skilled Workforce" pageSubtitle="On-demand verified construction and home improvement workers" accentColor="#f97316">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
        
        {/* Hero Header Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
          color: 'white',
          borderRadius: '16px',
          padding: '2.5rem 2rem',
          marginBottom: '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '750px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(249, 115, 22, 0.2)', border: '1px solid rgba(249, 115, 22, 0.4)', borderRadius: '20px', padding: '4px 14px', width: 'fit-content' }}>
              <ShieldCheck size={16} color="#f97316" />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fed7aa' }}>100% Background Verified Workers</span>
            </div>
            <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: '800', margin: 0, lineHeight: 1.2 }}>
              Hire Skilled Workers for Your Project
            </h1>
            <p style={{ fontSize: '1rem', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>
              Choose from verified tradesmen with standardized daily wages, on-time arrival guarantee, and instant site dispatch.
            </p>
          </div>
        </div>

        {/* Search and Category Filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.75rem 1.25rem',
            flex: '1',
            minWidth: '280px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
          }}>
            <Search size={20} color="#94a3b8" />
            <input
              type="text"
              placeholder="Search services (Painting, Masonry, Plumbing, Electrical)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.95rem',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Filter Tabs */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            background: '#f8fafc',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  border: 'none',
                  outline: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: selectedCategory === cat ? '700' : '500',
                  background: selectedCategory === cat ? '#f97316' : 'transparent',
                  color: selectedCategory === cat ? 'white' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Service Cards Grid (Responsive 1-4 columns) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {filteredServices.map(service => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {service.popular && (
                  <span style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: '#fff7ed',
                    color: '#f97316',
                    border: '1px solid #ffedd5',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    Popular
                  </span>
                )}

                <div>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: service.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem',
                    color: service.color
                  }}>
                    <Icon size={24} />
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#0f172a', margin: '0 0 0.5rem 0' }}>
                    {service.name}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.5', margin: '0 0 1.25rem 0', minHeight: '40px' }}>
                    {service.desc}
                  </p>
                </div>

                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Standard Wage</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a' }}>{service.rate}</span>
                  </div>

                  <button
                    onClick={() => handleBookService(service)}
                    style={{
                      width: '100%',
                      background: '#f97316',
                      color: 'white',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '0.95rem',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(249, 115, 22, 0.25)'
                    }}
                  >
                    <span>Book Service</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Workflow & Assurance Section */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={22} color="#10b981" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>KYC Verified</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Aadhaar & police verification verified for all on-site personnel.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={22} color="#3b82f6" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>Standardized Rates</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Clear daily rates with no hidden commissions or inflated pricing.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={22} color="#f97316" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>On-Time Dispatch</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Workers dispatched directly to your project location as scheduled.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Booking Modal */}
      {bookingModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            <button
              onClick={() => setBookingModal(null)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            {bookingSubmitted ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '30px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>Booking Request Received!</h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  Our team is assigning verified {bookingModal.name} workers for your project. We'll call you shortly.
                </p>
              </div>
            ) : (
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                  Book {bookingModal.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem 0' }}>
                  Daily Wage: <strong>{bookingModal.rate}</strong>
                </p>

                <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Your Full Name</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={bookingForm.name}
                      onChange={e => setBookingForm({...bookingForm, name: e.target.value})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Phone Number</label>
                      <input
                        required
                        type="tel"
                        placeholder="Enter 10-digit mobile number"
                        value={bookingForm.phone}
                        onChange={e => setBookingForm({...bookingForm, phone: e.target.value})}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Project City</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Mumbai, Dadar"
                        value={bookingForm.city}
                        onChange={e => setBookingForm({...bookingForm, city: e.target.value})}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Number of Workers</label>
                      <select
                        value={bookingForm.workersCount}
                        onChange={e => setBookingForm({...bookingForm, workersCount: e.target.value})}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', background: 'white' }}
                      >
                        <option value="1">1 Worker</option>
                        <option value="2">2 Workers</option>
                        <option value="3">3 Workers</option>
                        <option value="4">4 Workers</option>
                        <option value="5+">5+ Workers</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Start Date</label>
                      <input
                        required
                        type="date"
                        value={bookingForm.startDate}
                        onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})}
                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Work Requirements / Scope (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="Brief details of work required..."
                      value={bookingForm.notes}
                      onChange={e => setBookingForm({...bookingForm, notes: e.target.value})}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'none' }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      background: '#f97316',
                      color: 'white',
                      border: 'none',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      fontSize: '1rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      marginTop: '0.5rem',
                      boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
                    }}
                  >
                    Confirm & Request Workforce
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default LabourPage;
