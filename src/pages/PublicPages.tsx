import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, CheckCircle2, Clock, Download, FileText, Globe2, GraduationCap, Lock, Mail, Search, ShieldCheck, Sparkles, Upload, Users } from 'lucide-react';
import { CmsImage } from '../components/CmsImage';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../utils/apiFetch';

export const AboutPage: React.FC = () => {
  const { bootstrap } = useApp();
  const about = bootstrap?.cmsBlocks?.about || {};

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-4">
          <p className="text-sm font-semibold text-[#008F9F]">About EDUNEXA · The Next Generation of Learning</p>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#10243D]">
            {about.headline || 'The Next Generation of Learning.'}
          </h1>
          <p className="text-base text-[#64748B] leading-relaxed">
            {about.overview || 'EDUNEXA is an international learning, examination, assessment, and academic community platform built to help learners master school curricula and prepare for major global and regional examinations without financial barriers.'}
          </p>
        </div>
        <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-slate-200 min-h-[240px] bg-[#F4F7FA]">
          <CmsImage slotKey="about_image" fallbackAlt="EDUNEXA International Academic Environment" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Vision & Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded-xl border border-slate-200 bg-[#F4F7FA]/60 space-y-2">
          <h2 className="font-display font-bold text-xl text-[#10243D]">Our Mission</h2>
          <p className="text-sm text-[#64748B] leading-relaxed">
            {about.mission || 'To remove barriers to rigorous international exam preparation, curriculum-aligned assessment, and verifiable digital credentials for learners worldwide.'}
          </p>
        </div>
        <div className="p-6 rounded-xl border border-slate-200 bg-[#EAF9FB]/60 space-y-2">
          <h2 className="font-display font-bold text-xl text-[#10243D]">Our Vision</h2>
          <p className="text-sm text-[#64748B] leading-relaxed">
            {about.vision || 'A unified academic ecosystem where Science, Arts, and Commercial students collaborate across borders with transparent standards and trustworthy recognition.'}
          </p>
        </div>
      </div>

      {/* Educational Objectives */}
      <div className="space-y-4">
        <h2 className="font-display font-bold text-2xl text-[#10243D]">Our Educational Objectives</h2>
        {about.objectives && (
          <p className="text-sm text-[#64748B] leading-relaxed">{about.objectives}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-2">
            <BookOpen className="w-5 h-5 text-[#008F9F]" />
            <h3 className="font-display font-bold text-base text-[#10243D]">Curriculum Mastery</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Deliver clear subject syllabi, topic-by-topic study guides, and worked video explanations for core and stream-specific subjects.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-2">
            <GraduationCap className="w-5 h-5 text-[#008F9F]" />
            <h3 className="font-display font-bold text-base text-[#10243D]">Diagnostic Assessment</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Provide practice tests and timed mock exams with automated objective scoring, subjective marking schemes, and topic performance insights.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-2">
            <ShieldCheck className="w-5 h-5 text-[#008F9F]" />
            <h3 className="font-display font-bold text-base text-[#10243D]">Trusted Recognition</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Maintain genuine 60-day learning preparation requirements before issuing QR-verified digital certificates and publishing leaderboard standings.
            </p>
          </div>
        </div>
      </div>

      {/* How Students Learn, Practise and Take Examinations */}
      <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-[#F4F7FA] space-y-5">
        <h2 className="font-display font-bold text-2xl text-[#10243D]">How Students Learn, Practise & Take Examinations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {[
            { step: '01. Choose Your Track', desc: 'Register under Science, Arts and Humanities, or Commercial to unlock common subjects plus department modules.' },
            { step: '02. Study & Watch', desc: 'Read written topic guides, download notes, watch curated Learning Centre lessons, and track your completion.' },
            { step: '03. Practise & Refine', desc: 'Take untimed practice questions or launch subject practice tests with instant topic-level feedback and Socratic AI tutoring.' },
            { step: '04. Sit Finals & Verify', desc: 'Complete 60-day qualifying preparation, sit timed examinations, and verify issued certificates via the public QR registry.' },
          ].map((item) => (
            <div key={item.step} className="p-4 rounded-xl bg-white border border-slate-200 space-y-1.5">
              <div className="font-display font-bold text-sm text-[#008F9F]">{item.step}</div>
              <p className="text-[#64748B] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technology, AI & International Development */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="flex items-center gap-2 text-[#008F9F] font-semibold text-xs">
            <Sparkles className="w-4 h-4" /> Role of Technology & Intelligent Tutoring
          </div>
          <h2 className="font-display font-bold text-lg text-[#10243D]">Human-Reviewed AI Assistance</h2>
          <p className="text-sm text-[#64748B] leading-relaxed">
            The EDUNEXA AI Tutor guides students step by step rather than simply handing out answers. In the administrator studio, AI-generated examination drafts remain strictly in Draft state until reviewed, edited, and published by qualified educators.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="flex items-center gap-2 text-[#008F9F] font-semibold text-xs">
            <Globe2 className="w-4 h-4" /> International Academic Standards
          </div>
          <h2 className="font-display font-bold text-lg text-[#10243D]">Global Reach & Learner Safeguards</h2>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Supporting WAEC, NECO, JAMB, SAT, GMAT, IELTS, TOEFL, GCSE, and A-Level preparation, EDUNEXA combines international standards with strict safeguards for under-18 students, including anonymised leaderboard options and moderated study groups.
          </p>
        </div>
      </div>

      {about.values && (
        <div className="p-6 rounded-xl border border-slate-200 bg-[#F4F7FA]/40 space-y-2">
          <h2 className="font-display font-bold text-lg text-[#10243D]">Core Academic Values</h2>
          <p className="text-sm text-[#64748B]">{about.values}</p>
        </div>
      )}

      <div className="p-6 rounded-xl border border-slate-200 bg-white space-y-3">
        <h2 className="font-display font-bold text-lg text-[#10243D]">Commitment to Accessible & Free Learning</h2>
        <p className="text-sm text-[#64748B] leading-relaxed">
          {about.commitment || 'EDUNEXA launches as a free-to-use platform: students register, access core and department subjects, practise timed assessments, study with the EDUNEXA AI Tutor, and earn verified 60-day certificates without entering payment details. EDUNEXA is an independent educational platform and does not claim affiliation with or endorsement by third-party examination boards unless explicitly stated.'}
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link to="/register" className="px-5 py-2.5 bg-[#008F9F] hover:bg-[#007482] text-white text-xs font-semibold rounded-lg">
            Register Free Student Account
          </Link>
          <Link to="/examinations" className="px-5 py-2.5 bg-[#F4F7FA] border border-slate-200 text-[#10243D] text-xs font-semibold rounded-lg">
            Explore Examinations
          </Link>
        </div>
      </div>
    </div>
  );
};

export const PublicSubjectsPage: React.FC = () => {
  const { bootstrap, user } = useApp();
  const [search, setSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState('All');

  const subjects = (bootstrap?.subjects || []).filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.group_name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesAccess = accessFilter === 'All' || s.access_classification === accessFilter;
    return matchesSearch && matchesAccess;
  });

  const filters = ['All', 'Common / All Students', 'Science', 'Arts and Humanities', 'Commercial'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-3">
          <h1 className="font-display font-bold text-3xl text-[#10243D]">Subjects & Department Eligibility</h1>
          <p className="text-sm sm:text-base text-[#64748B]">
            Common subjects (Mathematics, English Language, Computer Studies, General Knowledge) are open to every student across all departments. Department-specific subjects follow configured academic stream rules.
          </p>
        </div>
        <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-slate-200 h-44 bg-[#F4F7FA]">
          <CmsImage slotKey="subject_default" fallbackAlt="EDUNEXA Subject Catalogue" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex flex-wrap gap-1.5 p-1 bg-[#F4F7FA] rounded-lg border border-slate-200">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setAccessFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                accessFilter === f ? 'bg-white text-[#10243D] shadow-sm' : 'text-[#64748B] hover:text-[#10243D]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects or topics..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((s) => (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs text-[#64748B] mb-2">
                <span>{s.code}</span>
                <span aria-hidden="true"> · </span>
                <span className="font-semibold text-[#008F9F]">{s.access_classification}</span>
              </div>
              <h2 className="font-display font-bold text-lg text-[#10243D] mb-2">{s.name}</h2>
              <p className="text-sm text-[#64748B] leading-relaxed">{s.description}</p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
              <span>Eligible: {(s.eligible_departments || []).join(', ')}</span>
              <Link
                to={user ? '/student/subjects' : '/register'}
                className="font-semibold text-[#008F9F] hover:text-[#007482]"
              >
                {user ? 'Open Portal →' : 'Start Free →'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PublicExaminationsPage: React.FC = () => {
  const { bootstrap, user } = useApp();
  const examIntro = bootstrap?.siteAppearance?.examPageIntro ||
    'Explore timed mock examinations, cognitive reasoning assessments, and 60-day qualifying finals. Register for free to attempt eligible assessments with server-enforced timing and autosave.';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-3">
          <h1 className="font-display font-bold text-3xl text-[#10243D]">Published Examinations & Practice Assessments</h1>
          <p className="text-sm sm:text-base text-[#64748B]">{examIntro}</p>
        </div>
        <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-slate-200 h-44 bg-[#F4F7FA]">
          <CmsImage slotKey="exam_banner" fallbackAlt="EDUNEXA Examination Banner" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(bootstrap?.examinations || []).map((ex) => (
          <div key={ex.id} className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs text-[#64748B]">
                <span>{ex.subject_name}</span>
                <span aria-hidden="true"> · </span>
                <span className="text-[#008F9F] font-semibold">{ex.exam_framework}</span>
                <span aria-hidden="true"> · </span>
                <span>{ex.access_classification}</span>
              </div>
              <h2 className="font-display font-bold text-xl text-[#10243D]">{ex.title}</h2>
              <p className="text-sm text-[#64748B]">{ex.instructions}</p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs text-[#64748B]">
              <div className="flex items-center gap-4 font-mono-tabular">
                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {ex.duration_minutes} mins</span>
                <span>{ex.question_count} questions</span>
                <span>Pass: {ex.pass_mark}%</span>
              </div>
              <Link
                to={user ? '/student/exams' : '/login'}
                className="px-4 py-2 bg-[#008F9F] hover:bg-[#007482] text-white font-semibold rounded-lg transition-colors"
              >
                {user ? 'Open in Exam Centre' : 'Log In to Attempt'}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PublicLearningCentrePage: React.FC = () => {
  const { bootstrap, user } = useApp();
  const [activeGuide, setActiveGuide] = useState<any>(null);
  const materials = bootstrap?.learningMaterials || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-3">
          <h1 className="font-display font-bold text-3xl text-[#10243D]">EDUNEXA Learning Centre</h1>
          <p className="text-sm sm:text-base text-[#64748B]">
            Written study guides, curriculum topic explanations, downloadable resources, and educational video lessons aligned with 60-day qualifying programmes.
          </p>
          <div className="pt-2">
            <Link
              to={user ? '/student/learning' : '/register'}
              className="inline-block px-5 py-2.5 bg-[#008F9F] text-white text-sm font-semibold rounded-lg whitespace-nowrap"
            >
              {user ? 'Track Progress in Portal' : 'Register to Track Progress'}
            </Link>
          </div>
        </div>
        <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-slate-200 h-44 bg-[#F4F7FA]">
          <CmsImage slotKey="learning_centre_image" fallbackAlt="EDUNEXA Learning Centre" className="w-full h-full object-cover" />
        </div>
      </div>

      {/* Written Study & Reading Materials */}
      <section className="space-y-5">
        <div>
          <h2 className="font-display font-bold text-2xl text-[#10243D]">Study Guides & Reading Materials</h2>
          <p className="text-sm text-[#64748B]">Open any guide to read concise topic explanations and worked examples.</p>
        </div>
        {materials.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-[#F4F7FA] p-6 text-sm text-[#64748B]">
            Study guides are being prepared by EDUNEXA educators.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {materials.map((m: any) => (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#008F9F] inline-flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{m.subject_name} · {m.material_type}</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#10243D]">{m.title}</h3>
                  <div className="text-xs font-medium text-[#64748B]">Topic: {m.topic_name}</div>
                  <p className="text-sm text-[#64748B] leading-relaxed">{m.summary}</p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveGuide(m)}
                    className="px-4 py-2 bg-[#10243D] hover:bg-[#1b3658] text-white font-semibold rounded-lg"
                  >
                    Read Study Guide
                  </button>
                  {m.document_url && (
                    <a
                      href={m.document_url}
                      target="_blank"
                      rel="noreferrer"
                      download={m.document_name || true}
                      className="inline-flex items-center gap-1 text-[#008F9F] font-semibold hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" /> {m.document_name || 'Download'}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Video Lessons */}
      <section className="space-y-5">
        <div>
          <h2 className="font-display font-bold text-2xl text-[#10243D]">Curated Video Lessons</h2>
          <p className="text-sm text-[#64748B]">Visual explanations covering core examination concepts.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {(bootstrap?.videos || []).map((v) => (
            <div key={v.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <div className="aspect-video bg-[#10243D]">
                <iframe
                  src={`https://www.youtube.com/embed/${v.youtube_id}`}
                  title={v.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="p-5 space-y-2">
                <div className="text-xs text-[#64748B]">
                  <span className="font-semibold text-[#008F9F]">{v.subject_name}</span>
                  {v.topic && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span>{v.topic}</span>
                    </>
                  )}
                </div>
                <h3 className="font-display font-bold text-lg text-[#10243D]">{v.title}</h3>
                <p className="text-sm text-[#64748B]">{v.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Study Guide Inline Reader Modal */}
      {activeGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="text-xs font-semibold text-[#008F9F]">
                  {activeGuide.subject_name} · {activeGuide.topic_name} · {activeGuide.material_type}
                </div>
                <h3 className="font-display font-bold text-2xl text-[#10243D] mt-1">{activeGuide.title}</h3>
              </div>
              <button type="button" onClick={() => setActiveGuide(null)} className="text-xs font-semibold text-[#64748B] hover:text-[#10243D]">
                Close
              </button>
            </div>
            <div className="text-sm text-[#10243D] leading-relaxed whitespace-pre-wrap">{activeGuide.content_body}</div>
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {activeGuide.document_url ? (
                <a
                  href={activeGuide.document_url}
                  target="_blank"
                  rel="noreferrer"
                  download={activeGuide.document_name || true}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#008F9F] hover:underline"
                >
                  <Download className="w-4 h-4" /> Download Attachment ({activeGuide.document_name})
                </a>
              ) : (
                <span className="text-xs text-[#64748B]">Sign in to track study completion and save favourites.</span>
              )}
              <Link
                to={user ? '/student/learning' : '/register'}
                className="px-4 py-2 bg-[#008F9F] text-white text-xs font-semibold rounded-lg"
              >
                {user ? 'Track Progress in Student Portal' : 'Register Free to Track Progress'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const PublicCommunityPage: React.FC = () => {
  const { user } = useApp();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 space-y-5 flex flex-col justify-center">
          <h1 className="font-display font-bold text-3xl text-[#10243D]">International Student Community</h1>
          <p className="text-base text-[#64748B] leading-relaxed">
            Connect across Mathematics, English Language, Sciences, Arts and Humanities, Commercial Studies, SAT/GMAT, and JAMB/WAEC study groups. Built with active moderation, reporting controls, and privacy protections for younger learners.
          </p>
          <div>
            <Link
              to={user ? '/student/community' : '/register'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#008F9F] hover:bg-[#007482] text-white text-sm font-semibold rounded-lg"
            >
              <Users className="w-4 h-4" />
              {user ? 'Open Community Forum' : 'Join Community Free'}
            </Link>
          </div>
        </div>
        <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 min-h-[280px]">
          <CmsImage slotKey="feature_community" fallbackAlt="International student community" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
};

export const TestimonialsPage: React.FC = () => {
  const { bootstrap, user } = useApp();
  const [form, setForm] = useState({
    display_name: '',
    country: '',
    programme_title: 'WAEC / JAMB / SAT Preparation',
    achievement: '',
    quote: '',
    certificate_number: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitState, setSubmitState] = useState<{ type: 'idle' | 'submitting' | 'success' | 'error'; msg?: string }>({ type: 'idle' });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        display_name: prev.display_name || user.public_display_name || (user.is_minor ? `@${user.username}` : user.full_name),
        country: prev.country || user.country || '',
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitState({ type: 'submitting' });
    try {
      const fd = new FormData();
      fd.append('display_name', form.display_name);
      fd.append('country', form.country);
      fd.append('programme_title', form.programme_title);
      fd.append('achievement', form.achievement || 'EDUNEXA Learner');
      fd.append('quote', form.quote);
      fd.append('certificate_number', form.certificate_number);
      if (photoFile) fd.append('photo', photoFile);

      const res = await apiFetch('/api/public/testimonials', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) {
        setSubmitState({ type: 'error', msg: d.error || 'Could not submit testimonial.' });
      } else {
        setSubmitState({ type: 'success', msg: d.message });
        setForm({ ...form, achievement: '', quote: '', certificate_number: '' });
        setPhotoFile(null);
      }
    } catch {
      setSubmitState({ type: 'error', msg: 'Network error while submitting testimonial.' });
    }
  };

  const approvedTestimonials = bootstrap?.testimonials || [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="space-y-2 max-w-3xl">
        <h1 className="font-display font-bold text-3xl text-[#10243D]">Student Success Stories & Testimonials</h1>
        <p className="text-sm sm:text-base text-[#64748B]">
          Authentic experiences shared by EDUNEXA learners. Every submitted story undergoes administrator review before public publication.
        </p>
      </div>

      {approvedTestimonials.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-[#F4F7FA] p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-[#10243D]">No published testimonials yet.</p>
          <p className="text-xs text-[#64748B]">
            Be the first learner to share your preparation experience using the submission form below.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {approvedTestimonials.map((t: any) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col justify-between space-y-4">
              <p className="text-sm text-[#10243D] leading-relaxed">“{t.quote}”</p>
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3 text-xs text-[#64748B]">
                {t.avatar_url ? (
                  <img src={t.avatar_url} alt={t.display_name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#EAF9FB] text-[#008F9F] font-bold flex items-center justify-center shrink-0">
                    {String(t.display_name || 'E').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#10243D] text-sm">
                    {t.display_name} {t.country ? `· ${t.country}` : ''}
                  </div>
                  <div className="text-[#008F9F] font-medium">
                    {t.programme_title} — {t.achievement}
                  </div>
                  {t.certificate_number && (
                    <div>
                      Certificate: <Link to={`/verify?code=${t.certificate_number}`} className="font-mono-tabular underline">{t.certificate_number}</Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Testimonial Submission Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-[#F4F7FA] p-6 sm:p-8 space-y-5">
        <div>
          <h2 className="font-display font-bold text-xl text-[#10243D]">Submit Your Testimonial</h2>
          <p className="text-xs text-[#64748B] mt-1">
            All submissions are saved with status <strong>Pending</strong> and appear publicly only after EDUNEXA administrator approval.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[#10243D] mb-1">Display Name *</label>
            <input
              required
              type="text"
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="Your name or handle"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#10243D] mb-1">Subject or Examination</label>
            <input
              type="text"
              value={form.programme_title}
              onChange={(e) => setForm({ ...form, programme_title: e.target.value })}
              placeholder="e.g. Mathematics · WAEC / SAT"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-[#10243D] mb-1">Achievement / Country</label>
            <input
              type="text"
              value={form.achievement}
              onChange={(e) => setForm({ ...form, achievement: e.target.value })}
              placeholder="e.g. Completed 60-Day Track"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>
        </div>

        <div className="text-xs">
          <label className="block font-semibold text-[#10243D] mb-1">Your Message *</label>
          <textarea
            required
            rows={4}
            value={form.quote}
            onChange={(e) => setForm({ ...form, quote: e.target.value })}
            placeholder="Share how EDUNEXA helped your preparation..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-slate-300 bg-white cursor-pointer hover:border-[#008F9F]">
            <Upload className="w-4 h-4 text-[#008F9F]" />
            <span>{photoFile ? `Selected: ${photoFile.name}` : 'Optional Photo Upload (JPG/PNG/WEBP, max 5 MB)'}</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </label>

          <button
            type="submit"
            disabled={submitState.type === 'submitting'}
            className="px-6 py-2.5 bg-[#008F9F] hover:bg-[#007482] text-white font-semibold rounded-lg disabled:opacity-60"
          >
            {submitState.type === 'submitting' ? 'Submitting...' : 'Submit Testimonial'}
          </button>
        </div>

        {submitState.type === 'error' && <p className="text-xs text-red-600">{submitState.msg}</p>}
        {submitState.type === 'success' && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {submitState.msg}
          </div>
        )}
      </form>
    </div>
  );
};

export const FaqPage: React.FC = () => {
  const { bootstrap } = useApp();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div className="space-y-2">
        <h1 className="font-display font-bold text-3xl text-[#10243D]">Frequently Asked Questions</h1>
        <p className="text-sm sm:text-base text-[#64748B]">Clear answers about free access, subject eligibility, 60-day programmes, and certificates.</p>
      </div>
      <div className="space-y-4">
        {(bootstrap?.faqs || []).map((f) => (
          <div key={f.id} className="rounded-xl border border-slate-200 bg-white p-6 space-y-2">
            <div className="text-xs font-semibold text-[#008F9F]">{f.category}</div>
            <h2 className="font-display font-bold text-lg text-[#10243D]">{f.question}</h2>
            <p className="text-sm text-[#64748B] leading-relaxed">{f.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { bootstrap } = useApp();
  const contact = bootstrap?.cmsBlocks?.contact || {};
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', honeypot: '' });
  const [status, setStatus] = useState<{ type: 'idle' | 'submitting' | 'success' | 'error'; msg?: string }>({ type: 'idle' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'submitting' });
    try {
      const res = await apiFetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.error || 'Could not send enquiry.' });
      } else {
        setStatus({ type: 'success', msg: data.message });
        setForm({ name: '', email: '', subject: '', message: '', honeypot: '' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'Network error while sending enquiry.' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-4">
          <h1 className="font-display font-bold text-3xl text-[#10243D]">Contact EDUNEXA</h1>
          <p className="text-sm text-[#64748B] leading-relaxed">
            Questions about academic programmes, certificate verification, or institutional support? Send a message directly to our team.
          </p>
          <div className="p-5 rounded-xl bg-[#F4F7FA] border border-slate-200 space-y-3 text-sm">
            <div className="flex items-center gap-2.5 text-[#10243D] font-medium">
              <Mail className="w-4 h-4 text-[#008F9F]" />
              <span>{contact.email || 'admissions@edunexa.org'}</span>
            </div>
            <div className="text-xs text-[#64748B]">{contact.supportHours || 'Monday – Friday, 08:00 – 18:00 UTC'}</div>
            <div className="text-xs text-[#64748B]">{contact.address || 'EDUNEXA Academic Operations'}</div>
          </div>
        </div>

        <form onSubmit={submit} className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4">
          <input
            type="text"
            value={form.honeypot}
            onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Full Name</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Email Address</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#10243D] mb-1">Subject</label>
            <input
              required
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#10243D] mb-1">Message</label>
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
            />
          </div>

          {status.type === 'error' && <p className="text-sm text-red-600">{status.msg}</p>}
          {status.type === 'success' && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {status.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={status.type === 'submitting'}
            className="px-6 py-2.5 bg-[#008F9F] hover:bg-[#007482] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
          >
            {status.type === 'submitting' ? 'Sending...' : 'Send Enquiry'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const LegalPage: React.FC<{ kind: 'privacy' | 'terms' }> = ({ kind }) => (
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
    <h1 className="font-display font-bold text-3xl text-[#10243D]">
      {kind === 'privacy' ? 'Privacy Policy & Minor Safeguards' : 'Terms of Use & Academic Integrity'}
    </h1>
    <div className="prose prose-slate max-w-none text-sm text-[#64748B] space-y-4 leading-relaxed">
      {kind === 'privacy' ? (
        <>
          <p>EDUNEXA collects only the information necessary to deliver learning programmes, verify assessment integrity, and issue digital certificates. Passwords are hashed using bcrypt and never stored in plaintext.</p>
          <p><strong>Safeguards for Minors:</strong> Accounts belonging to learners under 18 automatically default to private profile visibility, anonymised leaderboard display handles, moderated group participation, and disabled unrestricted direct messaging.</p>
          <p>Students may update notification preferences, edit profile visibility, or submit an account deletion request at any time from their Profile Settings.</p>
        </>
      ) : (
        <>
          <p>EDUNEXA is provided free of charge in its initial release. No payment details are requested or required for registration, learning materials, practice tests, or certificate issuance.</p>
          <p>All practice questions and AI-assisted study resources are original educational materials. EDUNEXA does not claim endorsement by external examination boards unless explicitly stated.</p>
          <p>Certificates are issued solely upon verified completion of programme requirements (including the 60-day minimum preparation period where applicable) and passing the qualifying final examination.</p>
        </>
      )}
    </div>
  </div>
);
