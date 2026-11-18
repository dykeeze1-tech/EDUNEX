import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface OverviewTimelinePoint {
  date: string;
  label: string;
  studentEnrollments: number;
  programmeEnrolments: number;
  examCompletions: number;
  passedExams: number;
  avgScore?: number | null;
  cumulativeStudents: number;
  cumulativeEnrolments: number;
  cumulativeCompletions: number;
}

export interface DepartmentBreakdownPoint {
  department: string;
  shortName: string;
  students: number;
  enrolments: number;
  examCompletions: number;
  avgScore: number;
}

export interface SubjectAnalyticPoint {
  id: number;
  code: string;
  name: string;
  shortName: string;
  groupName: string;
  publishedQuestions: number;
  draftQuestions: number;
  examCompletions: number;
  avgScore: number | null;
}

export interface RecentCompletionItem {
  id: number;
  status: string;
  percentage: number | null;
  grade: string | null;
  passed: number;
  completedAt: string;
  studentName: string;
  department: string;
  examTitle: string;
  examFramework: string;
  subjectName: string;
}

export interface OverviewAnalyticsPayload {
  totals: {
    totalStudents: number;
    totalEnrolments: number;
    totalExamCompletions: number;
    gradedCompletions: number;
    passRate: number | null;
    averageScore: number | null;
  };
  dailySeries: OverviewTimelinePoint[];
  monthlySeries: OverviewTimelinePoint[];
  departmentBreakdown: DepartmentBreakdownPoint[];
  subjectAnalytics: SubjectAnalyticPoint[];
  recentCompletions: RecentCompletionItem[];
}

interface AdminOverviewChartsProps {
  analytics?: OverviewAnalyticsPayload;
  loading?: boolean;
  onNavigate?: (path: string) => void;
  canAcademic?: boolean;
}

