import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { calendarApi } from '../../api';
import useAuthStore from '../../store/authStore';
import { getCurrentFiscalYear, getFiscalYearOptions } from '../../utils/fiscalYear';

// ─── Constants ────────────────────────────────────────────────────────────────
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const CAN_EDIT_ROLES = ['super_admin', 'admin', 'me_officer'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(dateStr);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
}

function deriveStatus(entry) {
  if (entry.status) return entry.status; // backend-provided
  const days = daysUntil(entry.deadline);
  if (days === null) return 'unknown';
  if (days < 0) return 'overdue';
  if (days === 0) return 'open';
  if (days <= 30) return 'open';
  return 'upcoming';
}

function StatusBadge({ status }) {
  const map = {
    open:     { cls: 'badge-green',  label: 'Open',     Icon: CheckCircleIcon },
    overdue:  { cls: 'badge-red',    label: 'Overdue',  Icon: XCircleIcon },
    upcoming: { cls: 'badge-blue',   label: 'Upcoming', Icon: InformationCircleIcon },
    closed:   { cls: 'badge-gray',   label: 'Closed',   Icon: CheckCircleIcon },
    unknown:  { cls: 'badge-gray',   label: 'Unknown',  Icon: InformationCircleIcon },
  };
  const { cls, label, Icon } = map[status] ?? map.unknown;
  return (
    <span className={`badge ${cls} flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function DaysChip({ days }) {
  if (days === null) return <span className="text-gray-400">—</span>;
  if (days < 0)  return <span className="text-xs font-semibold text-red-600">{Math.abs(days)}d overdue</span>;
  if (days <= 7)  return <span className="text-xs font-semibold text-red-600">{days}d left</span>;
  if (days <= 14) return <span className="text-xs font-semibold text-orange-500">{days}d left</span>;
  return <span className="text-xs text-gray-500">{days}d left</span>;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Current Period Card ──────────────────────────────────────────────────────
function CurrentPeriodCard({ data, isLoading, isError }) {
  if (isLoading) {
    return (
      <div className="card p-5 border-l-4 border-mit-blue animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-1/4 mb-3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="card p-5 border-l-4 border-gray-300">
        <p className="text-sm text-gray-400">No current period data available.</p>
      </div>
    );
  }

  const status = deriveStatus(data);
  const days = daysUntil(data.deadline);
  const urgencyBg =
    days !== null && days <= 7  ? 'bg-red-50 border-red-400' :
    days !== null && days <= 14 ? 'bg-orange-50 border-orange-400' :
    'bg-blue-50 border-mit-blue';

  return (
    <div className={`card p-5 border-l-4 ${urgencyBg}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDaysIcon className="w-8 h-8 text-mit-blue shrink-0" />
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current Reporting Period</p>
            <h2 className="text-xl font-bold text-gray-900 mt-0.5">{data.period || data.periodName || '—'}</h2>
            {data.fiscalYear && (
              <p className="text-sm text-gray-500">FY {data.fiscalYear}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm flex-wrap">
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Deadline</p>
            <p className="font-semibold text-gray-800 mt-0.5">{fmtDate(data.deadline)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Time Left</p>
            <div className="mt-0.5">
              <DaysChip days={days} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
            <StatusBadge status={status} />
          </div>
        </div>
      </div>
      {data.description && (
        <p className="mt-3 text-sm text-gray-600 border-t border-gray-200 pt-3">{data.description}</p>
      )}
    </div>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────
function CalendarModal({ editing, fiscalYear, onClose, onCreate, onUpdate, isSubmitting }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: editing ? {
      period:       editing.period ?? '',
      startDate:    editing.startDate?.slice(0, 10) ?? '',
      deadline:     editing.deadline?.slice(0, 10) ?? '',
      reminderDays: editing.reminderDays ?? 7,
      description:  editing.description ?? '',
      fiscalYear:   editing.fiscalYear ?? fiscalYear,
    } : {
      period:       '',
      startDate:    '',
      deadline:     '',
      reminderDays: 7,
      description:  '',
      fiscalYear,
    },
  });

  function onSubmit(data) {
    const payload = {
      ...data,
      reminderDays: Number(data.reminderDays),
    };
    editing ? onUpdate(payload) : onCreate(payload);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {editing ? 'Edit Deadline' : 'Add Deadline'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Period *</label>
              <select className="input" {...register('period', { required: 'Period is required' })}>
                <option value="">Select period…</option>
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.period && <p className="text-xs text-red-500 mt-1">{errors.period.message}</p>}
            </div>
            <div>
              <label className="label">Fiscal Year *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 2025-2026"
                {...register('fiscalYear', { required: 'Fiscal year is required' })}
              />
              {errors.fiscalYear && <p className="text-xs text-red-500 mt-1">{errors.fiscalYear.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Date *</label>
              <input
                type="date"
                className="input"
                {...register('startDate', { required: 'Start date is required' })}
              />
              {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="label">Deadline *</label>
              <input
                type="date"
                className="input"
                {...register('deadline', { required: 'Deadline is required' })}
              />
              {errors.deadline && <p className="text-xs text-red-500 mt-1">{errors.deadline.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Reminder Days Before Deadline</label>
            <input
              type="number"
              className="input"
              min={1}
              max={60}
              {...register('reminderDays', { min: 1, max: 60 })}
            />
            <p className="text-xs text-gray-400 mt-1">Send reminder this many days before the deadline (default: 7)</p>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Optional notes…"
              {...register('description')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : (editing ? 'Save Changes' : 'Add Deadline')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ entry, onClose, onConfirm, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500 shrink-0" />
          <div>
            <h3 className="font-bold text-gray-900">Delete Deadline</h3>
            <p className="text-sm text-gray-500 mt-1">
              Remove <span className="font-medium">{entry.period}</span> ({entry.fiscalYear}) from the calendar? This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className="btn-danger" disabled={isLoading}>
            {isLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ReportingCalendarPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const canEdit = CAN_EDIT_ROLES.includes(user?.role);

  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [deleteEntry, setDeleteEntry] = useState(null);

  const fyOptions = getFiscalYearOptions(2, 1);

  // ── Queries ──
  const { data: current, isLoading: currentLoading, isError: currentError } = useQuery({
    queryKey: ['calendar', 'current'],
    queryFn: () => calendarApi.current().then(r => r.data),
    retry: 1,
  });

  const { data: entries = [], isLoading: listLoading } = useQuery({
    queryKey: ['calendar', fiscalYear],
    queryFn: () => calendarApi.list({ fiscalYear }).then(r => r.data),
  });

  // ── Mutations ──
  const createMut = useMutation({
    mutationFn: (data) => calendarApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Deadline added');
      setShowModal(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to add deadline'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => calendarApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Deadline updated');
      setEditEntry(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to update deadline'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => calendarApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] });
      toast.success('Deadline removed');
      setDeleteEntry(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to delete'),
  });

  // ── Sort entries by period order ──
  const periodOrder = { Q1: 1, Q2: 2, Q3: 3, Q4: 4, Annual: 5 };
  const sortedEntries = [...entries].sort((a, b) =>
    (periodOrder[a.period] ?? 99) - (periodOrder[b.period] ?? 99)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage reporting deadlines and period schedules</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            Add Deadline
          </button>
        )}
      </div>

      {/* Current period highlight */}
      <CurrentPeriodCard data={current} isLoading={currentLoading} isError={currentError} />

      {/* Table section */}
      <div className="card p-0 overflow-hidden">
        {/* Table header + FY selector */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-gray-400" />
            Calendar
          </h2>
          <select
            className="input w-44 text-sm"
            value={fiscalYear}
            onChange={e => setFiscalYear(e.target.value)}
          >
            {fyOptions.map(fy => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
        </div>

        {listLoading ? (
          <div className="p-10 text-center">
            <div className="inline-block w-6 h-6 border-2 border-mit-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-2">Loading calendar…</p>
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <CalendarDaysIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No deadlines for FY {fiscalYear}</p>
            {canEdit && (
              <button onClick={() => setShowModal(true)} className="btn-secondary mt-3 text-sm">
                Add First Deadline
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600 w-24">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Start Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Deadline</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Days Until</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  {canEdit && <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedEntries.map(entry => {
                  const status = deriveStatus(entry);
                  const days = daysUntil(entry.deadline);
                  const isOverdue = status === 'overdue';
                  return (
                    <tr key={entry.id} className={isOverdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                      <td className="px-5 py-3.5 font-semibold text-gray-900">{entry.period}</td>
                      <td className="px-4 py-3.5 text-gray-600">{fmtDate(entry.startDate)}</td>
                      <td className="px-4 py-3.5 text-gray-600">{fmtDate(entry.deadline)}</td>
                      <td className="px-4 py-3.5">
                        <DaysChip days={days} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={status} />
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditEntry(entry)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteEntry(entry)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <CalendarModal
          fiscalYear={fiscalYear}
          onClose={() => setShowModal(false)}
          onCreate={(data) => createMut.mutate(data)}
          isSubmitting={createMut.isPending}
        />
      )}

      {/* Edit Modal */}
      {editEntry && (
        <CalendarModal
          editing={editEntry}
          fiscalYear={fiscalYear}
          onClose={() => setEditEntry(null)}
          onUpdate={(data) => updateMut.mutate({ id: editEntry.id, data })}
          isSubmitting={updateMut.isPending}
        />
      )}

      {/* Delete Confirm */}
      {deleteEntry && (
        <DeleteConfirm
          entry={deleteEntry}
          onClose={() => setDeleteEntry(null)}
          onConfirm={() => deleteMut.mutate(deleteEntry.id)}
          isLoading={deleteMut.isPending}
        />
      )}
    </div>
  );
}
