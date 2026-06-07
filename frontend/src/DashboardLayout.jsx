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

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
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
              <div className="avatar-circle">{initials}</div>
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
          <div className="header-right">
            <button className="notif-btn">
              <Bell size={20} />
              <span className="badge"></span>
            </button>
            <div
              className="avatar"
              style={{ backgroundColor: accentColor }}
              onClick={() => navigate(currentUser ? '/profile' : '/login')}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="dashboard-content">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