type TimeRange = '14d' | '30d' | '90d' | 'all';
type ChartMode = 'activity' | 'cumulative';
type SubjectChartView = 'questions' | 'completions';

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number | string; color?: string; unit?: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-sm text-xs">
      <div className="font-semibold text-[#10243D] mb-1.5 border-b border-slate-100 pb-1">{label}</div>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-5">
            <span className="flex items-center gap-2 text-[#64748B]">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: entry.color || '#008F9F' }}
              />
              <span>{entry.name}</span>
            </span>
            <span className="font-mono-tabular font-semibold text-[#10243D]">
              {entry.value}
              {entry.unit || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminOverviewCharts: React.FC<AdminOverviewChartsProps> = ({
  analytics,
  loading = false,
  onNavigate,
  canAcademic = false,
}) => {
  const [range, setRange] = useState<TimeRange>('30d');
  const [chartMode, setChartMode] = useState<ChartMode>('activity');
  const [subjectView, setSubjectView] = useState<SubjectChartView>('questions');

  const timelineData = useMemo(() => {
    if (!analytics) return [];
    if (range === 'all') return analytics.monthlySeries || [];
    const days = analytics.dailySeries || [];
    if (range === '14d') return days.slice(-14);
    if (range === '30d') return days.slice(-30);
    return days;
  }, [analytics, range]);

  const subjectChartData = useMemo(() => {
    if (!analytics?.subjectAnalytics) return [];
    return analytics.subjectAnalytics.slice(0, 7);
  }, [analytics]);

  const periodTotals = useMemo(() => {
    return timelineData.reduce(
      (acc, pt) => ({
        students: acc.students + (pt.studentEnrollments || 0),
        enrolments: acc.enrolments + (pt.programmeEnrolments || 0),
        completions: acc.completions + (pt.examCompletions || 0),
      }),
      { students: 0, enrolments: 0, completions: 0 },
    );
  }, [timelineData]);

  if (loading && !analytics) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="h-5 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="h-72 w-full bg-[#F4F7FA] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-[#64748B]">
        Platform analytics will appear once student accounts and examination activity are recorded.
      </div>
    );
  }

  const { totals, departmentBreakdown, recentCompletions } = analytics;

  return (
    <div className="space-y-6">
      {/* Primary Analytics Panel: Student Enrollment & Exam Completions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="font-display font-bold text-base text-[#10243D]">
              Platform Enrollment &amp; Assessment Activity
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Live student registrations, 60-day programme enrolments, and submitted or graded exam completions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switch */}
            <div className="inline-flex items-center gap-1 p-1 bg-[#F4F7FA] rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setChartMode('activity')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  chartMode === 'activity'
                    ? 'bg-white text-[#10243D] shadow-xs'
                    : 'text-[#64748B] hover:text-[#10243D]'
                }`}
              >
                Period Activity
              </button>
              <button
                type="button"
                onClick={() => setChartMode('cumulative')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  chartMode === 'cumulative'
                    ? 'bg-white text-[#10243D] shadow-xs'
                    : 'text-[#64748B] hover:text-[#10243D]'
                }`}
              >
                Cumulative Totals
              </button>
            </div>

            {/* Range Selector */}
            <div className="inline-flex items-center gap-1 p-1 bg-[#F4F7FA] rounded-lg border border-slate-200">
              {(
                [
                  { id: '14d', label: '14D' },
                  { id: '30d', label: '30D' },
                  { id: '90d', label: '90D' },
                  { id: 'all', label: 'All Time' },
                ] as Array<{ id: TimeRange; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRange(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    range === item.id
                      ? 'bg-[#008F9F] text-white'
                      : 'text-[#64748B] hover:text-[#10243D]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inline Tabular KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pb-2 border-b border-slate-100">
          <div>
            <div className="text-xs text-[#64748B]">Total Enrolled Students</div>
            <div className="font-mono-tabular text-xl font-bold text-[#10243D] mt-0.5">
              {totals.totalStudents}
            </div>
            <div className="text-[11px] text-[#64748B] font-mono-tabular">
              +{periodTotals.students} in range
            </div>
          </div>

          <div>
            <div className="text-xs text-[#64748B]">Programme Enrolments</div>
            <div className="font-mono-tabular text-xl font-bold text-[#008F9F] mt-0.5">
              {totals.totalEnrolments}
            </div>
            <div className="text-[11px] text-[#64748B] font-mono-tabular">
              +{periodTotals.enrolments} in range
            </div>
          </div>

          <div>
            <div className="text-xs text-[#64748B]">Exam Completions</div>
            <div className="font-mono-tabular text-xl font-bold text-[#10243D] mt-0.5">
              {totals.totalExamCompletions}
            </div>
            <div className="text-[11px] text-[#64748B] font-mono-tabular">
              +{periodTotals.completions} in range
            </div>
          </div>

          <div>
            <div className="text-xs text-[#64748B]">Average Graded Score</div>
            <div className="font-mono-tabular text-xl font-bold text-[#10243D] mt-0.5">
              {totals.averageScore != null ? `${totals.averageScore}%` : '—'}
            </div>
            <div className="text-[11px] text-[#64748B] font-mono-tabular">
              {totals.gradedCompletions} graded attempt(s)
            </div>
          </div>

          <div>
            <div className="text-xs text-[#64748B]">Verified Pass Rate</div>
            <div className="font-mono-tabular text-xl font-bold text-emerald-700 mt-0.5">
              {totals.passRate != null ? `${totals.passRate}%` : '—'}
            </div>
            <div className="text-[11px] text-[#64748B]">
              Based on graded exams
            </div>
          </div>
        </div>

        {/* Main Recharts Timeline */}
        {timelineData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-sm text-[#64748B] bg-[#F4F7FA] rounded-lg">
            No timeline activity recorded in the selected window yet.
          </div>
        ) : (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'activity' ? (
                <ComposedChart data={timelineData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    minTickGap={22}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar
                    dataKey="studentEnrollments"
                    name="Student Signups"
                    fill="#008F9F"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="programmeEnrolments"
                    name="Programme Enrolments"
                    fill="#90DFEC"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                  <Line
                    type="monotone"
                    dataKey="examCompletions"
                    name="Exam Completions"
                    stroke="#10243D"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10243D', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#008F9F' }}
                  />
                </ComposedChart>
              ) : (
                <AreaChart data={timelineData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="edunexaStudentsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#008F9F" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#008F9F" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="edunexaCompletionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10243D" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#10243D" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                    minTickGap={22}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="cumulativeStudents"
                    name="Cumulative Students"
                    stroke="#008F9F"
                    strokeWidth={2.25}
                    fill="url(#edunexaStudentsGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeEnrolments"
                    name="Cumulative Programme Enrolments"
                    stroke="#38BDF8"
                    strokeWidth={2}
                    fillOpacity={0}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulativeCompletions"
                    name="Cumulative Exam Completions"
                    stroke="#10243D"
                    strokeWidth={2.25}
                    fill="url(#edunexaCompletionsGrad)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Secondary Analytics Grid: Department Distribution & Subject Readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Department Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-display font-bold text-base text-[#10243D]">
                Academic Track Participation
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Students, programme enrolments, and exam completions by department.
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-[#64748B] whitespace-nowrap">
              {departmentBreakdown.length} tracks
            </span>
          </div>

          {departmentBreakdown.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#64748B] bg-[#F4F7FA] rounded-lg">
              No student department records yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentBreakdown} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="students" name="Students" fill="#008F9F" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="enrolments" name="Enrolments" fill="#90DFEC" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="examCompletions" name="Exam Completions" fill="#10243D" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Right: Subject Readiness & Completions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-base text-[#10243D]">
                Subject Coverage &amp; Assessments
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                {subjectView === 'questions'
                  ? 'Published vs draft questions across top active subjects.'
                  : 'Submitted and graded exam completions per subject.'}
              </p>
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-[#F4F7FA] rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setSubjectView('questions')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  subjectView === 'questions'
                    ? 'bg-white text-[#10243D] shadow-xs'
                    : 'text-[#64748B] hover:text-[#10243D]'
                }`}
              >
                Question Bank
              </button>
              <button
                type="button"
                onClick={() => setSubjectView('completions')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  subjectView === 'completions'
                    ? 'bg-white text-[#10243D] shadow-xs'
                    : 'text-[#64748B] hover:text-[#10243D]'
                }`}
              >
                Completions
              </button>
            </div>
          </div>

          {subjectChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-[#64748B] bg-[#F4F7FA] rounded-lg">
              No active subject records available.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {subjectView === 'questions' ? (
                  <BarChart data={subjectChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="code"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="publishedQuestions"
                      name="Published Questions"
                      stackId="q"
                      fill="#008F9F"
                      radius={[0, 0, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="draftQuestions"
                      name="Draft Questions"
                      stackId="q"
                      fill="#90DFEC"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                ) : (
                  <BarChart data={subjectChartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="code"
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#CBD5E1' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: '#64748B', fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar
                      dataKey="examCompletions"
                      name="Exam Completions"
                      fill="#10243D"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Exam Completions Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-bold text-base text-[#10243D]">
              Recent Exam Completions
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Latest verified submissions and graded learner outcomes contributing to platform metrics.
            </p>
          </div>
          {canAcademic && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/admin/exams')}
              className="text-xs font-semibold text-[#008F9F] hover:underline whitespace-nowrap shrink-0"
            >
              Manage Examinations →
            </button>
          )}
        </div>

        {recentCompletions.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#64748B] bg-[#F4F7FA] rounded-lg">
            No exam completions have been submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[#64748B] border-b border-slate-200">
                <tr>
                  <th className="text-left py-2.5 pr-4 font-semibold">Student</th>
                  <th className="text-left py-2.5 pr-4 font-semibold">Examination</th>
                  <th className="text-left py-2.5 pr-4 font-semibold">Subject · Track</th>
                  <th className="text-left py-2.5 pr-4 font-semibold">Status</th>
                  <th className="text-right py-2.5 pr-4 font-semibold">Score</th>
                  <th className="text-right py-2.5 font-semibold">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCompletions.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F4F7FA]/60">
                    <td className="py-2.5 pr-4 font-medium text-[#10243D]">{item.studentName}</td>
                    <td className="py-2.5 pr-4 text-[#10243D]">{item.examTitle}</td>
                    <td className="py-2.5 pr-4 text-[#64748B]">
                      {item.subjectName} · {item.department}
                    </td>
                    <td className="py-2.5 pr-4 font-medium">
                      <span className={item.status === 'graded' ? 'text-emerald-700' : 'text-amber-700'}>
                        {item.status === 'graded' ? 'Graded' : 'Awaiting Grading'}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono-tabular font-semibold text-[#10243D]">
                      {item.percentage != null ? `${item.percentage}% (${item.grade || '—'})` : 'Pending'}
                    </td>
                    <td className="py-2.5 text-right font-mono-tabular text-[#64748B]">
                      {new Date(item.completedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
