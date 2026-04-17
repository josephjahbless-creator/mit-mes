import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import {
  ChartBarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  MinusSmallIcon, TrophyIcon, ExclamationTriangleIcon,
  XCircleIcon, CheckCircleIcon, FunnelIcon,
} from '@heroicons/react/24/outline';
import { analyticsApi, indicatorsApi, institutionsApi } from '../../api';
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
// TAB 1 — SUMMARY
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
                  : 'Low compliance — action needed'
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
// TAB 2 — TRENDS
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
// TAB 3 — RANKINGS
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
// TAB 4 — FORECASTING
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
// TAB 5 — PERFORMANCE MATRIX
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
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'trends', label: 'Trends' },
  { key: 'rankings', label: 'Rankings' },
  { key: 'forecasting', label: 'Forecasting' },
  { key: 'matrix', label: 'Performance Matrix' },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('summary');
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [period, setPeriod] = useState('Q1');

  // Tabs that use the shared top-level filters
  const sharedFilterTabs = ['summary', 'rankings', 'matrix'];

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

        {/* Shared filters — shown only for tabs that use them */}
        {sharedFilterTabs.includes(activeTab) && (
          <FilterBar
            fiscalYear={fiscalYear} setFiscalYear={setFiscalYear}
            period={period} setPeriod={setPeriod}
            showPeriod={activeTab !== 'summary'}
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
    </div>
  );
}
