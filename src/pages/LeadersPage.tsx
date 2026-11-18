import React, { useCallback, useEffect, useState } from 'react';
import { Award, Medal, ShieldCheck, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../utils/apiFetch';

const CATEGORIES = [
  { id: 'overall', label: 'Overall Leaders' },
  { id: 'mathematics', label: 'Mathematics Leaders' },
  { id: 'english', label: 'English Language Leaders' },
  { id: 'science', label: 'Science Leaders' },
  { id: 'other', label: 'Other Subject Leaders' },
];

const EXAM_TYPES = ['All', 'WAEC', 'NECO', 'JAMB', 'SAT', 'GMAT', 'IELTS', 'TOEFL', 'GCSE', 'A-Level', 'General Practice'];

export const LeadersPage: React.FC = () => {
  const { bootstrap } = useApp();
  const [category, setCategory] = useState('overall');
  const [subjectId, setSubjectId] = useState('');
  const [examType, setExamType] = useState('All');
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLeaders = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set('category', category);
      if (subjectId) qs.set('subjectId', subjectId);
      if (examType && examType !== 'All') qs.set('examType', examType);
      const res = await apiFetch(`/api/public/leaders?${qs.toString()}`);
      if (res.ok) {
        const d = await res.json();
        setLeaders(d.leaders || []);
      }
    } finally {
      setLoading(false);
    }
  }, [category, subjectId, examType]);

  useEffect(() => {
    loadLeaders();
  }, [loadLeaders]);

  const topThree = leaders.slice(0, 3);

  return (
    <div className="bg-white">
      {/* Header Banner */}
      <section className="bg-[#10243D] text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#90DFEC]">
            Official Academic Standings
          </p>
          <h1 className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight">
            EDUNEXA LEADERS
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
            Recognising top-performing learners strictly from verified, submitted, and graded examinations and practice assessments. Public standings honour student consent preferences and minor privacy safeguards.
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#90DFEC]" /> Verified Graded Attempts Only
            </span>
            <span aria-hidden="true">·</span>
            <span>Consent-Based Display Names</span>
            <span aria-hidden="true">·</span>
            <Link to="/student/profile" className="text-[#90DFEC] hover:underline font-semibold">
              Manage Your Leaderboard Visibility →
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Category Tabs & Filters */}
        <div className="bg-[#F4F7FA] border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#008F9F] text-white'
                      : 'bg-white text-[#64748B] border border-slate-200 hover:text-[#10243D]'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Filter by Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              >
                <option value="">All Subjects</option>
                {(bootstrap?.subjects || []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.access_classification})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#10243D] mb-1">Filter by Examination / Practice Type</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
              >
                {EXAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'All' ? 'All Examination Types' : t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setCategory('overall');
                  setSubjectId('');
                  setExamType('All');
                }}
                className="px-4 py-2 text-xs font-semibold text-[#10243D] bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Top Three Highlight */}
        {!loading && topThree.length > 0 && (
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl text-[#10243D]">Top Three Performing Students</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topThree.map((entry, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={`${entry.user_id}-${entry.subject_id}`}
                    className={`rounded-2xl border p-6 flex flex-col justify-between space-y-5 ${
                      isFirst
                        ? 'bg-[#10243D] text-white border-[#10243D]'
                        : 'bg-[#EAF9FB]/60 text-[#10243D] border-[#90DFEC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className={`text-xs font-mono-tabular font-bold uppercase ${isFirst ? 'text-[#90DFEC]' : 'text-[#008F9F]'}`}>
                          Position #{entry.position}
                        </div>
                        <h3 className="font-display font-bold text-xl mt-1">{entry.display_name}</h3>
                        <p className={`text-xs mt-1 ${isFirst ? 'text-slate-300' : 'text-[#64748B]'}`}>
                          {entry.department} · {entry.country}
                        </p>
                      </div>
                      {isFirst ? (
                        <Trophy className="w-7 h-7 text-[#90DFEC] shrink-0" />
                      ) : idx === 1 ? (
                        <Medal className="w-7 h-7 text-[#008F9F] shrink-0" />
                      ) : (
                        <Award className="w-7 h-7 text-[#008F9F] shrink-0" />
                      )}
                    </div>

                    <div className={`pt-4 border-t flex items-end justify-between ${isFirst ? 'border-slate-700' : 'border-[#90DFEC]/60'}`}>
                      <div className="text-xs space-y-0.5">
                        <div className="font-semibold">{entry.subject_name}</div>
                        <div className={isFirst ? 'text-slate-300' : 'text-[#64748B]'}>
                          {entry.exam_framework || entry.exam_category} · {entry.exams_completed} graded
                        </div>
                      </div>
                      <div className="font-mono-tabular text-3xl font-extrabold">
                        {entry.score_percentage}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full Standings Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-display font-bold text-lg text-[#10243D]">Complete Merit Standings</h2>
            <span className="text-xs font-mono-tabular text-[#64748B]">{leaders.length} verified entries</span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-[#64748B]">Calculating verified standings...</div>
          ) : leaders.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-sm font-medium text-[#10243D]">No verified graded results match this filter yet.</p>
              <p className="text-xs text-[#64748B]">
                Only students who have consented to public leaderboard visibility and completed graded assessments appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#F4F7FA] text-[#64748B] text-xs">
                  <tr>
                    <th className="text-left py-3.5 px-6 font-semibold">Position</th>
                    <th className="text-left py-3.5 px-6 font-semibold">Approved Display Name</th>
                    <th className="text-left py-3.5 px-6 font-semibold">Subject</th>
                    <th className="text-left py-3.5 px-6 font-semibold">Examination / Category</th>
                    <th className="text-right py-3.5 px-6 font-semibold">Graded Attempts</th>
                    <th className="text-right py-3.5 px-6 font-semibold">Score Percentage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaders.map((row) => (
                    <tr key={`${row.user_id}-${row.subject_id}`} className="hover:bg-[#EAF9FB]/40">
                      <td className="py-3.5 px-6 font-mono-tabular font-bold text-[#008F9F]">#{row.position}</td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-[#10243D]">{row.display_name}</div>
                        <div className="text-xs text-[#64748B]">{row.department} · {row.country}</div>
                      </td>
                      <td className="py-3.5 px-6 font-medium text-[#10243D]">{row.subject_name}</td>
                      <td className="py-3.5 px-6 text-xs text-[#64748B]">
                        {row.exam_framework || row.exam_category} · {row.exam_category}
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono-tabular text-[#64748B]">{row.exams_completed}</td>
                      <td className="py-3.5 px-6 text-right font-mono-tabular font-bold text-[#10243D]">
                        {row.score_percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
