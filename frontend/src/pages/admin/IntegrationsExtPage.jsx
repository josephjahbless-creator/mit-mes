import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowsRightLeftIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon,
  WrenchScrewdriverIcon, ClockIcon, ExclamationTriangleIcon,
  CloudArrowUpIcon, ServerStackIcon, ShieldCheckIcon,
  ChevronDownIcon, ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { externalIntegrationsApi } from '../../api';
import toast from 'react-hot-toast';

const SYSTEMS = [
  {
    key: 'dhis2',
    name: 'DHIS2',
    description: 'District Health Information System 2 — pull performance indicators and health data',
    icon: '🏥',
    color: 'blue',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://dhis2.example.org/api' },
      { key: 'username', label: 'Username', placeholder: 'admin' },
      { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
    ],
  },
  {
    key: 'kobo',
    name: 'KoboToolbox',
    description: 'Mobile data collection platform — import survey responses as indicator actuals',
    icon: '📋',
    color: 'green',
    fields: [
      { key: 'baseUrl', label: 'KoboToolbox URL', placeholder: 'https://kf.kobotoolbox.org' },
      { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'Token abc123...' },
      { key: 'assetId', label: 'Asset / Form ID', placeholder: 'aXXXXXXXXXXXXXXXXX' },
    ],
  },
  {
    key: 'planrep',
    name: 'PlanRep',
    description: 'Planning and Reporting System — sync budget plans and activity implementation data',
    icon: '📊',
    color: 'purple',
    fields: [
      { key: 'baseUrl', label: 'PlanRep API URL', placeholder: 'https://planrep.go.tz/api' },
      { key: 'apiToken', label: 'Bearer Token', type: 'password', placeholder: 'Bearer ...' },
    ],
  },
  {
    key: 'ifms',
    name: 'IFMS',
    description: 'Integrated Financial Management System — sync budget expenditure data',
    icon: '💰',
    color: 'amber',
    fields: [
      { key: 'baseUrl', label: 'IFMS API URL', placeholder: 'https://ifms.go.tz/api' },
      { key: 'apiToken', label: 'Bearer Token', type: 'password', placeholder: 'Bearer ...' },
      { key: 'ministryCode', label: 'Ministry Code', placeholder: 'e.g. MIT' },
    ],
  },
];

const SSO_PROVIDERS = [
  { key: 'google', name: 'Google', icon: '🔵', desc: 'Sign in with Google accounts' },
  { key: 'microsoft', name: 'Microsoft / Azure AD', icon: '🟦', desc: 'Sign in with Microsoft / Office 365' },
];

function colorClasses(color) {
  const map = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', badge: 'bg-green-100 text-green-700' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
  };
  return map[color] || map.blue;
}

