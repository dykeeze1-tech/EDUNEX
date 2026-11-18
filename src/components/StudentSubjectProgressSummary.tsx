import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, CheckCircle2, PlayCircle, Target } from 'lucide-react';

interface CircularProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  trackColor: string;
  textColor: string;
  label: string;
  reducedMotion?: boolean;
}

const CircularProgressRing: React.FC<CircularProgressRingProps> = ({
  percentage,
  size = 64,
  strokeWidth = 6,
  color,
  trackColor,
  textColor,
  label,
  reducedMotion = false,
}) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${clamped}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={reducedMotion ? '' : 'transition-[stroke-dashoffset] duration-300 ease-out'}
        />
      </svg>
      <span
        className="absolute font-mono-tabular font-bold leading-none select-none"
        style={{
          color: textColor,
          fontSize: size >= 80 ? '15px' : '12px',
        }}
      >
        {clamped}%
      </span>
    </div>
  );
};

interface ModuleMetric {
  key: string;
  label: string;
  percentage: number;
  detailText: string;
  hasItems: boolean;
  onClick: () => void;
}

interface EnrolledSubjectProgress {
  subject: any;
  overallPct: number;
  completedUnits: number;
  totalUnits: number;
  avgScore: number | null;
  enrolment: any | null;
  modules: ModuleMetric[];
}

export interface StudentSubjectProgressSummaryProps {
  subjects: any[];
  learningMaterials: any[];
  videos: any[];
  exams: any[];
  attempts: any[];
  enrolments: any[];
  subjectPerformance: Array<{ subject: string; avgScore: number; attempts: number }>;
  department: string;
  accent?: string;
  isDark?: boolean;
  compact?: boolean;
  reducedMotion?: boolean;
  onOpenSubject: (subject: any) => void;
  onStartPractice: (subjectId: number) => void;
  onNavigate: (path: string) => void;
}

type FilterTab = 'all' | 'active' | 'programmes' | 'completed';

