import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  PlusIcon, CheckCircleIcon, ClockIcon, EyeIcon,
  CheckBadgeIcon, ChevronDownIcon, ChevronRightIcon,
  XMarkIcon, CameraIcon,
} from '@heroicons/react/24/outline';
import { frameworkVersionsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import { getCurrentFiscalYear, getFiscalYearOptions } from '../../utils/fiscalYear';

const FY_OPTIONS = getFiscalYearOptions();

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        <CheckCircleIcon className="w-3.5 h-3.5" /> Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
      <ClockIcon className="w-3.5 h-3.5" /> Pending
    </span>
  );
}

// ── Snapshot Tree viewer ──────────────────────────────────────────────────────
function TreeNode({ label, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const hasChildren = children && (Array.isArray(children) ? children.length > 0 : true);

  return (
    <div className="ml-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-blue-700 py-0.5 w-full text-left"
        disabled={!hasChildren}
      >
        {hasChildren
          ? open ? <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                 : <ChevronRightIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
          : <span className="w-3.5 h-3.5 flex-shrink-0" />
        }
        <span>{label}</span>
      </button>
      {open && hasChildren && <div className="ml-4 border-l border-gray-200 pl-2">{children}</div>}
    </div>
  );
}

function SnapshotTree({ snapshot }) {
  if (!snapshot) {
    return <p className="text-gray-400 text-sm text-center py-6">No snapshot data available.</p>;
  }

  // snapshot may be already-parsed object or raw JSON string
  const data = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
  const objectives = data?.objectives ?? data ?? [];

  if (!Array.isArray(objectives) || objectives.length === 0) {
    return (
      <div className="text-sm text-gray-500 space-y-1">
        <p>Raw snapshot (no structured objectives found):</p>
        <pre className="bg-gray-50 rounded p-3 text-xs overflow-auto max-h-64">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-sm">
      {objectives.map((obj, oi) => (
        <TreeNode
          key={obj.id ?? oi}
          label={
            <span>
              <span className="font-semibold text-blue-800">{obj.code ? `[${obj.code}] ` : ''}</span>
              {obj.name ?? obj.title ?? 'Objective'}
              <span className="ml-2 text-xs text-gray-400">({(obj.outcomes ?? []).length} outcomes)</span>
            </span>
          }
          defaultOpen={oi === 0}
        >
          {(obj.outcomes ?? []).map((oc, oci) => (
            <TreeNode
              key={oc.id ?? oci}
              label={
                <span>
                  <span className="text-teal-700 font-medium">Outcome: </span>
                  {oc.name ?? oc.title}
                  <span className="ml-2 text-xs text-gray-400">({(oc.outputs ?? []).length} outputs)</span>
                </span>
              }
            >
              {(oc.outputs ?? []).map((op, opi) => (
                <TreeNode
                  key={op.id ?? opi}
                  label={
                    <span>
                      <span className="text-indigo-700 font-medium">Output: </span>
                      {op.name ?? op.title}
                      <span className="ml-2 text-xs text-gray-400">
                        ({(op.activities ?? []).length} activities)
                      </span>
                    </span>
                  }
                >
                  {(op.activities ?? []).map((act, ai) => (
                    <div key={act.id ?? ai} className="py-0.5 pl-5 text-xs text-gray-600">
                      • {act.name ?? act.title}
                    </div>
                  ))}
                </TreeNode>
              ))}
            </TreeNode>
          ))}
        </TreeNode>
      ))}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6 z-10">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Action</h3>
        <p className="text-gray-600 text-sm mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="btn-secondary" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Snapshot Modal ────────────────────────────────────────────────────────────
function SnapshotModal({ version, onClose }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['framework-version-snapshot', version.id],
    queryFn: () => frameworkVersionsApi.snapshot(version.id).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Snapshot — {version.versionLabel}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{version.fiscalYear}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="space-y-2 animate-pulse">
              {[1,2,3,4].map(i => <div key={i} className="h-5 bg-gray-200 rounded w-3/4" />)}
            </div>
          )}
          {isError && <p className="text-red-500 text-sm">Failed to load snapshot.</p>}
          {!isLoading && !isError && (
            <SnapshotTree snapshot={data?.snapshot ?? data} />
          )}
        </div>
        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Create Snapshot Modal ─────────────────────────────────────────────────────
function CreateSnapshotModal({ onClose, onSuccess }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { fiscalYear: getCurrentFiscalYear(), versionLabel: '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: (data) => frameworkVersionsApi.create(data),
    onSuccess: () => { toast.success('Snapshot captured successfully'); onSuccess(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to capture snapshot'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Capture Framework Snapshot</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="px-6 py-5 space-y-4">
          {/* Fiscal Year */}
          <div>
            <label className="label">Fiscal Year *</label>
            <select
              {...register('fiscalYear', { required: 'Fiscal year is required' })}
              className="input w-full"
            >
              {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </select>
            {errors.fiscalYear && <p className="text-red-500 text-xs mt-1">{errors.fiscalYear.message}</p>}
          </div>

          {/* Version Label */}
          <div>
            <label className="label">Version Label *</label>
            <input
              {...register('versionLabel', {
                required: 'Version label is required',
                pattern: { value: /^v?\d+(\.\d+)*$/, message: 'Use format like v1.0 or 1.0.2' }
              })}
              placeholder="e.g. v1.0"
              className="input w-full"
            />
            {errors.versionLabel && <p className="text-red-500 text-xs mt-1">{errors.versionLabel.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Optional notes about this version..."
              className="input w-full resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={mutation.isLoading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={mutation.isLoading}>
              {mutation.isLoading ? 'Capturing...' : 'Capture Snapshot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function FrameworkVersionsPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [viewSnapshot, setViewSnapshot] = useState(null); // version object
  const [confirmApprove, setConfirmApprove] = useState(null); // version object

  const canManage = user?.role === 'super_admin' || user?.role === 'me_officer';

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['framework-versions'],
    queryFn: () => frameworkVersionsApi.list().then(r => r.data?.versions ?? r.data ?? []),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => frameworkVersionsApi.approve(id),
    onSuccess: () => {
      qc.invalidateQueries(['framework-versions']);
      toast.success('Version approved and set as active');
      setConfirmApprove(null);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to approve version'),
  });

  const versions = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Framework Versions</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage snapshots of the Results Framework for each fiscal year
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <CameraIcon className="w-4 h-4" />
            Capture Snapshot
          </button>
        )}
      </div>

      {/* Versions table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm mt-2">Loading versions...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load framework versions.</div>
        ) : versions.length === 0 ? (
          <div className="p-12 text-center">
            <CameraIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">No framework versions yet</p>
            {canManage && (
              <p className="text-gray-400 text-sm mt-1">
                Capture a snapshot of the current framework to get started.
              </p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Version</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fiscal Year</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 max-w-xs">Description</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created By</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created At</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {versions.map(v => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono font-semibold text-blue-700">{v.versionLabel}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{v.fiscalYear}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs">
                    <span className="line-clamp-2">{v.description || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{v.createdBy?.name ?? v.createdByName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.status ?? (v.isActive ? 'active' : 'pending')} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* View snapshot */}
                      <button
                        onClick={() => setViewSnapshot(v)}
                        title="View Snapshot"
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-blue-700"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>

                      {/* Approve */}
                      {canManage && !v.isActive && v.status !== 'active' && (
                        <button
                          onClick={() => setConfirmApprove(v)}
                          title="Approve & Set Active"
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-green-50 hover:text-green-700"
                        >
                          <CheckBadgeIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateSnapshotModal
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); qc.invalidateQueries(['framework-versions']); }}
        />
      )}

      {viewSnapshot && (
        <SnapshotModal version={viewSnapshot} onClose={() => setViewSnapshot(null)} />
      )}

      {confirmApprove && (
        <ConfirmDialog
          message={`This will mark version ${confirmApprove.versionLabel} as the active framework for ${confirmApprove.fiscalYear}. Any previously active version for this year will be deactivated. Continue?`}
          onConfirm={() => approveMutation.mutate(confirmApprove.id)}
          onCancel={() => setConfirmApprove(null)}
          loading={approveMutation.isLoading}
        />
      )}
    </div>
  );
}
