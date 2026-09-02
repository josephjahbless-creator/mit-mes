import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon, TicketIcon, ShieldCheckIcon, CheckCircleIcon, UserIcon } from '@heroicons/react/24/outline';
import { authApi, helpdeskApi, twoFactorApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const SLIDES = [
  // ── Tourism ──────────────────────────────────────────────────────────────────
  {
    url: '/slideshow/slide1.jpg',
    label: 'TOURISM',
    caption: 'Zanzibar Beach, Zanzibar Archipelago',
    detail: 'Crystal-clear turquoise waters · Tanzania\'s premier island paradise destination',
  },
  {
    url: '/slideshow/slide2.jpg',
    label: 'TOURISM',
    caption: 'Mount Kilimanjaro, Kilimanjaro Region',
    detail: 'Africa\'s highest peak (5,895 m) · UNESCO World Heritage Site · Viewed from Amboseli plains',
  },
  {
    url: '/slideshow/slide3.jpg',
    label: 'TOURISM',
    caption: 'Serengeti National Park, The Great Migration',
    detail: 'Over 1.5 million wildebeest and zebras · World\'s greatest wildlife spectacle',
  },
  {
    url: '/slideshow/slide4.jpg',
    label: 'TOURISM',
    caption: 'Ngorongoro Conservation Area, Lake Magadi',
    detail: 'Zebras and flamingos at the crater floor · UNESCO World Heritage Site, Arusha Region',
  },
  {
    url: '/slideshow/slide5.jpg',
    label: 'TOURISM',
    caption: 'Nakupenda Sandbar, Zanzibar Archipelago',
    detail: 'Aerial view of the "I Love You" sandbar · One of Zanzibar\'s iconic natural attractions',
  },
  {
    url: '/slideshow/slide6.jpg',
    label: 'TOURISM',
    caption: 'Ngorongoro Crater, Aerial View',
    detail: 'World\'s largest intact volcanic caldera · 8,300 km² Conservation Area, Arusha Region',
  },
  {
    url: '/slideshow/slide7.jpg',
    label: 'TOURISM',
    caption: 'Tarangire National Park, Elephant Herd',
    detail: 'Home to Africa\'s largest elephant population · Manyara Region, Northern Tanzania',
  },
  {
    url: '/slideshow/slide8.jpg',
    label: 'TOURISM',
    caption: 'Serengeti National Park, Zebras at Sunset',
    detail: 'Golden savannah of the Serengeti · Over 200,000 zebras call this park home',
  },
  {
    url: '/slideshow/slide9.jpg',
    label: 'TOURISM',
    caption: 'Ngorongoro Conservation Area, African Lion',
    detail: 'Highest density of lions in Africa · The crater shelters the iconic Big Five',
  },
  {
    url: '/slideshow/slide10.jpg',
    label: 'TOURISM',
    caption: 'Zanzibar, Luxury Overwater Resort',
    detail: 'World-class beach resorts · Tanzania\'s tourism sector generates over USD 2.6 billion annually',
  },
  {
    url: '/slideshow/slide11.jpg',
    label: 'TOURISM',
    caption: 'Lake Victoria, Mwanza Region',
    detail: 'Africa\'s largest lake · Shared by Tanzania, Uganda & Kenya · Vital fishing & trade hub',
  },
  {
    url: '/slideshow/slide12.jpg',
    label: 'TOURISM',
    caption: 'Bismarck Rock, Mwanza, Lake Victoria',
    detail: 'Iconic granite rock formation on Lake Victoria · Gateway to Tanzania\'s lake zone region',
  },
  {
    url: '/slideshow/slide13.jpg',
    label: 'TOURISM',
    caption: 'Ruaha National Park, Forest Elephants',
    detail: 'Tanzania\'s largest national park · Iringa Region · Over 12,000 elephants',
  },
  {
    url: '/slideshow/slide14.jpg',
    label: 'TOURISM',
    caption: 'Serengeti National Park, Safari Game Drive',
    detail: 'Year-round wildlife viewing · UNESCO World Heritage Site · Mara & Simiyu Regions',
  },
  // ── Industry ─────────────────────────────────────────────────────────────────
  {
    url: '/slideshow/slide15.jpg',
    label: 'INDUSTRY',
    caption: 'Tanzanite Bridge, Dar es Salaam',
    detail: 'Modern infrastructure milestone · Connecting Dar es Salaam across the Msimbazi Creek',
  },
  {
    url: '/slideshow/slide16.jpg',
    label: 'INDUSTRY',
    caption: 'Julius Nyerere Bridge (Kigamboni), Dar es Salaam',
    detail: 'East Africa\'s longest cable-stayed bridge · 680 m span · Opened 2016',
  },
  {
    url: '/slideshow/slide17.jpg',
    label: 'INDUSTRY',
    caption: 'Cement Manufacturing Industry, Tanzania',
    detail: 'Tanzania\'s cement sector produces over 10 million tonnes annually · Key construction driver',
  },
  {
    url: '/slideshow/slide18.jpg',
    label: 'INDUSTRY',
    caption: 'Textile & Garment Manufacturing, Tanzania',
    detail: 'Tanzania\'s textile industry employs thousands · Export Processing Zones driving growth',
  },
  {
    url: '/slideshow/slide19.jpg',
    label: 'INDUSTRY',
    caption: 'Grain Processing & Agro-Industry, Tanzania',
    detail: 'Tanzania\'s agro-processing sector · supporting food security and industrial growth',
  },
];

/**
 * The national flag of Tanzania, drawn as geometry so it scales to any panel
 * shape: green upper hoist, blue lower fly, and a black diagonal band edged in
 * gold running from the lower hoist to the upper fly. Stretched to fill, since
 * it is decorative backdrop rather than a formal rendition of the flag.
 */
function TanzaniaFlagBackdrop() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 900 600"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect width="900" height="600" fill="#1EB53A" />
      <polygon points="900,0 900,600 0,600" fill="#00A3DD" />
      <polygon points="0,510 900,-90 900,90 0,690" fill="#FCD116" />
      <polygon points="0,540 900,-60 900,60 0,660" fill="#000000" />
    </svg>
  );
}

