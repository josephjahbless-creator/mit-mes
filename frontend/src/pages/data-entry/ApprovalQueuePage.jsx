import { useState, Fragment } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  ArrowPathIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import { dataEntryApi, institutionsApi } from '../../api';
import api from '../../api/client';
import useAuthStore from '../../store/authStore';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

// ── Direct API calls for review actions ───────────────────────────────────────
const supervisorReview = (id, data) =>
  api.patch(`/data-entry/actuals/${id}/supervisor-review`, data);
const meReview = (id, data) =>
  api.patch(`/data-entry/actuals/${id}/me-review`, data);

// ── Helpers ───────────────────────────────────────────────────────────────────
const FISCAL_YEARS = ['2023/2024', '2024/2025', '2025/2026'];
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

const STATUS_CONFIG = {
  submitted:          { cls: 'badge-yellow',  label: 'Submitted' },
  pending_supervisor: { cls: 'badge bg-orange-100 text-orange-700', label: 'Pending Supervisor' },
  pending_me:         { cls: 'badge bg-purple-100 text-purple-700', label: 'Pending M&E' },
  approved:           { cls: 'badge-green',   label: 'Approved' },
  rejected:           { cls: 'badge-red',     label: 'Rejected' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { cls: 'badge-gray', label: status };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

function formatDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Action Modal ──────────────────────────────────────────────────────────────
function ActionModal({ action, onConfirm, onCancel, isPending }) {
  const [note, setNote] = useState('');
  const isApprove = action === 'approve' || action === 'final_approve';
  const label = isApprove ? 'Approve' : 'Reject';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-1">
          {isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {isApprove
            ? 'You may add an optional remark before approving.'
            : 'Please provide a reason for rejection.'}
        </p>

        <label className="label">
          {isApprove ? 'Remark (optional)' : 'Reason for rejection *'}
        </label>
        <textarea
          className="input min-h-[80px] resize-none"
          placeholder={isApprove ? 'Add a remark…' : 'Explain why this is being rejected…'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          autoFocus
        />

        {!isApprove && !note.trim() && (
          <p className="mt-1 text-xs text-red-500">A reason is required for rejection.</p>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={isPending}>
            Cancel
          </button>
          <button
            type="button"
            disabled={isPending || (!isApprove && !note.trim())}
            onClick={() => onConfirm(note)}
            className={isApprove ? 'btn-primary' : 'btn btn-danger'}
          >
            {isPending ? 'Processing…' : label}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApprovalQueuePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const role = user?.role ?? '';
  const isSupervisor = role === 'admin' || role === 'supervisor';
  const isMEOfficer  = role === 'me_officer' || role === 'super_admin';

  // Pending status based on role
  const pendingStatus = isMEOfficer ? 'pending_me' : 'submitted';

  // Filters
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [period, setPeriod]         = useState('');
  const [institutionId, setInstitutionId] = useState('');

  // Modal state
  const [modal, setModal] = useState(null); // { rowId, action: 'approve'|'reject'|'final_approve'|'final_reject' }

  // ── Queries ──────────────────────────────────────────────────────────────────
  const pendingQuery = useQuery({
    queryKey: ['approval-queue', 'pending', pendingStatus, fiscalYear, period, institutionId],
    queryFn: () =>
      dataEntryApi.listActuals({
        status: pendingStatus,
        fiscalYear,
        ...(period && { period }),
        ...(institutionId && { institutionId }),
      }).then((r) => r.data),
  });

  const historyQuery = useQuery({
    queryKey: ['approval-queue', 'history', fiscalYear, period, institutionId],
    queryFn: () =>
      dataEntryApi.listActuals({
        status: isMEOfficer ? 'approved' : 'pending_me',
        fiscalYear,
        ...(period && { period }),
        ...(institutionId && { institutionId }),
        limit: 20,
      }).then((r) => r.data),
  });

  const institutionsQuery = useQuery({
    queryKey: ['institutions-list'],
    queryFn: () => institutionsApi.list().then((r) => r.data),
    enabled: isMEOfficer,
  });

  // Stats
  const pending    = pendingQuery.data?.actuals ?? pendingQuery.data?.data ?? [];
  const history    = historyQuery.data?.actuals ?? historyQuery.data?.data ?? [];
  const institutions = institutionsQuery.data?.institutions ?? institutionsQuery.data ?? [];

  const approvedToday = history.filter((h) => {
    const d = h.supervisedAt ?? h.approvedAt ?? h.updatedAt;
    if (!d) return false;
    return new Date(d).toDateString() === new Date().toDateString();
  }).length;

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: ({ id, action, note }) => {
      if (isMEOfficer) {
        return meReview(id, {
          action: action === 'final_approve' ? 'approve' : 'reject',
          remarks: note,
        });
      }
      return supervisorReview(id, {
        action: action === 'approve' ? 'approve' : 'reject',
        supervisorNote: note,
      });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
      setModal(null);
      const isApprove = action === 'approve' || action === 'final_approve';
      toast.success(isApprove ? 'Submission approved successfully' : 'Submission rejected');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message ?? 'Action failed. Please try again.';
      toast.error(msg);
    },
  });

  function openModal(rowId, action) {
    setModal({ rowId, action });
  }

  function handleConfirm(note) {
    reviewMutation.mutate({ id: modal.rowId, action: modal.action, note });
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Review and action data submissions
          {isMEOfficer ? ' — M&E final review' : ' — Supervisor review'}
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card !p-4 flex items-center gap-3">
          <ClockIcon className="w-8 h-8 text-yellow-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{pending.length}</p>
            <p className="text-xs text-gray-500">Pending action</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <CheckCircleIcon className="w-8 h-8 text-green-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{approvedToday}</p>
            <p className="text-xs text-gray-500">Approved today</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
          <InboxIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
          <div>
            <p className="text-2xl font-bold text-gray-900">{history.length}</p>
            <p className="text-xs text-gray-500">
              {isMEOfficer ? 'Approved (history)' : 'Forwarded to M&E'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card !p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FunnelIcon className="w-4 h-4 text-gray-400 self-center" />

          <div>
            <label className="label">Fiscal Year</label>
            <select
              className="input w-36"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
            >
              {FISCAL_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Period</label>
            <select
              className="input w-28"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="">All</option>
              {PERIODS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {isMEOfficer && (
            <div>
              <label className="label">Institution</label>
              <select
                className="input w-48"
                value={institutionId}
                onChange={(e) => setInstitutionId(e.target.value)}
              >
                <option value="">All institutions</option>
                {institutions.map((inst) => (
                  <option key={inst.id ?? inst._id} value={inst.id ?? inst._id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            className="btn-secondary ml-auto"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['approval-queue'] });
            }}
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Pending table */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Pending {isMEOfficer ? 'M&E Review' : 'Supervisor Review'}
        </h2>
        <SubmissionsTable
          rows={pending}
          isLoading={pendingQuery.isLoading}
          isError={pendingQuery.isError}
          role={role}
          isSupervisor={isSupervisor}
          isMEOfficer={isMEOfficer}
          onAction={openModal}
        />
      </section>

      {/* History table */}
      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Recent History
        </h2>
        <SubmissionsTable
          rows={history}
          isLoading={historyQuery.isLoading}
          isError={historyQuery.isError}
          role={role}
          isSupervisor={isSupervisor}
          isMEOfficer={isMEOfficer}
          readOnly
        />
      </section>

      {/* Action modal */}
      {modal && (
        <ActionModal
          action={modal.action}
          onConfirm={handleConfirm}
          onCancel={() => setModal(null)}
          isPending={reviewMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Submissions Table ─────────────────────────────────────────────────────────
function SubmissionsTable({
  rows, isLoading, isError, isSupervisor, isMEOfficer, readOnly = false, onAction,
}) {
  if (isLoading) {
    return (
      <div className="card flex items-center justify-center py-16 text-gray-400 text-sm">
        <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card flex items-center justify-center py-16 text-red-500 text-sm gap-2">
        <XCircleIcon className="w-5 h-5" /> Failed to load submissions.
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-gray-400">
        <InboxIcon className="w-10 h-10 mb-2" />
        <p className="text-sm">No submissions found</p>
      </div>
    );
  }

  return (
    <div className="card !p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {[
                'Indicator', 'Institution', 'Period',
                'Value', 'Submitted By', 'Submitted At', 'Status',
                ...(!readOnly ? ['Actions'] : []),
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => {
              const id = row.id ?? row._id;
              const indicatorName =
                row.indicator?.name ?? row.indicatorName ?? '—';
              const institutionName =
                row.institution?.name ?? row.institutionName ?? '—';
              const submittedBy =
                row.submittedBy?.name ?? row.submittedByName ?? '—';
              const submittedAt = row.submittedAt ?? row.createdAt;

              return (
                <tr key={id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">
                    {indicatorName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {institutionName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {row.period} {row.fiscalYear ? `(${row.fiscalYear})` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium whitespace-nowrap">
                    {row.value ?? row.actualValue ?? '—'}
                    {row.unit ? ` ${row.unit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {submittedBy}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {submittedAt
                      ? new Date(submittedAt).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={row.status} />
                  </td>

                  {!readOnly && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isMEOfficer ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary !py-1 !px-3 !text-xs"
                              onClick={() => onAction(id, 'final_approve')}
                            >
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              Final Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger !py-1 !px-3 !text-xs"
                              onClick={() => onAction(id, 'final_reject')}
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary !py-1 !px-3 !text-xs"
                              onClick={() => onAction(id, 'approve')}
                            >
                              <CheckCircleIcon className="w-3.5 h-3.5" />
                              Approve → M&amp;E
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger !py-1 !px-3 !text-xs"
                              onClick={() => onAction(id, 'reject')}
                            >
                              <XCircleIcon className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
