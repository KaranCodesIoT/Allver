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
  Briefcase,
  ChevronDown,
  Users,
  Package,
  Globe,
  Sofa,
  Paintbrush,
  Wrench,
  Recycle,
  Leaf,

  Phone,
  X
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// Import Assets for Public Landing Page
import welcomeHero from './assets/welcome_hero.png';
import architectImg from './assets/architect_home.png';
import contractorImg from './assets/contractor_site.png';
import labourImg from './assets/labour_working.png';
import allverLogo from './assets/allver-logo.svg';

const ROLE_ROUTES = { Architect: '/architects', Contractor: '/contractors', Labour: '/labour' };

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
    <div className="allver-landing">
      {/* ========== NAVBAR ========== */}
      <header className="av-navbar">
        <div className="av-navbar-inner">
          <Link to="/" className="av-brand">
            <img src={allverLogo} alt="Allver" className="av-brand-logo" />
          </Link>

          <nav className="av-nav-links">
            <a href="#home" className="active">Home</a>
            <div className="av-nav-dropdown">
              <a href="#services">Services <ChevronDown size={14} /></a>
            </div>
            <div className="av-nav-dropdown">
              <a href="#professionals">For Professionals <ChevronDown size={14} /></a>
            </div>
            <a href="#services">Track Order</a>
            <a href="#cta">Sustainability</a>
            <a href="#footer">About Us</a>
          </nav>

          <div className="av-nav-actions">
            <Link to="/login" className="av-btn-login">Login</Link>
            <Link to="/register" className="av-btn-signup">Sign Up</Link>
          </div>
        </div>
      </header>

      {/* ========== HERO SECTION ========== */}
      <section className="av-hero" id="home">
        <div className="av-hero-inner">
          <div className="av-hero-content">
            <h1 className="av-hero-title">
              One Platform.<br />
              <span className="av-gold-text">Every Construction Need.</span>
            </h1>
            <p className="av-hero-desc">
              Allver connects Contractors, Architects, Laborers and Suppliers on one platform to build faster, smarter and more sustainably.
            </p>
            <div className="av-hero-btns">
              <Link to="/register" className="av-btn-primary">
                Explore Services <ArrowRight size={16} />
              </Link>
              <Link to="/register" className="av-btn-outline">
                Join Allver Now
              </Link>
            </div>

            {/* Trusted By */}
            <div className="av-trusted-row">
              <span className="av-trusted-label">Trusted by Professionals</span>
              <div className="av-avatar-stack">
                <div className="av-avatar-circle"><img src="https://i.pravatar.cc/150?img=11" alt="user" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit: 'cover'}} /></div>
                <div className="av-avatar-circle"><img src="https://i.pravatar.cc/150?img=12" alt="user" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit: 'cover'}} /></div>
                <div className="av-avatar-circle"><img src="https://i.pravatar.cc/150?img=33" alt="user" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit: 'cover'}} /></div>
                <div className="av-avatar-circle"><img src="https://i.pravatar.cc/150?img=44" alt="user" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit: 'cover'}} /></div>
                <div className="av-avatar-circle"><img src="https://i.pravatar.cc/150?img=5" alt="user" style={{width:'100%', height:'100%', borderRadius:'50%', objectFit: 'cover'}} /></div>
                <div className="av-avatar-circle av-avatar-more">+</div>
              </div>
              <div className="av-stat-inline">
                <strong>10K+</strong>
                <span>Happy Users</span>
              </div>
            </div>
          </div>

          <div className="av-hero-visual">
            {/* Floating Card */}
            <div className="av-floating-card">
              <div className="av-floating-icon">
                <Package size={20} />
              </div>
              <div className="av-floating-text">
                <strong>Your Project, In Real Time</strong>
                <p>Track orders, manage deliveries<br/>and stay updated 24/7.</p>
              </div>
              <button className="av-btn-track">Track Order <ArrowRight size={14} /></button>
            </div>
          </div>
        </div>
      </section>


      {/* ========== PEOPLE SECTION ========== */}
      <section className="av-people" id="professionals">
        <div className="av-section-inner">
          <h2 className="av-section-title">We Connect The Right People</h2>
          
          <div className="av-people-grid">
            <div className="av-people-card" onClick={() => navigate('/contractors')}>
              <div className="av-people-icon-wrap contractor">
                <HardHat size={32} />
              </div>
              <h4>Contractors</h4>
              <p>Find projects, hire the right team and grow your business.</p>
            </div>

            <div className="av-people-card" onClick={() => navigate('/architects')}>
              <div className="av-people-icon-wrap architect">
                <Compass size={32} />
              </div>
              <h4>Architects</h4>
              <p>Collaborate, showcase your work and get more clients.</p>
            </div>

            <div className="av-people-card" onClick={() => navigate('/labour')}>
              <div className="av-people-icon-wrap labour">
                <Hammer size={32} />
              </div>
              <h4>Laborers</h4>
              <p>Find job opportunities and work with trusted employers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== STATS BAR ========== */}
      <section className="av-stats-bar">
        <div className="av-stats-inner">
          <div className="av-stat-item">
            <Users size={24} />
            <div>
              <strong>10K+</strong>
              <span>Professionals</span>
            </div>
          </div>
          <div className="av-stat-item">
            <Building2 size={24} />
            <div>
              <strong>5K+</strong>
              <span>Projects Completed</span>
            </div>
          </div>
          <div className="av-stat-item">
            <Package size={24} />
            <div>
              <strong>15K+</strong>
              <span>Products Listed</span>
            </div>
          </div>
          <div className="av-stat-item">
            <Globe size={24} />
            <div>
              <strong>50+</strong>
              <span>Cities Covered</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section className="av-cta" id="cta">
        <div className="av-cta-inner">
          <div className="av-cta-content">
            <h2>Ready to Build Something Great?</h2>
            <p>Join Allver today and experience a smarter way to build, manage and grow your construction projects.</p>
            <div className="av-cta-btns">
              <Link to="/register" className="av-btn-primary">
                Sign Up Now <ArrowRight size={16} />
              </Link>
              <a href="#services" className="av-btn-outline-light">
                Learn More <ArrowRight size={16} />
              </a>
            </div>
          </div>
          <div className="av-cta-visual">
            <div className="av-cta-phone-mockup">
              <div className="av-mockup-header">
                <img src={allverLogo} alt="Allver" className="av-mockup-logo" />
                <span>ALLVER</span>
              </div>
              <div className="av-mockup-content">
                <h5>Track Your Order</h5>
                <p>Real time updates on your orders and deliveries.</p>
                <div className="av-mockup-status">
                  <div className="av-status-dot active"></div>
                  <div>
                    <strong>In Transit</strong>
                    <span>Estimated Delivery: Today, 3:45 PM</span>
                  </div>
                </div>
              </div>
            </div>
            <img src={welcomeHero} alt="Construction" className="av-cta-bg-img" />
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="av-footer" id="footer">
        <div className="av-footer-inner">
          <div className="av-footer-grid">
            {/* Brand Column */}
            <div className="av-footer-brand">
              <div className="av-brand">
                <img src={allverLogo} alt="Allver" className="av-brand-logo" />
                <div className="av-brand-text">
                  <span className="av-brand-name">ALLVER</span>
                  <span className="av-brand-tagline">BUILD. CONNECT. DELIVER.</span>
                </div>
              </div>
              <p>Allver is your all-in-one platform for construction services and solutions.</p>
              <div className="av-social-links">
                <a href="#" aria-label="Facebook"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>
                <a href="#" aria-label="LinkedIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>
                <a href="#" aria-label="Instagram"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.88 0 1.441 1.441 0 012.88 0z"/></svg></a>
                <a href="#" aria-label="YouTube"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a>
              </div>
            </div>

            {/* Platform Links */}
            <div className="av-footer-links">
              <h4>Platform</h4>
              <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#services">Services</a></li>
                <li><a href="#services">Track Order</a></li>
                <li><a href="#cta">Sustainability</a></li>
                <li><a href="#footer">About Us</a></li>
              </ul>
            </div>

            {/* For Professionals */}
            <div className="av-footer-links">
              <h4>For Professionals</h4>
              <ul>
                <li><Link to="/contractors">Contractors</Link></li>
                <li><Link to="/architects">Architects</Link></li>
                <li><Link to="/labour">Laborers</Link></li>
                <li><a href="#">Suppliers</a></li>
              </ul>
            </div>

            {/* Support */}
            <div className="av-footer-links">
              <h4>Support</h4>
              <ul>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Contact Us</a></li>
                <li><a href="#">Terms & Conditions</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="av-footer-newsletter">
              <h4>Newsletter</h4>
              <p>Stay updated with the latest news and offers from Allver.</p>
              <div className="av-newsletter-form">
                <input type="email" placeholder="Enter your email" />
                <button type="button"><ArrowRight size={18} /></button>
              </div>
            </div>
          </div>

          <div className="av-footer-bottom">
            <p>© 2026 Allver Construction Marketplace. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

