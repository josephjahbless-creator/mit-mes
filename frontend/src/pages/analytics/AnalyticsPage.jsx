import { useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import {
  ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  MinusSmallIcon, TrophyIcon, ExclamationTriangleIcon,
  XCircleIcon, CheckCircleIcon, FunnelIcon, TableCellsIcon,
  ArrowDownTrayIcon, SparklesIcon, BoltIcon, ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { useSocketEvent } from '../../hooks/useSocket';
import { analyticsApi, indicatorsApi, institutionsApi, disaggregationApi } from '../../api';
import { getCurrentFiscalYear, getFiscalYearOptions } from '../../utils/fiscalYear';
import ProgressBar from '../../components/ui/ProgressBar';

const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const OWNER_TYPES = ['Institution', 'Department', 'Unit'];
const FY_OPTIONS = getFiscalYearOptions();

// ── Helpers ───────────────────────────────────────────────────────────────────
function pctColor(v) {
  if (v === null || v === undefined) return 'bg-gray-200 text-gray-500';
  if (v >= 100) return 'bg-green-600 text-white';
  if (v >= 75) return 'bg-green-300 text-green-900';
  if (v >= 50) return 'bg-yellow-300 text-yellow-900';
  if (v >= 25) return 'bg-orange-400 text-white';
  return 'bg-red-500 text-white';
}

function pct(v) {
  if (v === null || v === undefined) return '—';
  return `${Math.round(v)}%`;
}

function LoadingRows({ cols = 5 }) {
  return Array.from({ length: 5 }).map((_, i) => (
    <tr key={i} className="animate-pulse">
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </td>
      ))}
    </tr>
  ));
}

