import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  KeyIcon, ArrowPathIcon, ClipboardDocumentIcon, TrashIcon,
  CheckCircleIcon, XCircleIcon, ClockIcon, PlusIcon,
  ArrowsRightLeftIcon, DocumentTextIcon, SignalIcon,
  ChatBubbleLeftRightIcon, PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { integrationsApi, institutionsApi, smsApi } from '../../api';
import useAuthStore from '../../store/authStore';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function syncColor(lastSync) {
  if (!lastSync) return 'text-red-500';
  const hrs = (Date.now() - new Date(lastSync)) / 3600000;
  if (hrs < 24) return 'text-green-600';
  if (hrs < 168) return 'text-amber-500';
  return 'text-red-500';
}

function StatusBadge({ ok }) {
  return ok
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircleIcon className="w-3 h-3" />Active</span>
    : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircleIcon className="w-3 h-3" />Revoked</span>;
}

function HttpBadge({ code }) {
  const ok = code < 400;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-semibold ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {code}
    </span>
  );
}

// ── Tab: Sync Status ──────────────────────────────────────────────────────────

function SyncStatusTab() {
  const { data: statuses = [], isLoading } = useQuery({
    queryKey: ['sync-status'],
    queryFn: () => integrationsApi.syncStatus().then(r => r.data),
  });

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading status…</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statuses.map(s => (
        <div key={s.institution.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{s.institution.name}</p>
              <p className="text-xs text-gray-500 font-mono">{s.institution.code}</p>
            </div>
            <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {s.activeKeys} key{s.activeKeys !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" />Last sync</span>
              <span className={`font-medium ${syncColor(s.lastSync)}`}>{s.lastSync ? formatDate(s.lastSync) : 'Never'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total requests</span>
              <span className="font-medium text-gray-700">{s.totalRequests.toLocaleString()}</span>
            </div>
            {s.successRate !== null && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-500">Success rate</span>
                  <span className={`font-medium ${s.successRate >= 90 ? 'text-green-600' : s.successRate >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                    {s.successRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${s.successRate >= 90 ? 'bg-green-500' : s.successRate >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${s.successRate}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: API Keys ─────────────────────────────────────────────────────────────

function GenerateKeyModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ institutionId: '', label: '', expiresAt: '' });
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const user = useAuthStore(s => s.user);

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
    enabled: ['super_admin', 'me_officer'].includes(user?.role),
  });

  const mutation = useMutation({
    mutationFn: (data) => integrationsApi.generateKey(data).then(r => r.data),
    onSuccess: (data) => {
      setNewKey(data.rawKey);
      onSuccess();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to generate key'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { label: form.label, expiresAt: form.expiresAt || undefined };
    if (['super_admin', 'me_officer'].includes(user?.role)) payload.institutionId = form.institutionId;
    mutation.mutate(payload);
  }

  function copyKey() {
    navigator.clipboard.writeText(newKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Key copied to clipboard');
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Generate API Key</h2>
        </div>

        {newKey ? (
          <div className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Save this key: it will not be shown again</p>
              <p className="text-xs text-amber-700">Copy and store it securely before closing this dialog.</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-gray-800 break-all">{newKey}</code>
              <button
                onClick={copyKey}
                className="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-200 transition-colors"
                title="Copy to clipboard"
              >
                <ClipboardDocumentIcon className={`w-4 h-4 ${copied ? 'text-green-600' : 'text-gray-500'}`} />
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-mit-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {['super_admin', 'me_officer'].includes(user?.role) && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Institution</label>
                <select
                  required
                  value={form.institutionId}
                  onChange={e => setForm(f => ({ ...f, institutionId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select institution…</option>
                  {institutions.filter(i => i.code !== 'MIT-HQ').map(i => (
                    <option key={i.id} value={i.id}>{i.name} ({i.code})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
              <input
                required
                type="text"
                placeholder="e.g. Production sync key"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expiry date (optional)</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={mutation.isPending} className="flex-1 py-2 bg-mit-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {mutation.isPending ? 'Generating…' : 'Generate Key'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const [showModal, setShowModal] = useState(false);
  const [instFilter, setInstFilter] = useState('');
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: ['api-keys', instFilter],
    queryFn: () => integrationsApi.listKeys(instFilter ? { institutionId: instFilter } : {}).then(r => r.data),
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
    enabled: ['super_admin', 'me_officer'].includes(user?.role),
  });

  const revokeMutation = useMutation({
    mutationFn: (id) => integrationsApi.revokeKey(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('Key revoked'); },
    onError: () => toast.error('Failed to revoke key'),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id) => integrationsApi.reactivateKey(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('Key reactivated'); },
    onError: () => toast.error('Failed to reactivate key'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => integrationsApi.deleteKey(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['api-keys'] }); toast.success('Key deleted'); },
    onError: () => toast.error('Failed to delete key'),
  });

  function handleDelete(id) {
    if (window.confirm('Permanently delete this API key? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {['super_admin', 'me_officer'].includes(user?.role) && (
          <select
            value={instFilter}
            onChange={e => setInstFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All institutions</option>
            {institutions.filter(i => i.code !== 'MIT-HQ').map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-mit-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors ml-auto"
        >
          <PlusIcon className="w-4 h-4" />
          Generate New Key
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading keys…</div>
      ) : keys.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <KeyIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No API keys yet. Generate one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Institution</th>
                <th className="px-4 py-3 text-left">Label</th>
                <th className="px-4 py-3 text-left">Key Prefix</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Last Used</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {keys.map(k => (
                <tr key={k.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{k.institution?.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{k.institution?.code}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{k.label}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{k.keyPrefix}…</code>
                  </td>
                  <td className="px-4 py-3"><StatusBadge ok={k.isActive} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(k.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {k.expiresAt
                      ? <span className={new Date(k.expiresAt) < new Date() ? 'text-red-500' : ''}>{formatDate(k.expiresAt)}</span>
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(k.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {k.isActive ? (
                        <button
                          onClick={() => revokeMutation.mutate(k.id)}
                          disabled={revokeMutation.isPending}
                          title="Revoke"
                          className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => reactivateMutation.mutate(k.id)}
                          disabled={reactivateMutation.isPending}
                          title="Reactivate"
                          className="p-1.5 rounded-md text-green-600 hover:bg-green-50 transition-colors"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(k.id)}
                        disabled={deleteMutation.isPending}
                        title="Delete"
                        className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <GenerateKeyModal
          onClose={() => setShowModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['api-keys'] })}
        />
      )}
    </div>
  );
}

// ── Tab: Sync Logs ────────────────────────────────────────────────────────────

function SyncLogsTab() {
  const [instFilter, setInstFilter] = useState('');
  const user = useAuthStore(s => s.user);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['sync-logs', instFilter],
    queryFn: () => integrationsApi.listLogs(instFilter ? { institutionId: instFilter, limit: 200 } : { limit: 200 }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
    enabled: ['super_admin', 'me_officer'].includes(user?.role),
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {['super_admin', 'me_officer'].includes(user?.role) && (
          <select
            value={instFilter}
            onChange={e => setInstFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All institutions</option>
            {institutions.filter(i => i.code !== 'MIT-HQ').map(i => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
        )}
        <span className="text-xs text-gray-500 ml-auto">Auto refreshes every 30s</span>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading logs…</div>
      ) : logs.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <ArrowsRightLeftIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No sync activity yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Institution</th>
                <th className="px-4 py-3 text-left">Key</th>
                <th className="px-4 py-3 text-left">Endpoint</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Records</th>
                <th className="px-4 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(l.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800 text-xs">{l.institution?.name}</p>
                    <p className="text-xs text-gray-400 font-mono">{l.institution?.code}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-xs text-gray-700">{l.apiKey?.label}</p>
                    <code className="text-xs text-gray-400">{l.apiKey?.keyPrefix}…</code>
                  </td>
                  <td className="px-4 py-2.5"><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{l.endpoint}</code></td>
                  <td className="px-4 py-2.5"><span className="text-xs font-mono font-medium text-blue-700">{l.method}</span></td>
                  <td className="px-4 py-2.5"><HttpBadge code={l.statusCode} /></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{l.recordCount}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{l.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: API Documentation ────────────────────────────────────────────────────

function DocBlock({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function CodeBlock({ code, language = 'bash' }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Copied!');
    });
  }

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        title="Copy"
      >
        <ClipboardDocumentIcon className="w-4 h-4" />
      </button>
      <pre className="p-4 text-xs text-green-300 overflow-x-auto leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

const SUBMIT_ACTUAL_EXAMPLE = `POST /api/data-entry/actuals
X-API-Key: mit_brela_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4
Content-Type: application/json

{
  "indicatorId": "uuid-of-indicator",
  "fiscalYear": "2025-2026",
  "reportingPeriod": "Q1",
  "actualValue": 42,
  "remarks": "Quarterly update via API"
}`;

const SUBMIT_ACTUAL_RESPONSE = `HTTP/1.1 201 Created

{
  "id": "uuid",
  "indicatorId": "...",
  "institutionId": "...",
  "fiscalYear": "2025-2026",
  "reportingPeriod": "Q1",
  "actualValue": 42,
  "status": "submitted",
  "_performance": {
    "target": 50,
    "actual": 42,
    "achievementPct": 84.0,
    "status": "moderate"
  }
}`;

const CURL_EXAMPLE = `curl -X POST https://your-server/api/data-entry/actuals \\
  -H "X-API-Key: mit_brela_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4" \\
  -H "Content-Type: application/json" \\
  -d '{
    "indicatorId": "your-indicator-uuid",
    "fiscalYear": "2025-2026",
    "reportingPeriod": "Q1",
    "actualValue": 42
  }'`;

const PYTHON_EXAMPLE = `import requests

API_KEY = "mit_brela_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
BASE_URL = "https://your-server/api"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json",
}

payload = {
    "indicatorId": "your-indicator-uuid",
    "fiscalYear": "2025-2026",
    "reportingPeriod": "Q1",
    "actualValue": 42,
    "remarks": "Automated sync from MIS",
}

response = requests.post(
    f"{BASE_URL}/data-entry/actuals",
    json=payload,
    headers=headers,
)

if response.status_code == 201:
    data = response.json()
    print(f"Submitted. Achievement: {data['_performance']['achievementPct']}%")
else:
    print(f"Error {response.status_code}: {response.json()['error']}")`;

function ApiDocsTab() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Quick Reference</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-medium w-28 flex-shrink-0">Base URL</span>
            <code className="text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-xs">https://[server]/api</code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-medium w-28 flex-shrink-0">Auth Header</span>
            <code className="text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-xs">X-API-Key: &lt;your-key&gt;</code>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-medium w-28 flex-shrink-0">Content-Type</span>
            <code className="text-blue-800 bg-blue-100 px-2 py-0.5 rounded text-xs">application/json</code>
          </div>
        </div>
      </div>

      <DocBlock title="Submit Indicator Progress Data">
        <p className="text-xs text-gray-600 mb-2">Submit a progress value for an indicator. Upserts: subsequent calls for the same indicator/period overwrite the previous value.</p>
        <CodeBlock code={SUBMIT_ACTUAL_EXAMPLE} />
        <p className="text-xs text-gray-500 mt-2 mb-1 font-medium">Response (201 Created):</p>
        <CodeBlock code={SUBMIT_ACTUAL_RESPONSE} />
      </DocBlock>

      <DocBlock title="Reporting Periods">
        <p className="text-xs text-gray-600 mb-2">The <code className="bg-gray-100 px-1 rounded">reportingPeriod</code> field accepts these values:</p>
        <div className="flex flex-wrap gap-2">
          {['Q1', 'Q2', 'Q3', 'Q4', 'Annual'].map(p => (
            <code key={p} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{p}</code>
          ))}
        </div>
      </DocBlock>

      <DocBlock title="cURL Example">
        <CodeBlock code={CURL_EXAMPLE} />
      </DocBlock>

      <DocBlock title="Python Example">
        <CodeBlock code={PYTHON_EXAMPLE} language="python" />
      </DocBlock>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800">
        <p className="font-semibold mb-1">Security Notes</p>
        <ul className="list-disc list-inside space-y-1">
          <li>API keys are hashed server-side and cannot be recovered after creation.</li>
          <li>Each key is scoped to a single institution: it cannot submit data for other institutions.</li>
          <li>Revoke unused keys promptly. Set an expiry for time-limited integrations.</li>
          <li>Use HTTPS at all times. Never embed keys in client-side code or public repos.</li>
        </ul>
      </div>
    </div>
  );
}

// ── Tab: SMS ──────────────────────────────────────────────────────────────────

function SmsTab() {
  const [to, setTo]     = useState('');
  const [msg, setMsg]   = useState('');
  const [sending, setSending] = useState(false);

  const { data: cfg }  = useQuery({ queryKey: ['sms-config'], queryFn: () => smsApi.config().then(r => r.data) });
  const { data: logData, refetch } = useQuery({
    queryKey: ['sms-logs'],
    queryFn: () => smsApi.logs({ limit: 50 }).then(r => r.data),
  });
  const logs = logData?.logs ?? [];

  async function handleSend(e) {
    e.preventDefault();
    if (!to || !msg) return;
    setSending(true);
    try {
      await smsApi.send({ to, message: msg });
      toast.success('SMS sent');
      setTo(''); setMsg('');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send SMS');
    } finally { setSending(false); }
  }

  return (
    <div className="space-y-6">
      {/* Config status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${cfg?.configured ? 'bg-green-50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
        {cfg?.configured
          ? <><CheckCircleIcon className="w-4 h-4 shrink-0" /> Africa's Talking configured — username: <strong>{cfg.username}</strong></>
          : <><XCircleIcon className="w-4 h-4 shrink-0" /> SMS not configured. Set <code className="font-mono text-xs bg-amber-100 px-1 rounded">AT_API_KEY</code> and <code className="font-mono text-xs bg-amber-100 px-1 rounded">AT_USERNAME</code> env vars.</>
        }
      </div>

      {/* Send form */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <PaperAirplaneIcon className="w-4 h-4 text-blue-600" /> Send SMS
        </h3>
        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Recipient (phone with country code)</label>
            <input value={to} onChange={e => setTo(e.target.value)}
              placeholder="+255712345678"
              className="input w-full max-w-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message ({msg.length}/160)</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)}
              rows={3} maxLength={160}
              placeholder="Enter message…"
              className="input w-full max-w-lg resize-none"
            />
          </div>
          <button type="submit" disabled={sending || !cfg?.configured}
            className="btn-primary text-sm disabled:opacity-50">
            {sending ? 'Sending…' : 'Send SMS'}
          </button>
        </form>
      </div>

      {/* Logs */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">SMS Logs</h3>
          <button onClick={() => refetch()} className="text-xs text-blue-600 hover:underline">Refresh</button>
        </div>
        {logs.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">No SMS sent yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">To</th>
                  <th className="px-4 py-2 text-left">Message</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatDate(l.sentAt)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{l.to}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-xs truncate">{l.message}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${l.status === 'sent' || l.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{l.cost ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'status',  label: 'Sync Status',    icon: SignalIcon },
  { key: 'keys',    label: 'API Keys',        icon: KeyIcon },
  { key: 'logs',    label: 'Sync Logs',       icon: ArrowsRightLeftIcon },
  { key: 'sms',     label: 'SMS',             icon: ChatBubbleLeftRightIcon },
  { key: 'docs',    label: 'API Docs',        icon: DocumentTextIcon },
];

export default function IntegrationsPage() {
  const [tab, setTab] = useState('status');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Manage API keys and monitor external data synchronisation.</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-mit-blue text-mit-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {tab === 'status' && <SyncStatusTab />}
        {tab === 'keys'   && <ApiKeysTab />}
        {tab === 'logs'   && <SyncLogsTab />}
        {tab === 'sms'    && <SmsTab />}
        {tab === 'docs'   && <ApiDocsTab />}
      </div>
    </div>
  );
}
