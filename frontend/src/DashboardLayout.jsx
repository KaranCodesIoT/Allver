import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Sparkles, Compass, MessageCircle,
  User, LogOut, Bell, HardHat, Hammer
} from 'lucide-react';
import allverLogo from './assets/allver-logo.svg';

const DashboardLayout = ({ children, pageTitle, pageSubtitle, accentColor = '#10b981' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [contractRequests, setContractRequests] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const fetchNotifications = async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/contract-requests/user/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setContractRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const u = JSON.parse(userStr);
      setCurrentUser(u);
      fetchNotifications(u._id);
      
      const interval = setInterval(() => fetchNotifications(u._id), 8000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      const response = await fetch(`http://localhost:5000/api/contract-requests/${requestId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });
      
      const data = await response.json();
      if (response.ok) {
        setShowNotifDropdown(false);
        if (currentUser) {
          fetchNotifications(currentUser._id);
        }
        
        if (status === 'Accepted' && data.workspace) {
          alert(`Contract request accepted! Redirecting to workspace...`);
          // Navigate to home and select the workspaces tab
          navigate('/', { state: { activeTab: 'workspaces', selectedWorkspace: data.workspace._id } });
        } else {
          alert(`Contract request ${status.toLowerCase()}!`);
        }
      } else {
        alert(data.message || 'Failed to update request');
      }
    } catch (err) {
      console.error('Error updating request status:', err);
    }
  };

  const navItems = [
    { key: 'home', path: '/', icon: Layout, label: 'Home' },
    { key: 'feed', path: '/feed', icon: Sparkles, label: 'Feed' },
    { key: 'architects', path: '/architects', icon: Compass, label: 'Architects' },
    { key: 'contractors', path: '/contractors', icon: HardHat, label: 'Contractors' },
    { key: 'labour', path: '/labour', icon: Hammer, label: 'Labour' },
    { key: 'chats', path: '/chats', icon: MessageCircle, label: 'Chats' },
    { key: 'profile', path: '/profile', icon: User, label: 'Profile' },
  ];

  const isActive = (item) => {
    return location.pathname === item.path;
  };

  const handleNavClick = (item) => {
    if (item.path === '/architects' || item.path === '/contractors' || item.path === '/labour' || item.path === '/profile') {
      navigate(item.path);
    } else {
      // Navigate to '/' and tell Home.jsx to activate the specific tab
      navigate('/', { state: { activeTab: item.key } });
    }
  };

  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="dashboard-container">
      {/* ── Left Sidebar ── */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src={allverLogo} alt="Allver" className="brand-logo-svg" />
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`sidebar-nav-item ${isActive(item) ? 'active' : ''}`}
                onClick={() => handleNavClick(item)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {currentUser && (
            <div className="user-badge">
              <div className="avatar-circle">
                {initials.includes('Q') ? <User size={16} /> : initials}
              </div>
              <div className="user-details">
                <span className="name">{currentUser.fullName}</span>
                <span className="role">{currentUser.role}</span>
              </div>
            </div>
          )}
          {currentUser ? (
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          ) : (
            <button className="logout-btn" onClick={() => navigate('/login')}>
              <User size={18} />
              <span>Login</span>
            </button>
          )}
        </div>
      </aside>

      {/* ── Main Area ── */}
      <main className="dashboard-main">
        {/* Top Header */}
        <header className="dashboard-header">
          <div className="listing-page-title-block">
            <h2 style={{ color: 'var(--text-dark)' }}>{pageTitle}</h2>
            <p className="subtitle">{pageSubtitle}</p>
          </div>
          <div className="header-right" style={{ position: 'relative' }}>
            <button 
              className="notif-btn"
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              style={{ position: 'relative' }}
            >
              <Bell size={20} />
              {contractRequests.filter(r => r.status === 'Pending' && r.professional && (r.professional._id || r.professional || '').toString() === (currentUser?._id || '').toString()).length > 0 && (
                <span className="badge" style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }}></span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="notif-dropdown" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                width: '340px',
                background: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                maxHeight: '400px',
                overflowY: 'auto',
                marginTop: '0.5rem',
                padding: '0.5rem 0',
                textAlign: 'left'
              }}>
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', fontWeight: 'bold', fontSize: '0.9rem', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Notifications</span>
                  <button 
                    onClick={() => setShowNotifDropdown(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem' }}
                  >
                    Close
                  </button>
                </div>

                {contractRequests.filter(r => {
                  const profId = (r.professional?._id || r.professional || '').toString();
                  const clientId = (r.client?._id || r.client || '').toString();
                  const currentId = (currentUser?._id || '').toString();
                  return (profId === currentId && r.status === 'Pending') || clientId === currentId;
                }).length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '1.5rem', margin: 0 }}>No new notifications</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {contractRequests.map(req => {
                      const reqProfId = (req.professional?._id || req.professional || '').toString();
                      const isProfessional = reqProfId && currentUser?._id && reqProfId === currentUser._id.toString();
                      
                      if (isProfessional && req.status === 'Pending') {
                        return (
                          <div key={req._id} style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#1e40af', background: '#eff6ff', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', width: 'fit-content' }}>
                              New Work Request
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: '1.4' }}>
                              <strong>From:</strong> {req.client?.fullName || 'Someone'}
                            </div>
                            <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontWeight: '600' }}>Project: {req.title}</div>
                              <div>Location: {req.location}</div>
                              <div>Budget: {req.budget}</div>
                              {req.description && <div style={{ marginTop: '2px', borderTop: '1px solid #e2e8f0', paddingTop: '2px' }}>Description: {req.description}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                              <button 
                                onClick={() => handleRequestAction(req._id, 'Accepted')}
                                style={{ flex: 1, padding: '0.35rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                              >
                                Accept Discussion
                              </button>
                              <button 
                                onClick={() => handleRequestAction(req._id, 'Rejected')}
                                style={{ flex: 1, padding: '0.35rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer' }}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        );
                      } else {
                        // User's own sent request status
                        return (
                          <div key={req._id} style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ fontSize: '0.82rem', color: '#334155' }}>
                              💼 Request for <strong>{req.title}</strong>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              Sent to: {req.professional?.fullName || 'Professional'}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                              Status: <span style={{
                                fontWeight: 'bold',
                                color: req.status === 'Accepted' ? '#10b981' : req.status === 'Rejected' ? '#ef4444' : '#f59e0b'
                              }}>{req.status}</span>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
            )}

            <div
              className="avatar"
              style={{ backgroundColor: accentColor }}
              onClick={() => navigate(currentUser ? '/profile' : '/login')}
            >
              {initials.includes('Q') ? <User size={16} /> : initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="dashboard-content">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation Bar ── */}
      <nav className="mobile-bottom-nav">
        <button className={`mobile-nav-item ${location.pathname === '/' && (!location.state || location.state.activeTab === 'home') ? 'active' : ''}`} onClick={() => navigate('/', { state: { activeTab: 'home' } })}>
          <Layout size={22} />
          <span>Home</span>
        </button>
        <button className={`mobile-nav-item ${location.state?.activeTab === 'feed' ? 'active' : ''}`} onClick={() => navigate('/', { state: { activeTab: 'feed' } })}>
          <Sparkles size={22} />
          <span>Feed</span>
        </button>
        <button className={`mobile-nav-item ${location.pathname === '/architects' ? 'active' : ''}`} onClick={() => navigate('/architects')}>
          <Compass size={22} />
          <span>Design</span>
        </button>
        <button className={`mobile-nav-item ${location.state?.activeTab === 'chats' ? 'active' : ''}`} onClick={() => navigate('/', { state: { activeTab: 'chats' } })}>
          <div style={{ position: 'relative', display: 'inline-flex' }}>
            <MessageCircle size={22} />
            <span className="mobile-chats-badge"></span>
          </div>
          <span>Chats</span>
        </button>
        <button className={`mobile-nav-item ${location.pathname === '/profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
          <User size={22} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default DashboardLayout;
