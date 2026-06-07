import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Star, CheckCircle2, MapPin, Briefcase, Calendar,
  MessageCircle, Plus, Info, ChevronLeft, ChevronRight, MoreVertical,
  DollarSign, Clock, AlertCircle
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

/* ──────────────────────────────────────────
   MOCK LABOUR DATA (Matching mock-l1 to mock-l6)
   ────────────────────────────────────────── */

const MOCK_LABOURS_DETAILS = {
  'mock-l1': {
    id: 'mock-l1',
    fullName: 'Ramesh Yadav',
    role: 'Site Supervisor / Mason',
    city: 'Mumbai, Maharashtra',
    experience: '12+ Years Experience',
    rating: 4.8,
    reviews: 124,
    avatar: 'RY',
    avatarColor: '#f59e0b',
    img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
    verified: true,
    stats: {
      daysWorked: 31,
      totalPayment: 11000,
      advanceGiven: 2000,
      pendingPayment: 9000
    },
    attendance: [
      { date: '01 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 100, remarks: '-' },
      { date: '02 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '03 May 2024', day: 'Fri', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '04 May 2024', day: 'Sat', status: 'Half Day', hours: 4.0, advance: 100, remarks: '-' },
      { date: '05 May 2024', day: 'Sun', status: 'Absent', hours: 0.0, advance: 0, remarks: 'Personal' },
      { date: '06 May 2024', day: 'Mon', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '07 May 2024', day: 'Tue', status: 'Present', hours: 8.0, advance: 100, remarks: '-' },
      { date: '08 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '09 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 100, remarks: '-' },
      { date: '10 May 2024', day: 'Fri', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '11 May 2024', day: 'Sat', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '12 May 2024', day: 'Sun', status: 'Absent', hours: 0.0, advance: 0, remarks: 'Personal' },
      { date: '13 May 2024', day: 'Mon', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '14 May 2024', day: 'Tue', status: 'Present', hours: 8.0, advance: 100, remarks: '-' },
      { date: '15 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '16 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '17 May 2024', day: 'Fri', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '18 May 2024', day: 'Sat', status: 'Half Day', hours: 4.0, advance: 0, remarks: '-' },
      { date: '19 May 2024', day: 'Sun', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '20 May 2024', day: 'Mon', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '21 May 2024', day: 'Tue', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '22 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '23 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '24 May 2024', day: 'Fri', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '25 May 2024', day: 'Sat', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '26 May 2024', day: 'Sun', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '27 May 2024', day: 'Mon', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '28 May 2024', day: 'Tue', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '29 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '30 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '31 May 2024', day: 'Fri', status: 'Present', hours: 8.0, advance: 0, remarks: '-' }
    ],
    payments: [
      { date: '01 May 2024', desc: 'Advance Given', amount: 1000, type: 'Cash', status: 'Verified' },
      { date: '04 May 2024', desc: 'Advance Given', amount: 1000, type: 'Online', status: 'Verified' },
      { date: '10 May 2024', desc: 'Partial Payout', amount: 4000, type: 'Online', status: 'Verified' },
      { date: '25 May 2024', desc: 'Mid-Month Payout', amount: 5000, type: 'Online', status: 'Verified' }
    ]
  },
  'mock-l2': {
    id: 'mock-l2',
    fullName: 'Suresh Patil',
    role: 'Mason',
    city: 'Pune, Maharashtra',
    experience: '10 Years Experience',
    rating: 4.6,
    reviews: 89,
    avatar: 'SP',
    avatarColor: '#f59e0b',
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    verified: true,
    stats: {
      daysWorked: 28,
      totalPayment: 9800,
      advanceGiven: 1500,
      pendingPayment: 8300
    },
    attendance: [
      { date: '01 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '02 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 100, remarks: '-' },
      { date: '03 May 2024', day: 'Fri', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '04 May 2024', day: 'Sat', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '05 May 2024', day: 'Sun', status: 'Absent', hours: 0.0, advance: 0, remarks: 'Sunday Holiday' }
    ],
    payments: [
      { date: '02 May 2024', desc: 'Food Advance', amount: 500, type: 'Cash', status: 'Verified' },
      { date: '10 May 2024', desc: 'Site Advance', amount: 1000, type: 'Online', status: 'Verified' }
    ]
  },
  'mock-l3': {
    id: 'mock-l3',
    fullName: 'Ravi Singh',
    role: 'Carpenter',
    city: 'Mumbai, Maharashtra',
    experience: '7 Years Experience',
    rating: 4.7,
    reviews: 102,
    avatar: 'RS',
    avatarColor: '#3b82f6',
    img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    verified: true,
    stats: {
      daysWorked: 25,
      totalPayment: 12500,
      advanceGiven: 3000,
      pendingPayment: 9500
    },
    attendance: [
      { date: '01 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 200, remarks: '-' },
      { date: '02 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '03 May 2024', day: 'Fri', status: 'Present', hours: 8.0, advance: 0, remarks: '-' }
    ],
    payments: [
      { date: '01 May 2024', desc: 'Material Advance', amount: 3000, type: 'Online', status: 'Verified' }
    ]
  },
  'mock-l4': {
    id: 'mock-l4',
    fullName: 'Imran Shaikh',
    role: 'Electrician',
    city: 'Navi Mumbai, Maharashtra',
    experience: '8 Years Experience',
    rating: 4.5,
    reviews: 67,
    avatar: 'IS',
    avatarColor: '#8b5cf6',
    img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80',
    verified: true,
    stats: {
      daysWorked: 24,
      totalPayment: 10800,
      advanceGiven: 1000,
      pendingPayment: 9800
    },
    attendance: [
      { date: '01 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
      { date: '02 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 0, remarks: '-' }
    ],
    payments: [
      { date: '02 May 2024', desc: 'Travel Payout', amount: 1000, type: 'Cash', status: 'Verified' }
    ]
  },
  'mock-l5': {
    id: 'mock-l5',
    fullName: 'Mahesh Gupta',
    role: 'Electrician',
    experience: '6 Years Experience',
    rating: 4.9,
    reviews: 156,
    avatar: 'MG',
    avatarColor: '#ef4444',
    img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
    verified: true,
    stats: {
      daysWorked: 30,
      totalPayment: 15000,
      advanceGiven: 4000,
      pendingPayment: 11000
    },
    attendance: [
      { date: '01 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 500, remarks: '-' }
    ],
    payments: [
      { date: '01 May 2024', desc: 'Advance Payout', amount: 4000, type: 'Online', status: 'Verified' }
    ]
  },
  'mock-l6': {
    id: 'mock-l6',
    fullName: 'Anil Naik',
    role: 'Painter',
    city: 'Mumbai, Maharashtra',
    experience: '5 Years Experience',
    rating: 4.4,
    reviews: 54,
    avatar: 'AN',
    avatarColor: '#06b6d4',
    img: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=200&q=80',
    verified: true,
    stats: {
      daysWorked: 20,
      totalPayment: 8000,
      advanceGiven: 1000,
      pendingPayment: 7000
    },
    attendance: [
      { date: '01 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 0, remarks: '-' }
    ],
    payments: [
      { date: '01 May 2024', desc: 'Advance Payout', amount: 1000, type: 'Cash', status: 'Verified' }
    ]
  }
};

const DEFAULT_LABOUR = {
  id: 'mock-l1',
  fullName: 'Ramesh Yadav',
  role: 'Mason',
  city: 'Mumbai, Maharashtra',
  experience: '12+ Years Experience',
  rating: 4.8,
  reviews: 124,
  avatar: 'RY',
  avatarColor: '#f59e0b',
  img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
  verified: true,
  stats: {
    daysWorked: 31,
    totalPayment: 11000,
    advanceGiven: 2000,
    pendingPayment: 9000
  },
  attendance: [
    { date: '01 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 100, remarks: '-' },
    { date: '02 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
    { date: '03 May 2024', day: 'Fri', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
    { date: '04 May 2024', day: 'Sat', status: 'Half Day', hours: 4.0, advance: 100, remarks: '-' },
    { date: '05 May 2024', day: 'Sun', status: 'Absent', hours: 0.0, advance: 0, remarks: 'Personal' },
    { date: '06 May 2024', day: 'Mon', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
    { date: '07 May 2024', day: 'Tue', status: 'Present', hours: 8.0, advance: 100, remarks: '-' },
    { date: '08 May 2024', day: 'Wed', status: 'Present', hours: 8.0, advance: 0, remarks: '-' },
    { date: '09 May 2024', day: 'Thu', status: 'Present', hours: 8.0, advance: 100, remarks: '-' },
    { date: '10 May 2024', day: 'Fri', status: 'Present', hours: 8.0, advance: 0, remarks: '-' }
  ],
  payments: [
    { date: '01 May 2024', desc: 'Advance Given', amount: 1000, type: 'Cash', status: 'Verified' },
    { date: '04 May 2024', desc: 'Advance Given', amount: 1000, type: 'Online', status: 'Verified' },
    { date: '10 May 2024', desc: 'Partial Payout', amount: 4000, type: 'Online', status: 'Verified' },
    { date: '25 May 2024', desc: 'Mid-Month Payout', amount: 5000, type: 'Online', status: 'Verified' }
  ]
};

const LabourDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('attendance');
  const [labourData, setLabourData] = useState(null);
  const [loading, setLoading] = useState(true);

  // States for interactive month navigation
  const [selectedMonth, setSelectedMonth] = useState('May 2024');

  useEffect(() => {
    // Dynamic fetch or load
    if (MOCK_LABOURS_DETAILS[id]) {
      setLabourData(MOCK_LABOURS_DETAILS[id]);
      setLoading(false);
    } else {
      // Fetch details from API
      fetch(`http://localhost:5000/api/professionals/details/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.professional) {
            const prof = data.professional;
            setLabourData({
              id: prof._id,
              fullName: prof.fullName,
              role: prof.skillType || 'Skilled Labourer',
              city: prof.city || 'India',
              experience: prof.experience || '5+ Years Experience',
              rating: prof.rating || 4.5,
              reviews: prof.reviews || 20,
              avatar: prof.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'L',
              avatarColor: '#f59e0b',
              img: DEFAULT_LABOUR.img,
              verified: true,
              stats: DEFAULT_LABOUR.stats,
              attendance: DEFAULT_LABOUR.attendance,
              payments: DEFAULT_LABOUR.payments
            });
          } else {
            setLabourData(DEFAULT_LABOUR);
          }
          setLoading(false);
        })
        .catch(() => {
          // Fallback to default
          setLabourData(DEFAULT_LABOUR);
          setLoading(false);
        });
    }
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Labour Profile" pageSubtitle="Loading profile..." accentColor="#f59e0b">
        <div className="ldp-loading">Loading labour profile...</div>
      </DashboardLayout>
    );
  }

  const l = labourData || DEFAULT_LABOUR;
  const s = l.stats;

  // Calculate counts for May 2024 based on static/mock data
  const totalDays = l.attendance.length;
  const presentDays = l.attendance.filter(r => r.status === 'Present').length;
  const halfDays = l.attendance.filter(r => r.status === 'Half Day').length;
  const absentDays = l.attendance.filter(r => r.status === 'Absent').length;
  const totalAdvanceTable = l.attendance.reduce((sum, r) => sum + r.advance, 0);

  return (
    <DashboardLayout pageTitle="Labour Profile" pageSubtitle="Worker Details & Attendance Logs" accentColor="#f59e0b">
      
      {/* Back button */}
      <button className="prof-page-back-nav" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back
      </button>

      {/* ═══ LABOUR PROFILE CARD ═══ */}
      <div className="ldp-profile-card">
        <div className="ldp-card-left">
          <div className="ldp-avatar-wrapper">
            <img src={l.img} alt={l.fullName} className="ldp-profile-img" />
            {l.verified && (
              <span className="ldp-verified-icon">
                <CheckCircle2 size={16} fill="#10b981" color="white" />
              </span>
            )}
          </div>
          <div className="ldp-profile-info">
            <div className="ldp-name-row">
              <h2>{l.fullName}</h2>
            </div>
            <div className="ldp-rating-row">
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <strong>{l.rating}</strong>
              <span className="ldp-reviews-count">({l.reviews} Reviews)</span>
            </div>
            <div className="ldp-role-badge">{l.role}</div>
            <div className="ldp-meta-item">
              <MapPin size={13} /> {l.city}
            </div>
            <div className="ldp-meta-item">
              <Briefcase size={13} /> {l.experience}
            </div>
          </div>
        </div>

        <div className="ldp-card-right">
          <button className="ldp-msg-btn">
            <MessageCircle size={16} /> Message
          </button>
          <button className="ldp-hire-btn">
            <Plus size={16} /> Hire / Give Work
          </button>
        </div>
      </div>

      {/* ═══ STATS COUNTERS ROW ═══ */}
      <div className="ldp-stats-grid">
        <div className="ldp-stat-card">
          <div className="ldp-stat-header">
            <Clock size={16} className="ldp-stat-icon" />
            <span>Total Days Worked</span>
          </div>
          <h3>{s.daysWorked} Days</h3>
          <span className="ldp-stat-sub">This Month</span>
        </div>
        <div className="ldp-stat-card">
          <div className="ldp-stat-header">
            <DollarSign size={16} className="ldp-stat-icon green" />
            <span>Total Payment</span>
          </div>
          <h3>₹ {s.totalPayment.toLocaleString('en-IN')}</h3>
          <span className="ldp-stat-sub">This Month</span>
        </div>
        <div className="ldp-stat-card">
          <div className="ldp-stat-header">
            <DollarSign size={16} className="ldp-stat-icon orange" />
            <span>Advance Given</span>
          </div>
          <h3>₹ {s.advanceGiven.toLocaleString('en-IN')}</h3>
          <span className="ldp-stat-sub">This Month</span>
        </div>
        <div className="ldp-stat-card">
          <div className="ldp-stat-header">
            <DollarSign size={16} className="ldp-stat-icon red" />
            <span>Pending Payment</span>
          </div>
          <h3>₹ {s.pendingPayment.toLocaleString('en-IN')}</h3>
          <span className="ldp-stat-sub">This Month</span>
        </div>
      </div>

      {/* ═══ TABS SELECTION ═══ */}
      <div className="ldp-tabs-section">
        <div className="ldp-tabs-header">
          <button
            className={`ldp-tab-btn ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Work & Attendance
          </button>
          <button
            className={`ldp-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
          </button>
        </div>

        {/* WORK & ATTENDANCE TAB CONTENT */}
        {activeTab === 'attendance' && (
          <div className="ldp-tab-content">
            <div className="ldp-tab-header-row">
              <h3>Work & Attendance</h3>
              <div className="ldp-month-nav">
                <ChevronLeft size={16} className="ldp-month-arrow" />
                <span>{selectedMonth}</span>
                <ChevronRight size={16} className="ldp-month-arrow" />
              </div>
            </div>

            {/* Attendance Quick Count Cards */}
            <div className="ldp-attendance-counts">
              <div className="ldp-count-card grey">
                <span className="ldp-count-label">Total Days</span>
                <h2>{totalDays}</h2>
              </div>
              <div className="ldp-count-card green">
                <span className="ldp-count-label">Present Days</span>
                <h2>{presentDays}</h2>
              </div>
              <div className="ldp-count-card orange">
                <span className="ldp-count-label">Half Days</span>
                <h2>{halfDays}</h2>
              </div>
              <div className="ldp-count-card red">
                <span className="ldp-count-label">Absent Days</span>
                <h2>{absentDays}</h2>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="ldp-table-container">
              <table className="ldp-attendance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Status</th>
                    <th>Hours</th>
                    <th>Advance (₹)</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {l.attendance.map((row, index) => {
                    let statusClass = '';
                    if (row.status === 'Present') statusClass = 'status-present';
                    else if (row.status === 'Half Day') statusClass = 'status-half';
                    else if (row.status === 'Absent') statusClass = 'status-absent';

                    return (
                      <tr key={index}>
                        <td>{row.date}</td>
                        <td>{row.day}</td>
                        <td>
                          <span className={`ldp-status-badge ${statusClass}`}>{row.status}</span>
                        </td>
                        <td>{row.hours.toFixed(1)}</td>
                        <td>₹ {row.advance}</td>
                        <td>{row.remarks}</td>
                      </tr>
                    );
                  })}
                  <tr className="ldp-table-total-row">
                    <td><strong>Total</strong></td>
                    <td>-</td>
                    <td>
                      <span className="ldp-total-badge green">{presentDays} Present</span>
                      <span className="ldp-total-badge orange">{halfDays} Half</span>
                      <span className="ldp-total-badge red">{absentDays} Absent</span>
                    </td>
                    <td>-</td>
                    <td><strong>₹ {totalAdvanceTable}</strong></td>
                    <td>-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom note */}
            <div className="ldp-note-box">
              <Info size={16} />
              <span>Note: 1 day = 8 working hours</span>
            </div>
          </div>
        )}

        {/* PAYMENTS TAB CONTENT */}
        {activeTab === 'payments' && (
          <div className="ldp-tab-content">
            <div className="ldp-tab-header-row">
              <h3>Payment History</h3>
            </div>

            {/* Payments Table */}
            <div className="ldp-table-container">
              <table className="ldp-payments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Payment Method</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {l.payments.map((pay, index) => (
                    <tr key={index}>
                      <td>{pay.date}</td>
                      <td>{pay.desc}</td>
                      <td className="ldp-amount-col">₹ {pay.amount.toLocaleString('en-IN')}</td>
                      <td>{pay.type}</td>
                      <td>
                        <span className="ldp-payment-status verified">{pay.status}</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="ldp-table-total-row">
                    <td><strong>Total Paid</strong></td>
                    <td>-</td>
                    <td className="ldp-amount-col"><strong>₹ {l.payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('en-IN')}</strong></td>
                    <td>-</td>
                    <td><span className="ldp-payment-status verified">Success</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="ldp-payment-info-box">
              <AlertCircle size={16} />
              <span>Remaining Pending Payout of <strong>₹ {s.pendingPayment.toLocaleString('en-IN')}</strong> will be disbursed at the end of the contract cycle.</span>
            </div>
          </div>
        )}
      </div>

    </DashboardLayout>
  );
};

export default LabourDetailPage;
