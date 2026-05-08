import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { projectsApi } from '../../api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import {
  ArrowLeftIcon, PlusIcon, PencilSquareIcon, TrashIcon,
  CheckCircleIcon, ClockIcon, XCircleIcon, ExclamationTriangleIcon,
  LightBulbIcon, CurrencyDollarIcon, ChartBarIcon,
  BuildingOfficeIcon, CalendarDaysIcon, FlagIcon,
} from '@heroicons/react/24/outline';

const STATUS_CFG = {
  planned:   { label: 'Planned',   cls: 'bg-gray-100 text-gray-600' },
  ongoing:   { label: 'Ongoing',   cls: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
  delayed:   { label: 'Delayed',   cls: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-400' },
};
const MS_CFG = {
  not_started: { label: 'Not Started', icon: XCircleIcon,       color: 'text-gray-400' },
  ongoing:     { label: 'Ongoing',     icon: ClockIcon,          color: 'text-blue-500' },
  completed:   { label: 'Completed',   icon: CheckCircleIcon,    color: 'text-green-500' },
  delayed:     { label: 'Delayed',     icon: ExclamationTriangleIcon, color: 'text-red-500' },
};

function fmt(n) {
  if (!n && n !== 0) return '-';
  if (n >= 1e9) return `TZS ${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `TZS ${(n / 1e6).toFixed(1)}M`;
  return `TZS ${n.toLocaleString()}`;
}

function SectionCard({ title, icon: Icon, accent = 'blue', children }) {
  const colors = { blue: 'text-blue-600', green: 'text-green-600', amber: 'text-amber-500', red: 'text-red-500', purple: 'text-purple-600' };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${colors[accent]}`} />
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function GaugeBar({ label, pct, color }) {
  const c = color || (pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400');
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className="font-bold tabular-nums">{pct}%</span>
      </div>
      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${c} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}

// ── Gantt Chart ───────────────────────────────────────────────────────────────
function GanttChart({ project }) {
  const start = project.startDate ? new Date(project.startDate) : null;
  const end   = project.endDate   ? new Date(project.endDate)   : null;

  // Determine chart timeline bounds
  const allDates = [
    start,
    end,
    ...project.milestones.map(m => m.dueDate ? new Date(m.dueDate) : null),
    ...project.activities.map(a => a.dueDate  ? new Date(a.dueDate)  : null),
  ].filter(Boolean);

  if (allDates.length === 0) return null;

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));
  // Pad 5% on each side
  const span = maxDate - minDate || 1;
  const chartStart = new Date(minDate - span * 0.05);
  const chartEnd   = new Date(maxDate + span * 0.07);
  const total      = chartEnd - chartStart;

  const pct = (d) => d ? Math.max(0, Math.min(100, ((new Date(d) - chartStart) / total) * 100)) : null;
  const today = new Date();
  const todayPct = pct(today);

  // Build month labels
  const months = [];
  const cur = new Date(chartStart.getFullYear(), chartStart.getMonth(), 1);
  while (cur <= chartEnd) {
    months.push({ label: cur.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), pct: pct(cur) });
    cur.setMonth(cur.getMonth() + 1);
  }

  const rows = [
    // Project overall bar
    ...(start && end ? [{ label: project.name, type: 'project', from: pct(start), to: pct(end), done: project.status === 'completed' }] : []),
    // Milestones
    ...project.milestones.map(m => ({
      label: m.title,
      type: 'milestone',
      at: pct(m.dueDate),
      done: m.status === 'completed',
      late: m.dueDate && m.status !== 'completed' && new Date(m.dueDate) < today,
    })),
    // Activities with due dates
    ...project.activities.filter(a => a.dueDate).map(a => ({
      label: a.name,
      type: 'activity',
      at: pct(a.dueDate),
      done: a.isCompleted,
      late: !a.isCompleted && new Date(a.dueDate) < today,
    })),
  ];

  return (
    <SectionCard title="Project Timeline (Gantt)" icon={CalendarDaysIcon} accent="blue">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 540 }}>
          {/* Month ruler */}
          <div className="relative h-6 border-b border-gray-200 mb-1">
            {months.map((m, i) => (
              <span key={i} className="absolute text-[10px] text-gray-400 font-mono"
                style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}>
                {m.label}
              </span>
            ))}
          </div>

          {/* Today line */}
          {todayPct >= 0 && todayPct <= 100 && (
            <div className="absolute h-full border-l-2 border-red-400/60 border-dashed z-10 pointer-events-none"
              style={{ left: `${todayPct}%` }} />
          )}

          {/* Rows */}
          <div className="space-y-2 relative">
            {/* Today marker overlay */}
            {todayPct >= 0 && todayPct <= 100 && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/40 z-10 pointer-events-none"
                style={{ left: `${todayPct}%` }} />
            )}

            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2" style={{ minHeight: 24 }}>
                {/* Label */}
                <div className="w-36 shrink-0 text-xs text-gray-600 truncate text-right pr-2" title={row.label}>
                  {row.label}
                </div>
                {/* Bar area */}
                <div className="flex-1 relative h-5 bg-gray-100 rounded">
                  {row.type === 'project' && (
                    <div
                      className={`absolute h-full rounded transition-all ${row.done ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ left: `${row.from}%`, width: `${Math.max(row.to - row.from, 1)}%` }}
                    />
                  )}
                  {(row.type === 'milestone' || row.type === 'activity') && row.at != null && (
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                      style={{ left: `${row.at}%` }}>
                      {row.type === 'milestone' ? (
                        <div className={`w-3.5 h-3.5 rotate-45 border-2 ${
                          row.done ? 'bg-green-500 border-green-600' :
                          row.late ? 'bg-red-400 border-red-500' :
                          'bg-amber-400 border-amber-500'
                        }`} title={row.label} />
                      ) : (
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                          row.done ? 'bg-green-500 border-green-600' :
                          row.late ? 'bg-red-400 border-red-500' :
                          'bg-gray-400 border-gray-500'
                        }`} title={row.label} />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-3 text-[10px] text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-blue-500 inline-block" /> Project Bar</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rotate-45 bg-amber-400 border border-amber-500 inline-block" /> Milestone</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 border border-gray-500 inline-block" /> Activity</span>
            <span className="flex items-center gap-1"><span className="w-0.5 h-3 bg-red-400/60 inline-block border-l border-dashed border-red-400" /> Today</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-500 inline-block" /> Completed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-400 inline-block" /> Overdue</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Inline form components ────────────────────────────────────────────────────
function MilestoneForm({ projectId, initial, onDone, isPending }) {
  const EMPTY = { title: '', description: '', dueDate: '', status: 'not_started', orderNo: '' };
  const [f, setF] = useState(initial
    ? { ...initial, dueDate: initial.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 10) : '' }
    : EMPTY
  );
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <input value={f.title} onChange={e => set('title', e.target.value)} placeholder="Milestone title *"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
      <div className="grid grid-cols-2 gap-3">
        <input type="date" value={f.dueDate} onChange={e => set('dueDate', e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
        <select value={f.status} onChange={e => set('status', e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400">
          {Object.entries(MS_CFG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
      </div>
      <textarea value={f.description} onChange={e => set('description', e.target.value)}
        placeholder="Description (optional)" rows={2}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none outline-none focus:border-blue-400" />
      <div className="flex gap-2">
        <button onClick={() => onDone(f)} disabled={!f.title || isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50">
          {isPending ? 'Saving…' : initial ? 'Update' : 'Add Milestone'}
        </button>
        <button onClick={() => onDone(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
      </div>
    </div>
  );
}

function ActivityForm({ initial, onDone, isPending }) {
  const EMPTY = { name: '', description: '', responsible: '', dueDate: '', isCompleted: false };
  const [f, setF] = useState(initial
    ? { ...initial, dueDate: initial.dueDate ? new Date(initial.dueDate).toISOString().slice(0, 10) : '' }
    : EMPTY
  );
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <input value={f.name} onChange={e => set('name', e.target.value)} placeholder="Activity name *"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={f.responsible} onChange={e => set('responsible', e.target.value)} placeholder="Responsible person"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
        <input type="date" value={f.dueDate} onChange={e => set('dueDate', e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
        <input type="checkbox" checked={f.isCompleted} onChange={e => set('isCompleted', e.target.checked)} className="w-4 h-4 rounded" />
        Mark as completed
      </label>
      <div className="flex gap-2">
        <button onClick={() => onDone(f)} disabled={!f.name || isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50">
          {isPending ? 'Saving…' : initial ? 'Update' : 'Add Activity'}
        </button>
        <button onClick={() => onDone(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
      </div>
    </div>
  );
}

function ExpenditureForm({ initial, onDone, isPending }) {
  const EMPTY = { amount: '', description: '', period: '', date: new Date().toISOString().slice(0, 10) };
  const [f, setF] = useState(initial
    ? { ...initial, date: initial.date ? new Date(initial.date).toISOString().slice(0, 10) : '' }
    : EMPTY
  );
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input type="number" min="0" value={f.amount} onChange={e => set('amount', e.target.value)} placeholder="Amount (TZS) *"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-bold outline-none focus:border-blue-400" />
        <input type="date" value={f.date} onChange={e => set('date', e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input value={f.description} onChange={e => set('description', e.target.value)} placeholder="Description"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
        <input value={f.period} onChange={e => set('period', e.target.value)} placeholder="Period (e.g. Q1)"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => onDone(f)} disabled={!f.amount || isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50">
          {isPending ? 'Saving…' : initial ? 'Update' : 'Record Expenditure'}
        </button>
        <button onClick={() => onDone(null)} className="px-4 py-2 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const user      = useAuthStore(s => s.user);
  const qc        = useQueryClient();
  const canEdit   = ['super_admin', 'me_officer', 'admin', 'data_collector'].includes(user?.role);
  const canAdmin  = ['super_admin', 'me_officer', 'admin'].includes(user?.role);

  const [showMsForm,   setShowMsForm]   = useState(false);
  const [showActForm,  setShowActForm]  = useState(false);
  const [showExpForm,  setShowExpForm]  = useState(false);
  const [editingMs,    setEditingMs]    = useState(null);
  const [editingAct,   setEditingAct]   = useState(null);
  const [editingExp,   setEditingExp]   = useState(null);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id).then(r => r.data),
  });

  const inv = () => qc.invalidateQueries(['project', id]);

  const { mutateAsync: createMs,  isPending: p1 } = useMutation({ mutationFn: d => projectsApi.createMilestone(id, d),  onSuccess: inv, onError: () => toast.error('Failed') });
  const { mutateAsync: updateMs,  isPending: p2 } = useMutation({ mutationFn: ({ mid, d }) => projectsApi.updateMilestone(id, mid, d), onSuccess: inv, onError: () => toast.error('Failed') });
  const { mutateAsync: deleteMs  } = useMutation({ mutationFn: mid => projectsApi.deleteMilestone(id, mid), onSuccess: inv, onError: () => toast.error('Failed') });
  const { mutateAsync: createAct, isPending: p3 } = useMutation({ mutationFn: d => projectsApi.createActivity(id, d),  onSuccess: inv, onError: () => toast.error('Failed') });
  const { mutateAsync: updateAct, isPending: p4 } = useMutation({ mutationFn: ({ aid, d }) => projectsApi.updateActivity(id, aid, d), onSuccess: inv, onError: () => toast.error('Failed') });
  const { mutateAsync: deleteAct } = useMutation({ mutationFn: aid => projectsApi.deleteActivity(id, aid), onSuccess: inv, onError: () => toast.error('Failed') });
  const { mutateAsync: createExp, isPending: p5 } = useMutation({ mutationFn: d => projectsApi.createExpenditure(id, d), onSuccess: inv, onError: () => toast.error('Failed') });
  const { mutateAsync: updateExp, isPending: p6 } = useMutation({ mutationFn: ({ eid, d }) => projectsApi.updateExpenditure(id, eid, d), onSuccess: inv, onError: () => toast.error('Failed') });
  const { mutateAsync: deleteExp } = useMutation({ mutationFn: eid => projectsApi.deleteExpenditure(id, eid), onSuccess: inv, onError: () => toast.error('Failed') });
  const { mutateAsync: removeProject } = useMutation({
    mutationFn: () => projectsApi.remove(id),
    onSuccess: () => { toast.success('Project deleted'); navigate('/projects'); },
    onError: () => toast.error('Failed to delete'),
  });

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">Loading…</div>;
  if (!project)  return <div className="p-8 text-red-500 text-sm">Project not found</div>;

  const m = project.metrics || {};
  const status = STATUS_CFG[project.status] || STATUS_CFG.planned;
  const sustainColor = m.sustainRating === 'strong' ? 'text-green-600' : m.sustainRating === 'moderate' ? 'text-amber-500' : 'text-red-500';

  const pieData = [
    { name: 'Spent',   value: m.totalSpent || 0 },
    { name: 'Balance', value: Math.max(0, m.remainingBalance || 0) },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link to="/projects" className="mt-1 p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeftIcon className="w-4 h-4 text-gray-500" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.cls}`}>{status.label}</span>
          </div>
          {project.code && <p className="text-xs text-gray-400 font-mono mt-0.5">{project.code}</p>}
          {project.goal && <p className="text-sm text-gray-600 mt-2 max-w-2xl">{project.goal}</p>}
        </div>
        {canAdmin && (
          <div className="flex gap-2 shrink-0">
            <Link to={`/projects/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50">
              <PencilSquareIcon className="w-3.5 h-3.5" /> Edit
            </Link>
            <button onClick={() => { if (window.confirm('Delete this project?')) removeProject(); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50">
              <TrashIcon className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Top row: Basic info + Financial */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Basic Info */}
        <SectionCard title="Basic Information" icon={BuildingOfficeIcon} accent="blue">
          <div className="space-y-3 text-sm">
            {[
              { label: 'Institution',    value: project.institution?.name },
              { label: 'Department',     value: project.department?.name },
              { label: 'Unit',           value: project.unit?.name },
              { label: 'Fiscal Year',    value: project.fiscalYear },
              { label: 'Funding Source', value: project.fundingSource },
              { label: 'Start Date',     value: project.startDate ? new Date(project.startDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : null },
              { label: 'End Date',       value: project.endDate   ? new Date(project.endDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : null },
              { label: 'Time Elapsed',   value: m.timeElapsed != null ? `${m.timeElapsed}%` : null },
            ].filter(r => r.value).map(row => (
              <div key={row.label} className="flex justify-between gap-4 border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-500 shrink-0">{row.label}</span>
                <span className="text-gray-800 font-medium text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Financial */}
        <SectionCard title="Financial Tracking" icon={CurrencyDollarIcon} accent="green">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[11px] text-gray-400 mb-1">Total Budget</p>
                <p className="text-sm font-extrabold text-gray-800">{fmt(project.totalBudget)}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-[11px] text-gray-400 mb-1">Expenditure</p>
                <p className="text-sm font-extrabold text-blue-700">{fmt(m.totalSpent)}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-[11px] text-gray-400 mb-1">Balance</p>
                <p className="text-sm font-extrabold text-green-700">{fmt(m.remainingBalance)}</p>
              </div>
            </div>

            {/* Pie chart */}
            {project.totalBudget > 0 && (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    <Cell fill="#3b82f6" />
                    <Cell fill="#d1fae5" />
                  </Pie>
                  <Tooltip formatter={(v) => `TZS ${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}

            <div>
              <GaugeBar label="Budget Utilisation" pct={m.budgetUtil ?? 0} />
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Progress */}
      <SectionCard title="Progress Measurement" icon={ChartBarIcon} accent="purple">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <GaugeBar label="Overall Progress" pct={m.progressPct ?? 0} />
          <GaugeBar label="Milestones Achieved" pct={m.milestonePct ?? 0} />
          <GaugeBar label="Activities Completed" pct={m.actPct ?? 0} />
        </div>
      </SectionCard>

      {/* Gantt Chart */}
      {(project.startDate || project.endDate || project.milestones.length > 0 || project.activities.length > 0) && (
        <GanttChart project={project} />
      )}

      {/* Milestones */}
      <SectionCard title="Milestones" icon={FlagIcon} accent="amber">
        <div className="space-y-3">
          {project.milestones.length === 0 && !showMsForm && (
            <p className="text-sm text-gray-400 text-center py-4">No milestones added yet</p>
          )}
          {project.milestones.map(ms => {
            const cfg = MS_CFG[ms.status] || MS_CFG.not_started;
            const Icon = cfg.icon;
            const isOver = ms.dueDate && ms.status !== 'completed' && new Date(ms.dueDate) < new Date();
            if (editingMs?.id === ms.id) {
              return <MilestoneForm key={ms.id} projectId={id} initial={editingMs}
                onDone={d => { if (d) updateMs({ mid: ms.id, d }); setEditingMs(null); }}
                isPending={p2} />;
            }
            return (
              <div key={ms.id} className={`flex items-start gap-3 p-3 rounded-xl border ${isOver ? 'border-red-200 bg-red-50/30' : 'border-gray-100 bg-gray-50/40'}`}>
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{ms.title}</p>
                  {ms.description && <p className="text-xs text-gray-500 mt-0.5">{ms.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                    {ms.dueDate && <span>{isOver ? '⚠ Due: ' : 'Due: '}{new Date(ms.dueDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>}
                    {ms.completedAt && <span className="text-green-600">✔ {new Date(ms.completedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditingMs(ms)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                      <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => { if (window.confirm('Delete?')) deleteMs(ms.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {showMsForm && (
            <MilestoneForm projectId={id}
              onDone={d => { if (d) createMs(d).then(() => toast.success('Milestone added')); setShowMsForm(false); }}
              isPending={p1} />
          )}
          {canEdit && !showMsForm && !editingMs && (
            <button onClick={() => setShowMsForm(true)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-xs font-semibold mt-2">
              <PlusIcon className="w-4 h-4" /> Add Milestone
            </button>
          )}
        </div>
      </SectionCard>

      {/* Activities */}
      <SectionCard title="Project Activities" icon={ChartBarIcon} accent="blue">
        <div className="space-y-2">
          {project.activities.length === 0 && !showActForm && (
            <p className="text-sm text-gray-400 text-center py-4">No activities added yet</p>
          )}
          {project.activities.map(act => {
            if (editingAct?.id === act.id) {
              return <ActivityForm key={act.id} initial={editingAct}
                onDone={d => { if (d) updateAct({ aid: act.id, d }); setEditingAct(null); }}
                isPending={p4} />;
            }
            return (
              <div key={act.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50/50">
                <input type="checkbox" checked={act.isCompleted} readOnly={!canEdit}
                  onChange={canEdit ? () => updateAct({ aid: act.id, d: { isCompleted: !act.isCompleted } }) : undefined}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${act.isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>{act.name}</p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                    {act.responsible && <span>{act.responsible}</span>}
                    {act.dueDate && <span>Due {new Date(act.dueDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short' })}</span>}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditingAct(act)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (window.confirm('Delete?')) deleteAct(act.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {showActForm && (
            <ActivityForm onDone={d => { if (d) createAct(d).then(() => toast.success('Activity added')); setShowActForm(false); }} isPending={p3} />
          )}
          {canEdit && !showActForm && !editingAct && (
            <button onClick={() => setShowActForm(true)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-xs font-semibold mt-2">
              <PlusIcon className="w-4 h-4" /> Add Activity
            </button>
          )}
        </div>
      </SectionCard>

      {/* Expenditures */}
      <SectionCard title="Expenditure Records" icon={CurrencyDollarIcon} accent="green">
        <div className="space-y-2">
          {project.expenditures.length === 0 && !showExpForm && (
            <p className="text-sm text-gray-400 text-center py-4">No expenditure records yet</p>
          )}
          {project.expenditures.map(exp => {
            if (editingExp?.id === exp.id) {
              return <ExpenditureForm key={exp.id} initial={editingExp}
                onDone={d => { if (d) updateExp({ eid: exp.id, d }); setEditingExp(null); }}
                isPending={p6} />;
            }
            return (
              <div key={exp.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-50/50 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-blue-700">TZS {exp.amount.toLocaleString()}</p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                    {exp.description && <span className="truncate">{exp.description}</span>}
                    {exp.period && <span className="font-semibold text-gray-500">{exp.period}</span>}
                    <span>{new Date(exp.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })}</span>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setEditingExp(exp)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => { if (window.confirm('Delete?')) deleteExp(exp.id); }} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {showExpForm && (
            <ExpenditureForm onDone={d => { if (d) createExp(d).then(() => toast.success('Expenditure recorded')); setShowExpForm(false); }} isPending={p5} />
          )}
          {canEdit && !showExpForm && !editingExp && (
            <button onClick={() => setShowExpForm(true)} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-xs font-semibold mt-2">
              <PlusIcon className="w-4 h-4" /> Record Expenditure
            </button>
          )}
        </div>
      </SectionCard>

      {/* Sustainability */}
      <SectionCard title="Sustainability Assessment" icon={ChartBarIcon} accent="green">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{m.sustainScore ?? 0}%</p>
              <p className={`text-sm font-bold mt-0.5 ${sustainColor}`}>
                {m.sustainRating === 'strong' ? '✔ Strong (70–100%)' : m.sustainRating === 'moderate' ? '⚠ Moderate (40–69%)' : '✖ Weak (Below 40%)'}
              </p>
            </div>
            <div className={`text-right text-xs font-semibold px-4 py-3 rounded-2xl border ${
              m.sustainRating === 'strong' ? 'bg-green-50 border-green-200 text-green-700' :
              m.sustainRating === 'moderate' ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-red-50 border-red-200 text-red-700'
            }`}>
              <p>Sustainability Rating</p>
              <p className="text-lg font-extrabold mt-0.5">{m.sustainRating === 'strong' ? 'STRONG' : m.sustainRating === 'moderate' ? 'MODERATE' : 'WEAK'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <GaugeBar label="Financial Sustainability"  pct={m.dimensions?.financial    ?? 0} />
            <GaugeBar label="Operational Sustainability" pct={m.dimensions?.operational ?? 0} />
            <GaugeBar label="Institutional Capacity"    pct={m.dimensions?.institutional ?? 0} />
            <GaugeBar label="Environmental Considerations" pct={m.dimensions?.environmental ?? 0} />
          </div>
        </div>
      </SectionCard>

      {/* Weakness + Recommendations */}
      {(m.issues?.length > 0 || m.recommendations?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {m.issues?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                <p className="text-sm font-bold text-red-700">Identified Issues</p>
              </div>
              <ul className="space-y-2">
                {m.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-red-700">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.recommendations?.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <LightBulbIcon className="w-5 h-5 text-blue-500" />
                <p className="text-sm font-bold text-blue-700">Suggested Actions</p>
              </div>
              <ul className="space-y-2">
                {m.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-blue-700">
                    <span className="shrink-0 mt-0.5">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
