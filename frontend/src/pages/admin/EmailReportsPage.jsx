import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  EnvelopeIcon, PlusIcon, PencilIcon, TrashIcon, PlayIcon,
  XMarkIcon, ClockIcon, CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import { emailReportsApi } from '../../api';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { value: 'weekly_summary', label: 'Weekly Summary' },
  { value: 'monthly_performance', label: 'Monthly Performance Report' },
  { value: 'indicator_status', label: 'Indicator Status Report' },
];

const CRON_PRESETS = [
  { label: 'Daily (08:00)', value: '0 8 * * *' },
  { label: 'Every Monday 08:00', value: '0 8 * * 1' },
  { label: 'Every 1st of month', value: '0 8 1 * *' },
  { label: 'Every Quarter (Q start)', value: '0 8 1 7,10,1,4 *' },
  { label: 'Custom…', value: 'custom' },
];

function ScheduleModal({ record, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!record;
  const [form, setForm] = useState({
    name: record?.name || '',
    reportType: record?.reportType || 'weekly_summary',
    recipients: record?.recipients?.join(', ') || '',
    cronExpr: record?.cronExpr || '0 8 * * 1',
    isActive: record?.isActive ?? true,
  });
  const [cronPreset, setCronPreset] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handlePresetChange(preset) {
    setCronPreset(preset);
    if (preset !== 'custom') set('cronExpr', preset);
  }

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? emailReportsApi.update(record.id, data) : emailReportsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['email-reports']);
      toast.success(isEdit ? 'Schedule updated' : 'Schedule created');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const recipients = form.recipients.split(/[\s,]+/).filter(Boolean);
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (recipients.length === 0) { toast.error('At least one recipient email required'); return; }
    mutation.mutate({ ...form, recipients });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900 text-lg">{isEdit ? 'Edit Schedule' : 'New Email Report Schedule'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Schedule Name *</label>
            <input className="input" placeholder="e.g. Weekly KPI Summary to Management" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Report Type</label>
            <select className="input" value={form.reportType} onChange={e => set('reportType', e.target.value)}>
              {REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Recipients (comma-separated emails) *</label>
            <textarea
              className="input"
              rows={2}
              placeholder="manager@mit.go.tz, director@mit.go.tz"
              value={form.recipients}
              onChange={e => set('recipients', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Schedule Preset</label>
              <select className="input" value={cronPreset} onChange={e => handlePresetChange(e.target.value)}>
                <option value="">Select preset...</option>
                {CRON_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Cron Expression</label>
              <input
                className="input font-mono text-sm"
                placeholder="0 8 * * 1"
                value={form.cronExpr}
                onChange={e => { set('cronExpr', e.target.value); setCronPreset('custom'); }}
              />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 font-mono">
            Format: minute hour day month weekday (0=Sun) — e.g. "0 8 * * 1" = every Monday at 8am
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} className="rounded" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active (schedule will run automatically)</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-primary justify-center">
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmailReportsPage() {
  const [modal, setModal] = useState(null);
  const qc = useQueryClient();

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['email-reports'],
    queryFn: () => emailReportsApi.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => emailReportsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['email-reports']); toast.success('Schedule deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const triggerMutation = useMutation({
    mutationFn: (id) => emailReportsApi.trigger(id),
    onSuccess: () => toast.success('Report triggered and sending…'),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to trigger'),
  });

  const typeLabel = (t) => REPORT_TYPES.find(r => r.value === t)?.label || t;

  return (
    <div className="space-y-6">
      {modal && <ScheduleModal record={modal === 'add' ? null : modal} onClose={() => setModal(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <EnvelopeIcon className="w-7 h-7 text-blue-600" />
            Automated Email Reports
          </h1>
          <p className="text-gray-500 text-sm mt-1">Schedule automatic report delivery to stakeholders</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {/* Stats bar */}
      {!isLoading && schedules.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-700">
            <CheckCircleIcon className="w-4 h-4" /> {schedules.filter(s => s.isActive).length} active
          </span>
          <span className="flex items-center gap-1.5 text-gray-500">
            <XCircleIcon className="w-4 h-4" /> {schedules.filter(s => !s.isActive).length} paused
          </span>
        </div>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="card text-center py-16">
          <EnvelopeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No scheduled reports yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first schedule to automatically deliver reports</p>
          <button onClick={() => setModal('add')} className="btn-primary mt-4 mx-auto">Create Schedule</button>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map(s => (
            <div key={s.id} className={`card border-l-4 ${s.isActive ? 'border-l-green-500' : 'border-l-gray-300'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.isActive ? 'bg-green-50' : 'bg-gray-100'}`}>
                    <EnvelopeIcon className={`w-5 h-5 ${s.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900">{s.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.isActive ? <><CheckCircleIcon className="w-3 h-3" /> Active</> : <><XCircleIcon className="w-3 h-3" /> Paused</>}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{typeLabel(s.reportType)}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {s.cronExpr}</span>
                      <span className="flex items-center gap-1">
                        <EnvelopeIcon className="w-3 h-3" />
                        {Array.isArray(s.recipients) ? s.recipients.join(', ') : s.recipients}
                      </span>
                      {s.lastSentAt && <span>Last sent: {new Date(s.lastSentAt).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => triggerMutation.mutate(s.id)}
                    disabled={triggerMutation.isPending}
                    title="Send now"
                    className="p-2 text-gray-400 hover:text-green-600 rounded-lg hover:bg-green-50 border border-gray-200"
                  >
                    <PlayIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setModal(s)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 border border-gray-200">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Delete this schedule?')) deleteMutation.mutate(s.id); }}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-gray-200"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">About Automated Reports</p>
        <ul className="text-xs space-y-1 text-blue-700 list-disc list-inside">
          <li>Reports are generated and emailed automatically based on the cron schedule</li>
          <li>The "Send Now" button triggers an immediate delivery regardless of the schedule</li>
          <li>Email is delivered via the configured SMTP server (SMTP_HOST environment variable)</li>
          <li>Cron expressions follow standard 5-field format: minute hour day month weekday</li>
        </ul>
      </div>
    </div>
  );
}
