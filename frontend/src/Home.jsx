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
  ArrowLeft
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

// Import Assets for Public Landing Page
import welcomeHero from './assets/welcome_hero.png';
import architectImg from './assets/architect_home.png';
import contractorImg from './assets/contractor_site.png';
import labourImg from './assets/labour_working.png';
import allverLogo from './assets/allver-logo.svg';
import LabourManagementTab from './LabourManagementTab';

const ROLE_ROUTES = { Architect: '/architects', Contractor: '/contractors', Labour: '/labour' };

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'feed', 'design', 'chats', 'profile', 'workspaces'
  const [stats, setStats] = useState(null);

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
  const [registeredArchitects, setRegisteredArchitects] = useState([]);
  const [registeredLabours, setRegisteredLabours] = useState([]);

  // Timeline sub-tab states
  const [showPostUpdateForm, setShowPostUpdateForm] = useState(false);
  const [timelineForm, setTimelineForm] = useState({ title: '', category: 'General', description: '', img: '' });
  const [activeCommentUpdateId, setActiveCommentUpdateId] = useState(null);
  const [updateCommentTexts, setUpdateCommentTexts] = useState({});

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

  useEffect(() => {
    if (location.state?.activeTab) {
      if (location.state.activeTab === 'profile') {
        navigate('/profile');
      } else {
        setActiveTab(location.state.activeTab);
        if (location.state.activeTab === 'workspaces' && location.state.selectedWorkspace) {
          setSelectedWorkspace(location.state.selectedWorkspace);
          fetchWorkspaceDetail(location.state.selectedWorkspace);
        }
      }
    }
  }, [location.state, navigate]);

  // Chats mock state
  const [activeChat, setActiveChat] = useState(0);
  const [chatMessage, setChatMessage] = useState('');

  // Design tab Showcase state
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [designTabSearch, setDesignTabSearch] = useState('');
  const [designTabPrice, setDesignTabPrice] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('photos'); // 'photos', 'videos', 'quotation'
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [designsList, setDesignsList] = useState([
    {
      id: 'd1',
      title: 'Modern 2BHK Apartment',
      location: 'Mumbai, Maharashtra',
      rating: 4.8,
      reviewsCount: 124,
      author: 'Neha Sharma',
      authorRole: 'Architect',
      authorEmail: 'neha.sharma@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      mainImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80'
      ],
      imgCount: '1/3',
      likes: 128,
      comments: 24,
      saved: false,
      hasLiked: false,
      overview: 'A modern and minimal 2BHK apartment design with a perfect blend of comfort, functionality and aesthetics. Warm tones, natural light and smart space planning make this home truly beautiful.'
    },
    {
      id: 'd2',
      title: 'Modern Bedroom Design',
      location: 'Pune, Maharashtra',
      rating: 4.7,
      reviewsCount: 98,
      author: 'Rohit Mehta',
      authorRole: 'Architect',
      authorEmail: 'rohit.mehta@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      mainImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80'
      ],
      imgCount: '1/4',
      likes: 96,
      comments: 18,
      saved: false,
      hasLiked: false,
      overview: 'A contemporary bedroom layout maximizing vertical space and storage with premium materials, elegant light fixtures, and modern side tables.'
    },
    {
      id: 'd3',
      title: 'Minimal Kitchen Design',
      location: 'Bengaluru, Karnataka',
      rating: 4.9,
      reviewsCount: 156,
      author: 'Priya Nair',
      authorRole: 'Architect',
      authorEmail: 'priya.nair@example.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      mainImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80',
      images: [
        'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=400&q=80'
      ],
      imgCount: '1/3',
      likes: 142,
      comments: 32,
      saved: false,
      hasLiked: false,
      overview: 'Sleek handle-less drawers, built-in kitchen appliances, and elegant marble countertops combine to create a clutter-free, premium cooking experience.'
    }
  ]);

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
  const [designerChats, setDesignerChats] = useState({
    'neha.sharma@example.com': [
      { sender: 'other', text: 'Hello! I specialize in modern, minimal and luxury interior design. How can I help you with your space today?', time: 'Yesterday' }
    ],
    'rohit.mehta@example.com': [
      { sender: 'other', text: 'Hi there! I am an expert in space planning and smart home integration. Let me know if you have any questions!', time: '2 days ago' }
    ],
    'priya.nair@example.com': [
      { sender: 'other', text: 'Greetings! I design contemporary apartment interiors. Feel free to share your project requirements.', time: '3 days ago' }
    ],
    'karan.patel@example.com': [
      { sender: 'other', text: 'Hello! Let me know if you are looking for minimalist and cost-effective design solutions for your dream space.', time: '4 days ago' }
    ]
  });

  const handleSendDesignerMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeChatDesigner) return;

    const designerEmail = activeChatDesigner.email;
    const userMsg = {
      sender: 'me',
      text: chatMessage,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    setDesignerChats(prev => {
      const currentMsgs = prev[designerEmail] || [];
      return {
        ...prev,
        [designerEmail]: [...currentMsgs, userMsg]
      };
    });

    setChatMessage('');

    // Trigger mock response after 1 second
    setTimeout(() => {
      const replies = [
        "That sounds like a wonderful project idea! I'd love to help you design it. Could you share the site layout or any initial inspiration photos?",
        "Sure, I can certainly assist with that. Let's schedule a brief call or video meet to discuss your budget and design requirements in detail.",
        "Perfect. I will review the details you provided and get back to you with some rough sketches and concepts soon!",
        "Thanks for the details. Minimalist spaces require careful planning, and I am excited to collaborate on this with you."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const systemReply = {
        sender: 'other',
        text: randomReply,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };

      setDesignerChats(prev => {
        const currentMsgs = prev[designerEmail] || [];
        return {
          ...prev,
          [designerEmail]: [...currentMsgs, systemReply]
        };
      });
    }, 1000);
  };
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
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return;
    const userObj = JSON.parse(userStr);
    try {
      const res = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceId}?userId=${userObj._id}`);
      if (res.ok) {
        const data = await res.json();
        setWorkspaceDetail(data.workspace);
      } else {
        const errData = await res.json();
        alert(errData.message || 'Access denied to workspace');
        setWorkspaceDetail(null);
        setSelectedWorkspace(null);
      }
    } catch (err) {
      console.error('Error fetching workspace detail:', err);
      setWorkspaceDetail(null);
      setSelectedWorkspace(null);
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
        await fetchNotificationsAndWorkspaces();
        
        if (status === 'Accepted' && data.workspace) {
          setActiveTab('workspaces');
          setSelectedWorkspace(data.workspace._id);
          fetchWorkspaceDetail(data.workspace._id);
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

  const handleSendSystemMessage = async (text) => {
    if (!workspaceDetail) return;
    try {
      const response = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: currentUser._id,
          text: `📢 ${text}`
        })
      });
      const data = await response.json();
      if (response.ok) {
        setWorkspaceDetail(data.workspace);
      }
    } catch (err) {
      console.error('Error sending system message:', err);
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
          status: 'Sent',
          userId: currentUser._id
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
          status,
          userId: currentUser._id
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

  const handlePostTimelineUpdate = async (e) => {
    e.preventDefault();
    if (!timelineForm.title.trim() || !workspaceDetail) return;

    try {
      const response = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: timelineForm.title,
          description: timelineForm.description,
          category: timelineForm.category,
          img: timelineForm.img,
          senderId: currentUser._id
        })
      });

      const data = await response.json();
      if (response.ok) {
        setWorkspaceDetail(data.workspace);
        setTimelineForm({ title: '', category: 'General', description: '', img: '' });
        setShowPostUpdateForm(false);
      } else {
        alert(data.message || 'Failed to post progress update');
      }
    } catch (err) {
      console.error('Error posting timeline update:', err);
    }
  };

  const handleLikeUpdate = async (updateId) => {
    if (!workspaceDetail) return;

    try {
      const response = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/updates/${updateId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUser._id
        })
      });

      const data = await response.json();
      if (response.ok) {
        setWorkspaceDetail(data.workspace);
      } else {
        alert(data.message || 'Failed to toggle like');
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleCommentUpdate = async (updateId, text) => {
    if (!text?.trim() || !workspaceDetail) return;

    try {
      const response = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/updates/${updateId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: currentUser._id,
          senderName: currentUser.fullName,
          text: text
        })
      });

      const data = await response.json();
      if (response.ok) {
        setWorkspaceDetail(data.workspace);
        setUpdateCommentTexts({ ...updateCommentTexts, [updateId]: '' });
      } else {
        alert(data.message || 'Failed to add comment');
      }
    } catch (err) {
      console.error('Error adding comment:', err);
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

      // Fetch registered architects and labours
      fetch('http://localhost:5000/api/professionals/Architect')
        .then(res => res.json())
        .then(data => setRegisteredArchitects(data.professionals || []))
        .catch(err => console.error('Error fetching architects:', err));

      fetch('http://localhost:5000/api/professionals/Labour')
        .then(res => res.json())
        .then(data => setRegisteredLabours(data.professionals || []))
        .catch(err => console.error('Error fetching labours:', err));

      return () => clearInterval(interval);
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

        // Fetch Labour - Auto-seed if none
        const labourRes = await fetch('http://localhost:5000/api/professionals/Labour');
        const labourData = await labourRes.json();
        if (!labourData.professionals || labourData.professionals.length === 0) {
          const regRes = await fetch('http://localhost:5000/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: 'Amit Kumar',
              email: 'amit.kumar@example.com',
              phoneNumber: '9876543211',
              password: 'password123',
              role: 'Labour',
              city: 'Thane'
            })
          });
          if (regRes.ok) {
            const regData = await regRes.json();
            const profUpdate = await fetch(`http://localhost:5000/api/user/profile/${regData.user._id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                skillType: 'Mason / Tiler',
                experience: '8 Years',
                availability: 'Available',
                shortDesc: 'Specialized in premium stone work, floor tiling, and concrete masonry with 8 years of on-site experience.'
              })
            });
            if (profUpdate.ok) {
              const updatedData = await profUpdate.json();
              setFeaturedPros(prev => ({ ...prev, Labour: updatedData.user }));
            }
          }
        } else {
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
        let list = data.professionals || [];
        
        // Seed if missing
        if (list.length < 4) {
          const seedData = [
            {
              fullName: 'Neha Sharma',
              email: 'neha.sharma@example.com',
              phoneNumber: '9876543212',
              password: 'password123',
              role: 'Architect',
              city: 'Mumbai, Maharashtra',
              experience: '5+ Years',
              shortDesc: 'Specializes in modern, minimal and luxury interior design.',
              rating: 4.8,
              reviews: 124,
              projects: 128,
              avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80'
            },
            {
              fullName: 'Rohit Mehta',
              email: 'rohit.mehta@example.com',
              phoneNumber: '9876543213',
              password: 'password123',
              role: 'Architect',
              city: 'Pune, Maharashtra',
              experience: '7+ Years',
              shortDesc: 'Expert in space planning, modular kitchen and smart homes.',
              rating: 4.7,
              reviews: 98,
              projects: 96,
              avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
            },
            {
              fullName: 'Priya Nair',
              email: 'priya.nair@example.com',
              phoneNumber: '9876543214',
              password: 'password123',
              role: 'Architect',
              city: 'Bengaluru, Karnataka',
              experience: '6+ Years',
              shortDesc: 'Specializes in contemporary and luxury apartment interiors.',
              rating: 4.9,
              reviews: 156,
              projects: 156,
              avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
            },
            {
              fullName: 'Karan Patel',
              email: 'karan.patel@example.com',
              phoneNumber: '9876543215',
              password: 'password123',
              role: 'Architect',
              city: 'Hyderabad, Telangana',
              experience: '4+ Years',
              shortDesc: 'Modern, minimalist and cost-effective design solutions.',
              rating: 4.6,
              reviews: 72,
              projects: 72,
              avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80'
            }
          ];

          for (const item of seedData) {
            const exists = list.some(u => u.email === item.email);
            if (!exists) {
              const regRes = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
              if (regRes.ok) {
                const regData = await regRes.json();
                await fetch(`http://localhost:5000/api/user/profile/${regData.user._id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    rating: item.rating,
                    reviews: item.reviews,
                    projects: item.projects,
                    experience: item.experience,
                    shortDesc: item.shortDesc,
                    avatarUrl: item.avatarUrl,
                    firmName: item.fullName === 'Neha Sharma' ? 'Neha Sharma Designs' : 'Freelance Architect'
                  })
                });
              }
            }
          }

          const refetchRes = await fetch('http://localhost:5000/api/professionals/Architect');
          const refetchData = await refetchRes.json();
          setDesignersList(refetchData.professionals || []);
        } else {
          setDesignersList(list);
        }
        setDesignersLoading(false);
      } catch (err) {
        console.error('Error fetching designers list:', err);
        setDesignersLoading(false);
      }
    };

    fetchFeatured();
    fetchDesigners();
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
              className={`sidebar-nav-item ${activeTab === 'workspaces' ? 'active' : ''}`}
              onClick={() => setActiveTab('workspaces')}
            >
              <Briefcase size={20} />
              <span>Workspaces</span>
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
                {currentUser.fullName && currentUser.fullName.charAt(0).toUpperCase() === 'Q' ? (
                  <User size={16} />
                ) : (
                  currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'
                )}
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
                {contractRequests.filter(r => r.status === 'Pending' && r.professional && (r.professional._id || r.professional).toString() === (currentUser?._id || '').toString()).length > 0 && (
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
                    const clId = (r.client?._id || r.client || '').toString();
                    const currId = (currentUser?._id || '').toString();
                    return (profId === currId && r.status === 'Pending') || clId === currId;
                  }).length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.85rem', padding: '1.5rem', margin: 0 }}>No new notifications</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {contractRequests.map(req => {
                        const profId = (req.professional?._id || req.professional || '').toString();
                        const clId = (req.client?._id || req.client || '').toString();
                        const currId = (currentUser?._id || '').toString();
                        const isProfessional = profId && currId && profId === currId;
                        const isClient = clId && currId && clId === currId;
                        
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
                        } else if (isClient) {
                          return (
                            <div key={req._id} style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem', color: '#475569' }}>
                              <span>📢 <strong>{req.professional?.fullName}</strong> has <strong>{req.status.toLowerCase()}</strong> your contract request for <strong>{req.title}</strong>.</span>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                                {new Date(req.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="avatar" onClick={() => navigate('/profile')}>
                {currentUser.fullName && currentUser.fullName.charAt(0).toUpperCase() === 'Q' ? (
                  <User size={16} />
                ) : (
                  currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'
                )}
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

            {/* FEED TAB - Renders feed of recent projects and achievements */}
            {activeTab === 'feed' && (
              <div className="tab-pane feed-tab" style={{ maxWidth: '640px', margin: '0 auto', padding: '1rem 0 2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Discover</h2>
                  <button className="notif-btn" style={{ position: 'relative', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Bell size={20} style={{ color: '#475569' }} />
                    <span style={{ position: 'absolute', top: '9px', right: '9px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></span>
                  </button>
                </div>

                {/* Content Type Filter Chips */}
                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                  {['All', 'Projects', 'Designs', 'Progress', 'Teams'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setFeedFilter(type)}
                      style={{
                        padding: '0.45rem 1.25rem',
                        borderRadius: '2rem',
                        fontSize: '0.88rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        border: feedFilter === type ? 'none' : '1px solid #cbd5e1',
                        background: feedFilter === type ? '#0f766e' : 'white',
                        color: feedFilter === type ? 'white' : '#475569',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {type}
                    </button>
                  ))}
                  <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <SlidersHorizontal size={20} />
                  </button>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem', fontWeight: '500' }}>
                  Showing posts from people you follow
                </div>

                {/* Feed Cards List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {filteredFeedPosts.map(post => (
                    <div key={post.id} className="feed-card" style={{ background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      
                      {/* Card Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                          <img src={post.author.avatar} alt={post.author.name} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <strong style={{ fontSize: '0.98rem', color: '#0f172a', fontWeight: '750' }}>{post.author.name}</strong>
                              <CheckCircle2 size={13} style={{ color: post.author.verifiedColor, fill: post.author.verifiedColor, stroke: 'white' }} />
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1px' }}>
                              {post.author.role === 'Labour' ? 'Labour' : post.author.role} • {post.author.location}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              {post.time} • <Globe size={11} />
                            </div>
                          </div>
                        </div>
                        <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', letterSpacing: '1px' }}>•••</button>
                      </div>

                      {/* Post Content */}
                      <p style={{ fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'pre-line', margin: 0, lineHeight: '1.5', fontWeight: '500' }}>
                        {post.content}
                      </p>

                      {/* Post Images Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', borderRadius: '0.75rem', overflow: 'hidden' }}>
                        {post.images.map((img, idx) => (
                          <div key={idx} style={{ aspectRatio: '4/3', overflow: 'hidden', background: '#f1f5f9' }}>
                            <img src={img} alt={`post-img-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }} />
                          </div>
                        ))}
                      </div>

                      {/* Reactions Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem', fontSize: '0.82rem', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: '8px' }}>❤️</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', background: '#f59e0b', color: 'white', borderRadius: '50%', fontSize: '8px', marginLeft: '-4px', border: '1px solid white' }}>🙏</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '16px', height: '16px', background: '#10b981', color: 'white', borderRadius: '50%', fontSize: '8px', marginLeft: '-4px', border: '1px solid white' }}>👏</span>
                          </div>
                          <span style={{ marginLeft: '4px', fontWeight: '600' }}>{post.appreciates}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontWeight: '600' }}>
                          <span>{post.comments} Comments</span>
                        </div>
                      </div>

                      {/* Actions Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
                        <button 
                          onClick={() => handleAppreciatePost(post.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: post.hasAppreciated ? '#ef4444' : '#64748b',
                            fontSize: '0.88rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <Heart size={16} fill={post.hasAppreciated ? '#ef4444' : 'none'} />
                          Appreciate
                        </button>
                        <button 
                          style={{
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#64748b',
                            fontSize: '0.88rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <MessageSquare size={16} />
                          Comment
                        </button>
                        <button 
                          style={{
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#64748b',
                            fontSize: '0.88rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Users size={16} />
                          Connect
                        </button>
                        <button 
                          style={{
                            background: 'none',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#64748b',
                            fontSize: '0.88rem',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          <Bookmark size={16} />
                          Save
                        </button>
                      </div>
                    </div>
                  ))}
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
                                  <img src={d.avatarUrl} alt={d.author} />
                                  <span className="name">{d.author}</span>
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

                  </div>
                ) : (
                  <div className="design-detail-container">
                    
                    {/* Header Row */}
                    <div className="design-detail-header">
                      <button className="back-btn" onClick={() => setSelectedDesign(null)}>
                        <ArrowLeft size={22} />
                      </button>
                      <div className="actions-right">
                        <button className="header-action-btn">
                          <Share2 size={20} />
                        </button>
                        <button 
                          className="header-action-btn"
                          onClick={(e) => handleSaveDesign(selectedDesign.id, e)}
                        >
                          <Bookmark size={20} fill={selectedDesign.saved ? "#0f172a" : "none"} />
                        </button>
                      </div>
                    </div>

                    {/* Profile row */}
                    <div className="design-detail-profile-row">
                      <img src={selectedDesign.avatarUrl} alt={selectedDesign.author} className="avatar-img" />
                      <div className="profile-info">
                        <h3>{selectedDesign.title}</h3>
                        <div className="location">
                          <MapPin size={13} />
                          <span>{selectedDesign.location}</span>
                        </div>
                        <span className="author">
                          By {selectedDesign.author}
                          <CheckCircle2 size={13} style={{ color: '#10b981', fill: '#10b981', stroke: 'white' }} />
                        </span>
                        <div className="rating-box">
                          <Star size={12} fill="#f59e0b" color="#f59e0b" />
                          <strong>{selectedDesign.rating}</strong>
                          <span>({selectedDesign.reviewsCount} reviews)</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="design-detail-actions">
                      <button className="design-detail-btn">Follow</button>
                      <button 
                        className="design-detail-btn"
                        onClick={() => {
                          const matched = designersList.find(dl => dl.fullName.toLowerCase().includes(selectedDesign.author.toLowerCase()));
                          if (matched) {
                            navigate(`/architect/${matched._id}`);
                          } else {
                            navigate('/architects');
                          }
                        }}
                      >
                        View Profile
                      </button>
                      <button 
                        className="design-detail-btn primary"
                        onClick={() => {
                          const matched = designersList.find(dl => dl.fullName.toLowerCase().includes(selectedDesign.author.toLowerCase()));
                          if (matched) {
                            setActiveChatDesigner(matched);
                            setActiveTab('chats');
                          } else {
                            setActiveTab('chats');
                          }
                        }}
                      >
                        <MessageSquare size={14} />
                        Contact
                      </button>
                    </div>

                    {/* Tabs */}
                    <div className="design-detail-tabs">
                      <button 
                        className={`design-tab-btn ${activeDetailTab === 'photos' ? 'active' : ''}`}
                        onClick={() => setActiveDetailTab('photos')}
                      >
                        <Image size={15} />
                        Photos
                      </button>
                      <button 
                        className={`design-tab-btn ${activeDetailTab === 'videos' ? 'active' : ''}`}
                        onClick={() => setActiveDetailTab('videos')}
                      >
                        <Play size={15} />
                        Videos
                      </button>
                      <button 
                        className={`design-tab-btn ${activeDetailTab === 'quotation' ? 'active' : ''}`}
                        onClick={() => setActiveDetailTab('quotation')}
                      >
                        <Briefcase size={15} />
                        Quotation
                      </button>
                    </div>

                    {/* Photos view content */}
                    {activeDetailTab === 'photos' && (
                      <>
                        {/* Media Layout */}
                        <div className="design-detail-media-layout">
                          <div className="design-detail-main-img-box">
                            <img src={selectedDesign.mainImage} alt={selectedDesign.title} />
                            <span className="design-detail-indicator">1/12</span>
                          </div>
                          
                          <div className="design-detail-thumbnails">
                            <div className="design-detail-thumb-box">
                              <img src={selectedDesign.images[1] || selectedDesign.mainImage} alt="thumb-1" />
                            </div>
                            <div className="design-detail-thumb-box">
                              <img src={selectedDesign.images[2] || selectedDesign.mainImage} alt="thumb-2" />
                            </div>
                            <div className="design-detail-thumb-box">
                              <img src={selectedDesign.images[3] || selectedDesign.mainImage} alt="thumb-3" />
                              <div className="design-detail-thumb-overlay">+9 More</div>
                            </div>
                          </div>
                        </div>

                        {/* Design Overview */}
                        <div className="design-detail-overview">
                          <div className="overview-icon">
                            <Layout size={22} />
                          </div>
                          <div className="design-detail-overview-text">
                            <h4>Design Overview</h4>
                            <p>
                              {showFullOverview 
                                ? selectedDesign.overview 
                                : `${selectedDesign.overview.slice(0, 110)}...`}
                            </p>
                            <button 
                              className="show-more"
                              onClick={() => setShowFullOverview(!showFullOverview)}
                            >
                              {showFullOverview ? 'Show Less' : 'Show More'}
                            </button>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="design-detail-stats-row">
                          <div className="design-detail-stats">
                            <button 
                              className={`design-detail-stat-btn ${selectedDesign.hasLiked ? 'liked' : ''}`}
                              onClick={() => handleLikeDesign(selectedDesign.id)}
                            >
                              <Heart size={16} fill={selectedDesign.hasLiked ? "#ef4444" : "none"} />
                              <span>{selectedDesign.likes}</span>
                            </button>
                            <div className="design-detail-stat-btn">
                              <MessageSquare size={16} />
                              <span>{selectedDesign.comments}</span>
                            </div>
                          </div>

                          <button 
                            className="design-detail-save-btn"
                            onClick={() => handleSaveDesign(selectedDesign.id)}
                            style={{ color: selectedDesign.saved ? '#10b981' : '#334155' }}
                          >
                            <Bookmark size={16} fill={selectedDesign.saved ? "#10b981" : "none"} />
                            <span>{selectedDesign.saved ? 'Saved' : 'Save Design'}</span>
                          </button>
                        </div>

                        {/* Similar Designs section */}
                        <div className="design-horizontal-section">
                          <div className="design-section-header">
                            <h4>Similar Designs</h4>
                            <a href="#" className="view-all-link" onClick={e => e.preventDefault()}>View All &rarr;</a>
                          </div>

                          <div className="design-horizontal-scroll">
                            <div className="design-similar-item-card">
                              <img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=150&q=80" alt="similar-1" />
                              <div className="card-info">
                                <h5>Minimal 2BHK Apartment</h5>
                                <span className="loc">Pune, Maharashtra</span>
                                <div className="rat">
                                  <Star size={11} fill="#f59e0b" />
                                  <span>4.6</span>
                                </div>
                              </div>
                            </div>
                            <div className="design-similar-item-card">
                              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=150&q=80" alt="similar-2" />
                              <div className="card-info">
                                <h5>Modern Living Room</h5>
                                <span className="loc">Mumbai, Maharashtra</span>
                                <div className="rat">
                                  <Star size={11} fill="#f59e0b" />
                                  <span>4.7</span>
                                </div>
                              </div>
                            </div>
                            <div className="design-similar-item-card">
                              <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=150&q=80" alt="similar-3" />
                              <div className="card-info">
                                <h5>Modular Kitchen Design</h5>
                                <span className="loc">Bengaluru, Karnataka</span>
                                <div className="rat">
                                  <Star size={11} fill="#f59e0b" />
                                  <span>4.5</span>
                                </div>
                              </div>
                            </div>
                            <div className="design-similar-item-card">
                              <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=150&q=80" alt="similar-4" />
                              <div className="card-info">
                                <h5>Luxury Bedroom Design</h5>
                                <span className="loc">Pune, Maharashtra</span>
                                <div className="rat">
                                  <Star size={11} fill="#f59e0b" />
                                  <span>4.6</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Contractors list */}
                        <div className="design-horizontal-section">
                          <div className="design-section-header">
                            <h4>Contractors Who Can Build This Design</h4>
                            <a href="#" className="view-all-link" onClick={e => e.preventDefault()}>View All &rarr;</a>
                          </div>

                          <div className="design-horizontal-scroll">
                            <div className="design-contractor-item-card">
                              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" alt="contractor-1" />
                              <h5>BuildWell Construction</h5>
                              <div className="rat">
                                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                <strong>4.6</strong> (98)
                              </div>
                              <div className="price">Starts at <strong>₹8.5 L</strong></div>
                              <button className="design-contractor-hire-btn" onClick={() => navigate('/contractors')}>Hire Now</button>
                            </div>
                            <div className="design-contractor-item-card">
                              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80" alt="contractor-2" />
                              <h5>HomeCraft Builders</h5>
                              <div className="rat">
                                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                <strong>4.5</strong> (76)
                              </div>
                              <div className="price">Starts at <strong>₹8.8 L</strong></div>
                              <button className="design-contractor-hire-btn" onClick={() => navigate('/contractors')}>Hire Now</button>
                            </div>
                            <div className="design-contractor-item-card">
                              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="contractor-3" />
                              <h5>StructureLine</h5>
                              <div className="rat">
                                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                <strong>4.7</strong> (120)
                              </div>
                              <div className="price">Starts at <strong>₹6.2 L</strong></div>
                              <button className="design-contractor-hire-btn" onClick={() => navigate('/contractors')}>Hire Now</button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {activeDetailTab === 'videos' && (
                      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                        <Play size={48} style={{ color: '#10b981', marginBottom: '1rem' }} />
                        <h4 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '0.5rem' }}>Walkthrough Video Available</h4>
                        <p style={{ fontSize: '0.88rem' }}>A high definition 3D video tour of this Modern 2BHK Apartment is available for registered clients.</p>
                        <button 
                          className="design-detail-btn primary"
                          style={{ margin: '1rem auto 0', padding: '0.5rem 1.5rem', width: 'auto' }}
                          onClick={() => {
                            const matched = designersList.find(dl => dl.fullName.toLowerCase().includes(selectedDesign.author.toLowerCase()));
                            if (matched) {
                              setActiveChatDesigner(matched);
                              setActiveTab('chats');
                            }
                          }}
                        >
                          Request Video Tour
                        </button>
                      </div>
                    )}

                    {activeDetailTab === 'quotation' && (
                      <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '1rem', fontSize: '0.95rem' }}>Estimated Cost Breakup</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                            <span style={{ color: '#475569' }}>Civil & Masonry Work</span>
                            <strong style={{ color: '#0f172a' }}>₹ 1,85,000</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                            <span style={{ color: '#475569' }}>Woodwork & Modular Kitchen</span>
                            <strong style={{ color: '#0f172a' }}>₹ 4,20,000</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                            <span style={{ color: '#475569' }}>Electrical & Lighting Layout</span>
                            <strong style={{ color: '#0f172a' }}>₹ 95,000</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                            <span style={{ color: '#475569' }}>Painting & Wall Finishes</span>
                            <strong style={{ color: '#0f172a' }}>₹ 1,10,000</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem' }}>
                            <strong style={{ color: '#0f172a' }}>Total Estimated Cost</strong>
                            <strong style={{ color: '#0f766e', fontSize: '1rem' }}>₹ 8,10,000 *</strong>
                          </div>
                        </div>
                        <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1rem', lineHeight: '1.4' }}>
                          * Excludes customized loose furniture, white goods, and decorative items. Costs may vary based on exact material selections and location.
                        </p>
                      </div>
                    )}

                    {/* Bottom Sticky Footer */}
                    <div className="design-detail-sticky-footer">
                      <button className="design-sticky-btn secondary" onClick={() => setSelectedDesign(null)}>
                        Get Similar Design
                      </button>
                      <button 
                        className="design-sticky-btn primary"
                        onClick={() => {
                          const matched = designersList.find(dl => dl.fullName.toLowerCase().includes(selectedDesign.author.toLowerCase()));
                          if (matched) {
                            setActiveChatDesigner(matched);
                            setActiveTab('chats');
                          } else {
                            setActiveTab('chats');
                          }
                        }}
                      >
                        <MessageSquare size={16} />
                        Contact Designer
                      </button>
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
                    <div className="designer-welcome-banner">
                      <div className="designer-banner-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <polygon points="19 11 20 13 22 13 20.5 14.5 21 16.5 19 15.5 17 16.5 17.5 14.5 16 13 18 13" fill="#10b981" />
                        </svg>
                      </div>
                      <div className="designer-banner-text">
                        <h3>Find the right designer for your dream space.</h3>
                        <p>Connect, discuss and get your perfect design.</p>
                      </div>
                    </div>

                    {/* Search & Filter row */}
                    <div className="designer-search-filter-row">
                      <div className="designer-search-wrapper">
                        <Search size={18} className="designer-search-icon" />
                        <input 
                          type="text" 
                          className="designer-search-input"
                          placeholder="Search designer name, location..." 
                          value={designersSearch}
                          onChange={e => setDesignersSearch(e.target.value)}
                        />
                      </div>
                      <button 
                        className="designer-filter-btn"
                        onClick={() => setShowRatingFilterDrop(!showRatingFilterDrop)}
                      >
                        <SlidersHorizontal size={16} />
                        Filter
                      </button>
                      
                      {showRatingFilterDrop && (
                        <div className="designer-rating-dropdown" style={{ right: 'auto', left: 'calc(100% - 140px)' }}>
                          {['', '3', '3.5', '4', '4.5'].map(r => (
                            <div 
                              key={r} 
                              className="designer-dropdown-item"
                              onClick={() => { setDesignersRatingFilter(r); setShowRatingFilterDrop(false); }}
                            >
                              {r ? `${r}+ Stars` : 'All Ratings'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Designers list */}
                    {designersLoading ? (
                      <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Loading designers...</div>
                    ) : (
                      <div className="designer-list-container">
                        {designersList
                          .filter(prof => {
                            const nm = (prof.fullName || '').toLowerCase();
                            const lc = (prof.city || prof.location || '').toLowerCase();
                            const desc = (prof.shortDesc || '').toLowerCase();
                            const ratingMatches = !designersRatingFilter || (prof.rating || 4.5) >= parseFloat(designersRatingFilter);
                            const searchMatches = !designersSearch || 
                              nm.includes(designersSearch.toLowerCase()) || 
                              lc.includes(designersSearch.toLowerCase()) || 
                              desc.includes(designersSearch.toLowerCase());
                            return ratingMatches && searchMatches;
                          })
                          .map(prof => {
                            const initials = (prof.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                            return (
                              <div key={prof._id} className="designer-card">
                                {/* Left Side: Photo & Info */}
                                <div className="designer-card-left">
                                  <div className="designer-avatar-wrapper">
                                    {prof.avatarUrl ? (
                                      <img 
                                        src={prof.avatarUrl} 
                                        alt={prof.fullName} 
                                        className="designer-avatar"
                                      />
                                    ) : (
                                      <div className="designer-avatar">
                                        {initials}
                                      </div>
                                    )}
                                    {/* Active Status Dot */}
                                    <span className="designer-status-dot"></span>
                                  </div>

                                  <div className="designer-details">
                                    <div className="designer-name-row">
                                      <strong className="designer-name">Ar. {prof.fullName}</strong>
                                      <CheckCircle2 size={14} className="designer-verified-badge" />
                                    </div>
                                    
                                    <div className="designer-rating-row">
                                      <Star size={13} fill="#f59e0b" color="#f59e0b" />
                                      <strong>{prof.rating || 4.8}</strong>
                                      <span>({prof.reviews || 120} Reviews)</span>
                                    </div>

                                    <div className="designer-location-row">
                                      <MapPin size={13} />
                                      <span>{prof.city || 'Mumbai, Maharashtra'}</span>
                                    </div>

                                    <p className="designer-desc">
                                      {prof.shortDesc || 'Specializes in modern, minimal and luxury interior design.'}
                                    </p>

                                    <div className="designer-stats-row">
                                      <span className="designer-stat-item">
                                        <Briefcase size={12} /> {prof.projects || 120} Projects
                                      </span>
                                      <span className="designer-stat-item">
                                        <Image size={12} /> {prof.experience || '5+ Years'} Exp.
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Side: Action Buttons */}
                                <div className="designer-card-actions">
                                  <button 
                                    onClick={() => navigate(`/architect/${prof._id}`)}
                                    className="designer-btn-primary"
                                  >
                                    View Profile
                                  </button>
                                  <button 
                                    onClick={() => setActiveChatDesigner(prof)}
                                    className="designer-btn-secondary"
                                  >
                                    <MessageSquare size={14} />
                                    Chat
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        {designersList.filter(prof => {
                          const nm = (prof.fullName || '').toLowerCase();
                          const lc = (prof.city || prof.location || '').toLowerCase();
                          const desc = (prof.shortDesc || '').toLowerCase();
                          const ratingMatches = !designersRatingFilter || (prof.rating || 4.5) >= parseFloat(designersRatingFilter);
                          const searchMatches = !designersSearch || 
                            nm.includes(designersSearch.toLowerCase()) || 
                            lc.includes(designersSearch.toLowerCase()) || 
                            desc.includes(designersSearch.toLowerCase());
                          return ratingMatches && searchMatches;
                        }).length === 0 && (
                          <p style={{ textAlign: 'center', color: '#64748b', padding: '2rem 0' }}>No designers match your filters.</p>
                        )}
                      </div>
                    )}

                    {/* Verified Badge Footer */}
                    <div className="designer-verified-footer">
                      <ShieldCheck size={16} />
                      <span>All designers are verified and reviewed by our community.</span>
                    </div>

                  </div>
                ) : (
                  <div className="chat-window" style={{ maxWidth: '640px', margin: '0 auto', background: 'white', border: '1px solid #e2e8f0', borderRadius: '1rem', overflow: 'hidden' }}>
                    <div className="chat-conversation-panel" style={{ display: 'flex', flexDirection: 'column', height: '550px' }}>
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
                            <div className="avatar-circle" style={{ width: '32px', height: '32px', fontSize: '0.9rem', backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                              {activeChatDesigner.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <div>
                              <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0f172a' }}>Ar. {activeChatDesigner.fullName}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: '600' }}>● Active Now</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate(`/architect/${activeChatDesigner._id}`)}
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
                      </div>

                      <div className="messages-area" style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem', background: '#f8fafc' }}>
                        {(designerChats[activeChatDesigner.email] || []).map((msg, idx) => (
                          <div key={idx} className={`message-bubble-wrapper ${msg.sender === 'me' ? 'me' : 'other'}`} style={{ display: 'flex', justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start' }}>
                            <div className="message-bubble" style={{
                              maxWidth: '75%',
                              padding: '0.75rem 1rem',
                              borderRadius: msg.sender === 'me' ? '1rem 1rem 0 1rem' : '1rem 1rem 1rem 0',
                              background: msg.sender === 'me' ? '#0f766e' : 'white',
                              color: msg.sender === 'me' ? 'white' : '#1e293b',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                              border: msg.sender === 'me' ? 'none' : '1px solid #e2e8f0'
                            }}>
                              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4', wordBreak: 'break-word' }}>{msg.text}</p>
                              <span className="msg-time" style={{ display: 'block', textAlign: 'right', fontSize: '0.7rem', color: msg.sender === 'me' ? '#cbd5e1' : '#94a3b8', marginTop: '4px' }}>{msg.time}</span>
                            </div>
                          </div>
                        ))}
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
                      {currentUser.fullName && currentUser.fullName.charAt(0).toUpperCase() === 'Q' ? (
                        <User size={36} />
                      ) : (
                        currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'
                      )}
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
                  
                  {contractRequests.filter(r => r.status === 'Pending' && r.professional && (r.professional._id || r.professional || '').toString() === (currentUser?._id || '').toString()).length > 0 && (
                    <div style={{ padding: '0.75rem 1rem', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left' }}>
                      <strong style={{ fontSize: '0.72rem', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Pending Work Requests
                      </strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {contractRequests.filter(r => r.status === 'Pending' && r.professional && (r.professional._id || r.professional || '').toString() === (currentUser?._id || '').toString()).map(req => (
                          <div key={req._id} style={{ background: 'white', border: '1px solid #bfdbfe', borderRadius: '0.375rem', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#1e40af', background: '#eff6ff', padding: '0.1rem 0.3rem', borderRadius: '0.2rem', width: 'fit-content' }}>
                              New Work Request
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: '600', lineHeight: '1.2' }}>
                              Project: {req.title}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#475569' }}>
                              <strong>From:</strong> {req.client?.fullName || 'Someone'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '2px', background: '#f8fafc', padding: '4px', borderRadius: '4px' }}>
                              <div>Loc: {req.location}</div>
                              <div>Budget: {req.budget}</div>
                              {req.description && <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>Desc: {req.description}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button 
                                onClick={() => handleRequestAction(req._id, 'Accepted')}
                                style={{ flex: 1, padding: '0.25rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.68rem', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Accept Discussion
                              </button>
                              <button 
                                onClick={() => handleRequestAction(req._id, 'Rejected')}
                                style={{ flex: 0.5, padding: '0.25rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '0.25rem', fontSize: '0.68rem', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
                  {workspaceDetail ? (() => {
                    const isWorkspaceClient = currentUser && (workspaceDetail.client?._id === currentUser._id || workspaceDetail.client === currentUser._id);
                    const isWorkspaceContractor = currentUser && (
                      workspaceDetail.contractor?._id === currentUser._id || 
                      workspaceDetail.contractor === currentUser._id || 
                      workspaceDetail.professional?._id === currentUser._id || 
                      workspaceDetail.professional === currentUser._id
                    );
                    const isWorkspaceArchitect = currentUser && (
                      workspaceDetail.architect?._id === currentUser._id || 
                      workspaceDetail.architect === currentUser._id
                    );
                    const isWorkspaceLabour = currentUser && workspaceDetail.labourTeam?.some(l => 
                      (l._id === currentUser._id || l === currentUser._id)
                    );
                    const isWorkspaceMember = isWorkspaceClient || isWorkspaceContractor || isWorkspaceArchitect || isWorkspaceLabour;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        
                        {/* Workspace Header */}
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <h3 style={{ fontSize: '1.15rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                                {workspaceDetail.status === 'Discussion' ? 'Contract Discussion' : 'Project Workspace'}: {workspaceDetail.title}
                              </h3>
                              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '1rem', background: '#e0f2fe', color: '#0369a1', fontWeight: '600' }}>
                                {workspaceDetail.projectType}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div>
                                Client: <strong>{workspaceDetail.client?.fullName}</strong> • 
                                Contractor: <strong>{workspaceDetail.contractor?.fullName || workspaceDetail.professional?.fullName || 'Not Assigned'}</strong> • 
                                Architect: <strong>{workspaceDetail.architect?.fullName || 'Not Assigned'}</strong>
                                {(isWorkspaceClient || isWorkspaceContractor) && !workspaceDetail.architect && (
                                  <select
                                    value=""
                                    onChange={async (e) => {
                                      if (!e.target.value) return;
                                      const res = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/assign-architect`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ architectId: e.target.value, userId: currentUser._id })
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        setWorkspaceDetail(data.workspace);
                                        fetchNotificationsAndWorkspaces();
                                      }
                                    }}
                                    style={{ marginLeft: '10px', padding: '0.1rem 0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', cursor: 'pointer' }}
                                  >
                                    <option value="">+ Assign Architect</option>
                                    {registeredArchitects.map(a => (
                                      <option key={a._id} value={a._id}>{a.fullName}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                <span>Labour Team:</span>
                                {workspaceDetail.labourTeam && workspaceDetail.labourTeam.length > 0 ? (
                                  workspaceDetail.labourTeam.map(l => (
                                    <span key={l._id} style={{ background: '#e2e8f0', padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem' }}>
                                      🔨 {l.fullName} ({l.skillType || 'Labourer'})
                                      {(isWorkspaceClient || isWorkspaceContractor) && (
                                        <button
                                          onClick={async () => {
                                            const res = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/remove-labour`, {
                                              method: 'PUT',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ labourId: l._id, userId: currentUser._id })
                                            });
                                            if (res.ok) {
                                              const data = await res.json();
                                              setWorkspaceDetail(data.workspace);
                                              fetchNotificationsAndWorkspaces();
                                            }
                                          }}
                                          style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                                        >
                                          &times;
                                        </button>
                                      )}
                                    </span>
                                  ))
                                ) : (
                          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No Labours assigned</span>
                                )}
                                {(isWorkspaceClient || isWorkspaceContractor) && (
                                  <select
                                    value=""
                                    onChange={async (e) => {
                                      if (!e.target.value) return;
                                      const res = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/add-labour`, {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ labourId: e.target.value, userId: currentUser._id })
                                      });
                                      if (res.ok) {
                                        const data = await res.json();
                                        setWorkspaceDetail(data.workspace);
                                        fetchNotificationsAndWorkspaces();
                                      }
                                    }}
                                    style={{ padding: '0.1rem 0.3rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.7rem', cursor: 'pointer' }}
                                  >
                                    <option value="">+ Add Labourer</option>
                                    {registeredLabours
                                      .filter(l => !workspaceDetail.labourTeam?.some(existing => existing._id === l._id))
                                      .map(l => (
                                        <option key={l._id} value={l._id}>{l.fullName} ({l.skillType || 'Labour'})</option>
                                      ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#475569' }}>Status:</span>
                            {(isWorkspaceClient || isWorkspaceContractor || isWorkspaceArchitect) ? (
                              <select
                                value={workspaceDetail.status}
                                onChange={async (e) => {
                                  const res = await fetch(`http://localhost:5000/api/project-workspaces/${workspaceDetail._id}/project-status`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: e.target.value, senderId: currentUser._id })
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setWorkspaceDetail(data.workspace);
                                    fetchNotificationsAndWorkspaces();
                                  }
                                }}
                                style={{
                                  fontSize: '0.82rem',
                                  color: workspaceDetail.status === 'Discussion' ? '#f59e0b' : '#10b981',
                                  background: workspaceDetail.status === 'Discussion' ? '#fef3c7' : '#dcfce7',
                                  padding: '0.25rem 0.5rem',
                                  borderRadius: '0.5rem',
                                  border: workspaceDetail.status === 'Discussion' ? '1px solid #fde68a' : '1px solid #bbf7d0',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <option value="Discussion">Discussion</option>
                                <option value="Active">Active</option>
                                <option value="Completed">Completed</option>
                              </select>
                            ) : (
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
                            )}
                          </div>
                        </div>

                        {/* Sub-tabs Selection */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', padding: '0 1.25rem', background: '#fafbfd' }}>
                          {[
                            { id: 'chat', label: 'Workspace Chat', icon: <MessageSquare size={16} /> },
                            { id: 'quotation', label: 'Quotation Manager', icon: <Briefcase size={16} /> },
                            { id: 'files', label: 'Files & Drawings', icon: <Building2 size={16} /> },
                            { id: 'timeline', label: 'Project Timeline', icon: <Sparkles size={16} /> },
                            { id: 'labour', label: 'Labour Management', icon: <Users size={16} /> }
                          ].filter(t => {
                            if (t.id === 'timeline' && workspaceDetail.status === 'Discussion') return false;
                            if (t.id === 'quotation' && currentUser?.role === 'Labour') return false;
                            if (t.id === 'labour' && workspaceDetail.status === 'Discussion') return false;
                            if (t.id === 'labour' && currentUser?.role === 'Architect') return false;
                            return true;
                          }).map(t => (
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
                              {isWorkspaceMember ? (
                                <form onSubmit={handleSendWsMessage} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 0 0', borderTop: '1px solid #f1f5f9' }}>
                                  {(isWorkspaceClient || isWorkspaceContractor) && (
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
                                  )}
                                  {isWorkspaceArchitect && (
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
                                  )}
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
                              ) : (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderRadius: '0.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                  🔒 Chat is read-only for guests
                                </div>
                              )}
                            </div>
                          )}

                          {/* 2. QUOTATION SUB-TAB */}
                          {workspaceTab === 'quotation' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', width: '100%', textAlign: 'left' }}>
                              <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Project Quotation</h4>
                              
                              {/* Contractor/Professional view */}
                              {isWorkspaceContractor ? (
                                <>
                                  {(workspaceDetail.quotation?.status === 'Draft' || workspaceDetail.quotation?.status === 'Rejected' || workspaceDetail.quotation?.status === 'Changes Requested') && (
                                    <form onSubmit={handleSendQuotation} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                                        {workspaceDetail.quotation?.status === 'Rejected' 
                                          ? '❌ The client rejected your previous quotation. Please submit a revised quote below:' 
                                          : workspaceDetail.quotation?.status === 'Changes Requested'
                                            ? '📝 The client requested changes to your quotation. Please submit a revised quote below:'
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
                              ) : isWorkspaceClient ? (
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
                                          Approve
                                        </button>
                                        <button 
                                          onClick={() => handleQuotationDecision('Changes Requested')}
                                          style={{ flex: 1.2, padding: '0.6rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                          Request Changes
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

                                  {workspaceDetail.quotation?.status === 'Changes Requested' && (
                                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1.25rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#1e40af', marginBottom: '0.5rem' }}>
                                        <span>⏳</span>
                                        <strong style={{ fontSize: '0.9rem' }}>Changes Requested</strong>
                                      </div>
                                      <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>You requested changes to this quotation. Waiting for the contractor to send a revised quote.</p>
                                    </div>
                                  )}
                                </>
                              ) : (
                                /* Guest / Read-Only view for Architect/Labour/Others */
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1.25rem', borderRadius: '0.75rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '1rem' }}>
                                    <span>📄</span>
                                    <strong style={{ fontSize: '0.9rem' }}>
                                      Quotation Status: {workspaceDetail.quotation?.status || 'Draft'}
                                    </strong>
                                  </div>
                                  {(!workspaceDetail.quotation || workspaceDetail.quotation.status === 'Draft') ? (
                                    <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>The quotation is currently being drafted by the contractor.</p>
                                  ) : (
                                    renderQuotationSummary()
                                  )}
                                </div>
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

                        {/* 4. TIMELINE SUB-TAB */}
                        {workspaceTab === 'timeline' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Project Updates & Timeline</h4>
                                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Track daily progress, photos, and milestones</p>
                              </div>
                              {/* Client actions vs Professional post progress update */}
                              {isWorkspaceClient ? (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={async () => {
                                      alert('👍 Milestone approved! A system notification has been sent in the chat.');
                                      await handleSendSystemMessage('Client approved the current milestone.');
                                    }}
                                    style={{
                                      background: '#10b981',
                                      color: 'white',
                                      border: 'none',
                                      padding: '0.45rem 0.85rem',
                                      borderRadius: '0.5rem',
                                      fontSize: '0.78rem',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    👍 Approve Milestone
                                  </button>
                                  <button
                                    onClick={() => {
                                      setWorkspaceTab('chat');
                                    }}
                                    style={{
                                      background: '#3b82f6',
                                      color: 'white',
                                      border: 'none',
                                      padding: '0.45rem 0.85rem',
                                      borderRadius: '0.5rem',
                                      fontSize: '0.78rem',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    💬 Comment
                                  </button>
                                  <button
                                    onClick={() => {
                                      const contractorObj = workspaceDetail.contractor || workspaceDetail.professional;
                                      alert(`📞 Contacting Contractor ${contractorObj?.fullName || 'Professional'} at ${contractorObj?.phoneNumber || '9876543210'}`);
                                    }}
                                    style={{
                                      background: '#475569',
                                      color: 'white',
                                      border: 'none',
                                      padding: '0.45rem 0.85rem',
                                      borderRadius: '0.5rem',
                                      fontSize: '0.78rem',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    📞 Contact Contractor
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const amount = prompt('Enter payment amount to release:', '₹50,000');
                                      if (amount) {
                                        alert(`💰 Payment of ${amount} released successfully!`);
                                        await handleSendSystemMessage(`Client released payment of ${amount}.`);
                                      }
                                    }}
                                    style={{
                                      background: '#f59e0b',
                                      color: 'white',
                                      border: 'none',
                                      padding: '0.45rem 0.85rem',
                                      borderRadius: '0.5rem',
                                      fontSize: '0.78rem',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    💰 Release Payment
                                  </button>
                                </div>
                              ) : (
                                (isWorkspaceContractor || isWorkspaceArchitect || isWorkspaceLabour) && (
                                  <button
                                    onClick={() => setShowPostUpdateForm(!showPostUpdateForm)}
                                    style={{
                                      background: '#3b82f6',
                                      color: 'white',
                                      border: 'none',
                                      padding: '0.5rem 1rem',
                                      borderRadius: '0.5rem',
                                      fontSize: '0.82rem',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    {showPostUpdateForm ? 'Hide Form' : 'Post Update'}
                                  </button>
                                )
                              )}
                            </div>

                            {/* Post Progress Update Form */}
                            {showPostUpdateForm && isWorkspaceMember && !isWorkspaceClient && (
                              <form onSubmit={handlePostTimelineUpdate} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <strong style={{ fontSize: '0.88rem', color: '#1e293b' }}>Post Progress Update</strong>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#475569' }}>Title *</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g., Brickwork level 1 complete"
                                      value={timelineForm.title}
                                      onChange={e => setTimelineForm({ ...timelineForm, title: e.target.value })}
                                      style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                                    />
                                    {/* Quick suggestions based on role */}
                                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                      {currentUser.role === 'Contractor' && [
                                        'Foundation completed',
                                        'Electrical work started',
                                        'Plumbing finished',
                                        'Material delivered'
                                      ].map(sug => (
                                        <button
                                          key={sug}
                                          type="button"
                                          onClick={() => setTimelineForm({ ...timelineForm, title: sug, category: sug.includes('Foundation') ? 'Foundation' : sug.includes('Electrical') ? 'Finishing' : sug.includes('Plumbing') ? 'Finishing' : 'General' })}
                                          style={{ fontSize: '0.7rem', background: '#e2e8f0', border: 'none', borderRadius: '0.25rem', padding: '0.2rem 0.4rem', cursor: 'pointer', color: '#1e293b' }}
                                        >
                                          {sug}
                                        </button>
                                      ))}
                                      {currentUser.role === 'Architect' && [
                                        'Floor plan uploaded',
                                        'Elevation approved',
                                        '3D render updated',
                                        'Design revision submitted'
                                      ].map(sug => (
                                        <button
                                          key={sug}
                                          type="button"
                                          onClick={() => setTimelineForm({ ...timelineForm, title: sug, category: 'General' })}
                                          style={{ fontSize: '0.7rem', background: '#e2e8f0', border: 'none', borderRadius: '0.25rem', padding: '0.2rem 0.4rem', cursor: 'pointer', color: '#1e293b' }}
                                        >
                                          {sug}
                                        </button>
                                      ))}
                                      {currentUser.role === 'Labour' && [
                                        '15 workers on site',
                                        'Brickwork completed',
                                        'Painting started'
                                      ].map(sug => (
                                        <button
                                          key={sug}
                                          type="button"
                                          onClick={() => setTimelineForm({ ...timelineForm, title: sug, category: sug.includes('Brickwork') ? 'Masonry' : sug.includes('Painting') ? 'Finishing' : 'General' })}
                                          style={{ fontSize: '0.7rem', background: '#e2e8f0', border: 'none', borderRadius: '0.25rem', padding: '0.2rem 0.4rem', cursor: 'pointer', color: '#1e293b' }}
                                        >
                                          {sug}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#475569' }}>Category</label>
                                    <select
                                      value={timelineForm.category}
                                      onChange={e => setTimelineForm({ ...timelineForm, category: e.target.value })}
                                      style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem' }}
                                    >
                                      {currentUser.role === 'Labour' ? (
                                        <>
                                          <option value="General">General</option>
                                          <option value="Masonry">Masonry</option>
                                          <option value="Finishing">Finishing</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="General">General</option>
                                          <option value="Excavation">Excavation</option>
                                          <option value="Foundation">Foundation</option>
                                          <option value="Masonry">Masonry</option>
                                          <option value="Roofing">Roofing</option>
                                          <option value="Finishing">Finishing</option>
                                        </>
                                      )}
                                    </select>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#475569' }}>Description</label>
                                  <textarea
                                    placeholder="Enter details of work completed..."
                                    rows="3"
                                    value={timelineForm.description}
                                    onChange={e => setTimelineForm({ ...timelineForm, description: e.target.value })}
                                    style={{ padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.85rem', resize: 'vertical' }}
                                  />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                  <label style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#475569' }}>Progress Image (Optional)</label>
                                  <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                                    {[
                                      { name: 'Brickwork Site', url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80' },
                                      { name: 'Foundation Pouring', url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=400&q=80' },
                                      { name: 'Electrical Work', url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=400&q=80' },
                                      { name: 'Interior Plaster', url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80' }
                                    ].map(imgOpt => (
                                      <button
                                        key={imgOpt.url}
                                        type="button"
                                        onClick={() => setTimelineForm({ ...timelineForm, img: imgOpt.url })}
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          border: timelineForm.img === imgOpt.url ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                          borderRadius: '0.375rem',
                                          padding: '0.25rem',
                                          background: 'white',
                                          cursor: 'pointer',
                                          flexShrink: 0
                                        }}
                                      >
                                        <img src={imgOpt.url} alt={imgOpt.name} style={{ width: '80px', height: '50px', objectFit: 'cover', borderRadius: '0.25rem' }} />
                                        <span style={{ fontSize: '0.65rem', color: '#475569', marginTop: '2px' }}>{imgOpt.name}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowPostUpdateForm(false)}
                                    style={{ padding: '0.45rem 1rem', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="submit"
                                    style={{ padding: '0.45rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                                  >
                                    Post Update
                                  </button>
                                </div>
                              </form>
                            )}

                            {/* Vertical Progress Feed */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              {!workspaceDetail.updates || workspaceDetail.updates.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', background: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
                                  <span>📅</span>
                                  <h5 style={{ fontWeight: 'bold', margin: '0.5rem 0' }}>No updates posted yet</h5>
                                  <p style={{ fontSize: '0.8rem', margin: 0 }}>Progress updates posted by workspace members will appear here in chronological order.</p>
                                </div>
                              ) : (
                                [...workspaceDetail.updates].reverse().map(update => {
                                  const isLiked = update.likedBy?.includes(currentUser?._id);
                                  return (
                                    <div key={update._id} style={{ display: 'flex', gap: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                                      {/* Left timeline indicator */}
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', border: '4px solid #dbeafe', flexShrink: 0 }}></div>
                                        <div style={{ flex: 1, width: '2px', background: '#e2e8f0', margin: '4px 0' }}></div>
                                      </div>

                                      {/* Content */}
                                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                          <div>
                                            {update.postedBy?.senderRole && (
                                              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.3rem' }}>
                                                [{update.postedBy.senderRole}] {update.postedBy.senderName}
                                              </div>
                                            )}
                                            <span style={{ fontSize: '0.68rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#3b82f6', background: '#eff6ff', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', marginRight: '6px' }}>
                                              {update.category}
                                            </span>
                                            <h5 style={{ margin: '0.35rem 0 0.15rem', fontSize: '0.95rem', fontWeight: 'bold', color: '#0f172a' }}>{update.title}</h5>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                              {new Date(update.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(update.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          </div>
                                        </div>

                                        {update.description && (
                                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.45' }}>
                                            {update.description}
                                          </p>
                                        )}

                                        {update.img && (
                                          <img
                                            src={update.img}
                                            alt={update.title}
                                            style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '0.5rem', border: '1px solid #f1f5f9', marginTop: '0.25rem' }}
                                          />
                                        )}

                                        {/* Action buttons (Like & Comment triggers) */}
                                        <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                          <button
                                            onClick={() => handleLikeUpdate(update._id)}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: isLiked ? '#ef4444' : '#64748b',
                                              fontSize: '0.8rem',
                                              fontWeight: '600',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: 0
                                            }}
                                          >
                                            {isLiked ? '❤️' : '🤍'} {update.likes || 0} {update.likes === 1 ? 'Like' : 'Likes'}
                                          </button>
                                          <button
                                            onClick={() => setActiveCommentUpdateId(activeCommentUpdateId === update._id ? null : update._id)}
                                            style={{
                                              background: 'none',
                                              border: 'none',
                                              color: '#64748b',
                                              fontSize: '0.8rem',
                                              fontWeight: '600',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '4px',
                                              padding: 0
                                            }}
                                          >
                                            💬 {update.comments?.length || 0} {update.comments?.length === 1 ? 'Comment' : 'Comments'}
                                          </button>
                                        </div>

                                        {/* Comments list & post form */}
                                        {activeCommentUpdateId === update._id && (
                                          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            {/* List of comments */}
                                            {update.comments && update.comments.length > 0 && (
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                                {update.comments.map((comment, cIdx) => (
                                                  <div key={cIdx} style={{ fontSize: '0.78rem', lineHeight: '1.35' }}>
                                                    <strong style={{ color: '#1e293b' }}>{comment.senderName}</strong>
                                                    <span style={{ color: '#94a3b8', fontSize: '0.68rem', marginLeft: '6px' }}>
                                                      {new Date(comment.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <p style={{ margin: '2px 0 0', color: '#475569' }}>{comment.text}</p>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            {/* Submit new comment form */}
                                            {isWorkspaceMember ? (
                                              <form
                                                onSubmit={(e) => {
                                                  e.preventDefault();
                                                  handleCommentUpdate(update._id, updateCommentTexts[update._id]);
                                                }}
                                                style={{ display: 'flex', gap: '0.5rem' }}
                                              >
                                                <input
                                                  type="text"
                                                  required
                                                  placeholder="Write a comment..."
                                                  value={updateCommentTexts[update._id] || ''}
                                                  onChange={e => setUpdateCommentTexts({ ...updateCommentTexts, [update._id]: e.target.value })}
                                                  style={{ flex: 1, padding: '0.35rem 0.5rem', border: '1px solid #cbd5e1', borderRadius: '0.25rem', fontSize: '0.78rem' }}
                                                />
                                                <button
                                                  type="submit"
                                                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                  Post
                                                </button>
                                              </form>
                                            ) : (
                                              <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>Only workspace members can comment</span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {/* 5. LABOUR MANAGEMENT SUB-TAB */}
                        {workspaceTab === 'labour' && (
                          <div style={{ padding: '0.5rem 0' }}>
                            <LabourManagementTab 
                              workspaceDetail={workspaceDetail} 
                              currentUser={currentUser} 
                              setWorkspaceDetail={setWorkspaceDetail}
                            />
                          </div>
                        )}

                      </div>
                    </div>
                  )
                })() : (
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

