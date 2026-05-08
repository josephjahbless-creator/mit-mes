import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BanknotesIcon, PlusIcon, PencilIcon, TrashIcon,
  ChartBarIcon, XMarkIcon, FunnelIcon,
} from '@heroicons/react/24/outline';
import { mtefApi } from '../../api';
import { getFiscalYearOptions, getCurrentFiscalYear } from '../../utils/fiscalYear';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const FY_OPTIONS = getFiscalYearOptions();
const CATEGORY_OPTIONS = ['Capital', 'Recurrent', 'Personnel', 'Other'];

function fmt(n) {
  if (n === null || n === undefined) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function MtefModal({ record, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!record;
  const [form, setForm] = useState({
    activityName: record?.activityName || '',
    activityCode: record?.activityCode || '',
    category: record?.category || 'Capital',
    yr1: record?.year1Budget || '',
    yr2: record?.year2Budget || '',
    yr3: record?.year3Budget || '',
    description: record?.description || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? mtefApi.update(record.id, data)
      : mtefApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['mtef']);
      toast.success(isEdit ? 'MTEF entry updated' : 'MTEF entry created');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.activityName.trim()) { toast.error('Activity name is required'); return; }
    mutation.mutate({
      activityName: form.activityName,
      activityCode: form.activityCode || null,
      category: form.category,
      year1Budget: form.yr1 ? parseFloat(form.yr1) : null,
      year2Budget: form.yr2 ? parseFloat(form.yr2) : null,
      year3Budget: form.yr3 ? parseFloat(form.yr3) : null,
      description: form.description || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900 text-lg">{isEdit ? 'Edit MTEF Entry' : 'Add MTEF Entry'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Activity Name *</label>
              <input className="input" placeholder="Activity description" value={form.activityName} onChange={e => set('activityName', e.target.value)} />
            </div>
            <div>
              <label className="label">Activity Code</label>
              <input className="input" placeholder="e.g. ACT-001" value={form.activityCode} onChange={e => set('activityCode', e.target.value)} />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Year 1 Budget (TZS)</label>
              <input type="number" className="input" placeholder="0" value={form.yr1} onChange={e => set('yr1', e.target.value)} />
            </div>
            <div>
              <label className="label">Year 2 Budget (TZS)</label>
              <input type="number" className="input" placeholder="0" value={form.yr2} onChange={e => set('yr2', e.target.value)} />
            </div>
            <div>
              <label className="label">Year 3 Budget (TZS)</label>
              <input type="number" className="input" placeholder="0" value={form.yr3} onChange={e => set('yr3', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="label">Description (optional)</label>
              <textarea className="input" rows={2} placeholder="Notes or justification..." value={form.description} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-primary justify-center">
              {mutation.isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MtefPage() {
  const user = useAuthStore(s => s.user);
  const canEdit = ['super_admin', 'admin', 'me_officer'].includes(user?.role);
  const [modal, setModal] = useState(null); // null | 'add' | record object
  const [filterCat, setFilterCat] = useState('');
  const qc = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['mtef'],
    queryFn: () => mtefApi.list().then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['mtef-summary'],
    queryFn: () => mtefApi.summary().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => mtefApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['mtef']); qc.invalidateQueries(['mtef-summary']); toast.success('Entry deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const filtered = useMemo(() =>
    filterCat ? records.filter(r => r.category === filterCat) : records,
    [records, filterCat]
  );

  const summaryCards = [
    { label: 'Year 1 Total', value: summary?.year1Total, color: 'text-blue-700' },
    { label: 'Year 2 Total', value: summary?.year2Total, color: 'text-indigo-700' },
    { label: 'Year 3 Total', value: summary?.year3Total, color: 'text-violet-700' },
    { label: '3-Year Total', value: summary?.grandTotal, color: 'text-green-700' },
  ];

  const catColors = {
    Capital: 'bg-blue-100 text-blue-700',
    Recurrent: 'bg-green-100 text-green-700',
    Personnel: 'bg-purple-100 text-purple-700',
    Other: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="space-y-6">
      {modal && (
        <MtefModal
          record={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BanknotesIcon className="w-7 h-7 text-blue-600" />
            MTEF Budget
          </h1>
          <p className="text-gray-500 text-sm mt-1">Medium Term Expenditure Framework — 3-Year Budget Planning</p>
        </div>
        {canEdit && (
          <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Add Entry
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, color }) => (
          <div key={label} className="card text-center py-4">
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>
              {value !== null && value !== undefined ? `TZS ${fmt(value)}` : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Category breakdown chart */}
      {summary?.byCategory && Object.keys(summary.byCategory).length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4" /> Budget by Category (Year 1)
          </h3>
          <div className="space-y-3">
            {Object.entries(summary.byCategory).map(([cat, data]) => {
              const pct = summary.year1Total ? (data.year1 / summary.year1Total) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${catColors[cat] || catColors.Other}`}>{cat}</span>
                    <span className="font-semibold text-gray-700">TZS {fmt(data.year1)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <FunnelIcon className="w-4 h-4 text-gray-400" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="input py-1.5 text-sm w-40">
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="text-sm text-gray-500">{filtered.length} entries</span>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Activity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">Category</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Year 1 (TZS)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Year 2 (TZS)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 w-36">Year 3 (TZS)</th>
                {canEdit && <th className="px-4 py-3 w-20" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: canEdit ? 7 : 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-3/4" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="text-center py-12 text-gray-400">
                    No MTEF entries found.{' '}
                    {canEdit && <button onClick={() => setModal('add')} className="text-blue-600 hover:underline">Add the first one</button>}
                  </td>
                </tr>
              ) : (
                filtered.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.activityName}
                      {row.description && <p className="text-xs text-gray-400 mt-0.5">{row.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.activityCode || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${catColors[row.category] || catColors.Other}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(row.year1Budget)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(row.year2Budget)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">{fmt(row.year3Budget)}</td>
                    {canEdit && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setModal(row)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50">
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { if (window.confirm('Delete this entry?')) deleteMutation.mutate(row.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
