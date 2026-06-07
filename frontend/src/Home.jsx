import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  HardHat, 
  Hammer, 
  Layout, 
  Drill, 
  Truck, 
  ArrowRight,
  Shield,
  Search,
  MessageCircle,
  CheckCircle2,
  Bell,
  User,
  Menu,
  Construction,
  LogOut,
  Sparkles,
  Send,
  MapPin,
  Building2,
  Calendar,
  Briefcase
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// Import Assets for Public Landing Page
import welcomeHero from './assets/welcome_hero.png';
import architectImg from './assets/architect_home.png';
import contractorImg from './assets/contractor_site.png';
import labourImg from './assets/labour_working.png';
import allverLogo from './assets/allver-logo.svg';

const ROLE_ROUTES = { Architect: '/architects', Contractor: '/contractors', Labour: '/labour' };

const RoleCard = ({ image, title, description, color, bgColor, icon: Icon }) => {
  const navigate = useNavigate();
  return (
    <div className="role-card" style={{ backgroundColor: bgColor, cursor: 'pointer' }} onClick={() => navigate(ROLE_ROUTES[title] || '/')}>
      <img src={image} alt={title} />
      <div className="role-title" style={{ color: color }}>
        <Icon size={28} />
        <span>{title}</span>
      </div>
      <p className="role-desc">{description}</p>
      <button className="role-link" style={{ color: color, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', padding: 0 }}>
        Explore Professionals <ArrowRight size={20} />
      </button>
    </div>
  );
};

const CategoryCard = ({ icon: Icon, label }) => (
  <div className="category-card">
    <div className="icon-box">
      <Icon size={32} />
    </div>
    <h3>{label}</h3>
    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
      Find vetted experts in {label.toLowerCase()}
    </p>
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'feed', 'design', 'chats', 'profile'
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (location.state?.activeTab) {
      if (location.state.activeTab === 'profile') {
        navigate('/profile');
      } else {
        setActiveTab(location.state.activeTab);
      }
    }
  }, [location.state, navigate]);

  // Chats mock state
  const [activeChat, setActiveChat] = useState(0);
  const [chatMessage, setChatMessage] = useState('');
  const [chatThreads, setChatThreads] = useState([
    {
      id: 1,
      name: 'Rohan Mehta (Architect)',
      avatar: 'RM',
      lastMsg: 'I have updated the blueprint drafts for the duplex project.',
      time: '10:30 AM',
      messages: [
        { sender: 'other', text: 'Hi, I received the site measurements. Let me start the layout drafting.', time: 'Yesterday' },
        { sender: 'me', text: 'Sounds good! Keep the garden space in mind.', time: 'Yesterday' },
        { sender: 'other', text: 'Yes, definitely. I have updated the blueprint drafts for the duplex project. Let me know when we can review them.', time: '10:30 AM' }
      ]
    },
    {
      id: 2,
      name: 'Vikram Singh (Contractor)',
      avatar: 'VS',
      lastMsg: 'The cement supplies will arrive on site tomorrow morning.',
      time: 'Yesterday',
      messages: [
        { sender: 'other', text: 'The excavators have completed the grading work.', time: '2 days ago' },
        { sender: 'me', text: 'Excellent. When is the concrete pouring scheduled?', time: '2 days ago' },
        { sender: 'other', text: 'The cement supplies will arrive on site tomorrow morning.', time: 'Yesterday' }
      ]
    },
    {
      id: 3,
      name: 'Amit Kumar (Mason)',
      avatar: 'AK',
      lastMsg: 'I will be available for work from Monday next week.',
      time: 'May 30',
      messages: [
        { sender: 'me', text: 'Hi Amit, do you have experience with slate tiling?', time: 'May 30' },
        { sender: 'other', text: 'Yes, I have completed three slate tiling projects recently. I will be available for work from Monday next week.', time: 'May 30' }
      ]
    }
  ]);

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
    
    fetch('http://localhost:5000/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setActiveTab('home');
    navigate('/');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const updatedThreads = [...chatThreads];
    updatedThreads[activeChat].messages.push({
      sender: 'me',
      text: chatMessage,
      time: 'Just Now'
    });
    updatedThreads[activeChat].lastMsg = chatMessage;
    updatedThreads[activeChat].time = 'Just Now';
    
    setChatThreads(updatedThreads);
    setChatMessage('');
  };

  // If user is logged in, show the Dashboard layout
  if (currentUser) {
    return (
      <div className="dashboard-container">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-brand">
            <img src={allverLogo} alt="Allver" className="brand-logo-svg" />
          </div>

          <nav className="sidebar-nav">
            <button 
              className={`sidebar-nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <Layout size={20} />
              <span>Home</span>
            </button>
            <button 
              className={`sidebar-nav-item ${activeTab === 'feed' ? 'active' : ''}`}
              onClick={() => setActiveTab('feed')}
            >
              <Sparkles size={20} />
              <span>Feed</span>
            </button>
            <button 
              className={`sidebar-nav-item ${activeTab === 'design' ? 'active' : ''}`}
              onClick={() => setActiveTab('design')}
            >
              <Compass size={20} />
              <span>Design</span>
            </button>
            <button 
              className={`sidebar-nav-item ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              <MessageCircle size={20} />
              <span>Chats</span>
            </button>
            <button 
              className={`sidebar-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => navigate('/profile')}
            >
              <User size={20} />
              <span>Profile</span>
            </button>
          </nav>

          <div className="sidebar-footer">
            <div className="user-badge">
              <div className="avatar-circle">
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="user-details">
                <span className="name">{currentUser.fullName}</span>
                <span className="role">{currentUser.role}</span>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {/* Top Navbar */}
          <header className="dashboard-header">
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input type="text" placeholder="Search projects, blueprints, professionals..." />
            </div>
            <div className="header-right">
              <button className="notif-btn">
                <Bell size={20} />
                <span className="badge"></span>
              </button>
              <div className="avatar" onClick={() => navigate('/profile')}>
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
          </header>

          {/* Tab Selection Panels */}
          <div className="dashboard-content">
            
            {/* HOME TAB - EXACTLY AS THE USER IMAGE 5 */}
            {activeTab === 'home' && (
              <div className="tab-pane home-tab">
                {/* Welcome Card Banner */}
                <div className="welcome-banner">
                  <div className="banner-left">
                    <h2>Hi, Welcome!</h2>
                    <p>Find trusted professionals for your construction needs</p>
                  </div>
                  <div className="banner-right">
                    {/* SVG Illustration of Construction Scaffold / Crane */}
                    <svg viewBox="0 0 220 120" className="banner-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="20" y1="100" x2="200" y2="100" stroke="#d1d5db" strokeWidth="3" strokeLinecap="round" />
                      <line x1="160" y1="100" x2="160" y2="20" stroke="#cbd5e1" strokeWidth="4" />
                      <line x1="130" y1="100" x2="160" y2="20" stroke="#cbd5e1" strokeWidth="2" />
                      <line x1="190" y1="100" x2="160" y2="20" stroke="#cbd5e1" strokeWidth="2" />
                      <path d="M160 20 L50 20 L50 30 L160 25" fill="#3b82f6" />
                      <line x1="50" y1="25" x2="160" y2="25" stroke="#1e293b" strokeWidth="3" />
                      <line x1="70" y1="25" x2="70" y2="55" stroke="#64748b" strokeWidth="1.5" />
                      <rect x="62" y="55" width="16" height="16" rx="2" fill="#f59e0b" />
                      <circle cx="160" cy="20" r="6" fill="#1e293b" />
                      <path d="M90 100 L110 70 L130 100" stroke="#cbd5e1" strokeWidth="2" />
                      <rect x="98" y="70" width="24" height="30" fill="#e2e8f0" stroke="#94a3b8" />
                      <rect x="104" y="76" width="4" height="6" fill="#cbd5e1" />
                      <rect x="112" y="76" width="4" height="6" fill="#cbd5e1" />
                    </svg>
                  </div>
                </div>

                {/* Choose Your Role Cards Section */}
                <section className="dashboard-section">
                  <h3 className="section-title">Choose Your Role</h3>
                  <div className="role-illustration-grid">
                    {/* Architect Card */}
                    <div className="role-illustration-card green" onClick={() => navigate('/architects')} style={{ cursor: 'pointer' }}>
                      <div className="card-top-img">
                        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="40" y="30" width="120" height="70" rx="8" fill="#e6f4ea" stroke="#a7f3d0" strokeWidth="2" />
                          <line x1="40" y1="80" x2="160" y2="80" stroke="#a7f3d0" strokeWidth="1.5" />
                          <circle cx="65" cy="55" r="12" fill="#34d399" />
                          <path d="M60 55 L70 55 M65 50 L65 60" stroke="white" strokeWidth="2" />
                          <line x1="95" y1="50" x2="145" y2="50" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                          <line x1="95" y1="62" x2="130" y2="62" stroke="#667085" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="card-body">
                        <div className="badge-header green">
                          <Compass size={18} />
                          <span>Architect</span>
                        </div>
                        <p className="card-subtitle">Tap to browse architects</p>
                        <button className="arrow-action-btn green" onClick={(e) => { e.stopPropagation(); navigate('/architects'); }}>
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Contractor Card */}
                    <div className="role-illustration-card blue" onClick={() => navigate('/contractors')} style={{ cursor: 'pointer' }}>
                      <div className="card-top-img">
                        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="30" y="20" width="140" height="80" rx="8" fill="#ebf5ff" stroke="#bfdbfe" strokeWidth="2" />
                          <path d="M50 40 L80 80 L110 40" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="135" cy="50" r="16" fill="#60a5fa" />
                          <path d="M130 50 L140 50" stroke="white" strokeWidth="3" />
                        </svg>
                      </div>
                      <div className="card-body">
                        <div className="badge-header blue">
                          <HardHat size={18} />
                          <span>Contractor</span>
                        </div>
                        <p className="card-subtitle">Tap to browse contractors</p>
                        <button className="arrow-action-btn blue" onClick={(e) => { e.stopPropagation(); navigate('/contractors'); }}>
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Labour Card */}
                    <div className="role-illustration-card orange" onClick={() => navigate('/labour')} style={{ cursor: 'pointer' }}>
                      <div className="card-top-img">
                        <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="40" y="40" width="120" height="60" rx="6" fill="#fff7ed" stroke="#fed7aa" strokeWidth="2" />
                          <line x1="50" y1="70" x2="150" y2="70" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
                          <rect x="65" y="52" width="20" height="12" rx="2" fill="#fdba74" />
                          <rect x="95" y="52" width="20" height="12" rx="2" fill="#fdba74" />
                        </svg>
                      </div>
                      <div className="card-body">
                        <div className="badge-header orange">
                          <Hammer size={18} />
                          <span>Labour</span>
                        </div>
                        <p className="card-subtitle">Tap to browse skilled workers</p>
                        <button className="arrow-action-btn orange" onClick={(e) => { e.stopPropagation(); navigate('/labour'); }}>
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Popular Categories Section */}
                <section className="dashboard-section">
                  <h3 className="section-title">Popular Categories</h3>
                  <div className="popular-categories-grid">
                    <div className="pop-cat-card">
                      <div className="cat-icon-wrapper green">
                        <Layout size={24} />
                      </div>
                      <h4>Architecture</h4>
                    </div>

                    <div className="pop-cat-card">
                      <div className="cat-icon-wrapper blue">
                        <Hammer size={24} />
                      </div>
                      <h4>Construction</h4>
                    </div>

                    <div className="pop-cat-card">
                      <div className="cat-icon-wrapper orange">
                        <Drill size={24} />
                      </div>
                      <h4>Renovation</h4>
                    </div>

                    <div className="pop-cat-card">
                      <div className="cat-icon-wrapper purple">
                        <Truck size={24} />
                      </div>
                      <h4>Services</h4>
                    </div>
                  </div>
                </section>

                {/* How It Works Section */}
                <section className="dashboard-section">
                  <h3 className="section-title">How It Works</h3>
                  <div className="how-it-works-timeline">
                    <div className="timeline-step">
                      <div className="step-badge icon-only">
                        <User size={20} />
                      </div>
                      <h5>1. Choose Role</h5>
                      <p>Select your role and get started</p>
                    </div>

                    <div className="timeline-connector"></div>

                    <div className="timeline-step">
                      <div className="step-badge icon-only search-icon">
                        <Search size={20} />
                      </div>
                      <h5>2. Find & Connect</h5>
                      <p>Find and connect with trusted professionals</p>
                    </div>

                    <div className="timeline-connector"></div>

                    <div className="timeline-step">
                      <div className="step-badge icon-only chat-icon">
                        <MessageCircle size={20} />
                      </div>
                      <h5>3. Discuss</h5>
                      <p>Discuss your project requirements</p>
                    </div>

                    <div className="timeline-connector"></div>

                    <div className="timeline-step">
                      <div className="step-badge icon-only start-icon">
                        <CheckCircle2 size={20} />
                      </div>
                      <h5>4. Get Started</h5>
                      <p>Start your project with confidence</p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* FEED TAB - Renders feed of recent projects and achievements */}
            {activeTab === 'feed' && (
              <div className="tab-pane feed-tab">
                <div className="section-header-row">
                  <div>
                    <h2>Project Feed</h2>
                    <p className="subtitle">Real-time updates and portfolio highlights from the community</p>
                  </div>
                  <button className="btn-get-started">+ Post Update</button>
                </div>

                <div className="feed-list">
                  <div className="feed-card">
                    <div className="feed-user">
                      <div className="avatar-circle">RM</div>
                      <div className="user-info">
                        <strong>Rohan Mehta (Architect)</strong>
                        <span>Uploaded a new design blueprint • 2 hours ago</span>
                      </div>
                    </div>
                    <p className="feed-text">
                      Just wrapped up the schematic layouts for the Sea Breeze Villa in Alibaug. Focus was on open layouts, natural light, and passive cooling. Let me know your thoughts!
                    </p>
                    <div className="feed-image">
                      <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80" alt="Blueprint design" />
                    </div>
                  </div>

                  <div className="feed-card">
                    <div className="feed-user">
                      <div className="avatar-circle blue-avatar">VS</div>
                      <div className="user-info">
                        <strong>Vikram Singh (Contractor)</strong>
                        <span>Completed foundation phase • 1 day ago</span>
                      </div>
                    </div>
                    <p className="feed-text">
                      Pouring completed successfully for the new commercial arcade in Thane. Super proud of the team for staying ahead of schedule before the monsoon starts!
                    </p>
                    <div className="feed-image">
                      <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80" alt="Foundation construction" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DESIGN TAB - pinterest style gallery */}
            {activeTab === 'design' && (
              <div className="tab-pane design-tab">
                <div className="section-header-row">
                  <div>
                    <h2>Design Showcase</h2>
                    <p className="subtitle">Explore world-class inspiration for building your next dream project</p>
                  </div>
                  <div className="filter-chips">
                    <span className="chip active">All</span>
                    <span className="chip">Modern</span>
                    <span className="chip">Minimalist</span>
                    <span className="chip">Traditional</span>
                    <span className="chip">Blueprints</span>
                  </div>
                </div>

                <div className="design-masonry-grid">
                  <div className="design-grid-item">
                    <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80" alt="modern exterior" />
                    <div className="item-meta">
                      <h5>Modern Glasshouse Villa</h5>
                      <span>by Rohan Mehta</span>
                    </div>
                  </div>
                  <div className="design-grid-item">
                    <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80" alt="living interior" />
                    <div className="item-meta">
                      <h5>Cozy Japandi Living Area</h5>
                      <span>by Sneha Sen</span>
                    </div>
                  </div>
                  <div className="design-grid-item">
                    <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80" alt="kitchen interior" />
                    <div className="item-meta">
                      <h5>Minimal Kitchen Layout</h5>
                      <span>by Horizon Interiors</span>
                    </div>
                  </div>
                  <div className="design-grid-item">
                    <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80" alt="lounge space" />
                    <div className="item-meta">
                      <h5>Mediterranean Poolside</h5>
                      <span>by Rohan Mehta</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CHATS TAB - interactive message panel */}
            {activeTab === 'chats' && (
              <div className="tab-pane chats-tab">
                <div className="chat-window">
                  {/* Chat List Side */}
                  <div className="chat-threads-sidebar">
                    <div className="sidebar-search">
                      <input type="text" placeholder="Search chats..." />
                    </div>
                    <div className="threads-list">
                      {chatThreads.map((thread, idx) => (
                        <div 
                          key={thread.id} 
                          className={`thread-item ${activeChat === idx ? 'active' : ''}`}
                          onClick={() => setActiveChat(idx)}
                        >
                          <div className={`thread-avatar ${idx === 1 ? 'blue' : idx === 2 ? 'orange' : ''}`}>
                            {thread.avatar}
                          </div>
                          <div className="thread-content">
                            <div className="thread-title">
                              <strong>{thread.name}</strong>
                              <span className="time">{thread.time}</span>
                            </div>
                            <p className="last-msg">{thread.lastMsg}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Message Panel */}
                  <div className="chat-conversation-panel">
                    <div className="panel-header">
                      <div className="user-info">
                        <strong>{chatThreads[activeChat].name}</strong>
                        <span className="status">Active Now</span>
                      </div>
                    </div>

                    <div className="messages-area">
                      {chatThreads[activeChat].messages.map((msg, idx) => (
                        <div key={idx} className={`message-bubble-wrapper ${msg.sender === 'me' ? 'me' : 'other'}`}>
                          <div className="message-bubble">
                            <p>{msg.text}</p>
                            <span className="msg-time">{msg.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="message-input-form">
                      <input 
                        type="text" 
                        placeholder="Type a message..." 
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                      />
                      <button type="submit" className="send-btn">
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* PROFILE TAB - shows profile status */}
            {activeTab === 'profile' && (
              <div className="tab-pane profile-tab">
                <div className="profile-dashboard-card">
                  <div className="profile-banner-bg"></div>
                  
                  <div className="profile-info-row">
                    <div className="profile-avatar-large">
                      {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="profile-title-block">
                      <h2>{currentUser.fullName}</h2>
                      <span className="role-tag">{currentUser.role}</span>
                      <p className="city"><MapPin size={16} /> {currentUser.city || 'Mumbai, India'}</p>
                    </div>
                  </div>

                  <div className="profile-details-grid">
                    <div className="detail-item">
                      <label><Building2 size={18} /> Full Name</label>
                      <span>{currentUser.fullName}</span>
                    </div>

                    <div className="detail-item">
                      <label><Phone size={18} /> Contact Number</label>
                      <span>{currentUser.phoneNumber}</span>
                    </div>

                    <div className="detail-item">
                      <label><MapPin size={18} /> Location Details</label>
                      <span>{currentUser.location || currentUser.city || 'Not detailed'}</span>
                    </div>

                    <div className="detail-item">
                      <label><Calendar size={18} /> Joined Since</label>
                      <span>June 2026</span>
                    </div>

                    {currentUser.role === 'Client' && (
                      <div className="detail-item full-width">
                        <label><Briefcase size={18} /> Looking For (Project Type)</label>
                        <span>{currentUser.projectType || 'Residential Construction'}</span>
                      </div>
                    )}

                    {currentUser.role === 'Architect' && (
                      <>
                        <div className="detail-item">
                          <label>Firm Name</label>
                          <span>{currentUser.firmName || 'Freelance'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Experience</label>
                          <span>{currentUser.experience || 'Not specified'}</span>
                        </div>
                        <div className="detail-item full-width">
                          <label>Specialization</label>
                          <span>{currentUser.specialization?.join(', ') || 'Residential, Commercial, Renovation'}</span>
                        </div>
                        <div className="detail-item full-width">
                          <label>WhatsApp Number</label>
                          <span>{currentUser.whatsappNumber || currentUser.phoneNumber}</span>
                        </div>
                      </>
                    )}

                    {currentUser.role === 'Contractor' && (
                      <>
                        <div className="detail-item">
                          <label>Contractor Type</label>
                          <span>{currentUser.contractorType || 'General Contractor'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Team Size</label>
                          <span>{currentUser.teamSize || '1-5 people'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Experience</label>
                          <span>{currentUser.experience || 'Not specified'}</span>
                        </div>
                        <div className="detail-item full-width">
                          <label>Work Categories</label>
                          <span>{currentUser.workCategory?.join(', ') || 'Building Construction, Renovation'}</span>
                        </div>
                      </>
                    )}

                    {currentUser.role === 'Labour' && (
                      <>
                        <div className="detail-item">
                          <label>Skill Type</label>
                          <span>{currentUser.skillType || 'General Helper'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Availability Status</label>
                          <span className={`status-badge ${currentUser.availability === 'Available' ? 'green' : 'red'}`}>
                            {currentUser.availability || 'Available'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    );
  }

  // Otherwise, render Public Landing Page
  return (
    <div className="site-wrapper">
      {/* Header */}
      <header className="site-header">
        <div className="container" style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" className="logo">
            <img src={allverLogo} alt="Allver" className="header-logo-svg" />
          </Link>
          
          <nav>
            <ul className="nav-links">
              <li><a href="#">Find Talent</a></li>
              <li><a href="#">Project Gallery</a></li>
              <li><a href="#">Success Stories</a></li>
              <li><a href="#">About Us</a></li>
            </ul>
          </nav>

          <div className="header-actions">
            <Link to="/login" className="btn-login">Login</Link>
            <Link to="/register" className="btn-get-started">Join as Professional or Client</Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            {stats && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.5rem 1rem', borderRadius: '2rem', fontSize: '0.875rem', fontWeight: '700', color: 'var(--color-contractor)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                <Shield size={16} />
                Trusted by {stats.happyClients}+ Happy Clients
              </div>
            )}
            <h1>Building the Future of Construction</h1>
            <p>The marketplace where clients, architects, and contractors connect to bring visions to life.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/register" className="btn-get-started" style={{ padding: '1rem 2rem', fontSize: '1.1rem', textDecoration: 'none' }}>
                Post a Project
              </Link>
              <Link to="/register" style={{ background: 'white', border: '2px solid #e5e7eb', padding: '1rem 2rem', borderRadius: '0.75rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'none', color: 'var(--text-dark)' }}>
                Search Professionals
              </Link>
            </div>
          </div>
          <div className="hero-image">
            <img src={welcomeHero} alt="Construction Marketplace Illustration" />
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="container" style={{ padding: '8rem 2rem' }}>
        <div className="section-header">
          <h2>Everything you need for your build</h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>Choose your role and get started on the platform</p>
        </div>
        
        <div className="roles-grid">
          <RoleCard 
            image={architectImg}
            title="Architect"
            description="Design your dream with world-class residential and commercial architects."
            color="var(--color-architect)"
            bgColor="var(--color-architect-bg)"
            icon={Compass}
          />
          <RoleCard 
            image={contractorImg}
            title="Contractor"
            description="Turn plans into reality with certified general and specialized contractors."
            color="var(--color-contractor)"
            bgColor="var(--color-contractor-bg)"
            icon={HardHat}
          />
          <RoleCard 
            image={labourImg}
            title="Labour"
            description="Find skilled masonry, carpentry, and electric work experts for any task."
            color="var(--color-labour)"
            bgColor="var(--color-labour-bg)"
            icon={Hammer}
          />
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <h2>Popular Service Categories</h2>
            <p style={{ color: 'var(--text-muted)' }}>Discover experts across all construction domains</p>
          </div>
          
          <div className="categories-grid">
            <CategoryCard icon={Layout} label="Architecture" />
            <CategoryCard icon={Hammer} label="Construction" />
            <CategoryCard icon={Drill} label="Renovation" />
            <CategoryCard icon={Truck} label="Material Logistics" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p style={{ color: 'var(--text-muted)' }}>Simple, secure, and transparent construction workflow</p>
          </div>
          
          <div className="steps-container">
            <div className="step-item">
              <div className="step-num">1</div>
              <h4>Choose Your Role</h4>
              <p>Identify as a Client, Architect, or Contractor to access tailored tools.</p>
            </div>
            <div className="step-item">
              <div className="step-num">2</div>
              <h4>Find & Connect</h4>
              <p>Search profiles, compare portfolios, and invite talent to your project.</p>
            </div>
            <div className="step-item">
              <div className="step-num">3</div>
              <h4>Collaborate</h4>
              <p>Discuss requirements, share blueprints, and agree on milestones.</p>
            </div>
            <div className="step-item">
              <div className="step-num">4</div>
              <h4>Success</h4>
              <p>Manage projects with confidence and build something amazing together.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <img src={allverLogo} alt="Allver" className="footer-logo-svg" />
              <p style={{ color: 'var(--text-muted)' }}>The world's leading construction marketplace for high-end professional connections.</p>
            </div>
            <div className="footer-links">
              <h4>Platform</h4>
              <ul>
                <li><a href="#">For Clients</a></li>
                <li><a href="#">For Architects</a></li>
                <li><a href="#">For Contractors</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Press</a></li>
              </ul>
            </div>
            <div className="footer-links">
              <h4>Support</h4>
              <ul>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Contact Us</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div style={{ marginTop: '5rem', paddingTop: '2rem', borderTop: '1px solid #f3f4f6', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            © 2026 Allver Construction Marketplace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
