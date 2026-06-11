import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RocketLaunchIcon, BuildingLibraryIcon, MapPinIcon, BanknotesIcon,
  CheckCircleIcon, ExclamationTriangleIcon, ArrowTrendingUpIcon,
  XMarkIcon, ClipboardDocumentCheckIcon, SparklesIcon, BriefcaseIcon,
} from '@heroicons/react/24/outline';
import { flagshipsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import ProjectsTabs from '../../components/ProjectsTabs';

// ── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  on_track:  { label: 'On Track',  color: 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40', bar: 'bg-green-500' },
  at_risk:   { label: 'At Risk',   color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40', bar: 'bg-amber-500' },
  off_track: { label: 'Off Track', color: 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40',       bar: 'bg-red-500' },
  completed: { label: 'Completed', color: 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40',    bar: 'bg-blue-500' },
};

function formatUSD(value) {
  const n = Number(value || 0);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function parseFocusAreas(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

// ── Progress ring ────────────────────────────────────────────────────────────
function ProgressRing({ value = 0, status = 'on_track' }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  const strokeColor = {
    on_track: '#22c55e', at_risk: '#f59e0b', off_track: '#ef4444', completed: '#3b82f6',
  }[status] || '#22c55e';

  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="6" className="stroke-gray-200 dark:stroke-gray-700" />
        <circle
          cx="32" cy="32" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          stroke={strokeColor} strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-700 dark:text-gray-200">
        {pct}%
      </span>
    </div>
  );
}

// ── Sparkline (tiny inline SVG trend) ──────────────────────────────────────────
function Sparkline({ points = [], status = 'on_track' }) {
  if (!points || points.length < 2) {
    return (
      <p className="text-[10px] text-gray-400 dark:text-gray-500 italic mt-3">
        Trend appears as nightly snapshots accumulate
      </p>
    );
  }
  const w = 200;
  const h = 32;
  const vals = points.map((p) => Number(p.value) || 0);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const stepX = w / (vals.length - 1);
  const coords = vals.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y];
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const stroke = { on_track: '#22c55e', at_risk: '#f59e0b', off_track: '#ef4444', completed: '#3b82f6' }[status] || '#22c55e';
  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400 dark:text-gray-500">Achievement trend</span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">{points.length} pts</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={lastX} cy={lastY} r="2.5" fill={stroke} />
      </svg>
    </div>
  );
}

// ── Flagship card ────────────────────────────────────────────────────────────
function FlagshipCard({ obj, onOpen }) {
  const stats = obj.stats || {};
  const status = stats.status || 'on_track';
  const style = STATUS_STYLES[status] || STATUS_STYLES.on_track;

  return (
    <button
      onClick={() => onOpen(obj)}
      className="text-left bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all"
    >
      <div className="flex items-start gap-4">
        <ProgressRing value={stats.current_progress || 0} status={status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">{obj.code}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.color}`}>{style.label}</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug line-clamp-2">{obj.name}</h3>
          {obj.flagship_badge && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{obj.flagship_badge}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg py-2">
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">{stats.projects_total ?? 0}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Projects</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg py-2">
          <p className="text-base font-bold text-amber-600 dark:text-amber-400">{stats.projects_at_risk ?? 0}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">At Risk</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg py-2">
          <p className="text-base font-bold text-blue-600 dark:text-blue-400">{formatUSD(obj.estimated_investment_usd)}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Investment</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 text-xs text-gray-500 dark:text-gray-400">
        <MapPinIcon className="w-3.5 h-3.5" />
        <span className="truncate">{obj.geographical_focus || '—'}</span>
      </div>

      <Sparkline points={stats.trend} status={status} />
    </button>
  );
}

// ── Detail drawer ────────────────────────────────────────────────────────────
function FlagshipDrawer({ objectiveId, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['flagship', objectiveId],
    queryFn: () => flagshipsApi.getObjective(objectiveId).then(r => r.data.data),
    enabled: !!objectiveId,
  });

  const focusAreas = parseFocusAreas(data?.key_focus_areas);
  const projects = data?.projectObjectives || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-mit-blue text-white px-6 py-4 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-blue-200">{data?.code}</p>
            <h2 className="font-bold text-lg leading-tight">{data?.name || 'Loading…'}</h2>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white ml-3">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading flagship details…</div>
        ) : (
          <div className="p-6 space-y-6">
            {data?.vision_statement && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <p className="text-sm italic text-gray-700 dark:text-gray-300">"{data.vision_statement}"</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <BanknotesIcon className="w-4 h-4" /> Investment
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100">{formatUSD(data?.estimated_investment_usd)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                  <MapPinIcon className="w-4 h-4" /> Region
                </div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{data?.geographical_focus || '—'}</p>
              </div>
            </div>

            {data?.description && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">Description</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{data.description}</p>
              </div>
            )}

            {focusAreas.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2">Key Focus Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {focusAreas.map((area, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-2 flex items-center gap-1.5">
                <BriefcaseIcon className="w-4 h-4" /> Linked Projects ({projects.length})
              </h4>
              {projects.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                  No projects linked yet. Link projects from the Projects page to enable automatic progress tracking.
                </p>
              ) : (
                <div className="space-y-2">
                  {projects.map((po) => (
                    <div key={po.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{po.project?.name}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize">
                          {po.contribution_type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Weighting: {Number(po.weighting)}%
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Integration status strip ───────────────────────────────────────────────────
function IntegrationStatusStrip() {
  const { data } = useQuery({
    queryKey: ['integration-status'],
    queryFn: () => flagshipsApi.integrationStatus().then(r => r.data.data),
  });
  if (!data) return null;

  const items = [
    { label: 'Flagships', value: data.strategic_objectives, icon: RocketLaunchIcon },
    { label: 'Linked Projects', value: data.linked_projects, icon: BriefcaseIcon },
    { label: 'Activity→Indicator Links', value: data.activity_indicator_mappings, icon: ArrowTrendingUpIcon },
    { label: 'Auto-Calculated', value: data.auto_calculated_percentage, icon: SparklesIcon },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((it) => (
        <div key={it.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
            <it.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{it.value ?? 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{it.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Foundational reforms section ───────────────────────────────────────────────
function ReformsSection() {
  const { data: reforms = [] } = useQuery({
    queryKey: ['foundational-reforms'],
    queryFn: () => flagshipsApi.listReforms().then(r => r.data.data),
  });

  if (reforms.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
        <ClipboardDocumentCheckIcon className="w-5 h-5 text-mit-blue dark:text-blue-400" />
        Foundational Reforms
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Enabling reforms that support all flagship programmes.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {reforms.map((r) => (
          <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-semibold text-mit-gold">{r.code}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>
                {r.status}
              </span>
            </div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-snug">{r.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{r.institution_responsible}</p>
            {r.recommendations && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{r.recommendations}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FlagshipsPage() {
  const [selected, setSelected] = useState(null);
  const user = useAuthStore(s => s.user);
  const canAdmin = ['super_admin', 'admin', 'me_officer'].includes(user?.role);

  const { data: flagships = [], isLoading, isError } = useQuery({
    queryKey: ['flagship-dashboard'],
    queryFn: () => flagshipsApi.dashboard().then(r => r.data.data),
    refetchInterval: 60_000,
  });

  return (
    <div className="max-w-7xl mx-auto">
      <ProjectsTabs />
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <RocketLaunchIcon className="w-7 h-7 text-mit-blue dark:text-blue-400" />
          Dira ya Taifa 2050 — Strategic Flagships
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Seven strategic flagship programmes driving Tanzania's industrial transformation. Progress updates automatically as linked activities are completed.
        </p>
      </div>

      {canAdmin && <IntegrationStatusStrip />}

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading flagships…</div>
      ) : isError ? (
        <div className="text-center py-16">
          <ExclamationTriangleIcon className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400">Unable to load flagship data. Please try again.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {flagships.map((obj) => (
            <FlagshipCard key={obj.id} obj={obj} onOpen={(o) => setSelected(o.id)} />
          ))}
        </div>
      )}

      <ReformsSection />

      {selected && <FlagshipDrawer objectiveId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
