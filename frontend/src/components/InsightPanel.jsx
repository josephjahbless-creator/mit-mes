import { useEffect, useState, useCallback } from 'react';
import { insightsApi } from '../api';
import {
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ── Severity config ────────────────────────────────────────────────────────────
const SEV = {
  critical: {
    bg:    'bg-red-50',
    border:'border-red-200',
    Icon:  ExclamationTriangleIcon,
    iconCl:'text-red-500',
    badge: 'bg-red-100 text-red-700',
    label: 'Critical',
  },
  warning: {
    bg:    'bg-amber-50',
    border:'border-amber-200',
    Icon:  ExclamationTriangleIcon,
    iconCl:'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Attention',
  },
  info: {
    bg:    'bg-blue-50',
    border:'border-blue-200',
    Icon:  LightBulbIcon,
    iconCl:'text-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Info',
  },
};

const TYPE_ICON = {
  trend:       ArrowTrendingUpIcon,
  achievement: CheckCircleIcon,
  forecast:    ArrowTrendingUpIcon,
  anomaly:     ExclamationTriangleIcon,
  risk:        ExclamationTriangleIcon,
  lagging:     ArrowTrendingDownIcon,
};

function InsightCard({ insight, onDismiss }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEV[insight.severity] || SEV.info;
  const SevIcon = sev.Icon;

  return (
    <div className={`rounded-xl border ${sev.bg} ${sev.border} p-4 transition-all`}>
      <div className="flex items-start gap-3">
        <SevIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${sev.iconCl}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sev.badge}`}>
              {sev.label}
            </span>
            <span className="text-xs text-gray-500 capitalize">{insight.insightType}</span>
            {insight.institution && (
              <span className="text-xs text-gray-500">— {insight.institution.name}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-800 mt-1">{insight.headline}</p>

          {expanded && (
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{insight.narrative}</p>
          )}

          <button
            onClick={() => setExpanded(e => !e)}
            className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            {expanded
              ? <><ChevronUpIcon className="w-3 h-3" /> Show less</>
              : <><ChevronDownIcon className="w-3 h-3" /> Read more</>
            }
          </button>
        </div>
        <button
          onClick={() => onDismiss(insight.id)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
          title="Dismiss"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * InsightPanel — "What the data is telling you today"
 *
 * Props:
 *  scope        – 'national' | 'submission' | 'indicator' | 'institution' (optional filter)
 *  fiscalYear   – e.g. '2024-2025'
 *  period       – 'Q1' | 'Q2' | ... (optional)
 *  indicatorId  – filter by indicator (optional)
 *  institutionId– filter by institution (optional)
 *  actualId     – load insights for a specific submission (uses getSubmission endpoint)
 *  limit        – max items (default 10)
 *  title        – panel heading (default "What the data is telling you")
 *  compact      – if true, shows only top 3 and a "show all" button
 */
export default function InsightPanel({
  scope,
  fiscalYear,
  period,
  indicatorId,
  institutionId,
  actualId,
  limit = 10,
  title = 'What the data is telling you',
  compact = false,
}) {
  const [insights, setInsights] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAll,  setShowAll]  = useState(!compact);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      let res;
      if (actualId) {
        res = await insightsApi.getSubmission(actualId);
      } else {
        const params = { limit };
        if (scope)         params.scope         = scope;
        if (fiscalYear)    params.fiscalYear    = fiscalYear;
        if (period)        params.period        = period;
        if (indicatorId)   params.indicatorId   = indicatorId;
        if (institutionId) params.institutionId = institutionId;
        res = await insightsApi.list(params);
      }
      setInsights(res.data?.data || []);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [actualId, scope, fiscalYear, period, indicatorId, institutionId, limit]);

  useEffect(() => { load(); }, [load]);

  const handleDismiss = async (id) => {
    setInsights(prev => prev.filter(i => i.id !== id));
    await insightsApi.dismiss(id).catch(() => {});
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    load();
  };

  if (!loading && insights.length === 0) return null;

  const displayed = showAll ? insights : insights.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {insights.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
              {insights.length}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-40"
          title="Refresh insights"
        >
          <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {displayed.map(insight => (
              <InsightCard key={insight.id} insight={insight} onDismiss={handleDismiss} />
            ))}
            {compact && insights.length > 3 && (
              <button
                onClick={() => setShowAll(s => !s)}
                className="w-full text-xs text-blue-600 hover:text-blue-800 py-1 flex items-center justify-center gap-1"
              >
                {showAll
                  ? <><ChevronUpIcon className="w-3 h-3" /> Show fewer</>
                  : <><ChevronDownIcon className="w-3 h-3" /> Show {insights.length - 3} more</>
                }
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
