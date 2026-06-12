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
  }, [id]);

  if (loading) {
    return <DashboardLayout pageTitle="Profile"><div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div></DashboardLayout>;
  }

  const c = labourData || {
    fullName: 'Ramesh Yadav',
    role: 'Mason',
    location: 'Belapur, Navi Mumbai',
    experience: '8 Years',
    phone: '+91 98765 43210',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80'
  };

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
              {c.fullName} <CheckCircle2 size={24} fill="#10b981" color="white" style={{ background: '#10b981', borderRadius: '50%' }} />
            </h1>
            <div style={{ fontSize: '1rem', color: '#64748b', fontWeight: '600', marginBottom: '0.8rem' }}>{c.role || 'Mason'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#475569', fontSize: '0.95rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={18} /> {c.location || 'Belapur, Navi Mumbai'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', fontWeight: '600' }}><Phone size={18} /> {c.phone || '+91 98765 43210'}</span>
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
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0f172a' }}>4.7</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                    <Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" /><Star size={14} fill="currentColor" opacity={0.5} />
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(32 Reviews)</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[
                  { name: 'Suresh Patil', time: '2 days ago', text: 'Very good work and very punctual.', img: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=50&q=80' },
                  { name: 'Vikram Singh', time: '1 week ago', text: 'Excellent work quality. Highly recommended.', img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=50&q=80' },
                  { name: 'Neha Sharma', time: '2 weeks ago', text: 'Good work and behavior.', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=50&q=80' },
                ].map((rev, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                    <img src={rev.img} alt={rev.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>{rev.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rev.time}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '2px', color: '#f59e0b', marginBottom: '4px' }}>
                        <Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" />
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569' }}>{rev.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default LabourDetailPage;
