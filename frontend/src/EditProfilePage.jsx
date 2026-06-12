import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, Save, X, Plus, User, Building2,
  Briefcase, MapPin, Phone, MessageCircle, FileText,
  Star, Award, Globe, CheckCircle2, Upload, Loader2,
  Edit3, Image
} from 'lucide-react';
import DashboardLayout from './DashboardLayout';

const COUNTRY_LIST = ['India', 'United States', 'United Kingdom', 'UAE', 'Canada', 'Australia', 'Singapore'];

const INDIA_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh'
];

const EXPERIENCE_OPTIONS = [
  'Less than 1 year', '1–3 years', '3–5 years', '5–8 years',
  '8–10 years', '10–15 years', '15+ years'
];

const ARCHITECT_SPECS = [
  'Residential Design', 'Commercial Design', 'Interior Design', 'Urban Planning',
  'Landscape Architecture', 'Sustainable Design', '3D Visualization', 'Renovation',
  'Vastu Planning', 'Smart Homes', 'Heritage Restoration', 'Luxury Residential'
];

const CONTRACTOR_CATS = [
  'Building Construction', 'Renovation', 'Civil Work', 'Electrical',
  'Plumbing', 'Flooring', 'Roofing', 'Painting', 'Steel Structure',
  'Prefabrication', 'Waterproofing', 'Interior Fit-Out'
];

const LABOUR_SKILLS = [
  'Mason / Bricklayer', 'Carpenter', 'Electrician', 'Plumber',
  'Painter', 'Welder', 'Steel Fixer', 'Tiler', 'General Helper',
  'Scaffolder', 'Plasterer', 'Waterproof Worker'
];