// ── Shared filter bar ─────────────────────────────────────────────────────────
function FilterBar({ fiscalYear, setFiscalYear, period, setPeriod, showPeriod = true }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-1 text-gray-500">
        <FunnelIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Filters:</span>
      </div>
      <select
        value={fiscalYear}
        onChange={e => setFiscalYear(e.target.value)}
        className="input py-1.5 text-sm w-36"
      >
        {FY_OPTIONS.map(fy => (
          <option key={fy} value={fy}>{fy}</option>
        ))}
      </select>
      {showPeriod && (
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="input py-1.5 text-sm w-28"
        >
          {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1: SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
function SummaryTab({ fiscalYear, period }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-summary', fiscalYear, period],
    queryFn: () => analyticsApi.summary({ fiscalYear, period }).then(r => r.data),
    keepPreviousData: true,
  });

  if (isError) return (
    <div className="card text-center py-12 text-red-500">
      Failed to load summary data. Please try again.
    </div>
  );

  const d = data || {};
  const total = d.totalSubmissions ?? 0;
  const approved = d.approvedSubmissions ?? 0;
  const pending = d.pendingSubmissions ?? 0;
  const rejected = d.rejectedSubmissions ?? 0;
  const achievement = d.overallAchievement ?? null;
  const onTrack = d.onTrack ?? 0;
  const atRisk = d.atRisk ?? 0;
  const offTrack = d.offTrack ?? 0;
  const complianceRate = d.complianceRate ?? null;
  const topPerformers = d.topPerformers ?? [];
  const bottomPerformers = d.bottomPerformers ?? [];

  return (
    <div className="space-y-6">
      {/* Row 1: stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Submissions card */}
        <div className={`card ${isLoading ? 'animate-pulse' : ''}`}>
          <p className="text-sm font-medium text-gray-500">Total Submissions</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{isLoading ? '—' : total}</p>
          {!isLoading && total > 0 && (
            <div className="mt-3 space-y-1">
              {[
                { label: 'Approved', value: approved, color: 'bg-green-500' },
                { label: 'Pending', value: pending, color: 'bg-amber-400' },
                { label: 'Rejected', value: rejected, color: 'bg-red-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-gray-500">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${total ? (value / total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-medium text-gray-700">{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievement */}
        <div className={`card flex flex-col items-center justify-center ${isLoading ? 'animate-pulse' : ''}`}>
          <p className="text-sm font-medium text-gray-500 mb-2">Overall Achievement</p>
          {isLoading ? (
            <div className="w-24 h-24 rounded-full bg-gray-200" />
          ) : (
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={
                    achievement === null ? '#9ca3af'
                    : achievement >= 100 ? '#16a34a'
                    : achievement >= 75 ? '#3b82f6'
                    : achievement >= 50 ? '#f59e0b'
                    : '#ef4444'
                  }
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - Math.min(1, (achievement ?? 0) / 100))}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-2xl font-bold text-gray-900">
                {achievement !== null ? `${Math.round(achievement)}%` : '—'}
              </span>
            </div>
          )}
        </div>

        {/* Status counts */}
        <div className={`card space-y-3 ${isLoading ? 'animate-pulse' : ''}`}>
          <p className="text-sm font-medium text-gray-500">Performance Status</p>
          {[
            { label: 'On Track', value: onTrack, bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-500' },
            { label: 'At Risk', value: atRisk, bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-400' },
            { label: 'Off Track', value: offTrack, bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-400' },
          ].map(({ label, value, bg, text, badge }) => (
            <div key={label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${bg}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${badge}`} />
                <span className={`text-sm font-medium ${text}`}>{label}</span>
              </div>
              <span className={`text-lg font-bold ${text}`}>{isLoading ? '—' : value}</span>
            </div>
          ))}
        </div>

        {/* Compliance */}
        <div className={`card ${isLoading ? 'animate-pulse' : ''}`}>
          <p className="text-sm font-medium text-gray-500 mb-3">Submission Compliance</p>
          {isLoading ? (
            <div className="h-12 bg-gray-200 rounded" />
          ) : (
            <>
              <p className="text-3xl font-bold text-gray-900">
                {complianceRate !== null ? `${Math.round(complianceRate)}%` : '—'}
              </p>
              <div className="mt-3">
                <ProgressBar value={complianceRate ?? 0} max={100} showValue={false} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {complianceRate !== null
                  ? complianceRate >= 80 ? 'Good compliance rate'
                  : complianceRate >= 50 ? 'Moderate compliance'
                  : 'Low compliance: action needed'
                  : 'No data available'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Row 2: Performers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrophyIcon className="w-4 h-4 text-green-600" />
            Top 3 Performers
          </h3>
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-200 rounded" />)}
            </div>
          ) : topPerformers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No data</p>
          ) : (
            <div className="space-y-2">
              {topPerformers.slice(0, 3).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                  </div>
                  <span className="badge ml-2 bg-green-100 text-green-800 font-semibold flex-shrink-0">
                    {pct(p.achievement)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
            Bottom 3 Performers
          </h3>
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-gray-200 rounded" />)}
            </div>
          ) : bottomPerformers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No data</p>
          ) : (
            <div className="space-y-2">
              {bottomPerformers.slice(0, 3).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                  </div>
                  <span className="badge ml-2 bg-red-100 text-red-800 font-semibold flex-shrink-0">
                    {pct(p.achievement)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2: TRENDS
// ══════════════════════════════════════════════════════════════════════════════
function TrendsTab() {
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [indicatorId, setIndicatorId] = useState('');
  const [search, setSearch] = useState('');

  const { data: indicators = [] } = useQuery({
    queryKey: ['indicators-list'],
    queryFn: () => indicatorsApi.list({ limit: 200 }).then(r => r.data?.indicators ?? r.data ?? []),
  });

  const filteredIndicators = useMemo(() =>
    indicators.filter(i =>
      !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase())
    ),
    [indicators, search]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-trends', indicatorId, fiscalYear],
    queryFn: () => analyticsApi.trends({ indicatorId, fiscalYear }).then(r => r.data),
    enabled: !!indicatorId,
    keepPreviousData: true,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    const periods = ['Q1', 'Q2', 'Q3', 'Q4'];
    return periods.map(p => ({
      period: p,
      current: data.current?.[p] ?? null,
      previous: data.previous?.[p] ?? null,
    }));
  }, [data]);

  const trend = data?.trend; // 'improving' | 'declining' | 'stable' | null

  const TrendBadge = () => {
    if (!trend) return null;
    const map = {
      improving: { label: 'Improving ↑', cls: 'bg-green-100 text-green-800' },
      declining: { label: 'Declining ↓', cls: 'bg-red-100 text-red-800' },
      stable: { label: 'Stable →', cls: 'bg-gray-100 text-gray-700' },
    };
    const m = map[trend] ?? map.stable;
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${m.cls}`}>{m.label}</span>;
  };

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-gray-500 self-center">
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Fiscal Year</label>
          <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="input py-1.5 text-sm w-36">
            {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs text-gray-500 font-medium">Indicator</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search indicators..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input py-1.5 text-sm w-full pr-8"
            />
          </div>
          {search && filteredIndicators.length > 0 && (
            <div className="absolute mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-80">
              {filteredIndicators.slice(0, 15).map(ind => (
                <button
                  key={ind.id}
                  onClick={() => { setIndicatorId(ind.id); setSearch(ind.code ? `[${ind.code}] ${ind.name}` : ind.name); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {ind.code && <span className="font-mono text-xs text-gray-400 mr-1">[{ind.code}]</span>}
                  {ind.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!indicatorId ? (
        <div className="card text-center py-16">
          <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Select an indicator to view trends</p>
          <p className="text-gray-400 text-sm mt-1">Search and select an indicator from the filter above</p>
        </div>
      ) : isLoading ? (
        <div className="card animate-pulse h-64" />
      ) : isError ? (
        <div className="card text-center py-12 text-red-500">Failed to load trend data.</div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">
              Year-over-Year Trends
              {data?.indicatorName && <span className="text-gray-500 font-normal text-sm ml-2">— {data.indicatorName}</span>}
            </h3>
            <TrendBadge />
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} domain={[0, 'auto']} />
              <Tooltip formatter={(v, name) => [`${v !== null ? Math.round(v) : '—'}%`, name]} />
              <Legend />
              <Line
                type="monotone" dataKey="current" name={fiscalYear}
                stroke="#1d4ed8" strokeWidth={2.5} dot={{ r: 5 }} activeDot={{ r: 7 }}
                connectNulls={false}
              />
              <Line
                type="monotone" dataKey="previous" name="Previous Year"
                stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          {/* Stats row */}
          {data && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
              {['Q1','Q2','Q3','Q4'].map(p => (
                <div key={p} className="text-center">
                  <p className="text-xs text-gray-500 mb-0.5">{p}</p>
                  <p className="font-semibold text-gray-800">{pct(data.current?.[p])}</p>
                  <p className="text-xs text-gray-400">{pct(data.previous?.[p])} prev.</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3: RANKINGS
// ══════════════════════════════════════════════════════════════════════════════
function RankingsTab({ fiscalYear, setFiscalYear, period, setPeriod }) {
  const [ownerType, setOwnerType] = useState('Institution');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-rankings', fiscalYear, period, ownerType],
    queryFn: () => analyticsApi.rankings({ fiscalYear, period, ownerType }).then(r => r.data),
    keepPreviousData: true,
  });

  const rankings = data?.rankings ?? [];

  const medalStyle = (rank) => {
    if (rank === 1) return 'bg-yellow-50 border-l-4 border-yellow-400';
    if (rank === 2) return 'bg-gray-50 border-l-4 border-gray-400';
    if (rank === 3) return 'bg-orange-50 border-l-4 border-orange-400';
    return '';
  };

  const medalEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <FilterBar fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} period={period} setPeriod={setPeriod} />
        <select value={ownerType} onChange={e => setOwnerType(e.target.value)} className="input py-1.5 text-sm w-36">
          {OWNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">Rank</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Entity Name</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-28">Indicators</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-32">Avg Achievement</th>
              <th className="px-4 py-3 font-medium text-gray-600 w-40">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <LoadingRows cols={5} />
            ) : isError ? (
              <tr><td colSpan={5} className="text-center py-10 text-red-500">Failed to load rankings.</td></tr>
            ) : rankings.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No ranking data available for this selection.</td></tr>
            ) : (
              rankings.map((row, idx) => {
                const rank = idx + 1;
                return (
                  <tr key={row.id ?? idx} className={`hover:bg-gray-50 ${medalStyle(rank)}`}>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold
                        ${rank === 1 ? 'bg-yellow-100 text-yellow-700'
                          : rank === 2 ? 'bg-gray-200 text-gray-700'
                          : rank === 3 ? 'bg-orange-100 text-orange-700'
                          : 'text-gray-500'}`}>
                        {medalEmoji(rank)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{row.indicatorCount ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${
                        (row.avgAchievement ?? 0) >= 100 ? 'text-green-700'
                        : (row.avgAchievement ?? 0) >= 75 ? 'text-blue-600'
                        : (row.avgAchievement ?? 0) >= 50 ? 'text-amber-600'
                        : 'text-red-600'
                      }`}>
                        {pct(row.avgAchievement)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ProgressBar value={row.avgAchievement ?? 0} max={100} showValue={false} size="sm" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4: FORECASTING
// ══════════════════════════════════════════════════════════════════════════════
function ForecastingTab() {
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [indicatorId, setIndicatorId] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [search, setSearch] = useState('');

  const { data: indicators = [] } = useQuery({
    queryKey: ['indicators-list'],
    queryFn: () => indicatorsApi.list({ limit: 200 }).then(r => r.data?.indicators ?? r.data ?? []),
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const filteredIndicators = useMemo(() =>
    indicators.filter(i =>
      !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase())
    ),
    [indicators, search]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-forecasting', indicatorId, fiscalYear, institutionId],
    queryFn: () => analyticsApi.forecasting({
      indicatorId, fiscalYear, ...(institutionId ? { institutionId } : {}),
    }).then(r => r.data),
    enabled: !!indicatorId,
    keepPreviousData: true,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { period: 'Q1', value: data.actuals?.Q1 ?? null, type: 'actual' },
      { period: 'Q2', value: data.actuals?.Q2 ?? null, type: 'actual' },
      { period: 'Q3', value: data.actuals?.Q3 ?? null, type: 'actual' },
      { period: 'Q4 (Proj.)', value: data.projectedQ4 ?? null, type: 'projected' },
    ].filter(d => d.value !== null);
  }, [data]);

  const likelihood = data?.likelihood; // 'on_track' | 'at_risk' | 'off_track'

  const LikelihoodBadge = () => {
    if (!likelihood) return null;
    const map = {
      on_track: { label: 'On Track ✓', cls: 'bg-green-100 text-green-800' },
      at_risk: { label: 'At Risk ⚠', cls: 'bg-amber-100 text-amber-800' },
      off_track: { label: 'Off Track ✗', cls: 'bg-red-100 text-red-800' },
    };
    const m = map[likelihood] ?? map.at_risk;
    return <span className={`px-3 py-1 rounded-full text-sm font-semibold ${m.cls}`}>{m.label}</span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-gray-500 self-center">
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Fiscal Year</label>
          <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="input py-1.5 text-sm w-36">
            {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 relative flex-1 min-w-48">
          <label className="text-xs text-gray-500 font-medium">Indicator</label>
          <input
            type="text"
            placeholder="Search indicators..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input py-1.5 text-sm w-full"
          />
          {search && filteredIndicators.length > 0 && (
            <div className="absolute top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-full">
              {filteredIndicators.slice(0, 15).map(ind => (
                <button
                  key={ind.id}
                  onClick={() => { setIndicatorId(ind.id); setSearch(ind.code ? `[${ind.code}] ${ind.name}` : ind.name); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                >
                  {ind.code && <span className="font-mono text-xs text-gray-400 mr-1">[{ind.code}]</span>}
                  {ind.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Institution (optional)</label>
          <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="input py-1.5 text-sm w-48">
            <option value="">All Institutions</option>
            {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
          </select>
        </div>
      </div>

      {!indicatorId ? (
        <div className="card text-center py-16">
          <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Select an indicator to view forecasting</p>
        </div>
      ) : isLoading ? (
        <div className="card animate-pulse h-64" />
      ) : isError ? (
        <div className="card text-center py-12 text-red-500">Failed to load forecasting data.</div>
      ) : (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Annual Target', value: data?.annualTarget, suffix: '' },
              { label: 'Current Total', value: data?.currentTotal, suffix: '' },
              { label: 'Projected Annual', value: data?.projectedAnnual, suffix: '' },
              { label: 'Likelihood', value: null, badge: <LikelihoodBadge /> },
            ].map(({ label, value, suffix, badge }) => (
              <div key={label} className="card text-center py-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                {badge || (
                  <p className="text-xl font-bold text-gray-900">
                    {value !== null && value !== undefined ? `${value}${suffix}` : '—'}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">
              Actuals + Projection
              {data?.indicatorName && <span className="text-gray-500 font-normal text-sm ml-2">— {data.indicatorName}</span>}
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.type === 'projected' ? '#93c5fd' : '#1d4ed8'}
                      opacity={entry.type === 'projected' ? 0.65 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-700 inline-block" /> Actual
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-300 opacity-70 inline-block" /> Projected
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5: PERFORMANCE MATRIX
// ══════════════════════════════════════════════════════════════════════════════
function PerformanceMatrixTab({ fiscalYear, setFiscalYear, period, setPeriod }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-matrix', fiscalYear, period],
    queryFn: () => analyticsApi.matrix({ fiscalYear, period }).then(r => r.data),
    keepPreviousData: true,
  });

  const entities = data?.entities ?? [];
  const indicators = data?.indicators ?? [];
  const matrix = data?.matrix ?? {};

  return (
    <div className="space-y-5">
      <FilterBar fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} period={period} setPeriod={setPeriod} />

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: '≥ 100%', cls: 'bg-green-600 text-white' },
          { label: '75–99%', cls: 'bg-green-300 text-green-900' },
          { label: '50–74%', cls: 'bg-yellow-300 text-yellow-900' },
          { label: '25–49%', cls: 'bg-orange-400 text-white' },
          { label: '< 25%', cls: 'bg-red-500 text-white' },
          { label: 'N/A', cls: 'bg-gray-200 text-gray-500' },
        ].map(({ label, cls }) => (
          <span key={label} className={`px-2 py-0.5 rounded font-medium ${cls}`}>{label}</span>
        ))}
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-64" />
      ) : isError ? (
        <div className="card text-center py-12 text-red-500">Failed to load matrix data.</div>
      ) : entities.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No matrix data available for this selection.</div>
      ) : (
        <div className="card p-0 overflow-auto">
          <table className="text-xs border-collapse min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700 min-w-40 max-w-48">
                  Entity
                </th>
                {indicators.map(ind => (
                  <th key={ind.id} className="border border-gray-200 px-2 py-2 font-medium text-gray-600 min-w-24 max-w-32 whitespace-nowrap overflow-hidden text-ellipsis" title={ind.name}>
                    {ind.code ?? ind.name?.slice(0, 14)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entities.map(entity => (
                <tr key={entity.id} className="hover:brightness-95">
                  <td className="sticky left-0 z-10 bg-white border border-gray-200 px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                    {entity.name}
                  </td>
                  {indicators.map(ind => {
                    const val = matrix?.[entity.id]?.[ind.id];
                    const cellClass = pctColor(val);
                    return (
                      <td
                        key={ind.id}
                        className={`border border-gray-200 text-center font-semibold py-2 px-1 ${cellClass}`}
                        title={val !== null && val !== undefined ? `${entity.name}: ${Math.round(val)}% on ${ind.name}` : 'No data'}
                      >
                        {val !== null && val !== undefined ? Math.round(val) : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 6: PIVOT TABLE
// ══════════════════════════════════════════════════════════════════════════════
const PERIODS_LIST = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

function PivotTableTab() {
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [rowDim, setRowDim] = useState('institution'); // institution | indicator
  const [colDim, setColDim] = useState('period');      // period (fixed for now)
  const [metricType, setMetricType] = useState('achievement'); // achievement | actual

  // Load rankings for institution pivot (reuse matrix endpoint)
  const { data: matrixData, isLoading, isError } = useQuery({
    queryKey: ['analytics-matrix-pivot', fiscalYear],
    queryFn: () => analyticsApi.matrix({ fiscalYear, period: 'Annual' }).then(r => r.data),
    keepPreviousData: true,
  });

  // For period pivot, we need trends per entity — use summary for all periods
  const { data: summaryQ1 } = useQuery({ queryKey: ['pivot-sum', fiscalYear, 'Q1'], queryFn: () => analyticsApi.summary({ fiscalYear, period: 'Q1' }).then(r => r.data), keepPreviousData: true });
  const { data: summaryQ2 } = useQuery({ queryKey: ['pivot-sum', fiscalYear, 'Q2'], queryFn: () => analyticsApi.summary({ fiscalYear, period: 'Q2' }).then(r => r.data), keepPreviousData: true });
  const { data: summaryQ3 } = useQuery({ queryKey: ['pivot-sum', fiscalYear, 'Q3'], queryFn: () => analyticsApi.summary({ fiscalYear, period: 'Q3' }).then(r => r.data), keepPreviousData: true });
  const { data: summaryQ4 } = useQuery({ queryKey: ['pivot-sum', fiscalYear, 'Q4'], queryFn: () => analyticsApi.summary({ fiscalYear, period: 'Q4' }).then(r => r.data), keepPreviousData: true });
  const { data: summaryAnn } = useQuery({ queryKey: ['pivot-sum', fiscalYear, 'Annual'], queryFn: () => analyticsApi.summary({ fiscalYear, period: 'Annual' }).then(r => r.data), keepPreviousData: true });

  // Build pivot data: rows = entities, cols = periods
  const pivotRows = useMemo(() => {
    const summaries = { Q1: summaryQ1, Q2: summaryQ2, Q3: summaryQ3, Q4: summaryQ4, Annual: summaryAnn };
    // Gather all entity names across periods
    const entityMap = {};
    PERIODS_LIST.forEach(period => {
      const performers = summaries[period]?.topPerformers ?? [];
      const bottom = summaries[period]?.bottomPerformers ?? [];
      [...performers, ...bottom].forEach(p => {
        if (!entityMap[p.name]) entityMap[p.name] = {};
        entityMap[p.name][period] = p.achievement ?? null;
      });
    });
    return Object.entries(entityMap).map(([name, periods]) => ({ name, ...periods }));
  }, [summaryQ1, summaryQ2, summaryQ3, summaryQ4, summaryAnn]);

  // Matrix pivot: rows = indicators, cols = entities
  const matrixEntities = matrixData?.entities ?? [];
  const matrixIndicators = matrixData?.indicators ?? [];
  const matrixCells = matrixData?.matrix ?? {};

  function exportCSV() {
    let csv = '';
    if (rowDim === 'indicator') {
      csv = ['Indicator', ...matrixEntities.map(e => e.name)].join(',') + '\n';
      matrixIndicators.forEach(ind => {
        const row = [ind.name, ...matrixEntities.map(e => {
          const v = matrixCells?.[e.id]?.[ind.id];
          return v !== null && v !== undefined ? Math.round(v) : '';
        })];
        csv += row.join(',') + '\n';
      });
    } else {
      csv = ['Entity', ...PERIODS_LIST].join(',') + '\n';
      pivotRows.forEach(row => {
        csv += [row.name, ...PERIODS_LIST.map(p => row[p] !== null && row[p] !== undefined ? Math.round(row[p]) : '')].join(',') + '\n';
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `pivot_${fiscalYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const cellClass = (v) => {
    if (v === null || v === undefined) return 'bg-gray-100 text-gray-400';
    if (v >= 100) return 'bg-green-600 text-white';
    if (v >= 75) return 'bg-green-200 text-green-900';
    if (v >= 50) return 'bg-yellow-200 text-yellow-900';
    if (v >= 25) return 'bg-orange-300 text-white';
    return 'bg-red-400 text-white';
  };

  const showPeriodPivot = rowDim === 'institution';
  const showIndicatorPivot = rowDim === 'indicator';

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-gray-500">
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Pivot:</span>
        </div>
        <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="input py-1.5 text-sm w-36">
          {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
        </select>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setRowDim('institution')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${rowDim === 'institution' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Entity × Period
          </button>
          <button
            onClick={() => setRowDim('indicator')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${rowDim === 'indicator' ? 'bg-white shadow-sm text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
          >
            Indicator × Entity
          </button>
        </div>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 py-1.5">
          <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: '≥ 100%', cls: 'bg-green-600 text-white' },
          { label: '75–99%', cls: 'bg-green-200 text-green-900' },
          { label: '50–74%', cls: 'bg-yellow-200 text-yellow-900' },
          { label: '25–49%', cls: 'bg-orange-300 text-white' },
          { label: '< 25%', cls: 'bg-red-400 text-white' },
          { label: 'N/A', cls: 'bg-gray-100 text-gray-400' },
        ].map(({ label, cls }) => (
          <span key={label} className={`px-2 py-0.5 rounded font-medium ${cls}`}>{label}</span>
        ))}
      </div>

      {/* Period Pivot */}
      {showPeriodPivot && (
        isLoading ? (
          <div className="card animate-pulse h-48" />
        ) : pivotRows.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">No data available for this period.</div>
        ) : (
          <div className="card p-0 overflow-auto">
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-3 py-2.5 text-left font-semibold text-gray-700 min-w-48">Entity</th>
                  {PERIODS_LIST.map(p => (
                    <th key={p} className="border border-gray-200 px-3 py-2.5 font-semibold text-gray-700 min-w-20 text-center">{p}</th>
                  ))}
                  <th className="border border-gray-200 px-3 py-2.5 font-semibold text-gray-700 min-w-20 text-center">Avg</th>
                </tr>
              </thead>
              <tbody>
                {pivotRows.map((row, i) => {
                  const vals = PERIODS_LIST.map(p => row[p] ?? null).filter(v => v !== null);
                  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                  return (
                    <tr key={i} className="hover:brightness-95">
                      <td className="sticky left-0 z-10 bg-white border border-gray-200 px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{row.name}</td>
                      {PERIODS_LIST.map(p => {
                        const v = row[p];
                        return (
                          <td key={p} className={`border border-gray-200 text-center font-semibold py-2 ${cellClass(v)}`}>
                            {v !== null && v !== undefined ? `${Math.round(v)}%` : '—'}
                          </td>
                        );
                      })}
                      <td className={`border border-gray-200 text-center font-bold py-2 ${cellClass(avg)}`}>
                        {avg !== null ? `${Math.round(avg)}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Indicator × Entity Pivot */}
      {showIndicatorPivot && (
        isLoading ? (
          <div className="card animate-pulse h-64" />
        ) : isError || matrixIndicators.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">No matrix data available for this selection.</div>
        ) : (
          <div className="card p-0 overflow-auto">
            <table className="text-xs border-collapse min-w-full">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 border border-gray-200 px-3 py-2.5 text-left font-semibold text-gray-700 min-w-48">Indicator</th>
                  {matrixEntities.map(e => (
                    <th key={e.id} className="border border-gray-200 px-2 py-2.5 font-semibold text-gray-700 min-w-24 text-center whitespace-nowrap overflow-hidden text-ellipsis" title={e.name}>
                      {e.name?.slice(0, 12)}{e.name?.length > 12 ? '…' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixIndicators.map(ind => (
                  <tr key={ind.id} className="hover:brightness-95">
                    <td className="sticky left-0 z-10 bg-white border border-gray-200 px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                      {ind.code && <span className="font-mono text-gray-400 mr-1">[{ind.code}]</span>}
                      {ind.name?.slice(0, 40)}{ind.name?.length > 40 ? '…' : ''}
                    </td>
                    {matrixEntities.map(entity => {
                      const v = matrixCells?.[entity.id]?.[ind.id];
                      return (
                        <td
                          key={entity.id}
                          className={`border border-gray-200 text-center font-semibold py-2 px-1 ${cellClass(v)}`}
                          title={v !== null && v !== undefined ? `${entity.name}: ${Math.round(v)}% on ${ind.name}` : 'No data'}
                        >
                          {v !== null && v !== undefined ? Math.round(v) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 7: DESCRIPTIVE STATISTICS
// ══════════════════════════════════════════════════════════════════════════════
function DescriptiveTab() {
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [period, setPeriod] = useState('Annual');
  const [indicatorId, setIndicatorId] = useState('');
  const [search, setSearch] = useState('');

  const { data: indicators = [] } = useQuery({
    queryKey: ['indicators-list'],
    queryFn: () => indicatorsApi.list({ limit: 200 }).then(r => r.data?.indicators ?? r.data ?? []),
  });

  const filteredIndicators = useMemo(() =>
    indicators.filter(i => !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase())),
    [indicators, search]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-descriptive', indicatorId, fiscalYear, period],
    queryFn: () => analyticsApi.descriptive({ indicatorId, fiscalYear, period }).then(r => r.data),
    enabled: !!indicatorId,
    keepPreviousData: true,
  });

  const stats = data ? [
    { label: 'N (institutions)', value: data.n },
    { label: 'Mean', value: data.mean !== null ? data.mean.toFixed(2) : '—' },
    { label: 'Median', value: data.median !== null ? data.median.toFixed(2) : '—' },
    { label: 'Std Dev', value: data.stdDev !== null ? data.stdDev.toFixed(2) : '—' },
    { label: 'Min', value: data.min !== null ? data.min.toFixed(2) : '—' },
    { label: 'Max', value: data.max !== null ? data.max.toFixed(2) : '—' },
    { label: 'P25', value: data.p25 !== null ? data.p25.toFixed(2) : '—' },
    { label: 'P75', value: data.p75 !== null ? data.p75.toFixed(2) : '—' },
    { label: 'P90', value: data.p90 !== null ? data.p90.toFixed(2) : '—' },
  ] : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-gray-500 self-center">
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Fiscal Year</label>
          <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="input py-1.5 text-sm w-36">
            {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Period</label>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="input py-1.5 text-sm w-28">
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 relative flex-1 min-w-48">
          <label className="text-xs text-gray-500 font-medium">Indicator</label>
          <input type="text" placeholder="Search indicators..." value={search}
            onChange={e => setSearch(e.target.value)} className="input py-1.5 text-sm w-full" />
          {search && filteredIndicators.length > 0 && (
            <div className="absolute top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-full">
              {filteredIndicators.slice(0, 15).map(ind => (
                <button key={ind.id}
                  onClick={() => { setIndicatorId(ind.id); setSearch(ind.code ? `[${ind.code}] ${ind.name}` : ind.name); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  {ind.code && <span className="font-mono text-xs text-gray-400 mr-1">[{ind.code}]</span>}
                  {ind.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!indicatorId ? (
        <div className="card text-center py-16">
          <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Select an indicator to view descriptive statistics</p>
        </div>
      ) : isLoading ? (
        <div className="card animate-pulse h-64" />
      ) : isError ? (
        <div className="card text-center py-12 text-red-500">Failed to load statistics.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {stats.map(({ label, value }) => (
              <div key={label} className="card text-center py-3 px-2">
                <p className="text-xs text-gray-400 mb-1 leading-tight">{label}</p>
                <p className="text-lg font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          {(data?.distribution ?? []).length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Frequency Distribution</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.distribution} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [v, 'Count']} />
                  <Bar dataKey="count" name="Count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {(data?.dataPoints ?? []).length > 0 && (
            <div className="card p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Institution</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.dataPoints.map((pt, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700">{pt.institution}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-900">{pt.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 8: VARIANCE ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════
function VarianceTab({ fiscalYear, setFiscalYear, period, setPeriod }) {
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });
  const [institutionId, setInstitutionId] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-variance', fiscalYear, period, institutionId],
    queryFn: () => analyticsApi.variance({ fiscalYear, period, ...(institutionId ? { institutionId } : {}) }).then(r => r.data),
    keepPreviousData: true,
  });

  const rows = data?.rows ?? [];

  const statusBadge = (status) => {
    const map = {
      achieved: 'bg-green-100 text-green-800',
      on_track: 'bg-blue-100 text-blue-800',
      at_risk: 'bg-amber-100 text-amber-800',
      off_track: 'bg-red-100 text-red-800',
      no_data: 'bg-gray-100 text-gray-500',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? map.no_data}`}>
      {status?.replace(/_/g, ' ') ?? 'No Data'}
    </span>;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <FilterBar fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} period={period} setPeriod={setPeriod} />
        <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="input py-1.5 text-sm w-48">
          <option value="">All Institutions</option>
          {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Indicator</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Target</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Actual</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-24">Gap</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 w-28">Achievement</th>
              <th className="px-4 py-3 font-medium text-gray-600 w-28">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? <LoadingRows cols={6} /> :
             isError ? <tr><td colSpan={6} className="text-center py-10 text-red-500">Failed to load variance data.</td></tr> :
             rows.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">No data for this selection.</td></tr> :
             rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-800">
                  {row.indicatorCode && <span className="font-mono text-xs text-gray-400 mr-1">[{row.indicatorCode}]</span>}
                  {row.indicatorName}
                  {row.unit && <span className="ml-1 text-xs text-gray-400">({row.unit})</span>}
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{row.target ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-700">{row.actual ?? '—'}</td>
                <td className={`px-4 py-3 text-right font-medium ${(row.gap ?? 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {row.gap !== null ? (row.gap > 0 ? '+' : '') + row.gap.toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${(row.achievement ?? 0) >= 100 ? 'text-green-700' : (row.achievement ?? 0) >= 75 ? 'text-blue-600' : (row.achievement ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {row.achievement !== null ? `${Math.round(row.achievement)}%` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3">{statusBadge(row.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 9: DISAGGREGATION ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════
function DisaggregationTab() {
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [period, setPeriod] = useState('Annual');
  const [indicatorId, setIndicatorId] = useState('');
  const [disaggregationId, setDisaggregationId] = useState('');
  const [search, setSearch] = useState('');

  const { data: indicators = [] } = useQuery({
    queryKey: ['indicators-list'],
    queryFn: () => indicatorsApi.list({ limit: 200 }).then(r => r.data?.indicators ?? r.data ?? []),
  });

  const { data: disaggregations = [] } = useQuery({
    queryKey: ['disaggregations'],
    queryFn: () => disaggregationApi.list().then(r => r.data),
  });

  const filteredIndicators = useMemo(() =>
    indicators.filter(i => !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.code?.toLowerCase().includes(search.toLowerCase())),
    [indicators, search]
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-disaggregation', indicatorId, fiscalYear, period, disaggregationId],
    queryFn: () => analyticsApi.disaggregation({ indicatorId, fiscalYear, period, ...(disaggregationId ? { disaggregationId } : {}) }).then(r => r.data),
    enabled: !!indicatorId,
    keepPreviousData: true,
  });

  const COLORS = ['#1d4ed8', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#65a30d', '#9333ea'];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-1 text-gray-500 self-center">
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Fiscal Year</label>
          <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="input py-1.5 text-sm w-36">
            {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Period</label>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="input py-1.5 text-sm w-28">
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 relative flex-1 min-w-48">
          <label className="text-xs text-gray-500 font-medium">Indicator</label>
          <input type="text" placeholder="Search indicators..." value={search}
            onChange={e => setSearch(e.target.value)} className="input py-1.5 text-sm w-full" />
          {search && filteredIndicators.length > 0 && (
            <div className="absolute top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto w-full">
              {filteredIndicators.slice(0, 15).map(ind => (
                <button key={ind.id}
                  onClick={() => { setIndicatorId(ind.id); setSearch(ind.code ? `[${ind.code}] ${ind.name}` : ind.name); setDisaggregationId(''); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                  {ind.code && <span className="font-mono text-xs text-gray-400 mr-1">[{ind.code}]</span>}
                  {ind.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Disaggregation (optional)</label>
          <select value={disaggregationId} onChange={e => setDisaggregationId(e.target.value)} className="input py-1.5 text-sm w-48">
            <option value="">All Dimensions</option>
            {disaggregations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {!indicatorId ? (
        <div className="card text-center py-16">
          <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Select an indicator to view disaggregation breakdown</p>
        </div>
      ) : isLoading ? (
        <div className="card animate-pulse h-64" />
      ) : isError ? (
        <div className="card text-center py-12 text-red-500">Failed to load disaggregation data.</div>
      ) : (data?.disaggregations ?? []).length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No disaggregated data for this selection.</div>
      ) : (
        <div className="space-y-6">
          {data.disaggregations.map((dim) => (
            <div key={dim.disaggregationId} className="card">
              <h3 className="font-semibold text-gray-800 mb-4">{dim.dimension}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dim.options} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="option" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip formatter={(v, name) => [name === 'percentage' ? `${v.toFixed(1)}%` : v, name === 'percentage' ? 'Share' : 'Total']} />
                    <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
                      {dim.options.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="space-y-2">
                  {dim.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="flex-1 text-sm text-gray-700 min-w-0 truncate">{opt.option}</span>
                      <span className="text-sm font-medium text-gray-900 w-16 text-right">{opt.total.toFixed(1)}</span>
                      <span className="text-xs text-gray-400 w-14 text-right">{opt.percentage.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 10: COST-BENEFIT ANALYSIS
// ══════════════════════════════════════════════════════════════════════════════
function CostBenefitTab({ fiscalYear, setFiscalYear }) {
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });
  const [institutionId, setInstitutionId] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-cost-benefit', fiscalYear, institutionId],
    queryFn: () => analyticsApi.costBenefit({ fiscalYear, ...(institutionId ? { institutionId } : {}) }).then(r => r.data),
    keepPreviousData: true,
  });

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1 text-gray-500">
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="input py-1.5 text-sm w-36">
          {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
        </select>
        <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="input py-1.5 text-sm w-48">
          <option value="">All Institutions</option>
          {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
        </select>
      </div>

      {rows.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Budget Absorption vs Achievement</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rows.slice(0, 10)} margin={{ top: 5, right: 20, bottom: 40, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="institution" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, name) => [`${v.toFixed(1)}%`, name]} />
              <Legend />
              <Bar dataKey="absorptionRate" name="Budget Absorption %" fill="#1d4ed8" radius={[4,4,0,0]} />
              <Bar dataKey="avgAchievement" name="Avg Achievement %" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Institution</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Budget</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Spent</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Absorption</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Achievement</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Efficiency</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Cost/Output</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? <LoadingRows cols={7} /> :
             isError ? <tr><td colSpan={7} className="text-center py-10 text-red-500">Failed to load cost-benefit data.</td></tr> :
             rows.length === 0 ? <tr><td colSpan={7} className="text-center py-10 text-gray-400">No budget data for this selection.</td></tr> :
             rows.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{row.institution}</td>
                <td className="px-4 py-3 text-right text-gray-600">{row.budget ? `${(row.budget / 1e6).toFixed(1)}M` : '—'}</td>
                <td className="px-4 py-3 text-right text-gray-600">{row.spent ? `${(row.spent / 1e6).toFixed(1)}M` : '—'}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${(row.absorptionRate ?? 0) >= 80 ? 'text-green-700' : (row.absorptionRate ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                    {row.absorptionRate !== null ? `${row.absorptionRate.toFixed(1)}%` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-medium ${(row.avgAchievement ?? 0) >= 100 ? 'text-green-700' : (row.avgAchievement ?? 0) >= 75 ? 'text-blue-600' : 'text-amber-600'}`}>
                    {row.avgAchievement !== null ? `${row.avgAchievement.toFixed(1)}%` : '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-800">
                  {row.efficiency !== null ? row.efficiency.toFixed(2) : '—'}
                </td>
                <td className="px-4 py-3 text-right text-gray-600">
                  {row.costPerOutput !== null ? `${(row.costPerOutput / 1e3).toFixed(0)}K` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 11: RBM LOGFRAME
// ══════════════════════════════════════════════════════════════════════════════
function RbmLogframeTab({ fiscalYear, setFiscalYear }) {
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });
  const [institutionId, setInstitutionId] = useState('');
  const [expandedObjectives, setExpandedObjectives] = useState({});
  const [expandedOutcomes, setExpandedOutcomes] = useState({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-rbm-logframe', fiscalYear, institutionId],
    queryFn: () => analyticsApi.rbmLogframe({ fiscalYear, ...(institutionId ? { institutionId } : {}) }).then(r => r.data),
    keepPreviousData: true,
  });

  const objectives = data?.objectives ?? [];

  const statusColors = {
    achieved: 'bg-green-100 text-green-800',
    on_track: 'bg-blue-100 text-blue-800',
    at_risk: 'bg-amber-100 text-amber-800',
    off_track: 'bg-red-100 text-red-800',
    no_data: 'bg-gray-100 text-gray-500',
  };

  function toggleObj(id) {
    setExpandedObjectives(p => ({ ...p, [id]: !p[id] }));
  }
  function toggleOut(id) {
    setExpandedOutcomes(p => ({ ...p, [id]: !p[id] }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1 text-gray-500">
          <FunnelIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="input py-1.5 text-sm w-36">
          {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
        </select>
        <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="input py-1.5 text-sm w-48">
          <option value="">All Institutions</option>
          {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="card animate-pulse h-64" />
      ) : isError ? (
        <div className="card text-center py-12 text-red-500">Failed to load logframe data.</div>
      ) : objectives.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">No results framework data available.</div>
      ) : (
        <div className="space-y-3">
          {objectives.map(obj => (
            <div key={obj.id} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleObj(obj.id)}
                className="w-full text-left px-5 py-4 bg-mit-blue text-white flex items-center justify-between hover:bg-blue-800 transition-colors"
              >
                <div>
                  <p className="text-xs text-blue-300 font-medium uppercase tracking-wider">Strategic Objective</p>
                  <p className="font-semibold mt-0.5">{obj.name}</p>
                </div>
                <span className="text-blue-300 ml-4">{expandedObjectives[obj.id] ? '▲' : '▼'}</span>
              </button>

              {expandedObjectives[obj.id] && (
                <div className="divide-y divide-gray-100">
                  {(obj.outcomes ?? []).map(outcome => (
                    <div key={outcome.id}>
                      <button
                        onClick={() => toggleOut(outcome.id)}
                        className="w-full text-left px-5 py-3 bg-blue-50 flex items-center justify-between hover:bg-blue-100 transition-colors"
                      >
                        <div>
                          <p className="text-xs text-blue-500 font-medium uppercase tracking-wider">Outcome</p>
                          <p className="text-sm font-medium text-blue-900">{outcome.name}</p>
                        </div>
                        <span className="text-blue-400 ml-4 text-sm">{expandedOutcomes[outcome.id] ? '▲' : '▼'}</span>
                      </button>

                      {expandedOutcomes[outcome.id] && (
                        <div className="px-5 py-3 space-y-4">
                          {(outcome.outputs ?? []).map(output => (
                            <div key={output.id} className="bg-gray-50 rounded-lg p-4">
                              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Output</p>
                              <p className="text-sm font-semibold text-gray-800 mb-3">{output.name}</p>

                              {(output.indicators ?? []).length > 0 && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-white">
                                        <th className="text-left px-3 py-2 font-medium text-gray-600 border border-gray-200">Indicator</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-20">Baseline</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-16">Q1 T</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-16">Q2 T</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-16">Q3 T</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-16">Q4 T</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-16">Q1 A</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-16">Q2 A</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-16">Q3 A</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-16">Q4 A</th>
                                        <th className="text-right px-3 py-2 font-medium text-gray-600 border border-gray-200 w-24">Achievement</th>
                                        <th className="px-3 py-2 font-medium text-gray-600 border border-gray-200 w-24">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {output.indicators.map((ind, idx) => (
                                        <tr key={idx} className="hover:bg-white">
                                          <td className="px-3 py-2 border border-gray-200 text-gray-800">
                                            {ind.code && <span className="font-mono text-gray-400 mr-1">[{ind.code}]</span>}
                                            {ind.name}
                                          </td>
                                          <td className="px-3 py-2 border border-gray-200 text-right text-gray-600">{ind.baseline ?? '—'}</td>
                                          {['Q1','Q2','Q3','Q4'].map(q => (
                                            <td key={q} className="px-3 py-2 border border-gray-200 text-right text-blue-700">{ind.targets?.[q] ?? '—'}</td>
                                          ))}
                                          {['Q1','Q2','Q3','Q4'].map(q => (
                                            <td key={q} className="px-3 py-2 border border-gray-200 text-right text-gray-800 font-medium">{ind.actuals?.[q] ?? '—'}</td>
                                          ))}
                                          <td className="px-3 py-2 border border-gray-200 text-right font-bold">
                                            <span className={
                                              (ind.achievement ?? 0) >= 100 ? 'text-green-700' :
                                              (ind.achievement ?? 0) >= 75 ? 'text-blue-700' :
                                              (ind.achievement ?? 0) >= 50 ? 'text-amber-600' : 'text-red-600'
                                            }>
                                              {ind.achievement !== null ? `${Math.round(ind.achievement)}%` : '—'}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 border border-gray-200">
                                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColors[ind.status] ?? statusColors.no_data}`}>
                                              {ind.status?.replace(/_/g, ' ') ?? 'No Data'}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                              {(output.indicators ?? []).length === 0 && (
                                <p className="text-xs text-gray-400 italic">No indicators linked to this output.</p>
                              )}
                            </div>
                          ))}
                          {(outcome.outputs ?? []).length === 0 && (
                            <p className="text-sm text-gray-400 italic">No outputs for this outcome.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {(obj.outcomes ?? []).length === 0 && (
                    <p className="px-5 py-4 text-sm text-gray-400 italic">No outcomes for this objective.</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 12: AI INSIGHTS
// ══════════════════════════════════════════════════════════════════════════════
function AiInsightsTab({ fiscalYear, setFiscalYear }) {
  const qc = useQueryClient();
  const [runningAlerts, setRunningAlerts] = useState(false);

  // Live refresh when a new submission/approval comes in
  useSocketEvent('dashboard:refresh', () => {
    qc.invalidateQueries({ queryKey: ['ai-anomalies'] });
    qc.invalidateQueries({ queryKey: ['ai-risks'] });
  });

  const { data: anomalyData, isLoading: aLoading } = useQuery({
    queryKey: ['ai-anomalies', fiscalYear],
    queryFn: () => analyticsApi.aiAnomalies({ fiscalYear }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: riskData, isLoading: rLoading } = useQuery({
    queryKey: ['ai-risks', fiscalYear],
    queryFn: () => analyticsApi.aiRiskScores({ fiscalYear }).then(r => r.data),
    keepPreviousData: true,
  });

  const anomalies = anomalyData?.anomalies ?? [];
  const risks = riskData?.risks ?? [];
  const critical = risks.filter(r => r.status === 'critical');
  const atRisk   = risks.filter(r => r.status === 'at_risk');

  const severityColor = { high: 'bg-red-100 text-red-800', medium: 'bg-amber-100 text-amber-800', low: 'bg-yellow-50 text-yellow-700' };
  const riskColor = { critical: 'text-red-700', at_risk: 'text-amber-600', watch: 'text-yellow-600', on_track: 'text-green-700' };
  const riskBg = { critical: 'bg-red-50 border-red-200', at_risk: 'bg-amber-50 border-amber-200', watch: 'bg-yellow-50 border-yellow-200', on_track: 'bg-green-50 border-green-200' };

  async function handleRunAlerts() {
    setRunningAlerts(true);
    try {
      const r = await analyticsApi.aiRunAlerts({ fiscalYear });
      toast.success(`AI scan complete: ${r.data.alertsCreated} alerts generated`);
      qc.invalidateQueries({ queryKey: ['notifications'] });
    } catch { toast.error('Alert scan failed'); }
    finally { setRunningAlerts(false); }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-600">AI-powered anomaly detection & risk scoring</span>
        </div>
        <div className="flex items-center gap-3">
          <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="input py-1.5 text-sm w-36">
            {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
          <button onClick={handleRunAlerts} disabled={runningAlerts}
            className="btn-primary flex items-center gap-2 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-60">
            <BoltIcon className="w-4 h-4" />
            {runningAlerts ? 'Scanning…' : 'Run AI Scan & Alert'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Anomalies Detected', value: anomalies.length, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Critical Risks',     value: critical.length,  color: 'text-red-700', bg: 'bg-red-50' },
          { label: 'At-Risk Indicators', value: atRisk.length,    color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'On Track',           value: risks.filter(r => r.status === 'on_track').length, color: 'text-green-700', bg: 'bg-green-50' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`card ${bg} text-center`}>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{aLoading || rLoading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Risk Scores */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ShieldExclamationIcon className="w-5 h-5 text-amber-500" />
          Indicator Risk Scores
          <span className="text-xs font-normal text-gray-400 ml-1">— sorted by highest risk first</span>
        </h3>
        {rLoading ? <div className="animate-pulse h-40 bg-gray-100 rounded" /> :
         risks.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No risk data — submit actuals first</p> : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {risks.slice(0, 20).map((r, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${riskBg[r.status] ?? ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {r.indicatorCode && <span className="font-mono text-gray-400 mr-1 text-xs">[{r.indicatorCode}]</span>}
                    {r.indicatorName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Achievement: {r.achievement !== null ? `${r.achievement.toFixed(1)}%` : '—'} ·
                    Missing periods: {r.missingPeriods}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-lg font-bold ${riskColor[r.status] ?? ''}`}>{r.riskScore}</p>
                  <p className="text-xs text-gray-400 capitalize">{r.status?.replace(/_/g, ' ')}</p>
                </div>
                <div className="w-24">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full ${r.riskScore >= 70 ? 'bg-red-500' : r.riskScore >= 40 ? 'bg-amber-400' : 'bg-green-500'}`}
                      style={{ width: `${r.riskScore}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anomalies */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          Data Anomalies
          <span className="text-xs font-normal text-gray-400 ml-1">— values outside expected range (z-score ≥ 2)</span>
        </h3>
        {aLoading ? <div className="animate-pulse h-40 bg-gray-100 rounded" /> :
         anomalies.length === 0 ? <p className="text-sm text-gray-400 text-center py-8">No anomalies detected — data looks consistent</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Indicator</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Institution</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Period</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Value</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Mean</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-600">Z-Score</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {anomalies.map((a, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-800">
                      {a.indicatorCode && <span className="font-mono text-xs text-gray-400 mr-1">[{a.indicatorCode}]</span>}
                      <span className="truncate">{a.indicatorName}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{a.institutionName}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{a.period}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${a.direction === 'above' ? 'text-blue-700' : 'text-red-600'}`}>
                      {a.value.toFixed(2)} {a.direction === 'above' ? '↑' : '↓'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{a.mean.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-gray-800">{a.zScore.toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityColor[a.severity] ?? ''}`}>
                        {a.severity}
                      </span>
                    </td>
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

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'trends', label: 'Trends' },
  { key: 'rankings', label: 'Rankings' },
  { key: 'forecasting', label: 'Forecasting' },
  { key: 'matrix', label: 'Performance Matrix' },
  { key: 'pivot', label: 'Pivot Table' },
  { key: 'descriptive', label: 'Descriptive Stats' },
  { key: 'variance', label: 'Variance Analysis' },
  { key: 'disaggregation', label: 'Disaggregation' },
  { key: 'costbenefit', label: 'Cost-Benefit' },
  { key: 'rbm', label: 'RBM Logframe' },
  { key: 'ai', label: '✦ AI Insights' },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('summary');
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [period, setPeriod] = useState('Q1');

  const sharedFilterTabs = ['summary', 'rankings', 'matrix', 'variance'];
  const tabsWithOwnFilters = ['trends', 'forecasting', 'pivot', 'descriptive', 'disaggregation', 'costbenefit', 'rbm', 'ai'];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="w-7 h-7 text-blue-600" />
            Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">Performance insights and trend analysis</p>
        </div>

        {/* Shared filters: shown only for tabs that use them */}
        {sharedFilterTabs.includes(activeTab) && (
          <FilterBar
            fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
            period={period} setPeriod={setPeriod}
            showPeriod={!['summary', 'costbenefit', 'rbm'].includes(activeTab)}
          />
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'summary' && <SummaryTab fiscalYear={fiscalYear} period={period} />}
      {activeTab === 'trends' && <TrendsTab />}
      {activeTab === 'rankings' && (
        <RankingsTab
          fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
          period={period} setPeriod={setPeriod}
        />
      )}
      {activeTab === 'forecasting' && <ForecastingTab />}
      {activeTab === 'matrix' && (
        <PerformanceMatrixTab
          fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
          period={period} setPeriod={setPeriod}
        />
      )}
      {activeTab === 'pivot' && <PivotTableTab />}
      {activeTab === 'descriptive' && <DescriptiveTab />}
      {activeTab === 'variance' && (
        <VarianceTab
          fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
          period={period} setPeriod={setPeriod}
        />
      )}
      {activeTab === 'disaggregation' && <DisaggregationTab />}
      {activeTab === 'costbenefit' && (
        <CostBenefitTab fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} />
      )}
      {activeTab === 'rbm' && (
        <RbmLogframeTab fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} />
      )}
      {activeTab === 'ai' && (
        <AiInsightsTab fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} />
      )}
    </div>
  );
}