export const StudentSubjectProgressSummary: React.FC<StudentSubjectProgressSummaryProps> = ({
  subjects,
  learningMaterials,
  videos,
  exams,
  attempts,
  enrolments,
  subjectPerformance,
  department,
  accent = '#008F9F',
  isDark = false,
  compact = false,
  reducedMotion = false,
  onOpenSubject,
  onStartPractice,
  onNavigate,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('all');

  const cardBg = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-[#10243D]';
  const tileBg = isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-[#F4F7FA]/65 border-slate-200';
  const mutedText = isDark ? 'text-slate-400' : 'text-[#64748B]';
  const trackColor = isDark ? '#1E293B' : '#E2E8F0';
  const ringTextColor = isDark ? '#F1F5F9' : '#10243D';
  const padClass = compact ? 'p-4' : 'p-6';

  const enrolledData = useMemo<EnrolledSubjectProgress[]>(() => {
    const eligibleSubjects = (subjects || []).filter((s) => Boolean(s.is_eligible));
    const perfMap = new Map((subjectPerformance || []).map((p) => [p.subject, p]));

    const items = eligibleSubjects.map((s) => {
      const guides = (learningMaterials || []).filter((m) => m.subject_id === s.id);
      const guidesDone = guides.filter((m) => Boolean(m.completed)).length;
      const guidesPct = guides.length > 0 ? Math.round((guidesDone / guides.length) * 100) : 0;

      const vids = (videos || []).filter((v) => v.subject_id === s.id);
      const vidsDone = vids.filter((v) => Boolean(v.completed)).length;
      const vidsPct = vids.length > 0 ? Math.round((vidsDone / vids.length) * 100) : 0;

      const subjExams = (exams || []).filter((ex) => ex.subject_id === s.id);
      const subjExamIds = new Set(subjExams.map((ex) => ex.id));
      const subjAttempts = (attempts || []).filter(
        (a) => (subjExamIds.has(a.exam_id) || a.subject_name === s.name) && (a.status === 'graded' || a.status === 'submitted')
      );
      const distinctCompletedExams = new Set(subjAttempts.map((a) => a.exam_id)).size;
      const examDenominator = Math.max(subjExams.length, distinctCompletedExams);
      const examsPct = examDenominator > 0 ? Math.min(100, Math.round((distinctCompletedExams / examDenominator) * 100)) : 0;

      const enrolment = (enrolments || []).find((e) => e.subject_name === s.name) || null;
      const perf = perfMap.get(s.name);

      const modules: ModuleMetric[] = [
        {
          key: 'guides',
          label: 'Study Guides',
          percentage: guidesPct,
          detailText: guides.length > 0 ? `${guidesDone}/${guides.length} done` : '0 guides',
          hasItems: guides.length > 0,
          onClick: () => onOpenSubject(s),
        },
        {
          key: 'videos',
          label: 'Video Lessons',
          percentage: vidsPct,
          detailText: vids.length > 0 ? `${vidsDone}/${vids.length} watched` : '0 videos',
          hasItems: vids.length > 0,
          onClick: () => onNavigate('/student/learning'),
        },
        {
          key: 'assessments',
          label: 'Assessments',
          percentage: examsPct,
          detailText:
            examDenominator > 0
              ? `${distinctCompletedExams}/${examDenominator} taken`
              : `${subjAttempts.length} taken`,
          hasItems: examDenominator > 0 || subjAttempts.length > 0,
          onClick: () => onStartPractice(s.id),
        },
      ];

      if (enrolment) {
        const trackPct = enrolment.min_days > 0 ? Math.min(100, Math.round((enrolment.elapsed_days / enrolment.min_days) * 100)) : 0;
        modules.push({
          key: 'programme',
          label: '60-Day Track',
          percentage: trackPct,
          detailText: `${enrolment.elapsed_days}/${enrolment.min_days} days`,
          hasItems: true,
          onClick: () => onNavigate('/student/programmes'),
        });
      }

      const activeModules = modules.filter((m) => m.hasItems);
      const overallPct =
        activeModules.length > 0
          ? Math.round(activeModules.reduce((sum, m) => sum + m.percentage, 0) / activeModules.length)
          : 0;

      const totalUnits = guides.length + vids.length + examDenominator;
      const completedUnits = guidesDone + vidsDone + distinctCompletedExams;

      return {
        subject: s,
        overallPct,
        completedUnits,
        totalUnits,
        avgScore: perf ? perf.avgScore : null,
        enrolment,
        modules,
      };
    });

    // Prioritize subjects with 60-day enrolments or active progress first, then keep natural order
    return items.sort((a, b) => {
      const aEnr = a.enrolment ? 1 : 0;
      const bEnr = b.enrolment ? 1 : 0;
      if (aEnr !== bEnr) return bEnr - aEnr;
      if (a.overallPct !== b.overallPct) return b.overallPct - a.overallPct;
      return a.subject.name.localeCompare(b.subject.name);
    });
  }, [subjects, learningMaterials, videos, exams, attempts, enrolments, subjectPerformance, onOpenSubject, onStartPractice, onNavigate]);

  const summaryTotals = useMemo(() => {
    const totalSubjects = enrolledData.length;
    const totalUnits = enrolledData.reduce((sum, item) => sum + item.totalUnits, 0);
    const completedUnits = enrolledData.reduce((sum, item) => sum + item.completedUnits, 0);
    const activeSubjects = enrolledData.filter((item) => item.overallPct > 0).length;
    const completedSubjects = enrolledData.filter((item) => item.totalUnits > 0 && item.overallPct === 100).length;
    const overallCompletion =
      totalSubjects > 0
        ? Math.round(enrolledData.reduce((sum, item) => sum + item.overallPct, 0) / totalSubjects)
        : 0;

    return {
      totalSubjects,
      totalUnits,
      completedUnits,
      activeSubjects,
      completedSubjects,
      overallCompletion,
    };
  }, [enrolledData]);

  const filteredItems = useMemo(() => {
    if (filterTab === 'active') return enrolledData.filter((i) => i.overallPct > 0 && i.overallPct < 100);
    if (filterTab === 'programmes') return enrolledData.filter((i) => Boolean(i.enrolment));
    if (filterTab === 'completed') return enrolledData.filter((i) => i.totalUnits > 0 && i.overallPct === 100);
    return enrolledData;
  }, [enrolledData, filterTab]);

  return (
    <section aria-labelledby="enrolled-progress-heading" className={`rounded-xl border ${cardBg} ${padClass} space-y-6`}>
      {/* Header + Overall Readiness Ring */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <CircularProgressRing
            percentage={summaryTotals.overallCompletion}
            size={80}
            strokeWidth={7}
            color={summaryTotals.overallCompletion === 100 ? '#16A34A' : accent}
            trackColor={trackColor}
            textColor={ringTextColor}
            label="Overall Enrolled Subject Progress"
            reducedMotion={reducedMotion}
          />
          <div className="space-y-1">
            <div className="text-xs font-semibold text-[#008F9F]">
              {department} Stream · Curriculum Progress
            </div>
            <h2 id="enrolled-progress-heading" className="font-display font-bold text-lg sm:text-xl">
              Enrolled Subjects &amp; Module Progress
            </h2>
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono-tabular ${mutedText}`}>
              <span>{summaryTotals.totalSubjects} enrolled subjects</span>
              <span aria-hidden="true">·</span>
              <span>
                {summaryTotals.completedUnits}/{summaryTotals.totalUnits} modules completed
              </span>
              <span aria-hidden="true">·</span>
              <span>{summaryTotals.activeSubjects} in progress</span>
            </div>
          </div>
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800 self-start lg:self-center">
          {(
            [
              { id: 'all', label: `All (${enrolledData.length})` },
              { id: 'active', label: `In Progress (${enrolledData.filter((i) => i.overallPct > 0 && i.overallPct < 100).length})` },
              { id: 'programmes', label: `60-Day (${enrolledData.filter((i) => Boolean(i.enrolment)).length})` },
              { id: 'completed', label: `Completed (${summaryTotals.completedSubjects})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                filterTab === tab.id
                  ? isDark
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-[#10243D] shadow-xs'
                  : isDark
                  ? 'text-slate-300 hover:text-white'
                  : 'text-[#64748B] hover:text-[#10243D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject Cards with Per-Module Circular Progress Indicators */}
      {enrolledData.length === 0 ? (
        <div className={`py-8 text-center space-y-2 text-xs ${mutedText}`}>
          <p>No enrolled subjects matched your academic stream yet.</p>
          <button
            type="button"
            onClick={() => onNavigate('/student/subjects')}
            style={{ backgroundColor: accent }}
            className="px-4 py-2 text-white font-semibold rounded-lg"
          >
            Browse Subject Catalogue
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className={`py-8 text-center space-y-3 text-xs ${mutedText}`}>
          <p>No subjects currently match this filter view.</p>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
          >
            Show All Enrolled Subjects
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredItems.map(({ subject, overallPct, avgScore, enrolment, modules }) => {
            const isComplete = overallPct === 100;
            return (
              <article
                key={subject.id}
                className={`rounded-xl border ${tileBg} p-4 flex flex-col justify-between gap-4 transition-colors`}
              >
                {/* Subject Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`text-[11px] font-medium truncate ${mutedText}`}>
                      {subject.code}
                      <span aria-hidden="true"> · </span>
                      {subject.access_classification === 'Common / All Students' ? 'Core Common' : subject.access_classification}
                      {enrolment && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="text-[#008F9F] font-semibold">60-Day Enrolled</span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-base mt-0.5 truncate" title={subject.name}>
                      {subject.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-tabular text-sm font-bold" style={{ color: isComplete ? '#16A34A' : accent }}>
                      {overallPct}%
                    </div>
                    <div className={`text-[11px] ${mutedText}`}>
                      {avgScore !== null ? `Avg ${avgScore}%` : isComplete ? 'Complete' : overallPct > 0 ? 'Active' : 'Ready'}
                    </div>
                  </div>
                </div>

                {/* Circular Progress Indicators for Each Module */}
                <div className={`grid gap-2 ${modules.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                  {modules.map((mod) => {
                    const modColor = !mod.hasItems
                      ? isDark
                        ? '#475569'
                        : '#94A3B8'
                      : mod.percentage === 100
                      ? '#16A34A'
                      : accent;

                    return (
                      <button
                        key={mod.key}
                        type="button"
                        onClick={mod.onClick}
                        className="group flex flex-col items-center text-center p-1.5 rounded-lg hover:bg-white/70 dark:hover:bg-slate-900/70 transition-colors focus-visible:outline-2 focus-visible:outline-[#008F9F]"
                        title={`Open ${subject.name} ${mod.label}`}
                      >
                        <CircularProgressRing
                          percentage={mod.percentage}
                          size={58}
                          strokeWidth={5}
                          color={modColor}
                          trackColor={trackColor}
                          textColor={mod.hasItems ? ringTextColor : isDark ? '#64748B' : '#94A3B8'}
                          label={`${subject.name} ${mod.label}`}
                          reducedMotion={reducedMotion}
                        />
                        <span className="text-[11px] font-semibold mt-2 leading-tight group-hover:text-[#008F9F] transition-colors">
                          {mod.label}
                        </span>
                        <span className={`text-[10px] font-mono-tabular mt-0.5 ${mutedText}`}>
                          {mod.detailText}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Footer Action Links */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => onOpenSubject(subject)}
                    className="inline-flex items-center gap-1 font-semibold text-[#008F9F] hover:underline whitespace-nowrap"
                  >
                    {isComplete ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <BookOpen className="w-3.5 h-3.5" />}
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onStartPractice(subject.id)}
                      className={`inline-flex items-center gap-1 font-medium hover:text-[#008F9F] whitespace-nowrap ${mutedText}`}
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Practice</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('/student/learning')}
                      className={`inline-flex items-center gap-1 font-medium hover:text-[#008F9F] whitespace-nowrap ${mutedText}`}
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>Lessons</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
