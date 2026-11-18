import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Database,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareQuote,
  Monitor,
  Palette,
  PlayCircle,
  Plus,
  RotateCcw,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { AdminOverviewCharts } from '../components/AdminOverviewCharts';
import { EdunexaLogo } from '../components/EdunexaLogo';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../utils/apiFetch';

const ADMIN_ROLES = ['super_admin', 'content_admin', 'academic_admin', 'community_moderator'];

export const AdminPortal: React.FC = () => {
  const { section: rawSection = 'overview' } = useParams();
  const navigate = useNavigate();
  const { user, authLoading, logout, refreshBootstrap } = useApp();

  // Map legacy route aliases cleanly
  const sectionMap: Record<string, string> = {
    dashboard: 'overview',
    questions: 'ai-generator',
    cms: 'customisation',
    moderation: 'testimonials',
    users: 'students',
  };
  const section = sectionMap[rawSection] || rawSection;

  const loggingOutRef = useRef(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [overview, setOverview] = useState<any>(null);

  // Students & Users
  const [usersList, setUsersList] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ full_name: '', email: '', username: '', password: '', role: 'academic_admin', country: 'United Kingdom' });

  // Leadership
  const [leadershipRows, setLeadershipRows] = useState<any[]>([]);

  // Subjects
  const [subjects, setSubjects] = useState<any[]>([]);
  const [newSubj, setNewSubj] = useState({
    code: '',
    name: '',
    group_name: 'Sciences',
    access_classification: 'Common / All Students',
    eligible_departments: ['Science'],
    description: '',
  });

  // AI Question Generator & Question Bank
  const [questions, setQuestions] = useState<any[]>([]);
  const [qFilter, setQFilter] = useState('all');
  const [qSubjFilter, setQSubjFilter] = useState('all');
  const [qExamFilter, setQExamFilter] = useState('all');
  const [qSearch, setQSearch] = useState('');
  const [aiForm, setAiForm] = useState({
    country: 'Nigeria',
    curriculum: 'WAEC / NECO / JAMB Syllabus',
    examFramework: 'WAEC',
    subject_id: 1,
    topicName: 'Quadratic Equations & Inequalities',
    academicLevel: 'Senior Secondary 3',
    difficulty: 'Intermediate',
    questionCount: 4,
    format: 'mcq',
    marksPerQuestion: 2,
    suggestedDurationMinutes: 20,
    language: 'English',
    scopeType: 'exam_specific',
    adminNotes: '',
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);
  const [editingQ, setEditingQ] = useState<any>(null);
  const [previewQ, setPreviewQ] = useState<any>(null);
  const [manualQ, setManualQ] = useState({
    subject_id: 1,
    topic_name: '',
    exam_framework: 'General Practice',
    academic_level: 'Senior Secondary',
    difficulty: 'Intermediate',
    format: 'mcq',
    question_text: '',
    optA: '',
    optB: '',
    optC: '',
    optD: '',
    correct_answer: '',
    explanation: '',
    marking_scheme: '',
    marks: 2,
    approval_status: 'draft',
  });

  // Exams, Schedules, Grading, Certificates
  const [examData, setExamData] = useState<any>(null);
  const [newExam, setNewExam] = useState({
    title: '',
    instructions: '',
    subject_id: 1,
    category: 'Practice Test',
    exam_framework: 'WAEC',
    duration_minutes: 25,
    pass_mark: 60,
    randomize_questions: true,
    is_60day_final: false,
    programme_id: '',
    question_ids: [] as number[],
  });
  const [newSchedule, setNewSchedule] = useState({
    exam_id: '',
    programme_id: '',
    title: '',
    scheduled_start: '',
    scheduled_end: '',
    timezone: 'UTC',
    instructions: '',
  });
  const [newProg, setNewProg] = useState({
    title: '',
    description: '',
    subject_id: 1,
    department: 'All',
    min_days: 60,
    required_lessons: 1,
    required_practice_exams: 1,
    pass_mark: 65,
  });
  const [gradingAttempt, setGradingAttempt] = useState<any>(null);
  const [gradeForm, setGradeForm] = useState({ manual_score: 0, feedback: '', reason: 'Reviewed by Academic Administrator', issue_certificate: false });
  const [aiRubric, setAiRubric] = useState<any[]>([]);

  // Learning Materials (Written Guides & Videos)
  const [materialsList, setMaterialsList] = useState<any[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    subject_id: 1,
    topic_name: '',
    material_type: 'Study Guide',
    summary: '',
    content_body: '',
    programme_id: '',
  });
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [videosList, setVideosList] = useState<any[]>([]);
  const [newVideo, setNewVideo] = useState({ title: '', description: '', youtube_url: '', subject_id: 1, topic: '', programme_id: '' });

  // Announcements
  const [announcementsList, setAnnouncementsList] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', body: '', banner_text: '', audience: 'all', is_banner: true });

  // Website Customisation, Media Manager & CMS
  const [cmsData, setCmsData] = useState<any>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [selectedSlotKey, setSelectedSlotKey] = useState('homepage_hero');
  const [mediaFilter, setMediaFilter] = useState('');
  const [uploadMeta, setUploadMeta] = useState({ title: '', alt_text: '', category: 'Hero & Banners', assign_draft_slot: 'homepage_hero' });
  const [heroEditor, setHeroEditor] = useState<any>({});
  const [aboutEditor, setAboutEditor] = useState<any>({});
  const [contactEditor, setContactEditor] = useState<any>({});
  const [appearanceEditor, setAppearanceEditor] = useState<any>({});
  const [showLiveDraftPreview, setShowLiveDraftPreview] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '', category: 'General' });

  // Moderation & Testimonials
  const [modData, setModData] = useState<any>(null);
  const [editingTestimonial, setEditingTestimonial] = useState<any>(null);

  const loadSectionData = useCallback(async () => {
    if (!user || !ADMIN_ROLES.includes(user.role)) return;

    const ovRes = await apiFetch('/api/admin/overview', { credentials: 'include' });
    if (ovRes.ok) setOverview(await ovRes.json());

    if (['super_admin', 'academic_admin', 'content_admin'].includes(user.role)) {
      const sRes = await apiFetch('/api/admin/subjects', { credentials: 'include' });
      if (sRes.ok) {
        const sd = await sRes.json();
        setSubjects(sd.subjects || []);
        if (sd.subjects?.length) {
          const firstId = sd.subjects[0].id;
          setAiForm((prev) => ({ ...prev, subject_id: prev.subject_id || firstId }));
          setManualQ((prev) => ({ ...prev, subject_id: prev.subject_id || firstId }));
          setNewExam((prev) => ({ ...prev, subject_id: prev.subject_id || firstId }));
          setNewProg((prev) => ({ ...prev, subject_id: prev.subject_id || firstId }));
          setNewMaterial((prev) => ({ ...prev, subject_id: prev.subject_id || firstId }));
          setNewVideo((prev) => ({ ...prev, subject_id: prev.subject_id || firstId }));
        }
      }

      const matRes = await apiFetch('/api/admin/materials', { credentials: 'include' });
      if (matRes.ok) setMaterialsList((await matRes.json()).materials || []);

      const vRes = await apiFetch('/api/admin/videos', { credentials: 'include' });
      if (vRes.ok) setVideosList((await vRes.json()).videos || []);

      const aRes = await apiFetch('/api/admin/announcements', { credentials: 'include' });
      if (aRes.ok) setAnnouncementsList((await aRes.json()).announcements || []);
    }

    if (['super_admin', 'academic_admin'].includes(user.role)) {
      const qRes = await apiFetch('/api/admin/questions', { credentials: 'include' });
      if (qRes.ok) setQuestions((await qRes.json()).questions || []);

      const eRes = await apiFetch('/api/admin/exams-and-grading', { credentials: 'include' });
      if (eRes.ok) setExamData(await eRes.json());
    }

    if (['super_admin', 'content_admin'].includes(user.role)) {
      const cRes = await apiFetch('/api/admin/cms', { credentials: 'include' });
      if (cRes.ok) {
        const cd = await cRes.json();
        setCmsData(cd);
        const heroB = cd.blocks.find((b: any) => b.block_key === 'hero');
        const aboutB = cd.blocks.find((b: any) => b.block_key === 'about');
        const contactB = cd.blocks.find((b: any) => b.block_key === 'contact');
        if (heroB) setHeroEditor(heroB.draft_content || heroB.content || {});
        if (aboutB) setAboutEditor(aboutB.draft_content || aboutB.content || {});
        if (contactB) setContactEditor(contactB.draft_content || contactB.content || {});
        if (cd.appearance) setAppearanceEditor(cd.appearance.draft || cd.appearance.active || {});
      }
    }

    if (['super_admin', 'community_moderator', 'content_admin'].includes(user.role)) {
      const mRes = await apiFetch('/api/admin/moderation', { credentials: 'include' });
      if (mRes.ok) setModData(await mRes.json());
    }

    if (['super_admin', 'academic_admin', 'community_moderator'].includes(user.role)) {
      const uRes = await apiFetch('/api/admin/users', { credentials: 'include' });
      if (uRes.ok) setUsersList((await uRes.json()).users || []);

      const lRes = await apiFetch('/api/admin/leadership', { credentials: 'include' });
      if (lRes.ok) setLeadershipRows((await lRes.json()).leaders || []);
    }
  }, [user]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(e.target as Node)) {
        setAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        if (!loggingOutRef.current) {
          navigate('/admin/login', { replace: true });
        }
        return;
      }
      if (!ADMIN_ROLES.includes(user.role)) {
        navigate('/student/dashboard', { replace: true });
        return;
      }
      loggingOutRef.current = false;
      loadSectionData();
    }
  }, [authLoading, user, navigate, loadSectionData]);

  const handleAdminLogout = async () => {
    loggingOutRef.current = true;
    setAdminMenuOpen(false);
    setMobileMenu(false);
    await logout();
    navigate('/admin/login', { replace: true });
  };

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[#64748B]">Verifying administrator session...</div>;
  }

  const isSuper = user.role === 'super_admin';
  const canAcademic = isSuper || user.role === 'academic_admin';
  const canContent = isSuper || user.role === 'content_admin';
  const canMod = isSuper || user.role === 'community_moderator' || user.role === 'content_admin';
  const canStudents = isSuper || user.role === 'academic_admin' || user.role === 'community_moderator';
  const canAnnouncements = isSuper || user.role === 'content_admin' || user.role === 'academic_admin';

  // Exact 13 Requested Admin Navigation Sections
  const navItems = [
    { id: 'overview', label: '1. Overview', icon: LayoutDashboard, show: true },
    { id: 'students', label: '2. Student Management', icon: Users, show: canStudents },
    { id: 'ai-generator', label: '3. AI Question Generator', icon: Bot, show: canAcademic },
    { id: 'question-bank', label: '4. Question Bank', icon: Database, show: canAcademic },
    { id: 'exams', label: '5. Examination Management', icon: FileText, show: canAcademic },
    { id: 'subjects', label: '6. Subject Management', icon: BookOpen, show: canAcademic },
    { id: 'customisation', label: '7. Website Customisation', icon: Palette, show: canContent },
    { id: 'media', label: '8. Image & Media Manager', icon: ImageIcon, show: canContent },
    { id: 'leadership', label: '9. Student Leadership', icon: Trophy, show: canStudents },
    { id: 'testimonials', label: '10. Testimonials', icon: MessageSquareQuote, show: canMod },
    { id: 'learning-materials', label: '11. Learning Materials', icon: PlayCircle, show: canAcademic || canContent },
    { id: 'announcements', label: '12. Announcements', icon: Megaphone, show: canAnnouncements },
    { id: 'settings', label: '13. Website Settings', icon: Settings, show: canContent || isSuper },
  ].filter((n) => n.show);

  const handleGenerateAiQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiLoading(true);
    setAiReport(null);
    setNotice('');
    try {
      const res = await apiFetch('/api/admin/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(aiForm),
      });
      const d = await res.json();
      if (!res.ok) {
        setNotice(d.error || 'AI generation failed.');
      } else {
        setAiReport(d);
        setNotice(`Generated ${d.savedIds.length} DRAFT questions saved for human preview, editing, approval, and publishing.`);
        await loadSectionData();
      }
    } finally {
      setAiLoading(false);
    }
  };

  const updateQuestionStatus = async (qId: number, status: 'draft' | 'approved' | 'published' | 'archived') => {
    const res = await apiFetch(`/api/admin/questions/${qId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ approval_status: status }),
    });
    if (res.ok) {
      setNotice(`Question #${qId} marked as ${status.toUpperCase()}.`);
      await loadSectionData();
      await refreshBootstrap();
    }
  };

  const deleteQuestion = async (qId: number) => {
    const res = await apiFetch(`/api/admin/questions/${qId}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) {
      setNotice(`Question #${qId} deleted from Question Bank.`);
      await loadSectionData();
      await refreshBootstrap();
    }
  };

  const handleUploadMedia = async (file: File, explicitSlot?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', uploadMeta.title || file.name);
    fd.append('alt_text', uploadMeta.alt_text || uploadMeta.title || file.name);
    fd.append('category', uploadMeta.category);
    const targetSlot = explicitSlot ?? uploadMeta.assign_draft_slot;
    if (targetSlot) {
      fd.append('assign_draft_slot', targetSlot);
    }
    const res = await apiFetch('/api/admin/media/upload', { method: 'POST', credentials: 'include', body: fd });
    const d = await res.json();
    if (!res.ok) setNotice(d.error || 'Media upload failed.');
    else {
      setNotice(`Image uploaded to persistent storage (${d.url}) and assigned as draft for "${targetSlot || 'library'}". Click Publish Changes Live to display publicly.`);
      await loadSectionData();
    }
  };

  const activeSlot = cmsData?.slots?.find((s: any) => s.slot_key === selectedSlotKey);
  const aiStatus = overview?.aiStatus;

  const renderQuestionRow = (q: any) => (
    <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[#64748B]">
          <strong className="text-[#10243D]">{q.subject_name}</strong> · {q.topic_name} · {q.exam_framework} · {q.difficulty} ·{' '}
          <span className="uppercase">{q.format === 'essay' ? 'Theory' : q.format}</span> ·{' '}
          <span className="font-mono-tabular">{q.marks}m</span>
          {q.ai_generated === 1 && <span className="ml-2 text-[#008F9F] font-semibold">AI Generated</span>}
          {q.source_gap_flagged === 1 && <span className="ml-2 text-amber-700 font-semibold">Source Gap Flagged</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`font-semibold uppercase mr-1 ${
              q.approval_status === 'published'
                ? 'text-emerald-700'
                : q.approval_status === 'approved'
                ? 'text-[#008F9F]'
                : q.approval_status === 'draft'
                ? 'text-amber-700'
                : 'text-slate-500'
            }`}
          >
            [{q.approval_status}]
          </span>
          <button type="button" onClick={() => setPreviewQ(q)} className="px-2.5 py-1 border border-slate-200 rounded-md hover:border-[#008F9F] inline-flex items-center gap-1">
            <Eye className="w-3 h-3" /> Preview
          </button>
          <button type="button" onClick={() => setEditingQ({ ...q, options: Array.isArray(q.options) ? q.options : [] })} className="px-2.5 py-1 border border-slate-200 rounded-md hover:border-[#008F9F]">
            Edit
          </button>
          {q.approval_status !== 'draft' && (
            <button type="button" onClick={() => updateQuestionStatus(q.id, 'draft')} className="px-2.5 py-1 border border-slate-200 rounded-md hover:border-amber-500 text-amber-700">
              Save for Later
            </button>
          )}
          {q.approval_status === 'draft' && (
            <button type="button" onClick={() => updateQuestionStatus(q.id, 'approved')} className="px-2.5 py-1 bg-[#10243D] text-white rounded-md font-semibold">
              Approve
            </button>
          )}
          {q.approval_status !== 'published' && (
            <button type="button" onClick={() => updateQuestionStatus(q.id, 'published')} className="px-2.5 py-1 bg-[#008F9F] text-white rounded-md font-semibold">
              Publish Live
            </button>
          )}
          <button type="button" onClick={() => deleteQuestion(q.id)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-md" aria-label="Delete question">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-sm font-medium text-[#10243D]">{q.question_text}</p>
      {Array.isArray(q.options) && q.options.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#64748B]">
          {q.options.map((opt: string, i: number) => (
            <div key={i} className={`px-2.5 py-1 rounded border ${opt === q.correct_answer ? 'border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold' : 'border-slate-100 bg-[#F4F7FA]'}`}>
              {String.fromCharCode(65 + i)}. {opt}
            </div>
          ))}
        </div>
      )}
      <div className="text-[#64748B]">
        <strong className="text-[#10243D]">Answer:</strong> {q.correct_answer}
        {q.marking_scheme && (
          <span className="block mt-1">
            <strong className="text-[#10243D]">Marking Scheme:</strong> {q.marking_scheme}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F7FA] text-[#10243D]">
      {/* Admin Sidebar (13 Sections) */}
      <aside className="hidden lg:flex w-64 flex-col bg-[#10243D] text-white border-r border-slate-800 shrink-0">
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <EdunexaLogo variant="light" size="sm" />
        </div>
        <div className="px-5 py-3 border-b border-slate-800 text-xs text-slate-300">
          <div className="font-semibold text-white">{user.full_name}</div>
          <div className="text-[#90DFEC] capitalize mt-0.5">{user.role.replace('_', ' ')}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/admin/${item.id}`)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  active ? 'bg-[#008F9F] text-white font-semibold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link to="/" className="block px-3 py-2 text-xs text-slate-300 hover:text-white">
            View Public Website →
          </Link>
          <button
            type="button"
            onClick={handleAdminLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-300 hover:bg-slate-800"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenu(!mobileMenu)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle admin menu"
            >
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="font-display font-bold text-base sm:text-lg capitalize">
              Admin Console · {section.replace(/-/g, ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/?preview=draft" className="hidden sm:inline text-xs font-semibold text-[#10243D] hover:text-[#008F9F] whitespace-nowrap">
              Draft Preview
            </Link>
            <Link to="/" className="hidden sm:inline text-xs font-semibold text-[#008F9F] hover:underline whitespace-nowrap">
              Live Site
            </Link>

            <div className="relative" ref={adminMenuRef}>
              <button
                type="button"
                onClick={() => setAdminMenuOpen((o) => !o)}
                aria-expanded={adminMenuOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-[#EAF9FB] transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-full bg-[#10243D] text-white font-bold text-[10px] flex items-center justify-center">
                  {user.full_name.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-[#10243D] max-w-[140px] truncate">{user.full_name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              {adminMenuOpen && (
                <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <div className="text-xs font-bold text-[#10243D] truncate">{user.full_name}</div>
                    <div className="text-[11px] text-[#008F9F] capitalize">{user.role.replace('_', ' ')}</div>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAdminMenuOpen(false);
                      navigate('/admin/dashboard');
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#10243D] hover:bg-[#EAF9FB]"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#008F9F]" /> Admin Dashboard
                  </button>
                  <Link
                    to="/"
                    role="menuitem"
                    onClick={() => setAdminMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-[#10243D] hover:bg-[#EAF9FB]"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#008F9F]" /> View Live Site
                  </Link>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleAdminLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
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
          <div className="lg:hidden bg-white border-b border-slate-200 p-3 space-y-1 max-h-96 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigate(`/admin/${item.id}`);
                  setMobileMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  section === item.id ? 'bg-[#008F9F] text-white font-semibold' : 'hover:bg-[#EAF9FB]'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleAdminLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {notice && (
            <div className="p-3.5 rounded-xl bg-[#EAF9FB] border border-[#90DFEC] text-sm text-[#10243D] flex items-center justify-between gap-4">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice('')} className="text-xs text-[#64748B] shrink-0">Dismiss</button>
            </div>
          )}

          {/* 1. OVERVIEW */}
          {section === 'overview' && overview && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Active Students', val: overview.stats.students },
                  { label: 'Published Questions', val: overview.stats.publishedQuestions },
                  { label: 'Drafts Awaiting Review', val: overview.stats.draftQuestions },
                  { label: 'Pending Grading', val: overview.stats.pendingGrading },
                  { label: 'Pending Testimonials', val: overview.stats.pendingTestimonials },
                  { label: 'Valid Certificates', val: overview.stats.certificatesIssued },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="text-xs text-[#64748B]">{s.label}</div>
                    <div className="font-mono-tabular text-2xl font-bold text-[#10243D] mt-1">{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Data Visualization Suite (Recharts) */}
              <AdminOverviewCharts
                analytics={overview.analytics}
                onNavigate={navigate}
                canAcademic={canAcademic}
              />

              {/* Pending Administrative Tasks */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-display font-bold text-base">Pending Tasks & Operational Alerts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="font-semibold text-[#10243D]">AI Question Drafts</div>
                      <div className="text-[#64748B] mt-1">{overview.stats.draftQuestions} draft question(s) awaiting approval or publishing.</div>
                    </div>
                    {canAcademic && (
                      <button type="button" onClick={() => navigate('/admin/question-bank')} className="text-[#008F9F] font-semibold text-left hover:underline">
                        Review Question Bank →
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="font-semibold text-[#10243D]">Subjective Exam Grading</div>
                      <div className="text-[#64748B] mt-1">{overview.stats.pendingGrading} submitted exam(s) awaiting manual marking.</div>
                    </div>
                    {canAcademic && (
                      <button type="button" onClick={() => navigate('/admin/exams')} className="text-[#008F9F] font-semibold text-left hover:underline">
                        Open Grading Queue →
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="font-semibold text-[#10243D]">Pending Testimonials</div>
                      <div className="text-[#64748B] mt-1">{overview.stats.pendingTestimonials} learner story submission(s) waiting for approval.</div>
                    </div>
                    {canMod && (
                      <button type="button" onClick={() => navigate('/admin/testimonials')} className="text-[#008F9F] font-semibold text-left hover:underline">
                        Moderate Testimonials →
                      </button>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="font-semibold text-[#10243D]">Gemini AI Status</div>
                      <div className={`mt-1 font-semibold ${aiStatus?.configured ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {aiStatus?.configured ? 'Configured & Ready' : 'API Key Not Configured'}
                      </div>
                    </div>
                    <button type="button" onClick={() => navigate('/admin/settings')} className="text-[#008F9F] font-semibold text-left hover:underline">
                      View Configuration →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h2 className="font-display font-bold text-base">Administrative Audit Trail</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-[#64748B] border-b border-slate-200">
                      <tr>
                        <th className="text-left py-2">Timestamp</th>
                        <th className="text-left py-2">Actor</th>
                        <th className="text-left py-2">Action</th>
                        <th className="text-left py-2">Target</th>
                        <th className="text-left py-2">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {overview.recentAudit.map((log: any) => (
                        <tr key={log.id}>
                          <td className="py-2.5 font-mono-tabular text-[#64748B]">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="py-2.5 font-medium">{log.actor_name || log.actor_role}</td>
                          <td className="py-2.5 font-mono-tabular text-[#008F9F]">{log.action}</td>
                          <td className="py-2.5">{log.target}</td>
                          <td className="py-2.5 text-[#64748B]">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. STUDENT MANAGEMENT */}
          {section === 'students' && canStudents && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-lg">Student & Account Management</h2>
                  <p className="text-[#64748B]">Manage learner accounts, academic streams, leaderboard visibility moderation, and RBAC roles.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isSuper && (
                    <button
                      type="button"
                      onClick={() => setShowCreateAdmin(!showCreateAdmin)}
                      className="px-3.5 py-2 rounded-lg bg-[#10243D] text-white font-semibold inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> {showCreateAdmin ? 'Hide Admin Form' : 'Create Administrator'}
                    </button>
                  )}
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search by name, email, or stream..."
                    className="px-3 py-2 rounded-lg border border-slate-300 w-64"
                  />
                </div>
              </div>

              {isSuper && showCreateAdmin && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await apiFetch('/api/admin/administrators', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify(newAdmin),
                    });
                    const d = await res.json();
                    setNotice(res.ok ? `Administrator account created for ${d.user?.email}.` : d.error);
                    if (res.ok) {
                      setNewAdmin({ full_name: '', email: '', username: '', password: '', role: 'academic_admin', country: 'United Kingdom' });
                      setShowCreateAdmin(false);
                      await loadSectionData();
                    }
                  }}
                  className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 space-y-3"
                >
                  <div className="font-semibold text-[#10243D]">Provision New Administrator Account (Super Admin Only)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    <input required placeholder="Full Name" value={newAdmin.full_name} onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white" />
                    <input required type="email" placeholder="Staff Email" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white" />
                    <input required placeholder="Username" value={newAdmin.username} onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white" />
                    <input required type="password" placeholder="Password (8+ chars)" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white" />
                    <select value={newAdmin.role} onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      <option value="academic_admin">Academic Admin</option>
                      <option value="content_admin">Content Admin</option>
                      <option value="community_moderator">Community Moderator</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-[#008F9F] text-white font-semibold">
                      Create Staff
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-[#64748B] border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2.5">Student / User</th>
                      <th className="text-left py-2.5">Public Display</th>
                      <th className="text-left py-2.5">Stream</th>
                      <th className="text-right py-2.5">Attempts / Avg</th>
                      <th className="text-left py-2.5 pl-4">Leaderboard</th>
                      <th className="text-left py-2.5">Role</th>
                      <th className="text-right py-2.5">Account</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList
                      .filter(
                        (u) =>
                          u.full_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          u.department.toLowerCase().includes(studentSearch.toLowerCase())
                      )
                      .map((u) => (
                        <tr key={u.id}>
                          <td className="py-3">
                            <div className="font-semibold">{u.full_name} {u.is_minor ? '(Minor)' : ''}</div>
                            <div className="text-[#64748B]">{u.email} · @{u.username}</div>
                          </td>
                          <td className="py-3">{u.public_display_name || u.full_name}</td>
                          <td className="py-3">{u.department}</td>
                          <td className="py-3 text-right font-mono-tabular">
                            {u.attempts_count || 0} · {u.avg_score !== null ? `${u.avg_score}%` : '—'}
                          </td>
                          <td className="py-3 pl-4">
                            {u.role === 'student' ? (
                              <button
                                type="button"
                                onClick={async () => {
                                  await apiFetch(`/api/admin/users/${u.id}/leaderboard`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({ leaderboard_hidden: !u.leaderboard_hidden }),
                                  });
                                  await loadSectionData();
                                  await refreshBootstrap();
                                }}
                                className={`px-2.5 py-1 rounded border font-semibold ${
                                  u.leaderboard_hidden ? 'border-amber-300 bg-amber-50 text-amber-800' : u.leaderboard_consent ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-[#64748B]'
                                }`}
                              >
                                {u.leaderboard_hidden ? 'Hidden by Admin (Show)' : u.leaderboard_consent ? 'Public (Hide)' : 'No Consent'}
                              </button>
                            ) : (
                              <span className="text-[#64748B]">Staff</span>
                            )}
                          </td>
                          <td className="py-3">
                            {isSuper ? (
                              <select
                                value={u.role}
                                onChange={async (e) => {
                                  await apiFetch(`/api/admin/users/${u.id}/role`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({ role: e.target.value }),
                                  });
                                  await loadSectionData();
                                }}
                                className="px-2 py-1 border border-slate-300 rounded-md bg-white"
                              >
                                <option value="student">Student</option>
                                <option value="academic_admin">Academic Admin</option>
                                <option value="content_admin">Content Admin</option>
                                <option value="community_moderator">Community Moderator</option>
                                <option value="super_admin">Super Admin</option>
                              </select>
                            ) : (
                              <span className="capitalize">{u.role.replace('_', ' ')}</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={async () => {
                                const nextStatus = u.status === 'active' ? 'suspended' : 'active';
                                await apiFetch(`/api/admin/users/${u.id}/leaderboard`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ status: nextStatus }),
                                });
                                await loadSectionData();
                              }}
                              className={`font-semibold hover:underline ${u.status === 'active' ? 'text-red-600' : 'text-emerald-700'}`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. AI QUESTION GENERATOR */}
          {section === 'ai-generator' && canAcademic && (
            <div className="space-y-6">
              {aiStatus && !aiStatus.configured && (
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-2 text-xs">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700" /> Gemini AI API Credentials Required
                  </div>
                  <p>{aiStatus.message}</p>
                  <p className="text-amber-800">
                    To enable AI Question Generation: open the AI Studio <strong>Secrets</strong> panel (or <code>.env</code>), set <code>GEMINI_API_KEY</code> to a valid Google Gemini API key, and restart the server. Manual Question Bank creation remains available right now.
                  </p>
                </div>
              )}

              <form onSubmit={handleGenerateAiQuestions} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h2 className="font-display font-bold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#008F9F]" /> Google Gemini AI Question Generator
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Generates curriculum-aligned Multiple Choice (with Options A–D, Correct Answer & Explanation) or Theory (with Expected Answer, Marking Scheme & Total Marks) questions. All generated questions are saved strictly as <strong>DRAFTS</strong> first.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">Subject</label>
                    <select value={aiForm.subject_id} onChange={(e) => setAiForm({ ...aiForm, subject_id: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.access_classification})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Topic / Syllabus Area</label>
                    <input required value={aiForm.topicName} onChange={(e) => setAiForm({ ...aiForm, topicName: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Class or Educational Level</label>
                    <input required value={aiForm.academicLevel} onChange={(e) => setAiForm({ ...aiForm, academicLevel: e.target.value })} placeholder="e.g. SS3 / Year 12 / Grade 11" className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Examination Type</label>
                    <select value={aiForm.examFramework} onChange={(e) => setAiForm({ ...aiForm, examFramework: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      {['WAEC', 'NECO', 'JAMB', 'General Practice', 'SAT', 'GMAT', 'IELTS', 'TOEFL', 'GCSE', 'A-Level'].map((ex) => (
                        <option key={ex} value={ex}>{ex}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Question Format</label>
                    <select value={aiForm.format} onChange={(e) => setAiForm({ ...aiForm, format: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      <option value="mcq">Multiple Choice (A–D)</option>
                      <option value="essay">Theory (with Marking Scheme)</option>
                      <option value="Mixed">Mixed (Multiple Choice + Theory)</option>
                      <option value="true_false">True / False</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Difficulty Level</label>
                    <select value={aiForm.difficulty} onChange={(e) => setAiForm({ ...aiForm, difficulty: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      <option value="Easy">Easy</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Number of Questions</label>
                    <input type="number" min={1} max={10} value={aiForm.questionCount} onChange={(e) => setAiForm({ ...aiForm, questionCount: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Marks per Question</label>
                    <input type="number" min={1} max={20} value={aiForm.marksPerQuestion} onChange={(e) => setAiForm({ ...aiForm, marksPerQuestion: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <input value={aiForm.country} onChange={(e) => setAiForm({ ...aiForm, country: e.target.value })} placeholder="Country / Region" className="px-3 py-2 rounded-lg border border-slate-300" />
                  <input value={aiForm.curriculum} onChange={(e) => setAiForm({ ...aiForm, curriculum: e.target.value })} placeholder="Curriculum standard" className="px-3 py-2 rounded-lg border border-slate-300" />
                  <input value={aiForm.adminNotes} onChange={(e) => setAiForm({ ...aiForm, adminNotes: e.target.value })} placeholder="Optional instructions (e.g. include word problems)" className="px-3 py-2 rounded-lg border border-slate-300" />
                </div>

                <button
                  type="submit"
                  disabled={aiLoading || (aiStatus && !aiStatus.configured)}
                  className="px-5 py-2.5 bg-[#008F9F] hover:bg-[#007482] text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  {aiLoading ? 'Generating Curriculum-Aligned Drafts...' : 'Generate Questions'}
                </button>

                {aiReport && (
                  <div className="mt-4 p-4 rounded-xl bg-[#EAF9FB] border border-[#90DFEC] space-y-3 text-xs">
                    {aiReport.sourceGapFlagged && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        No verified external syllabus document was retrieved automatically. Review these drafts carefully before approving.
                      </div>
                    )}
                    <div>
                      <strong>Curriculum Context:</strong>
                      <p className="text-[#64748B] mt-1 whitespace-pre-wrap">{aiReport.curriculumSummary}</p>
                    </div>
                    {aiReport.sourceReferences?.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {aiReport.sourceReferences.map((ref: any, idx: number) => (
                          <a key={idx} href={ref.url} target="_blank" rel="noreferrer" className="text-[#008F9F] hover:underline inline-flex items-center gap-1">
                            {ref.title} <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </form>

              {/* Draft Questions Awaiting Review */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-base">Draft Questions Awaiting Preview, Approval & Publishing</h2>
                    <p className="text-xs text-[#64748B]">Only questions marked as PUBLISHED become available to students.</p>
                  </div>
                  <button type="button" onClick={() => navigate('/admin/question-bank')} className="text-xs font-semibold text-[#008F9F] hover:underline">
                    Open Full Question Bank →
                  </button>
                </div>
                <div className="space-y-3">
                  {questions.filter((q) => q.approval_status === 'draft').length === 0 ? (
                    <p className="text-xs text-[#64748B]">No draft questions waiting right now.</p>
                  ) : (
                    questions.filter((q) => q.approval_status === 'draft').map(renderQuestionRow)
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. QUESTION BANK */}
          {section === 'question-bank' && canAcademic && (
            <div className="space-y-6">
              {/* Manual Question Creation */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const options = manualQ.format === 'mcq' ? [manualQ.optA, manualQ.optB, manualQ.optC, manualQ.optD].filter(Boolean) : manualQ.format === 'true_false' ? ['True', 'False'] : [];
                  const res = await apiFetch('/api/admin/questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ ...manualQ, options }),
                  });
                  const d = await res.json();
                  if (!res.ok) setNotice(d.error);
                  else {
                    setNotice(`Question added as ${manualQ.approval_status.toUpperCase()}.`);
                    setManualQ({ ...manualQ, question_text: '', optA: '', optB: '', optC: '', optD: '', correct_answer: '', explanation: '', marking_scheme: '' });
                    await loadSectionData();
                    await refreshBootstrap();
                  }
                }}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-xs"
              >
                <h2 className="font-display font-bold text-base">Add Question Manually</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <select value={manualQ.subject_id} onChange={(e) => setManualQ({ ...manualQ, subject_id: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input required placeholder="Topic" value={manualQ.topic_name} onChange={(e) => setManualQ({ ...manualQ, topic_name: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                  <select value={manualQ.exam_framework} onChange={(e) => setManualQ({ ...manualQ, exam_framework: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    {['WAEC', 'NECO', 'JAMB', 'General Practice', 'SAT', 'GMAT', 'IELTS', 'TOEFL', 'GCSE'].map((ex) => <option key={ex} value={ex}>{ex}</option>)}
                  </select>
                  <select value={manualQ.format} onChange={(e) => setManualQ({ ...manualQ, format: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="mcq">Multiple Choice</option>
                    <option value="essay">Theory</option>
                    <option value="true_false">True / False</option>
                  </select>
                  <select value={manualQ.difficulty} onChange={(e) => setManualQ({ ...manualQ, difficulty: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="Easy">Easy</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                  <select value={manualQ.approval_status} onChange={(e) => setManualQ({ ...manualQ, approval_status: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="draft">Save as Draft</option>
                    <option value="approved">Save as Approved</option>
                    <option value="published">Publish Immediately</option>
                  </select>
                </div>
                <textarea required rows={2} placeholder="Question prompt..." value={manualQ.question_text} onChange={(e) => setManualQ({ ...manualQ, question_text: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                {manualQ.format === 'mcq' && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                    <input required placeholder="Option A" value={manualQ.optA} onChange={(e) => setManualQ({ ...manualQ, optA: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                    <input required placeholder="Option B" value={manualQ.optB} onChange={(e) => setManualQ({ ...manualQ, optB: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                    <input required placeholder="Option C" value={manualQ.optC} onChange={(e) => setManualQ({ ...manualQ, optC: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                    <input required placeholder="Option D" value={manualQ.optD} onChange={(e) => setManualQ({ ...manualQ, optD: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input required placeholder={manualQ.format === 'essay' ? 'Expected Model Answer' : 'Exact Correct Answer'} value={manualQ.correct_answer} onChange={(e) => setManualQ({ ...manualQ, correct_answer: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                  <input placeholder={manualQ.format === 'essay' ? 'Marking Scheme (e.g. 2m formula, 3m derivation)' : 'Explanation'} value={manualQ.format === 'essay' ? manualQ.marking_scheme : manualQ.explanation} onChange={(e) => setManualQ(manualQ.format === 'essay' ? { ...manualQ, marking_scheme: e.target.value } : { ...manualQ, explanation: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                  <input type="number" min={1} max={30} placeholder="Total Marks" value={manualQ.marks} onChange={(e) => setManualQ({ ...manualQ, marks: Number(e.target.value) })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                </div>
                <button type="submit" className="px-4 py-2 bg-[#10243D] text-white font-semibold rounded-lg inline-flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add to Question Bank
                </button>
              </form>

              {/* Filters & Organised Question Bank */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-1 p-1 bg-[#F4F7FA] rounded-lg text-xs">
                    {['all', 'draft', 'approved', 'published', 'archived'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setQFilter(st)}
                        className={`px-3 py-1 rounded-md capitalize font-semibold ${qFilter === st ? 'bg-white shadow-sm text-[#10243D]' : 'text-[#64748B]'}`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <select value={qSubjFilter} onChange={(e) => setQSubjFilter(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white">
                      <option value="all">All Subjects</option>
                      {subjects.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                    </select>
                    <select value={qExamFilter} onChange={(e) => setQExamFilter(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white">
                      <option value="all">All Exam Types</option>
                      {['WAEC', 'NECO', 'JAMB', 'SAT', 'GMAT', 'IELTS', 'TOEFL', 'GCSE', 'General Practice'].map((ex) => (
                        <option key={ex} value={ex}>{ex}</option>
                      ))}
                    </select>
                    <input value={qSearch} onChange={(e) => setQSearch(e.target.value)} placeholder="Search topic or text..." className="px-3 py-1.5 border border-slate-300 rounded-lg" />
                  </div>
                </div>

                <div className="space-y-3">
                  {questions
                    .filter((q) => qFilter === 'all' || q.approval_status === qFilter)
                    .filter((q) => qSubjFilter === 'all' || String(q.subject_id) === qSubjFilter)
                    .filter((q) => qExamFilter === 'all' || q.exam_framework === qExamFilter)
                    .filter((q) => !qSearch || q.question_text.toLowerCase().includes(qSearch.toLowerCase()) || q.topic_name.toLowerCase().includes(qSearch.toLowerCase()))
                    .map(renderQuestionRow)}
                </div>
              </div>
            </div>
          )}

          {/* 5. EXAMINATION MANAGEMENT */}
          {section === 'exams' && canAcademic && examData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await apiFetch('/api/admin/examinations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify(newExam),
                    });
                    const d = await res.json();
                    setNotice(res.ok ? 'Examination published.' : d.error);
                    if (res.ok) {
                      setNewExam({ ...newExam, title: '', instructions: '', question_ids: [] });
                      await loadSectionData();
                      await refreshBootstrap();
                    }
                  }}
                  className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-xs"
                >
                  <h2 className="font-display font-bold text-base">Build Examination from Published / Approved Questions</h2>
                  <input required placeholder="Examination Title" value={newExam.title} onChange={(e) => setNewExam({ ...newExam, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                  <textarea rows={2} placeholder="Examination Instructions" value={newExam.instructions} onChange={(e) => setNewExam({ ...newExam, instructions: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <select value={newExam.subject_id} onChange={(e) => setNewExam({ ...newExam, subject_id: Number(e.target.value), question_ids: [] })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <select value={newExam.category} onChange={(e) => setNewExam({ ...newExam, category: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      <option value="Practice Test">Practice Test</option>
                      <option value="Exam Preparation">Exam Preparation</option>
                      <option value="Subject Mock">Subject Mock</option>
                      <option value="Qualifying Final Exam">Qualifying Final Exam</option>
                    </select>
                    <select value={newExam.exam_framework} onChange={(e) => setNewExam({ ...newExam, exam_framework: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      {['WAEC', 'NECO', 'JAMB', 'SAT', 'GMAT', 'IELTS', 'TOEFL', 'GCSE', 'General Practice'].map((fx) => (
                        <option key={fx} value={fx}>{fx}</option>
                      ))}
                    </select>
                    <input type="number" placeholder="Duration (mins)" value={newExam.duration_minutes} onChange={(e) => setNewExam({ ...newExam, duration_minutes: Number(e.target.value) })} className="px-3 py-2 rounded-lg border border-slate-300" />
                    <input type="number" placeholder="Pass Mark (%)" value={newExam.pass_mark} onChange={(e) => setNewExam({ ...newExam, pass_mark: Number(e.target.value) })} className="px-3 py-2 rounded-lg border border-slate-300" />
                    <select value={newExam.programme_id} onChange={(e) => setNewExam({ ...newExam, programme_id: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      <option value="">Not linked to 60-Day Programme</option>
                      {(examData.programmes || []).map((p: any) => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 font-medium text-[#10243D]">
                    <input type="checkbox" checked={newExam.is_60day_final} onChange={(e) => setNewExam({ ...newExam, is_60day_final: e.target.checked })} />
                    Mark as 60-Day Qualifying Final Exam (requires 60-day programme completion)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1.5">
                    {questions
                      .filter((q) => (q.approval_status === 'published' || q.approval_status === 'approved') && q.subject_id === newExam.subject_id)
                      .map((q) => (
                        <label key={q.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={newExam.question_ids.includes(q.id)}
                            onChange={(e) => {
                              const next = e.target.checked ? [...newExam.question_ids, q.id] : newExam.question_ids.filter((x) => x !== q.id);
                              setNewExam({ ...newExam, question_ids: next });
                            }}
                          />
                          <span className="truncate">[{q.approval_status}] {q.question_text}</span>
                        </label>
                      ))}
                  </div>
                  <button type="submit" className="px-4 py-2 bg-[#008F9F] text-white font-semibold rounded-lg">Publish Examination</button>
                </form>

                <div className="space-y-6">
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const res = await apiFetch('/api/admin/schedules', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(newSchedule),
                      });
                      const d = await res.json();
                      setNotice(res.ok ? 'Examination scheduled and students notified.' : d.error);
                      if (res.ok) await loadSectionData();
                    }}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-xs"
                  >
                    <h2 className="font-display font-bold text-base">Schedule & Announce Examination</h2>
                    <select required value={newSchedule.exam_id} onChange={(e) => setNewSchedule({ ...newSchedule, exam_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      <option value="">Select examination...</option>
                      {examData.exams.map((ex: any) => <option key={ex.id} value={ex.id}>{ex.title}</option>)}
                    </select>
                    <input required placeholder="Cohort / Announcement Title" value={newSchedule.title} onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                    <div className="grid grid-cols-2 gap-2">
                      <input required type="datetime-local" value={newSchedule.scheduled_start} onChange={(e) => setNewSchedule({ ...newSchedule, scheduled_start: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300" />
                      <input required type="datetime-local" value={newSchedule.scheduled_end} onChange={(e) => setNewSchedule({ ...newSchedule, scheduled_end: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300" />
                    </div>
                    <button type="submit" className="px-4 py-2 bg-[#10243D] text-white font-semibold rounded-lg">Announce & Notify Students</button>
                  </form>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const res = await apiFetch('/api/admin/programmes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(newProg),
                      });
                      const d = await res.json();
                      setNotice(res.ok ? `60-Day Programme "${newProg.title}" created.` : d.error);
                      if (res.ok) {
                        setNewProg({ title: '', description: '', subject_id: subjects[0]?.id || 1, department: 'All', min_days: 60, required_lessons: 1, required_practice_exams: 1, pass_mark: 65 });
                        await loadSectionData();
                      }
                    }}
                    className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 text-xs"
                  >
                    <h2 className="font-display font-bold text-base">Create 60-Day Qualifying Programme</h2>
                    <input required placeholder="Programme Title" value={newProg.title} onChange={(e) => setNewProg({ ...newProg, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <select value={newProg.subject_id} onChange={(e) => setNewProg({ ...newProg, subject_id: Number(e.target.value) })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select value={newProg.department} onChange={(e) => setNewProg({ ...newProg, department: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                        <option value="All">All Departments</option>
                        <option value="Science">Science</option>
                        <option value="Arts and Humanities">Arts and Humanities</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                      <input type="number" min={1} placeholder="Min Days" value={newProg.min_days} onChange={(e) => setNewProg({ ...newProg, min_days: Number(e.target.value) })} className="px-3 py-2 rounded-lg border border-slate-300" />
                      <input type="number" min={1} placeholder="Pass %" value={newProg.pass_mark} onChange={(e) => setNewProg({ ...newProg, pass_mark: Number(e.target.value) })} className="px-3 py-2 rounded-lg border border-slate-300" />
                    </div>
                    <textarea rows={2} placeholder="Programme syllabus description..." value={newProg.description} onChange={(e) => setNewProg({ ...newProg, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                    <button type="submit" className="px-4 py-2 bg-[#008F9F] text-white font-semibold rounded-lg">Create Qualifying Programme</button>
                  </form>
                </div>
              </div>

              {/* 60-Day Monitor */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="font-display font-bold text-base">60-Day Qualifying Programme Enrolments</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-[#64748B] border-b border-slate-200">
                      <tr>
                        <th className="text-left py-2">Student</th>
                        <th className="text-left py-2">Programme</th>
                        <th className="text-right py-2">Elapsed Days</th>
                        <th className="text-right py-2">Lessons</th>
                        <th className="text-right py-2">Practice Exams</th>
                        <th className="text-right py-2">Final Eligibility</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {examData.enrolments.map((enr: any) => (
                        <tr key={enr.id}>
                          <td className="py-2.5 font-medium">{enr.student_name} ({enr.department})</td>
                          <td className="py-2.5">{enr.programme_title}</td>
                          <td className="py-2.5 text-right font-mono-tabular">{enr.elapsed_days} / {enr.min_days}d</td>
                          <td className="py-2.5 text-right font-mono-tabular">{enr.lessons_count}/{enr.required_lessons}</td>
                          <td className="py-2.5 text-right font-mono-tabular">{enr.practice_exams_completed}/{enr.required_practice_exams}</td>
                          <td className="py-2.5 text-right font-semibold">
                            <span className={enr.is_eligible ? 'text-emerald-700' : 'text-[#64748B]'}>
                              {enr.is_eligible ? 'Eligible for Final' : 'In Preparation'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Grading Queue */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="font-display font-bold text-base">Assessment Grading & Certificate Issuance</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-[#64748B] border-b border-slate-200">
                      <tr>
                        <th className="text-left py-2">Student</th>
                        <th className="text-left py-2">Examination</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-right py-2">Score</th>
                        <th className="text-right py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {examData.attempts.map((a: any) => (
                        <tr key={a.id}>
                          <td className="py-2.5 font-medium">{a.student_name}</td>
                          <td className="py-2.5">{a.exam_title}</td>
                          <td className="py-2.5 capitalize">{a.status}</td>
                          <td className="py-2.5 text-right font-mono-tabular">{a.total_score}/{a.max_score} ({a.percentage}%)</td>
                          <td className="py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setGradingAttempt(a);
                                setGradeForm({ manual_score: a.manual_score, feedback: a.feedback || '', reason: 'Academic review', issue_certificate: Boolean(a.is_60day_final) });
                                setAiRubric([]);
                              }}
                              className="text-[#008F9F] font-semibold hover:underline"
                            >
                              Review & Grade
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. SUBJECT MANAGEMENT */}
          {section === 'subjects' && canAcademic && (
            <div className="space-y-6">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await apiFetch('/api/admin/subjects', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(newSubj),
                  });
                  const d = await res.json();
                  if (!res.ok) setNotice(d.error);
                  else {
                    setNotice('Subject created and department eligibility configured.');
                    setNewSubj({ code: '', name: '', group_name: 'Sciences', access_classification: 'Common / All Students', eligible_departments: ['Science'], description: '' });
                    await loadSectionData();
                    await refreshBootstrap();
                  }
                }}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-4"
              >
                <h2 className="font-display font-bold text-lg">Create Subject & Configure Department Access</h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <input required placeholder="Code (e.g. MTH-102)" value={newSubj.code} onChange={(e) => setNewSubj({ ...newSubj, code: e.target.value })} className="px-3 py-2 text-xs rounded-lg border border-slate-300" />
                  <input required placeholder="Subject Name" value={newSubj.name} onChange={(e) => setNewSubj({ ...newSubj, name: e.target.value })} className="px-3 py-2 text-xs rounded-lg border border-slate-300" />
                  <input required placeholder="Subject Group" value={newSubj.group_name} onChange={(e) => setNewSubj({ ...newSubj, group_name: e.target.value })} className="px-3 py-2 text-xs rounded-lg border border-slate-300" />
                  <select
                    value={newSubj.access_classification}
                    onChange={(e) => setNewSubj({ ...newSubj, access_classification: e.target.value })}
                    className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Common / All Students">Common / All Students</option>
                    <option value="Science">Science</option>
                    <option value="Arts and Humanities">Arts and Humanities</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Custom">Custom Departments</option>
                  </select>
                </div>

                {newSubj.access_classification === 'Custom' && (
                  <div className="flex flex-wrap gap-4 text-xs">
                    {['Science', 'Arts and Humanities', 'Commercial'].map((dept) => (
                      <label key={dept} className="inline-flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={newSubj.eligible_departments.includes(dept)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...newSubj.eligible_departments, dept]
                              : newSubj.eligible_departments.filter((d) => d !== dept);
                            setNewSubj({ ...newSubj, eligible_departments: next });
                          }}
                        />
                        {dept}
                      </label>
                    ))}
                  </div>
                )}

                <textarea
                  rows={2}
                  placeholder="Subject description..."
                  value={newSubj.description}
                  onChange={(e) => setNewSubj({ ...newSubj, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
                <button type="submit" className="px-4 py-2 bg-[#008F9F] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Save Subject
                </button>
              </form>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#F4F7FA] text-[#64748B]">
                    <tr>
                      <th className="text-left p-3">Code</th>
                      <th className="text-left p-3">Subject</th>
                      <th className="text-left p-3">Access Classification</th>
                      <th className="text-left p-3">Eligible Streams</th>
                      <th className="text-right p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjects.map((s) => (
                      <tr key={s.id}>
                        <td className="p-3 font-mono-tabular">{s.code}</td>
                        <td className="p-3 font-semibold">{s.name}</td>
                        <td className="p-3 text-[#008F9F] font-semibold">{s.access_classification}</td>
                        <td className="p-3 text-[#64748B]">{(s.eligible_departments || []).join(', ')}</td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/subjects/${s.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ is_archived: !s.is_archived }),
                              });
                              await loadSectionData();
                              await refreshBootstrap();
                            }}
                            className="text-[#008F9F] hover:underline"
                          >
                            {s.is_archived ? 'Restore' : 'Archive'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 7. WEBSITE CUSTOMISATION (Save Draft, Preview, Publish) */}
          {section === 'customisation' && canContent && cmsData && (
            <div className="space-y-6">
              {/* Top Action Bar: Save Draft / Preview / Publish */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-lg">Website Customisation Studio</h2>
                  <p className="text-xs text-[#64748B]">
                    Edit public headings, About copy, Contact & Footer, Banner text, section visibility, featured subjects, and brand palette without touching code.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await apiFetch('/api/admin/cms/save-draft', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ hero: heroEditor, about: aboutEditor, contact: contactEditor, appearance: appearanceEditor }),
                      });
                      if (r.ok) {
                        setNotice('Draft changes saved! Click Preview to inspect or Publish Changes to push live.');
                        await loadSectionData();
                      }
                    }}
                    className="px-4 py-2 border border-slate-300 bg-white hover:bg-[#F4F7FA] text-[#10243D] font-semibold rounded-lg"
                  >
                    Save Changes (Draft)
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch('/api/admin/cms/save-draft', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ hero: heroEditor, about: aboutEditor, contact: contactEditor, appearance: appearanceEditor }),
                      });
                      setShowLiveDraftPreview(true);
                    }}
                    className="px-4 py-2 bg-[#10243D] text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await apiFetch('/api/admin/cms/publish', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ hero: heroEditor, about: aboutEditor, contact: contactEditor, appearance: appearanceEditor }),
                      });
                      if (r.ok) {
                        setNotice('All Website Customisation changes published to the live public website.');
                        await loadSectionData();
                        await refreshBootstrap();
                      }
                    }}
                    className="px-4 py-2 bg-[#008F9F] hover:bg-[#007482] text-white font-semibold rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" /> Publish Changes
                  </button>
                </div>
              </div>

              {showLiveDraftPreview && (
                <div className="bg-white rounded-xl border-2 border-[#008F9F] overflow-hidden">
                  <div className="bg-[#10243D] text-white px-4 py-2.5 flex items-center justify-between text-xs">
                    <span>Live Draft Preview (/?preview=draft)</span>
                    <button type="button" onClick={() => setShowLiveDraftPreview(false)} className="text-[#90DFEC] font-semibold">
                      Close Preview
                    </button>
                  </div>
                  <iframe src="/?preview=draft" title="Website Draft Preview" className="w-full h-[520px] bg-white" />
                </div>
              )}

              {/* Content Editors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                  <h3 className="font-display font-bold text-base">Homepage Headings & Descriptions</h3>
                  <label className="block font-semibold">Tagline</label>
                  <input value={heroEditor.tagline || ''} onChange={(e) => setHeroEditor({ ...heroEditor, tagline: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="block font-semibold">Main Headline</label>
                  <input value={heroEditor.headline || ''} onChange={(e) => setHeroEditor({ ...heroEditor, headline: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="block font-semibold">Hero Description</label>
                  <textarea rows={3} value={heroEditor.subheadline || ''} onChange={(e) => setHeroEditor({ ...heroEditor, subheadline: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="block font-semibold">Hero Access / Footer Notice</label>
                  <input value={heroEditor.announcement || ''} onChange={(e) => setHeroEditor({ ...heroEditor, announcement: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                  <h3 className="font-display font-bold text-base">About Page Content</h3>
                  <label className="block font-semibold">About Page Headline</label>
                  <input value={aboutEditor.headline || ''} onChange={(e) => setAboutEditor({ ...aboutEditor, headline: e.target.value })} placeholder="The Next Generation of Learning." className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="block font-semibold">About Overview</label>
                  <textarea rows={2} value={aboutEditor.overview || ''} onChange={(e) => setAboutEditor({ ...aboutEditor, overview: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="block font-semibold">Our Mission</label>
                  <textarea rows={2} value={aboutEditor.mission || ''} onChange={(e) => setAboutEditor({ ...aboutEditor, mission: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="block font-semibold">Our Vision</label>
                  <textarea rows={2} value={aboutEditor.vision || ''} onChange={(e) => setAboutEditor({ ...aboutEditor, vision: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="block font-semibold">Educational Objectives</label>
                  <textarea rows={2} value={aboutEditor.objectives || ''} onChange={(e) => setAboutEditor({ ...aboutEditor, objectives: e.target.value })} placeholder="Key educational objectives..." className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="block font-semibold">Free & Accessible Learning Commitment</label>
                  <textarea rows={2} value={aboutEditor.commitment || ''} onChange={(e) => setAboutEditor({ ...aboutEditor, commitment: e.target.value })} placeholder="Commitment to free initial access..." className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                  <h3 className="font-display font-bold text-base">Contact Info, Footer Text & Exam Description</h3>
                  <input value={contactEditor.email || ''} onChange={(e) => setContactEditor({ ...contactEditor, email: e.target.value })} placeholder="Support Email" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <input value={contactEditor.supportHours || ''} onChange={(e) => setContactEditor({ ...contactEditor, supportHours: e.target.value })} placeholder="Support Hours" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <input value={contactEditor.address || ''} onChange={(e) => setContactEditor({ ...contactEditor, address: e.target.value })} placeholder="Office Address" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <textarea rows={2} value={contactEditor.footerNote || ''} onChange={(e) => setContactEditor({ ...contactEditor, footerNote: e.target.value })} placeholder="Footer legal / brand note" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  <label className="block font-semibold pt-1">Examinations Page Description</label>
                  <textarea rows={2} value={appearanceEditor.examPageIntro || ''} onChange={(e) => setAppearanceEditor({ ...appearanceEditor, examPageIntro: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <h3 className="font-display font-bold text-base">Website Appearance, Banner & Section Visibility</h3>
                  <div>
                    <label className="block font-semibold mb-1">Top Website Banner Text</label>
                    <input value={appearanceEditor.bannerText || ''} onChange={(e) => setAppearanceEditor({ ...appearanceEditor, bannerText: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1.5">Official EDUNEXA Brand Accent Colour</label>
                    <div className="flex items-center gap-3">
                      {[
                        { hex: '#008F9F', label: 'Official Teal' },
                        { hex: '#10243D', label: 'Official Navy' },
                        { hex: '#007482', label: 'Deep Teal' },
                        { hex: '#0284C7', label: 'Academic Blue' },
                      ].map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setAppearanceEditor({ ...appearanceEditor, primaryColor: c.hex })}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                            appearanceEditor.primaryColor === c.hex ? 'border-[#10243D] bg-[#EAF9FB]' : 'border-slate-200'
                          }`}
                        >
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.hex }} />
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1.5">Homepage Section Visibility</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'showBanner', label: 'Top Announcement Banner' },
                        { key: 'showStatsSection', label: 'Statistics Bar' },
                        { key: 'showFrameworksSection', label: 'Exam Frameworks' },
                        { key: 'showSubjectsSection', label: 'Featured Subjects' },
                        { key: 'showAiSection', label: 'AI Tutor Showcase' },
                        { key: 'showLeaderboardSection', label: 'Leaders Preview' },
                        { key: 'showTestimonialsSection', label: 'Testimonials Block' },
                        { key: 'showCommunitySection', label: 'Community CTA' },
                      ].map((tog) => (
                        <label key={tog.key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={appearanceEditor[tog.key] !== false}
                            onChange={(e) => setAppearanceEditor({ ...appearanceEditor, [tog.key]: e.target.checked })}
                          />
                          <span>{tog.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1.5">Featured Subjects on Homepage</label>
                    <div className="flex flex-wrap gap-2">
                      {subjects.map((s) => {
                        const list: number[] = Array.isArray(appearanceEditor.featuredSubjectIds) ? appearanceEditor.featuredSubjectIds : [];
                        const active = list.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              const next = active ? list.filter((id) => id !== s.id) : [...list, s.id];
                              setAppearanceEditor({ ...appearanceEditor, featuredSubjectIds: next });
                            }}
                            className={`px-2.5 py-1 rounded border ${active ? 'bg-[#008F9F] text-white border-[#008F9F]' : 'border-slate-200'}`}
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Logo & Page Image Shortcut */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <h3 className="font-display font-bold text-base">Logo & Website Page Images</h3>
                  <p className="text-[#64748B]">Upload or replace Website Logo, Homepage Hero, About Page image, Subject visuals, Exam Banner, and Learning Centre images.</p>
                </div>
                <button type="button" onClick={() => navigate('/admin/media')} className="px-4 py-2 bg-[#10243D] text-white font-semibold rounded-lg">
                  Open Image & Media Manager →
                </button>
              </div>
            </div>
          )}

          {/* 8. IMAGE AND MEDIA MANAGER */}
          {section === 'media' && canContent && cmsData && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display font-bold text-lg">Image & Media Manager — Logo, Hero & Page Slots</h2>
                    <p className="text-xs text-[#64748B]">Upload images to persistent storage, assign them as Draft for Logo/Hero/About/Subjects/Exams/Learning Centre, Preview across devices, and Publish Live.</p>
                  </div>
                  <div className="flex gap-1 p-1 bg-[#F4F7FA] rounded-lg border border-slate-200">
                    {[
                      { id: 'desktop', icon: Monitor },
                      { id: 'tablet', icon: Tablet },
                      { id: 'mobile', icon: Smartphone },
                    ].map((d) => {
                      const I = d.icon;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setPreviewDevice(d.id as any)}
                          className={`p-2 rounded-md ${previewDevice === d.id ? 'bg-white shadow-sm text-[#008F9F]' : 'text-[#64748B]'}`}
                          aria-label={`Preview ${d.id}`}
                        >
                          <I className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 space-y-2 max-h-96 overflow-y-auto pr-1">
                    {cmsData.slots.map((slot: any) => (
                      <button
                        key={slot.slot_key}
                        type="button"
                        onClick={() => setSelectedSlotKey(slot.slot_key)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-colors ${
                          selectedSlotKey === slot.slot_key ? 'border-[#008F9F] bg-[#EAF9FB]/60' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-[#10243D]">{slot.label}</div>
                        <div className="text-[#64748B] mt-0.5">{slot.page_section}</div>
                        {slot.draft_asset_id !== slot.active_asset_id && (
                          <div className="text-amber-700 font-semibold mt-1">Unpublished Draft Pending</div>
                        )}
                      </button>
                    ))}
                  </div>

                  {activeSlot && (
                    <div className="lg:col-span-8 space-y-4">
                      <div className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 flex flex-col items-center">
                        <div
                          className={`overflow-hidden rounded-xl border border-slate-300 bg-white transition-all flex items-center justify-center ${
                            previewDevice === 'desktop' ? 'w-full h-64' : previewDevice === 'tablet' ? 'w-96 h-56' : 'w-64 h-48'
                          }`}
                        >
                          {(activeSlot.draft_url || activeSlot.active_url) ? (
                            <img
                              src={activeSlot.draft_url || activeSlot.active_url}
                              alt={activeSlot.draft_alt || activeSlot.active_alt || activeSlot.label}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-xs text-[#64748B]">Using default official EDUNEXA SVG logo (upload an image to override)</span>
                          )}
                        </div>
                        <div className="text-xs text-[#64748B] mt-2">
                          Previewing {activeSlot.draft_asset_id !== activeSlot.active_asset_id ? 'Draft' : 'Published'} asset for <strong>{activeSlot.label}</strong> ({previewDevice})
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={async () => {
                            const r = await apiFetch(`/api/admin/media-slots/${activeSlot.slot_key}/publish`, { method: 'POST', credentials: 'include' });
                            if (r.ok) {
                              setNotice(`Published new image to "${activeSlot.label}" on the live website.`);
                              await loadSectionData();
                              await refreshBootstrap();
                            }
                          }}
                          className="px-4 py-2 bg-[#008F9F] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" /> Publish Changes Live
                        </button>
                        {activeSlot.previous_asset_id && (
                          <button
                            type="button"
                            onClick={async () => {
                              const r = await apiFetch(`/api/admin/media-slots/${activeSlot.slot_key}/rollback`, { method: 'POST', credentials: 'include' });
                              if (r.ok) {
                                setNotice(`Restored previous image for "${activeSlot.label}".`);
                                await loadSectionData();
                                await refreshBootstrap();
                              }
                            }}
                            className="px-4 py-2 bg-white border border-slate-300 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-4 h-4" /> Restore Previous Image
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload & Media Library */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <h2 className="font-display font-bold text-lg">Persistent Media Library</h2>
                  <input
                    type="text"
                    value={mediaFilter}
                    onChange={(e) => setMediaFilter(e.target.value)}
                    placeholder="Search media library..."
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files?.[0]) handleUploadMedia(e.dataTransfer.files[0]);
                  }}
                  className="p-5 rounded-xl border-2 border-dashed border-slate-300 bg-[#F4F7FA]/60 space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <input placeholder="Asset Title" value={uploadMeta.title} onChange={(e) => setUploadMeta({ ...uploadMeta, title: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white" />
                    <input placeholder="Alt Text (accessibility)" value={uploadMeta.alt_text} onChange={(e) => setUploadMeta({ ...uploadMeta, alt_text: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white" />
                    <select value={uploadMeta.category} onChange={(e) => setUploadMeta({ ...uploadMeta, category: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      <option value="Logo & Identity">Logo & Identity</option>
                      <option value="Hero & Banners">Hero & Banners</option>
                      <option value="Examinations">Examinations</option>
                      <option value="AI & Curriculum">AI & Curriculum</option>
                      <option value="Community">Community</option>
                    </select>
                    <select value={uploadMeta.assign_draft_slot} onChange={(e) => setUploadMeta({ ...uploadMeta, assign_draft_slot: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                      {cmsData.slots.map((s: any) => <option key={s.slot_key} value={s.slot_key}>Assign Draft: {s.label}</option>)}
                    </select>
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#10243D] text-white text-xs font-semibold rounded-lg cursor-pointer">
                    <Upload className="w-4 h-4" /> Drag & Drop or Choose Image (JPG, PNG, WEBP)
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadMedia(e.target.files[0])} />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {cmsData.assets
                    .filter((a: any) => a.title.toLowerCase().includes(mediaFilter.toLowerCase()) || a.category.toLowerCase().includes(mediaFilter.toLowerCase()))
                    .map((asset: any) => (
                      <div key={asset.id} className="border border-slate-200 rounded-xl overflow-hidden flex flex-col justify-between">
                        <img src={asset.url} alt={asset.alt_text} className="w-full h-36 object-cover bg-slate-100" />
                        <div className="p-3 space-y-2 text-xs">
                          <div className="font-semibold truncate">{asset.title}</div>
                          <div className="text-[11px] text-[#64748B]">
                            {asset.category} · {Math.round(asset.file_size / 1024)} KB
                          </div>
                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await apiFetch(`/api/admin/media-slots/${selectedSlotKey}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  credentials: 'include',
                                  body: JSON.stringify({ draft_asset_id: asset.id }),
                                });
                                setNotice(`Assigned "${asset.title}" as draft for ${selectedSlotKey}. Click Publish Changes Live above to deploy.`);
                                await loadSectionData();
                              }}
                              className="text-[#008F9F] font-semibold hover:underline"
                            >
                              Assign to {selectedSlotKey}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const r = await apiFetch(`/api/admin/media/${asset.id}`, { method: 'DELETE', credentials: 'include' });
                                const d = await r.json();
                                if (!r.ok) setNotice(d.error);
                                else await loadSectionData();
                              }}
                              className="text-red-600 hover:underline"
                              aria-label="Delete asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* 9. STUDENT LEADERSHIP MANAGEMENT */}
          {section === 'leadership' && canStudents && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display font-bold text-lg">Student Leadership Management (EDUNEXA LEADERS)</h2>
                  <p className="text-[#64748B]">
                    All standings below are calculated strictly from submitted and graded exam attempts. Moderate visibility or hide entries when necessary.
                  </p>
                </div>
                <Link to="/leaders" className="px-3.5 py-2 bg-[#EAF9FB] text-[#008F9F] font-semibold rounded-lg">
                  View Public Leaders Page →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-[#64748B] border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2">Pos</th>
                      <th className="text-left py-2">Student Display Name</th>
                      <th className="text-left py-2">Subject</th>
                      <th className="text-left py-2">Category / Framework</th>
                      <th className="text-right py-2">Score %</th>
                      <th className="text-left py-2 pl-4">Consent</th>
                      <th className="text-right py-2">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leadershipRows.map((row) => (
                      <tr key={`${row.user_id}-${row.subject_id}`}>
                        <td className="py-2.5 font-mono-tabular font-bold text-[#008F9F]">#{row.position}</td>
                        <td className="py-2.5 font-semibold">{row.display_name} (@{row.username})</td>
                        <td className="py-2.5">{row.subject_name}</td>
                        <td className="py-2.5 text-[#64748B]">{row.exam_framework || row.exam_category}</td>
                        <td className="py-2.5 text-right font-mono-tabular font-bold">{row.score_percentage}%</td>
                        <td className="py-2.5 pl-4">{row.leaderboard_consent ? 'Consented' : 'Opted Out'}</td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={async () => {
                              await apiFetch(`/api/admin/users/${row.user_id}/leaderboard`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ leaderboard_hidden: !row.leaderboard_hidden }),
                              });
                              await loadSectionData();
                              await refreshBootstrap();
                            }}
                            className={`px-3 py-1 rounded font-semibold ${row.leaderboard_hidden ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-[#10243D]'}`}
                          >
                            {row.leaderboard_hidden ? 'Restore Publicly' : 'Hide Entry'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 10. TESTIMONIALS MANAGEMENT & COMMUNITY MODERATION */}
          {section === 'testimonials' && canMod && modData && (
            <div className="space-y-6 text-xs">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <div>
                  <h2 className="font-display font-bold text-lg">Testimonials Management</h2>
                  <p className="text-[#64748B]">Review, edit, approve, reject, feature on Homepage, or delete submitted student testimonials.</p>
                </div>
                {modData.testimonials.length === 0 ? (
                  <p className="text-[#64748B]">No testimonials submitted yet.</p>
                ) : (
                  modData.testimonials.map((t: any) => (
                    <div key={t.id} className="p-4 border border-slate-200 rounded-xl flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3 max-w-2xl">
                        {t.avatar_url && (
                          <img src={t.avatar_url} alt={t.display_name} className="w-12 h-12 rounded-full object-cover border border-slate-200 shrink-0" />
                        )}
                        <div className="space-y-1">
                          <div className="font-semibold text-sm">
                            {t.display_name} · <span className="text-[#008F9F]">{t.programme_title}</span>
                          </div>
                          <div className="text-[#64748B]">
                            Status: <strong className="uppercase text-[#10243D]">{t.status}</strong> {t.is_featured === 1 && '· Featured on Homepage'}
                          </div>
                          <p className="text-[#10243D] text-sm">“{t.quote}”</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setEditingTestimonial(t)} className="px-3 py-1.5 border border-slate-300 rounded-md">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/testimonials/${t.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ status: 'approved', is_featured: true }),
                            });
                            await loadSectionData();
                            await refreshBootstrap();
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-md font-semibold"
                        >
                          Approve & Feature
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/testimonials/${t.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ status: 'rejected', is_featured: false }),
                            });
                            await loadSectionData();
                            await refreshBootstrap();
                          }}
                          className="px-3 py-1.5 border border-slate-300 rounded-md"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/testimonials/${t.id}`, { method: 'DELETE', credentials: 'include' });
                            await loadSectionData();
                            await refreshBootstrap();
                          }}
                          className="px-2.5 py-1.5 text-red-600 border border-red-200 rounded-md"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="font-display font-bold text-base">Community Moderation Reports</h2>
                {modData.reports.length === 0 ? (
                  <p className="text-[#64748B]">No open community reports.</p>
                ) : (
                  modData.reports.map((r: any) => (
                    <div key={r.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                      <div>
                        <strong>{r.target_type} #{r.target_id}</strong> reported by @{r.reporter_username}: {r.reason}
                      </div>
                      {r.status === 'open' ? (
                        <div className="flex gap-2">
                          <button type="button" onClick={async () => { await apiFetch(`/api/admin/moderation/reports/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: 'dismissed' }) }); loadSectionData(); }} className="px-3 py-1 border rounded-md">Dismiss</button>
                          <button type="button" onClick={async () => { await apiFetch(`/api/admin/moderation/reports/${r.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ status: 'resolved', remove_target: true }) }); loadSectionData(); }} className="px-3 py-1 bg-red-600 text-white rounded-md">Remove Content</button>
                        </div>
                      ) : (
                        <span className="text-[#64748B] capitalize">{r.status}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 11. LEARNING MATERIALS (Written Study Guides & Video Lessons) */}
          {section === 'learning-materials' && (canAcademic || canContent) && (
            <div className="space-y-6 text-xs">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const fd = new FormData();
                  fd.append('title', newMaterial.title);
                  fd.append('subject_id', String(newMaterial.subject_id));
                  fd.append('topic_name', newMaterial.topic_name);
                  fd.append('material_type', newMaterial.material_type);
                  fd.append('summary', newMaterial.summary);
                  fd.append('content_body', newMaterial.content_body);
                  if (newMaterial.programme_id) fd.append('programme_id', newMaterial.programme_id);
                  if (materialFile) fd.append('document', materialFile);
                  const r = await apiFetch('/api/admin/materials', {
                    method: 'POST',
                    credentials: 'include',
                    body: fd,
                  });
                  const d = await r.json();
                  setNotice(r.ok ? 'Written study guide published to Learning Centre.' : d.error);
                  if (r.ok) {
                    setNewMaterial({ title: '', subject_id: subjects[0]?.id || 1, topic_name: '', material_type: 'Study Guide', summary: '', content_body: '', programme_id: '' });
                    setMaterialFile(null);
                    await loadSectionData();
                    await refreshBootstrap();
                  }
                }}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
              >
                <h2 className="font-display font-bold text-base">Add Reading / Study Material (with Optional PDF/DOC Upload)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input required placeholder="Material Title" value={newMaterial.title} onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300" />
                  <select value={newMaterial.subject_id} onChange={(e) => setNewMaterial({ ...newMaterial, subject_id: Number(e.target.value) })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input required placeholder="Topic Name" value={newMaterial.topic_name} onChange={(e) => setNewMaterial({ ...newMaterial, topic_name: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300" />
                  <select value={newMaterial.material_type} onChange={(e) => setNewMaterial({ ...newMaterial, material_type: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    <option value="Study Guide">Study Guide</option>
                    <option value="Topic Explanation">Topic Explanation</option>
                    <option value="Formula Sheet">Formula Sheet</option>
                    <option value="Revision Notes">Revision Notes</option>
                  </select>
                </div>
                <input required placeholder="Brief summary shown on cards..." value={newMaterial.summary} onChange={(e) => setNewMaterial({ ...newMaterial, summary: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                <textarea required rows={4} placeholder="Full study notes, worked examples, and key takeaways..." value={newMaterial.content_body} onChange={(e) => setNewMaterial({ ...newMaterial, content_body: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:border-[#008F9F]">
                    <Upload className="w-4 h-4 text-[#008F9F]" />
                    <span>{materialFile ? materialFile.name : 'Optional Attachment (PDF, TXT, MD, DOC, DOCX, Image)'}</span>
                    <input type="file" accept=".pdf,.txt,.md,.doc,.docx,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => setMaterialFile(e.target.files?.[0] || null)} />
                  </label>
                  <button type="submit" className="px-4 py-2 bg-[#008F9F] text-white font-semibold rounded-lg">
                    Publish Study Material
                  </button>
                </div>
              </form>

              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="font-display font-bold text-base">Published Written Study Materials ({materialsList.length})</h2>
                <div className="divide-y divide-slate-100">
                  {materialsList.map((m) => (
                    <div key={m.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-sm">{m.title}</div>
                        <div className="text-[#64748B]">
                          {m.subject_name} · {m.topic_name} · {m.material_type} · {m.is_published ? 'Published' : 'Hidden'}
                          {m.document_name ? ` · Attachment: ${m.document_name}` : ''}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/materials/${m.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ is_published: !m.is_published }),
                            });
                            await loadSectionData();
                            await refreshBootstrap();
                          }}
                          className="px-3 py-1.5 border border-slate-300 rounded-md"
                        >
                          {m.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/materials/${m.id}`, { method: 'DELETE', credentials: 'include' });
                            await loadSectionData();
                            await refreshBootstrap();
                          }}
                          className="px-3 py-1.5 text-red-600 border border-red-200 rounded-md"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await apiFetch('/api/admin/videos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(newVideo),
                  });
                  const d = await r.json();
                  setNotice(r.ok ? 'YouTube lesson added to Learning Centre.' : d.error);
                  if (r.ok) {
                    setNewVideo({ title: '', description: '', youtube_url: '', subject_id: subjects[0]?.id || 1, topic: '', programme_id: '' });
                    await loadSectionData();
                    await refreshBootstrap();
                  }
                }}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
              >
                <h2 className="font-display font-bold text-base">Add Educational Video Lesson</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input required placeholder="Lesson Title" value={newVideo.title} onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300" />
                  <input required placeholder="YouTube URL (https://www.youtube.com/watch?v=...)" value={newVideo.youtube_url} onChange={(e) => setNewVideo({ ...newVideo, youtube_url: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300" />
                  <select value={newVideo.subject_id} onChange={(e) => setNewVideo({ ...newVideo, subject_id: Number(e.target.value) })} className="px-3 py-2 rounded-lg border border-slate-300 bg-white">
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input placeholder="Topic" value={newVideo.topic} onChange={(e) => setNewVideo({ ...newVideo, topic: e.target.value })} className="px-3 py-2 rounded-lg border border-slate-300" />
                </div>
                <textarea rows={2} placeholder="Lesson summary / learning notes..." value={newVideo.description} onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-300" />
                <button type="submit" className="px-4 py-2 bg-[#008F9F] text-white font-semibold rounded-lg">Publish Video Lesson</button>
              </form>

              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="font-display font-bold text-base">Published Video Lessons</h2>
                <div className="divide-y divide-slate-100">
                  {videosList.map((v) => (
                    <div key={v.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-sm">{v.title}</div>
                        <div className="text-[#64748B]">{v.subject_name} · {v.topic} · {v.is_published ? 'Published' : 'Hidden'}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/videos/${v.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ is_published: !v.is_published }),
                            });
                            await loadSectionData();
                            await refreshBootstrap();
                          }}
                          className="px-3 py-1.5 border border-slate-300 rounded-md"
                        >
                          {v.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/videos/${v.id}`, { method: 'DELETE', credentials: 'include' });
                            await loadSectionData();
                            await refreshBootstrap();
                          }}
                          className="px-3 py-1.5 text-red-600 border border-red-200 rounded-md"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 12. ANNOUNCEMENTS */}
          {section === 'announcements' && canAnnouncements && (
            <div className="space-y-6 text-xs">
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await apiFetch('/api/admin/announcements', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(newAnnouncement),
                  });
                  if (r.ok) {
                    setNotice('Announcement published.');
                    setNewAnnouncement({ title: '', body: '', banner_text: '', audience: 'all', is_banner: true });
                    await loadSectionData();
                    await refreshBootstrap();
                  }
                }}
                className="bg-white rounded-xl border border-slate-200 p-6 space-y-3"
              >
                <h2 className="font-display font-bold text-base">Create Website or Student Announcement</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input required placeholder="Announcement Title" value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                  <input placeholder="Top Banner Summary (optional)" value={newAnnouncement.banner_text} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, banner_text: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                  <select value={newAnnouncement.audience} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, audience: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="all">Public Website & Students</option>
                    <option value="students">Student Portal Only</option>
                  </select>
                </div>
                <textarea required rows={2} placeholder="Announcement details..." value={newAnnouncement.body} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <label className="flex items-center gap-2 font-medium">
                  <input type="checkbox" checked={newAnnouncement.is_banner} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, is_banner: e.target.checked })} />
                  Show as Top Public Website Banner
                </label>
                <button type="submit" className="px-4 py-2 bg-[#008F9F] text-white font-semibold rounded-lg">Publish Announcement</button>
              </form>

              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="font-display font-bold text-base">Active & Archived Announcements</h2>
                {announcementsList.map((ann) => (
                  <div key={ann.id} className="p-4 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="font-semibold text-sm">{ann.title} ({ann.audience})</div>
                      <p className="text-[#64748B]">{ann.body}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/announcements/${ann.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ is_active: !ann.is_active }),
                          });
                          await loadSectionData();
                          await refreshBootstrap();
                        }}
                        className="px-3 py-1.5 border border-slate-300 rounded-md"
                      >
                        {ann.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiFetch(`/api/admin/announcements/${ann.id}`, { method: 'DELETE', credentials: 'include' });
                          await loadSectionData();
                          await refreshBootstrap();
                        }}
                        className="px-3 py-1.5 text-red-600 border border-red-200 rounded-md"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13. WEBSITE SETTINGS */}
          {section === 'settings' && (canContent || isSuper) && (
            <div className="space-y-6 text-xs">
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                <h2 className="font-display font-bold text-base">AI & System Configuration Diagnostics</h2>
                <div className={`p-4 rounded-xl border ${aiStatus?.configured ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'}`}>
                  <div className="font-bold">Google Gemini AI Integration: {aiStatus?.configured ? 'Connected' : 'Not Configured'}</div>
                  <p className="mt-1">{aiStatus?.message}</p>
                </div>
                <div className="p-4 rounded-xl bg-[#F4F7FA] border border-slate-200 space-y-1">
                  <div className="font-bold text-[#10243D]">Persistent Storage & Security Policy</div>
                  <p className="text-[#64748B]">Database: SQLite persisted at <code>/data/edunexa.db</code> · Uploaded Media: <code>/public/uploads/</code> · Role-Based Access Control enforced server-side on all <code>/api/admin/*</code> endpoints.</p>
                </div>
              </div>

              {cmsData && (
                <>
                  <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                    <h2 className="font-display font-bold text-base">FAQ Management</h2>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await apiFetch('/api/admin/faqs', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify(newFaq),
                        });
                        setNewFaq({ question: '', answer: '', category: 'General' });
                        await loadSectionData();
                        await refreshBootstrap();
                      }}
                      className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                    >
                      <input required placeholder="Question" value={newFaq.question} onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                      <input required placeholder="Answer" value={newFaq.answer} onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg" />
                      <button type="submit" className="px-4 py-2 bg-[#10243D] text-white font-semibold rounded-lg">Add FAQ</button>
                    </form>
                    <div className="divide-y divide-slate-100">
                      {cmsData.faqs.map((f: any) => (
                        <div key={f.id} className="py-2 flex items-center justify-between gap-4">
                          <div><strong>{f.question}</strong> — <span className="text-[#64748B]">{f.answer}</span></div>
                          <button type="button" onClick={async () => { await apiFetch(`/api/admin/faqs/${f.id}`, { method: 'DELETE', credentials: 'include' }); await loadSectionData(); await refreshBootstrap(); }} className="text-red-600">Remove</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                    <h2 className="font-display font-bold text-base">Contact Enquiries Inbox</h2>
                    {cmsData.enquiries.length === 0 ? <p className="text-[#64748B]">No contact enquiries received yet.</p> : cmsData.enquiries.map((eq: any) => (
                      <div key={eq.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between gap-4">
                        <div>
                          <strong>{eq.subject}</strong> — {eq.name} ({eq.email})
                          <p className="text-[#64748B] mt-1">{eq.message}</p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await apiFetch(`/api/admin/enquiries/${eq.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ status: eq.status === 'new' ? 'resolved' : 'new' }),
                            });
                            await loadSectionData();
                          }}
                          className="font-semibold text-[#008F9F] hover:underline capitalize"
                        >
                          {eq.status}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* MODALS: Question Preview, Question Edit, Subjective Grading, Testimonial Edit */}
          {previewQ && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base">Question Preview (#{previewQ.id})</h3>
                  <button type="button" onClick={() => setPreviewQ(null)} className="text-[#64748B]">Close</button>
                </div>
                <div className="text-[#008F9F] font-semibold">
                  {previewQ.subject_name} · {previewQ.topic_name} · {previewQ.exam_framework} · {previewQ.difficulty} · {previewQ.marks} Marks
                </div>
                <p className="text-sm font-semibold text-[#10243D]">{previewQ.question_text}</p>
                {Array.isArray(previewQ.options) && previewQ.options.length > 0 && (
                  <div className="space-y-1.5">
                    {previewQ.options.map((opt: string, idx: number) => (
                      <div key={idx} className="p-2 rounded border border-slate-200 bg-[#F4F7FA]">
                        <strong>{String.fromCharCode(65 + idx)}.</strong> {opt}
                      </div>
                    ))}
                  </div>
                )}
                <div className="p-3 rounded-lg bg-[#EAF9FB] space-y-1">
                  <div><strong>Expected / Correct Answer:</strong> {previewQ.correct_answer}</div>
                  {previewQ.marking_scheme && <div><strong>Marking Scheme:</strong> {previewQ.marking_scheme}</div>}
                  {previewQ.explanation && <div><strong>Explanation:</strong> {previewQ.explanation}</div>}
                </div>
              </div>
            </div>
          )}

          {editingQ && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-3 text-xs max-h-[90vh] overflow-y-auto">
                <h3 className="font-display font-bold text-lg">Edit Question #{editingQ.id}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <input value={editingQ.topic_name} onChange={(e) => setEditingQ({ ...editingQ, topic_name: e.target.value })} placeholder="Topic" className="px-3 py-2 border border-slate-300 rounded-lg" />
                  <input value={editingQ.exam_framework} onChange={(e) => setEditingQ({ ...editingQ, exam_framework: e.target.value })} placeholder="Exam Type" className="px-3 py-2 border border-slate-300 rounded-lg" />
                  <select value={editingQ.difficulty} onChange={(e) => setEditingQ({ ...editingQ, difficulty: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg bg-white">
                    <option value="Easy">Easy</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <textarea rows={3} value={editingQ.question_text} onChange={(e) => setEditingQ({ ...editingQ, question_text: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg" />
                {Array.isArray(editingQ.options) && editingQ.options.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {editingQ.options.map((opt: string, idx: number) => (
                      <input
                        key={idx}
                        value={opt}
                        onChange={(e) => {
                          const next = [...editingQ.options];
                          next[idx] = e.target.value;
                          setEditingQ({ ...editingQ, options: next });
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        className="px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    ))}
                  </div>
                )}
                <input value={editingQ.correct_answer} onChange={(e) => setEditingQ({ ...editingQ, correct_answer: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="Correct / Expected answer" />
                <textarea rows={2} value={editingQ.marking_scheme || ''} onChange={(e) => setEditingQ({ ...editingQ, marking_scheme: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="Marking scheme (for theory questions)" />
                <textarea rows={2} value={editingQ.explanation || ''} onChange={(e) => setEditingQ({ ...editingQ, explanation: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg" placeholder="Explanation" />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingQ(null)} className="px-4 py-2 font-semibold text-[#64748B]">Cancel</button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/questions/${editingQ.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(editingQ),
                      });
                      setEditingQ(null);
                      await loadSectionData();
                      await refreshBootstrap();
                    }}
                    className="px-4 py-2 bg-[#008F9F] text-white font-semibold rounded-lg"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {gradingAttempt && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs">
                <h3 className="font-display font-bold text-base">Grade Attempt: {gradingAttempt.student_name}</h3>
                <div>Auto-marked objective score: <strong>{gradingAttempt.auto_score}</strong> / {gradingAttempt.max_score}</div>
                <button
                  type="button"
                  onClick={async () => {
                    const r = await apiFetch(`/api/admin/attempts/${gradingAttempt.id}/ai-rubric`, { method: 'POST', credentials: 'include' });
                    const d = await r.json();
                    if (!r.ok) setNotice(d.error || 'AI rubric unavailable.');
                    setAiRubric(d.suggestions || []);
                  }}
                  className="px-3 py-1.5 bg-[#EAF9FB] text-[#008F9F] font-semibold rounded-lg"
                >
                  Get AI Rubric Suggestion for Written Answers
                </button>
                {aiRubric.map((s) => (
                  <div key={s.questionId} className="p-3 bg-[#F4F7FA] rounded-lg space-y-1">
                    <div className="font-semibold">Suggested: {s.suggestedScore}/{s.maxMarks}</div>
                    <div className="text-[#64748B]">{s.rubricFeedback}</div>
                  </div>
                ))}
                <input
                  type="number"
                  min={0}
                  value={gradeForm.manual_score}
                  onChange={(e) => setGradeForm({ ...gradeForm, manual_score: Number(e.target.value) })}
                  placeholder="Manual subjective score"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                <textarea
                  rows={2}
                  value={gradeForm.feedback}
                  onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                  placeholder="Examiner feedback..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
                {gradingAttempt.is_60day_final === 1 && (
                  <label className="flex items-center gap-2 font-semibold text-[#008F9F]">
                    <input type="checkbox" checked={gradeForm.issue_certificate} onChange={(e) => setGradeForm({ ...gradeForm, issue_certificate: e.target.checked })} />
                    Issue Official Certificate if passing & 60-day verified
                  </label>
                )}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setGradingAttempt(null)} className="px-4 py-2 text-[#64748B]">Cancel</button>
                  <button
                    type="button"
                    onClick={async () => {
                      const r = await apiFetch(`/api/admin/attempts/${gradingAttempt.id}/grade`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(gradeForm),
                      });
                      const d = await r.json();
                      setNotice(d.certIssued ? `Grade published & Certificate ${d.certIssued} issued.` : 'Grade updated and published.');
                      setGradingAttempt(null);
                      await loadSectionData();
                    }}
                    className="px-4 py-2 bg-[#008F9F] text-white font-semibold rounded-lg"
                  >
                    Approve & Publish Grade
                  </button>
                </div>
              </div>
            </div>
          )}

          {editingTestimonial && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-3 text-xs">
                <h3 className="font-display font-bold text-base">Edit Testimonial</h3>
                <input value={editingTestimonial.display_name} onChange={(e) => setEditingTestimonial({ ...editingTestimonial, display_name: e.target.value })} placeholder="Display Name" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <input value={editingTestimonial.programme_title} onChange={(e) => setEditingTestimonial({ ...editingTestimonial, programme_title: e.target.value })} placeholder="Subject / Programme" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <input value={editingTestimonial.achievement} onChange={(e) => setEditingTestimonial({ ...editingTestimonial, achievement: e.target.value })} placeholder="Achievement" className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <textarea rows={3} value={editingTestimonial.quote} onChange={(e) => setEditingTestimonial({ ...editingTestimonial, quote: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setEditingTestimonial(null)} className="px-4 py-2 text-[#64748B]">Cancel</button>
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch(`/api/admin/testimonials/${editingTestimonial.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify(editingTestimonial),
                      });
                      setEditingTestimonial(null);
                      await loadSectionData();
                      await refreshBootstrap();
                    }}
                    className="px-4 py-2 bg-[#008F9F] text-white font-semibold rounded-lg"
                  >
                    Save Changes
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
