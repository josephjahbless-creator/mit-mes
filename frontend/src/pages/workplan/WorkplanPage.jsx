import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workplanApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentListIcon, FunnelIcon, ChevronDownIcon, ChevronRightIcon,
  PlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon,
  CalendarDaysIcon, BuildingOfficeIcon, FlagIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  not_started: { label: 'Not Started', color: 'bg-gray-100 text-gray-600',  dot: 'bg-gray-400' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700',  dot: 'bg-blue-500' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700',dot: 'bg-green-500' },
  delayed:     { label: 'Delayed',     color: 'bg-red-100 text-red-600',    dot: 'bg-red-500' },
  on_hold:     { label: 'On Hold',     color: 'bg-amber-100 text-amber-700',dot: 'bg-amber-400' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.not_started;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ProgressBar({ pct }) {
  const color = pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct || 0, 100)}%` }} />
      </div>
      <span className="text-xs font-bold w-8 text-right tabular-nums">{Math.round(pct || 0)}%</span>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Milestone Row ─────────────────────────────────────────────────────────────
function MilestoneRow({ milestone, activityId, canEdit, onUpdate, onDelete }) {
  const statusOrder = ['not_started', 'in_progress', 'completed', 'delayed', 'on_hold'];
  const cycleStatus = () => {
    const next = statusOrder[(statusOrder.indexOf(milestone.status) + 1) % statusOrder.length];
    onUpdate(activityId, milestone.id, { status: next, completedAt: next === 'completed' ? new Date().toISOString() : null });
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 group">
      <button onClick={canEdit ? cycleStatus : undefined} disabled={!canEdit}
        className="flex-shrink-0 text-gray-400 hover:text-green-500 disabled:cursor-default transition-colors">
        {milestone.status === 'completed'
          ? <CheckCircleSolid className="w-4 h-4 text-green-500" />
          : <CheckCircleIcon className="w-4 h-4" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${milestone.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {milestone.title}
        </p>
        {milestone.dueDate && (
          <p className="text-xs text-gray-400 mt-0.5">Due {fmtDate(milestone.dueDate)}</p>
        )}
      </div>
      <StatusBadge status={milestone.status} />
      {canEdit && (
        <button onClick={() => onDelete(activityId, milestone.id)}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all flex-shrink-0">
          <TrashIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Activity Card ─────────────────────────────────────────────────────────────
function ActivityCard({ activity, canEdit, onUpdateWorkplan, onAddMilestone, onUpdateMilestone, onDeleteMilestone }) {
  const [expanded, setExpanded]   = useState(false);
  const [editing,  setEditing]    = useState(false);
  const [form,     setForm]       = useState({
    workplanStatus: activity.workplanStatus || 'not_started',
    progressPct:    activity.progressPct    || 0,
    startDate:      activity.startDate ? activity.startDate.slice(0, 10) : '',
    endDate:        activity.endDate   ? activity.endDate.slice(0, 10)   : '',
    remarks:        activity.remarks   || '',
  });
  const [newMilestone, setNewMilestone] = useState('');
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const objective = activity.output?.outcome?.objective;
  const output    = activity.output;

  function saveEdit() {
    onUpdateWorkplan(activity.id, {
      ...form,
      progressPct: parseFloat(form.progressPct),
    });
    setEditing(false);
  }

  function addMilestone() {
    if (!newMilestone.trim()) return;
    onAddMilestone(activity.id, { title: newMilestone.trim() });
    setNewMilestone('');
    setShowMilestoneForm(false);
  }

  const totalMs    = activity.milestones?.length || 0;
  const doneMs     = activity.milestones?.filter(m => m.status === 'completed').length || 0;
  const isOverdue  = activity.endDate && new Date(activity.endDate) < new Date() && activity.workplanStatus !== 'completed';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <button onClick={() => setExpanded(e => !e)} className="mt-0.5 text-gray-400 hover:text-gray-700 flex-shrink-0">
          {expanded ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-2 justify-between">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-snug">{activity.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {objective?.name && <span className="text-blue-500">{objective.name}</span>}
                {output?.name && <span className="text-gray-400"> › {output.name}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isOverdue && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Overdue</span>
              )}
              <StatusBadge status={activity.workplanStatus || 'not_started'} />
              {canEdit && (
                <button onClick={() => { setEditing(e => !e); setExpanded(true); }}
                  className="text-gray-400 hover:text-blue-600 transition-colors">
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Progress + dates */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <ProgressBar pct={activity.progressPct || 0} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {activity.startDate && <span>📅 {fmtDate(activity.startDate)}</span>}
              {activity.endDate   && <span>→ {fmtDate(activity.endDate)}</span>}
            </div>
          </div>

          {/* Institution */}
          {activity.responsibleInstitution && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
              <BuildingOfficeIcon className="w-3.5 h-3.5" />
              {activity.responsibleInstitution.name}
            </div>
          )}

          {/* Milestone counter */}
          {totalMs > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              <span className="font-semibold text-gray-600">{doneMs}/{totalMs}</span> milestones complete
            </p>
          )}
        </div>
      </div>

      {/* Expandable section */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-4 bg-gray-50">

          {/* Edit form */}
          {editing && (
            <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Update Workplan</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Status</label>
                  <select value={form.workplanStatus} onChange={e => setForm(f => ({ ...f, workplanStatus: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5">
                    {Object.entries(STATUS_CFG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Progress %</label>
                  <input type="number" min="0" max="100" value={form.progressPct}
                    onChange={e => setForm(f => ({ ...f, progressPct: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Start Date</label>
                  <input type="date" value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">End Date</label>
                  <input type="date" value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">Remarks</label>
                  <textarea value={form.remarks} rows={2}
                    onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 resize-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveEdit}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700">
                  Save
                </button>
                <button onClick={() => setEditing(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Remarks display */}
          {!editing && activity.remarks && (
            <p className="text-xs text-gray-600 italic">"{activity.remarks}"</p>
          )}

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Milestones</p>
              {canEdit && (
                <button onClick={() => setShowMilestoneForm(s => !s)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <PlusIcon className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>

            {showMilestoneForm && (
              <div className="flex gap-2 mb-3">
                <input value={newMilestone} onChange={e => setNewMilestone(e.target.value)}
                  placeholder="Milestone title…"
                  onKeyDown={e => e.key === 'Enter' && addMilestone()}
                  className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-1.5" />
                <button onClick={addMilestone}
                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg">
                  Add
                </button>
              </div>
            )}

            {activity.milestones?.length > 0 ? (
              <div className="space-y-0.5">
                {activity.milestones.map(m => (
                  <MilestoneRow key={m.id} milestone={m} activityId={activity.id} canEdit={canEdit}
                    onUpdate={onUpdateMilestone} onDelete={onDeleteMilestone} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-2">No milestones yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-1 opacity-75">{label}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkplanPage() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const canEdit  = ['super_admin', 'me_officer', 'admin', 'data_collector'].includes(user?.role);

  const [filters, setFilters] = useState({ status: '', search: '' });

  const { data: summary } = useQuery({
    queryKey: ['workplan-summary'],
    queryFn: () => workplanApi.summary().then(r => r.data),
  });

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['workplan', filters.status],
    queryFn: () => workplanApi.list({ status: filters.status || undefined }).then(r => r.data),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => workplanApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['workplan']); qc.invalidateQueries(['workplan-summary']); toast.success('Updated'); },
    onError: () => toast.error('Failed to update'),
  });

  const addMs = useMutation({
    mutationFn: ({ id, data }) => workplanApi.createMilestone(id, data),
    onSuccess: () => { qc.invalidateQueries(['workplan']); toast.success('Milestone added'); },
    onError: () => toast.error('Failed to add milestone'),
  });

  const updateMs = useMutation({
    mutationFn: ({ id, mid, data }) => workplanApi.updateMilestone(id, mid, data),
    onSuccess: () => { qc.invalidateQueries(['workplan']); },
    onError: () => toast.error('Failed to update milestone'),
  });

  const deleteMs = useMutation({
    mutationFn: ({ id, mid }) => workplanApi.deleteMilestone(id, mid),
    onSuccess: () => { qc.invalidateQueries(['workplan']); toast.success('Milestone removed'); },
    onError: () => toast.error('Failed to delete milestone'),
  });

  const filtered = activities.filter(a =>
    !filters.search || a.name.toLowerCase().includes(filters.search.toLowerCase()) ||
    a.output?.outcome?.objective?.name?.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Workplan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track progress of all framework activities with milestones</p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Activities"  value={summary.total}        color="bg-gray-50 text-gray-800 border border-gray-200" />
          <StatCard label="Not Started"        value={summary.not_started}  color="bg-gray-100 text-gray-700" />
          <StatCard label="In Progress"        value={summary.in_progress}  color="bg-blue-50 text-blue-700" />
          <StatCard label="Completed"          value={summary.completed}    color="bg-green-50 text-green-700" />
          <StatCard label="Delayed"            value={summary.delayed}      color="bg-red-50 text-red-700" />
          <StatCard label="Overall Progress"   value={`${summary.overallProgress}%`} color="bg-indigo-50 text-indigo-700" />
        </div>
      )}

      {/* Milestone overview */}
      {summary && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Milestone Completion</p>
            <p className="text-xs text-gray-500">
              {summary.completedMilestones} / {summary.totalMilestones} done
            </p>
          </div>
          <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
            <div className="bg-green-500 h-3 rounded-full transition-all"
              style={{ width: `${summary.totalMilestones > 0 ? (summary.completedMilestones / summary.totalMilestones) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search activities…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none"
          />
        </div>
        <select value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="text-sm border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-300 outline-none">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Activities list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No activities found</p>
          <p className="text-sm mt-1">
            {filters.search || filters.status
              ? 'Try adjusting your filters'
              : 'Activities from the Results Framework will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              canEdit={canEdit}
              onUpdateWorkplan={(id, data) => update.mutate({ id, data })}
              onAddMilestone={(id, data) => addMs.mutate({ id, data })}
              onUpdateMilestone={(id, mid, data) => updateMs.mutate({ id, mid, data })}
              onDeleteMilestone={(id, mid) => deleteMs.mutate({ id, mid })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
