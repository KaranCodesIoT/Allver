import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ClipboardList,
  Clock,
  DollarSign,
  Eye,
  CheckCircle,
  XCircle,

  Phone,
  X,
  SlidersHorizontal,
  Heart,
  ThumbsUp,
  MessageSquare,
  Share2,
  Bookmark,
  Image,
  Star,
  ShieldCheck,
  Lightbulb,
  Play,
  ArrowLeft,
  ChevronUp,
  FileText,
  Home as HomeIcon,
  Plus,
  PenLine,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

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
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'feed', 'design', 'chats', 'profile', 'workspaces'
  const [stats, setStats] = useState(null);
  const [chatLastInteracted, setChatLastInteracted] = useState({});

  // Socket.IO ref and real-time chat state
  const socketRef = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // { userId: number }
  const [contactLastMessages, setContactLastMessages] = useState({}); // { userId: { text, createdAt, fromMe } }
  const [allChatUsers, setAllChatUsers] = useState([]); // all registered users for discovery
  const [chatContactsSearch, setChatContactsSearch] = useState('');
  const [chatContactsFilter, setChatContactsFilter] = useState('All'); // 'All', 'Architect', 'Contractor', 'Labour', 'Client'
  const messagesEndRef = useRef(null);

  // New contract requests / workspace states
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [contractRequests, setContractRequests] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [workspaceDetail, setWorkspaceDetail] = useState(null);
  const [workspaceTab, setWorkspaceTab] = useState('chat'); // 'chat', 'quotation', 'files'
  const [quoteItems, setQuoteItems] = useState([{ name: '', cost: '' }]);
  const [attName, setAttName] = useState('');
  const [attType, setAttType] = useState('file'); // 'file' or 'drawing'
  const [showAttModal, setShowAttModal] = useState(false);
  // Project request detail modal
  const [viewDetailRequest, setViewDetailRequest] = useState(null);

  // Post Project Modal States
  const [showPostProjectModal, setShowPostProjectModal] = useState(false);
  const [projectPostedSuccess, setProjectPostedSuccess] = useState(false);
  const [postProjectForm, setPostProjectForm] = useState({
    title: '',
    category: 'Residential Construction',
    budget: '',
    location: '',
    description: ''
  });

  const [featuredPros, setFeaturedPros] = useState({
    Architect: null,
    Contractor: null,
    Labour: null
  });

  const [feedFilter, setFeedFilter] = useState('All');
  const [feedPosts, setFeedPosts] = useState([
    {
      id: 1,
      contentType: 'Designs',
      author: {
        name: 'Ar. Neha Sharma',
        role: 'Architect',
        location: 'Mumbai',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        verified: true,
        verifiedColor: '#10b981'
      },
      time: '2h ago',
      content: 'A modern minimal home design with natural light 🍃\nThoughts on this facade?',
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80'
      ],
      appreciates: 128,
      comments: 12,
      hasAppreciated: false
    },
    {
      id: 2,
      contentType: 'Progress',
      author: {
        name: 'Rohit Buildcon',
        role: 'Contractor',
        location: 'Pune',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        verified: true,
        verifiedColor: '#3b82f6'
      },
      time: '5h ago',
      content: 'Brickwork progress at our ongoing site.\nQuality work always comes first!',
      images: [
        'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=400&q=80'
      ],
      appreciates: 96,
      comments: 8,
      hasAppreciated: false
    },
    {
      id: 3,
      contentType: 'Teams',
      author: {
        name: 'Amit Kumar',
        role: 'Labour',
        location: 'Delhi',
        avatar: 'https://images.unsplash.com/photo-1624561172888-ac93c696e10c?auto=format&fit=crop&w=150&q=80',
        verified: true,
        verifiedColor: '#10b981'
      },
      time: '1d ago',
      content: 'Our skilled tiling team completing premium flooring work 💪\nHire us for your next residential project.',
      images: [
        'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=400&q=80'
      ],
      appreciates: 42,
      comments: 3,
      hasAppreciated: false
    },
    {
      id: 4,
      contentType: 'Projects',
      author: {
        name: 'Studio Arch Co.',
        role: 'Architect',
        location: 'Bengaluru',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        verified: true,
        verifiedColor: '#10b981'
      },
      time: '3h ago',
      content: 'Completed: 4BHK villa project in Whitefield 🏡\n2,800 sqft • Modern tropical design • 14 months build time.',
      images: [
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'
      ],
      appreciates: 215,
      comments: 34,
      hasAppreciated: false
    }
  ]);

  const handleAppreciatePost = (postId) => {
    setFeedPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          appreciates: post.hasAppreciated ? post.appreciates - 1 : post.appreciates + 1,
          hasAppreciated: !post.hasAppreciated
        };
      }
      return post;
    }));
  };

  const filteredFeedPosts = feedPosts.filter(post => {
    if (feedFilter === 'All') return true;
    return post.contentType === feedFilter;
  });

  const handlePostProjectSubmit = (e) => {
    e.preventDefault();
    const newProject = {
      id: Date.now(),
      ...postProjectForm,
      date: new Date().toLocaleDateString('en-IN')
    };
    
    const existing = JSON.parse(localStorage.getItem('allver_posted_projects') || '[]');
    localStorage.setItem('allver_posted_projects', JSON.stringify([...existing, newProject]));
    
    setProjectPostedSuccess(true);
    setTimeout(() => {
      setProjectPostedSuccess(false);
      setShowPostProjectModal(false);
      setPostProjectForm({ title: '', category: 'Residential Construction', budget: '', location: '', description: '' });
    }, 4500);
  };

  // Open a chat conversation: fetch history from DB + mark messages as read
  const openChat = useCallback(async (user) => {
    if (!currentUser || !user) return;
    setActiveChatDesigner(user);
    const otherIdStr = String(user._id);

    // Mark messages from this user as read
    if (socketRef.current) {
      socketRef.current.emit('mark_read', { senderId: otherIdStr, receiverId: currentUser._id });
    }
    setUnreadCounts(prev => ({ ...prev, [otherIdStr]: 0 }));
    setChatLastInteracted(prev => ({ ...prev, [otherIdStr]: Date.now() }));

    // Fetch full message history from DB
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${currentUser._id}/${otherIdStr}`);
      if (res.ok) {
        const data = await res.json();
        setDesignerChats(prev => ({ ...prev, [otherIdStr]: data.messages || [] }));
      }
    } catch (err) {
      console.error('Error fetching message history:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (location.state?.activeTab) {
      if (location.state.activeTab === 'profile') {
        navigate('/profile');
      } else {
        setActiveTab(location.state.activeTab);
        if (location.state.activeTab === 'chats' && location.state.chatUser) {
          openChat(location.state.chatUser);
        }
      }
    }
  }, [location.state, navigate, openChat]);

  // Chats mock state
  const [activeChat, setActiveChat] = useState(0);
  const [chatMessage, setChatMessage] = useState('');

  // Design tab Showcase state
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [designTabSearch, setDesignTabSearch] = useState('');
  const [designTabPrice, setDesignTabPrice] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('photos'); // 'photos', 'videos', 'quotation'
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [followedAuthors, setFollowedAuthors] = useState({});
  const [hiredContractors, setHiredContractors] = useState({});
  const [designsList, setDesignsList] = useState([]);
  const [designsLoading, setDesignsLoading] = useState(false);

  // Post Design modal state
  const [showPostDesignModal, setShowPostDesignModal] = useState(false);
  const [postDesignForm, setPostDesignForm] = useState({
    title: '',
    location: '',
    overview: '',
    mainImage: '',
    designType: 'Apartment',
    priceRange: 'mid'
  });
  const [postDesignLoading, setPostDesignLoading] = useState(false);
  const [imageUploadLoading, setImageUploadLoading] = useState(false);
  const [postDesignError, setPostDesignError] = useState('');

  const handleLikeDesign = (designId, e) => {
    if (e) e.stopPropagation();
    setDesignsList(prev => prev.map(d => {
      if (d.id === designId) {
        const updatedLiked = !d.hasLiked;
        const updatedLikesCount = updatedLiked ? d.likes + 1 : d.likes - 1;
        const updatedItem = { ...d, hasLiked: updatedLiked, likes: updatedLikesCount };
        // Sync selectedDesign if open
        if (selectedDesign && selectedDesign.id === designId) {
          setSelectedDesign(updatedItem);
        }
        return updatedItem;
      }
      return d;
    }));
  };

  const handleSaveDesign = (designId, e) => {
    if (e) e.stopPropagation();
    setDesignsList(prev => prev.map(d => {
      if (d.id === designId) {
        const updatedItem = { ...d, saved: !d.saved };
        // Sync selectedDesign if open
        if (selectedDesign && selectedDesign.id === designId) {
          setSelectedDesign(updatedItem);
        }
        return updatedItem;
      }
      return d;
    }));
  };

  // Designers in Chat tab state
  const [activeChatDesigner, setActiveChatDesigner] = useState(null);
  const [designersList, setDesignersList] = useState([]);
  const [designersLoading, setDesignersLoading] = useState(true);
  const [designersSearch, setDesignersSearch] = useState('');
  const [designersRatingFilter, setDesignersRatingFilter] = useState('');
  const [showRatingFilterDrop, setShowRatingFilterDrop] = useState(false);
  const [designerChats, setDesignerChats] = useState({});


  const handleSendDesignerMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeChatDesigner || !currentUser) return;
    if (!socketRef.current) return;

    socketRef.current.emit('send_message', {
      senderId: currentUser._id,
      receiverId: activeChatDesigner._id,
      text: chatMessage.trim()
    });

    setChatMessage('');
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [designerChats, activeChatDesigner]);

  // Fetch contract requests and workspaces
  const fetchNotificationsAndWorkspaces = async () => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return;
    const userObj = JSON.parse(userStr);
    
    try {
      const reqRes = await fetch(`http://localhost:5000/api/contract-requests/user/${userObj._id}`);
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setContractRequests(reqData.requests || []);
      }
      
      const wsRes = await fetch(`http://localhost:5000/api/project-workspaces/user/${userObj._id}`);
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        setWorkspaces(wsData.workspaces || []);
      }
    } catch (err) {
      console.error('Error fetching requests/workspaces:', err);
    }
  };

  const fetchWorkspaceDetail = async (workspaceId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkspaceDetail(data.workspace);
      }
    } catch (err) {
      console.error('Error fetching workspace detail:', err);
    }
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
        setViewDetailRequest(null);
        await fetchNotificationsAndWorkspaces();
        
        if (status === 'Accepted' && data.workspace) {
          setActiveTab('workspaces');
          setSelectedWorkspace(data.workspace._id);
          fetchWorkspaceDetail(data.workspace._id);
        }
        // No alert on reject - the card simply disappears from the list
      } else {
        alert(data.message || 'Failed to update request');
      }

    } catch (err) {
      console.error('Error updating request status:', err);
    }
  };

  const handleSendWsMessage = async (e) => {
    e.preventDefault();
    if (!wsMessageText.trim() || !workspaceDetail) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: currentUser._id,
          text: wsMessageText
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setWorkspaceDetail(data.workspace);
        setWsMessageText('');
      } else {
        alert(data.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleSendQuotation = async (e) => {
    e.preventDefault();
    if (!workspaceDetail) return;
    
    const items = quoteItems
      .filter(item => item.name && item.cost)
      .map(item => ({ name: item.name, cost: parseFloat(item.cost) }));
      
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }
    
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0);
    
    try {
      const response = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/quotation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items,
          totalCost,
          status: 'Sent'
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setWorkspaceDetail(data.workspace);
        alert('Quotation sent successfully!');
      } else {
        alert(data.message || 'Failed to send quotation');
      }
    } catch (err) {
      console.error('Error sending quotation:', err);
    }
  };

  const handleQuotationDecision = async (status) => {
    if (!workspaceDetail) return;
    
    try {
      const response = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/quotation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setWorkspaceDetail(data.workspace);
        alert(`Quotation ${status.toLowerCase()}!`);
      } else {
        alert(data.message || 'Failed to update quotation');
      }
    } catch (err) {
      console.error('Error updating quotation decision:', err);
    }
  };

  const handleAttachSend = async (e) => {
    e.preventDefault();
    if (!attName.trim() || !workspaceDetail) return;
    
    const mockUrls = {
      drawing: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
      file: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    };
    
    try {
      const response = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: currentUser._id,
          text: `📎 Attached a ${attType}: ${attName}`,
          attachment: {
            name: attName,
            url: mockUrls[attType],
            type: attType
          }
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        setWorkspaceDetail(data.workspace);
        setShowAttModal(false);
        setAttName('');
      } else {
        alert(data.message || 'Failed to attach file');
      }
    } catch (err) {
      console.error('Error attaching file:', err);
    }
  };

  const renderQuotationSummary = () => {
    if (!workspaceDetail?.quotation) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {workspaceDetail.quotation.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>{item.name}</span>
              <strong style={{ color: '#0f172a' }}>₹ {item.cost.toLocaleString('en-IN')}</strong>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem' }}>
          <strong style={{ color: '#0f172a' }}>Total Estimated Cost</strong>
          <strong style={{ color: '#10b981' }}>₹ {workspaceDetail.quotation.totalCost?.toLocaleString('en-IN')}</strong>
        </div>
      </div>
    );
  };

  const [wsMessageText, setWsMessageText] = useState('');

  useEffect(() => {
    // Check if user is logged in
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const parsedUser = JSON.parse(userStr);
      setCurrentUser(parsedUser);
      
      // Initial fetch and set interval polling for new hire requests/workspaces
      fetchNotificationsAndWorkspaces();
      const interval = setInterval(fetchNotificationsAndWorkspaces, 7000);

      // --- Socket.IO connection ---
      const socket = io('http://localhost:5000', { transports: ['websocket'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join', { userId: parsedUser._id });
      });

      // Real-time new message received
      socket.on('new_message', (msg) => {
        const myId = parsedUser._id;
        const otherId = msg.senderId._id === myId ? msg.receiverId._id : msg.senderId._id;
        const otherIdStr = String(otherId);
        const isFromMe = String(msg.senderId._id) === myId;

        // Update message list if this conversation is open
        setDesignerChats(prev => {
          const existing = prev[otherIdStr] || [];
          // Avoid duplicate messages
          const alreadyExists = existing.some(m => m._id && m._id === msg._id);
          if (alreadyExists) return prev;
          return { ...prev, [otherIdStr]: [...existing, msg] };
        });

        // Update last message preview
        setContactLastMessages(prev => ({
          ...prev,
          [otherIdStr]: { text: msg.text, createdAt: msg.createdAt, fromMe: isFromMe }
        }));

        // Update sort order
        setChatLastInteracted(prev => ({ ...prev, [otherIdStr]: new Date(msg.createdAt).getTime() }));

        // Increment unread count only if the message is NOT from me and the conversation isn't currently open
        if (!isFromMe) {
          setUnreadCounts(prev => {
            const current = prev[otherIdStr] || 0;
            return { ...prev, [otherIdStr]: current + 1 };
          });
        }
      });

      // Messages were read by the other user (clear delivery indicator if needed)
      socket.on('messages_read', ({ senderId, receiverId }) => {
        // Currently used for future "read receipts" UI — no action needed yet
      });

      // Real-time request status updated
      socket.on('request_status_updated', async ({ requestId, status, workspace }) => {
        await fetchNotificationsAndWorkspaces();
      });

      // Real-time workspace message received
      socket.on('workspace_message_received', ({ workspaceId, workspace }) => {
        setWorkspaceDetail(prev => (prev && prev._id === workspaceId) ? workspace : prev);
        setWorkspaces(prev => prev.map(w => w._id === workspaceId ? workspace : w));
      });

      // Fetch all registered users for contact discovery
      fetch(`http://localhost:5000/api/all-users/${parsedUser._id}`)
        .then(r => r.json())
        .then(d => setAllChatUsers(d.users || []))
        .catch(err => console.error('Error fetching all users:', err));

      // Hydrate existing chat contacts with last messages + unread counts
      fetch(`http://localhost:5000/api/chat-contacts/${parsedUser._id}`)
        .then(r => r.json())
        .then(d => {
          const contacts = d.contacts || [];
          const lastMsgs = {};
          const unread = {};
          const lastInteracted = {};
          contacts.forEach(c => {
            const uid = String(c.user._id);
            if (c.lastMessage) {
              lastMsgs[uid] = c.lastMessage;
              lastInteracted[uid] = new Date(c.lastMessage.createdAt).getTime();
            }
            if (c.unreadCount > 0) unread[uid] = c.unreadCount;
          });
          setContactLastMessages(lastMsgs);
          setUnreadCounts(unread);
          setChatLastInteracted(lastInteracted);
        })
        .catch(err => console.error('Error hydrating chat contacts:', err));

      return () => {
        clearInterval(interval);
        socket.disconnect();
      };
    }
  }, []);


  useEffect(() => {
    fetch('http://localhost:5000/api/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error('Error fetching stats:', err));

    // Seeding and Fetching featured professionals
    const fetchFeatured = async () => {
      try {
        // Fetch Architect
        const archRes = await fetch('http://localhost:5000/api/professionals/Architect');
        const archData = await archRes.json();
        if (archData.professionals && archData.professionals.length > 0) {
          setFeaturedPros(prev => ({ ...prev, Architect: archData.professionals[0] }));
        }

        // Fetch Contractor
        const contRes = await fetch('http://localhost:5000/api/professionals/Contractor');
        const contData = await contRes.json();
        if (contData.professionals && contData.professionals.length > 0) {
          setFeaturedPros(prev => ({ ...prev, Contractor: contData.professionals[0] }));
        }

        // Fetch Labour
        const labourRes = await fetch('http://localhost:5000/api/professionals/Labour');
        const labourData = await labourRes.json();
        if (labourData.professionals && labourData.professionals.length > 0) {
          setFeaturedPros(prev => ({ ...prev, Labour: labourData.professionals[0] }));
        }
      } catch (err) {
        console.error('Error fetching featured professionals:', err);
      }
    };

    const fetchDesigners = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/professionals/Architect');
        const data = await res.json();
        setDesignersList(data.professionals || []);
        setDesignersLoading(false);
      } catch (err) {
        console.error('Error fetching designers list:', err);
        setDesignersLoading(false);
      }
    };

    fetchFeatured();
    fetchDesigners();

    // Fetch designs from database
    setDesignsLoading(true);
    fetch('http://localhost:5000/api/designs')
      .then(res => res.json())
      .then(data => {
        if (data.designs) {
          const mapped = data.designs.map(d => ({
            id: d._id,
            title: d.title,
            location: d.location,
            overview: d.overview,
            mainImage: d.mainImage || 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80',
            images: d.images || [],
            imgCount: d.images?.length || 1,
            author: d.author?.fullName || 'Architect',
            authorId: d.author?._id,
            avatarUrl: d.author?.avatarUrl || '',
            rating: d.author?.rating || 4.5,
            reviewsCount: d.author?.reviews || 0,
            likes: d.likes,
            comments: d.comments,
            hasLiked: false,
            saved: false,
            designType: d.designType,
            priceRange: d.priceRange
          }));
          setDesignsList(mapped);
        }
        setDesignsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching designs:', err);
        setDesignsLoading(false);
      });
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
              <span>Discover</span>
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
              <input type="text" placeholder="Search architects, contractors, labour..." />
            </div>
            <div className="header-right" style={{ position: 'relative' }}>
              <button 
                className="notif-btn"
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                style={{ position: 'relative' }}
              >
                <Bell size={20} />
                {contractRequests.filter(r => r.status === 'Pending' && r.professional && r.professional._id === currentUser?._id).length > 0 && (
                  <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#ef4444', color: 'white', fontSize: '0.6rem', fontWeight: '800', minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', border: '2px solid white', lineHeight: 1 }}>
                    {contractRequests.filter(r => r.status === 'Pending' && r.professional && r.professional._id === currentUser?._id).length}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="notif-dropdown" style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  width: '360px',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1rem',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
                  maxHeight: '480px',
                  overflowY: 'auto',
                  marginTop: '0.5rem',
                  textAlign: 'left'
                }}>
                  {/* Header */}
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', fontWeight: '800', fontSize: '0.95rem', color: '#0f172a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white', borderRadius: '1rem 1rem 0 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bell size={16} style={{ color: '#f59e0b' }} />
                      <span>Notifications</span>
                    </div>
                    <button 
                      onClick={() => setShowNotifDropdown(false)}
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Pending requests for professionals */}
                  {(() => {
                    const pending = contractRequests.filter(r => r.professional && r.professional._id === currentUser?._id && r.status === 'Pending');
                    const clientUpdates = contractRequests.filter(r => r.client && r.client._id === currentUser?._id && r.status !== 'Pending');
                    
                    if (pending.length === 0 && clientUpdates.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                          <Bell size={36} style={{ color: '#e2e8f0', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, fontWeight: '600' }}>No notifications yet</p>
                          <p style={{ color: '#cbd5e1', fontSize: '0.78rem', margin: '4px 0 0' }}>You're all caught up!</p>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Professionals: Show pending project requests with a prompt to view on Home */}
                        {pending.length > 0 && (
                          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'linear-gradient(135deg, #fef3c7, #fde68a)', padding: '0.75rem', borderRadius: '0.6rem', border: '1px solid #fde68a' }}>
                              <ClipboardList size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#92400e' }}>
                                  {pending.length} New Project Request{pending.length > 1 ? 's' : ''}!
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#b45309' }}>
                                  {pending.map(r => r.client?.fullName || 'A client').slice(0, 2).join(', ')}{pending.length > 2 ? ` +${pending.length - 2} more` : ''} sent you a request.
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => { setShowNotifDropdown(false); setActiveTab('home'); }}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.6rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: '800', cursor: 'pointer', boxShadow: '0 3px 10px rgba(245,158,11,0.3)' }}
                            >
                              <Eye size={14} /> View Requests on Home
                            </button>
                          </div>
                        )}

                        {/* Client: Status updates */}
                        {clientUpdates.map(req => {
                          const isAccepted = req.status === 'Accepted';
                          const statusColor = isAccepted ? '#10b981' : '#ef4444';
                          const statusBg = isAccepted ? '#f0fdf4' : '#fef2f2';
                          const statusBorder = isAccepted ? '#bbf7d0' : '#fecaca';
                          return (
                            <div key={req._id} style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: statusBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${statusBorder}` }}>
                                  {isAccepted ? <CheckCircle size={16} style={{ color: statusColor }} /> : <XCircle size={16} style={{ color: statusColor }} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: '0.85rem', color: '#1e293b', lineHeight: '1.4', fontWeight: '600' }}>
                                    <strong style={{ color: statusColor }}>{req.professional?.fullName || 'Professional'}</strong> {isAccepted ? 'accepted' : 'rejected'} your request
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                    Project: <strong>{req.title}</strong>
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>
                                    {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </div>
                                </div>
                                <span style={{ background: statusBg, color: statusColor, fontSize: '0.68rem', fontWeight: '800', padding: '0.2rem 0.5rem', borderRadius: '1rem', border: `1px solid ${statusBorder}`, flexShrink: 0 }}>
                                  {req.status}
                                </span>
                              </div>
                              {isAccepted && (
                                <button
                                  onClick={() => {
                                    setShowNotifDropdown(false);
                                    setActiveTab('workspaces');
                                  }}
                                  style={{ marginTop: '0.6rem', width: '100%', padding: '0.45rem', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '0.4rem', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  View Project Workspace →
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}


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

                {/* ─── PROJECT REQUESTS SECTION (Professional Only) ─── */}
                {currentUser && ['Architect', 'Contractor', 'Labour'].includes(currentUser.role) && (() => {
                  const pendingRequests = contractRequests.filter(
                    r => r.professional && r.professional._id === currentUser._id && r.status === 'Pending'
                  );
                  if (pendingRequests.length === 0) return null;
                  return (
                    <section style={{ marginBottom: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '10px', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                          <ClipboardList size={20} color="white" />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Project Requests</h3>
                          <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>{pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''} awaiting your response</p>
                        </div>
                        <span style={{ marginLeft: 'auto', background: '#fef3c7', color: '#d97706', fontWeight: '800', fontSize: '0.82rem', padding: '0.3rem 0.85rem', borderRadius: '2rem', border: '1.5px solid #fde68a' }}>
                          {pendingRequests.length} Pending
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
                        {pendingRequests.map(req => {
                          const client = req.client;
                          const clientInitial = client?.fullName ? client.fullName.charAt(0).toUpperCase() : '?';
                          const roleColor = { Architect: '#10b981', Contractor: '#3b82f6', Labour: '#f59e0b' }[currentUser.role] || '#6366f1';
                          return (
                            <div key={req._id} style={{
                              background: 'white',
                              borderRadius: '1rem',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                              overflow: 'hidden',
                              transition: 'box-shadow 0.2s, transform 0.2s',
                              position: 'relative'
                            }}
                              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                              {/* Top accent bar */}
                              <div style={{ height: '4px', background: `linear-gradient(90deg, ${roleColor}, ${roleColor}99)` }} />

                              {/* NEW badge */}
                              <div style={{ position: 'absolute', top: '16px', right: '16px', background: '#fef3c7', color: '#d97706', fontSize: '0.68rem', fontWeight: '800', padding: '0.2rem 0.6rem', borderRadius: '2rem', border: '1.5px solid #fde68a', letterSpacing: '0.5px' }}>NEW</div>

                              <div style={{ padding: '1.25rem' }}>
                                {/* Client info row */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                  {client?.avatarUrl ? (
                                    <img src={client.avatarUrl} alt={client.fullName} style={{ width: '46px', height: '46px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #f1f5f9' }} />
                                  ) : (
                                    <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: `linear-gradient(135deg, ${roleColor}33, ${roleColor}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.2rem', color: roleColor, border: `2px solid ${roleColor}33`, flexShrink: 0 }}>
                                      {clientInitial}
                                    </div>
                                  )}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: '700', fontSize: '0.97rem', color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{client?.fullName || 'Client'}</div>
                                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{client?.city || client?.email || 'Client'}</div>
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>
                                    <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                                    {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  </div>
                                </div>

                                {/* Project Title */}
                                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.75rem', lineHeight: '1.3' }}>{req.title}</h4>

                                {/* Key details grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.85rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#475569' }}>
                                    <DollarSign size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                                    <span><strong style={{ color: '#0f172a' }}>Budget:</strong> {req.budget}</span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#475569' }}>
                                    <Calendar size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
                                    <span><strong style={{ color: '#0f172a' }}>Start:</strong> {req.startDate ? new Date(req.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}</span>
                                  </div>
                                  {req.expectedCompletionDate && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#475569' }}>
                                      <Calendar size={13} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                                      <span><strong style={{ color: '#0f172a' }}>End:</strong> {new Date(req.expectedCompletionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                    </div>
                                  )}
                                  {(req.plotArea || req.builtUpArea || req.totalArea) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#475569' }}>
                                      <Building2 size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
                                      <span><strong style={{ color: '#0f172a' }}>Area:</strong> {req.plotArea || req.builtUpArea || req.totalArea} sq.ft</span>
                                    </div>
                                  )}
                                  {req.projectType && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#475569', gridColumn: req.plotArea || req.builtUpArea || req.totalArea ? 'auto' : '1 / -1' }}>
                                      <Briefcase size={13} style={{ color: '#64748b', flexShrink: 0 }} />
                                      <span><strong style={{ color: '#0f172a' }}>Type:</strong> {req.projectType}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Description preview */}
                                {req.description && (
                                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 1rem', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {req.description}
                                  </p>
                                )}

                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '0.6rem' }}>
                                  <button
                                    onClick={() => setViewDetailRequest(req)}
                                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '0.55rem', background: '#f8fafc', color: '#475569', border: '1.5px solid #e2e8f0', borderRadius: '0.6rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                  >
                                    <Eye size={14} /> View Details
                                  </button>
                                  <button
                                    onClick={() => handleRequestAction(req._id, 'Accepted')}
                                    style={{ flex: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '0.55rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '0.6rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 3px 10px rgba(16,185,129,0.3)', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 14px rgba(16,185,129,0.4)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(16,185,129,0.3)'; }}
                                  >
                                    <CheckCircle size={14} /> Accept
                                  </button>
                                  <button
                                    onClick={() => handleRequestAction(req._id, 'Rejected')}
                                    style={{ padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: '#fff1f2', color: '#ef4444', border: '1.5px solid #fecaca', borderRadius: '0.6rem', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                                  >
                                    <XCircle size={14} /> Reject
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })()}

                {/* Welcome Card Banner */}
                <div className="welcome-banner">
                  <div className="banner-left">
                    <h2 style={{ fontSize: '2.1rem', lineHeight: '1.2', marginBottom: '0.75rem' }}>Find Trusted Construction Professionals</h2>
                    <p style={{ fontSize: '1.05rem', color: '#cbd5e1', marginBottom: '1.5rem', maxWidth: '500px' }}>
                      Connect with architects, contractors, and skilled labour for your next project.
                    </p>
                    <div className="hero-action-buttons-wrapper">
                      <button className="btn-hero-primary" onClick={() => document.getElementById('choose-role-section')?.scrollIntoView({ behavior: 'smooth' })}>
                        Find Professionals
                      </button>
                      <button className="btn-hero-secondary" onClick={() => {
                        setProjectPostedSuccess(false);
                        setShowPostProjectModal(true);
                      }}>
                        Post a Project
                      </button>
                    </div>
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
                <section className="dashboard-section" id="choose-role-section">
                  <h3 className="section-title">Choose Your Role</h3>
                  <div className="role-illustration-grid">
                    {/* Architect Card */}
                    <div className="role-illustration-card green" onClick={() => navigate('/architects')} style={{ cursor: 'pointer' }}>
                      <div className="card-top-img">
                        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Isometric Blueprint Grid - Architect */}
                          {/* Bottom layer */}
                          <path d="M100 130 L40 100 L100 70 L160 100 Z" fill="#d1fae5" stroke="#16a34a" strokeWidth="1.5" />
                          {/* Grid lines on bottom layer */}
                          <line x1="60" y1="105" x2="120" y2="75" stroke="#16a34a" strokeWidth="0.8" opacity="0.5" />
                          <line x1="80" y1="110" x2="140" y2="80" stroke="#16a34a" strokeWidth="0.8" opacity="0.5" />
                          <line x1="60" y1="95" x2="120" y2="125" stroke="#16a34a" strokeWidth="0.8" opacity="0.5" />
                          <line x1="80" y1="85" x2="140" y2="115" stroke="#16a34a" strokeWidth="0.8" opacity="0.5" />

                          {/* Middle layer */}
                          <path d="M100 110 L40 80 L100 50 L160 80 Z" fill="#bbf7d0" stroke="#16a34a" strokeWidth="1.5" />
                          {/* Grid lines on middle layer */}
                          <line x1="60" y1="85" x2="120" y2="55" stroke="#16a34a" strokeWidth="0.8" opacity="0.5" />
                          <line x1="80" y1="90" x2="140" y2="60" stroke="#16a34a" strokeWidth="0.8" opacity="0.5" />
                          <line x1="60" y1="75" x2="120" y2="105" stroke="#16a34a" strokeWidth="0.8" opacity="0.5" />
                          <line x1="80" y1="65" x2="140" y2="95" stroke="#16a34a" strokeWidth="0.8" opacity="0.5" />

                          {/* Top layer */}
                          <path d="M100 90 L40 60 L100 30 L160 60 Z" fill="#86efac" stroke="#16a34a" strokeWidth="1.8" />
                          {/* Grid lines on top layer */}
                          <line x1="60" y1="65" x2="120" y2="35" stroke="#16a34a" strokeWidth="0.8" opacity="0.6" />
                          <line x1="80" y1="70" x2="140" y2="40" stroke="#16a34a" strokeWidth="0.8" opacity="0.6" />
                          <line x1="60" y1="55" x2="120" y2="85" stroke="#16a34a" strokeWidth="0.8" opacity="0.6" />
                          <line x1="80" y1="45" x2="140" y2="75" stroke="#16a34a" strokeWidth="0.8" opacity="0.6" />

                          {/* Vertical connectors */}
                          <line x1="40" y1="60" x2="40" y2="100" stroke="#16a34a" strokeWidth="1.5" />
                          <line x1="160" y1="60" x2="160" y2="100" stroke="#16a34a" strokeWidth="1.5" />
                          <line x1="100" y1="30" x2="100" y2="70" stroke="#16a34a" strokeWidth="1.5" />
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
                        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Toolbox - Contractor */}
                          {/* Toolbox body */}
                          <rect x="45" y="70" width="110" height="60" rx="6" fill="#eff6ff" stroke="#334155" strokeWidth="2" />
                          {/* Toolbox lid */}
                          <rect x="42" y="62" width="116" height="14" rx="4" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
                          {/* Handle */}
                          <path d="M80 62 L80 52 Q80 46 86 46 L114 46 Q120 46 120 52 L120 62" stroke="#334155" strokeWidth="2.5" fill="none" />
                          {/* Latch */}
                          <rect x="93" y="66" width="14" height="6" rx="2" fill="#94a3b8" stroke="#334155" strokeWidth="1" />
                          {/* Toolbox divider line */}
                          <line x1="100" y1="76" x2="100" y2="124" stroke="#cbd5e1" strokeWidth="1" />
                          {/* Compartment lines */}
                          <line x1="50" y1="97" x2="150" y2="97" stroke="#cbd5e1" strokeWidth="1" />

                          {/* Wrench - left side */}
                          <path d="M58 22 L58 55" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
                          <circle cx="58" cy="18" r="6" fill="none" stroke="#475569" strokeWidth="2.5" />
                          <path d="M54 12 L62 12" stroke="#475569" strokeWidth="2.5" />

                          {/* Screwdriver - right side */}
                          <rect x="130" y="20" width="6" height="16" rx="2" fill="#475569" />
                          <line x1="133" y1="36" x2="133" y2="58" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M131 16 L135 16 L134 12 L132 12 Z" fill="#475569" />

                          {/* Hammer - center */}
                          <line x1="100" y1="30" x2="100" y2="58" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                          <rect x="88" y="20" width="24" height="12" rx="2" fill="#64748b" stroke="#334155" strokeWidth="1.5" />

                          {/* Ruler marks inside box */}
                          <line x1="60" y1="82" x2="90" y2="82" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                          <line x1="60" y1="87" x2="80" y2="87" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
                          <line x1="110" y1="82" x2="140" y2="82" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
                          <line x1="110" y1="87" x2="130" y2="87" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
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
                        <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                          {/* Two Construction Workers - Labour */}

                          {/* Worker 1 (left) - with hammer */}
                          {/* Hard hat */}
                          <ellipse cx="72" cy="28" rx="14" ry="6" fill="#ea580c" />
                          <path d="M58 28 Q58 18 72 14 Q86 18 86 28" fill="#ea580c" />
                          <line x1="56" y1="28" x2="88" y2="28" stroke="#c2410c" strokeWidth="2" />
                          {/* Head */}
                          <circle cx="72" cy="38" r="10" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
                          {/* Eyes */}
                          <circle cx="68" cy="36" r="1.5" fill="#334155" />
                          <circle cx="76" cy="36" r="1.5" fill="#334155" />
                          {/* Body / overalls */}
                          <path d="M60 48 L60 90 L84 90 L84 48 Q72 56 60 48" fill="#c2410c" />
                          {/* Belt */}
                          <rect x="60" y="68" width="24" height="4" fill="#92400e" />
                          {/* Arms */}
                          <line x1="60" y1="52" x2="48" y2="72" stroke="#c2410c" strokeWidth="4" strokeLinecap="round" />
                          <line x1="84" y1="52" x2="96" y2="72" stroke="#c2410c" strokeWidth="4" strokeLinecap="round" />
                          {/* Hands */}
                          <circle cx="48" cy="72" r="3" fill="#fde68a" />
                          <circle cx="96" cy="72" r="3" fill="#fde68a" />
                          {/* Hammer in right hand */}
                          <line x1="96" y1="72" x2="96" y2="42" stroke="#78716c" strokeWidth="2.5" strokeLinecap="round" />
                          <rect x="90" y="36" width="12" height="8" rx="1" fill="#78716c" stroke="#57534e" strokeWidth="1" />
                          {/* Legs */}
                          <line x1="66" y1="90" x2="64" y2="115" stroke="#c2410c" strokeWidth="4" strokeLinecap="round" />
                          <line x1="78" y1="90" x2="80" y2="115" stroke="#c2410c" strokeWidth="4" strokeLinecap="round" />
                          {/* Boots */}
                          <rect x="58" y="113" width="12" height="6" rx="2" fill="#78716c" />
                          <rect x="74" y="113" width="12" height="6" rx="2" fill="#78716c" />

                          {/* Worker 2 (right) - with trowel */}
                          {/* Hard hat */}
                          <ellipse cx="138" cy="28" rx="14" ry="6" fill="#ea580c" />
                          <path d="M124 28 Q124 18 138 14 Q152 18 152 28" fill="#ea580c" />
                          <line x1="122" y1="28" x2="154" y2="28" stroke="#c2410c" strokeWidth="2" />
                          {/* Head */}
                          <circle cx="138" cy="38" r="10" fill="#fde68a" stroke="#d97706" strokeWidth="1" />
                          {/* Eyes */}
                          <circle cx="134" cy="36" r="1.5" fill="#334155" />
                          <circle cx="142" cy="36" r="1.5" fill="#334155" />
                          {/* Body / overalls */}
                          <path d="M126 48 L126 90 L150 90 L150 48 Q138 56 126 48" fill="#b45309" />
                          {/* Belt */}
                          <rect x="126" y="68" width="24" height="4" fill="#78350f" />
                          {/* Arms */}
                          <line x1="126" y1="52" x2="112" y2="68" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
                          <line x1="150" y1="52" x2="162" y2="68" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
                          {/* Hands */}
                          <circle cx="112" cy="68" r="3" fill="#fde68a" />
                          <circle cx="162" cy="68" r="3" fill="#fde68a" />
                          {/* Trowel in right hand */}
                          <line x1="162" y1="68" x2="168" y2="48" stroke="#78716c" strokeWidth="2" strokeLinecap="round" />
                          <path d="M164 48 L172 38 L176 42 L168 52 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
                          {/* Legs */}
                          <line x1="132" y1="90" x2="130" y2="115" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
                          <line x1="144" y1="90" x2="146" y2="115" stroke="#b45309" strokeWidth="4" strokeLinecap="round" />
                          {/* Boots */}
                          <rect x="124" y="113" width="12" height="6" rx="2" fill="#78716c" />
                          <rect x="140" y="113" width="12" height="6" rx="2" fill="#78716c" />
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

                {/* Featured Professionals Section */}
                <section className="dashboard-section" id="featured-professionals-section">
                  <h3 className="section-title">Featured Professionals</h3>
                  <div className="role-illustration-grid" style={{ marginTop: '1.5rem' }}>
                    {/* Architect Card */}
                    <div className="role-illustration-card green" style={{ height: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div className="avatar-circle" style={{ width: '48px', height: '48px', fontSize: '1.2rem', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {featuredPros.Architect ? featuredPros.Architect.fullName.charAt(0).toUpperCase() : 'R'}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                            {featuredPros.Architect ? `Ar. ${featuredPros.Architect.fullName}` : 'Ar. Rohit shrivastav'}
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: '600' }}>Architect</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563' }}>
                          <Briefcase size={16} style={{ color: '#10b981' }} />
                          <strong>{featuredPros.Architect?.experience || '3-5 Years'} Experience</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563' }}>
                          <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                          <strong>{featuredPros.Architect?.projects || 18} Projects Completed</strong>
                        </div>
                      </div>

                      <button 
                        className="btn-get-started" 
                        style={{ 
                          width: '100%', 
                          marginTop: 'auto', 
                          background: '#10b981', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.65rem', 
                          borderRadius: '0.5rem', 
                          fontWeight: '600', 
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                          textAlign: 'center'
                        }}
                        onClick={() => {
                          if (featuredPros.Architect) {
                            navigate(`/architect/${featuredPros.Architect._id}`);
                          } else {
                            navigate('/architects');
                          }
                        }}
                      >
                        View Profile
                      </button>
                    </div>

                    {/* Contractor Card */}
                    <div className="role-illustration-card blue" style={{ height: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div className="avatar-circle" style={{ width: '48px', height: '48px', fontSize: '1.2rem', backgroundColor: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {featuredPros.Contractor ? featuredPros.Contractor.fullName.charAt(0).toUpperCase() : 'K'}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                            {featuredPros.Contractor ? featuredPros.Contractor.fullName : 'Karan Chaubey'}
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600' }}>
                            {featuredPros.Contractor?.contractorType || 'Contractor'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563' }}>
                          <Briefcase size={16} style={{ color: '#3b82f6' }} />
                          <strong>{featuredPros.Contractor?.experience || '1-3 Years'} Experience</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563' }}>
                          <CheckCircle2 size={16} style={{ color: '#3b82f6' }} />
                          <strong>{featuredPros.Contractor?.projects || 15} Projects Completed</strong>
                        </div>
                      </div>

                      <button 
                        className="btn-get-started" 
                        style={{ 
                          width: '100%', 
                          marginTop: 'auto', 
                          background: '#3b82f6', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.65rem', 
                          borderRadius: '0.5rem', 
                          fontWeight: '600', 
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)',
                          textAlign: 'center'
                        }}
                        onClick={() => {
                          if (featuredPros.Contractor) {
                            navigate(`/contractor/${featuredPros.Contractor._id}`);
                          } else {
                            navigate('/contractors');
                          }
                        }}
                      >
                        View Profile
                      </button>
                    </div>

                    {/* Labour Card */}
                    <div className="role-illustration-card orange" style={{ height: 'auto', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div className="avatar-circle" style={{ width: '48px', height: '48px', fontSize: '1.2rem', backgroundColor: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {featuredPros.Labour ? featuredPros.Labour.fullName.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <h4 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                            {featuredPros.Labour ? featuredPros.Labour.fullName : 'Amit Kumar'}
                          </h4>
                          <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: '600' }}>
                            {featuredPros.Labour?.skillType || 'Labour'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563' }}>
                          <Briefcase size={16} style={{ color: '#f59e0b' }} />
                          <strong>{featuredPros.Labour?.experience || '8 Years'} Experience</strong>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#4b5563' }}>
                          <CheckCircle2 size={16} style={{ color: '#f59e0b' }} />
                          <strong>{featuredPros.Labour?.projects || 30} Projects Completed</strong>
                        </div>
                      </div>

                      <button 
                        className="btn-get-started" 
                        style={{ 
                          width: '100%', 
                          marginTop: 'auto', 
                          background: '#f59e0b', 
                          color: 'white', 
                          border: 'none', 
                          padding: '0.65rem', 
                          borderRadius: '0.5rem', 
                          fontWeight: '600', 
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)',
                          textAlign: 'center'
                        }}
                        onClick={() => {
                          if (featuredPros.Labour) {
                            navigate(`/labour/${featuredPros.Labour._id}`);
                          } else {
                            navigate('/labour');
                          }
                        }}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </section>

                {/* Browse by Service Section */}
                <section className="dashboard-section" id="browse-services-section">
                  <h3 className="section-title">Browse by Service</h3>
                  <div className="popular-categories-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    
                    <div className="pop-cat-card" onClick={() => navigate('/contractors', { state: { searchVal: 'Building Construction' } })}>
                      <div className="cat-icon-wrapper blue">
                        <Building2 size={24} />
                      </div>
                      <h4>Residential Construction</h4>
                    </div>

                    <div className="pop-cat-card" onClick={() => navigate('/contractors', { state: { searchVal: 'Civil Work' } })}>
                      <div className="cat-icon-wrapper slate">
                        <Briefcase size={24} />
                      </div>
                      <h4>Commercial Construction</h4>
                    </div>

                    <div className="pop-cat-card" onClick={() => navigate('/architects', { state: { searchVal: 'Design' } })}>
                      <div className="cat-icon-wrapper green">
                        <Compass size={24} />
                      </div>
                      <h4>Architecture & Design</h4>
                    </div>

                    <div className="pop-cat-card" onClick={() => navigate('/architects', { state: { searchVal: 'Interior' } })}>
                      <div className="cat-icon-wrapper purple">
                        <Sofa size={24} />
                      </div>
                      <h4>Interior Design</h4>
                    </div>

                    <div className="pop-cat-card" onClick={() => navigate('/contractors', { state: { searchVal: 'Renovation' } })}>
                      <div className="cat-icon-wrapper orange">
                        <Wrench size={24} />
                      </div>
                      <h4>Renovation</h4>
                    </div>

                    <div className="pop-cat-card" onClick={() => navigate('/labour', { state: { skillVal: 'Electrician' } })}>
                      <div className="cat-icon-wrapper yellow">
                        <Sparkles size={24} />
                      </div>
                      <h4>Electrical Work</h4>
                    </div>

                    <div className="pop-cat-card" onClick={() => navigate('/labour', { state: { skillVal: 'Plumber' } })}>
                      <div className="cat-icon-wrapper blue">
                        <Wrench size={24} />
                      </div>
                      <h4>Plumbing</h4>
                    </div>

                    <div className="pop-cat-card" onClick={() => navigate('/labour', { state: { skillVal: 'Painter' } })}>
                      <div className="cat-icon-wrapper red">
                        <Paintbrush size={24} />
                      </div>
                      <h4>Painting</h4>
                    </div>

                    <div className="pop-cat-card" onClick={() => navigate('/contractors', { state: { searchVal: 'Civil Work' } })}>
                      <div className="cat-icon-wrapper indigo">
                        <HardHat size={24} />
                      </div>
                      <h4>Civil Work</h4>
                    </div>

                  </div>
                </section>

                {/* How It Works Section */}
                <section className="dashboard-section">
                  <h3 className="section-title">How Allver Works</h3>
                  <div className="how-it-works-timeline">
                    <div className="timeline-step">
                      <div className="step-badge icon-only search-icon">
                        <Search size={20} />
                      </div>
                      <h5>1. Search Professionals</h5>
                      <p>Browse architects, contractors and labour.</p>
                    </div>

                    <div className="timeline-connector"></div>

                    <div className="timeline-step">
                      <div className="step-badge icon-only">
                        <User size={20} />
                      </div>
                      <h5>2. View Profiles</h5>
                      <p>Check experience, portfolio and ratings.</p>
                    </div>

                    <div className="timeline-connector"></div>

                    <div className="timeline-step">
                      <div className="step-badge icon-only chat-icon">
                        <MessageCircle size={20} />
                      </div>
                      <h5>3. Connect & Chat</h5>
                      <p>Discuss project requirements.</p>
                    </div>

                    <div className="timeline-connector"></div>

                    <div className="timeline-step">
                      <div className="step-badge icon-only start-icon">
                        <CheckCircle2 size={20} />
                      </div>
                      <h5>4. Start Project</h5>
                      <p>Finalize scope and begin work.</p>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* FEED TAB - Discover page - full desktop website layout */}
            {activeTab === 'feed' && (
              <div className="tab-pane feed-tab">
                <div className="feed-grid-container">

                  {/* ── Left Column: Feed ── */}
                  <div className="feed-left-col">

                    {/* Page title */}
                    <div className="discover-page-header">
                      <h2 className="discover-page-title">Discover</h2>
                    </div>

                    {/* Create post bar */}
                    <div className="create-post-bar">
                      <div className="create-post-avatar">
                        {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="create-post-placeholder">
                        Share a project, progress update or insight…
                      </div>
                      <button style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg,#0f766e,#115e59)', color: 'white', border: 'none', borderRadius: '0.65rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
                        <Image size={15} /> Post
                      </button>
                    </div>


                    {/* Feed card list */}
                    <div className="discover-feed-list">
                      {feedPosts.map(post => (
                        <div key={post.id} className="feed-card">

                          {/* Card header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                              <img
                                src={post.author.avatar}
                                alt={post.author.name}
                                style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #f1f5f9' }}
                              />
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <strong style={{ fontSize: '0.97rem', color: '#0f172a', fontWeight: '750' }}>{post.author.name}</strong>
                                  <CheckCircle2 size={13} style={{ color: post.author.verifiedColor, fill: post.author.verifiedColor, stroke: 'white' }} />
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1px' }}>
                                  {post.author.role} • {post.author.location}
                                </div>
                                <div style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                  {post.time} • <Globe size={11} />
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: '700', background: '#f0fdf4', color: '#0f766e', padding: '0.2rem 0.6rem', borderRadius: '1rem', border: '1px solid #bbf7d0' }}>
                                {post.contentType}
                              </span>
                              <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', letterSpacing: '1px', padding: '0.1rem 0.3rem' }}>•••</button>
                            </div>
                          </div>

                          {/* Post text */}
                          <p style={{ fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'pre-line', margin: 0, lineHeight: '1.6', fontWeight: '500' }}>
                            {post.content}
                          </p>

                          {/* Post images */}
                          <div className="post-images-grid">
                            {post.images.map((img, idx) => (
                              <div key={idx} className="post-image-cell">
                                <img src={img} alt={`post-img-${idx}`} />
                              </div>
                            ))}
                          </div>

                          {/* Reaction count row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', fontSize: '0.82rem', color: '#64748b' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', background: '#ef4444', borderRadius: '50%', fontSize: '9px' }}>❤️</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', background: '#f59e0b', borderRadius: '50%', fontSize: '9px', marginLeft: '-5px', border: '1.5px solid white' }}>🙏</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '18px', height: '18px', background: '#10b981', borderRadius: '50%', fontSize: '9px', marginLeft: '-5px', border: '1.5px solid white' }}>👏</span>
                              <span style={{ marginLeft: '6px', fontWeight: '600', color: '#475569' }}>{post.appreciates}</span>
                            </div>
                            <span style={{ fontWeight: '600', color: '#475569' }}>{post.comments} Comments</span>
                          </div>

                          {/* Action buttons */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {[
                              { icon: <Heart size={16} fill={post.hasAppreciated ? '#ef4444' : 'none'} />, label: 'Appreciate', active: post.hasAppreciated, action: () => handleAppreciatePost(post.id) },
                              { icon: <MessageSquare size={16} />, label: 'Comment', active: false, action: null },
                              { icon: <Users size={16} />, label: 'Connect', active: false, action: null },
                              { icon: <Bookmark size={16} />, label: 'Save', active: false, action: null },
                            ].map(({ icon, label, active, action }) => (
                              <button
                                key={label}
                                onClick={action || undefined}
                                style={{
                                  background: 'none', border: 'none', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                  fontSize: '0.86rem', fontWeight: '600',
                                  color: active ? '#ef4444' : '#64748b',
                                  padding: '0.3rem 0.5rem', borderRadius: '0.4rem',
                                  transition: 'background 0.15s, color 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                {icon} {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Right Column: Sidebar Widgets ── */}
                  <div className="feed-right-col">

                    {/* Profile summary widget */}
                    <div className="feed-widget-card profile-summary-widget">
                      <div className="widget-header-bg"></div>
                      <div className="profile-summary-body">
                        <div className="profile-summary-avatar">
                          {currentUser.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt={currentUser.fullName} />
                          ) : (
                            <div className="avatar-initials">
                              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                          )}
                        </div>
                        <h4 className="profile-name">{currentUser.fullName}</h4>
                        <p className="profile-role">{currentUser.role}</p>
                        <p className="profile-location">
                          <MapPin size={12} /> {currentUser.city || 'India'}
                        </p>

                        <div className="profile-widget-stats">
                          <div className="stat-item">
                            <span className="stat-num">{workspaces.length}</span>
                            <span className="stat-label">Projects</span>
                          </div>
                          <div className="stat-divider"></div>
                          <div className="stat-item">
                            <span className="stat-num">256</span>
                            <span className="stat-label">Followers</span>
                          </div>
                          <div className="stat-divider"></div>
                          <div className="stat-item">
                            <span className="stat-num">48</span>
                            <span className="stat-label">Following</span>
                          </div>
                        </div>

                        <button className="widget-action-btn" onClick={() => navigate('/profile')}>
                          View Full Profile
                        </button>
                      </div>
                    </div>

                    {/* Suggested connections widget */}
                    <div className="feed-widget-card suggestions-widget">
                      <h3 className="widget-title">Suggested for You</h3>
                      <div className="suggestions-list">
                        {[
                          { id: 's1', name: 'Ar. Neha Sharma', role: 'Architect', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80', rating: 4.8 },
                          { id: 's2', name: 'Rohit Buildcon', role: 'Contractor', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80', rating: 4.7 },
                          { id: 's3', name: 'Amit Kumar', role: 'Labour', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80', rating: 4.9 },
                        ].map(pro => (
                          <div key={pro.id} className="suggestion-item">
                            <div className="avatar-wrapper-relative">
                              <img src={pro.avatar} alt={pro.name} className="item-avatar" />
                              <span className="online-indicator-dot"></span>
                            </div>
                            <div className="item-info">
                              <span className="item-name">{pro.name}</span>
                              <span className="item-role">{pro.role}</span>
                              <div className="item-rating">
                                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                <span>{pro.rating}</span>
                              </div>
                            </div>
                            <button className="item-connect-btn" onClick={() => {
                              if (pro.role === 'Architect') navigate('/architects');
                              else if (pro.role === 'Contractor') navigate('/contractors');
                              else navigate('/labour');
                            }}>
                              Connect
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Allver platform metrics widget */}
                    <div className="feed-widget-card stats-widget">
                      <div className="stats-header">
                        <Sparkles size={18} className="stats-icon-glowing" style={{ color: '#0ea5e9' }} />
                        <h3>Allver Metrics</h3>
                      </div>
                      <div className="stats-widget-grid">
                        {[
                          { icon: <Users size={15} />, num: '1.2K+', lbl: 'Verified Pros' },
                          { icon: <Building2 size={15} />, num: '450+', lbl: 'Spaces Built' },
                          { icon: <Sparkles size={15} />, num: '98%', lbl: 'Success Rate' },
                          { icon: <Calendar size={15} />, num: '24/7', lbl: 'Site Updates' },
                        ].map(({ icon, num, lbl }) => (
                          <div key={lbl} className="stat-grid-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px', color: '#0ea5e9' }}>
                              {icon}
                              <span className="grid-num">{num}</span>
                            </div>
                            <span className="grid-lbl">{lbl}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* DESIGN TAB - pinterest style gallery */}
            {activeTab === 'design' && (
              <div className="tab-pane design-tab" style={{ padding: '0.5rem 0 2rem' }}>
                {!selectedDesign ? (
                  <div className="designer-page-container">
                    
                    {/* Welcome Card Banner */}
                    <div className="design-welcome-banner">
                      <div className="banner-icon">
                        <Lightbulb size={20} />
                      </div>
                      <p>
                        Good design is more than just looks – it's about comfort, function, and creating spaces that truly feel like home.
                      </p>
                      {/* Post Design button — Architects only */}
                      {currentUser?.role === 'Architect' && (
                        <button
                          id="post-design-btn"
                          className="post-design-cta-btn"
                          onClick={() => { setShowPostDesignModal(true); setPostDesignError(''); }}
                        >
                          <Plus size={16} />
                          Post Design
                        </button>
                      )}
                    </div>

                    {/* Search & Price range select row */}
                    <div className="design-search-row">
                      <div className="design-select-wrapper">
                        <Search size={16} className="design-select-icon" />
                        <select 
                          className="design-select-input"
                          value={designTabSearch}
                          onChange={e => setDesignTabSearch(e.target.value)}
                        >
                          <option value="">Search design type</option>
                          <option value="Apartment">Apartment</option>
                          <option value="Bedroom">Bedroom</option>
                          <option value="Kitchen">Kitchen</option>
                          <option value="Living Room">Living Room</option>
                        </select>
                        <ChevronDown size={14} className="design-select-chevron" />
                      </div>

                      <div className="design-select-wrapper">
                        <Search size={16} className="design-select-icon" />
                        <select 
                          className="design-select-input"
                          value={designTabPrice}
                          onChange={e => setDesignTabPrice(e.target.value)}
                        >
                          <option value="">Search price range</option>
                          <option value="budget">Budget-Friendly</option>
                          <option value="mid">Mid-Range</option>
                          <option value="premium">Premium / Luxury</option>
                        </select>
                        <ChevronDown size={14} className="design-select-chevron" />
                      </div>
                    </div>

                    {/* Designs showcase list */}
                    <div className="design-showcase-list">
                      {designsList
                        .filter(d => {
                          const textMatch = !designTabSearch || 
                            d.title.toLowerCase().includes(designTabSearch.toLowerCase()) || 
                            d.overview.toLowerCase().includes(designTabSearch.toLowerCase());
                          return textMatch;
                        })
                        .map(d => (
                          <div 
                            key={d.id} 
                            className="design-showcase-card"
                            onClick={() => {
                              setSelectedDesign(d);
                              setShowFullOverview(false);
                            }}
                          >
                            <div className="design-card-img-wrapper">
                              <img src={d.mainImage} alt={d.title} />
                              <span className="design-card-img-indicator">{d.imgCount}</span>
                            </div>
                            <div className="design-card-body">
                              <div className="design-card-title-row">
                                <h4>{d.title}</h4>
                              </div>
                              <div className="design-card-location">
                                <MapPin size={13} />
                                <span>{d.location}</span>
                              </div>
                              
                              <div className="design-card-footer">
                                <div className="design-card-stats">
                                  <button 
                                    className={`design-card-stat ${d.hasLiked ? 'liked' : ''}`}
                                    onClick={(e) => handleLikeDesign(d.id, e)}
                                  >
                                    <Heart size={14} fill={d.hasLiked ? "#ef4444" : "none"} />
                                    <span>{d.likes}</span>
                                  </button>
                                  <div className="design-card-stat">
                                    <MessageSquare size={14} />
                                    <span>{d.comments}</span>
                                  </div>
                                </div>

                                <div className="design-card-author">
                                  <img src={d.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&q=80'} alt={d.author} />
                                  <span className="name">
                                    {d.author.startsWith('Ar.') ? d.author : `Ar. ${d.author}`}
                                  </span>
                                  <div className="rating">
                                    <Star size={12} fill="#f59e0b" />
                                    <span>{d.rating}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Empty state when no designs exist */}
                    {!designsLoading && designsList.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                        <PenLine size={48} style={{ margin: '0 auto 1rem', display: 'block', color: '#cbd5e1' }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>No Designs Yet</h3>
                        <p style={{ fontSize: '0.85rem' }}>Architects can post their first design using the "Post Design" button above.</p>
                      </div>
                    )}

                  </div>
                ) : (
                               <div className="web-detail-container">

                    {/* Top bar header */}
                    <div className="web-detail-topbar">
                      <button className="web-topbar-btn" onClick={() => setSelectedDesign(null)}>
                        <ArrowLeft size={16} />
                        <span>Back to Designs</span>
                      </button>
                      <div className="web-topbar-actions">
                        <button className="web-icon-only-btn">
                          <Share2 size={18} />
                        </button>
                        <button 
                          className="web-icon-only-btn"
                          onClick={(e) => handleSaveDesign(selectedDesign.id, e)}
                        >
                          <Bookmark size={18} fill={selectedDesign.saved ? "#1e293b" : "none"} />
                        </button>
                      </div>
                    </div>

                    {/* Widescreen profile section */}
                    <div className="web-detail-profile-row">
                      <div className="web-profile-info-group">
                        <img 
                          src={selectedDesign.avatarUrl} 
                          alt={selectedDesign.author} 
                          className="web-profile-avatar"
                        />
                        <div className="web-profile-text">
                          <h2 className="web-design-title">{selectedDesign.title}</h2>
                          <div className="web-design-meta-inline">
                            <div className="web-meta-item">
                              <MapPin size={14} />
                              <span>{selectedDesign.location}</span>
                            </div>
                            <span className="sep">•</span>
                            <div className="web-design-author">
                              <span>By Ar. {selectedDesign.author}</span>
                              <CheckCircle2 size={13} style={{ color: "#10b981", fill: "#10b981", stroke: "white" }} />
                            </div>
                            <span className="sep">•</span>
                            <div className="web-design-rating">
                              <Star size={14} fill="#eab308" color="#eab308" />
                              <span>{selectedDesign.rating}</span>
                              <span className="web-rating-reviews">({selectedDesign.reviewsCount} reviews)</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Desktop profile CTA buttons */}
                      <div className="web-profile-cta-group">
                        <button 
                          className="web-profile-btn outline"
                          onClick={() => setFollowedAuthors(prev => ({ ...prev, [selectedDesign.author]: !prev[selectedDesign.author] }))}
                        >
                          {followedAuthors[selectedDesign.author] ? 'Following' : 'Follow'}
                        </button>
                        <button 
                          className="web-profile-btn outline"
                          onClick={() => {
                            const matched = designersList.find(dl => dl.fullName.toLowerCase().includes(selectedDesign.author.toLowerCase()));
                            if (matched) navigate(`/architect/${matched._id}`); else navigate("/architects");
                          }}
                        >
                          View Profile
                        </button>
                        <button 
                          className="web-profile-btn solid"
                          onClick={() => {
                            const matched = designersList.find(dl => dl.fullName.toLowerCase().includes(selectedDesign.author.toLowerCase()));
                            if (matched) { setActiveChatDesigner(matched); setActiveTab("chats"); } else setActiveTab("chats");
                          }}
                        >
                          <MessageSquare size={14} /> Contact
                        </button>
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="web-detail-tabs-bar">
                      {[["photos", "Photos"], ["videos", "Videos"], ["quotation", "Quotation"]].map(([val, label]) => (
                        <button 
                          key={val}
                          className={`web-detail-tab-btn${activeDetailTab === val ? " active" : ""}`}
                          onClick={() => setActiveDetailTab(val)}
                        >
                          {val === "photos" && <Image size={15} />}
                          {val === "videos" && <Play size={15} />}
                          {val === "quotation" && <FileText size={15} />}
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Photo/Video/Quotation views */}
                    {activeDetailTab === "photos" && (
                      <div className="web-detail-gallery">
                        <div className="web-gallery-main">
                          <img src={selectedDesign.mainImage} alt={selectedDesign.title} />
                          <span className="web-gallery-counter">1/12 Photos</span>
                        </div>
                        <div className="web-gallery-side">
                          <div className="web-gallery-thumb">
                            <img src={selectedDesign.images?.[1] || selectedDesign.mainImage} alt="kitchen" />
                          </div>
                          <div className="web-gallery-thumb">
                            <img src={selectedDesign.images?.[2] || selectedDesign.mainImage} alt="bedroom" />
                          </div>
                          <div className="web-gallery-thumb">
                            <img src={selectedDesign.images?.[3] || selectedDesign.mainImage} alt="bathroom" />
                            <div className="web-gallery-overlay">+9 More</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeDetailTab === "videos" && (
                      <div className="web-empty-tab">
                        <Play size={52} color="#016a3e" />
                        <h3>Widescreen Walkthrough Video</h3>
                        <p>Watch a full-screen, high-definition 3D video walkthrough tour of this architectural concept.</p>
                        <button 
                          className="web-profile-btn solid" 
                          style={{ marginTop: '12px' }}
                          onClick={() => {
                            const matched = designersList.find(dl => dl.fullName.toLowerCase().includes(selectedDesign.author.toLowerCase()));
                            if (matched) { setActiveChatDesigner(matched); setActiveTab("chats"); } else setActiveTab("chats");
                          }}
                        >
                          Request Video Access
                        </button>
                      </div>
                    )}

                    {activeDetailTab === "quotation" && (
                      <div className="web-empty-tab">
                        <FileText size={52} color="#016a3e" />
                        <h3>Get Custom Quotation</h3>
                        <p>Request a detailed PDF quotation breakdown covering layout plans, furniture options, and material specifications.</p>
                        <button 
                          className="web-profile-btn solid" 
                          style={{ marginTop: '12px' }}
                          onClick={() => {
                            const matched = designersList.find(dl => dl.fullName.toLowerCase().includes(selectedDesign.author.toLowerCase()));
                            if (matched) { setActiveChatDesigner(matched); setActiveTab("chats"); } else setActiveTab("chats");
                          }}
                        >
                          Request PDF Quote
                        </button>
                      </div>
                    )}

                    {/* Design Overview Card */}
                    <div className="web-overview-section">
                      <div className="web-overview-icon-box">
                        <HomeIcon size={24} />
                      </div>
                      <div className="web-overview-content">
                        <h3 className="web-overview-title">Design Overview</h3>
                        <p className="web-overview-text">
                          {showFullOverview 
                            ? (selectedDesign.overview || "This beautifully crafted design combines modern aesthetics with functional living spaces. Every corner is thoughtfully designed to maximise natural light, airflow, and comfort — creating a home that truly reflects the owner's lifestyle and aspirations.")
                            : (selectedDesign.overview 
                              ? (selectedDesign.overview.slice(0, 220) + "...") 
                              : "A modern and minimal 2BHK apartment design with a perfect blend of comfort, functionality and aesthetics. Warm tones, natural light and smart space planning make this home truly beautiful. Warm oak wood textures contrast with clean neutral backdrops to maximize contemporary visuals…")
                          }
                        </p>
                        <button 
                          className="web-show-more-btn"
                          onClick={() => setShowFullOverview(!showFullOverview)}
                        >
                          <span>{showFullOverview ? 'Show Less' : 'Show More'}</span>
                          {showFullOverview ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Engagement statistics section */}
                    <div className="web-stats-row">
                      <button 
                        className={`web-stat-item${selectedDesign.hasLiked ? " liked" : ""}`}
                        onClick={(e) => handleLikeDesign(selectedDesign.id, e)}
                      >
                        <Heart size={18} fill={selectedDesign.hasLiked ? "#ef4444" : "none"} />
                        <span>{selectedDesign.likes} Appreciations</span>
                      </button>
                      <button className="web-stat-item">
                        <MessageSquare size={18} />
                        <span>{selectedDesign.comments} Comments</span>
                      </button>
                      <button 
                        className={`web-stat-item${selectedDesign.saved ? " saved" : ""}`}
                        onClick={(e) => handleSaveDesign(selectedDesign.id, e)}
                      >
                        <Bookmark size={18} fill={selectedDesign.saved ? "#016a3e" : "none"} />
                        <span>{selectedDesign.saved ? "Saved to Design Collection" : "Save Design"}</span>
                      </button>
                    </div>

                    {/* Similar Designs grid */}
                    <div className="web-slider-section">
                      <div className="web-slider-header">
                        <h3 className="web-slider-title">Similar Designs</h3>
                        <a 
                          href="#" 
                          className="web-slider-view-all"
                          onClick={(e) => { e.preventDefault(); setSelectedDesign(null); }}
                        >
                          <span>View All</span>
                          <ArrowRight size={15} />
                        </a>
                      </div>
                      <div className="web-grid-4">
                        {[
                          { id: 'd1', title: 'Minimal 2BHK Apartment', location: 'Pune, Maharashtra', rating: 4.6, reviewsCount: 124, author: 'Neha Sharma', mainImage: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=400&q=80', overview: 'A modern and minimal 2BHK apartment design with a perfect blend of comfort, functionality and aesthetics. Warm tones, natural light and smart space planning make this home truly beautiful.' },
                          { id: 'd1_2', title: 'Modern Living Room', location: 'Mumbai, Maharashtra', rating: 4.7, reviewsCount: 98, author: 'Neha Sharma', mainImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80', overview: 'A stunning modern living room with warm light, customized TV console unit, and premium wooden acoustic wall panelings.' },
                          { id: 'd3', title: 'Modular Kitchen Design', location: 'Bengaluru, Karnataka', rating: 4.5, reviewsCount: 156, author: 'Priya Nair', mainImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80', overview: 'Sleek handle-less drawers, built-in kitchen appliances, and elegant marble countertops combine to create a clutter-free, premium cooking experience.' },
                          { id: 'd2', title: 'Luxury Bedroom Design', location: 'Pune, Maharashtra', rating: 4.6, reviewsCount: 74, author: 'Rohit Mehta', mainImage: 'https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=400&q=80', overview: 'This beautifully crafted bedroom design combines modern aesthetics with functional wardrobe fittings, elegant wall panel design, and ambient cove lighting.' }
                        ].map((item, idx) => (
                          <div 
                            key={idx} 
                            className="web-similar-card"
                            onClick={() => {
                              const matched = designsList.find(d => d.id === item.id);
                              if (matched) {
                                setSelectedDesign(matched);
                              } else {
                                setSelectedDesign({
                                  id: item.id,
                                  title: item.title,
                                  location: item.location,
                                  rating: item.rating,
                                  reviewsCount: item.reviewsCount,
                                  author: item.author,
                                  avatarUrl: item.id === 'd3' 
                                    ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                                    : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
                                  mainImage: item.mainImage,
                                  images: [
                                    item.mainImage,
                                    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80',
                                    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80',
                                    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80'
                                  ],
                                  imgCount: '1/3',
                                  likes: 128,
                                  comments: 24,
                                  saved: false,
                                  hasLiked: false,
                                  overview: item.overview
                                });
                              }
                              setActiveDetailTab('photos');
                              setShowFullOverview(false);
                            }}
                          >
                            <img src={item.mainImage} alt={item.title} className="web-similar-img" />
                            <div className="web-similar-body">
                              <h4 className="web-similar-title">{item.title}</h4>
                              <div className="web-similar-loc">{item.location}</div>
                              <div className="web-similar-rating">
                                <Star size={12} fill="#eab308" color="#eab308" />
                                <span>{item.rating}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Contractors Who Can Build This Design section */}
                    <div className="web-slider-section">
                      <div className="web-slider-header">
                        <h3 className="web-slider-title">Contractors Who Can Build This Design</h3>
                        <a href="#" className="web-slider-view-all" onClick={(e) => { e.preventDefault(); navigate('/contractors'); }}>
                          <span>View All</span>
                          <ArrowRight size={15} />
                        </a>
                      </div>
                      <div className="web-grid-3">
                        {[
                          { id: 'c1', name: 'BuildWell Construction', rating: 4.6, reviews: 98, budget: '₹8.5 L', avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=150&q=80' },
                          { id: 'c2', name: 'HomeCraft Builders', rating: 4.5, reviews: 76, budget: '₹8.8 L', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80' },
                          { id: 'c3', name: 'StructureLine Constructions', rating: 4.7, reviews: 120, budget: '₹8.2 L', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' }
                        ].map((con) => (
                          <div key={con.id} className="web-contractor-card">
                            <img src={con.avatar} alt={con.name} className="web-contractor-avatar" />
                            <h4 className="web-contractor-name">{con.name}</h4>
                            <div className="web-contractor-rating">
                              <Star size={13} fill="#eab308" color="#eab308" />
                              <span>{con.rating} ({con.reviews} Reviews)</span>
                            </div>
                            <div className="web-contractor-price">Starts at {con.budget}</div>
                            <button 
                              className={`web-contractor-hire-btn${hiredContractors[con.id] ? " hired" : ""}`}
                              onClick={() => setHiredContractors(prev => ({ ...prev, [con.id]: !prev[con.id] }))}
                            >
                              {hiredContractors[con.id] ? 'Hiring Request Sent' : 'Hire Now'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Floating sticky bar for action shortcuts */}
                    <div className="web-detail-sticky-bar">
                      <button 
                        className="web-sticky-btn outline"
                        onClick={() => {
                          alert("Creating customized design similar to this. A draft will be prepared shortly.");
                        }}
                      >
                        <HomeIcon size={18} />
                        <span>Get Similar Design</span>
                      </button>
                      <button 
                        className="web-sticky-btn solid"
                        onClick={() => {
                          const matched = designersList.find(dl => dl.fullName.toLowerCase().includes(selectedDesign.author.toLowerCase()));
                          if (matched) { setActiveChatDesigner(matched); setActiveTab("chats"); } else setActiveTab("chats");
                        }}
                      >
                        <MessageSquare size={18} />
                        <span>Contact Designer</span>
                      </button>
                    </div>

                  </div>
                )}\r\n

                {/* ====== POST DESIGN MODAL — Architect only ====== */}
                {showPostDesignModal && (
                  <div
                    style={{
                      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '1rem'
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowPostDesignModal(false); }}
                  >
                    <div style={{
                      background: 'white', borderRadius: '1rem', padding: '2rem',
                      width: '100%', maxWidth: '540px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                      maxHeight: '90vh', overflowY: 'auto'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #016a3e, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PenLine size={18} color="white" />
                          </div>
                          <div>
                            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>Post a Design</h2>
                            <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Share your architectural work with clients</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowPostDesignModal(false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {postDesignError && (
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#dc2626', fontSize: '0.85rem' }}>
                          <AlertTriangle size={16} />
                          {postDesignError}
                        </div>
                      )}

                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!postDesignForm.title.trim() || !postDesignForm.location.trim()) {
                            setPostDesignError('Title and Location are required.');
                            return;
                          }
                          setPostDesignLoading(true);
                          setPostDesignError('');
                          try {
                            const res = await fetch('http://localhost:5000/api/designs', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ authorId: currentUser._id, ...postDesignForm })
                            });
                            const data = await res.json();
                            if (res.ok) {
                              const d = data.design;
                              setDesignsList(prev => [{
                                id: d._id, title: d.title, location: d.location, overview: d.overview,
                                mainImage: d.mainImage || 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=600&q=80',
                                images: d.images || [], imgCount: d.images?.length || 1,
                                author: d.author?.fullName || currentUser.fullName, authorId: d.author?._id,
                                avatarUrl: d.author?.avatarUrl || '', rating: d.author?.rating || 4.5,
                                reviewsCount: d.author?.reviews || 0, likes: 0, comments: 0,
                                hasLiked: false, saved: false, designType: d.designType, priceRange: d.priceRange
                              }, ...prev]);
                              setShowPostDesignModal(false);
                              setPostDesignForm({ title: '', location: '', overview: '', mainImage: '', designType: 'Apartment', priceRange: 'mid' });
                            } else {
                              setPostDesignError(data.message || 'Failed to post design.');
                            }
                          } catch (err) {
                            setPostDesignError('Network error. Please try again.');
                          } finally {
                            setPostDesignLoading(false);
                          }
                        }}
                      >
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>Design Title *</label>
                          <input type="text" placeholder="e.g. Modern 3BHK Apartment Design" value={postDesignForm.title}
                            onChange={e => setPostDesignForm(p => ({ ...p, title: e.target.value }))} required
                            style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>Location *</label>
                          <input type="text" placeholder="e.g. Mumbai, Maharashtra" value={postDesignForm.location}
                            onChange={e => setPostDesignForm(p => ({ ...p, location: e.target.value }))} required
                            style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>Design Type</label>
                            <select value={postDesignForm.designType} onChange={e => setPostDesignForm(p => ({ ...p, designType: e.target.value }))}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }}>
                              {['Apartment', 'Bedroom', 'Kitchen', 'Living Room', 'Villa', 'Office', 'Other'].map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>Price Range</label>
                            <select value={postDesignForm.priceRange} onChange={e => setPostDesignForm(p => ({ ...p, priceRange: e.target.value }))}
                              style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', background: 'white' }}>
                              <option value="budget">Budget-Friendly</option>
                              <option value="mid">Mid-Range</option>
                              <option value="premium">Premium / Luxury</option>
                            </select>
                          </div>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>
                            Cover Photo <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span>
                          </label>

                          {/* Drop zone / file picker */}
                          <label
                            htmlFor="design-photo-upload"
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              gap: '0.5rem', padding: '1.25rem', border: `2px dashed ${postDesignForm.mainImage ? '#10b981' : '#cbd5e1'}`,
                              borderRadius: '0.75rem', background: postDesignForm.mainImage ? '#f0fdf4' : '#f8fafc',
                              cursor: imageUploadLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                              minHeight: postDesignForm.mainImage ? 'auto' : '100px'
                            }}
                          >
                            {imageUploadLoading ? (
                              <>
                                <div style={{ width: '36px', height: '36px', border: '3px solid #e2e8f0', borderTop: '3px solid #10b981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600' }}>Uploading photo...</span>
                              </>
                            ) : postDesignForm.mainImage ? (
                              <>
                                <img
                                  src={postDesignForm.mainImage}
                                  alt="Preview"
                                  style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '0.5rem' }}
                                />
                                <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Upload size={13} /> Click to change photo
                                </span>
                              </>
                            ) : (
                              <>
                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Image size={20} color="#94a3b8" />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#374151' }}>Click to upload photo</span>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>PNG, JPG, WEBP — max 5 MB</span>
                              </>
                            )}
                            <input
                              id="design-photo-upload"
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              disabled={imageUploadLoading}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (file.size > 5 * 1024 * 1024) {
                                  setPostDesignError('Image must be under 5 MB.');
                                  return;
                                }
                                setImageUploadLoading(true);
                                setPostDesignError('');
                                try {
                                  const formData = new FormData();
                                  formData.append('image', file);
                                  const res = await fetch('http://localhost:5000/api/upload', {
                                    method: 'POST',
                                    body: formData
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.url) {
                                    setPostDesignForm(p => ({ ...p, mainImage: data.url }));
                                  } else {
                                    setPostDesignError(data.message || 'Upload failed. Please try again.');
                                  }
                                } catch (err) {
                                  setPostDesignError('Network error during upload.');
                                } finally {
                                  setImageUploadLoading(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>

                          {/* Remove photo button */}
                          {postDesignForm.mainImage && !imageUploadLoading && (
                            <button
                              type="button"
                              onClick={() => setPostDesignForm(p => ({ ...p, mainImage: '' }))}
                              style={{ marginTop: '0.4rem', background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px', fontFamily: 'inherit' }}
                            >
                              <X size={12} /> Remove photo
                            </button>
                          )}
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#374151', marginBottom: '0.4rem' }}>Design Overview <span style={{ fontWeight: '400', color: '#94a3b8' }}>(optional)</span></label>
                          <textarea rows={3} placeholder="Describe the design concept, materials, style and key features..."
                            value={postDesignForm.overview} onChange={e => setPostDesignForm(p => ({ ...p, overview: e.target.value }))}
                            style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1.5px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                          <button type="button" onClick={() => setShowPostDesignModal(false)}
                            style={{ flex: 1, padding: '0.75rem', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.6rem', fontWeight: '700', cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'inherit' }}>
                            Cancel
                          </button>
                          <button type="submit" disabled={postDesignLoading}
                            style={{ flex: 2, padding: '0.75rem', background: postDesignLoading ? '#94a3b8' : 'linear-gradient(135deg, #016a3e, #10b981)', color: 'white', border: 'none', borderRadius: '0.6rem', fontWeight: '700', cursor: postDesignLoading ? 'not-allowed' : 'pointer', fontSize: '0.9rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                            {postDesignLoading ? 'Posting...' : (<><Upload size={16} /> Publish Design</>)}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* CHATS TAB - interactive message panel */}
            {activeTab === 'chats' && (
              <div className="tab-pane chats-tab" style={{ padding: '0.5rem 0 2rem' }}>
                {!activeChatDesigner ? (
                  <div className="designer-page-container">
                    
                    {/* Welcome Card Banner */}
                    <div className="designer-welcome-banner" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', color: 'white', padding: '1.5rem', borderRadius: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div className="designer-banner-icon" style={{ background: 'rgba(255,255,255,0.2)', padding: '0.75rem', borderRadius: '0.75rem' }}>
                        <MessageCircle size={24} color="white" />
                      </div>
                      <div className="designer-banner-text">
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>Real-Time Conversations</h3>
                        <p style={{ margin: '0.25rem 0 0', opacity: 0.9, fontSize: '0.85rem' }}>Connect, coordinate, and share updates instantly with anyone on Allver.</p>
                      </div>
                    </div>

                    {/* Search & Filter row */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div className="designer-search-wrapper" style={{ flex: 1 }}>
                        <Search size={18} className="designer-search-icon" />
                        <input 
                          type="text" 
                          className="designer-search-input"
                          placeholder="Search users by name, location..." 
                          value={chatContactsSearch}
                          onChange={e => setChatContactsSearch(e.target.value)}
                        />
                      </div>
                      
                      {/* Filter Pills */}
                      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                        {['All', 'Architect', 'Contractor', 'Labour', 'Client'].map(role => (
                          <button
                            key={role}
                            onClick={() => setChatContactsFilter(role)}
                            style={{
                              padding: '0.4rem 1rem',
                              borderRadius: '2rem',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              border: '1px solid',
                              borderColor: chatContactsFilter === role ? '#0f766e' : '#cbd5e1',
                              background: chatContactsFilter === role ? '#0f766e' : 'white',
                              color: chatContactsFilter === role ? 'white' : '#475569',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {role === 'All' ? 'All Chats' : role === 'Client' ? 'Clients' : `${role}s`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contacts list */}
                    <div className="designer-list-container">
                      {allChatUsers
                        .filter(u => {
                          const nameMatch = (u.fullName || '').toLowerCase().includes(chatContactsSearch.toLowerCase()) || 
                                            (u.city || '').toLowerCase().includes(chatContactsSearch.toLowerCase());
                          const roleMatch = chatContactsFilter === 'All' || u.role === chatContactsFilter;
                          return nameMatch && roleMatch;
                        })
                        .sort((a, b) => {
                          const timeA = chatLastInteracted[a._id] || 0;
                          const timeB = chatLastInteracted[b._id] || 0;
                          if (timeA !== timeB) {
                            return timeB - timeA;
                          }
                          const hasMsgA = contactLastMessages[a._id] ? 1 : 0;
                          const hasMsgB = contactLastMessages[b._id] ? 1 : 0;
                          if (hasMsgB !== hasMsgA) {
                            return hasMsgB - hasMsgA;
                          }
                          return (a.fullName || '').localeCompare(b.fullName || '');
                        })
                        .map(prof => {
                          const initials = (prof.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                          const lastMsg = contactLastMessages[prof._id];
                          const unreadCount = unreadCounts[prof._id] || 0;
                          const isUnread = unreadCount > 0;
                          
                          // Role colors
                          const roleColorMap = {
                            Architect: '#10b981',
                            Contractor: '#3b82f6',
                            Labour: '#f59e0b',
                            Client: '#8b5cf6'
                          };
                          const roleColor = roleColorMap[prof.role] || '#64748b';

                          // Format time helper
                          const formatTime = (dateStr) => {
                            if (!dateStr) return '';
                            const d = new Date(dateStr);
                            const now = new Date();
                            if (d.toDateString() === now.toDateString()) {
                              return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                            }
                            const yesterday = new Date(now);
                            yesterday.setDate(now.getDate() - 1);
                            if (d.toDateString() === yesterday.toDateString()) {
                              return 'Yesterday';
                            }
                            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          };

                          return (
                            <div 
                              key={prof._id} 
                              className="designer-card"
                              onClick={() => openChat(prof)}
                              style={{ 
                                cursor: 'pointer',
                                background: isUnread ? '#f0fdfa' : 'white',
                                border: isUnread ? '1.5px solid #0f766e' : '1px solid #e2e8f0',
                                transition: 'all 0.2s',
                                padding: '1rem',
                                borderRadius: '0.75rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '1rem',
                                marginBottom: '0.75rem'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              {/* Left Side: Photo & Info */}
                              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <div className="designer-avatar-wrapper" style={{ position: 'relative', flexShrink: 0 }}>
                                  {prof.avatarUrl ? (
                                    <img 
                                      src={prof.avatarUrl} 
                                      alt={prof.fullName} 
                                      className="designer-avatar"
                                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <div className="designer-avatar" style={{ width: '48px', height: '48px', borderRadius: '50%', background: roleColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                                      {initials}
                                    </div>
                                  )}
                                  <span className="designer-status-dot" style={{ position: 'absolute', bottom: '2px', right: '2px', width: '12px', height: '12px', background: '#22c55e', border: '2px solid white', borderRadius: '50%' }}></span>
                                </div>

                                <div className="designer-details" style={{ flex: 1, minWidth: 0 }}>
                                  <div className="designer-name-row" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                                    <strong className="designer-name" style={{ fontSize: '1rem', color: '#0f172a' }}>
                                      {prof.role === 'Architect' ? `Ar. ${prof.fullName}` : prof.fullName}
                                    </strong>
                                    {prof.rating >= 4.5 && <CheckCircle2 size={14} className="designer-verified-badge" style={{ color: '#10b981' }} />}
                                    <span style={{ fontSize: '0.7rem', fontWeight: '600', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', background: `${roleColor}15`, color: roleColor }}>
                                      {prof.role}
                                    </span>
                                  </div>
                                  
                                  {/* Last Message Preview */}
                                  {lastMsg ? (
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: isUnread ? '#0f172a' : '#64748b', fontWeight: isUnread ? '600' : '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {lastMsg.fromMe ? 'You: ' : ''}{lastMsg.text}
                                    </p>
                                  ) : (
                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No messages yet</span>
                                  )}
                                </div>
                              </div>

                              {/* Right Side: Timestamp & Badge */}
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem', flexShrink: 0 }}>
                                {lastMsg && (
                                  <span style={{ fontSize: '0.75rem', color: isUnread ? '#0f766e' : '#94a3b8', fontWeight: isUnread ? '600' : '400' }}>
                                    {formatTime(lastMsg.createdAt)}
                                  </span>
                                )}
                                {isUnread && (
                                  <div style={{ background: '#0f766e', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', minWidth: '18px', height: '18px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                                    {unreadCount}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                      {allChatUsers.filter(u => {
                        const nameMatch = (u.fullName || '').toLowerCase().includes(chatContactsSearch.toLowerCase()) || 
                                          (u.city || '').toLowerCase().includes(chatContactsSearch.toLowerCase());
                        const roleMatch = chatContactsFilter === 'All' || u.role === chatContactsFilter;
                        return nameMatch && roleMatch;
                      }).length === 0 && (
                        <p style={{ textAlign: 'center', color: '#64748b', padding: '3rem 0' }}>No users matched your query or filter.</p>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="chat-window" style={{ maxWidth: '640px', margin: '0 auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem', overflow: 'hidden' }}>
                    <div className="chat-conversation-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      <div className="panel-header" style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button 
                            onClick={() => setActiveChatDesigner(null)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#0f766e',
                              fontWeight: '700',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '0.375rem',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            &larr; Back
                          </button>
                          <div style={{ width: '1px', height: '16px', background: '#e2e8f0' }}></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="avatar-circle" style={{ width: '32px', height: '32px', fontSize: '0.9rem', backgroundColor: activeChatDesigner.role === 'Architect' ? '#10b981' : activeChatDesigner.role === 'Contractor' ? '#3b82f6' : activeChatDesigner.role === 'Labour' ? '#f59e0b' : '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                              {(activeChatDesigner.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a' }}>
                                {activeChatDesigner.role === 'Architect' ? `Ar. ${activeChatDesigner.fullName}` : activeChatDesigner.fullName}
                              </strong>
                              <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '600' }}>● Connected</span>
                            </div>
                          </div>
                        </div>
                        {activeChatDesigner.role !== 'Client' && (
                          <button 
                            onClick={() => {
                              const route = activeChatDesigner.role === 'Architect' ? `/architect/${activeChatDesigner._id}` : activeChatDesigner.role === 'Contractor' ? `/contractor/${activeChatDesigner._id}` : `/labour/${activeChatDesigner._id}`;
                              navigate(route);
                            }}
                            style={{
                              background: '#eff6ff',
                              color: '#1e40af',
                              border: 'none',
                              padding: '0.4rem 0.85rem',
                              borderRadius: '0.375rem',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            View Profile
                          </button>
                        )}
                      </div>

                      <div className="messages-area" style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: '#f8fafc' }}>
                        {(designerChats[activeChatDesigner._id] || []).map((msg, idx) => {
                          const isFromMe = msg.senderId === currentUser._id || msg.senderId?._id === currentUser._id;
                          const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={idx} className={`message-bubble-wrapper ${isFromMe ? 'me' : 'other'}`} style={{ display: 'flex', justifyContent: isFromMe ? 'flex-end' : 'flex-start' }}>
                              <div className="message-bubble" style={{
                                maxWidth: '75%',
                                padding: '0.75rem 1rem',
                                borderRadius: isFromMe ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                                background: isFromMe ? '#0f766e' : 'white',
                                color: isFromMe ? 'white' : '#1e293b',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                border: isFromMe ? 'none' : '1px solid #e2e8f0'
                              }}>
                                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4', wordBreak: 'break-word' }}>{msg.text}</p>
                                <span className="msg-time" style={{ display: 'block', textAlign: 'right', fontSize: '0.7rem', color: isFromMe ? '#cbd5e1' : '#94a3b8', marginTop: '4px' }}>
                                  {formattedTime}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>

                      <form onSubmit={handleSendDesignerMessage} className="message-input-form" style={{ padding: '0.85rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', background: 'white' }}>
                        <input 
                          type="text" 
                          placeholder="Type a message..." 
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '0.65rem 0.85rem',
                            border: '1px solid #cbd5e1',
                            borderRadius: '0.5rem',
                            fontSize: '0.9rem',
                            outline: 'none'
                          }}
                        />
                        <button type="submit" className="send-btn" style={{
                          background: '#0f766e',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.5rem',
                          width: '38px',
                          height: '38px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}>
                          <Send size={16} />
                        </button>
                      </form>
                    </div>
                  </div>
                )}
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

            {/* WORKSPACES TAB - active workspaces with chat & quotations */}
            {activeTab === 'workspaces' && (
              <div className="tab-pane workspaces-tab" style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 160px)', minHeight: '520px' }}>
                {/* Left Side: Workspaces List */}
                <div className="workspaces-list-panel" style={{ width: '280px', background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Active Projects</h3>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>Your project workspaces</p>
                  </div>
                  
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {workspaces.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.8rem' }}>
                        <Briefcase size={32} style={{ color: '#cbd5e1', marginBottom: '0.5rem', margin: '0 auto' }} />
                        <p>No active workspaces yet. Create requests or accept pending hires to begin.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {workspaces.map(ws => {
                          const isClient = currentUser?.role === 'Client';
                          const participant = isClient ? ws.professional : ws.client;
                          const isSelected = selectedWorkspace === ws._id;
                          
                          return (
                            <button
                              key={ws._id}
                              onClick={() => {
                                setSelectedWorkspace(ws._id);
                                fetchWorkspaceDetail(ws._id);
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.35rem',
                                padding: '0.75rem 1rem',
                                border: 'none',
                                borderRadius: '0.5rem',
                                background: isSelected ? '#eff6ff' : 'transparent',
                                color: '#1e293b',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                                width: '100%',
                                boxSizing: 'border-box'
                              }}
                              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <strong style={{ fontSize: '0.88rem', color: isSelected ? '#1e40af' : '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                                  {ws.title}
                                </strong>
                                <span style={{
                                  fontSize: '0.65rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '1rem',
                                  background: ws.status === 'Discussion' ? '#f59e0b' : '#10b981',
                                  color: 'white',
                                  fontWeight: 'bold'
                                }}>
                                  {ws.status}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {participant ? participant.fullName : 'Professional'} ({participant ? (participant.role === 'Labour' ? 'Labour' : participant.role) : ''})
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Active Workspace Detail */}
                <div className="workspace-detail-panel" style={{ flex: 1, background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {workspaceDetail ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                      
                      {/* Workspace Header */}
                      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Project: {workspaceDetail.title}</h3>
                            <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: '#e0f2fe', color: '#0369a1', fontWeight: '600' }}>
                              {workspaceDetail.projectType}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                            Client: <strong>{workspaceDetail.client?.fullName}</strong> • Contractor: <strong>{workspaceDetail.professional?.fullName}</strong>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.8rem', color: '#475569' }}>Status:</span>
                          <strong style={{
                            fontSize: '0.85rem',
                            color: workspaceDetail.status === 'Discussion' ? '#f59e0b' : '#10b981',
                            background: workspaceDetail.status === 'Discussion' ? '#fef3c7' : '#dcfce7',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.5rem',
                            border: workspaceDetail.status === 'Discussion' ? '1px solid #fde68a' : '1px solid #bbf7d0'
                          }}>
                            {workspaceDetail.status}
                          </strong>
                        </div>
                      </div>

                      {/* Sub-tabs Selection */}
                      <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 1.25rem', background: '#fafbfd' }}>
                        {[
                          { id: 'chat', label: 'Workspace Chat', icon: <MessageSquare size={16} /> },
                          { id: 'quotation', label: 'Quotation Manager', icon: <Briefcase size={16} /> },
                          { id: 'files', label: 'Files & Drawings', icon: <Building2 size={16} /> }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setWorkspaceTab(t.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '1rem 1.25rem',
                              border: 'none',
                              borderBottom: workspaceTab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                              background: 'transparent',
                              color: workspaceTab === t.id ? '#3b82f6' : '#64748b',
                              fontSize: '0.88rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {t.icon}
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {/* Content Panel based on sub-tab */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        
                        {/* 1. CHAT SUB-TAB */}
                        {workspaceTab === 'chat' && (
                          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingRight: '0.5rem', marginBottom: '1rem' }}>
                              {workspaceDetail.messages?.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', marginTop: '2rem' }}>No messages yet. Start the discussion!</p>
                              ) : (
                                workspaceDetail.messages.map((msg, idx) => {
                                  const isSystem = msg.text.startsWith('📢') || msg.text.startsWith('📁');
                                  const isMe = msg.sender?._id === currentUser?._id || msg.sender === currentUser?._id;
                                  
                                  if (isSystem) {
                                    return (
                                      <div key={idx} style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                                        <div style={{ background: '#f1f5f9', color: '#475569', padding: '0.4rem 1rem', borderRadius: '1.5rem', fontSize: '0.78rem', fontWeight: '600', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                                          {msg.text}
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  return (
                                    <div key={idx} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                                      <div style={{
                                        maxWidth: '70%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: isMe ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                                        background: isMe ? '#3b82f6' : '#f8fafc',
                                        color: isMe ? 'white' : '#1e293b',
                                        border: isMe ? 'none' : '1px solid #e2e8f0',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                                      }}>
                                        <div style={{ fontSize: '0.72rem', color: isMe ? '#dbeafe' : '#64748b', fontWeight: 'bold', marginBottom: '2px' }}>
                                          {isMe ? 'You' : msg.sender?.fullName || 'User'}
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.45', wordBreak: 'break-word', fontWeight: '500' }}>
                                          {msg.text}
                                        </p>
                                        
                                        {msg.attachment && (
                                          <div style={{
                                            marginTop: '0.5rem',
                                            background: isMe ? 'rgba(255,255,255,0.15)' : '#f1f5f9',
                                            padding: '0.5rem',
                                            borderRadius: '0.5rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.78rem',
                                            border: isMe ? 'none' : '1px solid #cbd5e1'
                                          }}>
                                            <span>{msg.attachment.type === 'drawing' ? '📐' : '📄'}</span>
                                            <a 
                                              href="#" 
                                              onClick={(e) => { e.preventDefault(); alert(`Downloading file: ${msg.attachment.name}`); }}
                                              style={{ color: isMe ? 'white' : '#1e40af', fontWeight: 'bold', textDecoration: 'underline' }}
                                            >
                                              {msg.attachment.name}
                                            </a>
                                          </div>
                                        )}
                                        
                                        <span style={{ display: 'block', textAlign: 'right', fontSize: '0.65rem', color: isMe ? '#bfdbfe' : '#94a3b8', marginTop: '4px' }}>
                                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* Input Form with Attachment trigger */}
                            <form onSubmit={handleSendWsMessage} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 0 0', borderTop: '1px solid #f1f5f9' }}>
                              <button
                                type="button"
                                onClick={() => { setAttType('file'); setAttName(''); setShowAttModal(true); }}
                                style={{
                                  padding: '0.5rem 0.85rem',
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                📎 File
                              </button>
                              <button
                                type="button"
                                onClick={() => { setAttType('drawing'); setAttName(''); setShowAttModal(true); }}
                                style={{
                                  padding: '0.5rem 0.85rem',
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '0.5rem',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                📐 Drawing
                              </button>
                              <input
                                type="text"
                                placeholder="Type your message..."
                                value={wsMessageText}
                                onChange={e => setWsMessageText(e.target.value)}
                                style={{
                                  flex: 1,
                                  padding: '0.65rem 0.85rem',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '0.5rem',
                                  fontSize: '0.9rem',
                                  outline: 'none'
                                }}
                              />
                              <button
                                type="submit"
                                style={{
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '0.5rem',
                                  padding: '0.5rem 1rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                Send
                              </button>
                            </form>
                          </div>
                        )}

                        {/* 2. QUOTATION SUB-TAB */}
                        {workspaceTab === 'quotation' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', width: '100%', textAlign: 'left' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Project Quotation</h4>
                            
                            {/* Contractor view */}
                            {currentUser?.role !== 'Client' ? (
                              <>
                                {(workspaceDetail.quotation?.status === 'Draft' || workspaceDetail.quotation?.status === 'Rejected') && (
                                  <form onSubmit={handleSendQuotation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                                      {workspaceDetail.quotation?.status === 'Rejected' 
                                        ? '❌ The client rejected your previous quotation. Please submit a revised quote below:' 
                                        : 'Prepare and send an itemized quotation to the client. Total cost will be automatically calculated.'}
                                    </p>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#475569' }}>Quotation Line Items</label>
                                      {quoteItems.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                                          <input 
                                            type="text" 
                                            placeholder="e.g. Electrical wiring & setup"
                                            value={item.name}
                                            onChange={e => {
                                              const newItems = [...quoteItems];
                                              newItems[idx].name = e.target.value;
                                              setQuoteItems(newItems);
                                            }}
                                            required
                                            style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                                          />
                                          <input 
                                            type="number" 
                                            placeholder="Cost (₹)"
                                            value={item.cost}
                                            onChange={e => {
                                              const newItems = [...quoteItems];
                                              newItems[idx].cost = e.target.value;
                                              setQuoteItems(newItems);
                                            }}
                                            required
                                            style={{ width: '120px', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                                          />
                                          {quoteItems.length > 1 && (
                                            <button 
                                              type="button" 
                                              onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== idx))}
                                              style={{ padding: '0.5rem', background: 'none', border: 'none', color: '#ef4444', fontSize: '1.1rem', cursor: 'pointer' }}
                                            >
                                              &times;
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      
                                      <button 
                                        type="button" 
                                        onClick={() => setQuoteItems([...quoteItems, { name: '', cost: '' }])}
                                        style={{ width: 'fit-content', background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', padding: '4px 0' }}
                                      >
                                        + Add Item
                                      </button>
                                    </div>
                                    
                                    <button 
                                      type="submit"
                                      style={{ padding: '0.65rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59,130,246,0.2)' }}
                                    >
                                      Send Quotation
                                    </button>
                                  </form>
                                )}
                                
                                {workspaceDetail.quotation?.status === 'Sent' && (
                                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d97706', marginBottom: '1rem' }}>
                                      <span>⏳</span>
                                      <strong style={{ fontSize: '0.9rem' }}>Quotation Sent — Review Pending</strong>
                                    </div>
                                    {renderQuotationSummary()}
                                  </div>
                                )}
                                
                                {workspaceDetail.quotation?.status === 'Accepted' && (
                                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.25rem', borderRadius: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', marginBottom: '1rem' }}>
                                      <span>✅</span>
                                      <strong style={{ fontSize: '0.95rem' }}>Quotation Approved by Client</strong>
                                    </div>
                                    {renderQuotationSummary()}
                                  </div>
                                )}
                              </>
                            ) : (
                              /* Client view */
                              <>
                                {workspaceDetail.quotation?.status === 'Draft' && (
                                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
                                    <span>⏳</span>
                                    <h5 style={{ fontWeight: 'bold', margin: '0.5rem 0' }}>Quotation in Preparation</h5>
                                    <p style={{ fontSize: '0.82rem', margin: 0 }}>The professional is currently drafting the project quotation. You will be notified here once it is sent.</p>
                                  </div>
                                )}
                                
                                {workspaceDetail.quotation?.status === 'Sent' && (
                                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e40af', marginBottom: '1rem' }}>
                                      <span>📢</span>
                                      <strong style={{ fontSize: '0.9rem' }}>Quotation Received for Approval</strong>
                                    </div>
                                    
                                    {renderQuotationSummary()}
                                    
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                      <button 
                                        onClick={() => handleQuotationDecision('Accepted')}
                                        style={{ flex: 1, padding: '0.6rem', background: '#22c55e', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
                                      >
                                        Accept & Approve
                                      </button>
                                      <button 
                                        onClick={() => handleQuotationDecision('Rejected')}
                                        style={{ padding: '0.6rem 1.25rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  </div>
                                )}
                                
                                {workspaceDetail.quotation?.status === 'Accepted' && (
                                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.25rem', borderRadius: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', marginBottom: '1rem' }}>
                                      <span>✅</span>
                                      <strong style={{ fontSize: '0.95rem' }}>Quotation Approved</strong>
                                    </div>
                                    {renderQuotationSummary()}
                                  </div>
                                )}
                                
                                {workspaceDetail.quotation?.status === 'Rejected' && (
                                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1.25rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#dc2626', marginBottom: '0.5rem' }}>
                                      <span>❌</span>
                                      <strong style={{ fontSize: '0.9rem' }}>Quotation Rejected</strong>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>You rejected the quotation. Waiting for the contractor to send a revised quote.</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {/* 3. FILES & DRAWINGS SUB-TAB */}
                        {workspaceTab === 'files' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', textAlign: 'left' }}>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Project Documents & Layouts</h4>
                            
                            {workspaceDetail.files?.length === 0 ? (
                              <p style={{ color: '#64748b', fontSize: '0.85rem', padding: '1rem 0' }}>No files shared in this workspace yet. Use the Chat sub-tab to share drawings or files.</p>
                            ) : (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                                {workspaceDetail.files.map((file, idx) => (
                                  <div 
                                    key={idx} 
                                    style={{
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '0.75rem',
                                      padding: '1rem',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.5rem',
                                      background: '#f8fafc',
                                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                    }}
                                  >
                                    <div style={{ fontSize: '2rem' }}>
                                      {file.name.toLowerCase().endsWith('.png') || file.name.toLowerCase().endsWith('.jpg') ? '📐' : '📄'}
                                    </div>
                                    <strong style={{ fontSize: '0.85rem', color: '#1e293b', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={file.name}>
                                      {file.name}
                                    </strong>
                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                      Uploaded by {file.uploadedBy === workspaceDetail.client?._id ? 'Client' : 'Contractor'}
                                    </span>
                                    <button 
                                      onClick={() => alert(`Downloading: ${file.name}`)}
                                      style={{
                                        marginTop: '0.5rem',
                                        padding: '0.35rem',
                                        background: 'white',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        color: '#3b82f6',
                                        textAlign: 'center'
                                      }}
                                    >
                                      Download
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                      </div>

                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', padding: '2rem', textAlign: 'center' }}>
                      <Briefcase size={48} style={{ color: '#cbd5e1', marginBottom: '1rem', margin: '0 auto' }} />
                      <h4 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Select a Workspace</h4>
                      <p style={{ fontSize: '0.88rem', maxWidth: '320px', margin: '0 auto' }}>Select a project from the left sidebar panel to access the dedicated chat, file sharing, and quotation manager.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </main>

        {/* ─── View Project Request Detail Modal ─── */}
        {viewDetailRequest && (() => {
          const req = viewDetailRequest;
          const client = req.client;
          const roleColor = { Architect: '#10b981', Contractor: '#3b82f6', Labour: '#f59e0b' }[currentUser?.role] || '#6366f1';
          const clientInitial = client?.fullName ? client.fullName.charAt(0).toUpperCase() : '?';
          return (
            <div
              onClick={() => setViewDetailRequest(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ background: 'white', borderRadius: '1.25rem', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', position: 'relative' }}
              >
                {/* Color top bar */}
                <div style={{ height: '5px', background: `linear-gradient(90deg, ${roleColor}, ${roleColor}88)`, borderRadius: '1.25rem 1.25rem 0 0' }} />

                {/* Header */}
                <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    {client?.avatarUrl ? (
                      <img src={client.avatarUrl} alt={client.fullName} style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${roleColor}33` }} />
                    ) : (
                      <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `linear-gradient(135deg, ${roleColor}33, ${roleColor}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '1.4rem', color: roleColor, border: `2px solid ${roleColor}33`, flexShrink: 0 }}>
                        {clientInitial}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a' }}>{client?.fullName || 'Client'}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{client?.email || ''} {client?.city ? `• ${client.city}` : ''}</div>
                      {client?.phoneNumber && <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>📞 {client.phoneNumber}</div>}
                    </div>
                  </div>
                  <button
                    onClick={() => setViewDetailRequest(null)}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#64748b' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Project Title & Type */}
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.35rem' }}>{req.title}</h2>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {req.projectType && <span style={{ background: `${roleColor}15`, color: roleColor, fontSize: '0.75rem', fontWeight: '700', padding: '0.25rem 0.7rem', borderRadius: '2rem', border: `1px solid ${roleColor}33` }}>{req.projectType}</span>}
                      {req.priority && req.priority !== 'Normal' && <span style={{ background: req.priority === 'High' ? '#fef3c7' : '#fef2f2', color: req.priority === 'High' ? '#d97706' : '#ef4444', fontSize: '0.75rem', fontWeight: '700', padding: '0.25rem 0.7rem', borderRadius: '2rem', border: `1px solid ${req.priority === 'High' ? '#fde68a' : '#fecaca'}` }}>⚡ {req.priority} Priority</span>}
                    </div>
                  </div>

                  {/* Key Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #e2e8f0' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Budget</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#10b981' }}>{req.budget || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Location</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>{req.location || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Start Date</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>{req.startDate ? new Date(req.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>Completion Date</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>{req.expectedCompletionDate ? new Date(req.expectedCompletionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
                    </div>
                  </div>

                  {/* Role-specific fields */}
                  {(req.plotArea || req.builtUpArea || req.designRequirements || req.needSiteVisits !== undefined) && (
                    <div style={{ background: '#f0fdf4', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>🏛 Architect Specific Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                        {req.plotArea && <div><strong style={{ color: '#0f172a' }}>Plot Area:</strong> <span style={{ color: '#475569' }}>{req.plotArea} sq.ft</span></div>}
                        {req.builtUpArea && <div><strong style={{ color: '#0f172a' }}>Built-up Area:</strong> <span style={{ color: '#475569' }}>{req.builtUpArea} sq.ft</span></div>}
                        {req.designRequirements && <div style={{ gridColumn: '1 / -1' }}><strong style={{ color: '#0f172a' }}>Design Style:</strong> <span style={{ color: '#475569' }}>{req.designRequirements}</span></div>}
                        {req.needSiteVisits !== undefined && <div><strong style={{ color: '#0f172a' }}>Site Visits:</strong> <span style={{ color: '#475569' }}>{req.needSiteVisits ? 'Required' : 'Not required'}</span></div>}
                      </div>
                    </div>
                  )}

                  {(req.constructionType || req.totalArea || req.materialResponsibility || req.estimatedProjectDuration) && (
                    <div style={{ background: '#eff6ff', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: '0.78rem', color: '#2563eb', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>🏗 Contractor Specific Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                        {req.constructionType && <div><strong style={{ color: '#0f172a' }}>Construction Type:</strong> <span style={{ color: '#475569' }}>{req.constructionType}</span></div>}
                        {req.totalArea && <div><strong style={{ color: '#0f172a' }}>Total Area:</strong> <span style={{ color: '#475569' }}>{req.totalArea} sq.ft</span></div>}
                        {req.materialResponsibility && <div><strong style={{ color: '#0f172a' }}>Materials By:</strong> <span style={{ color: '#475569' }}>{req.materialResponsibility}</span></div>}
                        {req.estimatedProjectDuration && <div><strong style={{ color: '#0f172a' }}>Duration:</strong> <span style={{ color: '#475569' }}>{req.estimatedProjectDuration}</span></div>}
                        {req.labourIncluded !== undefined && <div><strong style={{ color: '#0f172a' }}>Labour Included:</strong> <span style={{ color: '#475569' }}>{req.labourIncluded ? 'Yes' : 'No'}</span></div>}
                      </div>
                    </div>
                  )}

                  {(req.labourCategory || req.workingDuration || req.dailyMonthlyContract) && (
                    <div style={{ background: '#fffbeb', borderRadius: '0.75rem', padding: '1rem', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>👷 Labour Specific Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                        {req.labourCategory && <div><strong style={{ color: '#0f172a' }}>Labour Category:</strong> <span style={{ color: '#475569' }}>{req.labourCategory}</span></div>}
                        {req.workingDuration && <div><strong style={{ color: '#0f172a' }}>Working Duration:</strong> <span style={{ color: '#475569' }}>{req.workingDuration}</span></div>}
                        {req.dailyMonthlyContract && <div><strong style={{ color: '#0f172a' }}>Contract Type:</strong> <span style={{ color: '#475569' }}>{req.dailyMonthlyContract}</span></div>}
                        {req.accommodationProvided !== undefined && <div><strong style={{ color: '#0f172a' }}>Accommodation:</strong> <span style={{ color: '#475569' }}>{req.accommodationProvided ? 'Provided' : 'Not provided'}</span></div>}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {req.description && (
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Project Description</div>
                      <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.7', margin: 0, background: '#f8fafc', padding: '1rem', borderRadius: '0.6rem', border: '1px solid #e2e8f0' }}>{req.description}</p>
                    </div>
                  )}

                  {/* Attachment */}
                  {req.attachmentUrl && (
                    <div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>Attachment</div>
                      <a href={req.attachmentUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#3b82f6', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none', background: '#eff6ff', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                        📎 {req.attachmentName || 'View Attachment'}
                      </a>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => { handleRequestAction(req._id, 'Accepted'); setViewDetailRequest(null); }}
                      style={{ flex: 1, padding: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '0.75rem', fontSize: '0.95rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(16,185,129,0.3)', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(16,185,129,0.3)'; }}
                    >
                      <CheckCircle size={18} /> Accept Request
                    </button>
                    <button
                      onClick={() => { handleRequestAction(req._id, 'Rejected'); setViewDetailRequest(null); }}
                      style={{ padding: '0.75rem 1.5rem', background: '#fff1f2', color: '#ef4444', border: '2px solid #fecaca', borderRadius: '0.75rem', fontSize: '0.95rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                    >
                      <XCircle size={18} /> Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Render Post a Project Modal */}
        {showPostProjectModal && (
          <div className="dl-modal-overlay" onClick={() => setShowPostProjectModal(false)}>
            <div className="dl-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="dl-modal-close" onClick={() => setShowPostProjectModal(false)}>
                <X size={20} />
              </button>
              
              <div className="dl-modal-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="dl-modal-title-block">
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <HardHat size={24} style={{ color: 'var(--color-contractor)' }} />
                    Post a Project
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>
                    Describe your construction or design needs to connect with verified professionals
                  </p>
                </div>
              </div>

              {projectPostedSuccess ? (
                <div className="dl-modal-body" style={{ padding: '3.5rem 2rem', textAlign: 'center', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <div style={{ color: '#10b981', display: 'flex', justifyContent: 'center' }}>
                    <CheckCircle2 size={64} />
                  </div>
                  <h4 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#0f172a' }}>Project Posted Successfully!</h4>
                  <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '380px', margin: '0 auto', lineHeight: '1.5' }}>
                    Your project details have been successfully published. Matching professionals will be notified to reach out to you.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePostProjectSubmit} className="dl-modal-body" style={{ gap: '1.2rem' }}>
                  <div className="form-row">
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'none', letterSpacing: 'normal' }}>Project Title *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Build 3BHK Residential Duplex"
                      value={postProjectForm.title}
                      onChange={(e) => setPostProjectForm({...postProjectForm, title: e.target.value})}
                      style={{
                        padding: '0.65rem 0.85rem',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        background: '#fafbfd',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div className="form-row">
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'none', letterSpacing: 'normal' }}>Category *</label>
                    <select
                      style={{
                        padding: '0.65rem 0.85rem',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        background: '#fafbfd',
                        outline: 'none',
                        width: '100%'
                      }}
                      value={postProjectForm.category}
                      onChange={(e) => setPostProjectForm({...postProjectForm, category: e.target.value})}
                    >
                      <option value="Residential Construction">Residential Construction</option>
                      <option value="Commercial Construction">Commercial Construction</option>
                      <option value="Architecture & Design">Architecture & Design</option>
                      <option value="Interior Design">Interior Design</option>
                      <option value="Renovation">Renovation</option>
                      <option value="Electrical Work">Electrical Work</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="Painting">Painting</option>
                      <option value="Civil Work">Civil Work</option>
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-row">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'none', letterSpacing: 'normal' }}>Budget (₹) *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. ₹ 25,00,000"
                        value={postProjectForm.budget}
                        onChange={(e) => setPostProjectForm({...postProjectForm, budget: e.target.value})}
                        style={{
                          padding: '0.65rem 0.85rem',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          fontSize: '0.9rem',
                          background: '#fafbfd',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div className="form-row">
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'none', letterSpacing: 'normal' }}>Location *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Andheri, Mumbai"
                        value={postProjectForm.location}
                        onChange={(e) => setPostProjectForm({...postProjectForm, location: e.target.value})}
                        style={{
                          padding: '0.65rem 0.85rem',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '0.5rem',
                          fontSize: '0.9rem',
                          background: '#fafbfd',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'none', letterSpacing: 'normal' }}>Project Description *</label>
                    <textarea 
                      required
                      rows={4}
                      placeholder="Provide details of the work, timeline, and requirements..."
                      style={{
                        padding: '0.65rem 0.85rem',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        background: '#fafbfd',
                        fontFamily: 'inherit',
                        resize: 'none',
                        outline: 'none'
                      }}
                      value={postProjectForm.description}
                      onChange={(e) => setPostProjectForm({...postProjectForm, description: e.target.value})}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <button 
                      type="button" 
                      className="btn-cancel"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: '1px solid #cbd5e1',
                        background: 'white',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: '600',
                        color: '#64748b'
                      }}
                      onClick={() => setShowPostProjectModal(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn-get-started"
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'var(--color-contractor)',
                        color: 'white',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '600',
                        boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      Post Project
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Attachment Upload Modal */}
        {showAttModal && (
          <div className="dl-modal-overlay" onClick={() => setShowAttModal(false)}>
            <div className="dl-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="dl-modal-close" onClick={() => setShowAttModal(false)}>
                <X size={20} />
              </button>
              
              <div className="dl-modal-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div className="dl-modal-title-block" style={{ textAlign: 'left' }}>
                  <h2>
                    Share {attType === 'drawing' ? 'Project Drawing' : 'Project Document'}
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: 4 }}>
                    Enter the file name to attach it in the chat workspace.
                  </p>
                </div>
              </div>

              <form onSubmit={handleAttachSend} className="dl-modal-body" style={{ gap: '1.2rem', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                <div className="form-row">
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '4px', display: 'block' }}>
                    {attType === 'drawing' ? 'Drawing/Blueprint Name *' : 'Document File Name *'}
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder={attType === 'drawing' ? 'e.g. Electrical Layout Draft.png' : 'e.g. Material Invoice.pdf'}
                    value={attName}
                    onChange={(e) => setAttName(e.target.value)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                      background: '#fafbfd',
                      outline: 'none',
                      boxSizing: 'border-box',
                      width: '100%'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn-cancel"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #cbd5e1',
                      background: 'white',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: '600',
                      color: '#64748b'
                    }}
                    onClick={() => setShowAttModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-get-started"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '0.5rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600',
                      boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    Attach & Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