function IntegrationCard({ sys }) {
  const [expanded, setExpanded] = useState(false);
  const [configForm, setConfigForm] = useState({});
  const [showLogs, setShowLogs] = useState(false);
  const qc = useQueryClient();
  const c = colorClasses(sys.color);

  const { data: integration } = useQuery({
    queryKey: ['ext-integration', sys.key],
    queryFn: () => externalIntegrationsApi.get(sys.key).then(r => r.data),
    retry: false,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['ext-logs', sys.key],
    queryFn: () => externalIntegrationsApi.getLogs(sys.key).then(r => r.data),
    enabled: showLogs,
    refetchInterval: showLogs ? 10000 : false,
  });

  const configureMutation = useMutation({
    mutationFn: (data) => externalIntegrationsApi.configure(sys.key, data),
    onSuccess: () => {
      qc.invalidateQueries(['ext-integration', sys.key]);
      toast.success(`${sys.name} configuration saved`);
      setExpanded(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  const testMutation = useMutation({
    mutationFn: () => externalIntegrationsApi.testConnection(sys.key),
    onSuccess: (res) => {
      if (res.data.success) toast.success(`${sys.name}: Connection successful!`);
      else toast.error(`${sys.name}: ${res.data.error || 'Connection failed'}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Connection test failed'),
  });

  const syncMutation = useMutation({
    mutationFn: () => externalIntegrationsApi.sync(sys.key),
    onSuccess: () => {
      qc.invalidateQueries(['ext-logs', sys.key]);
      toast.success(`${sys.name}: Sync started in background`);
      setShowLogs(true);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Sync failed to start'),
  });

  const isConfigured = integration?.isEnabled;
  const lastSync = integration?.lastSyncAt;

  function handleSave() {
    const credentials = {};
    sys.fields.forEach(f => { if (configForm[f.key]) credentials[f.key] = configForm[f.key]; });
    configureMutation.mutate({ isEnabled: true, credentials });
  }

  return (
    <div className={`card border ${isConfigured ? c.border : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${c.bg}`}>
            {sys.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-gray-900">{sys.name}</h3>
              {isConfigured ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c.badge}`}>
                  <CheckCircleIcon className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                  <XCircleIcon className="w-3 h-3" /> Not configured
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{sys.description}</p>
            {lastSync && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <ClockIcon className="w-3 h-3" />
                Last sync: {new Date(lastSync).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isConfigured && (
            <>
              <button
                onClick={() => testMutation.mutate()}
                disabled={testMutation.isPending}
                className="btn-secondary py-1.5 text-xs flex items-center gap-1"
              >
                <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
                {testMutation.isPending ? 'Testing...' : 'Test'}
              </button>
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="btn-secondary py-1.5 text-xs flex items-center gap-1"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                {syncMutation.isPending ? 'Starting...' : 'Sync'}
              </button>
            </>
          )}
          <button
            onClick={() => setExpanded(e => !e)}
            className="btn-secondary py-1.5 text-xs flex items-center gap-1"
          >
            <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
            Configure
            {expanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Config form */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sys.fields.map(field => (
              <div key={field.key}>
                <label className="label">{field.label}</label>
                <input
                  type={field.type || 'text'}
                  className="input"
                  placeholder={field.placeholder}
                  defaultValue={integration?.credentials?.[field.key] || ''}
                  onChange={e => setConfigForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setExpanded(false)} className="btn-secondary">Cancel</button>
            <button
              onClick={handleSave}
              disabled={configureMutation.isPending}
              className="btn-primary"
            >
              {configureMutation.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}

      {/* Logs */}
      {isConfigured && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() => setShowLogs(l => !l)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            <ClockIcon className="w-3.5 h-3.5" />
            {showLogs ? 'Hide sync logs' : 'Show sync logs'}
            {showLogs ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
          </button>
          {showLogs && (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <p className="text-xs text-gray-400 py-2">No sync logs yet</p>
              ) : (
                logs.slice(0, 20).map((log, i) => (
                  <div key={i} className={`flex items-start gap-2 text-xs px-2 py-1.5 rounded ${log.status === 'success' ? 'bg-green-50' : log.status === 'error' ? 'bg-red-50' : 'bg-gray-50'}`}>
                    {log.status === 'success' ? <CheckCircleIcon className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                     : log.status === 'error' ? <XCircleIcon className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                     : <ArrowPathIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />}
                    <div className="min-w-0">
                      <span className="text-gray-700">{log.message || log.status}</span>
                      {log.recordsProcessed !== null && log.recordsProcessed !== undefined && (
                        <span className="text-gray-400 ml-2">({log.recordsProcessed} records)</span>
                      )}
                      <span className="text-gray-400 ml-2">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SSOSection() {
  const { data: ssoStatus } = useQuery({
    queryKey: ['sso-status'],
    queryFn: () => externalIntegrationsApi.ssoStatus().then(r => r.data),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-1">
          <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
          Single Sign-On (SSO)
        </h2>
        <p className="text-sm text-gray-500">Allow users to sign in using their existing identity providers</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {SSO_PROVIDERS.map(provider => {
          const status = ssoStatus?.[provider.key];
          const configured = status?.configured;
          return (
            <div key={provider.key} className="card flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{provider.icon}</span>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-gray-900 text-sm">{provider.name}</h3>
                    {configured ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircleIcon className="w-3 h-3" /> Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                        <XCircleIcon className="w-3 h-3" /> Not set up
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{provider.desc}</p>
                  {configured && status?.clientId && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">Client: {status.clientId}</p>
                  )}
                  {configured && status?.tenantId && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">Tenant: {status.tenantId}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">Configure SSO via environment variables</p>
        <div className="font-mono text-xs space-y-0.5 text-blue-700">
          <p>GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI</p>
          <p>MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, MICROSOFT_REDIRECT_URI</p>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsExtPage() {
  const [activeSection, setActiveSection] = useState('external');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowsRightLeftIcon className="w-7 h-7 text-blue-600" />
            External Integrations
          </h1>
          <p className="text-gray-500 text-sm mt-1">Connect to external systems for data synchronisation</p>
        </div>
      </div>

      {/* Section toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveSection('external')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'external' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <ServerStackIcon className="w-4 h-4 inline mr-1.5" />
          External Systems
        </button>
        <button
          onClick={() => setActiveSection('sso')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeSection === 'sso' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <ShieldCheckIcon className="w-4 h-4 inline mr-1.5" />
          SSO / Identity
        </button>
      </div>

      {activeSection === 'external' && (
        <div className="space-y-4">
          {SYSTEMS.map(sys => <IntegrationCard key={sys.key} sys={sys} />)}
        </div>
      )}

      {activeSection === 'sso' && <SSOSection />}
    </div>
  );
}
