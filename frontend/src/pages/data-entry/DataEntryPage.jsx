import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataEntryApi, institutionsApi } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import {
  CheckCircleIcon, ClockIcon, ExclamationTriangleIcon,
  BuildingOfficeIcon, ChartBarIcon, ChevronDownIcon,
  PaperClipIcon, LockClosedIcon, MagnifyingGlassIcon,
  EyeIcon, XMarkIcon, ShieldCheckIcon,
  ArrowUpTrayIcon, ArrowDownTrayIcon, DocumentArrowUpIcon,
  SparklesIcon, ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

const FISCAL_YEAR = getCurrentFiscalYear();
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

const PERIOD_LABELS = {
  Q1: 'Q1 · Jul–Sep 2025', Q2: 'Q2 · Oct–Dec 2025',
  Q3: 'Q3 · Jan–Mar 2026', Q4: 'Q4 · Apr–Jun 2026',
  Annual: 'Annual 2025–2026',
};

function CompletionBar({ pct }) {
  const color = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-200';
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold w-9 text-right ${pct === 100 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-gray-500'}`}>
        {pct}%
      </span>
    </div>
  );
}

function StatusPill({ count, label, color }) {
  if (!count) return null;
  const cls = {
    green: 'bg-green-100 text-green-700', amber: 'bg-amber-100 text-amber-700',
    red:   'bg-red-100 text-red-700',     gray:  'bg-gray-100 text-gray-500',
    blue:  'bg-blue-100 text-blue-700',
  }[color];
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>{count} {label}</span>;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Reject-with-reason modal ───────────────────────────────────────────────────
function RejectModal({ actual, onClose, onConfirm, isPending }) {
  const [remarks, setRemarks] = useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">Reject Submission</h3>
            <p className="text-xs text-gray-500 mt-0.5">Provide a reason so the submitter can correct and resubmit.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-700 space-y-1">
          <p><span className="text-gray-400">Indicator:</span> <span className="font-semibold">{actual?.indicator?.name}</span></p>
          <p><span className="text-gray-400">Value:</span> <span className="font-semibold">{actual?.actualValue?.toLocaleString()} {actual?.indicator?.unit}</span></p>
          <p><span className="text-gray-400">Submitted by:</span> {actual?.submittedBy?.name || '—'}</p>
        </div>

        <div className="space-y-2 mb-5">
          <label className="label">Rejection Reason <span className="text-red-500">*</span></label>
          <textarea
            className="input h-24 resize-none"
            placeholder="Explain why this submission is being rejected…"
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onConfirm(remarks)}
            disabled={!remarks.trim() || isPending}
            className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Rejecting…' : 'Confirm Reject'}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Activity detail modal (view full submission) ───────────────────────────────
function DetailModal({ actual, onClose }) {
  if (!actual) return null;
  const statusColors = {
    approved:  'bg-green-100 text-green-700 border-green-200',
    submitted: 'bg-blue-100 text-blue-700 border-blue-200',
    rejected:  'bg-red-100 text-red-600 border-red-200',
    draft:     'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Submission Detail</h3>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColors[actual.status] || ''}`}>
              {actual.status?.toUpperCase()}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Indicator */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Indicator</p>
            <p className="font-semibold text-gray-900">{actual.indicator?.name}</p>
            <p className="text-xs font-mono text-gray-400 mt-0.5">{actual.indicator?.code}</p>
          </div>

          {/* Value + period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Reported Value</p>
              <p className="text-2xl font-black text-gray-900">
                {actual.actualValue?.toLocaleString()}
                <span className="text-sm font-normal text-gray-400 ml-1">{actual.indicator?.unit}</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Period</p>
              <p className="font-semibold text-gray-700">{PERIOD_LABELS[actual.reportingPeriod] || actual.reportingPeriod}</p>
              <p className="text-xs text-gray-400">FY {actual.fiscalYear}</p>
            </div>
          </div>

          {/* Entity */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Responsible Entity</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {actual.institution && (
                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">
                  {actual.institution.name} ({actual.institution.code})
                </span>
              )}
              {actual.department && (
                <span className="bg-teal-50 text-teal-700 px-2 py-1 rounded-lg font-medium">
                  {actual.department.name}
                </span>
              )}
              {actual.unit && (
                <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded-lg font-medium">
                  {actual.unit.name}
                </span>
              )}
            </div>
          </div>

          {/* Activity link */}
          {actual.activity && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Linked Activity</p>
              <p className="text-xs text-gray-700">{actual.activity.name}</p>
            </div>
          )}

          {/* Remarks */}
          {actual.remarks && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Remarks</p>
              <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-2">{actual.remarks}</p>
            </div>
          )}

          {/* Attachments */}
          {actual.attachments?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {actual.attachments.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded">
                    <PaperClipIcon className="w-3 h-3" /> Attachment {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Audit trail */}
          <div className="border-t pt-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Audit Trail</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-gray-500">Submitted by</span>
                <span className="font-semibold text-gray-800">{actual.submittedBy?.name || '—'}</span>
                <span className="text-gray-400 ml-auto">{fmtDate(actual.submittedAt)}</span>
              </div>
              {actual.status === 'approved' && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  <span className="text-gray-500">Approved by</span>
                  <span className="font-semibold text-gray-800">{actual.approvedBy?.name || '—'}</span>
                  <span className="text-gray-400 ml-auto">{fmtDate(actual.approvedAt)}</span>
                </div>
              )}
              {actual.status === 'rejected' && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-gray-500">Rejected by</span>
                  <span className="font-semibold text-gray-800">{actual.approvedBy?.name || '—'}</span>
                  <span className="text-gray-400 ml-auto">{fmtDate(actual.approvedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Review Tab (admin / me_officer / super_admin) ──────────────────────────────
function ReviewTab() {
  const user = useAuthStore(s => s.user);
  const qc   = useQueryClient();

  const [filterStatus,  setFilterStatus]  = useState('submitted');
  const [filterPeriod,  setFilterPeriod]  = useState('');
  const [filterInst,    setFilterInst]    = useState('');
  const [search,        setSearch]        = useState('');
  const [rejectTarget,  setRejectTarget]  = useState(null);   // actual being rejected
  const [viewTarget,    setViewTarget]    = useState(null);   // actual being viewed

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn:  () => institutionsApi.list().then(r => r.data),
  });

  const { data: actualsResp = {}, isLoading } = useQuery({
    queryKey: ['actuals-review', filterStatus, filterPeriod, filterInst],
    queryFn: () => dataEntryApi.listActuals({
      fiscalYear:    FISCAL_YEAR,
      status:        filterStatus   || undefined,
      period:        filterPeriod   || undefined,
      institutionId: filterInst     || undefined,
      limit:         200,
    }).then(r => r.data),
  });
  const actuals = actualsResp.data ?? actualsResp ?? [];

  const approveMutation = useMutation({
    mutationFn: (id) => dataEntryApi.approve(id),
    onSuccess: (res) => {
      qc.invalidateQueries(['actuals-review']);
      qc.invalidateQueries(['actuals']);
      qc.invalidateQueries(['consolidated-report']);
      const perf = res.data?._performance;
      if (perf?.achievementPct != null) {
        toast.success(`Approved ✓  Achievement: ${perf.achievementPct}%`);
      } else {
        toast.success('Submission approved');
      }
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }) => dataEntryApi.reject(id, { remarks }),
    onSuccess: () => {
      qc.invalidateQueries(['actuals-review']);
      qc.invalidateQueries(['actuals']);
      setRejectTarget(null);
      toast.success('Submission rejected');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Rejection failed'),
  });

  // Client-side search filter
  const filtered = actuals.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.indicator?.name?.toLowerCase().includes(q) ||
      a.indicator?.code?.toLowerCase().includes(q) ||
      a.institution?.name?.toLowerCase().includes(q) ||
      a.submittedBy?.name?.toLowerCase().includes(q)
    );
  });

  const submittedCount = actuals.filter(a => a.status === 'submitted').length;
  const approvedCount  = actuals.filter(a => a.status === 'approved').length;
  const rejectedCount  = actuals.filter(a => a.status === 'rejected').length;

  return (
    <div className="space-y-4">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Awaiting Review', count: submittedCount, color: 'bg-blue-50 border-blue-200 text-blue-700',  statusVal: 'submitted' },
          { label: 'Approved',        count: approvedCount,  color: 'bg-green-50 border-green-200 text-green-700', statusVal: 'approved' },
          { label: 'Rejected',        count: rejectedCount,  color: 'bg-red-50 border-red-200 text-red-600',    statusVal: 'rejected'  },
        ].map(s => (
          <button
            key={s.statusVal}
            onClick={() => setFilterStatus(filterStatus === s.statusVal ? '' : s.statusVal)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              filterStatus === s.statusVal
                ? `${s.color} shadow-sm ring-2 ring-offset-1 ring-current`
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              filterStatus === s.statusVal ? 'bg-white/60' : 'bg-gray-100'
            }`}>{s.count}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="input pl-9"
            placeholder="Search indicator, institution, submitter…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input max-w-[160px]" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
          <option value="">All Periods</option>
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input max-w-[200px]" value={filterInst} onChange={e => setFilterInst(e.target.value)}>
          <option value="">All Institutions</option>
          {institutions.filter(i => !['MIT', 'MIT-HQ'].includes(i.code)).map(i => (
            <option key={i.id} value={i.id}>{i.code}: {i.name}</option>
          ))}
        </select>
        <button
          onClick={() => { setFilterStatus(''); setFilterPeriod(''); setFilterInst(''); setSearch(''); }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >Clear filters</button>
      </div>

      {/* Submissions table */}
      {isLoading ? (
        <div className="card text-center py-12 text-gray-400">
          <div className="w-8 h-8 border-2 border-mit-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading submissions…
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <ShieldCheckIcon className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="font-medium text-gray-500">No submissions match your filters</p>
          <p className="text-xs mt-1">Try changing the status filter or clearing search</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Indicator</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Entity</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 text-xs">Value</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Period</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Submitted By</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs hidden lg:table-cell">Submitted At</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs hidden lg:table-cell">Approved/Rejected By</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    {/* Indicator */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-xs leading-snug max-w-[220px] line-clamp-2">{a.indicator?.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{a.indicator?.code}</p>
                    </td>

                    {/* Entity */}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {a.institution && (
                          <p className="text-xs font-semibold text-gray-700">{a.institution.code}</p>
                        )}
                        {a.department && (
                          <p className="text-[10px] text-teal-600">{a.department.name}</p>
                        )}
                        {a.unit && (
                          <p className="text-[10px] text-violet-600">{a.unit.name}</p>
                        )}
                      </div>
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-gray-900 text-sm">{a.actualValue?.toLocaleString()}</span>
                      <span className="text-[10px] text-gray-400 ml-1">{a.indicator?.unit}</span>
                    </td>

                    {/* Period */}
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-md">
                        {a.reportingPeriod}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={a.status} />
                        {a.status === 'approved' && <LockClosedIcon className="w-3 h-3 text-green-400" />}
                        {a.attachments?.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-blue-500">
                            <PaperClipIcon className="w-3 h-3" />{a.attachments.length}
                          </span>
                        )}
                      </div>
                      {a.status === 'rejected' && a.remarks && (
                        <p className="text-[10px] text-red-500 mt-0.5 max-w-[160px] truncate" title={a.remarks}>
                          "{a.remarks}"
                        </p>
                      )}
                    </td>

                    {/* Submitted by */}
                    <td className="px-4 py-3 text-xs text-gray-600">{a.submittedBy?.name || '—'}</td>

                    {/* Submitted at */}
                    <td className="px-4 py-3 text-[11px] text-gray-400 hidden lg:table-cell whitespace-nowrap">
                      {fmtDate(a.submittedAt)}
                    </td>

                    {/* Approved/Rejected by */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {a.approvedBy ? (
                        <div>
                          <p className="text-xs text-gray-600 font-medium">{a.approvedBy.name}</p>
                          <p className="text-[10px] text-gray-400">{fmtDate(a.approvedAt)}</p>
                        </div>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* View detail */}
                        <button
                          onClick={() => setViewTarget(a)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                          title="View detail"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>

                        {/* Approve (submitted only) */}
                        {a.status === 'submitted' && (
                          <button
                            onClick={() => approveMutation.mutate(a.id)}
                            disabled={approveMutation.isPending}
                            className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}

                        {/* Reject (submitted only) */}
                        {a.status === 'submitted' && (
                          <button
                            onClick={() => setRejectTarget(a)}
                            className="text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors"
                          >
                            Reject
                          </button>
                        )}

                        {/* Approved: view-only badge */}
                        {a.status === 'approved' && (
                          <span className="text-[10px] text-green-600 font-semibold flex items-center gap-1">
                            <CheckCircleIcon className="w-3.5 h-3.5" /> Verified
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {actuals.length} submission{actuals.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </div>
        </div>
      )}

      {/* Modals */}
      {rejectTarget && (
        <RejectModal
          actual={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(remarks) => rejectMutation.mutate({ id: rejectTarget.id, remarks })}
          isPending={rejectMutation.isPending}
        />
      )}
      {viewTarget && (
        <DetailModal actual={viewTarget} onClose={() => setViewTarget(null)} />
      )}
    </div>
  );
}

// ── Submissions Tab (own data + compact view) ──────────────────────────────────
function SubmissionsTab() {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [openPeriod,     setOpenPeriod]     = useState(null);
  const [viewTarget,     setViewTarget]     = useState(null);
  const [rejectTarget,   setRejectTarget]   = useState(null);
  const user = useAuthStore(s => s.user);
  const qc   = useQueryClient();

  const { data: actualsAllResp = {}, isLoading } = useQuery({
    queryKey: ['actuals', 'all', selectedStatus],
    queryFn: () => dataEntryApi.listActuals({
      fiscalYear: FISCAL_YEAR,
      status:     selectedStatus || undefined,
      limit:      200,
    }).then(r => r.data),
  });
  const actuals = actualsAllResp.data ?? actualsAllResp ?? [];

  const approveMutation = useMutation({
    mutationFn: (id) => dataEntryApi.approve(id),
    onSuccess: (res) => {
      qc.invalidateQueries(['actuals']);
      qc.invalidateQueries(['consolidated-report']);
      const perf = res.data?._performance;
      toast.success(perf?.achievementPct != null
        ? `Approved ✓  Achievement: ${perf.achievementPct}%`
        : 'Approved');
    },
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, remarks }) => dataEntryApi.reject(id, { remarks }),
    onSuccess: () => {
      qc.invalidateQueries(['actuals']);
      setRejectTarget(null);
      toast.success('Submission rejected');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Rejection failed'),
  });

  const canApprove = ['super_admin', 'me_officer', 'admin'].includes(user?.role);

  const grouped = PERIODS.reduce((acc, p) => {
    acc[p] = actuals.filter(a => a.reportingPeriod === p);
    return acc;
  }, {});

  const statusCount = (list) =>
    list.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <select className="input max-w-[160px]" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="card text-center py-10 text-gray-400">Loading...</div>
      ) : (
        PERIODS.map(period => {
          const rows  = grouped[period] || [];
          const isOpen = openPeriod === period;
          const sc    = statusCount(rows);

          return (
            <div key={period} className="border rounded-xl overflow-hidden bg-white">
              <button
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setOpenPeriod(isOpen ? null : period)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${isOpen ? 'bg-mit-blue text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {period === 'Annual' ? 'AN' : period}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">{PERIOD_LABELS[period]}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {rows.length === 0 ? 'No submissions' : `${rows.length} submission${rows.length !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sc.approved  > 0 && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">{sc.approved} approved</span>}
                  {sc.submitted > 0 && <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">{sc.submitted} submitted</span>}
                  {sc.draft     > 0 && <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2 py-0.5 rounded-full">{sc.draft} draft</span>}
                  {sc.rejected  > 0 && <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">{sc.rejected} rejected</span>}
                  <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isOpen && (
                <div className="border-t overflow-x-auto">
                  {rows.length === 0 ? (
                    <div className="px-5 py-6 text-center text-gray-400 text-sm">No submissions for {period}</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Indicator</th>
                          <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Institution</th>
                          <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs hidden md:table-cell">Department / Unit</th>
                          <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">Value</th>
                          <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Status</th>
                          <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs hidden lg:table-cell">Submitted By</th>
                          <th className="px-4 py-2.5 text-[10px] font-normal text-gray-400 text-right">Click row to review</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {rows.map(a => (
                          <tr
                            key={a.id}
                            onClick={() => setViewTarget(a)}
                            className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                          >
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-gray-900 truncate max-w-xs text-xs group-hover:text-mit-blue transition-colors">{a.indicator?.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{a.indicator?.code}</p>
                            </td>
                            <td className="px-4 py-2.5 text-gray-600 text-xs">{a.institution?.name}</td>
                            <td className="px-4 py-2.5 text-xs text-gray-500 hidden md:table-cell">
                              {a.department ? (
                                <div>
                                  <div className="font-medium text-gray-700">{a.department.name}</div>
                                  {a.unit && <div className="text-gray-400">{a.unit.name}</div>}
                                </div>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900 text-xs">
                              {a.actualValue?.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">{a.indicator?.unit}</span>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <StatusBadge status={a.status} />
                                {a.status === 'approved' && <LockClosedIcon className="w-3 h-3 text-green-400" title="Approved & locked" />}
                                {a.attachments?.length > 0 && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-blue-500">
                                    <PaperClipIcon className="w-3 h-3" />{a.attachments.length}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 text-xs hidden lg:table-cell">{a.submittedBy?.name}</td>
                            <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-mit-blue font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                  <EyeIcon className="w-3 h-3" /> Review
                                </span>
                                {canApprove && a.status === 'submitted' && (
                                  <>
                                    <button
                                      onClick={() => approveMutation.mutate(a.id)}
                                      className="text-xs text-green-600 hover:underline font-medium"
                                    >Approve</button>
                                    <button
                                      onClick={() => setRejectTarget(a)}
                                      className="text-xs text-red-500 hover:underline font-medium"
                                    >Reject</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {viewTarget   && <DetailModal   actual={viewTarget}   onClose={() => setViewTarget(null)} />}
      {rejectTarget && <RejectModal   actual={rejectTarget} onClose={() => setRejectTarget(null)}
        onConfirm={(remarks) => rejectMutation.mutate({ id: rejectTarget.id, remarks })}
        isPending={rejectMutation.isPending} />}
    </div>
  );
}

// ── Tracking Tab ───────────────────────────────────────────────────────────────
function TrackingTab() {
  const [period, setPeriod] = useState('');
  const [view, setView]     = useState('institution');
  const [expandedDepts, setExpandedDepts] = useState({});

  const { data: tracking, isLoading } = useQuery({
    queryKey: ['tracking', FISCAL_YEAR, period],
    queryFn: () => dataEntryApi.tracking({ fiscalYear: FISCAL_YEAR, period: period || undefined }).then(r => r.data),
  });

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select className="input max-w-[160px]" value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="">All Periods</option>
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button onClick={() => setView('institution')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'institution' ? 'bg-mit-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <BuildingOfficeIcon className="w-4 h-4" /> Institutions
          </button>
          <button onClick={() => setView('department')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'department' ? 'bg-mit-blue text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <ChartBarIcon className="w-4 h-4" /> Departments &amp; Units
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading tracking data…</div>
      ) : view === 'institution' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(tracking?.institutions || []).map(inst => (
            <div key={inst.id} className="card flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800 text-sm">{inst.code}</span>
                {inst.completionPct === 100
                  ? <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  : inst.total === 0
                  ? <ClockIcon className="w-5 h-5 text-gray-300" />
                  : <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />}
              </div>
              <p className="text-xs text-gray-500 -mt-1 line-clamp-1">{inst.name}</p>
              <CompletionBar pct={inst.completionPct} />
              <div className="flex flex-wrap gap-1">
                <StatusPill count={inst.approved}  label="approved"  color="green" />
                <StatusPill count={inst.submitted} label="submitted" color="blue"  />
                <StatusPill count={inst.draft}     label="draft"     color="gray"  />
                <StatusPill count={inst.rejected}  label="rejected"  color="red"   />
              </div>
              {inst.total === 0 && <p className="text-[10px] text-gray-400 italic">No data submitted yet</p>}
              {inst.lastSubmittedAt && (
                <p className="text-[10px] text-gray-400 border-t pt-1.5">
                  Last submission: <span className="font-medium text-gray-600">{formatDate(inst.lastSubmittedAt)}</span>
                  {inst.lastSubmittedBy && <> by <span className="font-medium text-gray-600">{inst.lastSubmittedBy}</span></>}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(tracking?.departments || []).map(dept => (
            <div key={dept.id} className="border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                onClick={() => setExpandedDepts(e => ({ ...e, [dept.id]: !e[dept.id] }))}
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800 text-sm">{dept.name}</span>
                  <span className="text-xs text-gray-400">{dept.code}</span>
                </div>
                <div className="flex items-center gap-4">
                  <CompletionBar pct={dept.completionPct} />
                  <div className="flex gap-1">
                    <StatusPill count={dept.approved}  label="✓" color="green" />
                    <StatusPill count={dept.submitted} label="↑" color="blue"  />
                    <StatusPill count={dept.rejected}  label="✗" color="red"   />
                  </div>
                  <span className="text-gray-400 text-xs">{expandedDepts[dept.id] ? '▲' : '▼'}</span>
                </div>
              </button>
              {dept.total === 0 && !expandedDepts[dept.id] && (
                <div className="px-4 py-2 text-xs text-gray-400 italic bg-white border-t">No data submitted yet for this department</div>
              )}
              {expandedDepts[dept.id] && dept.units?.length > 0 && (
                <div className="divide-y bg-white">
                  {dept.units.map(unit => (
                    <div key={unit.id} className="px-6 py-3 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-medium text-gray-700">{unit.name}</span>
                        <span className="ml-2 text-[10px] text-gray-400">{unit.code}</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <CompletionBar pct={unit.completionPct} />
                        <div className="flex gap-1">
                          <StatusPill count={unit.approved}  label="✓" color="green" />
                          <StatusPill count={unit.submitted} label="↑" color="blue"  />
                          <StatusPill count={unit.rejected}  label="✗" color="red"   />
                        </div>
                        {unit.total === 0 && <span className="text-[10px] text-gray-400 italic">No data</span>}
                        {unit.lastSubmittedAt && (
                          <span className="text-[10px] text-gray-400 hidden lg:inline">{formatDate(unit.lastSubmittedAt)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(tracking?.departments || []).length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm">No department data configured yet.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bulk Import Tab ────────────────────────────────────────────────────────────
function BulkImportTab() {
  const [file,       setFile]       = useState(null);
  const [step,       setStep]       = useState('upload'); // 'upload' | 'preview' | 'result'
  const [previewing, setPreviewing] = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [preview,    setPreview]    = useState(null);
  const [result,     setResult]     = useState(null);
  const fileRef = useRef();

  const downloadTemplate = async () => {
    try {
      const res = await dataEntryApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href = url; a.download = 'MIT_MES_Import_Template.xlsx';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch { toast.error('Download failed'); }
  };

  const handlePreview = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setPreviewing(true);
    try {
      const res = await dataEntryApi.previewImport(fd);
      setPreview(res.data);
      setStep('preview');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Preview failed');
    } finally { setPreviewing(false); }
  };

  const handleImport = async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setImporting(true);
    try {
      const res = await dataEntryApi.bulkImport(fd);
      setResult(res.data);
      setStep('result');
      if (res.data.imported > 0) toast.success(`${res.data.imported} record${res.data.imported !== 1 ? 's' : ''} imported`);
      if (res.data.skipped  > 0) toast.error(`${res.data.skipped} row${res.data.skipped !== 1 ? 's' : ''} skipped`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Import failed');
    } finally { setImporting(false); }
  };

  const reset = () => { setFile(null); setStep('upload'); setPreview(null); setResult(null); };

  // ── Result ──────────────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    const hasErrors = result.errors?.length > 0;
    return (
      <div className="space-y-4 max-w-2xl">
        <div className={`rounded-xl border p-5 ${hasErrors ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-start gap-3 mb-3">
            {hasErrors
              ? <ExclamationCircleIcon className="w-7 h-7 text-amber-500 shrink-0" />
              : <CheckCircleIcon       className="w-7 h-7 text-green-500 shrink-0" />}
            <div>
              <p className="font-bold text-gray-900">{result.message}</p>
              <div className="flex gap-4 mt-1 text-sm">
                <span className="text-green-700 font-semibold">{result.imported} imported</span>
                {result.skipped > 0 && <span className="text-amber-700 font-semibold">{result.skipped} skipped</span>}
              </div>
            </div>
          </div>
          {hasErrors && (
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-2">Skipped rows ({result.errors.length}):</p>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-amber-200 bg-white p-2 space-y-1">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex gap-3 text-xs py-1 border-b border-gray-50 last:border-0">
                    <span className="font-mono text-amber-600 w-14 shrink-0">Row {e.row}</span>
                    <span className="text-gray-600">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={reset} className="btn-secondary">Import Another File</button>
      </div>
    );
  }

  // ── Preview ─────────────────────────────────────────────────────────────────
  if (step === 'preview' && preview) {
    const readyRows = preview.rows.filter(r => r.status === 'ready');
    const errorRows = preview.rows.filter(r => r.status === 'error');
    const trunc = (str, n) => str && str.length > n ? str.slice(0, n) + '…' : (str || '');
    return (
      <div className="space-y-4">
        {/* Summary banner */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div>
            <h3 className="font-bold text-gray-900">Import Preview</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {preview.total} rows analysed from <span className="font-medium text-gray-700">{file?.name}</span>
            </p>
          </div>
          <div className="flex gap-3">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
              readyRows.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <CheckCircleIcon className="w-4 h-4" /> {readyRows.length} ready
            </span>
            {errorRows.length > 0 && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-100 text-red-700">
                <ExclamationCircleIcon className="w-4 h-4" /> {errorRows.length} errors
              </span>
            )}
          </div>
        </div>

        {/* Rows table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: '460px', overflowY: 'auto' }}>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-200" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600 w-10">#</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Indicator</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Results Framework Chain</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Responsible Owner</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Institution</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Period / FY</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-gray-600">Value</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {preview.rows.map(row => (
                  <tr key={row.rowNum} className={row.status === 'error' ? 'bg-red-50/60' : 'hover:bg-gray-50 transition-colors'}>
                    {/* Row # */}
                    <td className="px-3 py-2.5 text-gray-400 font-mono">{row.rowNum}</td>

                    {/* Indicator */}
                    <td className="px-3 py-2.5 max-w-[180px]">
                      {row.indicator ? (
                        <div>
                          <p className="font-semibold text-gray-900 leading-snug">{trunc(row.indicator.name, 50)}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{row.indicator.code}</p>
                          {row.indicator.unit && (
                            <p className="text-[10px] text-blue-500 mt-0.5">Unit: {row.indicator.unit}</p>
                          )}
                        </div>
                      ) : (
                        <span className="font-mono text-red-500">{row.indicatorCode || <em className="text-gray-400">Missing</em>}</span>
                      )}
                    </td>

                    {/* RF Chain */}
                    <td className="px-3 py-2.5 max-w-[220px]">
                      {row.chain ? (
                        <div className="space-y-0.5">
                          {row.chain.objective && (
                            <p className="text-[10px]">
                              <span className="text-gray-400">Obj: </span>
                              <span className="text-purple-700 font-medium">{trunc(row.chain.objective, 45)}</span>
                            </p>
                          )}
                          {row.chain.outcome && (
                            <p className="text-[10px]">
                              <span className="text-gray-400">Outcome: </span>
                              <span className="text-blue-700">{trunc(row.chain.outcome, 45)}</span>
                            </p>
                          )}
                          {row.chain.output && (
                            <p className="text-[10px]">
                              <span className="text-gray-400">Output: </span>
                              <span className="text-teal-700">{trunc(row.chain.output, 45)}</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Responsible owner */}
                    <td className="px-3 py-2.5">
                      {row.owner ? (
                        <div>
                          <p className="font-medium text-gray-700 text-[11px]">{row.owner.code || row.owner.name}</p>
                          <p className="text-[10px] text-gray-400">{row.owner.type}</p>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Reporting institution */}
                    <td className="px-3 py-2.5">
                      {row.institution ? (
                        <span className="font-mono text-gray-700 text-[11px]">{row.institution.code}</span>
                      ) : (
                        <span className="text-gray-400 font-mono text-[10px]">{row.institutionCode || '—'}</span>
                      )}
                    </td>

                    {/* Period / FY */}
                    <td className="px-3 py-2.5">
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-700">{row.period || '—'}</span>
                      {row.fiscalYear && <p className="text-[10px] text-gray-400 mt-0.5">{row.fiscalYear}</p>}
                    </td>

                    {/* Value */}
                    <td className="px-3 py-2.5 text-right">
                      <span className="font-bold text-gray-900">{row.value?.toLocaleString() ?? '—'}</span>
                      {row.indicator?.unit && <span className="text-gray-400 ml-1">{row.indicator.unit}</span>}
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5">
                      {row.status === 'ready' ? (
                        <span className="flex items-center gap-1 text-green-700 font-semibold">
                          <CheckCircleIcon className="w-3.5 h-3.5" /> Ready
                        </span>
                      ) : (
                        <div>
                          <span className="flex items-center gap-1 text-red-700 font-semibold">
                            <ExclamationCircleIcon className="w-3.5 h-3.5" /> Error
                          </span>
                          <ul className="mt-1 space-y-0.5">
                            {row.errors.map((e, i) => (
                              <li key={i} className="text-[10px] text-red-500 leading-snug">{e}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {readyRows.length > 0 && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 text-sm transition-colors"
            >
              <ArrowUpTrayIcon className="w-4 h-4" />
              {importing ? 'Importing…' : `Import ${readyRows.length} Ready Row${readyRows.length !== 1 ? 's' : ''}`}
            </button>
          )}
          <button onClick={reset} className="btn-secondary">Change File</button>
          {errorRows.length > 0 && readyRows.length === 0 && (
            <p className="text-sm text-red-600 font-medium ml-2">All rows have errors — fix your file and re-upload.</p>
          )}
          {errorRows.length > 0 && readyRows.length > 0 && (
            <p className="text-xs text-amber-600 ml-2">{errorRows.length} error row{errorRows.length !== 1 ? 's' : ''} will be skipped automatically.</p>
          )}
        </div>
      </div>
    );
  }

  // ── Upload (step 1) ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-3xl">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <SparklesIcon className="w-4 h-4" /> Smart Bulk Import
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-sm text-blue-700">
          <li>Download the Excel template and fill in your activity data</li>
          <li>Required columns:
            {['indicatorCode', 'institutionCode', 'fiscalYear', 'period', 'value'].map(c => (
              <code key={c} className="bg-blue-100 rounded px-1 mx-0.5 text-xs">{c}</code>
            ))}
          </li>
          <li>Valid periods: <strong>Q1, Q2, Q3, Q4, Annual</strong> · Fiscal year format: <strong>2025-2026</strong></li>
          <li>Click <strong>Analyse File</strong> — the system maps each row to its Results Framework chain before you commit</li>
        </ol>
        <button
          onClick={downloadTemplate}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <ArrowDownTrayIcon className="w-4 h-4" /> Download Excel Template
        </button>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none ${
          file
            ? 'border-green-400 bg-green-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/40'
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f) setFile(f);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={e => { setFile(e.target.files[0]); e.target.value = ''; }}
        />
        {file ? (
          <div className="flex items-center justify-center gap-4">
            <CheckCircleIcon className="w-9 h-9 text-green-500 shrink-0" />
            <div className="text-left">
              <p className="font-semibold text-green-700">{file.name}</p>
              <p className="text-xs text-green-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB · Ready to analyse</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setFile(null); }}
              className="ml-4 text-xs text-red-500 hover:text-red-700 underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <DocumentArrowUpIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600">Drop your Excel or CSV file here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Supported: .xlsx · .xls · .csv · Max 500 rows · 5 MB</p>
          </>
        )}
      </div>

      {file && (
        <button
          onClick={handlePreview}
          disabled={previewing}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors"
        >
          <SparklesIcon className="w-5 h-5" />
          {previewing ? 'Analysing…' : 'Analyse File'}
        </button>
      )}
    </div>
  );
}

// ══ Main Page ══════════════════════════════════════════════════════════════════
export default function DataEntryPage() {
  const user   = useAuthStore(s => s.user);
  const isAdmin = ['super_admin', 'me_officer', 'admin'].includes(user?.role);

  // Reviewers default to the Review tab; others to Submissions
  const [tab, setTab] = useState(isAdmin ? 'review' : 'submissions');

  const tabs = [
    { key: 'submissions', label: 'My Submissions' },
    ...(isAdmin ? [{ key: 'review', label: 'Review & Approve', badge: true }] : []),
    { key: 'tracking',   label: 'Submission Tracking' },
    { key: 'import',     label: 'Bulk Import' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Submissions</h1>
          <p className="text-gray-500 text-sm">FY {FISCAL_YEAR} · Record and monitor implemented activities</p>
        </div>
        <a href="/data-entry/submit" className="btn-primary">+ Submit Activity</a>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-mit-blue text-mit-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.badge && t.key === 'review' && (
              <ShieldCheckIcon className="w-4 h-4 text-amber-500" />
            )}
          </button>
        ))}
      </div>

      {tab === 'submissions' && <SubmissionsTab />}
      {tab === 'review'      && <ReviewTab />}
      {tab === 'tracking'    && <TrackingTab />}
      {tab === 'import'      && <BulkImportTab />}
    </div>
  );
}