const EditProfilePage = () => {
  const navigate = useNavigate();
  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({ cover: false, avatar: false });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Form fields
  const [form, setForm] = useState({
    fullName: '',
    firmName: '',
    about: '',
    experience: '',
    phone: '',
    whatsappNumber: '',
    country: 'India',
    state: '',
    city: '',
    area: '',
    profilePhoto: '',
    coverPhoto: '',
    // role-specific
    specialization: [],
    workCategory: [],
    skillType: [],
    projectType: '',
    contractorType: '',
    availability: 'Available',
  });

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) { navigate('/login'); return; }
    const user = JSON.parse(userStr);
    setCurrentUser(user);
    setForm(prev => ({
      ...prev,
      fullName: user.fullName || '',
      firmName: user.firmName || '',
      about: user.about || user.shortDesc || '',
      experience: user.experience || '',
      phone: user.phoneNumber || user.phone || '',
      whatsappNumber: user.whatsappNumber || '',
      city: user.city || '',
      area: user.area || '',
      state: user.state || '',
      country: user.country || 'India',
      profilePhoto: user.avatarUrl || '',
      coverPhoto: user.cover || '',
      specialization: user.specialization || [],
      workCategory: user.workCategory || [],
      skillType: user.skillType ? [user.skillType] : [],
      projectType: user.projectType || '',
      contractorType: user.contractorType || '',
      availability: user.availability || 'Available',
    }));
  }, [navigate]);

  const roleName = currentUser?.role || 'Architect';
  const accentColor =
    roleName === 'Architect' ? '#10b981'
    : roleName === 'Contractor' ? '#3b82f6'
    : roleName === 'Labour' ? '#f59e0b'
    : '#8b5cf6';

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ─── Tag helpers ────────────────────────────────────────────────────────────
  const getTagField = () => {
    if (roleName === 'Architect') return 'specialization';
    if (roleName === 'Contractor') return 'workCategory';
    if (roleName === 'Labour') return 'skillType';
    return null;
  };

  const getTags = () => {
    const field = getTagField();
    return field ? form[field] : [];
  };

  const addTag = (tag) => {
    const field = getTagField();
    if (!field) return;
    const trimmed = tag.trim();
    if (!trimmed || form[field].includes(trimmed)) return;
    handleChange(field, [...form[field], trimmed]);
  };

  const removeTag = (tag) => {
    const field = getTagField();
    if (!field) return;
    handleChange(field, form[field].filter(t => t !== tag));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  };

  // ─── Photo upload ────────────────────────────────────────────────────────────
  const uploadPhoto = async (file, type) => {
    setUploading(prev => ({ ...prev, [type]: true }));
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch('https://allver.onrender.com/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        handleChange(type === 'cover' ? 'coverPhoto' : 'profilePhoto', data.url);
      } else {
        setError('Image upload failed. Please try again.');
      }
    } catch {
      setError('Could not connect to upload server.');
    } finally {
      setUploading(prev => ({ ...prev, [type]: false }));
    }
  };

  // ─── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.fullName.trim()) { setError('Full name is required.'); return; }
    setError('');
    setLoading(true);

    const payload = {
      fullName: form.fullName,
      firmName: form.firmName,
      about: form.about,
      shortDesc: form.about,
      experience: form.experience,
      phoneNumber: form.phone,
      phone: form.phone,
      whatsappNumber: form.whatsappNumber,
      country: form.country,
      state: form.state,
      city: form.city,
      area: form.area,
      avatarUrl: form.profilePhoto,
      cover: form.coverPhoto,
      specialization: form.specialization,
      workCategory: form.workCategory,
      skillType: form.skillType.length > 0 ? form.skillType[0] : '',
      projectType: form.projectType,
      contractorType: form.contractorType,
      availability: form.availability,
    };

    try {
      const res = await fetch(`https://allver.onrender.com/api/user/profile/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...currentUser, ...payload, ...data.user };
        localStorage.setItem('currentUser', JSON.stringify(updated));
        setSaved(true);
        setTimeout(() => { setSaved(false); navigate('/profile'); }, 1500);
      } else {
        setError(data.message || 'Failed to save changes.');
      }
    } catch {
      setError('Server connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  const initials = (form.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const suggestedTags =
    roleName === 'Architect' ? ARCHITECT_SPECS
    : roleName === 'Contractor' ? CONTRACTOR_CATS
    : LABOUR_SKILLS;

  const currentTags = getTags();

  return (
    <DashboardLayout
      pageTitle="Edit Profile"
      pageSubtitle="Update your professional information"
      accentColor={accentColor}
    >
      <div className="ep-page">
        {/* ── Top Nav ── */}
        <div className="ep-top-bar">
          <button className="ep-back-btn" onClick={() => navigate('/profile')}>
            <ArrowLeft size={18} /> Back to Profile
          </button>
          <div className="ep-save-area">
            {error && <span className="ep-error-inline">{error}</span>}
            <button
              className="ep-save-btn"
              style={{ background: accentColor }}
              onClick={handleSave}
              disabled={loading || saved}
            >
              {loading ? <Loader2 size={16} className="ep-spin" /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
              <span>{loading ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        <div className="ep-body">
          {/* ─── LEFT COLUMN ─── */}
          <div className="ep-left">

            {/* Cover Photo */}
            <div className="ep-section-card">
              <div className="ep-section-label">
                <Image size={16} /> Cover Photo
              </div>
              <div className="ep-cover-picker">
                <div
                  className="ep-cover-preview"
                  style={{
                    backgroundImage: form.coverPhoto
                      ? `url(${form.coverPhoto})`
                      : 'linear-gradient(135deg, #1e293b, #334155)'
                  }}
                >
                  <div className="ep-cover-overlay-dark" />
                  <button
                    className="ep-photo-upload-btn"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={uploading.cover}
                  >
                    {uploading.cover ? <Loader2 size={18} className="ep-spin" /> : <Camera size={18} />}
                    <span>{uploading.cover ? 'Uploading…' : 'Change Cover'}</span>
                  </button>
                  {form.coverPhoto && (
                    <button className="ep-cover-clear" onClick={() => handleChange('coverPhoto', '')}>
                      <X size={14} />
                    </button>
                  )}
                </div>
                <input
                  type="file" accept="image/*" ref={coverInputRef} style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0], 'cover')}
                />
              </div>
            </div>

            {/* Profile Photo */}
            <div className="ep-section-card">
              <div className="ep-section-label">
                <User size={16} /> Profile Photo
              </div>
              <div className="ep-avatar-picker">
                <div
                  className="ep-avatar-preview"
                  style={{ backgroundColor: form.profilePhoto ? 'transparent' : accentColor }}
                >
                  {form.profilePhoto
                    ? <img src={form.profilePhoto} alt="Avatar" className="ep-avatar-img" />
                    : <span className="ep-avatar-initials">{initials}</span>
                  }
                  <button
                    className="ep-avatar-upload-btn"
                    style={{ background: accentColor }}
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploading.avatar}
                  >
                    {uploading.avatar ? <Loader2 size={14} className="ep-spin" /> : <Camera size={14} />}
                  </button>
                </div>
                <div className="ep-avatar-meta">
                  <p className="ep-avatar-name">{form.fullName || 'Your Name'}</p>
                  <p className="ep-avatar-role">{roleName} · {form.city || 'Location'}</p>
                  <button className="ep-upload-text-btn" onClick={() => avatarInputRef.current?.click()}>
                    <Upload size={13} /> Upload Photo
                  </button>
                  {form.profilePhoto && (
                    <button className="ep-upload-text-btn remove" onClick={() => handleChange('profilePhoto', '')}>
                      <X size={13} /> Remove
                    </button>
                  )}
                </div>
                <input
                  type="file" accept="image/*" ref={avatarInputRef} style={{ display: 'none' }}
                  onChange={e => e.target.files[0] && uploadPhoto(e.target.files[0], 'avatar')}
                />
              </div>
            </div>

            {/* About */}
            <div className="ep-section-card">
              <div className="ep-section-label">
                <FileText size={16} /> About / Bio
              </div>
              <textarea
                className="ep-textarea"
                placeholder="Write a short professional bio about yourself or your firm…"
                value={form.about}
                onChange={e => handleChange('about', e.target.value)}
                rows={5}
                style={{ '--focus-color': accentColor }}
              />
              <p className="ep-hint">{form.about.length} / 500 characters</p>
            </div>

          </div>

          {/* ─── RIGHT COLUMN ─── */}
          <div className="ep-right">

            {/* Basic Info */}
            <div className="ep-section-card">
              <div className="ep-section-label"><Edit3 size={16} /> Basic Information</div>
              <div className="ep-fields-grid">

                <div className="ep-field ep-field-full">
                  <label><User size={14} /> Full Name <span className="ep-req">*</span></label>
                  <input
                    className="ep-input"
                    style={{ '--focus-color': accentColor }}
                    type="text"
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChange={e => handleChange('fullName', e.target.value)}
                  />
                </div>

                {(roleName === 'Architect' || roleName === 'Contractor') && (
                  <div className="ep-field ep-field-full">
                    <label><Building2 size={14} /> Company / Firm Name</label>
                    <input
                      className="ep-input"
                      style={{ '--focus-color': accentColor }}
                      type="text"
                      placeholder={roleName === 'Architect' ? 'e.g. Sharma Architects & Associates' : 'e.g. ABC Constructions Pvt Ltd'}
                      value={form.firmName}
                      onChange={e => handleChange('firmName', e.target.value)}
                    />
                  </div>
                )}

                <div className="ep-field">
                  <label><Briefcase size={14} /> Profession / Role</label>
                  <div className="ep-readonly-badge" style={{ color: accentColor, borderColor: accentColor + '44', background: accentColor + '11' }}>
                    {roleName}
                  </div>
                </div>

                {roleName !== 'Client' && (
                  <div className="ep-field">
                    <label><Star size={14} /> Experience</label>
                    <select
                      className="ep-input ep-select"
                      style={{ '--focus-color': accentColor }}
                      value={form.experience}
                      onChange={e => handleChange('experience', e.target.value)}
                    >
                      <option value="">Select experience</option>
                      {EXPERIENCE_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                )}

                {roleName === 'Contractor' && (
                  <div className="ep-field">
                    <label><Award size={14} /> Contractor Type</label>
                    <select
                      className="ep-input ep-select"
                      style={{ '--focus-color': accentColor }}
                      value={form.contractorType}
                      onChange={e => handleChange('contractorType', e.target.value)}
                    >
                      <option value="">Select type</option>
                      <option value="General Contractor">General Contractor</option>
                      <option value="Civil Contractor">Civil Contractor</option>
                      <option value="Electrical Contractor">Electrical Contractor</option>
                      <option value="Plumbing Contractor">Plumbing Contractor</option>
                      <option value="Interior Contractor">Interior Contractor</option>
                      <option value="Landscape Contractor">Landscape Contractor</option>
                    </select>
                  </div>
                )}

                {roleName === 'Labour' && (
                  <div className="ep-field">
                    <label><CheckCircle2 size={14} /> Availability Status</label>
                    <div className="ep-avail-toggle">
                      {['Available', 'Not Available'].map(opt => (
                        <button
                          key={opt}
                          className={`ep-avail-btn ${form.availability === opt ? 'active' : ''}`}
                          style={form.availability === opt ? { background: accentColor, borderColor: accentColor } : {}}
                          onClick={() => handleChange('availability', opt)}
                          type="button"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {roleName === 'Client' && (
                  <div className="ep-field ep-field-full">
                    <label><Briefcase size={14} /> Project Type</label>
                    <select
                      className="ep-input ep-select"
                      style={{ '--focus-color': accentColor }}
                      value={form.projectType}
                      onChange={e => handleChange('projectType', e.target.value)}
                    >
                      <option value="">Select project type</option>
                      <option value="Residential Construction">Residential Construction</option>
                      <option value="Commercial Construction">Commercial Construction</option>
                      <option value="Interior Design">Interior Design</option>
                      <option value="Renovation">Renovation</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Landscaping">Landscaping</option>
                    </select>
                  </div>
                )}

              </div>
            </div>

            {/* Skills / Specializations */}
            {roleName !== 'Client' && (
              <div className="ep-section-card">
                <div className="ep-section-label">
                  <Award size={16} />
                  {roleName === 'Architect' ? 'Specializations' : roleName === 'Contractor' ? 'Work Categories' : 'Skills'}
                </div>

                {/* Current Tags */}
                <div className="ep-tags-display">
                  {currentTags.map(tag => (
                    <span key={tag} className="ep-tag" style={{ background: accentColor + '18', color: accentColor, borderColor: accentColor + '44' }}>
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ep-tag-remove">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {currentTags.length === 0 && (
                    <span className="ep-tags-empty">No {roleName === 'Architect' ? 'specializations' : roleName === 'Contractor' ? 'categories' : 'skills'} added yet</span>
                  )}
                </div>

                {/* Custom input */}
                <div className="ep-tag-input-row">
                  <div className="ep-tag-input-wrap">
                    <Plus size={14} className="ep-tag-plus" />
                    <input
                      className="ep-tag-input"
                      style={{ '--focus-color': accentColor }}
                      type="text"
                      placeholder="Type & press Enter to add…"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                    />
                    {tagInput && (
                      <button className="ep-tag-add-btn" style={{ background: accentColor }} onClick={() => { addTag(tagInput); setTagInput(''); }}>
                        Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Suggested chips */}
                <p className="ep-hint" style={{ marginBottom: '0.5rem' }}>Quick add suggestions:</p>
                <div className="ep-suggestions">
                  {suggestedTags.filter(t => !currentTags.includes(t)).slice(0, 8).map(tag => (
                    <button
                      key={tag}
                      className="ep-suggestion-chip"
                      onClick={() => addTag(tag)}
                    >
                      <Plus size={11} /> {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Location */}
            <div className="ep-section-card">
              <div className="ep-section-label"><MapPin size={16} /> Location</div>
              <div className="ep-fields-grid">

                <div className="ep-field">
                  <label><Globe size={14} /> Country</label>
                  <select
                    className="ep-input ep-select"
                    style={{ '--focus-color': accentColor }}
                    value={form.country}
                    onChange={e => handleChange('country', e.target.value)}
                  >
                    {COUNTRY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="ep-field">
                  <label><MapPin size={14} /> State / Province</label>
                  {form.country === 'India' ? (
                    <select
                      className="ep-input ep-select"
                      style={{ '--focus-color': accentColor }}
                      value={form.state}
                      onChange={e => handleChange('state', e.target.value)}
                    >
                      <option value="">Select state</option>
                      {INDIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      className="ep-input"
                      style={{ '--focus-color': accentColor }}
                      type="text"
                      placeholder="State / Province"
                      value={form.state}
                      onChange={e => handleChange('state', e.target.value)}
                    />
                  )}
                </div>

                <div className="ep-field">
                  <label><MapPin size={14} /> City</label>
                  <input
                    className="ep-input"
                    style={{ '--focus-color': accentColor }}
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={form.city}
                    onChange={e => handleChange('city', e.target.value)}
                  />
                </div>

                <div className="ep-field">
                  <label><MapPin size={14} /> Area / Locality</label>
                  <input
                    className="ep-input"
                    style={{ '--focus-color': accentColor }}
                    type="text"
                    placeholder="e.g. Bandra West"
                    value={form.area}
                    onChange={e => handleChange('area', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="ep-section-card">
              <div className="ep-section-label"><Phone size={16} /> Contact Details</div>
              <div className="ep-fields-grid">

                <div className="ep-field">
                  <label><Phone size={14} /> Phone Number</label>
                  <div className="ep-tel-row">
                    <span className="ep-dial-prefix">+91</span>
                    <input
                      className="ep-input ep-tel-input"
                      style={{ '--focus-color': accentColor }}
                      type="tel"
                      placeholder="98765 43210"
                      value={form.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                    />
                  </div>
                </div>

                <div className="ep-field">
                  <label><MessageCircle size={14} /> WhatsApp Number</label>
                  <div className="ep-tel-row">
                    <span className="ep-dial-prefix" style={{ color: '#25D366' }}>
                      <MessageCircle size={14} />
                    </span>
                    <input
                      className="ep-input ep-tel-input"
                      style={{ '--focus-color': accentColor }}
                      type="tel"
                      placeholder="Same or different from phone"
                      value={form.whatsappNumber}
                      onChange={e => handleChange('whatsappNumber', e.target.value)}
                    />
                  </div>
                  <p className="ep-hint">This will appear on your public profile for client contact.</p>
                </div>

              </div>
            </div>

            {/* Bottom Save */}
            <div className="ep-bottom-actions">
              <button className="ep-cancel-btn" onClick={() => navigate('/profile')}>
                Cancel
              </button>
              <button
                className="ep-save-btn ep-save-btn-large"
                style={{ background: accentColor }}
                onClick={handleSave}
                disabled={loading || saved}
              >
                {loading ? <Loader2 size={18} className="ep-spin" /> : saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                <span>{loading ? 'Saving Changes…' : saved ? 'Profile Saved!' : 'Save Profile'}</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditProfilePage;
