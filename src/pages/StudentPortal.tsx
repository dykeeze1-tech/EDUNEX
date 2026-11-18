import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Flag,
  Heart,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  PlayCircle,
  Printer,
  Send,
  Sliders,
  Trophy,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { EdunexaLogo } from '../components/EdunexaLogo';
import { StudentSubjectProgressSummary } from '../components/StudentSubjectProgressSummary';
import { WeeklyStudyScheduleWidget } from '../components/WeeklyStudyScheduleWidget';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../utils/apiFetch';

export const StudentPortal: React.FC = () => {
  const { section = 'dashboard' } = useParams();
  const navigate = useNavigate();
  const { user, authLoading, refreshUser, logout } = useApp();
  const loggingOutRef = useRef(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bannerMsg, setBannerMsg] = useState('');

  // Email verification (non-blocking)
  const [verifyCodeInput, setVerifyCodeInput] = useState('');
  const [pendingVerifyHint, setPendingVerifyHint] = useState(() => sessionStorage.getItem('edunexa_pending_verify_code') || '');
  const [verifyBusy, setVerifyBusy] = useState(false);

  // Subjects filters & workspace
  const [subjSearch, setSubjSearch] = useState('');
  const [subjFilter, setSubjFilter] = useState('All');
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [startingPractice, setStartingPractice] = useState(false);

  // Practice Questions Bank (published only)
  const [practiceSubjFilter, setPracticeSubjFilter] = useState('All');
  const [practiceExamFilter, setPracticeExamFilter] = useState('All');
  const [practiceAnswers, setPracticeAnswers] = useState<Record<number, string>>({});
  const [practiceChecked, setPracticeChecked] = useState<Record<number, boolean>>({});

  // Learning centre
  const [videoSearch, setVideoSearch] = useState('');
  const [onlyFavs, setOnlyFavs] = useState(false);
  const [learningTab, setLearningTab] = useState<'all' | 'materials' | 'videos'>('all');
  const [readingMaterial, setReadingMaterial] = useState<any>(null);

  // AI Tutor
  const [tutorSubject, setTutorSubject] = useState('Mathematics');
  const [tutorInput, setTutorInput] = useState('');
  const [tutorHistory, setTutorHistory] = useState<Array<{ role: 'user' | 'model'; text: string }>>([
    {
      role: 'model',
      text: 'Welcome to EDUNEXA AI TUTOR. Share a topic, maths problem, essay paragraph, or exam question you are working on, and we will work through it step by step.',
    },
  ]);
  const [tutorBusy, setTutorBusy] = useState(false);

  // Community
  const [commData, setCommData] = useState<{ groups: any[]; posts: any[]; isMinorSafeguard: boolean } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newPost, setNewPost] = useState({ group_id: 1, title: '', body: '' });
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});

  // Profile, Leaderboard Consent, Testimonials & Customisation
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    public_display_name: '',
    leaderboard_consent: true,
    country: '',
    department: '',
    bio: '',
    academic_interests: '',
    profile_visibility: 'community',
  });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
  const [testimonialForm, setTestimonialForm] = useState({
    display_name: '',
    programme_title: '60-Day Global Quantitative Mastery Certificate',
    achievement: '',
    quote: '',
    certificate_number: '',
    consent_confirmed: true,
  });
  const [testimonialPhoto, setTestimonialPhoto] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<{ cert: any; qrUrl: string } | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/student/dashboard', { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCommunity = useCallback(async (gId: number | null) => {
    const qs = gId ? `?groupId=${gId}` : '';
    const res = await apiFetch(`/api/student/community${qs}`, { credentials: 'include' });
    if (res.ok) {
      const c = await res.json();
      setCommData(c);
      if (c.groups?.length && !newPost.group_id) {
        setNewPost((prev) => ({ ...prev, group_id: c.groups[0].id }));
      }
    }
  }, [newPost.group_id]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      if (!loggingOutRef.current) {
        navigate('/student/login', { replace: true });
      }
      return;
    }
    if (user && user.role !== 'student') {
      navigate('/admin/dashboard', { replace: true });
      return;
    }
    if (user) {
      loggingOutRef.current = false;
      setProfileForm({
        full_name: user.full_name,
        public_display_name: user.public_display_name || user.full_name,
        leaderboard_consent: user.leaderboard_consent !== 0,
        country: user.country,
        department: user.department,
        bio: user.bio || '',
        academic_interests: user.academic_interests || '',
        profile_visibility: user.profile_visibility || 'community',
      });
      setTestimonialForm((prev) => ({
        ...prev,
        display_name: prev.display_name || user.public_display_name || (user.is_minor ? `@${user.username}` : user.full_name),
      }));
      loadDashboard();
    }
  }, [authLoading, user, navigate, loadDashboard]);

  useEffect(() => {
    if (section === 'community' && user) {
      loadCommunity(selectedGroupId);
    }
  }, [section, selectedGroupId, user, loadCommunity]);

  const handleLogout = async () => {
    loggingOutRef.current = true;
    setAccountMenuOpen(false);
    setMobileMenu(false);
    await logout();
    navigate('/', { replace: true });
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[#64748B]">Loading Student Portal...</div>;
  }

  const prefs = user.dashboard_prefs || {
    theme: 'light',
    accent: '#008F9F',
    density: 'spacious',
    textSize: 'normal',
    highContrast: false,
    reducedMotion: false,
    widgets: ['overview', 'programmes', 'exams', 'results', 'certificates'],
  };
  const isDark = prefs.theme === 'dark';
  const accent = prefs.accent || '#008F9F';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subjects', label: 'My Subjects', icon: BookOpen },
    { id: 'learning', label: 'Learning Materials', icon: PlayCircle },
    { id: 'exams', label: 'Exams & Practice', icon: FileText },
    { id: 'results', label: 'My Results', icon: BarChart3 },
    { id: 'programmes', label: 'Learning Progress', icon: Calendar },
    { id: 'certificates', label: 'My Certificates', icon: Award },
    { id: 'tutor', label: 'AI Tutor', icon: Bot },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'Account Settings', icon: Sliders },
  ];

  const updatePref = async (patch: Record<string, any>) => {
    await apiFetch('/api/auth/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ dashboard_prefs: patch }),
    });
    await refreshUser();
  };

  const handleEnrolProgramme = async (progId: number) => {
    const res = await apiFetch(`/api/student/programmes/${progId}/enrol`, { method: 'POST', credentials: 'include' });
    const d = await res.json();
    setBannerMsg(d.message || d.error || '');
    await loadDashboard();
  };

  const handleVideoToggle = async (videoId: number, patch: { completed?: boolean; saved_favorite?: boolean }) => {
    await apiFetch(`/api/student/videos/${videoId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    await loadDashboard();
  };

  const handleMaterialToggle = async (materialId: number, patch: { completed?: boolean; saved_favorite?: boolean }) => {
    await apiFetch(`/api/student/materials/${materialId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    });
    await loadDashboard();
  };

  const handleStartSubjectPractice = async (subjectId: number) => {
    if (startingPractice) return;
    setStartingPractice(true);
    try {
      const res = await apiFetch('/api/student/practice/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject_id: subjectId }),
      });
      const d = await res.json();
      if (!res.ok) {
        setBannerMsg(d.error || 'Could not launch practice test.');
      } else {
        navigate(`/student/exam/${d.examId}`);
      }
    } finally {
      setStartingPractice(false);
    }
  };

  const handleResendVerification = async () => {
    setVerifyBusy(true);
    try {
      const res = await apiFetch('/api/auth/resend-verification', { method: 'POST', credentials: 'include' });
      const d = await res.json();
      if (d.devVerificationCode) {
        sessionStorage.setItem('edunexa_pending_verify_code', d.devVerificationCode);
        setPendingVerifyHint(d.devVerificationCode);
      }
      setBannerMsg(d.message || d.error || '');
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyBusy(true);
    try {
      const res = await apiFetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: verifyCodeInput }),
      });
      const d = await res.json();
      if (!res.ok) {
        setBannerMsg(d.error || 'Verification failed.');
      } else {
        sessionStorage.removeItem('edunexa_pending_verify_code');
        setPendingVerifyHint('');
        setVerifyCodeInput('');
        setBannerMsg(d.message || 'Email verified.');
        await refreshUser();
      }
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleAskTutor = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = tutorInput.trim();
    if (!msg || tutorBusy) return;
    const nextHist = [...tutorHistory, { role: 'user' as const, text: msg }];
    setTutorHistory(nextHist);
    setTutorInput('');
    setTutorBusy(true);
    try {
      const res = await apiFetch('/api/ai/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: msg, subject: tutorSubject, history: tutorHistory }),
      });
      const d = await res.json();
      setTutorHistory([...nextHist, { role: 'model', text: d.reply || d.error || 'Unable to respond right now.' }]);
    } catch {
      setTutorHistory([...nextHist, { role: 'model', text: 'Connection error reaching EDUNEXA AI TUTOR.' }]);
    } finally {
      setTutorBusy(false);
    }
  };

  const handleUploadPhoto = async (file: File, kind: 'avatar' | 'cover') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('kind', kind);
    const res = await apiFetch('/api/auth/profile/photo', { method: 'POST', credentials: 'include', body: fd });
    const d = await res.json();
    if (!res.ok) setBannerMsg(d.error || 'Upload failed.');
    else {
      setBannerMsg(`${kind === 'avatar' ? 'Profile photo' : 'Cover image'} updated.`);
      await refreshUser();
    }
  };

  const openCertVerifyPreview = async (cert: any) => {
    const res = await apiFetch(`/api/public/verify/${encodeURIComponent(cert.cert_number)}`);
    if (res.ok) {
      const d = await res.json();
      setQrPreview({ cert: d.certificate, qrUrl: d.certificate.qr_data_url });
    }
  };

  const cardBg = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-[#10243D]';
  const mutedText = isDark ? 'text-slate-400' : 'text-[#64748B]';
  const shellBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#F4F7FA] text-[#10243D]';
  const padClass = prefs.density === 'compact' ? 'p-4' : 'p-6';
  const textScale = prefs.textSize === 'large' ? 'text-[16px]' : 'text-sm';

  const practiceSubjects: string[] = Array.from(
    new Set((data?.publishedPracticeQuestions || []).map((q: any) => String(q.subject_name)))
  );
  const practiceExamTypes: string[] = Array.from(
    new Set((data?.publishedPracticeQuestions || []).map((q: any) => String(q.exam_framework)))
  );

  return (
    <div className={`${isDark ? 'dark' : ''} min-h-screen flex ${shellBg} ${textScale} ${prefs.highContrast ? 'contrast-125' : ''}`}>
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r transition-all duration-150 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="h-16 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {!sidebarCollapsed && (
            <Link to="/">
              <EdunexaLogo variant={isDark ? 'light' : 'default'} size="sm" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label="Toggle sidebar"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/student/${item.id}`)}
                style={active ? { backgroundColor: accent, color: '#FFFFFF' } : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                  active ? '' : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-[#64748B] hover:bg-[#EAF9FB]/60 hover:text-[#10243D]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
          <Link
            to="/leaders"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-[#64748B] hover:bg-[#EAF9FB]/60 hover:text-[#10243D]'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">EDUNEXA Leaders</span>}
          </Link>
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`h-16 px-4 sm:px-8 border-b flex items-center justify-between gap-4 no-print ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenu(!mobileMenu)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Open student menu"
            >
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="font-display font-bold text-base capitalize">{section.replace('-', ' ')}</span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className={`hidden md:inline text-xs ${mutedText}`}>
              {user.department} Stream · {user.country}
            </span>

            <button
              type="button"
              onClick={() => navigate('/student/notifications')}
              aria-label="Notifications"
              className={`relative p-2 rounded-lg border transition-colors ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-[#EAF9FB]'}`}
            >
              <Bell className="w-4 h-4" />
              {(data?.notifications || []).some((n: any) => !n.is_read) && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#008F9F] text-white text-[10px] font-mono-tabular font-bold flex items-center justify-center">
                  {(data?.notifications || []).filter((n: any) => !n.is_read).length}
                </span>
              )}
            </button>

            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((o) => !o)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                className={`flex items-center gap-2 px-2 py-1 rounded-lg border transition-colors text-left ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-[#EAF9FB]'}`}
              >
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-7 h-7 rounded-full object-cover border border-slate-300" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#008F9F] text-white font-bold text-xs flex items-center justify-center">
                    {user.full_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-semibold max-w-[140px] truncate">{user.full_name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-lg py-1.5 z-50 ${isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-[#10243D]'}`}
                >
                  <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-bold truncate">{user.full_name}</div>
                    <div className={`text-[11px] truncate ${mutedText}`}>{user.email}</div>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      navigate('/student/dashboard');
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium ${isDark ? 'hover:bg-slate-800' : 'hover:bg-[#EAF9FB]'}`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#008F9F]" /> Dashboard
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      navigate('/student/profile');
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium ${isDark ? 'hover:bg-slate-800' : 'hover:bg-[#EAF9FB]'}`}
                  >
                    <User className="w-3.5 h-3.5 text-[#008F9F]" /> Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      navigate('/student/results');
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium ${isDark ? 'hover:bg-slate-800' : 'hover:bg-[#EAF9FB]'}`}
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#008F9F]" /> My Results
                  </button>
                  <div className="border-t border-slate-200 dark:border-slate-800 mt-1 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {mobileMenu && (
          <div className={`lg:hidden border-b p-3 space-y-1 no-print ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigate(`/student/${item.id}`);
                  setMobileMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  section === item.id ? 'bg-[#008F9F] text-white font-semibold' : 'hover:bg-[#EAF9FB]/60'
                }`}
              >
                {item.label}
              </button>
            ))}
            <Link to="/leaders" onClick={() => setMobileMenu(false)} className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-[#EAF9FB]/60">
              Leaderboard (EDUNEXA Leaders)
            </Link>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          {user.email_verified === 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-amber-700" /> Verify Your Email Address
                </div>
                <p className="text-amber-900">
                  Your account is active, and verifying your email helps protect password recovery.
                  {pendingVerifyHint && (
                    <>
                      {' '}SMTP email delivery is not configured on this environment — use code{' '}
                      <strong className="font-mono-tabular px-1.5 py-0.5 rounded bg-white border border-amber-300">{pendingVerifyHint}</strong>
                    </>
                  )}
                </p>
              </div>
              <form onSubmit={handleVerifyEmail} className="flex flex-wrap items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={verifyCodeInput}
                  onChange={(e) => setVerifyCodeInput(e.target.value)}
                  placeholder="6-digit code"
                  className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-[#10243D] w-32 font-mono-tabular"
                />
                <button
                  type="submit"
                  disabled={verifyBusy || !verifyCodeInput.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-[#10243D] text-white font-semibold disabled:opacity-50"
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={verifyBusy}
                  className="px-3 py-1.5 rounded-lg border border-amber-400 bg-white text-amber-900 font-semibold"
                >
                  {pendingVerifyHint ? 'New Code' : 'Get Code'}
                </button>
              </form>
            </div>
          )}

          {bannerMsg && (
            <div className="p-3.5 rounded-xl bg-[#EAF9FB] border border-[#90DFEC] text-[#10243D] text-xs font-medium flex items-center justify-between">
              <span>{bannerMsg}</span>
              <button type="button" onClick={() => setBannerMsg('')} className="text-[#64748B] hover:text-[#10243D]">Dismiss</button>
            </div>
          )}

          {loading && !data ? (
            <div className={`rounded-xl border ${cardBg} p-10 text-center ${mutedText}`}>Loading workspace...</div>
          ) : (
            <>
              {/* DASHBOARD OVERVIEW */}
              {section === 'dashboard' && data && (
                <div className="space-y-6">
                  {/* Announcements */}
                  {(data.announcements || []).length > 0 && (
                    <div className="rounded-xl border border-[#90DFEC] bg-[#EAF9FB] text-[#10243D] p-4 space-y-2">
                      <div className="text-xs font-bold text-[#008F9F] inline-flex items-center gap-1.5">
                        <Megaphone className="w-4 h-4" /> Platform Announcements
                      </div>
                      <div className="space-y-1.5">
                        {data.announcements.map((ann: any) => (
                          <div key={ann.id} className="text-xs">
                            <strong>{ann.title}:</strong> {ann.body}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                    {user.cover_url && (
                      <div className="h-28 w-full overflow-hidden">
                        <img src={user.cover_url} alt="Profile banner" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className={`${padClass} flex flex-wrap items-center justify-between gap-4`}>
                      <div className="flex items-center gap-4">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-14 h-14 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-[#10243D] text-white font-bold text-lg flex items-center justify-center">
                            {user.full_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h1 className="font-display font-bold text-xl sm:text-2xl">Welcome back, {user.full_name}</h1>
                          <p className={`text-xs mt-0.5 ${mutedText}`}>
                            Department: {user.department} · Display Name: {user.is_minor ? `@${user.username}` : (user.public_display_name || user.full_name)} · Leaderboard: {user.leaderboard_consent === 0 ? 'Private' : 'Public Consent Active'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => navigate('/student/exams')}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg whitespace-nowrap"
                        >
                          Practise Published Questions
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate('/student/tutor')}
                          style={{ backgroundColor: accent }}
                          className="px-4 py-2 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
                        >
                          Ask EDUNEXA AI Tutor
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`rounded-xl border ${cardBg} ${padClass}`}>
                      <div className={`text-xs ${mutedText}`}>Examinations Taken</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">{data.stats.examsAttempted}</div>
                    </div>
                    <div className={`rounded-xl border ${cardBg} ${padClass}`}>
                      <div className={`text-xs ${mutedText}`}>Average Score</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">{data.stats.avgScore}% ({data.stats.avgGrade})</div>
                    </div>
                    <div className={`rounded-xl border ${cardBg} ${padClass}`}>
                      <div className={`text-xs ${mutedText}`}>60-Day Programmes</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">{data.stats.activeProgrammes}</div>
                    </div>
                    <div className={`rounded-xl border ${cardBg} ${padClass}`}>
                      <div className={`text-xs ${mutedText}`}>Verified Certificates</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">{data.stats.certificatesEarned}</div>
                    </div>
                  </div>

                  {/* Visual Subject & Module Circular Progress Summary */}
                  <StudentSubjectProgressSummary
                    subjects={data.subjects || []}
                    learningMaterials={data.learningMaterials || []}
                    videos={data.videos || []}
                    exams={data.exams || []}
                    attempts={data.attempts || []}
                    enrolments={data.enrolments || []}
                    subjectPerformance={data.subjectPerformance || []}
                    department={user.department}
                    accent={accent}
                    isDark={isDark}
                    compact={prefs.density === 'compact'}
                    reducedMotion={Boolean(prefs.reducedMotion)}
                    onOpenSubject={(subj) => {
                      setSelectedSubject(subj);
                      navigate('/student/subjects');
                    }}
                    onStartPractice={handleStartSubjectPractice}
                    onNavigate={(path) => navigate(path)}
                  />

                  {/* Weekly Study Schedule Widget */}
                  <WeeklyStudyScheduleWidget
                    schedule={data.studySchedule || []}
                    subjects={data.subjects || []}
                    accent={accent}
                    isDark={isDark}
                    compact={prefs.density === 'compact'}
                    onRefresh={loadDashboard}
                    onOpenSubject={(subj) => {
                      setSelectedSubject(subj);
                      navigate('/student/subjects');
                    }}
                  />

                  {/* Subject Performance + Leaderboard Standings */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className={`lg:col-span-6 rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <h2 className="font-display font-bold text-base inline-flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-[#008F9F]" /> Subject Performance
                        </h2>
                        <button type="button" onClick={() => navigate('/student/exams')} className="text-xs font-semibold text-[#008F9F]">
                          Exam History →
                        </button>
                      </div>
                      {(data.subjectPerformance || []).length === 0 ? (
                        <p className={`text-xs ${mutedText}`}>Complete a graded assessment to track your subject performance breakdown.</p>
                      ) : (
                        <div className="space-y-3">
                          {data.subjectPerformance.map((sp: any) => (
                            <div key={sp.subject} className="space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold">{sp.subject} ({sp.attempts} attempt{sp.attempts > 1 ? 's' : ''})</span>
                                <span className="font-mono-tabular font-bold text-[#008F9F]">{sp.avgScore}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-[#008F9F]" style={{ width: `${Math.min(100, sp.avgScore)}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className={`lg:col-span-6 rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <h2 className="font-display font-bold text-base inline-flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-[#008F9F]" /> Leaderboard Standing
                        </h2>
                        <Link to="/leaders" className="text-xs font-semibold text-[#008F9F] hover:underline">
                          View EDUNEXA Leaders →
                        </Link>
                      </div>
                      {(data.leaderboardPositions || []).length === 0 ? (
                        <p className={`text-xs ${mutedText}`}>
                          No graded positions recorded yet. Complete assessments to establish your verified standing.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {data.leaderboardPositions.map((lp: any) => (
                            <div key={`${lp.user_id}-${lp.subject_id}`} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                              <div>
                                <div className="font-semibold">{lp.subject_name}</div>
                                <div className={mutedText}>
                                  Display: {lp.display_name} · {lp.leaderboard_consent ? 'Public' : 'Private (No Consent)'}
                                </div>
                              </div>
                              <div className="text-right font-mono-tabular">
                                <div className="font-bold text-[#008F9F]">Rank #{lp.position}</div>
                                <div className="font-semibold">{lp.score_percentage}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 60-Day Progress + Notifications */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className={`lg:col-span-7 rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <h2 className="font-display font-bold text-base">60-Day Learning Programme Progress</h2>
                        <button type="button" onClick={() => navigate('/student/programmes')} className="text-xs font-semibold text-[#008F9F]">
                          View all →
                        </button>
                      </div>
                      {data.enrolments.length === 0 ? (
                        <p className={`text-xs ${mutedText}`}>You have not enrolled in a 60-day qualifying programme yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {data.enrolments.map((enr: any) => {
                            const pctDays = Math.min(100, Math.round((enr.elapsed_days / enr.min_days) * 100));
                            return (
                              <div key={enr.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-sm">{enr.title}</span>
                                  <span className="font-mono-tabular text-xs font-semibold text-[#008F9F]">
                                    {enr.elapsed_days} / {enr.min_days} days
                                  </span>
                                </div>
                                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#008F9F]" style={{ width: `${pctDays}%` }} />
                                </div>
                                <div className={`text-xs flex flex-wrap gap-3 ${mutedText}`}>
                                  <span>Lessons: {enr.lessons_completed.length}/{enr.required_lessons}</span>
                                  <span>Practice Exams: {enr.practice_exams_completed}/{enr.required_practice_exams}</span>
                                  <span className={enr.eligible_for_final ? 'text-emerald-600 font-semibold' : ''}>
                                    {enr.eligible_for_final ? 'Eligible for Final Exam' : `${enr.days_remaining} days remaining`}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className={`lg:col-span-5 rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                      <div className="flex items-center justify-between">
                        <h2 className="font-display font-bold text-base inline-flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#008F9F]" /> Notifications
                        </h2>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch('/api/student/notifications/read', { method: 'POST', credentials: 'include' });
                            loadDashboard();
                          }}
                          className="text-xs text-[#008F9F] hover:underline"
                        >
                          Mark read
                        </button>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {data.notifications.map((n: any) => (
                          <div key={n.id} className={`p-3 rounded-lg border text-xs ${n.is_read ? 'border-slate-200 dark:border-slate-800 opacity-75' : 'border-[#90DFEC] bg-[#EAF9FB]/40 dark:bg-slate-800'}`}>
                            <div className="font-semibold">{n.title}</div>
                            <div className={`mt-1 ${mutedText}`}>{n.body}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBJECTS CATALOGUE & WORKSPACE VIEW */}
              {section === 'subjects' && data && (
                selectedSubject ? (
                  <div className="space-y-6">
                    <button
                      type="button"
                      onClick={() => setSelectedSubject(null)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#008F9F] hover:underline"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back to All Subjects
                    </button>

                    <div className={`rounded-2xl border ${cardBg} ${padClass} flex flex-wrap items-start justify-between gap-4`}>
                      <div className="space-y-2 max-w-2xl">
                        <div className="text-xs font-semibold text-[#008F9F]">
                          {selectedSubject.code} · {selectedSubject.access_classification}
                        </div>
                        <h1 className="font-display font-bold text-2xl">{selectedSubject.name} Workspace</h1>
                        <p className={`text-xs leading-relaxed ${mutedText}`}>{selectedSubject.description}</p>
                      </div>
                      <button
                        type="button"
                        disabled={startingPractice}
                        onClick={() => handleStartSubjectPractice(selectedSubject.id)}
                        style={{ backgroundColor: accent }}
                        className="px-5 py-2.5 text-white text-xs font-semibold rounded-lg disabled:opacity-60 whitespace-nowrap"
                      >
                        {startingPractice ? 'Preparing Test...' : 'Start Subject Practice Test'}
                      </button>
                    </div>

                    {/* Syllabus Topics */}
                    <div className={`rounded-xl border ${cardBg} ${padClass} space-y-3`}>
                      <h2 className="font-display font-bold text-base">Covered Syllabus Topics</h2>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {Array.from(
                          new Set([
                            ...(data.topics || []).filter((t: any) => t.subject_id === selectedSubject.id).map((t: any) => t.topic_name),
                            ...(data.learningMaterials || []).filter((m: any) => m.subject_id === selectedSubject.id).map((m: any) => m.topic_name),
                          ])
                        ).map((topicName: any) => (
                          <span key={topicName} className="px-3 py-1.5 rounded-lg bg-[#EAF9FB] text-[#10243D] font-medium border border-[#90DFEC]">
                            {topicName}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Subject Reading & Study Materials */}
                    <div className={`rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                      <h2 className="font-display font-bold text-base">Study Guides & Reading Materials</h2>
                      {(data.learningMaterials || []).filter((m: any) => m.subject_id === selectedSubject.id).length === 0 ? (
                        <p className={`text-xs ${mutedText}`}>No written guides published for this subject yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {(data.learningMaterials || [])
                            .filter((m: any) => m.subject_id === selectedSubject.id)
                            .map((m: any) => (
                              <div key={m.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                                <div className="text-[#008F9F] font-semibold">{m.material_type} · {m.topic_name}</div>
                                <h3 className="font-display font-bold text-base">{m.title}</h3>
                                <p className={mutedText}>{m.summary}</p>
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setReadingMaterial(m)}
                                    style={{ backgroundColor: accent }}
                                    className="px-3.5 py-1.5 text-white font-semibold rounded-lg"
                                  >
                                    Read Guide
                                  </button>
                                  {m.document_url && (
                                    <a
                                      href={m.document_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={m.document_name || true}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                                    >
                                      <Download className="w-3.5 h-3.5" /> {m.document_name || 'Download'}
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleMaterialToggle(m.id, { completed: !m.completed })}
                                    className={`px-3 py-1.5 rounded-lg font-semibold border ${
                                      m.completed ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {m.completed ? 'Completed ✓' : 'Mark Completed'}
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Subject Video Lessons & Exams */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className={`rounded-xl border ${cardBg} ${padClass} space-y-3`}>
                        <h2 className="font-display font-bold text-base">Video Lessons</h2>
                        {(data.videos || []).filter((v: any) => v.subject_id === selectedSubject.id).length === 0 ? (
                          <p className={`text-xs ${mutedText}`}>No videos assigned to this subject yet.</p>
                        ) : (
                          (data.videos || [])
                            .filter((v: any) => v.subject_id === selectedSubject.id)
                            .map((v: any) => (
                              <div key={v.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                                <div className="font-semibold text-sm">{v.title}</div>
                                <p className={mutedText}>{v.description}</p>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => navigate('/student/learning')} className="text-[#008F9F] font-semibold hover:underline">
                                    Watch in Learning Centre →
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>

                      <div className={`rounded-xl border ${cardBg} ${padClass} space-y-3`}>
                        <h2 className="font-display font-bold text-base">Published Subject Examinations</h2>
                        {(data.exams || []).filter((ex: any) => ex.subject_id === selectedSubject.id).length === 0 ? (
                          <p className={`text-xs ${mutedText}`}>No standalone published exam yet — use “Start Subject Practice Test” above to practise from approved questions.</p>
                        ) : (
                          (data.exams || [])
                            .filter((ex: any) => ex.subject_id === selectedSubject.id)
                            .map((ex: any) => (
                              <div key={ex.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                                <div>
                                  <div className="font-semibold text-sm">{ex.title}</div>
                                  <div className={mutedText}>{ex.exam_framework} · {ex.duration_minutes} mins · {ex.question_count} questions</div>
                                </div>
                                {ex.is_eligible ? (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/student/exam/${ex.id}`)}
                                    style={{ backgroundColor: accent }}
                                    className="px-3.5 py-2 text-white font-semibold rounded-lg shrink-0"
                                  >
                                    Start
                                  </button>
                                ) : (
                                  <span className="text-amber-700">{ex.eligibility_reason}</span>
                                )}
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className={`rounded-xl border ${cardBg} ${padClass} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                      <div>
                        <h1 className="font-display font-bold text-xl">Subjects & Curriculum Access</h1>
                        <p className={`text-xs mt-1 ${mutedText}`}>
                          Your stream is <strong>{user.department}</strong>. Open any eligible subject workspace to access syllabus topics, study guides, video lessons, and practice tests.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['All', 'Eligible', 'Common'].map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setSubjFilter(tab)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${
                              subjFilter === tab ? 'bg-[#008F9F] text-white border-[#008F9F]' : 'border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                        <input
                          type="text"
                          value={subjSearch}
                          onChange={(e) => setSubjSearch(e.target.value)}
                          placeholder="Filter subjects..."
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {data.subjects
                        .filter((s: any) => {
                          if (subjFilter === 'Eligible' && !s.is_eligible) return false;
                          if (subjFilter === 'Common' && s.access_classification !== 'Common / All Students') return false;
                          return s.name.toLowerCase().includes(subjSearch.toLowerCase()) || s.group_name.toLowerCase().includes(subjSearch.toLowerCase());
                        })
                        .map((s: any) => (
                          <div key={s.id} className={`rounded-xl border ${cardBg} ${padClass} flex flex-col justify-between space-y-4 ${!s.is_eligible ? 'opacity-75' : ''}`}>
                            <div>
                              <div className="text-xs text-[#008F9F] font-semibold mb-1">
                                {s.code} · {s.access_classification}
                              </div>
                              <h2 className="font-display font-bold text-lg">{s.name}</h2>
                              <p className={`text-xs mt-2 leading-relaxed ${mutedText}`}>{s.description}</p>
                            </div>
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                              {s.is_eligible ? (
                                <div className="flex items-center justify-between text-emerald-600 font-semibold">
                                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Eligible ({user.department})</span>
                                  <button type="button" onClick={() => setSelectedSubject(s)} className="text-[#008F9F] hover:underline">
                                    Open Workspace →
                                  </button>
                                </div>
                              ) : (
                                <div className="text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                                  <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                  <span>Restricted to {(s.eligible_departments || []).join(', ')} students.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )
              )}

              {/* EXAMINATIONS, PRACTICE TESTS & RESULTS */}
              {section === 'exams' && data && (
                <div className="space-y-8">
                  {/* Instant Subject Practice Tests */}
                  <div className={`rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h1 className="font-display font-bold text-xl">Practice Tests by Subject</h1>
                        <p className={`text-xs mt-0.5 ${mutedText}`}>
                          Launch an instant timed practice test drawn from approved & published questions in any of your eligible subjects.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {(data.subjects || [])
                        .filter((s: any) => s.is_eligible)
                        .map((s: any) => (
                          <button
                            key={s.id}
                            type="button"
                            disabled={startingPractice}
                            onClick={() => handleStartSubjectPractice(s.id)}
                            className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-[#008F9F] text-left space-y-1 transition-colors"
                          >
                            <div className="text-[11px] font-semibold text-[#008F9F]">{s.code} · Practice</div>
                            <div className="font-display font-bold text-sm">{s.name}</div>
                            <div className="text-[11px] text-[#008F9F] font-semibold">Launch Practice Test →</div>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Scheduled & Practice Examinations */}
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="font-display font-bold text-lg">Published Practice & 60-Day Qualifying Examinations</h2>
                    </div>
                    {(data.schedules || []).length > 0 && (
                      <div className="p-4 rounded-xl bg-[#EAF9FB] border border-[#90DFEC] text-[#10243D] space-y-2 text-xs">
                        <div className="font-bold text-[#008F9F]">Upcoming Examination Schedule</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {data.schedules.map((sc: any) => (
                            <div key={sc.id} className="p-2.5 rounded-lg bg-white border border-slate-200">
                              <div className="font-semibold">{sc.title} ({sc.exam_title})</div>
                              <div className="text-[#64748B]">
                                {new Date(sc.scheduled_start).toLocaleString()} – {new Date(sc.scheduled_end).toLocaleString()} ({sc.timezone})
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {data.exams.map((ex: any) => (
                        <div key={ex.id} className={`rounded-xl border ${cardBg} ${padClass} flex flex-col justify-between space-y-4`}>
                          <div className="space-y-2">
                            <div className="text-xs text-[#008F9F] font-semibold">
                              {ex.subject_name} · {ex.exam_framework} · {ex.is_60day_final ? '60-Day Qualifying Final' : ex.category}
                            </div>
                            <h2 className="font-display font-bold text-lg">{ex.title}</h2>
                            <p className={`text-xs ${mutedText}`}>{ex.instructions}</p>
                          </div>
                          <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                            <div className={`text-xs font-mono-tabular flex gap-4 ${mutedText}`}>
                              <span>{ex.duration_minutes} mins</span>
                              <span>{ex.question_count} questions</span>
                              <span>Pass: {ex.pass_mark}%</span>
                            </div>
                            {ex.is_eligible ? (
                              <button
                                type="button"
                                onClick={() => navigate(`/student/exam/${ex.id}`)}
                                style={{ backgroundColor: accent }}
                                className="w-full py-2 text-white text-xs font-semibold rounded-lg"
                              >
                                {ex.is_60day_final ? 'Start Qualifying Final Exam' : 'Start Practice Exam'}
                              </button>
                            ) : (
                              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                                {ex.eligibility_reason}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Published Practice Questions Bank */}
                  <div className={`rounded-xl border ${cardBg} ${padClass} space-y-5`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h2 className="font-display font-bold text-lg">Published Practice Question Bank</h2>
                        <p className={`text-xs ${mutedText}`}>
                          Only administrator-approved and published questions for your eligible subjects appear here. Practise interactively and inspect verified explanations and marking schemes.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <select
                          value={practiceSubjFilter}
                          onChange={(e) => setPracticeSubjFilter(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                        >
                          <option value="All">All Eligible Subjects</option>
                          {practiceSubjects.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <select
                          value={practiceExamFilter}
                          onChange={(e) => setPracticeExamFilter(e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                        >
                          <option value="All">All Exam Types</option>
                          {practiceExamTypes.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(data.publishedPracticeQuestions || [])
                        .filter((q: any) => (practiceSubjFilter === 'All' || q.subject_name === practiceSubjFilter) && (practiceExamFilter === 'All' || q.exam_framework === practiceExamFilter))
                        .map((q: any) => {
                          const isChecked = Boolean(practiceChecked[q.id]);
                          const userAns = practiceAnswers[q.id] || '';
                          const isObjective = q.format === 'mcq' || q.format === 'true_false';
                          const isCorrect = isObjective && userAns.trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();

                          return (
                            <div key={q.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[#008F9F] font-semibold">
                                <span>{q.subject_name} · {q.topic_name} · {q.exam_framework}</span>
                                <span className={`font-mono-tabular ${mutedText}`}>{q.difficulty} · {q.marks} marks</span>
                              </div>
                              <p className="text-sm font-medium">{q.question_text}</p>

                              {isObjective && Array.isArray(q.options) && q.options.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {q.options.map((opt: string, idx: number) => (
                                    <label
                                      key={idx}
                                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer ${
                                        userAns === opt ? 'border-[#008F9F] bg-[#EAF9FB]/60 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`practice-${q.id}`}
                                        checked={userAns === opt}
                                        onChange={() => setPracticeAnswers({ ...practiceAnswers, [q.id]: opt })}
                                      />
                                      <span>{opt}</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <textarea
                                  rows={2}
                                  value={userAns}
                                  onChange={(e) => setPracticeAnswers({ ...practiceAnswers, [q.id]: e.target.value })}
                                  placeholder="Draft your theory answer before checking the marking scheme..."
                                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                                />
                              )}

                              <div className="flex items-center justify-between gap-3">
                                <button
                                  type="button"
                                  onClick={() => setPracticeChecked({ ...practiceChecked, [q.id]: !isChecked })}
                                  style={{ backgroundColor: accent }}
                                  className="px-3.5 py-1.5 text-white font-semibold rounded-lg"
                                >
                                  {isChecked ? 'Hide Solution' : isObjective ? 'Check Answer & Explanation' : 'Reveal Expected Answer & Marking Scheme'}
                                </button>
                              </div>

                              {isChecked && (
                                <div className="p-3 rounded-lg bg-[#EAF9FB] dark:bg-slate-800 text-[#10243D] dark:text-slate-100 space-y-1.5">
                                  {isObjective && (
                                    <div className={`font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'}`}>
                                      {userAns ? (isCorrect ? 'Correct!' : 'Review Required') : 'Answer Key'} — Correct Answer: {q.correct_answer}
                                    </div>
                                  )}
                                  {!isObjective && (
                                    <div>
                                      <strong>Expected Answer:</strong> {q.correct_answer}
                                    </div>
                                  )}
                                  {q.marking_scheme && (
                                    <div>
                                      <strong>Marking Scheme ({q.marks} marks):</strong> {q.marking_scheme}
                                    </div>
                                  )}
                                  {q.explanation && (
                                    <div className="text-[#64748B] dark:text-slate-300">
                                      <strong>Explanation:</strong> {q.explanation}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Assessment History */}
                  <div className={`rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                    <h2 className="font-display font-bold text-lg">Your Assessment History</h2>
                    {data.attempts.length === 0 ? (
                      <p className={`text-xs ${mutedText}`}>No examination attempts recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className={mutedText}>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                              <th className="text-left py-2">Assessment</th>
                              <th className="text-left py-2">Status</th>
                              <th className="text-right py-2">Score</th>
                              <th className="text-right py-2">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.attempts.map((a: any) => (
                              <tr key={a.id}>
                                <td className="py-3 font-medium">{a.exam_title}</td>
                                <td className="py-3 capitalize">{a.status}</td>
                                <td className="py-3 text-right font-mono-tabular font-semibold">{a.percentage}% ({a.grade})</td>
                                <td className="py-3 text-right">
                                  <Link to={`/student/results/${a.id}`} className="text-[#008F9F] font-semibold hover:underline">
                                    View Analysis
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MY RESULTS */}
              {section === 'results' && data && (
                <div className="space-y-6">
                  <div className={`rounded-xl border ${cardBg} ${padClass} flex flex-wrap items-center justify-between gap-4`}>
                    <div>
                      <h1 className="font-display font-bold text-xl">My Examination & Practice Results</h1>
                      <p className={`text-xs mt-1 ${mutedText}`}>
                        Track your graded scripts, percentage scores, grades, and question-by-question feedback across all attempts.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate('/student/exams')}
                      style={{ backgroundColor: accent }}
                      className="px-4 py-2 text-white text-xs font-semibold rounded-lg"
                    >
                      Take a Practice Test
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`rounded-xl border ${cardBg} ${padClass}`}>
                      <div className={`text-xs ${mutedText}`}>Total Attempts</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">{(data.attempts || []).length}</div>
                    </div>
                    <div className={`rounded-xl border ${cardBg} ${padClass}`}>
                      <div className={`text-xs ${mutedText}`}>Average Score</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">{data.stats.avgScore}% ({data.stats.avgGrade})</div>
                    </div>
                    <div className={`rounded-xl border ${cardBg} ${padClass}`}>
                      <div className={`text-xs ${mutedText}`}>Highest Score</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">
                        {(data.attempts || []).length > 0
                          ? `${Math.max(...data.attempts.map((a: any) => Number(a.percentage) || 0))}%`
                          : '—'}
                      </div>
                    </div>
                    <div className={`rounded-xl border ${cardBg} ${padClass}`}>
                      <div className={`text-xs ${mutedText}`}>Certificates Earned</div>
                      <div className="font-mono-tabular text-2xl font-bold mt-1">{data.stats.certificatesEarned}</div>
                    </div>
                  </div>

                  <div className={`rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                    <h2 className="font-display font-bold text-lg">Assessment History & Breakdown</h2>
                    {(data.attempts || []).length === 0 ? (
                      <div className="py-8 text-center space-y-3">
                        <p className={`text-sm ${mutedText}`}>You have not completed any practice tests or examinations yet.</p>
                        <button
                          type="button"
                          onClick={() => navigate('/student/exams')}
                          style={{ backgroundColor: accent }}
                          className="px-4 py-2 text-white text-xs font-semibold rounded-lg"
                        >
                          Start Your First Practice Test
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className={mutedText}>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                              <th className="text-left py-2.5">Assessment</th>
                              <th className="text-left py-2.5">Status</th>
                              <th className="text-left py-2.5">Submitted</th>
                              <th className="text-right py-2.5">Score</th>
                              <th className="text-right py-2.5">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.attempts.map((a: any) => (
                              <tr key={a.id}>
                                <td className="py-3 font-semibold">{a.exam_title}</td>
                                <td className="py-3 capitalize">{a.status}</td>
                                <td className={`py-3 ${mutedText}`}>
                                  {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : 'In progress'}
                                </td>
                                <td className="py-3 text-right font-mono-tabular font-bold">{a.percentage}% ({a.grade})</td>
                                <td className="py-3 text-right">
                                  <Link to={`/student/results/${a.id}`} className="text-[#008F9F] font-semibold hover:underline">
                                    View Detailed Breakdown →
                                  </Link>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* NOTIFICATIONS */}
              {section === 'notifications' && data && (
                <div className={`rounded-xl border ${cardBg} ${padClass} space-y-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h1 className="font-display font-bold text-xl">Notifications & Academic Updates</h1>
                      <p className={`text-xs mt-1 ${mutedText}`}>
                        Stay updated on grading outcomes, programme milestones, and platform announcements.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiFetch('/api/student/notifications/read', { method: 'POST', credentials: 'include' });
                        setBannerMsg('All notifications marked as read.');
                        await loadDashboard();
                      }}
                      style={{ backgroundColor: accent }}
                      className="px-4 py-2 text-white text-xs font-semibold rounded-lg"
                    >
                      Mark All as Read
                    </button>
                  </div>

                  {(data.notifications || []).length === 0 ? (
                    <div className={`py-8 text-center text-sm ${mutedText}`}>
                      You are all caught up — no notifications right now.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.notifications.map((n: any) => (
                        <div
                          key={n.id}
                          className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            n.is_read
                              ? 'border-slate-200 dark:border-slate-800 opacity-80'
                              : 'border-[#90DFEC] bg-[#EAF9FB]/60 dark:bg-slate-800'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-sm">{n.title}</div>
                            <div className={`mt-1 ${mutedText}`}>{n.body}</div>
                          </div>
                          <div className={`text-[11px] font-mono-tabular shrink-0 ${mutedText}`}>
                            {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 60-DAY PROGRAMMES */}
              {section === 'programmes' && data && (
                <div className="space-y-6">
                  <div>
                    <h1 className="font-display font-bold text-xl">60-Day Qualifying Learning Programmes</h1>
                    <p className={`text-xs mt-1 ${mutedText}`}>
                      Elapsed days are measured from your programme enrolment date. Qualifying for the final exam requires 60+ days plus completing required lessons and practice tests.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.allProgrammes.map((p: any) => {
                      const enr = data.enrolments.find((e: any) => e.programme_id === p.id);
                      return (
                        <div key={p.id} className={`rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                          <div>
                            <div className="text-xs font-semibold text-[#008F9F]">{p.subject_name} · {p.access_classification}</div>
                            <h2 className="font-display font-bold text-lg mt-1">{p.title}</h2>
                            <p className={`text-xs mt-2 ${mutedText}`}>{p.description}</p>
                          </div>
                          <div className={`text-xs font-mono-tabular ${mutedText}`}>
                            Requirements: {p.min_days} days · {p.required_lessons} lessons · {p.required_practice_exams} practice exam · {p.pass_mark}% final pass mark
                          </div>
                          {enr ? (
                            <div className="p-3 rounded-lg bg-[#EAF9FB] dark:bg-slate-800 text-xs text-[#10243D] dark:text-slate-100 space-y-1">
                              <div className="font-semibold">
                                Enrolled {new Date(enr.enrolled_at).toLocaleDateString()} ({enr.elapsed_days} / {p.min_days} days elapsed)
                              </div>
                              <div>
                                Lessons: {enr.lessons_completed.length}/{p.required_lessons} · Practice: {enr.practice_exams_completed}/{p.required_practice_exams}
                              </div>
                              {enr.eligible_for_final && (
                                <div className="text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
                                  Eligible — You may take the 60-Day Final Examination in the Exams & Practice tab.
                                </div>
                              )}
                            </div>
                          ) : p.is_eligible ? (
                            <button
                              type="button"
                              onClick={() => handleEnrolProgramme(p.id)}
                              style={{ backgroundColor: accent }}
                              className="px-4 py-2 text-white text-xs font-semibold rounded-lg"
                            >
                              Enrol Free & Start 60-Day Clock
                            </button>
                          ) : (
                            <div className="text-xs text-amber-700">Restricted to {p.department} department students.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LEARNING CENTRE */}
              {section === 'learning' && data && (
                <div className="space-y-6">
                  <div className={`rounded-xl border ${cardBg} ${padClass} flex flex-wrap items-center justify-between gap-4`}>
                    <div>
                      <h1 className="font-display font-bold text-xl">Learning Centre</h1>
                      <p className={`text-xs ${mutedText}`}>Read written study guides, download attachments, and complete video lessons for your 60-day programmes.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: 'all', label: 'All Resources' },
                        { id: 'materials', label: 'Study Guides' },
                        { id: 'videos', label: 'Video Lessons' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setLearningTab(t.id as any)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${learningTab === t.id ? 'bg-[#10243D] text-white border-[#10243D]' : 'border-slate-200 dark:border-slate-700'}`}
                        >
                          {t.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setOnlyFavs(!onlyFavs)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${onlyFavs ? 'bg-[#008F9F] text-white border-[#008F9F]' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        Saved Favourites
                      </button>
                      <input
                        type="text"
                        value={videoSearch}
                        onChange={(e) => setVideoSearch(e.target.value)}
                        placeholder="Search materials..."
                        className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                      />
                    </div>
                  </div>

                  {/* Written Study & Reading Materials */}
                  {(learningTab === 'all' || learningTab === 'materials') && (
                    <div className="space-y-3">
                      <h2 className="font-display font-bold text-base">Reading & Study Guides</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {(data.learningMaterials || [])
                          .filter((m: any) => m.is_eligible !== false)
                          .filter((m: any) => (!onlyFavs || m.saved_favorite) && (m.title.toLowerCase().includes(videoSearch.toLowerCase()) || m.subject_name.toLowerCase().includes(videoSearch.toLowerCase()) || m.topic_name.toLowerCase().includes(videoSearch.toLowerCase())))
                          .map((m: any) => (
                            <div key={m.id} className={`rounded-xl border ${cardBg} ${padClass} flex flex-col justify-between space-y-4`}>
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-[#008F9F]">
                                  {m.subject_name} · {m.topic_name} · {m.material_type}
                                </div>
                                <h3 className="font-display font-bold text-base">{m.title}</h3>
                                <p className={`text-xs leading-relaxed ${mutedText}`}>{m.summary}</p>
                              </div>
                              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setReadingMaterial(m)}
                                    style={{ backgroundColor: accent }}
                                    className="px-3.5 py-1.5 text-white text-xs font-semibold rounded-lg"
                                  >
                                    Read Guide
                                  </button>
                                  {m.document_url && (
                                    <a
                                      href={m.document_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      download={m.document_name || true}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700"
                                    >
                                      <Download className="w-3.5 h-3.5" /> Download
                                    </a>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMaterialToggle(m.id, { completed: !m.completed })}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                                      m.completed ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {m.completed ? 'Completed ✓' : 'Mark Completed'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMaterialToggle(m.id, { saved_favorite: !m.saved_favorite })}
                                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${
                                      m.saved_favorite ? 'bg-[#EAF9FB] border-[#008F9F] text-[#008F9F]' : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    <Heart className="w-3.5 h-3.5" /> {m.saved_favorite ? 'Saved' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Video Lessons */}
                  {(learningTab === 'all' || learningTab === 'videos') && (
                    <div className="space-y-3">
                      <h2 className="font-display font-bold text-base">Educational Video Lessons</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.videos
                          .filter((v: any) => v.is_eligible !== false)
                          .filter((v: any) => (!onlyFavs || v.saved_favorite) && (v.title.toLowerCase().includes(videoSearch.toLowerCase()) || v.subject_name.toLowerCase().includes(videoSearch.toLowerCase())))
                          .map((v: any) => (
                            <div key={v.id} className={`rounded-xl border overflow-hidden ${cardBg}`}>
                              <div className="aspect-video bg-[#10243D]">
                                <iframe
                                  src={`https://www.youtube.com/embed/${v.youtube_id}`}
                                  title={v.title}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                              <div className="p-5 space-y-3">
                                <div className="text-xs text-[#008F9F] font-semibold">{v.subject_name} · {v.topic}</div>
                                <h2 className="font-display font-bold text-base">{v.title}</h2>
                                <p className={`text-xs ${mutedText}`}>{v.description}</p>
                                <div className="flex items-center gap-3 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => handleVideoToggle(v.id, { completed: !v.completed })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                      v.completed ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {v.completed ? 'Completed ✓' : 'Mark Completed'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleVideoToggle(v.id, { saved_favorite: !v.saved_favorite })}
                                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                      v.saved_favorite ? 'bg-[#EAF9FB] border-[#008F9F] text-[#008F9F]' : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    <Heart className="w-3.5 h-3.5" /> {v.saved_favorite ? 'Saved' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EDUNEXA AI TUTOR */}
              {section === 'tutor' && (
                <div className={`rounded-2xl border ${cardBg} overflow-hidden flex flex-col h-[70vh]`}>
                  <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h1 className="font-display font-bold text-lg">EDUNEXA AI TUTOR</h1>
                      <p className={`text-xs ${mutedText}`}>Step-by-step academic guidance across your eligible subjects.</p>
                    </div>
                    <select
                      value={tutorSubject}
                      onChange={(e) => setTutorSubject(e.target.value)}
                      className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                    >
                      {(data?.subjects || []).filter((s: any) => s.is_eligible).map((s: any) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {tutorHistory.map((m, idx) => (
                      <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-2xl rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                            m.role === 'user'
                              ? 'bg-[#10243D] text-white'
                              : isDark
                              ? 'bg-slate-800 text-slate-100'
                              : 'bg-[#EAF9FB] text-[#10243D]'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {tutorBusy && <div className={`text-xs ${mutedText}`}>EDUNEXA AI TUTOR is preparing a step-by-step guide...</div>}
                  </div>

                  <form onSubmit={handleAskTutor} className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
                    <input
                      type="text"
                      value={tutorInput}
                      onChange={(e) => setTutorInput(e.target.value)}
                      placeholder="Ask a question, paste a maths step to check, or request practice tips..."
                      className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
                    />
                    <button
                      type="submit"
                      disabled={tutorBusy}
                      style={{ backgroundColor: accent }}
                      className="px-5 py-2.5 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      <Send className="w-4 h-4" /> Send
                    </button>
                  </form>
                </div>
              )}

              {/* INTERNATIONAL STUDENT COMMUNITY */}
              {section === 'community' && commData && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className={`lg:col-span-4 rounded-xl border ${cardBg} p-4 space-y-2 h-fit`}>
                    <h2 className="font-display font-bold text-sm px-2 py-1">Study Groups</h2>
                    {commData.isMinorSafeguard && (
                      <div className="p-2.5 rounded-lg bg-[#EAF9FB] text-[#10243D] text-xs">
                        Minor safety mode: group discussions are moderated and direct private messaging is disabled.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedGroupId(null)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${selectedGroupId === null ? 'bg-[#008F9F] text-white' : ''}`}
                    >
                      All Study Groups
                    </button>
                    {commData.groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGroupId(g.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${selectedGroupId === g.id ? 'bg-[#008F9F] text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>

                  <div className="lg:col-span-8 space-y-6">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const res = await apiFetch('/api/student/community/posts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(newPost),
                        });
                        if (res.ok) {
                          setNewPost({ ...newPost, title: '', body: '' });
                          loadCommunity(selectedGroupId);
                        }
                      }}
                      className={`rounded-xl border ${cardBg} ${padClass} space-y-3`}
                    >
                      <h2 className="font-display font-bold text-base">Share Study Notes or Ask a Question</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                          value={newPost.group_id}
                          onChange={(e) => setNewPost({ ...newPost, group_id: Number(e.target.value) })}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                        >
                          {commData.groups.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                        <input
                          required
                          type="text"
                          value={newPost.title}
                          onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                          placeholder="Discussion topic..."
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                        />
                      </div>
                      <textarea
                        required
                        rows={3}
                        value={newPost.body}
                        onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                        placeholder="Write your question, explanation, or exam reflection..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                      />
                      <button type="submit" style={{ backgroundColor: accent }} className="px-4 py-2 text-white text-xs font-semibold rounded-lg">
                        Publish Post
                      </button>
                    </form>

                    {commData.posts.map((p) => (
                      <div key={p.id} className={`rounded-xl border ${cardBg} ${padClass} space-y-3`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#008F9F]">{p.group_name} · {p.author_display}</span>
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch('/api/student/community/report', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ target_type: 'post', target_id: p.id, reason: 'Flagged for moderator review' }),
                              });
                              setBannerMsg('Post reported to Community Moderators.');
                            }}
                            className="inline-flex items-center gap-1 text-[#64748B] hover:text-red-600"
                          >
                            <Flag className="w-3 h-3" /> Report
                          </button>
                        </div>
                        <h3 className="font-display font-bold text-base">{p.title}</h3>
                        <p className="text-sm leading-relaxed">{p.body}</p>

                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                          {p.comments.map((c: any) => (
                            <div key={c.id} className="text-xs bg-[#F4F7FA] dark:bg-slate-800 p-2.5 rounded-lg">
                              <strong>{c.author_display}:</strong> {c.body}
                            </div>
                          ))}
                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const body = commentDrafts[p.id];
                              if (!body) return;
                              await apiFetch(`/api/student/community/posts/${p.id}/comments`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ body }),
                              });
                              setCommentDrafts({ ...commentDrafts, [p.id]: '' });
                              loadCommunity(selectedGroupId);
                            }}
                            className="flex gap-2 pt-1"
                          >
                            <input
                              type="text"
                              value={commentDrafts[p.id] || ''}
                              onChange={(e) => setCommentDrafts({ ...commentDrafts, [p.id]: e.target.value })}
                              placeholder="Add a helpful reply..."
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                            />
                            <button type="submit" className="px-3 py-1.5 bg-[#10243D] text-white text-xs font-semibold rounded-lg">
                              Reply
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CERTIFICATES & TESTIMONIAL SUBMISSION */}
              {section === 'certificates' && data && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h1 className="font-display font-bold text-xl">Your Verifiable Digital Certificates</h1>
                    {data.certificates.length === 0 ? (
                      <div className={`rounded-xl border ${cardBg} ${padClass} text-sm ${mutedText}`}>
                        No certificates earned yet. Complete a 60-day programme and pass its scheduled final examination to earn an official certificate.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {data.certificates.map((c: any) => (
                          <div key={c.id} className={`rounded-xl border ${cardBg} ${padClass} space-y-4`}>
                            <div className="flex items-center justify-between">
                              <EdunexaLogo variant="certificate" size="sm" />
                              <span className="font-mono-tabular text-xs font-bold text-[#008F9F]">{c.cert_number}</span>
                            </div>
                            <div>
                              <div className="font-display font-bold text-lg">{c.programme_title}</div>
                              <div className={`text-xs mt-1 ${mutedText}`}>
                                Awarded to {c.student_display_name} · Grade: {c.grade} ({c.score_percentage}%)
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => openCertVerifyPreview(c)}
                                style={{ backgroundColor: accent }}
                                className="px-4 py-2 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                              >
                                <Printer className="w-3.5 h-3.5" /> View / Print Certificate & QR
                              </button>
                              <Link
                                to={`/verify?code=${c.cert_number}`}
                                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg"
                              >
                                Public Registry Link
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {qrPreview && (
                    <div className="bg-white text-[#10243D] rounded-2xl border-2 border-[#10243D] p-8 space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                        <EdunexaLogo variant="certificate" />
                        <div className="flex items-center gap-3 no-print">
                          <button type="button" onClick={() => window.print()} className="px-4 py-2 bg-[#10243D] text-white text-xs font-semibold rounded-lg">
                            Print / Save PDF
                          </button>
                          <button type="button" onClick={() => setQrPreview(null)} className="text-xs text-[#64748B]">Close</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-8 space-y-3">
                          <div className="text-xs font-semibold text-[#008F9F]">OFFICIAL CERTIFICATE OF ACHIEVEMENT</div>
                          <h2 className="font-display font-extrabold text-3xl text-[#10243D]">{qrPreview.cert.student_display_name}</h2>
                          <p className="text-sm text-[#64748B]">has successfully completed all requirements and passed the qualifying final examination for:</p>
                          <div className="font-display font-bold text-xl text-[#10243D]">{qrPreview.cert.programme_title}</div>
                          <div className="text-xs text-[#64748B] pt-2 font-mono-tabular">
                            Grade: {qrPreview.cert.grade} ({qrPreview.cert.score_percentage}%) · Serial: {qrPreview.cert.cert_number} · Issued: {new Date(qrPreview.cert.issued_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="md:col-span-4 flex flex-col items-center">
                          <img src={qrPreview.qrUrl} alt="Certificate QR" className="w-36 h-36 border border-slate-200 p-1 rounded-lg" />
                          <span className="text-[11px] text-[#64748B] mt-1">Verify at /verify?code={qrPreview.cert.cert_number}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Testimonial with Optional Photo */}
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const fd = new FormData();
                      fd.append('display_name', testimonialForm.display_name || user.public_display_name || user.full_name);
                      fd.append('programme_title', testimonialForm.programme_title);
                      fd.append('achievement', testimonialForm.achievement || 'Verified EDUNEXA Learner');
                      fd.append('quote', testimonialForm.quote);
                      fd.append('certificate_number', testimonialForm.certificate_number);
                      fd.append('country', user.country);
                      if (testimonialPhoto) fd.append('photo', testimonialPhoto);

                      const res = await apiFetch('/api/public/testimonials', {
                        method: 'POST',
                        credentials: 'include',
                        body: fd,
                      });
                      const d = await res.json();
                      setBannerMsg(d.message || d.error || '');
                      if (res.ok) {
                        setTestimonialForm({ ...testimonialForm, achievement: '', quote: '' });
                        setTestimonialPhoto(null);
                      }
                    }}
                    className={`rounded-xl border ${cardBg} ${padClass} space-y-4`}
                  >
                    <h2 className="font-display font-bold text-lg">Submit a Student Success Story</h2>
                    <p className={`text-xs ${mutedText}`}>Submissions remain pending until reviewed and approved by an EDUNEXA administrator.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        required
                        type="text"
                        value={testimonialForm.display_name}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, display_name: e.target.value })}
                        placeholder="Approved display name"
                        className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                      />
                      <input
                        required
                        type="text"
                        value={testimonialForm.programme_title}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, programme_title: e.target.value })}
                        placeholder="Subject or exam track"
                        className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                      />
                      <input
                        required
                        type="text"
                        value={testimonialForm.achievement}
                        onChange={(e) => setTestimonialForm({ ...testimonialForm, achievement: e.target.value })}
                        placeholder="Achievement (e.g. Passed SAT Math)"
                        className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                      />
                    </div>
                    <textarea
                      required
                      rows={3}
                      value={testimonialForm.quote}
                      onChange={(e) => setTestimonialForm({ ...testimonialForm, quote: e.target.value })}
                      placeholder="Describe your learning experience on EDUNEXA..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-xs cursor-pointer">
                        <Upload className="w-4 h-4 text-[#008F9F]" />
                        <span>{testimonialPhoto ? testimonialPhoto.name : 'Optional Photo (JPG/PNG/WEBP)'}</span>
                        <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => setTestimonialPhoto(e.target.files?.[0] || null)} />
                      </label>
                      <button type="submit" style={{ backgroundColor: accent }} className="px-4 py-2 text-white text-xs font-semibold rounded-lg">
                        Submit for Approval
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* PROFILE, LEADERBOARD CONSENT & CUSTOMISATION */}
              {section === 'profile' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className={`lg:col-span-7 rounded-xl border ${cardBg} ${padClass} space-y-5`}>
                    <h1 className="font-display font-bold text-lg">Student Profile & Leaderboard Privacy</h1>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer text-xs flex items-center gap-2">
                        <Upload className="w-4 h-4 text-[#008F9F]" />
                        <span>Upload Profile Photo (JPG/PNG/WEBP)</span>
                        <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadPhoto(e.target.files[0], 'avatar')} />
                      </label>
                      <label className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 cursor-pointer text-xs flex items-center gap-2">
                        <Upload className="w-4 h-4 text-[#008F9F]" />
                        <span>Upload Cover Image (JPG/PNG/WEBP)</span>
                        <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadPhoto(e.target.files[0], 'cover')} />
                      </label>
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const res = await apiFetch('/api/auth/profile', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(profileForm),
                        });
                        if (res.ok) {
                          setBannerMsg('Profile and leaderboard preferences saved.');
                          await refreshUser();
                          await loadDashboard();
                        }
                      }}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">Full Legal Name (Private Records)</label>
                          <input
                            type="text"
                            value={profileForm.full_name}
                            onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Public Display Name (EDUNEXA Leaders)</label>
                          <input
                            type="text"
                            disabled={Boolean(user.is_minor)}
                            value={user.is_minor ? `@${user.username}` : profileForm.public_display_name}
                            onChange={(e) => setProfileForm({ ...profileForm, public_display_name: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent disabled:opacity-60"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">Department Stream</label>
                          <select
                            value={profileForm.department}
                            onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                          >
                            <option value="Science">Science</option>
                            <option value="Arts and Humanities">Arts and Humanities</option>
                            <option value="Commercial">Commercial</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">Country</label>
                          <input
                            type="text"
                            value={profileForm.country}
                            onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">Biography & Academic Interests</label>
                        <textarea
                          rows={3}
                          value={profileForm.bio}
                          onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                        />
                      </div>

                      <label className="flex items-start gap-2.5 p-3 rounded-lg bg-[#EAF9FB] dark:bg-slate-800 text-xs text-[#10243D] dark:text-slate-100">
                        <input
                          type="checkbox"
                          checked={profileForm.leaderboard_consent}
                          onChange={(e) => setProfileForm({ ...profileForm, leaderboard_consent: e.target.checked })}
                          className="mt-0.5"
                        />
                        <span>
                          <strong>Public Leaderboard Visibility Consent:</strong> Display my approved public display name and verified assessment scores on the public EDUNEXA LEADERS page. {user.is_minor ? '(Minor safeguard: only your anonymised handle @' + user.username + ' is ever shown publicly.)' : ''}
                        </span>
                      </label>

                      <button type="submit" style={{ backgroundColor: accent }} className="px-4 py-2 text-white text-xs font-semibold rounded-lg">
                        Save Profile & Privacy Preferences
                      </button>
                    </form>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const res = await apiFetch('/api/auth/password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(pwForm),
                        });
                        const d = await res.json();
                        setBannerMsg(d.message || d.error);
                        if (res.ok) setPwForm({ currentPassword: '', newPassword: '' });
                      }}
                      className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
                    >
                      <h2 className="font-display font-bold text-sm">Change Password</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="password"
                          required
                          placeholder="Current password"
                          value={pwForm.currentPassword}
                          onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                        />
                        <input
                          type="password"
                          required
                          minLength={8}
                          placeholder="New password"
                          value={pwForm.newPassword}
                          onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                          className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                        />
                      </div>
                      <button type="submit" className="px-4 py-2 bg-[#10243D] text-white text-xs font-semibold rounded-lg">
                        Update Password
                      </button>
                    </form>
                  </div>

                  {/* Personal Dashboard Customisation */}
                  <div className={`lg:col-span-5 rounded-xl border ${cardBg} ${padClass} space-y-5`}>
                    <div>
                      <h2 className="font-display font-bold text-lg">Dashboard Customisation</h2>
                      <p className={`text-xs mt-1 ${mutedText}`}>
                        Saved to your account across devices. Does not alter official EDUNEXA branding, exam interfaces, or certificates.
                      </p>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Personal Theme</span>
                        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <button type="button" onClick={() => updatePref({ theme: 'light' })} className={`px-3 py-1 rounded-md ${!isDark ? 'bg-white text-[#10243D] shadow-sm font-semibold' : ''}`}>Light</button>
                          <button type="button" onClick={() => updatePref({ theme: 'dark' })} className={`px-3 py-1 rounded-md ${isDark ? 'bg-slate-700 text-white shadow-sm font-semibold' : ''}`}>Dark</button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Accent Colour</span>
                        <div className="flex gap-2">
                          {['#008F9F', '#0284C7', '#0D9488', '#10243D'].map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              onClick={() => updatePref({ accent: hex })}
                              style={{ backgroundColor: hex }}
                              aria-label={`Select accent ${hex}`}
                              className={`w-6 h-6 rounded-full border-2 ${accent === hex ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Layout Density</span>
                        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <button type="button" onClick={() => updatePref({ density: 'spacious' })} className={`px-3 py-1 rounded-md ${prefs.density === 'spacious' ? 'bg-white dark:bg-slate-700 font-semibold' : ''}`}>Spacious</button>
                          <button type="button" onClick={() => updatePref({ density: 'compact' })} className={`px-3 py-1 rounded-md ${prefs.density === 'compact' ? 'bg-white dark:bg-slate-700 font-semibold' : ''}`}>Compact</button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Text Size</span>
                        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                          <button type="button" onClick={() => updatePref({ textSize: 'normal' })} className={`px-3 py-1 rounded-md ${prefs.textSize === 'normal' ? 'bg-white dark:bg-slate-700 font-semibold' : ''}`}>Standard</button>
                          <button type="button" onClick={() => updatePref({ textSize: 'large' })} className={`px-3 py-1 rounded-md ${prefs.textSize === 'large' ? 'bg-white dark:bg-slate-700 font-semibold' : ''}`}>Large</button>
                        </div>
                      </div>

                      <label className="flex items-center justify-between pt-2">
                        <span className="font-semibold">High Contrast Mode</span>
                        <input
                          type="checkbox"
                          checked={Boolean(prefs.highContrast)}
                          onChange={(e) => updatePref({ highContrast: e.target.checked })}
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <span className="font-semibold">Reduced Motion</span>
                        <input
                          type="checkbox"
                          checked={Boolean(prefs.reducedMotion)}
                          onChange={(e) => updatePref({ reducedMotion: e.target.checked })}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Inline Study Guide Reader Modal */}
          {readingMaterial && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className={`rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-5 border ${cardBg}`}>
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="text-xs font-semibold text-[#008F9F]">
                      {readingMaterial.subject_name} · {readingMaterial.topic_name} · {readingMaterial.material_type}
                    </div>
                    <h2 className="font-display font-bold text-xl mt-1">{readingMaterial.title}</h2>
                  </div>
                  <button type="button" onClick={() => setReadingMaterial(null)} className={`text-xs font-semibold ${mutedText}`}>
                    Close
                  </button>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{readingMaterial.content_body}</div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  {readingMaterial.document_url ? (
                    <a
                      href={readingMaterial.document_url}
                      target="_blank"
                      rel="noreferrer"
                      download={readingMaterial.document_name || true}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#008F9F] hover:underline"
                    >
                      <Download className="w-4 h-4" /> Download ({readingMaterial.document_name})
                    </a>
                  ) : (
                    <span className={`text-xs ${mutedText}`}>Mark completed once you finish reviewing this guide.</span>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      await handleMaterialToggle(readingMaterial.id, { completed: true });
                      setReadingMaterial(null);
                    }}
                    style={{ backgroundColor: accent }}
                    className="px-4 py-2 text-white text-xs font-semibold rounded-lg"
                  >
                    Complete & Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
