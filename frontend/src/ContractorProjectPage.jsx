import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, ThumbsUp, Heart, Sparkles, MessageCircle, Send,
  Calendar, Star, CheckCircle2, Clock, Camera, CreditCard,
  X, Eye, Play, Smartphone, Building2, Briefcase, MapPin,
  ChevronDown, ChevronUp, FileText
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

/* ──────────────────────────────────────────
   MOCK DATA — based on the workflow image
   ────────────────────────────────────────── */

const MOCK_UPDATES = [
  {
    id: 1, step: 1,
    title: 'Quotation Uploaded',
    description: 'Initial quotation and project plan uploaded for client review and approval.',
    date: '10 Apr 2024', time: '10:30 AM',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=600&q=80',
    type: 'document',
    defaultReactions: { like: 2, love: 1, wow: 0 }
  },
  {
    id: 2, step: 2,
    title: 'RCC Work Completed',
    description: 'RCC work completed as per plan. Foundation and structure are solid and ready for the next phase.',
    date: '28 Apr 2024', time: '11:30 AM',
    image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
    type: 'milestone',
    defaultReactions: { like: 5, love: 3, wow: 2 }
  },
  {
    id: 3, step: 3,
    title: 'Brick Work Completed',
    description: 'Brick work completed across all rooms. Walls are up and ready for plastering and finishing.',
    date: '15 May 2024', time: '11:30 AM',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=600&q=80',
    type: 'milestone',
    defaultReactions: { like: 4, love: 2, wow: 1 }
  },
  {
    id: 4, step: 4,
    title: 'Plumbing Work Done',
    description: 'Plumbing work completed. All pipes laid, bathroom fittings installed and pressure tested.',
    date: '28 May 2024', time: '3:00 PM',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=600&q=80',
    type: 'update',
    defaultReactions: { like: 3, love: 1, wow: 0 }
  },
  {
    id: 5, step: 5,
    title: 'Tiles Work Started',
    description: 'Tiles work started in kitchen and bathrooms. Italian marble selected for flooring.',
    date: '05 Jun 2024', time: '9:00 AM',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
    type: 'update',
    defaultReactions: { like: 6, love: 4, wow: 3 }
  },
  {
    id: 6, step: 6,
    title: 'Project Completed',
    description: 'Project completed successfully! Final inspection done, all work verified. Handover ready.',
    date: '08 Jul 2024', time: '1:00 PM',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
    type: 'completion',
    defaultReactions: { like: 12, love: 8, wow: 5 }
  }
];

const MOCK_PAYMENTS = [
  { id: 'p1', title: 'RCC Work Payment', date: '01 May 2024', amount: 150000, status: 'Paid', method: 'Online' },
  { id: 'p2', title: 'Brick Work Payment', date: '20 May 2024', amount: 100000, status: 'Paid', method: 'Cash' },
  { id: 'p3', title: 'Plumbing Payment', date: '30 May 2024', amount: 100000, status: 'Paid', method: 'Online' },
  { id: 'p4', title: 'Tile Payment', date: '10 Jun 2024', amount: 85000, status: 'Paid', method: 'Cash' },
  { id: 'p5', title: 'Work Advance', date: '10 Apr 2024', amount: 65000, status: 'Paid', method: 'Cash' },
  { id: 'p6', title: 'Final Payment', date: 'Pending', amount: 350000, status: 'Pending', method: '—' }
];

const MOCK_PROJECT = {
  id: 'RJ12345',
  name: '2BHK Interior Project',
  status: 'In Progress',
  contractor: { name: 'Raj Construction', avatar: 'RC', avatarColor: '#3b82f6', rating: 4.7, reviews: 126 },
  startDate: '10 Apr 2024',
  endDate: '10 Jul 2024',
  totalAmount: 850000,
  paidAmount: 500000,
  pendingAmount: 350000
};

/* ──────────────────────────────────────────
   COMPONENT
   ────────────────────────────────────────── */

const ContractorProjectPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('updates');

  // Reactions: { [updateId]: { like: bool, love: bool, wow: bool } }
  const [reactions, setReactions] = useState({});

  // Replies
  const [replyOpenId, setReplyOpenId] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState({});

  // Payment modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payStep, setPayStep] = useState('method'); // method | cash | online | success
  const [cashAmount, setCashAmount] = useState('');
  const [selectedOnlineMethod, setSelectedOnlineMethod] = useState('');
  const [onlineAmount, setOnlineAmount] = useState('');

  // Review
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const project = MOCK_PROJECT;

  const fmt = (n) => '₹' + n.toLocaleString('en-IN');

  const handleReaction = (updateId, type) => {
    setReactions(prev => ({
      ...prev,
      [updateId]: { ...prev[updateId], [type]: !(prev[updateId]?.[type]) }
    }));
  };

  const getReactionCount = (update, type) => {
    const base = update.defaultReactions[type] || 0;
    const userToggled = reactions[update.id]?.[type] ? 1 : 0;
    return base + userToggled;
  };

  const handleSendReply = (updateId) => {
    if (!replyText.trim()) return;
    setReplies(prev => ({
      ...prev,
      [updateId]: [...(prev[updateId] || []), { text: replyText, time: 'Just now', sender: 'You' }]
    }));
    setReplyText('');
    setReplyOpenId(null);
  };

  const openPayModal = () => {
    setPayModalOpen(true);
    setPayStep('method');
    setCashAmount('');
    setOnlineAmount('');
    setSelectedOnlineMethod('');
  };

  const closePayModal = () => {
    setPayModalOpen(false);
    setPayStep('method');
  };

  const handleSubmitReview = () => {
    if (!reviewText.trim() || reviewRating === 0) return;
    setReviewSubmitted(true);
  };

  return (
    <DashboardLayout pageTitle={project.name} pageSubtitle={`Project #${project.id}`} accentColor="#3b82f6">

      {/* Back */}
      <button className="prof-page-back-nav" onClick={() => navigate(-1)}>
        <ArrowLeft size={18} /> Back to Profile
      </button>

      {/* ═══ PROJECT HEADER CARD ═══ */}
      <div className="cpm-header-card">
        <div className="cpm-header-top">
          <div className="cpm-header-left">
            <div className="cpm-title-row">
              <h1>{project.name}</h1>
              <span className="cpm-project-id">Project ID: #{project.id}</span>
            </div>
            <div className="cpm-contractor-row">
              <span className="cpm-label">Contractor:</span>
              <div className="cpm-contractor-avatar" style={{ background: project.contractor.avatarColor }}>
                {project.contractor.avatar}
              </div>
              <strong>{project.contractor.name}</strong>
              <button className="cpm-view-profile-link" onClick={() => navigate('/contractors')}>View Profile</button>
            </div>
            <div className="cpm-rating-row">
              <Star size={14} fill="#f59e0b" color="#f59e0b" />
              <strong>{project.contractor.rating}</strong>
              <span className="cpm-reviews-count">({project.contractor.reviews} Reviews)</span>
            </div>
          </div>
          <div className="cpm-header-right">
            <span className={`cpm-status-badge ${project.status === 'Completed' ? 'done' : 'progress'}`}>
              {project.status === 'In Progress' ? '● ' : '✓ '}{project.status}
            </span>
          </div>
        </div>

        <div className="cpm-header-meta-row">
          <div className="cpm-hm-item">
            <Calendar size={14} />
            <div><span>Start Date</span><strong>{project.startDate}</strong></div>
          </div>
          <div className="cpm-hm-item">
            <Calendar size={14} />
            <div><span>End Date (Est.)</span><strong>{project.endDate}</strong></div>
          </div>
          <div className="cpm-hm-item">
            <FileText size={14} />
            <div><span>Total Amount</span><strong>{fmt(project.totalAmount)}</strong></div>
          </div>
        </div>

        <div className="cpm-header-summary">
          <div className="cpm-amount-chip total"><span>Total</span><strong>{fmt(project.totalAmount)}</strong></div>
          <div className="cpm-amount-chip paid"><span>Paid</span><strong>{fmt(project.paidAmount)}</strong></div>
          <div className="cpm-amount-chip pending"><span>Pending</span><strong>{fmt(project.pendingAmount)}</strong></div>
          <button className="cpm-pay-now-btn" onClick={openPayModal}>Pay Now</button>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="cpm-tabs">
        <button className={`cpm-tab ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')}>
          <Camera size={16} /> Updates
        </button>
        <button className={`cpm-tab ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
          <CreditCard size={16} /> Payments
        </button>
      </div>

      {/* ═══ UPDATES TIMELINE ═══ */}
      {activeTab === 'updates' && (
        <div className="cpm-timeline">
          {MOCK_UPDATES.map((update, idx) => (
            <div key={update.id} className="cpm-timeline-item">
              {/* Step marker + connecting line */}
              <div className="cpm-timeline-marker">
                <div className={`cpm-step-circle ${update.type === 'completion' ? 'complete' : ''}`}>
                  {update.type === 'completion' ? <CheckCircle2 size={18} /> : update.step}
                </div>
                {idx < MOCK_UPDATES.length - 1 && <div className="cpm-timeline-line" />}
              </div>

              {/* Update card */}
              <div className="cpm-update-card">
                <div className="cpm-update-header">
                  <h3>{update.title}</h3>
                  <span className="cpm-update-date"><Clock size={12} /> {update.date} · {update.time}</span>
                </div>

                <img src={update.image} alt={update.title} className="cpm-update-image" />

                <p className="cpm-update-desc">{update.description}</p>

                {/* Reaction + Reply buttons */}
                <div className="cpm-reactions-row">
                  <button
                    className={`cpm-reaction-btn like ${reactions[update.id]?.like ? 'active' : ''}`}
                    onClick={() => handleReaction(update.id, 'like')}
                  >
                    <ThumbsUp size={14} /> Like <span className="count">{getReactionCount(update, 'like')}</span>
                  </button>
                  <button
                    className={`cpm-reaction-btn love ${reactions[update.id]?.love ? 'active' : ''}`}
                    onClick={() => handleReaction(update.id, 'love')}
                  >
                    <Heart size={14} /> Love <span className="count">{getReactionCount(update, 'love')}</span>
                  </button>
                  <button
                    className={`cpm-reaction-btn wow ${reactions[update.id]?.wow ? 'active' : ''}`}
                    onClick={() => handleReaction(update.id, 'wow')}
                  >
                    <Sparkles size={14} /> Wow <span className="count">{getReactionCount(update, 'wow')}</span>
                  </button>
                  <button
                    className="cpm-reaction-btn reply-toggle"
                    onClick={() => { setReplyOpenId(replyOpenId === update.id ? null : update.id); setReplyText(''); }}
                  >
                    <MessageCircle size={14} /> Reply {(replies[update.id]?.length || 0) > 0 && <span className="count">{replies[update.id].length}</span>}
                  </button>
                </div>

                {/* Existing replies */}
                {replies[update.id] && replies[update.id].length > 0 && (
                  <div className="cpm-replies-list">
                    {replies[update.id].map((r, i) => (
                      <div key={i} className="cpm-reply-bubble">
                        <div className="cpm-reply-avatar">{r.sender[0]}</div>
                        <div className="cpm-reply-body">
                          <strong>{r.sender}</strong>
                          <p>{r.text}</p>
                          <span className="cpm-reply-time">{r.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input */}
                {replyOpenId === update.id && (
                  <div className="cpm-reply-input">
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply(update.id)}
                      autoFocus
                    />
                    <button onClick={() => handleSendReply(update.id)} disabled={!replyText.trim()}>
                      <Send size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Home Owner Review Section */}
          <div className="cpm-timeline-item">
            <div className="cpm-timeline-marker">
              <div className="cpm-step-circle review-circle"><Star size={18} /></div>
            </div>
            <div className="cpm-update-card cpm-review-card">
              <h3>Home Owner Review</h3>
              <p className="cpm-review-subtitle">Rate and review this project to help other clients.</p>
              {!reviewSubmitted ? (
                <>
                  <div className="cpm-star-rating">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button key={s} className={`cpm-star-btn ${reviewRating >= s ? 'filled' : ''}`} onClick={() => setReviewRating(s)}>
                        <Star size={24} fill={reviewRating >= s ? '#f59e0b' : 'none'} color={reviewRating >= s ? '#f59e0b' : '#cbd5e1'} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="cpm-review-textarea"
                    placeholder="Share your experience with this contractor..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={3}
                  />
                  <button className="cpm-submit-review-btn" onClick={handleSubmitReview} disabled={!reviewText.trim() || reviewRating === 0}>
                    Submit Review
                  </button>
                </>
              ) : (
                <div className="cpm-review-submitted">
                  <CheckCircle2 size={32} color="#10b981" />
                  <p>Thank you for your review!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PAYMENTS TAB ═══ */}
      {activeTab === 'payments' && (
        <div className="cpm-payments-section">
          {/* Payment Summary */}
          <div className="cpm-payment-summary">
            <h3>Project Payment Summary</h3>
            <div className="cpm-ps-grid">
              <div className="cpm-ps-card total">
                <span>Total Project Amount</span>
                <strong>{fmt(project.totalAmount)}</strong>
              </div>
              <div className="cpm-ps-card paid">
                <span>Total Paid</span>
                <strong>{fmt(project.paidAmount)}</strong>
              </div>
              <div className="cpm-ps-card pending">
                <span>Pending Amount</span>
                <strong>{fmt(project.pendingAmount)}</strong>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="cpm-payment-history">
            <h3>Payment History</h3>
            <div className="cpm-ph-list">
              {MOCK_PAYMENTS.map(pay => (
                <div key={pay.id} className={`cpm-ph-row ${pay.status.toLowerCase()}`}>
                  <div className="cpm-ph-info">
                    <strong>{pay.title}</strong>
                    <span>{pay.date} {pay.method !== '—' ? `· ${pay.method}` : ''}</span>
                  </div>
                  <div className="cpm-ph-right">
                    <strong>{fmt(pay.amount)}</strong>
                    <span className={`cpm-ph-badge ${pay.status.toLowerCase()}`}>{pay.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="cpm-pay-now-btn full-width" onClick={openPayModal}>Pay Now</button>
        </div>
      )}

      {/* ═══ PAYMENT MODAL ═══ */}
      {payModalOpen && (
        <div className="cpm-modal-overlay" onClick={closePayModal}>
          <div className="cpm-modal" onClick={e => e.stopPropagation()}>
            <button className="cpm-modal-close" onClick={closePayModal}><X size={20} /></button>

            {/* Step 1: Choose Method */}
            {payStep === 'method' && (
              <div className="cpm-modal-body">
                <h2>Choose Payment Method</h2>
                <p className="cpm-modal-sub">How would you like to make this payment?</p>
                <div className="cpm-method-grid">
                  <button className="cpm-method-card" onClick={() => setPayStep('cash')}>
                    <div className="cpm-method-icon cash-icon"><FileText size={28} /></div>
                    <strong>Cash Payment</strong>
                    <span>Pay in cash and send confirmation to contractor</span>
                  </button>
                  <button className="cpm-method-card" onClick={() => setPayStep('online')}>
                    <div className="cpm-method-icon online-icon"><CreditCard size={28} /></div>
                    <strong>Online Payment</strong>
                    <span>Pay via UPI, Card, or Net Banking</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2a: Cash */}
            {payStep === 'cash' && (
              <div className="cpm-modal-body">
                <h2>Enter Cash Amount</h2>
                <p className="cpm-modal-sub">How much cash are you paying?</p>
                <div className="cpm-amount-input-group">
                  <span className="cpm-rupee">₹</span>
                  <input
                    type="number"
                    className="cpm-amount-input"
                    placeholder="25,000"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    autoFocus
                  />
                </div>
                <p className="cpm-info-note">After you confirm, a request will be sent to the contractor for verification.</p>
                <div className="cpm-modal-actions">
                  <button className="cpm-modal-back-btn" onClick={() => setPayStep('method')}>Back</button>
                  <button className="cpm-modal-confirm-btn" disabled={!cashAmount} onClick={() => setPayStep('success')}>
                    Confirm &amp; Send Request
                  </button>
                </div>
              </div>
            )}

            {/* Step 2b: Online */}
            {payStep === 'online' && (
              <div className="cpm-modal-body">
                <h2>Online Payment</h2>
                <p className="cpm-modal-sub">Choose your preferred method</p>
                <div className="cpm-online-options">
                  {[
                    { key: 'upi', icon: <Smartphone size={20} />, label: 'UPI / QR Code' },
                    { key: 'card', icon: <CreditCard size={20} />, label: 'Debit / Credit Card' },
                    { key: 'netbanking', icon: <Building2 size={20} />, label: 'Net Banking' },
                    { key: 'wallets', icon: <Briefcase size={20} />, label: 'Wallets' }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      className={`cpm-online-opt ${selectedOnlineMethod === opt.key ? 'selected' : ''}`}
                      onClick={() => setSelectedOnlineMethod(opt.key)}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
                {selectedOnlineMethod && (
                  <div className="cpm-online-amount-section">
                    <label>Enter Amount</label>
                    <div className="cpm-amount-input-group">
                      <span className="cpm-rupee">₹</span>
                      <input
                        type="number"
                        className="cpm-amount-input"
                        placeholder="25,000"
                        value={onlineAmount}
                        onChange={(e) => setOnlineAmount(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                )}
                <div className="cpm-modal-actions">
                  <button className="cpm-modal-back-btn" onClick={() => setPayStep('method')}>Back</button>
                  <button
                    className="cpm-modal-confirm-btn"
                    disabled={!selectedOnlineMethod || !onlineAmount}
                    onClick={() => setPayStep('success')}
                  >
                    Pay {onlineAmount ? `₹${parseInt(onlineAmount).toLocaleString('en-IN')}` : ''}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success */}
            {payStep === 'success' && (
              <div className="cpm-modal-body cpm-modal-success">
                <div className="cpm-success-circle">
                  <CheckCircle2 size={52} />
                </div>
                <h2>{cashAmount ? 'Cash Payment Request Sent!' : 'Payment Successful!'}</h2>
                <p className="cpm-success-amount">{fmt(parseInt(cashAmount || onlineAmount || 0))}</p>
                <p className="cpm-success-note">
                  {cashAmount
                    ? 'The contractor will verify and confirm the cash payment received.'
                    : 'Payment will be credited to the contractor after verification.'}
                </p>
                <button className="cpm-modal-confirm-btn" onClick={closePayModal}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default ContractorProjectPage;
