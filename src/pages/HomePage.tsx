import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CheckCircle2, FileText, Globe2, PlayCircle, ShieldCheck } from 'lucide-react';
import { CmsImage } from '../components/CmsImage';
import { useApp } from '../context/AppContext';

export const HomePage: React.FC = () => {
  const { bootstrap, bootstrapLoading, user } = useApp();
  const hero = bootstrap?.cmsBlocks?.hero || {};
  const appearance = bootstrap?.siteAppearance || {};
  const stats = bootstrap?.stats;
  const primaryColor = appearance.primaryColor || '#008F9F';

  const examFrameworks = [
    { name: 'SAT & GMAT', scope: 'International Admissions · Quantitative, Verbal & Data Insights' },
    { name: 'WAEC, JAMB & NECO', scope: 'West African Senior Secondary & University Matriculation' },
    { name: 'IELTS & TOEFL', scope: 'Academic English Reading, Writing & Cohesion' },
    { name: 'GCSE & A-Level', scope: 'British & Cambridge International Curriculum Tracks' },
    { name: 'Cognitive & Reasoning', scope: 'Numerical, Verbal, Abstract & Logical Problem-Solving' },
    { name: '60-Day Qualifying Finals', scope: 'Structured Two-Month Programmes with Verifiable Certificates' },
  ];

  const statItems = [
    { label: 'Active Students', value: stats?.studentsCount ?? 0 },
    { label: 'Published Subjects', value: stats?.subjectsCount ?? 0 },
    { label: 'Published Questions', value: stats?.questionsCount ?? 0 },
    { label: 'Issued Certificates', value: stats?.certificatesCount ?? 0 },
  ];

  const allSubjects = bootstrap?.subjects || [];
  const featuredIds: number[] = Array.isArray(appearance.featuredSubjectIds) ? appearance.featuredSubjectIds : [];
  const featuredSubjects =
    featuredIds.length > 0
      ? allSubjects.filter((s: any) => featuredIds.includes(s.id)).slice(0, 6)
      : allSubjects.slice(0, 6);
  const displaySubjects = featuredSubjects.length > 0 ? featuredSubjects : allSubjects.slice(0, 6);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <p className="text-sm font-semibold tracking-wide" style={{ color: primaryColor }}>
                {hero.tagline || 'The Next Generation of Learning.'}
              </p>
              <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-[#10243D] tracking-tight leading-[1.12] [text-wrap:balance]">
                {hero.headline || 'YOUR KNOWLEDGE. YOUR FUTURE. YOUR WORLD.'}
              </h1>
              <p className="text-base sm:text-lg text-[#64748B] leading-relaxed max-w-xl">
                {hero.subheadline || 'Discover a smarter way to learn, practise, compete and excel through a global examination and educational platform powered by intelligent technology.'}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to={user ? (user.role === 'student' ? '/student/dashboard' : '/admin/dashboard') : '/student/register'}
                  style={{ backgroundColor: primaryColor }}
                  className="inline-flex items-center gap-2 px-5 py-3 hover:opacity-90 text-white font-semibold text-sm rounded-lg transition-opacity whitespace-nowrap"
                >
                  {user ? (user.role === 'student' ? 'Go to Student Portal' : 'Go to Admin Portal') : (hero.primaryCta || 'Register Now')}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {!user && (
                  <Link
                    to="/student/login"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#10243D] hover:bg-[#1b3658] text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap"
                  >
                    Student Login
                  </Link>
                )}
                <Link
                  to="/examinations"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#F4F7FA] hover:bg-[#EAF9FB] text-[#10243D] font-semibold text-sm rounded-lg border border-slate-200 transition-colors whitespace-nowrap"
                >
                  {hero.secondaryCta || 'Explore Examinations'}
                </Link>
              </div>

              <p className="text-xs text-[#64748B] pt-1">
                {hero.announcement || 'Free initial release: no subscription fees or payment details required to register, study, or earn verified certificates.'}
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[300px] lg:min-h-[420px] rounded-2xl overflow-hidden border border-slate-200 bg-[#F4F7FA]">
                <CmsImage
                  slotKey="homepage_hero"
                  fallbackAlt="International students studying collaboratively on EDUNEXA"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Genuine Database Platform Statistics */}
          {appearance.showStatsSection !== false && (
            <div className="mt-14 pt-10 border-t border-slate-200 grid grid-cols-2 lg:grid-cols-4 gap-6">
              {statItems.map((item) => (
                <div key={item.label} className="bg-[#F4F7FA] rounded-xl p-5 border border-slate-200/80">
                  <div className="font-mono-tabular text-2xl sm:text-3xl font-bold text-[#10243D]">
                    {bootstrapLoading ? '—' : item.value.toLocaleString()}
                  </div>
                  <div className="text-xs sm:text-sm text-[#64748B] mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Introduction to EDUNEXA */}
      <section className="bg-[#F4F7FA] py-14 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: primaryColor }}>
              Introduction to EDUNEXA
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#10243D]">
              Accessible Global Examination Preparation & Academic Community
            </h2>
            <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
              EDUNEXA unites structured subject curricula, study guides, video lessons, practice examinations, verified 60-day programmes, and Socratic AI tutoring inside a free-to-start international platform built for Science, Arts and Humanities, and Commercial learners.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="font-semibold text-[#10243D]">Zero Financial Barriers</div>
              <p className="text-[#64748B]">Free initial access to subjects, study materials, practice tests, and QR-verified certificates.</p>
            </div>
            <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-1">
              <div className="font-semibold text-[#10243D]">Cross-Border Standards</div>
              <p className="text-[#64748B]">Supports WAEC, NECO, JAMB, SAT, GMAT, IELTS, TOEFL, GCSE, and A-Level tracks.</p>
            </div>
            <div className="sm:col-span-2 flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
              <span className="text-[#64748B]">Explore our mission, objectives, and minor safety safeguards</span>
              <Link to="/about" className="font-semibold hover:underline whitespace-nowrap" style={{ color: primaryColor }}>
                About EDUNEXA →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Examination Frameworks & Department Access */}
      {appearance.showFrameworksSection !== false && (
        <section className="bg-[#EAF9FB] py-16 lg:py-20 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div className="max-w-2xl space-y-2">
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#10243D] [text-wrap:balance]">
                  Curriculum-Aligned Examination Preparation
                </h2>
                <p className="text-sm sm:text-base text-[#64748B]">
                  Prepare across national and international frameworks with common subjects open to every stream and specialised tracks for Science, Arts, and Commercial students.
                </p>
              </div>
              <Link to="/examinations" className="text-sm font-semibold hover:opacity-80 inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: primaryColor }}>
                View all examinations <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {examFrameworks.map((fw, idx) => (
                <div key={fw.name} className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-mono-tabular mb-2" style={{ color: primaryColor }}>0{idx + 1}. Framework</div>
                    <h3 className="font-display font-bold text-lg text-[#10243D] mb-2">{fw.name}</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">{fw.scope}</p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 text-xs text-[#64748B]">
                    Independent practice · Timed assessment · Detailed explanations
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Subjects Preview */}
      {appearance.showSubjectsSection !== false && (
        <section className="bg-white py-16 lg:py-20 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
              <div className="max-w-2xl space-y-2">
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#10243D]">
                  Featured Core & Department Subjects
                </h2>
                <p className="text-sm sm:text-base text-[#64748B]">
                  Mathematics, English Language, Computer Studies, and General Knowledge are open to all students. Science, Arts, and Commercial subjects follow configured department eligibility.
                </p>
              </div>
              <Link to="/subjects" className="text-sm font-semibold hover:opacity-80 inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: primaryColor }}>
                Browse subject catalogue <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displaySubjects.map((subj: any) => (
                <div key={subj.id} className="rounded-xl border border-slate-200 bg-[#F4F7FA]/60 p-6 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-[#64748B] mb-2">
                      <span>{subj.code}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-medium" style={{ color: primaryColor }}>{subj.access_classification}</span>
                    </div>
                    <h3 className="font-display font-bold text-lg text-[#10243D] mb-2">{subj.name}</h3>
                    <p className="text-sm text-[#64748B] leading-relaxed">{subj.description}</p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-[#64748B]">
                    <span>{subj.group_name}</span>
                    <Link to="/subjects" className="font-semibold text-[#10243D] hover:text-[#008F9F]">
                      Inspect syllabus →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Learning Centre Preview */}
      <section className="bg-white py-16 lg:py-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#10243D]">
                Learning Centre Preview — Study Guides & Video Lessons
              </h2>
              <p className="text-sm sm:text-base text-[#64748B]">
                Read concise syllabus explanations, download study guides, and watch curated lessons connected directly to each examination track.
              </p>
            </div>
            <Link to="/learning-centre" className="text-sm font-semibold hover:opacity-80 inline-flex items-center gap-1.5 whitespace-nowrap" style={{ color: primaryColor }}>
              Explore full Learning Centre <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(bootstrap?.learningMaterials || []).slice(0, 3).map((mat: any) => (
              <div key={`mat-${mat.id}`} className="rounded-xl border border-slate-200 bg-[#F4F7FA]/60 p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xs font-semibold flex items-center gap-1.5 mb-2" style={{ color: primaryColor }}>
                    <FileText className="w-3.5 h-3.5" />
                    <span>{mat.subject_name} · {mat.material_type}</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-[#10243D] mb-2">{mat.title}</h3>
                  <p className="text-xs text-[#64748B] leading-relaxed">{mat.summary}</p>
                </div>
                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-[#64748B]">{mat.topic_name}</span>
                  <Link to="/learning-centre" className="font-semibold text-[#10243D] hover:text-[#008F9F]">
                    Read Study Guide →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {(bootstrap?.videos || []).length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {(bootstrap?.videos || []).slice(0, 3).map((v: any) => (
                <div key={`vid-${v.id}`} className="rounded-xl border border-slate-200 bg-white p-5 flex items-start gap-3">
                  <PlayCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                  <div className="space-y-1">
                    <div className="text-xs font-semibold" style={{ color: primaryColor }}>{v.subject_name}</div>
                    <div className="font-display font-bold text-sm text-[#10243D]">{v.title}</div>
                    <p className="text-xs text-[#64748B] line-clamp-2">{v.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI Tutor & Online Examination Engine Feature Split */}
      {appearance.showAiSection !== false && (
        <section className="bg-[#F4F7FA] py-16 lg:py-20 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 bg-white min-h-[280px]">
                <CmsImage
                  slotKey="feature_ai_learning"
                  fallbackAlt="EDUNEXA AI Tutor and Curriculum Analytics"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
                <div className="text-xs font-semibold" style={{ color: primaryColor }}>01. Intelligent Academic Guidance</div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#10243D] [text-wrap:balance]">
                  Guided Problem Solving with EDUNEXA AI Tutor
                </h2>
                <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                  Students work step-by-step through mathematical proofs, scientific laws, and essay structure with an academic tutor designed to teach reasoning rather than hand out shortcuts. On the academic side, administrators generate syllabus-referenced draft questions checked against official curriculum sources before human approval.
                </p>
                <ul className="space-y-2.5 text-sm text-[#10243D]">
                  <li className="flex items-start gap-2.5"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primaryColor }} /> Step-by-step Socratic explanations and mistake diagnosis</li>
                  <li className="flex items-start gap-2.5"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primaryColor }} /> Server-side timing, autosave recovery, and objective auto-marking</li>
                  <li className="flex items-start gap-2.5"><CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: primaryColor }} /> Age-appropriate safeguards and transparent assessment rubrics</li>
                </ul>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center space-y-5 order-2 lg:order-1">
                <div className="text-xs font-semibold" style={{ color: primaryColor }}>02. Sixty-Day Programmes & Verifiable Certificates</div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#10243D] [text-wrap:balance]">
                  Structured Preparation Leading to Verifiable Credentials
                </h2>
                <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                  Enrol in a qualifying programme, complete at least 60 days of structured lessons and practice assessments, sit the scheduled final examination, and earn an official PDF certificate with a live QR verification record.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    to="/verify"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#10243D] hover:bg-[#1b3658] text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#90DFEC]" />
                    Verify a Certificate
                  </Link>
                  <Link
                    to="/learning-centre"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 hover:border-[#008F9F] text-[#10243D] text-sm font-semibold rounded-lg transition-colors"
                  >
                    Browse Video Lessons
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-6 rounded-2xl overflow-hidden border border-slate-200 bg-white min-h-[280px] order-1 lg:order-2">
                <CmsImage
                  slotKey="feature_exam_engine"
                  fallbackAlt="EDUNEXA Timed Examination Interface"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Live Leaderboard & Verified Student Stories */}
      {(appearance.showLeaderboardSection !== false || appearance.showTestimonialsSection !== false) && (
        <section className="bg-white py-16 lg:py-20 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              {appearance.showLeaderboardSection !== false && (
                <div className={`${appearance.showTestimonialsSection !== false ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-bold text-2xl text-[#10243D]">EDUNEXA Leaders</h2>
                      <p className="text-sm text-[#64748B]">Ranked strictly by verified graded examination scores.</p>
                    </div>
                    <Link to="/leaders" className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: primaryColor }}>
                      <Award className="w-4 h-4" /> Full Standings →
                    </Link>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <table className="w-full text-sm">
                      <thead className="bg-[#F4F7FA] text-[#64748B] text-xs">
                        <tr>
                          <th className="text-left py-3 px-4 font-semibold">Pos</th>
                          <th className="text-left py-3 px-4 font-semibold">Student</th>
                          <th className="text-left py-3 px-4 font-semibold">Subject</th>
                          <th className="text-right py-3 px-4 font-semibold">Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(bootstrap?.leaderboard || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-6 px-4 text-center text-[#64748B]">
                              No graded assessments recorded yet.
                            </td>
                          </tr>
                        ) : (
                          (bootstrap?.leaderboard || []).slice(0, 5).map((entry: any) => (
                            <tr key={`${entry.user_id}-${entry.subject_id}`} className="hover:bg-[#EAF9FB]/40">
                              <td className="py-3 px-4 font-mono-tabular font-semibold" style={{ color: primaryColor }}>#{entry.position}</td>
                              <td className="py-3 px-4 font-medium text-[#10243D]">{entry.display_name}</td>
                              <td className="py-3 px-4 text-[#64748B]">{entry.subject_name}</td>
                              <td className="py-3 px-4 text-right font-mono-tabular font-semibold text-[#10243D]">
                                {entry.score_percentage}%
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {appearance.showTestimonialsSection !== false && (
                <div className={`${appearance.showLeaderboardSection !== false ? 'lg:col-span-6' : 'lg:col-span-12'} space-y-5`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-bold text-2xl text-[#10243D]">Student Success Stories</h2>
                      <p className="text-sm text-[#64748B]">Reviewed and approved stories from EDUNEXA learners.</p>
                    </div>
                    <Link to="/testimonials" className="text-sm font-semibold hover:opacity-80" style={{ color: primaryColor }}>
                      View & Submit →
                    </Link>
                  </div>

                  {(bootstrap?.testimonials || []).length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-[#F4F7FA]/60 p-6 space-y-2 text-sm text-[#64748B]">
                      <p>Approved student testimonials will appear here once reviewed by EDUNEXA administrators.</p>
                      <Link to="/testimonials" className="inline-block font-semibold hover:underline" style={{ color: primaryColor }}>
                        Share your learning story →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(bootstrap?.testimonials || []).slice(0, 2).map((t: any) => (
                        <blockquote key={t.id} className="rounded-xl border border-slate-200 bg-[#F4F7FA]/60 p-6 space-y-3">
                          <p className="text-sm text-[#10243D] leading-relaxed">“{t.quote}”</p>
                          <footer className="text-xs text-[#64748B] flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
                            {t.avatar_url && (
                              <img src={t.avatar_url} alt={t.display_name} className="w-6 h-6 rounded-full object-cover border border-slate-200" />
                            )}
                            <span className="font-semibold text-[#10243D]">{t.display_name}</span>
                            {t.country && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{t.country}</span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="font-medium" style={{ color: primaryColor }}>{t.achievement}</span>
                          </footer>
                        </blockquote>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* International Community & Final Registration CTA */}
      {appearance.showCommunitySection !== false && (
        <section className="bg-[#EAF9FB] py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center space-y-5">
                <div className="inline-flex items-center gap-2 text-xs font-semibold" style={{ color: primaryColor }}>
                  <Globe2 className="w-4 h-4" /> International Student Community
                </div>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#10243D] [text-wrap:balance]">
                  Collaborate Across Subject Groups and Exam Cohorts
                </h2>
                <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                  Join moderated subject groups for Mathematics, Sciences, Arts, Commercial Studies, SAT/GMAT, and WAEC/JAMB preparation. Share worked solutions, ask questions, and build lasting study habits—completely free.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <Link
                    to={user ? (user.role === 'student' ? '/student/dashboard' : '/admin/dashboard') : '/student/register'}
                    style={{ backgroundColor: primaryColor }}
                    className="px-6 py-3 hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-opacity"
                  >
                    {user ? 'Open Dashboard' : 'Create Free Student Account'}
                  </Link>
                  <Link
                    to="/community"
                    className="px-6 py-3 bg-[#F4F7FA] hover:bg-slate-200/70 text-[#10243D] text-sm font-semibold rounded-lg transition-colors"
                  >
                    Explore Community
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-5 min-h-[260px]">
                <CmsImage
                  slotKey="feature_community"
                  fallbackAlt="Students collaborating in EDUNEXA community"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
