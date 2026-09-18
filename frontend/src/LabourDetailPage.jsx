import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, CheckCircle2, Star, MapPin, 
  Phone, MessageCircle, Briefcase, PlayCircle, Users,
  Clock, Map, Calendar
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const LabourDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [labourData, setLabourData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workHistory, setWorkHistory] = useState([]);
  const [selectedWorkJob, setSelectedWorkJob] = useState(null);
  const [showWorkDetailsModal, setShowWorkDetailsModal] = useState(false);

  useEffect(() => {
    fetch(`https://allver.onrender.com/api/professional/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.professional) {
          setLabourData(data.professional);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch(`/api/jobs/history/user/${id}?role=worker`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.jobs)) {
          setWorkHistory(data.jobs);
        }
      })
      .catch(() => {});
  }, [id]);

  if (loading) {
    return <DashboardLayout pageTitle="Profile"><div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div></DashboardLayout>;
  }

  if (!labourData) {
    return (
      <DashboardLayout pageTitle="Worker Not Found" accentColor="#10b981">
        <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'white', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '1.5rem', color: '#0f172a' }}>Worker Profile Not Available</h3>
          <p style={{ color: '#64748b', marginTop: '8px' }}>The requested worker profile could not be found or has not registered yet.</p>
        </div>
      </DashboardLayout>
    );
  }

  const c = labourData;
  const avatarLetter = (c.fullName || 'L')[0].toUpperCase();

  return (
    <DashboardLayout pageTitle="Labour Profile" accentColor="#10b981">
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        
        {/* Cover Image */}
        <div style={{ position: 'relative', height: '250px', width: '100%', background: '#f1f5f9' }}>
          <img 
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80" 
            alt="Cover" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>

        {/* Profile Content */}
        <div style={{ padding: '0 3rem 3rem', marginTop: '-60px', position: 'relative' }}>
          
          {/* Top Row: Avatar & Stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt={c.fullName} style={{ width: '140px', height: '140px', borderRadius: '50%', objectFit: 'cover', border: '5px solid white', background: 'white' }} />
              ) : (
                <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', fontWeight: 'bold', color: 'white', border: '5px solid white' }}>{avatarLetter}</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem' }}>
              <button style={{ padding: '0.6rem 1.2rem', background: 'white', border: '1px solid #3b82f6', borderRadius: '8px', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', cursor: 'pointer' }}>
                <Users size={16} /> Follow
              </button>
              <div style={{ padding: '0.6rem 1.2rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={16} color="#64748b" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', lineHeight: 1 }}>256</span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Followers</span>
                </div>
              </div>
              <div style={{ padding: '0.8rem 1.2rem', background: '#f0fdf4', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div> Available
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Available for work</span>
              </div>
            </div>
          </div>

          {/* Info Details */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {c.fullName} {c.isVerified && <CheckCircle2 size={24} fill="#10b981" color="white" style={{ background: '#10b981', borderRadius: '50%' }} />}
            </h1>
            <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: '600', marginBottom: '0.8rem' }}>{c.role || c.skillType || 'Skilled Labour'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#475569', fontSize: '0.95rem' }}>
              {(c.location || c.city) && <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} /> {c.location || c.city}</span>}
              {(c.phone || c.phoneNumber) && <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: '600' }}><Phone size={18} /> {c.phone || c.phoneNumber}</span>}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
            <button style={{ flex: 1, padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
              <Phone size={20} color="#16a34a" /> Call
            </button>
            <button style={{ flex: 1, padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: '600', color: '#0f172a', cursor: 'pointer' }}>
              <MessageCircle size={20} color="#16a34a" /> WhatsApp
            </button>
            <button style={{ flex: 1, padding: '1rem', background: '#16a34a', border: 'none', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: '600', color: 'white', cursor: 'pointer' }}>
              <Briefcase size={20} /> Hire Worker
            </button>
          </div>

          {/* 4-Column Stats Box */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: '#fafbfd', border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
              <Briefcase size={24} color="#64748b" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Skill Type</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>{c.role || 'Mason'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
              <Calendar size={24} color="#64748b" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Experience</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>{c.experience || '8 Years'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
              <MapPin size={24} color="#64748b" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Location</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>{c.location || 'Belapur, Navi Mumbai'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <Clock size={24} color="#64748b" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>Availability</div>
              <div style={{ fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>Available</div>
            </div>
          </div>

          {/* Skills */}
          <div style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1rem 0' }}>Skills</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              {['Brick Work', 'RCC Work', 'Plaster Work', 'Tile Work', 'Wall Construction'].map((skill, i) => (
                <span key={i} style={{ padding: '0.6rem 1.2rem', background: '#f0fdf4', color: '#166534', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', border: '1px solid #dcfce7' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* About Me */}
          <div style={{ marginBottom: '3rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1rem 0' }}>About Me</h3>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: '1.6', margin: 0, maxWidth: '800px' }}>
              I am an experienced mason. I do all types of brick work, RCC work and plaster work. I always complete work on time with good quality.
            </p>
          </div>

          {/* WORK HISTORY */}
          <div style={{ marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#64748b', letterSpacing: '0.05em', margin: 0 }}>
                WORK HISTORY
              </h3>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
            </div>

            {workHistory.length === 0 ? (
              <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b' }}>
                <Briefcase size={32} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>No completed work history yet</div>
                <div style={{ fontSize: '0.85rem' }}>Completed projects and verified work will appear here automatically.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {workHistory.map(job => (
                  <div key={job.id || job.jobId} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>{job.service || job.title}</h4>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', background: '#dcfce7', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                        Completed · {job.completedDateFormatted || 'Recently'}
                      </span>
                    </div>

                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Duration:</span>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{job.duration || 'Completed'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Location:</span>
                        <span style={{ fontWeight: '600', color: '#0f172a' }}>{job.location || 'Mumbai'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Project value:</span>
                        <span style={{ fontWeight: '800', color: '#0f172a' }}>{job.projectValueFormatted || `₹${(job.projectValue || 0).toLocaleString('en-IN')}`}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b' }}>Rating:</span>
                        <span style={{ fontWeight: '700', color: '#f59e0b' }}>⭐ {job.rating || 4.8}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setSelectedWorkJob(job);
                        setShowWorkDetailsModal(true);
                      }}
                      style={{ width: '100%', padding: '0.6rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', color: '#2563eb', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      View Work Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2-Column Grid for Media & Reviews */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            
            {/* Photos & Videos */}
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Photos & Videos</h3>
                <span style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>View All</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1' }}>
                  <img src="https://images.unsplash.com/photo-1541888086225-b467ec4c0677?auto=format&fit=crop&w=300&q=80" alt="Work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1' }}>
                  <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80" alt="Work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <PlayCircle size={32} color="white" style={{ position: 'absolute', top: '10px', left: '10px', opacity: 0.9 }} />
                </div>
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1' }}>
                  <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=300&q=80" alt="Work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1' }}>
                  <img src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=300&q=80" alt="Work" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <PlayCircle size={32} color="white" style={{ position: 'absolute', top: '10px', left: '10px', opacity: 0.9 }} />
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Reviews</h3>
                <span style={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>View All</span>
              </div>
              {c.reviews && c.reviews.length > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a' }}>{c.rating || '5.0'}</span>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                        <Star size={14} fill="currentColor" />
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({c.reviews.length} {c.reviews.length === 1 ? 'Review' : 'Reviews'})</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {c.reviews.map((rev, i) => (
                      <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#64748b' }}>
                          {(rev.name || 'U')[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{rev.name || 'Client'}</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rev.time || ''}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', marginBottom: '4px' }}>
                            {[...Array(rev.rating || 5)].map((_, si) => (
                              <Star key={si} size={12} fill="currentColor" />
                            ))}
                          </div>
                          <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{rev.text || rev.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
                  <Star size={24} color="#94a3b8" style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>No reviews yet</p>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Verified reviews from completed jobs will appear here</span>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Work Details Modal */}
      {showWorkDetailsModal && selectedWorkJob && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Completed Work Details</h3>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Verified Service Record</div>
              </div>
              <button 
                onClick={() => setShowWorkDetailsModal(false)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '1.1rem', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <div style={{ textAlign: 'center', padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', marginBottom: '1.25rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: '1.5rem', fontWeight: 'bold' }}>✓</div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a' }}>{selectedWorkJob.service || selectedWorkJob.title}</h4>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#16a34a' }}>Completed · {selectedWorkJob.completedDateFormatted}</span>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', fontSize: '0.9rem', marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Duration</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{selectedWorkJob.duration || 'Completed'}</span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Location</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>{selectedWorkJob.location || 'Mumbai'}</span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Project Value</span>
                <span style={{ fontWeight: '800', color: '#0f172a' }}>{selectedWorkJob.projectValueFormatted || `₹${(selectedWorkJob.projectValue || 0).toLocaleString('en-IN')}`}</span>
              </div>
              <div style={{ height: '1px', background: '#f1f5f9' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Customer Rating</span>
                <span style={{ fontWeight: '700', color: '#f59e0b' }}>⭐ {selectedWorkJob.rating || 4.8} / 5.0</span>
              </div>
              {selectedWorkJob.receiptNumber && (
                <>
                  <div style={{ height: '1px', background: '#f1f5f9' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Receipt No.</span>
                    <span style={{ fontWeight: '700', color: '#2563eb' }}>{selectedWorkJob.receiptNumber}</span>
                  </div>
                </>
              )}
              {selectedWorkJob.paymentMethod && (
                <>
                  <div style={{ height: '1px', background: '#f1f5f9' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Payment Method</span>
                    <span style={{ fontWeight: '600', color: '#0f172a' }}>{selectedWorkJob.paymentMethod}</span>
                  </div>
                </>
              )}
            </div>

            {selectedWorkJob.review && (
              <div style={{ marginBottom: '1.25rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Customer Review</div>
                <div style={{ fontSize: '0.85rem', color: '#334155', fontStyle: 'italic' }}>"{selectedWorkJob.review}"</div>
              </div>
            )}

            <button
              onClick={() => setShowWorkDetailsModal(false)}
              style={{ width: '100%', padding: '0.8rem', background: '#0f172a', color: 'white', borderRadius: '10px', border: 'none', fontWeight: '800', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default LabourDetailPage;
