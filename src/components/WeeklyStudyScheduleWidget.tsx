import React, { useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Circle, Clock, Plus, Trash2, X } from 'lucide-react';
import { apiFetch } from '../utils/apiFetch';

export interface StudyScheduleBlock {
  id: number;
  subject_id: number | null;
  subject_name: string;
  resolved_subject_name?: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  task_title: string;
  notes: string;
  is_completed: number;
}

interface WeeklyStudyScheduleWidgetProps {
  schedule: StudyScheduleBlock[];
  subjects: any[];
  accent?: string;
  isDark?: boolean;
  compact?: boolean;
  onRefresh: () => Promise<void>;
  onOpenSubject?: (subject: any) => void;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function getTodayDayName(): (typeof DAYS)[number] {
  const idx = new Date().getDay(); // 0 = Sun, 1 = Mon...
  const map: Record<number, (typeof DAYS)[number]> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
  };
  return map[idx] || 'Monday';
}

function durationMinutes(start: string, end: string): number {
  const [sh, sm] = String(start || '00:00').split(':').map(Number);
  const [eh, em] = String(end || '00:00').split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

export const WeeklyStudyScheduleWidget: React.FC<WeeklyStudyScheduleWidgetProps> = ({
  schedule,
  subjects,
  accent = '#008F9F',
  isDark = false,
  compact = false,
  onRefresh,
  onOpenSubject,
}) => {
  const eligibleSubjects = useMemo(() => (subjects || []).filter((s) => Boolean(s.is_eligible)), [subjects]);
  const [selectedDay, setSelectedDay] = useState<(typeof DAYS)[number]>(() => getTodayDayName());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [showAddForm, setShowAddForm] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState({
    subject_id: eligibleSubjects[0]?.id ? String(eligibleSubjects[0].id) : '',
    day_of_week: getTodayDayName() as string,
    start_time: '16:00',
    end_time: '17:00',
    task_title: '',
    notes: '',
  });

  const cardBg = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-[#10243D]';
  const tileBg = isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-[#F4F7FA]/75 border-slate-200';
  const mutedText = isDark ? 'text-slate-400' : 'text-[#64748B]';
  const inputBg = isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-[#10243D]';
  const padClass = compact ? 'p-4' : 'p-6';

  const stats = useMemo(() => {
    const totalTasks = schedule.length;
    const completedTasks = schedule.filter((b) => Boolean(b.is_completed)).length;
    const totalMinutes = schedule.reduce((sum, b) => sum + durationMinutes(b.start_time, b.end_time), 0);
    const hoursLabel = (totalMinutes / 60).toFixed(1);
    return { totalTasks, completedTasks, hoursLabel };
  }, [schedule]);

  const countsByDay = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    for (const d of DAYS) map[d] = { total: 0, done: 0 };
    for (const b of schedule) {
      if (!map[b.day_of_week]) map[b.day_of_week] = { total: 0, done: 0 };
      map[b.day_of_week].total += 1;
      if (b.is_completed) map[b.day_of_week].done += 1;
    }
    return map;
  }, [schedule]);

  const visibleBlocks = useMemo(() => {
    if (viewMode === 'week') return schedule;
    return schedule.filter((b) => b.day_of_week === selectedDay);
  }, [schedule, viewMode, selectedDay]);

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.task_title.trim()) {
      setFormError('Please enter a daily study task.');
      return;
    }
    if (form.start_time >= form.end_time) {
      setFormError('End time must be later than start time.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch('/api/student/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          subject_id: form.subject_id ? Number(form.subject_id) : null,
          day_of_week: form.day_of_week,
          start_time: form.start_time,
          end_time: form.end_time,
          task_title: form.task_title.trim(),
          notes: form.notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Could not save study block.');
      } else {
        setSelectedDay(form.day_of_week as (typeof DAYS)[number]);
        setForm((prev) => ({ ...prev, task_title: '', notes: '' }));
        setShowAddForm(false);
        await onRefresh();
      }
    } catch {
      setFormError('Unable to reach server.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (block: StudyScheduleBlock) => {
    setBusyId(block.id);
    try {
      await apiFetch(`/api/student/schedule/${block.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_completed: !block.is_completed }),
      });
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteBlock = async (blockId: number) => {
    setBusyId(blockId);
    try {
      await apiFetch(`/api/student/schedule/${blockId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby="weekly-schedule-heading" className={`rounded-xl border ${cardBg} ${padClass} space-y-5`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="text-xs font-semibold text-[#008F9F] inline-flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> Study Planner
          </div>
          <h2 id="weekly-schedule-heading" className="font-display font-bold text-lg mt-0.5">
            Weekly Study Schedule &amp; Daily Tasks
          </h2>
          <div className={`text-xs font-mono-tabular mt-1 flex flex-wrap items-center gap-2 ${mutedText}`}>
            <span>{stats.hoursLabel} hrs blocked this week</span>
            <span aria-hidden="true">·</span>
            <span>{stats.completedTasks}/{stats.totalTasks} tasks completed</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'day'
                  ? isDark
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-[#10243D] shadow-xs'
                  : mutedText
              }`}
            >
              Daily View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'week'
                  ? isDark
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-[#10243D] shadow-xs'
                  : mutedText
              }`}
            >
              Full Week
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                day_of_week: selectedDay,
                subject_id: prev.subject_id || (eligibleSubjects[0]?.id ? String(eligibleSubjects[0].id) : ''),
              }));
              setShowAddForm(!showAddForm);
              setFormError('');
            }}
            style={{ backgroundColor: accent }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-white text-xs font-semibold rounded-lg whitespace-nowrap"
          >
            {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showAddForm ? 'Close Form' : 'Block Study Time'}
          </button>
        </div>
      </div>

      {/* Add Time-Block Form */}
      {showAddForm && (
        <form onSubmit={handleCreateBlock} className={`p-4 rounded-xl border ${tileBg} space-y-3 text-xs`}>
          <div className="font-semibold text-sm">Schedule a Subject Study Block</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold mb-1">Subject</label>
              <select
                value={form.subject_id}
                onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
              >
                {eligibleSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
                <option value="">General Revision</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Day of Week</label>
              <select
                value={form.day_of_week}
                onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
              >
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Start Time</label>
              <input
                type="time"
                required
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border font-mono-tabular ${inputBg}`}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">End Time</label>
              <input
                type="time"
                required
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border font-mono-tabular ${inputBg}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Daily Task / Study Goal *</label>
              <input
                type="text"
                required
                value={form.task_title}
                onChange={(e) => setForm({ ...form, task_title: e.target.value })}
                placeholder="e.g. Review Quadratic Equations guide & complete practice test"
                className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Focus chapter or formula targets"
                className={`w-full px-3 py-2 rounded-lg border ${inputBg}`}
              />
            </div>
          </div>

          {formError && <p className="text-red-600 font-medium">{formError}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ backgroundColor: accent }}
              className="px-4 py-2 text-white font-semibold rounded-lg disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Add to Schedule'}
            </button>
          </div>
        </form>
      )}

      {/* Day Selector Strip */}
      {viewMode === 'day' && (
        <div className="grid grid-cols-7 gap-1.5">
          {DAYS.map((day) => {
            const count = countsByDay[day] || { total: 0, done: 0 };
            const active = selectedDay === day;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                style={active ? { borderColor: accent, backgroundColor: isDark ? 'rgba(0,143,159,0.18)' : '#EAF9FB' } : undefined}
                className={`py-2 px-1.5 rounded-lg border text-center transition-colors ${
                  active
                    ? 'font-bold text-[#008F9F]'
                    : isDark
                    ? 'border-slate-800 hover:border-slate-700 text-slate-300'
                    : 'border-slate-200 hover:border-[#90DFEC] text-[#10243D]'
                }`}
              >
                <div className="text-[11px] sm:text-xs">{day.slice(0, 3)}</div>
                <div className={`text-[10px] font-mono-tabular mt-0.5 ${mutedText}`}>
                  {count.total > 0 ? `${count.done}/${count.total}` : '—'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Daily Tasks & Study Blocks List */}
      {visibleBlocks.length === 0 ? (
        <div className={`p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2 text-xs ${mutedText}`}>
          <p>
            {viewMode === 'day'
              ? `No study blocks scheduled for ${selectedDay} yet.`
              : 'Your weekly study schedule is empty. Block out dedicated time for your subjects to stay on track.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setForm((prev) => ({
                ...prev,
                day_of_week: selectedDay,
                subject_id: prev.subject_id || (eligibleSubjects[0]?.id ? String(eligibleSubjects[0].id) : ''),
              }));
              setShowAddForm(true);
            }}
            className="text-[#008F9F] font-semibold hover:underline"
          >
            + Schedule a session for {selectedDay}
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleBlocks.map((block) => {
            const subjName = block.resolved_subject_name || block.subject_name || 'General Study';
            const linkedSubject = block.subject_id ? eligibleSubjects.find((s) => s.id === block.subject_id) : null;
            const mins = durationMinutes(block.start_time, block.end_time);

            return (
              <div
                key={block.id}
                className={`p-3.5 rounded-xl border ${tileBg} flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-opacity ${
                  block.is_completed ? 'opacity-70' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    disabled={busyId === block.id}
                    onClick={() => handleToggleComplete(block)}
                    aria-label={block.is_completed ? `Mark "${block.task_title}" incomplete` : `Mark "${block.task_title}" complete`}
                    className="mt-0.5 text-[#008F9F] shrink-0"
                  >
                    {block.is_completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div className="min-w-0 space-y-0.5">
                    <div className={`text-[11px] font-mono-tabular flex flex-wrap items-center gap-2 ${mutedText}`}>
                      {viewMode === 'week' && <strong className="text-[#10243D] dark:text-slate-200 font-sans">{block.day_of_week}</strong>}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#008F9F]" />
                        {block.start_time} – {block.end_time} ({mins}m)
                      </span>
                      <span aria-hidden="true">·</span>
                      {linkedSubject && onOpenSubject ? (
                        <button
                          type="button"
                          onClick={() => onOpenSubject(linkedSubject)}
                          className="font-sans font-semibold text-[#008F9F] hover:underline"
                        >
                          {subjName}
                        </button>
                      ) : (
                        <span className="font-sans font-semibold text-[#008F9F]">{subjName}</span>
                      )}
                    </div>
                    <div className={`text-sm font-semibold ${block.is_completed ? 'line-through' : ''}`}>
                      {block.task_title}
                    </div>
                    {block.notes && <div className={`text-xs ${mutedText}`}>{block.notes}</div>}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={busyId === block.id}
                    onClick={() => handleToggleComplete(block)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-300 dark:border-slate-700 hover:border-[#008F9F]"
                  >
                    {block.is_completed ? 'Completed' : 'Mark Done'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === block.id}
                    onClick={() => handleDeleteBlock(block.id)}
                    aria-label={`Remove "${block.task_title}"`}
                    className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
