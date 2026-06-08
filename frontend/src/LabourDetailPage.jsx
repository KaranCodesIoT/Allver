import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Star, CheckCircle2, MapPin, Briefcase, Calendar,
  MessageCircle, Plus, Info, ChevronLeft, ChevronRight, MoreVertical,
  DollarSign, Clock, AlertCircle
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';



const LabourDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('attendance');
  const [labourData, setLabourData] = useState(null);
  const [loading, setLoading] = useState(true);

  // States for interactive month navigation
  const [selectedMonth, setSelectedMonth] = useState('May 2024');

  useEffect(() => {
    // Fetch from API
    fetch(`http://localhost:5000/api/professional/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.professional) {
          const prof = data.professional;
          setLabourData({
            id: prof._id,
            fullName: prof.fullName,
            role: prof.skillType || 'Skilled Labourer',
            city: prof.city || 'India',
            experience: prof.experience || 'Not specified',
            rating: prof.rating || 0,
            reviews: prof.reviews || 0,
            avatar: prof.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'L',
            avatarColor: '#f59e0b',
            img: prof.avatarUrl || '',
            verified: true,
            stats: { daysWorked: 0, totalPayment: 0, advanceGiven: 0, pendingPayment: 0 },
            attendance: [],
            payments: []
          });
        } else {
          setLabourData(null);
        }
        setLoading(false);
      })
      .catch(() => {
        setLabourData(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Labour Profile" pageSubtitle="Loading profile..." accentColor="#f59e0b">
        <div className="ldp-loading">Loading labour profile...</div>
      </DashboardLayout>
    );
  }

  if (!labourData) {
    return (
      <DashboardLayout pageTitle="Labour Profile" pageSubtitle="Profile not found" accentColor="#f59e0b">
        <div className="ldp-loading">
          <p>Labour profile not found.</p>
          <button className="prof-page-back-nav" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> Back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const l = labourData;
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
