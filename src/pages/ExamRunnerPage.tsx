import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock, Flag, Save } from 'lucide-react';
import { EdunexaLogo } from '../components/EdunexaLogo';
import { apiFetch } from '../utils/apiFetch';

export const ExamRunnerPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exam, setExam] = useState<any>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<number[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [saveLabel, setSaveLabel] = useState('Synced');
  const [submitting, setSubmitting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiFetch(`/api/student/exams/${id}/start`, {
          method: 'POST',
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Could not start examination.');
        } else {
          setExam(data.exam);
          setAttempt(data.attempt);
          setQuestions(data.questions);
          setAnswers(data.attempt.answers || {});
          setFlagged(data.attempt.flagged || []);
          const msLeft = Math.max(0, new Date(data.attempt.expires_at).getTime() - Date.now());
          setSecondsLeft(Math.floor(msLeft / 1000));
        }
      } catch {
        setError('Unable to start examination session.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const performAutosave = useCallback(
    async (nextAnswers: Record<string, string>, nextFlagged: number[]) => {
      if (!attempt?.id) return;
      setSaveLabel('Saving...');
      try {
        const res = await apiFetch(`/api/student/attempts/${attempt.id}/autosave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ answers: nextAnswers, flagged: nextFlagged }),
        });
        setSaveLabel(res.ok ? `Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Retry needed');
      } catch {
        setSaveLabel('Offline — retrying');
      }
    },
    [attempt?.id]
  );

  const handleSubmit = useCallback(async () => {
    if (!attempt?.id || submitting) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/student/attempts/${attempt.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (res.ok) {
        navigate(`/student/results/${data.attemptId}`);
      } else {
        setError(data.error || 'Submission failed.');
        setSubmitting(false);
      }
    } catch {
      setError('Network error during submission.');
      setSubmitting(false);
    }
  }, [attempt?.id, answers, navigate, submitting]);

  // Live countdown timer
  useEffect(() => {
    if (!attempt || loading || error) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [attempt, loading, error, handleSubmit]);

  // Periodic background autosave every 15s
  useEffect(() => {
    if (!attempt) return;
    const interval = setInterval(() => {
      performAutosave(answers, flagged);
    }, 15000);
    return () => clearInterval(interval);
  }, [attempt, answers, flagged, performAutosave]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-8 text-sm text-[#64748B]">
        Preparing secure examination session...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F7FA] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-red-200 p-8 space-y-4">
          <div className="flex items-center gap-2 text-red-700 font-display font-bold text-lg">
            <AlertCircle className="w-5 h-5" /> Assessment Access Notice
          </div>
          <p className="text-sm text-[#64748B] leading-relaxed">{error}</p>
          <Link to="/student/exams" className="inline-flex items-center gap-2 px-4 py-2 bg-[#10243D] text-white text-sm font-semibold rounded-lg">
            <ArrowLeft className="w-4 h-4" /> Return to Examinations
          </Link>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const isFlagged = q && flagged.includes(q.id);

  const setAnswer = (qid: number, val: string) => {
    const next = { ...answers, [qid]: val };
    setAnswers(next);
    performAutosave(next, flagged);
  };

  const toggleFlag = (qid: number) => {
    const next = flagged.includes(qid) ? flagged.filter((x) => x !== qid) : [...flagged, qid];
    setFlagged(next);
    performAutosave(answers, next);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-[#10243D] flex flex-col">
      {/* Official distraction-free Examination Header (locked branding) */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <EdunexaLogo size="sm" />
          <span className="hidden sm:inline text-sm font-semibold text-[#10243D] truncate">{exam.title}</span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-[#64748B]">
            <Save className="w-3.5 h-3.5 text-[#008F9F]" /> {saveLabel}
          </span>
          <div className={`px-3 py-1.5 rounded-lg border font-mono-tabular text-sm font-bold flex items-center gap-2 ${
            secondsLeft < 180 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#EAF9FB] border-[#90DFEC] text-[#10243D]'
          }`}>
            <Clock className="w-4 h-4 text-[#008F9F]" />
            <span>{formattedTime}</span>
          </div>
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            disabled={submitting}
            className="px-4 py-2 bg-[#008F9F] hover:bg-[#007482] text-white text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap"
          >
            {submitting ? 'Submitting...' : 'Review & Submit'}
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Question Stage */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 flex flex-col justify-between space-y-8">
          {q && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="text-xs text-[#64748B]">
                  <span className="font-mono-tabular font-semibold text-[#10243D]">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>{q.topic_name}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="font-mono-tabular">{q.marks} marks</span>
                  {q.scope_type === 'local_curriculum' && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="text-[#008F9F] font-medium">Local Curriculum ({q.curriculum})</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => toggleFlag(q.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isFlagged ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white border-slate-200 text-[#64748B] hover:text-[#10243D]'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  {isFlagged ? 'Marked for Review' : 'Mark for Review'}
                </button>
              </div>

              <h2 className="font-display font-semibold text-lg sm:text-xl text-[#10243D] leading-relaxed">
                {q.question_text}
              </h2>

              {q.format === 'mcq' || q.format === 'true_false' ? (
                <div className="space-y-3">
                  {(q.options || []).map((opt: string, i: number) => {
                    const selected = answers[q.id] === opt;
                    return (
                      <label
                        key={i}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                          selected
                            ? 'border-[#008F9F] bg-[#EAF9FB]/60'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          checked={selected}
                          onChange={() => setAnswer(q.id, opt)}
                          className="mt-1 accent-[#008F9F]"
                        />
                        <span className="text-sm sm:text-base text-[#10243D]">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#64748B]">Written Response</label>
                  <textarea
                    rows={6}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Write your clear, structured response here..."
                    className="w-full p-4 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008F9F]"
                  />
                </div>
              )}
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
            <button
              type="button"
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10243D] text-white text-sm font-semibold disabled:opacity-40"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question Navigator Deck */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="font-display font-bold text-sm text-[#10243D]">Question Navigator</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((item, idx) => {
                const answered = Boolean(answers[item.id] && String(answers[item.id]).trim());
                const marked = flagged.includes(item.id);
                const active = idx === currentIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-10 rounded-lg font-mono-tabular text-xs font-bold border transition-colors ${
                      active
                        ? 'border-[#10243D] bg-[#10243D] text-white'
                        : marked
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : answered
                        ? 'border-[#008F9F] bg-[#EAF9FB] text-[#008F9F]'
                        : 'border-slate-200 bg-white text-[#64748B]'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <div className="pt-3 border-t border-slate-100 text-xs text-[#64748B] space-y-1">
              <div>Answered: {Object.values(answers).filter((v) => String(v).trim()).length} / {questions.length}</div>
              <div>Marked for Review: {flagged.length}</div>
            </div>
          </div>
        </aside>
      </div>

      {/* Review Answers & Confirm Submission Modal */}
      {reviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 text-sm">
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-[#10243D]">Review Before Final Submission</h2>
              <p className="text-xs text-[#64748B]">
                Once submitted, your attempt is locked and graded. Unanswered items score zero marks.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-[#EAF9FB] border border-[#90DFEC]">
                <div className="font-mono-tabular text-lg font-bold text-[#008F9F]">
                  {questions.filter((item) => Boolean(answers[item.id] && String(answers[item.id]).trim())).length}
                </div>
                <div className="text-[#64748B]">Answered</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F4F7FA] border border-slate-200">
                <div className="font-mono-tabular text-lg font-bold text-[#10243D]">
                  {questions.filter((item) => !answers[item.id] || !String(answers[item.id]).trim()).length}
                </div>
                <div className="text-[#64748B]">Unanswered</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="font-mono-tabular text-lg font-bold text-amber-800">{flagged.length}</div>
                <div className="text-amber-800">Flagged</div>
              </div>
            </div>

            <div className="max-h-44 overflow-y-auto grid grid-cols-5 gap-2">
              {questions.map((item, idx) => {
                const answered = Boolean(answers[item.id] && String(answers[item.id]).trim());
                const marked = flagged.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setReviewOpen(false);
                    }}
                    className={`py-2 rounded-lg font-mono-tabular text-xs font-bold border ${
                      marked
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : answered
                        ? 'border-[#008F9F] bg-[#EAF9FB] text-[#008F9F]'
                        : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    Q{idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-[#10243D]"
              >
                Continue Reviewing
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setReviewOpen(false);
                  handleSubmit();
                }}
                className="px-5 py-2 rounded-lg bg-[#008F9F] hover:bg-[#007482] text-white text-xs font-semibold disabled:opacity-60"
              >
                {submitting ? 'Submitting...' : 'Confirm & Submit Final Answers'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ResultDetailPage: React.FC = () => {
  const { attemptId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await apiFetch(`/api/student/attempts/${attemptId}`, { credentials: 'include' });
      if (res.ok) setData(await res.json());
      setLoading(false);
    })();
  }, [attemptId]);

  if (loading) return <div className="p-10 text-center text-sm text-[#64748B]">Loading assessment result...</div>;
  if (!data) return <div className="p-10 text-center text-sm text-red-600">Result unavailable.</div>;

  const { attempt, breakdown } = data;

  // Compute topic-by-topic breakdown for strengths & areas for improvement
  const topicMap = new Map<string, { topic: string; total: number; correct: number; objectiveCount: number }>();
  for (const item of breakdown || []) {
    const tName = item.topic_name || 'General';
    const cur = topicMap.get(tName) || { topic: tName, total: 0, correct: 0, objectiveCount: 0 };
    cur.total += 1;
    if (item.is_objective) {
      cur.objectiveCount += 1;
      if (item.is_correct) cur.correct += 1;
    }
    topicMap.set(tName, cur);
  }
  const topicStats = Array.from(topicMap.values()).map((t) => ({
    ...t,
    pct: t.objectiveCount > 0 ? Math.round((t.correct / t.objectiveCount) * 100) : null,
  }));
  const weakTopics = topicStats.filter((t) => t.pct !== null && t.pct < 70);

  return (
    <div className="min-h-screen bg-[#F4F7FA] py-10 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/student/exams" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#008F9F] hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Student Portal
          </Link>
          {!attempt.is_60day_final && (
            <Link
              to={`/student/exam/${attempt.exam_id}`}
              className="px-4 py-2 rounded-lg bg-[#10243D] hover:bg-[#1b3658] text-white text-xs font-semibold"
            >
              Retry Practice Assessment
            </Link>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="text-xs text-[#64748B]">{attempt.subject_name} · {attempt.exam_framework}</div>
              <h1 className="font-display font-bold text-2xl text-[#10243D] mt-1">{attempt.exam_title}</h1>
            </div>
            <div className="text-right">
              <div className="font-mono-tabular text-3xl font-bold text-[#008F9F]">{attempt.percentage}%</div>
              <div className="text-xs text-[#64748B]">
                Score: {attempt.total_score}/{attempt.max_score} · Grade: {attempt.grade}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            {attempt.status === 'submitted' ? (
              <span className="font-semibold text-amber-700">Status: Awaiting Academic Administrator subjective grading review</span>
            ) : attempt.passed ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> Passed (Pass mark {attempt.pass_mark}%)
              </span>
            ) : (
              <span className="font-semibold text-red-700">Did not meet pass mark ({attempt.pass_mark}%) — Review explanations and retry</span>
            )}
          </div>

          {attempt.feedback && (
            <div className="p-4 rounded-xl bg-[#EAF9FB] text-sm text-[#10243D]">
              <strong>Examiner Feedback:</strong> {attempt.feedback}
            </div>
          )}

          {/* Topic Performance Summary & Areas for Improvement */}
          {topicStats.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-5 rounded-xl border border-slate-200 bg-[#F4F7FA]/70 space-y-3">
                <h2 className="font-display font-bold text-sm text-[#10243D]">Topic Performance Breakdown</h2>
                <div className="space-y-2.5 text-xs">
                  {topicStats.map((t) => (
                    <div key={t.topic} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#10243D]">{t.topic}</span>
                        <span className="font-mono-tabular font-semibold text-[#008F9F]">
                          {t.pct !== null ? `${t.correct}/${t.objectiveCount} (${t.pct}%)` : `${t.total} subjective`}
                        </span>
                      </div>
                      {t.pct !== null && (
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-[#008F9F]" style={{ width: `${t.pct}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-xl border border-slate-200 bg-[#EAF9FB]/60 space-y-3">
                <h2 className="font-display font-bold text-sm text-[#10243D]">Areas for Improvement & Suggested Practice</h2>
                {weakTopics.length === 0 ? (
                  <p className="text-xs text-[#64748B]">
                    Strong objective accuracy across tested topics. Review detailed explanations below and deepen understanding in the Learning Centre or EDUNEXA AI Tutor.
                  </p>
                ) : (
                  <div className="text-xs space-y-2 text-[#10243D]">
                    <p className="text-[#64748B]">Focus revision on the following topic(s) below 70% accuracy:</p>
                    <ul className="list-disc pl-4 space-y-1 font-medium">
                      {weakTopics.map((w) => (
                        <li key={w.topic}>{w.topic} ({w.pct}% objective accuracy)</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1 text-xs">
                  <Link to="/student/learning" className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-semibold text-[#10243D] hover:border-[#008F9F]">
                    Open Study Guides
                  </Link>
                  <Link to="/student/subjects" className="px-3 py-1.5 rounded-lg bg-[#008F9F] text-white font-semibold">
                    Practise {attempt.subject_name}
                  </Link>
                  <Link to="/student/tutor" className="px-3 py-1.5 rounded-lg bg-[#10243D] text-white font-semibold">
                    Ask AI Tutor
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 pt-2">
            <h2 className="font-display font-bold text-lg text-[#10243D]">Question & Explanation Breakdown</h2>
            {breakdown.map((item: any, idx: number) => (
              <div key={item.id} className="p-5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#64748B]">
                  <span>Q{idx + 1} · {item.topic_name} · {item.marks} marks</span>
                  {item.is_objective ? (
                    <span className={`font-semibold ${item.is_correct ? 'text-emerald-700' : 'text-red-700'}`}>
                      {item.is_correct ? 'Correct' : 'Incorrect'}
                    </span>
                  ) : (
                    <span className="font-semibold text-[#008F9F]">Subjective Response</span>
                  )}
                </div>
                <p className="font-medium text-sm text-[#10243D]">{item.question_text}</p>
                <div className="text-xs text-[#64748B]">
                  <strong>Your Answer:</strong> {item.student_answer || '(No answer submitted)'}
                </div>
                {item.correct_answer && (
                  <div className="text-xs text-emerald-800">
                    <strong>Reference Answer:</strong> {item.correct_answer}
                  </div>
                )}
                {item.marking_scheme && (
                  <div className="text-xs text-[#10243D] bg-[#EAF9FB]/60 p-3 rounded-lg mt-1">
                    <strong>Marking Scheme:</strong> {item.marking_scheme}
                  </div>
                )}
                {item.explanation && (
                  <div className="text-xs text-[#64748B] bg-[#F4F7FA] p-3 rounded-lg mt-1">
                    <strong>Explanation:</strong> {item.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
