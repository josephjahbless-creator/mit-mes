import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '../../api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import {
  PlusIcon, PencilSquareIcon, TrashIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

const FISCAL_YEAR = getCurrentFiscalYear();
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'Annual'];
const PERIOD_LABELS = {
  Q1: 'Q1: Jul to Sep 2025', Q2: 'Q2: Oct to Dec 2025',
  Q3: 'Q3: Jan to Mar 2026', Q4: 'Q4: Apr to Jun 2026',
  H1: 'H1: Jul to Dec 2025', H2: 'H2: Jan to Jun 2026',
  Annual: 'Annual 2025/2026',
};
const SECTORS = [
  '', 'Manufacturing', 'Agro Processing', 'Food and Beverages',
  'Textile and Garments', 'Chemical and Pharmaceuticals',
  'Construction Materials', 'Mining and Quarrying',
  'Energy (Solar/Renewable)', 'ICT and Electronics', 'Other Industries',
];

const EMPTY_FORM = {
  period: '', sector: '', region: '',
  totalRegistered: '', operating: '', closed: '', newRegistered: '',
  reportDate: new Date().toISOString().slice(0, 10),
};

function StatForm({ initial, onSave, onCancel, isPending }) {
  const [form, setForm] = useState(() => initial
    ? { ...initial, reportDate: initial.reportDate ? new Date(initial.reportDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10) }
    : EMPTY_FORM
  );
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.period && form.totalRegistered !== '';

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <h3 className="text-sm font-bold text-gray-800">
        {initial ? 'Edit Record' : 'Add Industry Statistics'}
      </h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Reporting Period <span className="text-red-400">*</span>
          </label>
          <select value={form.period} onChange={e => set('period', e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400">
            <option value="">Select period…</option>
            {PERIODS.map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Report Date</label>
          <input type="date" value={form.reportDate} onChange={e => set('reportDate', e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Sector <span className="text-gray-400 font-normal">(blank = overall totals)</span>
          </label>
          <select value={form.sector} onChange={e => set('sector', e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400">
            {SECTORS.map(s => <option key={s} value={s}>{s || 'Overall (no sector)'}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Region <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input type="text" value={form.region} onChange={e => set('region', e.target.value)}
            placeholder="e.g. Dar es Salaam"
            className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'totalRegistered', label: 'Total Registered', req: true,  cls: 'border-blue-200  focus:border-blue-400  text-blue-700' },
          { key: 'operating',       label: 'Operating',        req: false, cls: 'border-green-200 focus:border-green-400 text-green-700' },
          { key: 'closed',          label: 'Closed',           req: false, cls: 'border-red-200   focus:border-red-400   text-red-700'   },
          { key: 'newRegistered',   label: 'Newly Registered', req: false, cls: 'border-amber-200 focus:border-amber-400 text-amber-700' },
        ].map(({ key, label, req, cls }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {label} {req && <span className="text-red-400">*</span>}
            </label>
            <input type="number" min="0" step="1" value={form[key]}
              onChange={e => set(key, e.target.value)} placeholder="0"
              className={`w-full rounded-xl border-2 px-3 py-2.5 text-sm font-bold outline-none transition-all ${cls}`} />
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={() => onSave(form)} disabled={!valid || isPending}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            valid && !isPending ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}>
          {isPending ? 'Saving…' : initial ? 'Save Changes' : 'Add Record'}
        </button>
        <button onClick={onCancel}
          className="px-6 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function IndustryStatsPage() {
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();
  const canEdit = ['super_admin', 'me_officer', 'admin'].includes(user?.role);

  const [period,   setPeriod]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState(null);

  const params = { fiscalYear: FISCAL_YEAR, ...(period ? { period } : {}) };

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['industry-stats-list', FISCAL_YEAR, period],
    queryFn: () => dashboardApi.listIndustryStats(params).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['industry-stats', FISCAL_YEAR, period],
    queryFn: () => dashboardApi.industryStatistics(params).then(r => r.data),
  });

  const invalidate = () => {
    qc.invalidateQueries(['industry-stats-list']);
    qc.invalidateQueries(['industry-stats']);
    qc.invalidateQueries(['dashboard-industry']);
  };

  const { mutateAsync: create, isPending: creating } = useMutation({
    mutationFn: data => dashboardApi.createIndustryStats({ ...data, fiscalYear: FISCAL_YEAR }),
    onSuccess: () => { toast.success('Record added'); invalidate(); setShowForm(false); },
    onError: () => toast.error('Failed to save'),
  });

  const { mutateAsync: update, isPending: updating } = useMutation({
    mutationFn: ({ id, data }) => dashboardApi.updateIndustryStats(id, data),
    onSuccess: () => { toast.success('Record updated'); invalidate(); setEditing(null); },
    onError: () => toast.error('Failed to update'),
  });

  const { mutateAsync: remove } = useMutation({
    mutationFn: id => dashboardApi.deleteIndustryStats(id),
    onSuccess: () => { toast.success('Record deleted'); invalidate(); },
    onError: () => toast.error('Failed to delete'),
  });

  const totals   = statsData?.totals ?? {};
  const bySector = statsData?.bySector ?? [];

  function handleDelete(id) {
    if (window.confirm('Delete this record?')) remove(id);
  }

  // Group records by period for display
  const grouped = records.reduce((acc, r) => {
    const key = r.period;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BuildingStorefrontIcon className="w-7 h-7 text-green-600" />
            Industry Statistics
          </h1>
          <p className="text-gray-500 text-sm mt-1">FY {FISCAL_YEAR} · Enter and manage industry registration data</p>
        </div>
        {canEdit && !showForm && !editing && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shrink-0">
            <PlusIcon className="w-4 h-4" /> Add Record
          </button>
        )}
      </div>

      {/* Period filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Period:</span>
        {['', ...PERIODS].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {p || 'All'}
          </button>
        ))}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <StatForm onSave={create} onCancel={() => setShowForm(false)} isPending={creating} />
      )}
      {editing && (
        <StatForm initial={editing} onSave={d => update({ id: editing.id, data: d })}
          onCancel={() => setEditing(null)} isPending={updating} />
      )}

      {/* Summary totals */}
      {totals.totalRegistered > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Registered', value: totals.totalRegistered, color: 'blue' },
            { label: 'Operating',        value: totals.operating,       color: 'green' },
            { label: 'Closed',           value: totals.closed,          color: 'red' },
            { label: 'New This Period',  value: totals.newRegistered,   color: 'amber' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <p className={`text-2xl font-extrabold ${
                color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-green-600' :
                color === 'red'  ? 'text-red-500'  : 'text-amber-600'
              }`}>{(value ?? 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Records list grouped by period */}
      {!isLoading && records.length > 0 && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([p, rows]) => (
            <div key={p} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  {PERIOD_LABELS[p] || p}
                </p>
                <span className="text-xs text-gray-400">{rows.length} record{rows.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {rows.map(record => (
                  <div key={record.id} className="flex items-center justify-between px-5 py-3 gap-4 hover:bg-gray-50/50">
                    <div className="min-w-[160px]">
                      <p className="text-sm font-semibold text-gray-800">
                        {record.sector || <span className="text-gray-400 italic">Overall</span>}
                      </p>
                      {record.region && <p className="text-xs text-gray-400">{record.region}</p>}
                    </div>
                    <div className="flex gap-6 text-xs text-center flex-1 justify-end">
                      <div><p className="font-bold text-blue-700 text-sm">{record.totalRegistered.toLocaleString()}</p><p className="text-gray-400">Registered</p></div>
                      <div><p className="font-bold text-green-600 text-sm">{record.operating.toLocaleString()}</p><p className="text-gray-400">Operating</p></div>
                      <div><p className="font-bold text-red-500 text-sm">{record.closed.toLocaleString()}</p><p className="text-gray-400">Closed</p></div>
                      <div><p className="font-bold text-amber-600 text-sm">{record.newRegistered.toLocaleString()}</p><p className="text-gray-400">New</p></div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => { setEditing(record); setShowForm(false); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(record.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && records.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <BuildingStorefrontIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No industry statistics yet</p>
          {canEdit
            ? <p className="text-gray-400 text-sm mt-1">Click <strong>Add Record</strong> to enter the first data point</p>
            : <p className="text-gray-400 text-sm mt-1">No data has been entered for this period</p>
          }
        </div>
      )}

      {/* Guide */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-bold">How to enter industry statistics:</p>
        <p>1. Add one <strong>overall record</strong> (no sector) per period for national totals shown on the dashboard.</p>
        <p>2. Add separate <strong>sector records</strong> (Manufacturing, Agro Processing, etc.) for the sector breakdown chart.</p>
        <p>3. Keep the same period across all records for the same reporting cycle.</p>
      </div>
    </div>
  );
}
