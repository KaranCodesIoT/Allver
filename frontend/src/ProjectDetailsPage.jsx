import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, DollarSign, Send, MessageCircle,
  FileText, CheckCircle2, Clock, Play, ThumbsUp, MessageSquare,
  Plus, Check, Sparkles, CreditCard, ShieldCheck, AlertCircle, RefreshCw,
  Layers, Grid, Droplet, Wrench, BellRing, Receipt, IndianRupee, X
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const UNSPLASH_PRESETS = [
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80'
];

const ProjectDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  // Tab State: 'updates' | 'payments' | 'chats'
  const [activeTab, setActiveTab] = useState('updates');

  // Load project meta
  const getProjectMeta = (projId) => {
    const registry = {
      p1: { name: 'Greenwood Villa', location: 'Navi Mumbai', status: 'Completed', year: 2024, img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80' },
      p2: { name: 'Palm Beach Apartment Interior', location: 'Mumbai', status: 'In Progress', year: 2024, img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80' },
      p3: { name: 'Corporate Office Design', location: 'Navi Mumbai', status: 'Completed', year: 2023, img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80' },
      p4: { name: 'Luxury Bungalow Design', location: 'Pune', status: 'Completed', year: 2023, img: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80' },
      p5: { name: 'Hill View Residence', location: 'Mumbai', status: 'In Progress', year: 2024, img: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80' }
    };

    if (registry[projId]) return registry[projId];

    if (projId && projId.startsWith('p-')) {
      const idx = parseInt(projId.split('-')[1]) || 0;
      return {
        name: `Portfolio Project ${idx + 1}`,
        location: 'Mumbai',
        status: idx % 2 === 0 ? 'Completed' : 'In Progress',
        year: 2024 - idx,
        img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
      };
    }

    return {
      name: 'Raj Construction Project',
      location: 'Mumbai',
      status: 'In Progress',
      year: 2026,
      img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'
    };
  };

  const getArchitectInfo = () => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'Architect') {
        return {
          fullName: user.fullName || 'Neha Sharma',
          role: 'Architect',
          firmName: user.firmName || 'Design Space Architects',
          rating: 4.8,
          reviews: 124,
          avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
          phone: user.phoneNumber || '+91 98765 43210'
        };
      }
    }
    return {
      fullName: 'Neha Sharma',
      role: 'Architect',
      firmName: 'Design Space Architects',
      rating: 4.8,
      reviews: 124,
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
      phone: '+91 98765 43210'
    };
  };

  const project = getProjectMeta(id);
  const architect = getArchitectInfo();

  // Detect if current user is Architect
  const isArchitect = (() => {
    try {
      const u = JSON.parse(localStorage.getItem('currentUser') || '{}');
      return u.role === 'Architect';
    } catch { return false; }
  })();

  // --- STATE PERSISTENCE KEYS ---
  const KEY_UPDATES = `allver_proj_upd_${id}`;
  const KEY_PAYMENTS = `allver_proj_pay_${id}`;
  const KEY_CHATS = `allver_proj_chat_${id}`;

  // --- 1. UPDATES STATE ---
  const [updates, setUpdates] = useState(() => {
    const saved = localStorage.getItem(KEY_UPDATES);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 1,
        title: 'Quotation Uploaded',
        date: '10 Apr 2024 • 10:30 AM',
        category: 'Quotation',
        iconType: 'quotation',
        likes: 2,
        liked: false,
        commentsCount: 0,
        description: 'Here is the quotation for your reference.',
        img: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
        comments: []
      },
      {
        id: 2,
        title: 'RCC Work Completed',
        date: '18 Apr 2024 • 04:15 PM',
        category: 'Structure',
        iconType: 'structure',
        likes: 5,
        liked: false,
        commentsCount: 0,
        description: 'RCC work completed as per plan.',
        img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80',
        comments: []
      },
      {
        id: 3,
        title: 'Brick Work Completed',
        date: '28 Apr 2024 • 11:20 AM',
        category: 'Structure',
        iconType: 'brick',
        likes: 6,
        liked: false,
        commentsCount: 0,
        description: 'Brick work completed in all rooms.',
        img: 'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=600&q=80',
        comments: []
      },
      {
        id: 4,
        title: 'Plumbing Work Done',
        date: '10 May 2024 • 03:40 PM',
        category: 'MEP',
        iconType: 'plumbing',
        likes: 3,
        liked: false,
        commentsCount: 0,
        description: 'Plumbing work completed.',
        img: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80',
        comments: []
      },
      {
        id: 5,
        title: 'Tiles Work Started',
        date: '22 May 2024 • 02:10 PM',
        category: 'Finishing',
        iconType: 'tiles',
        likes: 4,
        liked: false,
        commentsCount: 0,
        description: 'Tiles installation started in kitchen.',
        img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80',
        comments: []
      },
      {
        id: 6,
        title: 'Project Completed',
        date: '05 Jul 2024 • 06:00 PM',
        category: 'Completion',
        iconType: 'completed',
        likes: 12,
        liked: false,
        commentsCount: 0,
        description: 'Project completed successfully.',
        img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80',
        comments: []
      },
      {
        id: 7,
        title: 'Home Owner Review',
        date: '05 Jul 2024 • 06:30 PM',
        category: 'Completion',
        iconType: 'review',
        likes: 15,
        liked: false,
        commentsCount: 0,
        description: 'Client shared his experience with us.',
        img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80',
        comments: []
      }
    ];
  });

  // --- 2. PAYMENTS STATE ---
  const [payments, setPayments] = useState(() => {
    const saved = localStorage.getItem(KEY_PAYMENTS);
    if (saved) return JSON.parse(saved);
    return {
      total: 1950000,
      paid: 320000,
      pending: 1630000,
      milestones: [
        { id: 'm1', name: 'Booking Advance & Space Planning',     amount: 120000,  status: 'Paid',    date: '12 Jan 2026', receipt: 'REC-2026-001' },
        { id: 'm2', name: 'Site Measurement & Requirement Analysis', amount: 80000, status: 'Paid',   date: '28 Jan 2026', receipt: 'REC-2026-002' },
        { id: 'm3', name: 'Concept Design Presentation',          amount: 150000,  status: 'Paid',    date: '15 Feb 2026', receipt: 'REC-2026-003' },
        { id: 'm4', name: '2D Floor Plan Approval',               amount: 100000,  status: 'Payment Requested', date: 'Due 10 Mar 2026', completionNote: 'All 2D floor plans finalized and submitted for client approval. Includes living, kitchen, bedroom and bathroom layouts.', requestDate: '05 Mar 2026', files: ['Floor_Plan_v3.pdf', 'Layout_Drawings.dwg'] },
        { id: 'm5', name: '3D Visualizations & Layout Approval',  amount: 200000,  status: 'Pending', date: 'Due 30 Apr 2026' },
        { id: 'm6', name: 'Working Drawings Submission',          amount: 250000,  status: 'Pending', date: 'Due 31 May 2026' },
        { id: 'm7', name: 'Material Selection & BOQ',             amount: 300000,  status: 'Pending', date: 'Due 30 Jun 2026' },
        { id: 'm8', name: 'Site Supervision Stage',               amount: 350000,  status: 'Pending', date: 'Due 31 Aug 2026' },
        { id: 'm9', name: 'Final Design Handover',                amount: 400000,  status: 'Pending', date: 'Due 30 Oct 2026' }
      ]
    };
  });

  // --- 3. CHATS STATE ---
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = localStorage.getItem(KEY_CHATS);
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, sender: 'client', name: 'Raj (Client)', text: 'Hi Neha, could you share the latest site photos for the project?', time: '09:45 AM', type: 'text' },
      { id: 2, sender: 'architect', name: 'Neha (Architect)', text: 'Hi Raj, sure! Sending you the second floor slab concrete casting pictures.', time: '09:47 AM', type: 'text' },
      { id: 3, sender: 'architect', name: 'Neha (Architect)', text: 'RCC Work casting is completing smoothly.', time: '09:48 AM', type: 'text' },
      { id: 4, sender: 'client', name: 'Raj (Client)', text: 'Looks great! Has the plumbing work begun?', time: '09:50 AM', type: 'text' },
      { id: 5, sender: 'architect', name: 'Neha (Architect)', text: 'Yes, concealed plumbing is done and tested. I\'ve uploaded details in the updates tab.', time: '09:52 AM', type: 'text' }
    ];
  });

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(KEY_UPDATES, JSON.stringify(updates));
  }, [updates, KEY_UPDATES]);

  useEffect(() => {
    localStorage.setItem(KEY_PAYMENTS, JSON.stringify(payments));
  }, [payments, KEY_PAYMENTS]);

  useEffect(() => {
    localStorage.setItem(KEY_CHATS, JSON.stringify(chatMessages));
  }, [chatMessages, KEY_CHATS]);

  // Scroll chat to bottom
  useEffect(() => {
    if (activeTab === 'chats') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  // --- STATE FOR INTERACTIVE INTERACTIONS ---
  // Updates State
  const [showAddUpdateForm, setShowAddUpdateForm] = useState(false);
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateCategory, setNewUpdateCategory] = useState('Finishing');
  const [newUpdateImg, setNewUpdateImg] = useState(UNSPLASH_PRESETS[0]);
  const [newUpdateDesc, setNewUpdateDesc] = useState('');
  const [updateSearch, setUpdateSearch] = useState('');
  const [updateCategoryFilter, setUpdateCategoryFilter] = useState('All');
  const [activeCommentsIdx, setActiveCommentsIdx] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});

  // Payments State
  const [activePaymentModalMilestone, setActivePaymentModalMilestone] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState(false);

  // Architect Payment Request State
  const [payReqModal, setPayReqModal] = useState(null);
  const [payReqNote, setPayReqNote] = useState('');
  const [payReqFiles, setPayReqFiles] = useState([]);
  const [payReqSent, setPayReqSent] = useState(false);
  const [payReqSending, setPayReqSending] = useState(false);

  // Client Rejection State
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // View Files Modal (client preview)
  const [viewFilesModal, setViewFilesModal] = useState(null);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // --- ACTIONS ---
  // Add progress update
  const handleCreateUpdate = (e) => {
    e.preventDefault();
    if (!newUpdateTitle.trim() || !newUpdateDesc.trim()) return;

    const newUpd = {
      id: Date.now(),
      title: newUpdateTitle.trim(),
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }) + ', ' + new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      category: newUpdateCategory,
      likes: 0,
      liked: false,
      commentsCount: 0,
      description: newUpdateDesc.trim(),
      img: newUpdateImg,
      comments: []
    };

    setUpdates([newUpd, ...updates]);
    setNewUpdateTitle('');
    setNewUpdateDesc('');
    setShowAddUpdateForm(false);
  };

  const handleLikeUpdate = (uid) => {
    setUpdates(updates.map(upd => {
      if (upd.id === uid) {
        return {
          ...upd,
          likes: upd.liked ? upd.likes - 1 : upd.likes + 1,
          liked: !upd.liked
        };
      }
      return upd;
    }));
  };

  const handleAddComment = (uid, e) => {
    e.preventDefault();
    const commentText = commentInputs[uid] || '';
    if (!commentText.trim()) return;

    setUpdates(updates.map(upd => {
      if (upd.id === uid) {
        return {
          ...upd,
          commentsCount: upd.commentsCount + 1,
          comments: [
            ...upd.comments,
            {
              sender: 'Raj (Client)',
              text: commentText.trim(),
              time: 'Just now'
            }
          ]
        };
      }
      return upd;
    }));

    setCommentInputs({ ...commentInputs, [uid]: '' });
  };

  // Payment Sim (Client direct pay – legacy)
  const triggerPaymentFlow = (milestone) => {
    setActivePaymentModalMilestone(milestone);
    setPaymentSuccessMsg(false);
    setPaymentProcessing(false);
  };

  // Architect: Open Payment Request Modal
  const openPayReqModal = (milestone) => {
    setPayReqModal(milestone);
    setPayReqNote('');
    setPayReqFiles([]);
    setPayReqSent(false);
    setPayReqSending(false);
  };

  // Architect: Handle file selection
  const handlePayReqFiles = (e) => {
    const selected = Array.from(e.target.files).map(f => f.name);
    setPayReqFiles(prev => [...prev, ...selected]);
  };

  const removePayReqFile = (idx) => {
    setPayReqFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // Architect: Submit Payment Request → status becomes 'Payment Requested'
  const handleSendPayReq = () => {
    setPayReqSending(true);
    const requestDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    setTimeout(() => {
      setPayReqSending(false);
      setPayReqSent(true);
      setPayments(prev => ({
        ...prev,
        milestones: prev.milestones.map(ms =>
          ms.id === payReqModal.id
            ? { ...ms, status: 'Payment Requested', completionNote: payReqNote, requestDate, files: payReqFiles }
            : ms
        )
      }));
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'architect',
          name: `${architect.fullName} (Architect)`,
          text: `📩 Payment Request Submitted for milestone "${payReqModal.name}" — ₹${payReqModal.amount.toLocaleString('en-IN')}. ${payReqNote || 'Milestone completed. Kindly review and approve payment.'}`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        }
      ]);
      setTimeout(() => setPayReqModal(null), 1800);
    }, 1400);
  };

  // Client: Approve Payment → status becomes 'Paid'
  const handleApprovePayment = (ms) => {
    const receiptNo = `REC-2026-${String(Date.now()).slice(-4)}`;
    setPayments(prev => ({
      ...prev,
      paid: prev.paid + ms.amount,
      pending: prev.pending - ms.amount,
      milestones: prev.milestones.map(m =>
        m.id === ms.id ? { ...m, status: 'Paid', receipt: receiptNo, date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } : m
      )
    }));
    setChatMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        sender: 'client',
        name: 'Client',
        text: `✅ Payment Approved for "${ms.name}" — ₹${ms.amount.toLocaleString('en-IN')}. Receipt ${receiptNo} generated.`,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'text'
      }
    ]);
  };

  // Client: Open Reject Modal
  const openRejectModal = (ms) => {
    setRejectModal(ms);
    setRejectReason('');
  };

  // Client: Submit Rejection → status returns to Pending
  const handleSubmitRejection = () => {
    setRejectSubmitting(true);
    setTimeout(() => {
      setPayments(prev => ({
        ...prev,
        milestones: prev.milestones.map(m =>
          m.id === rejectModal.id
            ? { ...m, status: 'Pending', rejectionReason: rejectReason, completionNote: undefined, requestDate: undefined, files: [] }
            : m
        )
      }));
      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          sender: 'client',
          name: 'Client',
          text: `❌ Payment Rejected for "${rejectModal.name}". Reason: ${rejectReason || 'No reason provided.'}`,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        }
      ]);
      setRejectSubmitting(false);
      setRejectModal(null);
    }, 1000);
  };

  const handleProcessPayment = () => {
    setPaymentProcessing(true);
    setTimeout(() => {
      setPaymentProcessing(false);
      setPaymentSuccessMsg(true);
      
      // Update balance
      const milestoneAmount = activePaymentModalMilestone.amount;
      const updatedMilestones = payments.milestones.map(ms => {
        if (ms.id === activePaymentModalMilestone.id) {
          return { ...ms, status: 'Paid', date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) };
        }
        return ms;
      });

      setPayments({
        ...payments,
        paid: payments.paid + milestoneAmount,
        pending: payments.pending - milestoneAmount,
        milestones: updatedMilestones
      });

      // Append confirmation message in Chat
      const confirmChat = {
        id: Date.now() + 10,
        sender: 'client',
        name: 'Raj (Client)',
        text: `💸 Milestone Paid: Just processed payment of ₹${milestoneAmount.toLocaleString('en-IN')} for "${activePaymentModalMilestone.name}".`,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        type: 'text'
      };
      
      setChatMessages(prev => [...prev, confirmChat]);

      // Automatically trigger architect confirmation after 2.5 seconds
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setChatMessages(prev => [
            ...prev,
            {
              id: Date.now() + 20,
              sender: 'architect',
              name: 'Neha (Architect)',
              text: `Thank you Raj! I received the notification for the payment of ₹${milestoneAmount.toLocaleString('en-IN')}. I've marked it in the dashboard ledger.`,
              time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              type: 'text'
            }
          ]);
        }, 1200);
      }, 2000);

      setTimeout(() => {
        setActivePaymentModalMilestone(null);
      }, 1500);

    }, 1500);
  };

  // Send message
  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const clientMsg = {
      id: Date.now(),
      sender: 'client',
      name: 'Raj (Client)',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      type: 'text'
    };

    setChatMessages(prev => [...prev, clientMsg]);
    const inputVal = chatInput.toLowerCase();
    setChatInput('');

    // Trigger architect reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "Understood! I will check on this and get back to you shortly.";
      
      if (inputVal.includes('payment') || inputVal.includes('pay') || inputVal.includes('money')) {
        replyText = "Thank you! I will verify the payment sheet in our system and let you know if the ledger updates. Feel free to use the Payments tab to process milestones.";
      } else if (inputVal.includes('update') || inputVal.includes('photo') || inputVal.includes('progress') || inputVal.includes('image')) {
        replyText = "Yes, I will ask our site engineer Amit to upload the latest finishing pictures directly to the Project Updates timeline today.";
      } else if (inputVal.includes('visit') || inputVal.includes('meeting') || inputVal.includes('meet')) {
        replyText = "Sure, I am visiting the site on Wednesday at 11:30 AM. Let me know if that works for you, and we can discuss the material approvals on-site.";
      } else if (inputVal.includes('drawing') || inputVal.includes('plan') || inputVal.includes('design')) {
        replyText = "The revised floor plans and kitchen drawings are ready. I can send them via WhatsApp or upload them to the documents drive.";
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'architect',
          name: 'Neha (Architect)',
          text: replyText,
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          type: 'text'
        }
      ]);
    }, 1500);
  };

  const handleReplyToChat = (upd) => {
    setActiveTab('chats');
    setChatInput(`Regarding the update "${upd.title}": `);
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'quotation':
        return <FileText size={14} />;
      case 'structure':
        return <Layers size={14} />;
      case 'brick':
        return <Grid size={14} />;
      case 'plumbing':
        return <Droplet size={14} />;
      case 'tiles':
        return <Sparkles size={14} />;
      case 'completed':
      case 'review':
        return <Play size={14} fill="currentColor" style={{ marginLeft: '2px' }} />;
      default:
        return <Sparkles size={14} />;
    }
  };

  // Filter updates
  const filteredUpdates = updates.filter(upd => {
    const matchesSearch = upd.title.toLowerCase().includes(updateSearch.toLowerCase()) || 
                          upd.description.toLowerCase().includes(updateSearch.toLowerCase());
    const matchesCategory = updateCategoryFilter === 'All' || upd.category === updateCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout 
      pageTitle={project.name} 
      pageSubtitle={`${project.location} · Project Management Portal`} 
      accentColor="#10b981"
    >
      {/* Back to Profile */}
      <button className="pd-back-btn" onClick={() => navigate('/profile')}>
        <ArrowLeft size={16} /> Back to Architect Profile
      </button>

      {/* Project Cover Banner */}
      <div className="pd-banner-card">
        <div className="pdb-image" style={{ backgroundImage: `url(${project.img})` }}>
          <div className="pdb-overlay" />
          <div className="pdb-content">
            <span className={`pdb-status ${project.status.toLowerCase().replace(' ', '-')}`}>
              {project.status}
            </span>
            <h1>{project.name}</h1>
            <p className="pdb-meta">
              <MapPin size={16} /> {project.location} <span className="sep">•</span> <Calendar size={16} /> Started: {project.year}
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Dashboard Area */}
      <div className="pd-dashboard-wrapper">
        
        {/* Navigation Tabs */}
        <div className="pd-tabs-bar">
          <button 
            className={`pd-tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
            onClick={() => setActiveTab('updates')}
          >
            <Sparkles size={18} />
            <span>Project Updates</span>
          </button>
          <button 
            className={`pd-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            <DollarSign size={18} />
            <span>Payments & Milestones</span>
          </button>
          <button 
            className={`pd-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            <MessageCircle size={18} />
            <span>Messages / Chats</span>
          </button>
        </div>

        {/* Dynamic Panels */}
        <div className="pd-panel-container">
          
          {/* ==========================================
             TAB 1: UPDATES TIMELINE
             ========================================== */}
          {/* ==========================================
             TAB 1: UPDATES TIMELINE
             ========================================== */}
          {activeTab === 'updates' && (
            <div className="pd-tab-pane animated-fade-in">
              <div className="pd-progress-three-cols">
                
                {/* Left Column: Flow Sidebar */}
                <div className="pd-flow-sidebar">
                  <h3 className="sidebar-title">How It Works (Flow)</h3>
                  <div className="flow-steps-list">
                    <div className="flow-step">
                      <div className="step-num step-1">1</div>
                      <div className="step-details">
                        <h4>Quotation Upload</h4>
                        <p>Contractor uploads quotation image to start the project.</p>
                      </div>
                    </div>
                    <div className="flow-step">
                      <div className="step-num step-2">2</div>
                      <div className="step-details">
                        <h4>Site Progress Updates</h4>
                        <p>Contractor uploads site photos/videos with short message as work progresses.</p>
                      </div>
                    </div>
                    <div className="flow-step">
                      <div className="step-num step-3">3</div>
                      <div className="step-details">
                        <h4>Owner Reactions & Reply</h4>
                        <p>Home owner can react (like, love, etc.) and reply on every update. Reply opens in chat.</p>
                      </div>
                    </div>
                    <div className="flow-step">
                      <div className="step-num step-4">4</div>
                      <div className="step-details">
                        <h4>Payment</h4>
                        <p>After verifying progress or final completion, home owner can pay directly from the app.</p>
                      </div>
                    </div>
                    <div className="flow-step">
                      <div className="step-num step-5">5</div>
                      <div className="step-details">
                        <h4>Project Completion</h4>
                        <p>Contractor uploads completion video and home owner review video.</p>
                      </div>
                    </div>
                    <div className="flow-step">
                      <div className="step-num step-6">6</div>
                      <div className="step-details">
                        <h4>Portfolio for Others</h4>
                        <p>Other users can view this project timeline to understand contractor's work quality.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Column: Project Progress Feed */}
                <div className="pd-progress-main-feed">
                  
                  {/* Feed Header Card */}
                  <div className="feed-header-card">
                    <div className="feed-header-top">
                      <div className="title-area">
                        <h2 className="project-title-label">2BHK Interior Project</h2>
                        <span className="project-id-label">Project ID: PRJ12345</span>
                      </div>
                      <div className="status-area">
                        <span className="status-badge-progress">In Progress</span>
                      </div>
                    </div>

                    {/* Contractor profile card */}
                    <div className="contractor-widget-row">
                      <img 
                        src={architect.avatarUrl} 
                        alt="Architect" 
                        className="contractor-avatar" 
                      />
                      <div className="contractor-info-block">
                        <span className="role-lbl">Architect</span>
                        <h3>{architect.fullName}</h3>
                        <p className="rating-desc">⭐ {architect.rating} ({architect.reviews} Reviews)</p>
                      </div>
                      <div className="contractor-actions-block">
                        <button className="btn-widget-profile" onClick={() => navigate('/profile')}>
                          View Profile
                        </button>
                        <a href={`tel:${architect.phone}`} className="btn-widget-call" title="Call Architect">
                          📞
                        </a>
                      </div>
                    </div>

                    {/* Dates & Amount Summary Row */}
                    <div className="progress-dates-summary-row">
                      <div className="summary-date-box">
                        <span className="lbl">Start Date</span>
                        <strong>10 Apr 2024</strong>
                      </div>
                      <div className="summary-date-box">
                        <span className="lbl">End Date (Est.)</span>
                        <strong>10 Jul 2024</strong>
                      </div>
                      <div className="summary-date-box">
                        <span className="lbl">Total Amount</span>
                        <strong className="amount-highlight">₹8,50,000</strong>
                      </div>
                    </div>
                  </div>

                  {/* Add Update & Search Filters Header */}
                  <div className="updates-panel-header">
                    <div className="search-filters">
                      <input 
                        type="text" 
                        placeholder="Search progress updates..."
                        value={updateSearch}
                        onChange={(e) => setUpdateSearch(e.target.value)}
                        className="update-search-input"
                      />
                      <div className="category-pills">
                        {['All'].map(cat => (
                          <button
                            key={cat}
                            className={`cat-pill ${updateCategoryFilter === cat ? 'active' : ''}`}
                            onClick={() => setUpdateCategoryFilter(cat)}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      className="btn-add-update"
                      onClick={() => setShowAddUpdateForm(!showAddUpdateForm)}
                    >
                      <Plus size={16} />
                      <span>{showAddUpdateForm ? 'Close' : 'Add Update'}</span>
                    </button>
                  </div>

                  {/* Add Update Collapse Form */}
                  {showAddUpdateForm && (
                    <form className="add-update-form-card" onSubmit={handleCreateUpdate}>
                      <h3>Post Site Progress Update</h3>
                      
                      <div className="form-grid">
                        <div className="form-item">
                          <label>Update Title</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Concrete slab finished"
                            value={newUpdateTitle}
                            onChange={(e) => setNewUpdateTitle(e.target.value)}
                          />
                        </div>
                        
                        <div className="form-item">
                          <label>Work Category</label>
                          <select 
                            value={newUpdateCategory} 
                            onChange={(e) => setNewUpdateCategory(e.target.value)}
                          >
                            <option value="Structure">Structure</option>
                            <option value="MEP">MEP</option>
                            <option value="Finishing">Finishing</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-item">
                        <label>Select Cover Photo Preset</label>
                        <div className="preset-images-picker">
                          {UNSPLASH_PRESETS.map((preset, idx) => (
                            <div 
                              key={idx}
                              className={`preset-thumb-wrapper ${newUpdateImg === preset ? 'selected' : ''}`}
                              onClick={() => setNewUpdateImg(preset)}
                            >
                              <img src={preset} alt={`preset-${idx}`} />
                              {newUpdateImg === preset && <div className="selected-check"><Check size={12} /></div>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="form-item">
                        <label>Description Details</label>
                        <textarea 
                          rows={3}
                          required
                          placeholder="Provide description log..."
                          value={newUpdateDesc}
                          onChange={(e) => setNewUpdateDesc(e.target.value)}
                        />
                      </div>

                      <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={() => setShowAddUpdateForm(false)}>
                          Cancel
                        </button>
                        <button type="submit" className="btn-submit">
                          Publish
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Vertical Progress Timeline */}
                  <div className="progress-timeline-feed">
                    {filteredUpdates.length > 0 ? (
                      filteredUpdates.map((upd) => (
                        <div key={upd.id} className="feed-timeline-node">
                          <div className={`feed-node-bullet ${upd.iconType || 'structure'}`}>
                            {getIconForType(upd.iconType || 'structure')}
                          </div>

                          <div className="feed-node-card">
                            <div className="node-card-body">
                              <div className="node-card-details">
                                <h3>{upd.title}</h3>
                                <p className="node-card-text">{upd.description}</p>
                                <span className="node-card-timestamp">{upd.date}</span>
                              </div>
                              {upd.img && (
                                <div className="node-card-media-wrapper">
                                  <img src={upd.img} alt={upd.title} className="node-card-img" />
                                  {(upd.iconType === 'completed' || upd.iconType === 'review') && (
                                    <div className="video-play-btn-overlay">
                                      <Play size={22} fill="white" color="white" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="node-card-actions-row">
                              <button 
                                className={`node-action-btn-react ${upd.liked ? 'liked' : ''}`}
                                onClick={() => handleLikeUpdate(upd.id)}
                              >
                                ❤️ <span>{upd.likes}</span>
                              </button>
                              <button 
                                className="node-action-btn-reply"
                                onClick={() => handleReplyToChat(upd)}
                              >
                                💬 <span>Reply</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <AlertCircle size={36} />
                        <p>No progress updates match your filters.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Actions Available Sidebar */}
                <div className="pd-actions-sidebar">
                  <div className="sidebar-section-card purple-shadow">
                    <h3>Actions Available</h3>
                    <div className="sidebar-action-item">
                      <span className="action-icon text-red">❤️</span>
                      <div className="action-text">
                        <h4>React</h4>
                        <p>Like, Love, Wow on every update</p>
                      </div>
                    </div>
                    <div className="sidebar-action-item">
                      <span className="action-icon text-blue">💬</span>
                      <div className="action-text">
                        <h4>Reply</h4>
                        <p>Ask questions directly on any update</p>
                      </div>
                    </div>
                    <div className="sidebar-action-item cursor-pointer" onClick={() => setActiveTab('chats')}>
                      <span className="action-icon text-green">✉️</span>
                      <div className="action-text">
                        <h4>Chat</h4>
                        <p>Full conversation in chat section</p>
                      </div>
                    </div>
                    <div className="sidebar-action-item cursor-pointer" onClick={() => setActiveTab('payments')}>
                      <span className="action-icon text-gold">₹</span>
                      <div className="action-text">
                        <h4>Pay</h4>
                        <p>Pay securely after verifying work</p>
                      </div>
                    </div>
                  </div>

                  <div className="sidebar-section-card">
                    <h3>Who Can See What?</h3>
                    <div className="visibility-item">
                      <span className="user-icon">👤</span>
                      <div className="visibility-text">
                        <h4>Home Owner</h4>
                        <p>Sees full project updates and can communicate & pay.</p>
                      </div>
                    </div>
                    <div className="visibility-item">
                      <span className="user-icon">👷</span>
                      <div className="visibility-text">
                        <h4>Contractor</h4>
                        <p>Uploads updates, communicates and marks project completed.</p>
                      </div>
                    </div>
                    <div className="visibility-item">
                      <span className="user-icon">👥</span>
                      <div className="visibility-text">
                        <h4>Other Users</h4>
                        <p>Can view completed projects in contractor's profile for reference.</p>
                      </div>
                    </div>
                  </div>

                  <div className="sidebar-section-card green-border">
                    <h3>Why This Is Beneficial?</h3>
                    <ul className="benefits-list-bullets">
                      <li>✔️ Very simple for contractors (just upload photo/video and message)</li>
                      <li>✔️ Complete transparency for home owners</li>
                      <li>✔️ Easy communication on every update</li>
                      <li>✔️ Secure payment when work is verified</li>
                      <li>✔️ Builds strong trust and better reputation</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
             TAB 2: PAYMENTS PORTAL
             ========================================== */}
          {activeTab === 'payments' && (
            <div className="pd-tab-pane animated-fade-in">

              {/* ---- Architect Banner ---- */}
              {isArchitect && (
                <div className="arch-pay-req-banner">
                  <div className="arch-pay-req-banner-left">
                    <div className="arch-pay-req-icon"><BellRing size={22} /></div>
                    <div>
                      <h3>Payment Request Centre</h3>
                      <p>Submit completion evidence for each milestone — client reviews and releases payment.</p>
                    </div>
                  </div>
                  <div className="arch-pay-req-banner-right">
                    <span className="arch-pay-stats">
                      <Receipt size={14} />
                      {payments.milestones.filter(m => m.status === 'Payment Requested').length} Awaiting Approval
                    </span>
                  </div>
                </div>
              )}

              {/* ---- KPI Cards ---- */}
              <div className="payments-kpi-row">
                <div className="kpi-card text-slate">
                  <div className="kpi-icon"><FileText size={20} /></div>
                  <div className="kpi-meta">
                    <span className="lbl">Total Contract Value</span>
                    <h3>₹{payments.total.toLocaleString('en-IN')}</h3>
                  </div>
                </div>
                <div className="kpi-card text-emerald">
                  <div className="kpi-icon"><CheckCircle2 size={20} /></div>
                  <div className="kpi-meta">
                    <span className="lbl">Paid Amount</span>
                    <h3>₹{payments.paid.toLocaleString('en-IN')}</h3>
                    <span className="progress-percentage">{((payments.paid / payments.total) * 100).toFixed(1)}% Completed</span>
                  </div>
                </div>
                <div className="kpi-card text-coral">
                  <div className="kpi-icon"><Clock size={20} /></div>
                  <div className="kpi-meta">
                    <span className="lbl">Pending Amount</span>
                    <h3>₹{payments.pending.toLocaleString('en-IN')}</h3>
                  </div>
                </div>
              </div>

              {/* ---- Progress Bar ---- */}
              <div className="payment-progress-bar-wrapper">
                <div className="progress-labels">
                  <span>Project Funding Progress</span>
                  <strong>{((payments.paid / payments.total) * 100).toFixed(1)}%</strong>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${(payments.paid / payments.total) * 100}%` }} />
                </div>
              </div>

              {/* ---- Milestones Table ---- */}
              <div className="payments-milestones-card">
                <h2>Project Payment Schedule</h2>
                <div className="table-wrapper">
                  <table className="milestones-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Milestone Stage</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Target Date</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.milestones.map((ms, idx) => (
                        <tr key={ms.id} className={`ms-row ms-${ms.status.toLowerCase().replace(/ /g, '-')}`}>
                          <td className="ms-index">{idx + 1}</td>
                          <td className="ms-name">
                            <div className="ms-name-wrap">
                              <span className="ms-name-text">{ms.name}</span>
                              {ms.rejectionReason && (
                                <span className="ms-rejection-note">❌ Rejected: {ms.rejectionReason}</span>
                              )}
                              {ms.status === 'Payment Requested' && ms.files?.length > 0 && (
                                <button className="ms-view-files-btn" onClick={() => setViewFilesModal(ms)}>
                                  📎 {ms.files.length} file{ms.files.length > 1 ? 's' : ''} attached
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="ms-amount">₹{ms.amount.toLocaleString('en-IN')}</td>
                          <td>
                            <span className={`ms-status-badge ms-status-${ms.status.toLowerCase().replace(/ /g, '-')}`}>
                              {ms.status === 'Paid' && <Check size={11} />}
                              {ms.status === 'Payment Requested' && <BellRing size={11} />}
                              {ms.status === 'Pending' && <Clock size={11} />}
                              {ms.status}
                            </span>
                          </td>
                          <td className="ms-date">{ms.date}</td>
                          <td className="ms-action">
                            {/* PAID */}
                            {ms.status === 'Paid' && (
                              <div className="ms-action-paid">
                                <CheckCircle2 size={13} />
                                <span>Receipt {ms.receipt}</span>
                              </div>
                            )}

                            {/* PAYMENT REQUESTED — Architect view */}
                            {ms.status === 'Payment Requested' && isArchitect && (
                              <span className="ms-waiting-badge">
                                <Clock size={12} />
                                Waiting for Approval
                              </span>
                            )}

                            {/* PAYMENT REQUESTED — Client view */}
                            {ms.status === 'Payment Requested' && !isArchitect && (
                              <div className="ms-client-actions">
                                <button className="btn-approve-pay" onClick={() => handleApprovePayment(ms)}>
                                  <Check size={13} /> Approve
                                </button>
                                <button className="btn-reject-pay" onClick={() => openRejectModal(ms)}>
                                  <X size={13} /> Reject
                                </button>
                              </div>
                            )}

                            {/* PENDING — Architect view */}
                            {ms.status === 'Pending' && isArchitect && (
                              <button className="btn-pay-req-action" onClick={() => openPayReqModal(ms)}>
                                <BellRing size={13} />
                                Request Payment
                              </button>
                            )}

                            {/* PENDING — Client view */}
                            {ms.status === 'Pending' && !isArchitect && (
                              <span className="ms-client-pending">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================
             TAB 3: CHAT PANEL
             ========================================== */}
          {activeTab === 'chats' && (
            <div className="pd-tab-pane animated-fade-in chat-layout-pane">
              
              {/* Left Panel - Chat Members */}
              <div className="chat-members-sidebar">
                <h3>Project Space</h3>
                <div className="member-row active">
                  <div className="member-avatar">NS</div>
                  <div className="member-info">
                    <strong>Neha Sharma (Architect)</strong>
                    <span className="status-online">Online</span>
                  </div>
                </div>
                
                <div className="chat-quick-replies">
                  <h4>Quick Templates</h4>
                  <button onClick={() => setChatInput("Please check the latest structural concrete update.")}>
                    📢 Ask about structure
                  </button>
                  <button onClick={() => setChatInput("I have verified the payment and would like to proceed.")}>
                    💸 Talk about payments
                  </button>
                  <button onClick={() => setChatInput("Can we coordinate a site check meeting on Wednesday?")}>
                    📅 Schedule site check
                  </button>
                </div>
              </div>

              {/* Main Chat Area */}
              <div className="chat-window-main">
                <div className="chat-header">
                  <div className="info">
                    <strong>Project Discussion</strong>
                    <p>Client Raj & Architect Neha Sharma</p>
                  </div>
                </div>

                {/* Messages stream */}
                <div className="chat-messages-stream">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`message-bubble-row ${msg.sender}`}>
                      <div className="msg-avatar">
                        {msg.sender === 'client' ? 'R' : 'N'}
                      </div>
                      <div className="msg-content-wrapper">
                        <div className="msg-meta">
                          <strong>{msg.name}</strong>
                          <span className="time">{msg.time}</span>
                        </div>
                        <div className="msg-bubble">
                          <p>{msg.text}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="message-bubble-row architect typing">
                      <div className="msg-avatar">N</div>
                      <div className="msg-content-wrapper">
                        <div className="typing-indicator">
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <form className="chat-footer-input" onSubmit={handleSendMessage}>
                  <input 
                    type="text" 
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="btn-chat-send" disabled={!chatInput.trim()}>
                    <Send size={16} />
                  </button>
                </form>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* ==========================================
         ARCHITECT — PAYMENT REQUEST MODAL (FULL)
         ========================================== */}
      {payReqModal && (
        <div className="payment-gateway-modal-overlay prm-overlay" onClick={(e) => e.target === e.currentTarget && !payReqSending && setPayReqModal(null)}>
          <div className="pay-req-modal prm-wide">

            {/* Header */}
            <div className="pay-req-modal-header">
              <div className="pay-req-modal-brand">
                <div className="pay-req-brand-icon"><BellRing size={20} /></div>
                <div>
                  <h2>Request Payment — Milestone Completion</h2>
                  <p>Submit your deliverables and notify your client for payment approval</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setPayReqModal(null)} disabled={payReqSending}><X size={18} /></button>
            </div>

            {payReqSent ? (
              <div className="pay-req-success">
                <div className="pay-req-success-icon"><Check size={32} /></div>
                <h3>Payment Request Submitted!</h3>
                <p>Your client has been notified to review and approve payment for <strong>{payReqModal?.name}</strong>.</p>
                <p className="pay-req-chat-note">💬 A notification has been sent to the project chat.</p>
              </div>
            ) : (
              <div className="pay-req-modal-body prm-body">

                {/* ── Readonly Fields Row ── */}
                <div className="prm-readonly-grid">
                  <div className="prm-readonly-field">
                    <label>Milestone Stage</label>
                    <div className="prm-readonly-value">{payReqModal.name}</div>
                  </div>
                  <div className="prm-readonly-field">
                    <label>Amount</label>
                    <div className="prm-readonly-value prm-amount">₹{payReqModal.amount.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="prm-readonly-field">
                    <label>Target Date / Reference</label>
                    <div className="prm-readonly-value">{payReqModal.date}</div>
                  </div>
                  <div className="prm-readonly-field">
                    <label>Request Date</label>
                    <div className="prm-readonly-value">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                </div>

                {/* ── Work Completion Notes ── */}
                <div className="pay-req-field">
                  <label>Work Completion Notes <span className="req-star">*</span></label>
                  <textarea
                    rows={4}
                    value={payReqNote}
                    onChange={(e) => setPayReqNote(e.target.value)}
                    placeholder="Describe the work completed for this milestone. Include deliverables, site observations, or key decisions made..."
                    className="prm-textarea"
                  />
                </div>

                {/* ── Upload Design Files ── */}
                <div className="pay-req-field">
                  <label>Upload Design Files <span className="opt-label">(Optional)</span></label>
                  <div className="prm-file-drop">
                    <input
                      type="file"
                      id="prm-file-input"
                      multiple
                      accept=".pdf,.dwg,.jpg,.jpeg,.png,.zip,.rar"
                      onChange={handlePayReqFiles}
                      className="prm-file-hidden"
                    />
                    <label htmlFor="prm-file-input" className="prm-file-label">
                      <Receipt size={20} />
                      <span>Click to attach files</span>
                      <small>PDF, DWG, JPG, PNG, ZIP accepted</small>
                    </label>
                    {payReqFiles.length > 0 && (
                      <div className="prm-file-list">
                        {payReqFiles.map((f, i) => (
                          <div key={i} className="prm-file-chip">
                            <FileText size={12} />
                            <span>{f}</span>
                            <button type="button" onClick={() => removePayReqFile(i)}><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Preview Summary ── */}
                <div className="pay-req-preview">
                  <div className="pay-req-preview-row">
                    <span>From</span>
                    <strong>{architect.fullName} (Architect)</strong>
                  </div>
                  <div className="pay-req-preview-row">
                    <span>Milestone</span>
                    <strong>{payReqModal.name}</strong>
                  </div>
                  <div className="pay-req-preview-row">
                    <span>Amount Requested</span>
                    <strong className="amount-highlight">₹{payReqModal.amount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="pay-req-preview-row">
                    <span>Files Attached</span>
                    <strong>{payReqFiles.length} file{payReqFiles.length !== 1 ? 's' : ''}</strong>
                  </div>
                </div>

                {/* ── Actions ── */}
                <div className="pay-req-modal-actions">
                  <button className="btn-cancel" onClick={() => setPayReqModal(null)} disabled={payReqSending}>Cancel</button>
                  <button
                    className="btn-send-pay-req"
                    onClick={handleSendPayReq}
                    disabled={payReqSending || !payReqNote.trim()}
                  >
                    {payReqSending
                      ? <><RefreshCw size={15} className="spin" /> Submitting...</>
                      : <><Send size={15} /> Submit Payment Request</>
                    }
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
         CLIENT — VIEW FILES MODAL
         ========================================== */}
      {viewFilesModal && (
        <div className="payment-gateway-modal-overlay" onClick={(e) => e.target === e.currentTarget && setViewFilesModal(null)}>
          <div className="pay-req-modal">
            <div className="pay-req-modal-header">
              <div className="pay-req-modal-brand">
                <div className="pay-req-brand-icon"><FileText size={20} /></div>
                <div>
                  <h2>Attached Deliverables</h2>
                  <p>{viewFilesModal.name}</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setViewFilesModal(null)}><X size={18} /></button>
            </div>
            <div className="pay-req-modal-body">
              {viewFilesModal.completionNote && (
                <div className="vf-note-block">
                  <label>Architect's Completion Note</label>
                  <p>{viewFilesModal.completionNote}</p>
                </div>
              )}
              {viewFilesModal.requestDate && (
                <div className="pay-req-preview" style={{marginTop: 0}}>
                  <div className="pay-req-preview-row">
                    <span>Request Submitted On</span>
                    <strong>{viewFilesModal.requestDate}</strong>
                  </div>
                  <div className="pay-req-preview-row">
                    <span>Amount</span>
                    <strong className="amount-highlight">₹{viewFilesModal.amount.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              )}
              {viewFilesModal.files?.length > 0 ? (
                <div className="vf-files-section">
                  <label>Files Submitted ({viewFilesModal.files.length})</label>
                  <div className="prm-file-list">
                    {viewFilesModal.files.map((f, i) => (
                      <div key={i} className="prm-file-chip">
                        <FileText size={12} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p style={{color:'#6b7280', fontSize:'0.85rem', textAlign:'center', padding:'1rem 0'}}>No files attached.</p>
              )}
              <div className="pay-req-modal-actions">
                <button className="btn-cancel" onClick={() => setViewFilesModal(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         CLIENT — REJECTION REASON MODAL
         ========================================== */}
      {rejectModal && (
        <div className="payment-gateway-modal-overlay" onClick={(e) => e.target === e.currentTarget && !rejectSubmitting && setRejectModal(null)}>
          <div className="pay-req-modal">
            <div className="pay-req-modal-header" style={{background: 'linear-gradient(135deg,#7f1d1d,#991b1b)'}}>
              <div className="pay-req-modal-brand">
                <div className="pay-req-brand-icon" style={{background:'rgba(239,68,68,0.3)'}}><X size={20} /></div>
                <div>
                  <h2>Reject Payment Request</h2>
                  <p>{rejectModal.name} — ₹{rejectModal.amount.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setRejectModal(null)} disabled={rejectSubmitting}><X size={18} /></button>
            </div>
            <div className="pay-req-modal-body">
              <div className="pay-req-field">
                <label>Reason for Rejection <span className="req-star">*</span></label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why you are rejecting this payment request. The architect will be notified to resubmit."
                  className="prm-textarea"
                />
              </div>
              <div className="reject-notice">
                ⚠️ The milestone status will return to <strong>Pending</strong> and the architect can resubmit a new request.
              </div>
              <div className="pay-req-modal-actions">
                <button className="btn-cancel" onClick={() => setRejectModal(null)} disabled={rejectSubmitting}>Cancel</button>
                <button
                  className="btn-reject-confirm"
                  onClick={handleSubmitRejection}
                  disabled={rejectSubmitting || !rejectReason.trim()}
                >
                  {rejectSubmitting ? <><RefreshCw size={14} className="spin" /> Submitting...</> : <><X size={14} /> Confirm Rejection</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
         PAYMENT SECURE CHECKOUT GATEWAY MODAL
         ========================================== */}
      {activePaymentModalMilestone && (
        <div className="payment-gateway-modal-overlay">
          <div className="payment-gateway-modal">
            
            <div className="modal-header">
              <div className="brand">
                <ShieldCheck size={24} className="accent-color" />
                <span>AllverHQ Secure Checkout</span>
              </div>
              <button 
                className="close-btn"
                onClick={() => setActivePaymentModalMilestone(null)}
                disabled={paymentProcessing}
              >
                &times;
              </button>
            </div>

            {paymentSuccessMsg ? (
              <div className="modal-success-screen">
                <div className="success-icon"><Check size={36} /></div>
                <h2>Payment Successful!</h2>
                <p className="desc">
                  We have successfully processed the payment of <strong>₹{activePaymentModalMilestone.amount.toLocaleString('en-IN')}</strong> for <strong>{activePaymentModalMilestone.name}</strong>.
                </p>
                <span className="note">Updating balance sheet...</span>
              </div>
            ) : (
              <div className="modal-form-screen">
                <div className="summary-banner">
                  <div className="lbl font-bold">Paying Milestone</div>
                  <div className="title font-bold">{activePaymentModalMilestone.name}</div>
                  <div className="price font-bold">₹{activePaymentModalMilestone.amount.toLocaleString('en-IN')}</div>
                </div>

                <div className="card-entry-form">
                  <div className="form-row">
                    <label>Cardholder Name</label>
                    <input type="text" defaultValue="Raj Kumar" placeholder="Name on card" />
                  </div>

                  <div className="form-row">
                    <label>Card Number</label>
                    <div className="input-icon-wrap">
                      <CreditCard size={16} className="inp-ico" />
                      <input type="text" defaultValue="4320 8872 1092 3445" placeholder="0000 0000 0000 0000" />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-row">
                      <label>Expiry Date</label>
                      <input type="text" defaultValue="12/28" placeholder="MM/YY" />
                    </div>
                    <div className="form-row">
                      <label>CVV / CVC</label>
                      <input type="password" defaultValue="332" placeholder="***" />
                    </div>
                  </div>

                  <div className="security-notice">
                    <ShieldCheck size={14} />
                    <span>AES-256 Bit Encryption Protected SSL Gateway</span>
                  </div>

                  <button 
                    className="btn-modal-checkout-submit"
                    disabled={paymentProcessing}
                    onClick={handleProcessPayment}
                  >
                    {paymentProcessing ? (
                      <>
                        <RefreshCw size={16} className="spin" />
                        <span>Verifying Card Details...</span>
                      </>
                    ) : (
                      <span>Authorise Secure Payment</span>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default ProjectDetailsPage;