function BackgroundSlideshow({ overlayClass = 'bg-black/55', underlay = null, slideOpacity = 1, emblem = null }) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const intervalRef = useRef(null);

  // Advance to a specific slide index with fade transition
  const goTo = useCallback((index) => {
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(index);
      setTransitioning(false);
    }, 600);
  }, []);

  // Start (or restart) the 30-second auto-advance timer
  const startTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrent(c => {
        const next = (c + 1) % SLIDES.length;
        setTransitioning(true);
        setTimeout(() => setTransitioning(false), 600);
        return next;
      });
    }, 30000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => clearInterval(intervalRef.current);
  }, [startTimer]);

  const handlePrev = () => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length);
    startTimer(); // reset timer on manual nav
  };

  const handleNext = () => {
    goTo((current + 1) % SLIDES.length);
    startTimer();
  };

  const slide = SLIDES[current];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Optional backdrop painted behind the photographs (e.g. the flag) */}
      {underlay}

      {/* Slides: render all, only current is visible */}
      {SLIDES.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
          style={{
            backgroundImage: `url(${s.url})`,
            opacity: i === current && !transitioning ? slideOpacity : 0,
            zIndex: i === current ? 1 : 0,
          }}
        />
      ))}

      {/* Tint overlay — kept light on the split layout so the photo stays vivid */}
      <div className={`absolute inset-0 ${overlayClass}`} style={{ zIndex: 2 }} />

      {/* Emblem / wordmark layer — above the imagery, below the controls */}
      {emblem}

      {/* ── Left arrow ── */}
      <button
        onClick={handlePrev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 group"
        style={{
          zIndex: 10,
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.25)',
          backdropFilter: 'blur(4px)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* ── Right arrow ── */}
      <button
        onClick={handleNext}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200"
        style={{
          zIndex: 10,
          background: 'rgba(0,0,0,0.35)',
          border: '1px solid rgba(255,255,255,0.25)',
          backdropFilter: 'blur(4px)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.35)'}
      >
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      {/* Caption bar */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-opacity duration-700"
        style={{ opacity: transitioning ? 0 : 1, zIndex: 10 }}
      >
        <div className="px-6 py-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, transparent 100%)' }}>
          <div className="max-w-4xl mx-auto flex items-end justify-between gap-4">
            <div>
              <span className={`inline-block text-xs font-bold tracking-widest px-2 py-0.5 rounded mb-1 ${
                slide.label === 'INDUSTRY' ? 'bg-mit-gold/90 text-white' : 'bg-green-600/90 text-white'
              }`}>
                {slide.label}
              </span>
              <p className="text-white font-semibold text-base leading-tight drop-shadow-md">
                {slide.caption}
              </p>
              <p className="text-white/70 text-xs mt-0.5 drop-shadow">
                {slide.detail}
              </p>
            </div>
            {/* Dot indicators */}
            <div className="flex gap-1.5 flex-shrink-0 pb-1">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { goTo(i); startTimer(); }}
                  className="rounded-full transition-all duration-500 focus:outline-none"
                  style={{
                    width: i === current ? '20px' : '7px',
                    height: '7px',
                    background: i === current ? 'white' : 'rgba(255,255,255,0.4)',
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordModal({ onClose }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  async function onSubmit({ email }) {
    try {
      await authApi.forgotPassword(email);
    } catch {}
    // Always show success to prevent user enumeration
    toast.success('If that email is registered, a reset link has been sent.');
    onClose();
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Reset Password</h3>
        <p className="text-sm text-gray-500 mb-4">Enter your registered email address and we will send you a password reset link.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              className="input"
              placeholder="your.email@mit.go.tz"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
            <button type="submit" className="flex-1 btn-primary justify-center" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RequestAccountModal({ onClose }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { role: 'data_collector' },
  });
  const [submitted, setSubmitted] = useState(false);

  async function onSubmit(data) {
    try {
      await authApi.requestAccount(data);
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request. Please try again.');
    }
  }

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircleIcon className="w-14 h-14 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Submitted!</h3>
          <p className="text-sm text-gray-500 mb-6">
            Your account request has been sent to the system administrators. You will be contacted once your request has been reviewed.
          </p>
          <button onClick={onClose} className="btn-primary w-full justify-center">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Request Account</h3>
            <p className="text-xs text-gray-500 mt-0.5">An administrator will review and create your account.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Full Name *</label>
            <input
              type="text"
              className="input"
              placeholder="Your full name"
              {...register('name', { required: 'Full name is required' })}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Work Email *</label>
            <input
              type="email"
              className="input"
              placeholder="your.email@institution.go.tz"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Institution / Department *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. BRELA, SIDO, TBS, MIT-HQ..."
              {...register('institution', { required: 'Institution is required' })}
            />
            {errors.institution && <p className="text-red-500 text-xs mt-1">{errors.institution.message}</p>}
          </div>
          <div>
            <label className="label">Role Requested *</label>
            <select className="input" {...register('role', { required: true })}>
              <option value="data_collector">Data Collector</option>
              <option value="viewer">Viewer (Read-only)</option>
              <option value="me_officer">M&amp;E Officer</option>
            </select>
          </div>
          <div>
            <label className="label">Reason / Justification</label>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Briefly explain why you need access..."
              {...register('reason')}
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
            <button type="submit" className="flex-1 btn-primary justify-center" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Quick FAQs shown in support modal ────────────────────────────────────────
const QUICK_FAQS = [
  { q: "I can't log in: what should I do?", a: "Check your email and password. If you've forgotten your password use 'Forgot password?' on the login form. If your account is locked after failed attempts, wait 5 minutes or contact your institution admin." },
  { q: "How do I request a new account?", a: "Click 'Request an account' on the login page and fill in your details. A system administrator will review your request and contact you." },
  { q: "Why can't I submit data for an indicator?", a: "The reporting period may be locked, you may not have the Data Collector role, or you may not be assigned to that indicator's institution. Contact your M&E Officer." },
  { q: "How is achievement % calculated?", a: "Achievement % = (Actual Value ÷ Target Value) × 100. The system calculates this automatically based on the indicator type." },
  { q: "Can I edit a submission after approval?", a: "No. Approved submissions are locked to preserve the audit trail. Contact your M&E Officer to reject and resubmit if a correction is needed." },
];

function FaqRow({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-800 hover:bg-gray-50">
        <span>{q}</span>
        {open ? <ChevronUpIcon className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
               : <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />}
      </button>
      {open && <div className="px-4 py-3 border-t border-gray-100 text-sm text-gray-600 bg-gray-50">{a}</div>}
    </div>
  );
}

function SupportModal({ onClose }) {
  const [tab, setTab] = useState('faq');
  const [form, setForm] = useState({ name: '', email: '', subject: '', description: '', category: 'general' });
  const [sending, setSending] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.description.trim()) {
      toast.error('Please fill in all fields'); return;
    }
    setSending(true);
    try {
      const res = await helpdeskApi.createTicket({
        subject: form.subject, description: form.description,
        category: form.category, guestName: form.name, guestEmail: form.email,
      });
      toast.success(`Ticket ${res.data.ticketNo} submitted! We'll follow up via email.`);
      onClose();
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">Help & Support</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {[['faq', 'Frequently Asked'], ['ticket', 'Submit a Request']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${tab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {tab === 'faq' ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-4">Common questions about the MIT M&amp;E System</p>
              {QUICK_FAQS.map((f, i) => <FaqRow key={i} {...f} />)}
              <p className="text-xs text-gray-400 pt-2 text-center">
                Can't find your answer?{' '}
                <button onClick={() => setTab('ticket')} className="text-blue-600 font-medium hover:underline">Submit a request →</button>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-xs text-gray-500">We'll respond to your email within 1 business day.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Your Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    placeholder="Full name"
                    className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-300 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Email Address *</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    placeholder="your@email.com"
                    className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-300 outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Category</label>
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5">
                  {['general','access','data-entry','indicator','budget','report','technical','other'].map(c => (
                    <option key={c} value={c} className="capitalize">{c.replace('-', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Subject *</label>
                <input value={form.subject} onChange={e => set('subject', e.target.value)}
                  placeholder="Brief description of your issue"
                  className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-300 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Description *</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Describe your issue in detail…" rows={4}
                  className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-300 outline-none resize-none" />
              </div>
              <button type="submit" disabled={sending}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {sending ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 2FA Challenge Step ────────────────────────────────────────────────────────
function TwoFAStep({ userId, onSuccess, onBack }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (code.length !== 6) { toast.error('Enter the 6-digit code from your authenticator app'); return; }
    setLoading(true);
    try {
      const { data } = await twoFactorApi.challenge({ userId, token: code });
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
      toast.success(`Welcome, ${data.user.name}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid verification code');
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Two-Factor Authentication</h2>
          <p className="text-xs text-gray-500">Enter the 6-digit code from your authenticator app</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Verification Code</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]*"
            className="input text-center text-2xl tracking-widest font-mono"
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary w-full justify-center" disabled={loading || code.length !== 6}>
          {loading ? 'Verifying...' : 'Verify & Sign In'}
        </button>
        <button type="button" onClick={onBack} className="w-full text-center text-sm text-gray-500 hover:text-gray-700">
          ← Back to login
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();
  const [showForgot, setShowForgot] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState(false);
  const [pendingUserId, setPendingUserId] = useState(null);

  async function onSubmit({ email, password }) {
    try {
      const { data } = await authApi.login({ email, password });
      if (data.requiresTwoFactor) {
        setPendingUserId(data.userId);
        setTwoFaStep(true);
        return;
      }
      setAuth(data.user, data.accessToken, data.refreshToken);
      navigate('/dashboard');
      toast.success(`Welcome, ${data.user.name}`);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.error || 'Login failed';
      if (status === 423) {
        toast.error(message, { duration: 6000, icon: '🔒' });
      } else {
        toast.error(message);
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {showForgot    && <ForgotPasswordModal  onClose={() => setShowForgot(false)} />}
      {showRegister  && <RequestAccountModal  onClose={() => setShowRegister(false)} />}
      {showSupport   && <SupportModal         onClose={() => setShowSupport(false)} />}

      {/* ── Left: sign-in panel ─────────────────────────────────────────── */}
      <div className="flex w-full flex-col justify-center overflow-y-auto px-6 py-10 sm:px-12 lg:w-[38%] lg:min-w-[430px] lg:max-w-[560px]">
        <div className="mx-auto w-full max-w-sm">

          {/* Emblem badge */}
          <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full"
               style={{ background: '#EDF2F7' }}>
            <img
              src="/tanzania-emblem.svg"
              alt="Tanzania National Emblem"
              className="h-24 w-24 object-contain"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          </div>

          {/* Wordmark */}
          <p className="text-center text-xl font-normal leading-snug text-gray-500">
            The United Republic of<br />Tanzania
          </p>
          <p className="mt-1 text-center text-sm text-gray-400">
            Ministry of Industry &amp; Trade
          </p>
          <h1 className="mt-2 text-center text-[34px] font-bold leading-tight text-slate-800"
              style={{ letterSpacing: '0.12em' }}>
            M&amp;E System
          </h1>

          <div className="mt-10">
            {twoFaStep ? (
              <TwoFAStep
                userId={pendingUserId}
                onBack={() => { setTwoFaStep(false); setPendingUserId(null); }}
              />
            ) : (
            <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <div>
                <div className="relative">
                  <input
                    id="login-email"
                    type="email"
                    placeholder=" "
                    className={`peer h-14 w-full rounded border bg-transparent px-4 pr-11 text-[15px] text-slate-800
                      outline-none transition-colors placeholder-transparent
                      ${errors.email
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:border-[#3F51B5]'}`}
                    {...register('email', { required: 'Email address is required' })}
                  />
                  <label
                    htmlFor="login-email"
                    className={`pointer-events-none absolute left-3 -translate-y-1/2 bg-white px-1
                      transition-all duration-150
                      top-0 text-xs
                      peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-[15px]
                      peer-focus:top-0 peer-focus:text-xs
                      ${errors.email ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-[#3F51B5]'}`}
                  >
                    Email address*
                  </label>
                  <UserIcon className={`pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2
                    ${errors.email ? 'text-red-400' : 'text-gray-400'}`} />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder=" "
                    className={`peer h-14 w-full rounded border bg-transparent px-4 pr-11 text-[15px] text-slate-800
                      outline-none transition-colors placeholder-transparent
                      ${errors.password
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:border-[#3F51B5]'}`}
                    {...register('password', { required: 'Password is required' })}
                  />
                  <label
                    htmlFor="login-password"
                    className={`pointer-events-none absolute left-3 -translate-y-1/2 bg-white px-1
                      transition-all duration-150
                      top-0 text-xs
                      peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-[15px]
                      peer-focus:top-0 peer-focus:text-xs
                      ${errors.password ? 'text-red-500 peer-focus:text-red-500' : 'text-gray-500 peer-focus:text-[#3F51B5]'}`}
                  >
                    Password*
                  </label>
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded py-4 text-[15px] font-bold uppercase tracking-wider text-white
                  shadow-md transition-colors disabled:opacity-60"
                style={{ background: isSubmitting ? '#7986CB' : '#3F51B5' }}
                onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.background = '#36459C'; }}
                onMouseLeave={e => { if (!isSubmitting) e.currentTarget.style.background = '#3F51B5'; }}
              >
                {isSubmitting ? 'Signing in…' : 'Login'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-[15px] text-gray-500 hover:text-[#3F51B5] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <div className="mt-8 space-y-1.5 border-t pt-5 text-center">
              <p className="text-sm text-gray-500">
                Need access?{' '}
                <button type="button" onClick={() => setShowRegister(true)}
                  className="font-semibold text-[#3F51B5] hover:underline">
                  Request an account
                </button>
              </p>
              <p className="text-sm text-gray-500">
                Need help?{' '}
                <button type="button" onClick={() => setShowSupport(true)}
                  className="font-semibold text-[#3F51B5] hover:underline">
                  Contact Support
                </button>
              </p>
            </div>
            </>
            )}
          </div>

          <p className="mt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Ministry of Industry and Trade
          </p>
        </div>
      </div>

      {/* ── Right: national backdrop (desktop only) ──────────────────────── */}
      <div className="relative hidden flex-1 overflow-hidden lg:block">
        <BackgroundSlideshow
          underlay={<TanzaniaFlagBackdrop />}
          slideOpacity={0.32}
          overlayClass="bg-black/25"
          emblem={
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8"
              style={{ zIndex: 3 }}
            >
              <img
                src="/tanzania-emblem.svg"
                alt=""
                aria-hidden="true"
                className="w-56 max-w-[45%] object-contain xl:w-72"
                style={{ filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.45))' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
              <p
                className="mt-6 text-center font-bold uppercase text-white"
                style={{ letterSpacing: '0.22em', fontSize: '15px', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}
              >
                United Republic of Tanzania
              </p>
              <p
                className="mt-1.5 text-center text-white/85"
                style={{ letterSpacing: '0.08em', fontSize: '13px', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
              >
                Ministry of Industry &amp; Trade
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
}
