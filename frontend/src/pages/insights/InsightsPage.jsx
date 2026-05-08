import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellAlertIcon, LightBulbIcon, ExclamationTriangleIcon,
  CheckCircleIcon, XMarkIcon, ArrowPathIcon, FunnelIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { insightsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const FISCAL_YEAR = '2025-2026';

const SEVERITY_META = {
  critical: {
    icon: ExclamationTriangleIcon,
    bg: 'bg-red-50', border: 'border-red-200',
    iconCls: 'text-red-500', label: 'Critical', badge: 'bg-red-100 text-red-700',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    bg: 'bg-amber-50', border: 'border-amber-200',
    iconCls: 'text-amber-500', label: 'Warning', badge: 'bg-amber-100 text-amber-700',
  },
  info: {
    icon: LightBulbIcon,
    bg: 'bg-blue-50', border: 'border-blue-200',
    iconCls: 'text-blue-500', label: 'Info', badge: 'bg-blue-100 text-blue-700',
  },
};

const SCOPE_LABELS = {
  national:    'National',
  institution: 'Institution',
  indicator:   'Indicator',
  submission:  'Submission',
};

function InsightRow({ insight, onDismiss, onMarkRead }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SEVERITY_META[insight.severity] ?? SEVERITY_META.info;
  const Icon = meta.icon;

  return (
    <div
      className={`border rounded-xl p-4 transition-all ${meta.bg} ${meta.border}
        ${insight.isDismissed ? 'opacity-40' : ''}
        ${!insight.isRead ? 'ring-1 ring-blue-300/60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${meta.iconCls}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
              {meta.label}
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">
              {SCOPE_LABELS[insight.scope] ?? insight.scope}
            </span>
            {insight.insightType && (
              <span className="text-[10px] text-gray-400">{insight.insightType.replace(/_/g, ' ')}</span>
            )}
            {!insight.isRead && (
              <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">New</span>
            )}
          </div>

          <p className="font-semibold text-gray-800 text-sm leading-snug">{insight.headline}</p>

          {expanded && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{insight.narrative}</p>
          )}

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => { setExpanded(v => !v); if (!insight.isRead) onMarkRead(insight.id); }}
              className="text-xs text-blue-600 hover:underline"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>

            {insight.value != null && (
              <span className="text-[11px] text-gray-500">
                Value: <strong>{insight.value}</strong>
                {insight.target != null && <> / Target: <strong>{insight.target}</strong></>}
              </span>
            )}

            {insight.changePercent != null && (
              <span className={`text-[11px] flex items-center gap-0.5 ${insight.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {insight.changePercent >= 0
                  ? <ArrowTrendingUpIcon className="w-3 h-3" />
                  : <ArrowTrendingDownIcon className="w-3 h-3" />}
                {insight.changePercent >= 0 ? '+' : ''}{insight.changePercent}%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!insight.isDismissed && (
            <button
              onClick={() => onDismiss(insight.id)}
              className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Dismiss"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 ml-8 text-[10px] text-gray-400">
        {insight.generatedAt
          ? new Date(insight.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
          : ''}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const qc   = useQueryClient();
  const user = useAuthStore(s => s.user);
  const isSuperOrME = ['super_admin', 'me_officer'].includes(user?.role);

  const [filterScope,    setFilterScope]    = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterPeriod,   setFilterPeriod]   = useState('Q1');
  const [showDismissed,  setShowDismissed]  = useState(false);

  const { data: insightsResp = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['insights', filterScope, filterSeverity, filterPeriod],
    queryFn: () => insightsApi.list({
      fiscalYear: FISCAL_YEAR,
      period:     filterPeriod  || undefined,
      scope:      filterScope   || undefined,
      severity:   filterSeverity || undefined,
      limit:      200,
    }).then(r => r.data),
  });

  const insights = Array.isArray(insightsResp) ? insightsResp : (insightsResp.insights ?? []);

  const markReadMutation = useMutation({
    mutationFn: (id) => insightsApi.markRead([id]),
    onSuccess: () => qc.invalidateQueries(['insights']),
  });

  const dismissMutation = useMutation({
    mutationFn: (id) => insightsApi.dismiss(id),
    onSuccess: () => { qc.invalidateQueries(['insights']); toast.success('Insight dismissed'); },
    onError: () => toast.error('Failed to dismiss'),
  });

  const triggerMutation = useMutation({
    mutationFn: () => insightsApi.triggerNational({ fiscalYear: FISCAL_YEAR, period: filterPeriod || 'Q1' }),
    onSuccess: () => { toast.success('National insights generation started — refresh in a moment'); setTimeout(() => refetch(), 3000); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to trigger insights'),
  });

  const visible = useMemo(() => {
    return insights.filter(i => showDismissed ? true : !i.isDismissed);
  }, [insights, showDismissed]);

  const unread     = insights.filter(i => !i.isRead && !i.isDismissed).length;
  const critCount  = visible.filter(i => i.severity === 'critical').length;
  const warnCount  = visible.filter(i => i.severity === 'warning').length;

  const markAllRead = () => {
    const unreadIds = insights.filter(i => !i.isRead).map(i => i.id);
    if (!unreadIds.length) return;
    insightsApi.markRead(unreadIds)
      .then(() => { qc.invalidateQueries(['insights']); toast.success('All marked as read'); })
      .catch(() => toast.error('Failed'));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BellAlertIcon className="w-7 h-7 text-mit-blue" />
            System Insights
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Auto-generated analysis — {FISCAL_YEAR}
            {unread > 0 && <span className="ml-2 text-blue-600 font-medium">{unread} unread</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-secondary text-sm">
              Mark all read
            </button>
          )}
          {isSuperOrME && (
            <button
              onClick={() => triggerMutation.mutate()}
              disabled={triggerMutation.isPending}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <ArrowPathIcon className={`w-4 h-4 ${triggerMutation.isPending ? 'animate-spin' : ''}`} />
              {triggerMutation.isPending ? 'Generating…' : 'Generate National Insights'}
            </button>
          )}
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex items-center gap-3 flex-wrap">
        {critCount > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">{critCount} critical</span>
          </div>
        )}
        {warnCount > 0 && (
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">{warnCount} warnings</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
          <LightBulbIcon className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-blue-700">{visible.length} total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-xl p-3 border border-gray-100">
        <FunnelIcon className="w-4 h-4 text-gray-400" />

        <select className="input max-w-[130px]" value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}>
          <option value="">All periods</option>
          {['Q1','Q2','Q3','Q4','Annual'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <select className="input max-w-[140px]" value={filterScope} onChange={e => setFilterScope(e.target.value)}>
          <option value="">All scopes</option>
          <option value="national">National</option>
          <option value="institution">Institution</option>
          <option value="indicator">Indicator</option>
          <option value="submission">Submission</option>
        </select>

        <select className="input max-w-[130px]" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none ml-auto">
          <input
            type="checkbox"
            checked={showDismissed}
            onChange={e => setShowDismissed(e.target.checked)}
            className="rounded border-gray-300 text-mit-blue"
          />
          Show dismissed
        </label>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-1.5 rounded-lg text-gray-400 hover:text-mit-blue hover:bg-blue-50"
          title="Refresh"
        >
          <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Insights list */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading insights…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircleIcon className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No insights match the current filters.</p>
          <p className="text-gray-400 text-sm mt-1">
            {isSuperOrME ? 'Try generating national insights or adjusting the filters.' : 'Check back after the next reporting period.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(insight => (
            <InsightRow
              key={insight.id}
              insight={insight}
              onDismiss={(id) => dismissMutation.mutate(id)}
              onMarkRead={(id) => markReadMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
