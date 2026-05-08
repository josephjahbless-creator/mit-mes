import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircleIcon, XCircleIcon, ClockIcon, UserPlusIcon,
  BuildingOfficeIcon, EnvelopeIcon, EyeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { userRequestsApi, institutionsApi } from '../../api';
import api from '../../api/client';
import { useSocketEvent } from '../../hooks/useSocket';

const ROLE_LABELS = {
  data_collector: 'Data Collector',
  viewer:         'Viewer',
  me_officer:     'M&E Officer',
};

function nameToMitEmail(name) {
  const parts = (name || '').trim().toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.join('.') + '@mit.go.tz' : '';
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
  approved: { label: 'Approved', color: 'bg-green-100 text-green-800',   icon: CheckCircleIcon },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800',       icon: XCircleIcon },
};

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Approve modal ─────────────────────────────────────────────────────────────
function ApproveModal({ request, onClose, onApproved }) {
  const [password, setPassword]       = useState('');
  const [institutionId, setInst]      = useState('');
  const [departmentId, setDept]       = useState('');
  const [unitId, setUnit]             = useState('');
  const [submitting, setSubmitting]   = useState(false);

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });
  const { data: units = [] } = useQuery({
    queryKey: ['units', departmentId],
    queryFn: () => api.get(`/departments/${departmentId}/units`).then(r => r.data),
    enabled: !!departmentId,
  });

  async function handleApprove() {
    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    setSubmitting(true);
    try {
      await userRequestsApi.approve(request.id, {
        password,
        institutionId: institutionId || undefined,
        departmentId:  departmentId  || undefined,
        unitId:        unitId        || undefined,
      });
      toast.success(`Account created for ${request.name}`);
      onApproved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create account');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Approve & Create Account</h3>
        <p className="text-sm text-gray-500 mb-2">
          Creating account for <strong>{request.name}</strong> as <strong>{ROLE_LABELS[request.role] || request.role}</strong>.
        </p>

        {/* MIT email preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4">
          <p className="text-xs text-blue-600 font-medium mb-0.5">System login email (auto-generated)</p>
          <p className="text-sm font-bold text-blue-800">{nameToMitEmail(request.name)}</p>
          <p className="text-xs text-blue-500 mt-0.5">Credentials will be sent to: {request.email}</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">Initial Password *</label>
            <input
              type="password"
              className="input"
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">The user should change this on first login.</p>
          </div>

          <div>
            <label className="label">Assign Institution</label>
            <select className="input" value={institutionId} onChange={e => setInst(e.target.value)}>
              <option value="">— None —</option>
              {institutions.map(i => (
                <option key={i.id} value={i.id}>{i.code} – {i.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Assign Department</label>
            <select className="input" value={departmentId} onChange={e => { setDept(e.target.value); setUnit(''); }}>
              <option value="">— None —</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.code} – {d.name}</option>
              ))}
            </select>
          </div>

          {departmentId && (
            <div>
              <label className="label">Assign Unit</label>
              <select className="input" value={unitId} onChange={e => setUnit(e.target.value)}>
                <option value="">— None —</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.code} – {u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 btn-secondary justify-center" disabled={submitting}>Cancel</button>
          <button onClick={handleApprove} className="flex-1 btn-primary justify-center" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────
function RejectModal({ request, onClose, onRejected }) {
  const [reason, setReason]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleReject() {
    setSubmitting(true);
    try {
      await userRequestsApi.reject(request.id, { reason });
      toast.success('Request rejected');
      onRejected();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject request');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Reject Request</h3>
        <p className="text-sm text-gray-500 mb-4">
          Rejecting account request from <strong>{request.name}</strong>.
        </p>
        <div>
          <label className="label">Reason (optional)</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Briefly explain why this request is being rejected..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 btn-secondary justify-center" disabled={submitting}>Cancel</button>
          <button
            onClick={handleReject}
            className="flex-1 justify-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserRequestsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget]   = useState(null);
  const [detailTarget, setDetailTarget]   = useState(null);

  // Auto-refresh when a new request comes in via socket
  useSocketEvent('notification:new', () => {
    qc.invalidateQueries({ queryKey: ['user-requests'] });
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['user-requests', statusFilter],
    queryFn: () => userRequestsApi.list({ status: statusFilter || undefined }).then(r => r.data),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ['user-requests'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  }

  const pending  = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {approveTarget && (
        <ApproveModal
          request={approveTarget}
          onClose={() => setApproveTarget(null)}
          onApproved={refresh}
        />
      )}
      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={refresh}
        />
      )}
      {detailTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Details</h3>
            <dl className="space-y-3 text-sm">
              {[
                ['Name', detailTarget.name],
                ['Email', detailTarget.email],
                ['Institution', detailTarget.institution],
                ['Role Requested', ROLE_LABELS[detailTarget.role] || detailTarget.role],
                ['Reason', detailTarget.reason || '—'],
                ['Submitted', new Date(detailTarget.createdAt).toLocaleString()],
                ...(detailTarget.status !== 'pending' ? [
                  ['Reviewed By', detailTarget.reviewedBy?.name || '—'],
                  ['Reviewed At', detailTarget.reviewedAt ? new Date(detailTarget.reviewedAt).toLocaleString() : '—'],
                  ...(detailTarget.rejectionReason ? [['Rejection Reason', detailTarget.rejectionReason]] : []),
                ] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-gray-500 w-36 flex-shrink-0">{k}</dt>
                  <dd className="text-gray-900 font-medium break-all">{v}</dd>
                </div>
              ))}
            </dl>
            <button onClick={() => setDetailTarget(null)} className="mt-5 btn-secondary w-full justify-center">Close</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Review and action user access requests from the login page</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending Review', count: pending,  color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
          { label: 'Approved',       count: approved, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
          { label: 'Rejected',       count: rejected, color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200'  },
        ].map(c => (
          <div key={c.label} className={`card p-4 border ${c.border} ${c.bg}`}>
            <p className={`text-2xl font-bold ${c.color}`}>{c.count}</p>
            <p className="text-xs text-gray-600 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { value: 'pending',  label: 'Pending'  },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: '',         label: 'All'      },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Loading…</div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center">
            <UserPlusIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No {statusFilter || ''} requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Institution</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role Requested</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Submitted</th>
                  <th className="px-4 py-3 w-36"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map(r => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                  const Icon = cfg.icon;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.email}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate" title={r.institution}>
                        <span className="flex items-center gap-1">
                          <BuildingOfficeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          {r.institution}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-blue">{ROLE_LABELS[r.role] || r.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDetailTarget(r)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            title="View details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          {r.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setApproveTarget(r)}
                                className="text-green-500 hover:text-green-700 text-xs font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectTarget(r)}
                                className="text-red-400 hover:text-red-600 text-xs font-medium"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
