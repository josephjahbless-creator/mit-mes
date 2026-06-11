import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LinkIcon, ArrowPathIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon,
  SparklesIcon, CheckCircleIcon, ChartBarIcon, BoltIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { indicatorsApi, flagshipsApi } from '../../api';
import ProjectsTabs from '../../components/ProjectsTabs';

const AGGREGATION_METHODS = [
  { value: 'sum',              label: 'Sum',              hint: 'Total of all activity values' },
  { value: 'average',          label: 'Average',          hint: 'Mean of activity values' },
  { value: 'weighted_average', label: 'Weighted Average', hint: 'Values × weights' },
  { value: 'count',            label: 'Count',            hint: 'Number of reporting activities' },
  { value: 'percentage',       label: 'Percentage',       hint: '% of activities completed' },
];

const CONTRIBUTION_TYPES = [
  { value: 'direct', label: 'Direct' },
  { value: 'indirect', label: 'Indirect' },
  { value: 'supporting', label: 'Supporting' },
];

// ── Activity picker (searchable) ───────────────────────────────────────────────
function ActivityPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const { data: activities = [] } = useQuery({
    queryKey: ['activities-lite', search],
    queryFn: () => flagshipsApi.activitiesLite({ search, take: 20 }).then(r => r.data.data),
  });

  return (
    <div>
      <div className="relative mb-2">
        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>
      <div className="max-h-44 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
        {activities.length === 0 ? (
          <p className="text-xs text-gray-400 p-3">No activities found.</p>
        ) : activities.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a)}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${value?.id === a.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {value?.id === a.id && <CheckCircleIcon className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
            {a.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Add-mapping form ───────────────────────────────────────────────────────────
function AddMappingForm({ indicatorId, onDone }) {
  const qc = useQueryClient();
  const [activity, setActivity] = useState(null);
  const [aggregationMethod, setAggregationMethod] = useState('sum');
  const [contributionType, setContributionType] = useState('direct');
  const [weighting, setWeighting] = useState(100);

  const mutation = useMutation({
    mutationFn: () => flagshipsApi.createMapping({
      activityId: activity.id,
      indicatorId,
      aggregationMethod,
      contributionType,
      weighting: Number(weighting),
    }),
    onSuccess: () => {
      toast.success('Activity linked to indicator');
      qc.invalidateQueries({ queryKey: ['indicator-mappings', indicatorId] });
      qc.invalidateQueries({ queryKey: ['integration-status'] });
      setActivity(null);
      onDone?.();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create mapping'),
  });

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-1.5">
        <PlusIcon className="w-4 h-4" /> Link an Activity
      </h4>
      <ActivityPicker value={activity} onChange={setActivity} />

      <div className="grid grid-cols-2 gap-3 mt-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Aggregation</label>
          <select
            value={aggregationMethod}
            onChange={(e) => setAggregationMethod(e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {AGGREGATION_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {AGGREGATION_METHODS.find(m => m.value === aggregationMethod)?.hint}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Contribution</label>
          <select
            value={contributionType}
            onChange={(e) => setContributionType(e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {CONTRIBUTION_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {aggregationMethod === 'weighted_average' && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Weighting (%)</label>
          <input
            type="number" min="0" max="100" value={weighting}
            onChange={(e) => setWeighting(e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        </div>
      )}

      <button
        disabled={!activity || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="mt-4 w-full bg-mit-blue text-white text-sm font-medium py-2 rounded-lg disabled:opacity-40 hover:bg-blue-800 transition-colors"
      >
        {mutation.isPending ? 'Linking…' : 'Create Mapping'}
      </button>
    </div>
  );
}

// ── Existing mappings list ─────────────────────────────────────────────────────
function MappingsList({ indicatorId }) {
  const qc = useQueryClient();
  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['indicator-mappings', indicatorId],
    queryFn: () => flagshipsApi.listMappings(indicatorId).then(r => r.data.data),
  });

  const del = useMutation({
    mutationFn: (id) => flagshipsApi.deleteMapping(id),
    onSuccess: () => {
      toast.success('Mapping removed');
      qc.invalidateQueries({ queryKey: ['indicator-mappings', indicatorId] });
      qc.invalidateQueries({ queryKey: ['integration-status'] });
    },
    onError: () => toast.error('Failed to remove mapping'),
  });

  if (isLoading) return <p className="text-sm text-gray-400 p-2">Loading mappings…</p>;
  if (mappings.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-gray-500 italic p-2">No activities linked yet.</p>;
  }

  return (
    <div className="space-y-2">
      {mappings.map((m) => (
        <div key={m.id} className="flex items-center gap-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.activity?.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">{m.aggregation_method}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 capitalize">{m.contribution_type}</span>
              {m.aggregation_method === 'weighted_average' && (
                <span className="text-[10px] text-gray-400">w: {Number(m.weighting)}%</span>
              )}
            </div>
          </div>
          <button
            onClick={() => del.mutate(m.id)}
            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
            title="Remove mapping"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Recalculation panel ────────────────────────────────────────────────────────
function RecalcPanel({ indicatorId }) {
  const qc = useQueryClient();
  const [result, setResult] = useState(null);

  const { data: perf = [] } = useQuery({
    queryKey: ['indicator-performance', indicatorId],
    queryFn: () => flagshipsApi.indicatorPerformance(indicatorId).then(r => r.data.data),
  });

  const recalc = useMutation({
    mutationFn: () => flagshipsApi.recalculateIndicator(indicatorId, {}),
    onSuccess: (r) => {
      const d = r.data.data;
      setResult(d);
      if (d) {
        toast.success('Indicator recalculated automatically');
      } else {
        toast('No active mappings to calculate from', { icon: 'ℹ️' });
      }
      qc.invalidateQueries({ queryKey: ['indicator-performance', indicatorId] });
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Recalculation failed'),
  });

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
          <BoltIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Automatic Calculation
        </h4>
        <button
          onClick={() => recalc.mutate()}
          disabled={recalc.isPending}
          className="flex items-center gap-1.5 text-xs bg-mit-blue text-white px-3 py-1.5 rounded-lg disabled:opacity-50 hover:bg-blue-800 transition-colors"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${recalc.isPending ? 'animate-spin' : ''}`} />
          Recalculate Now
        </button>
      </div>

      {result && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{Number(result.actual_value).toFixed(1)}</p>
            <p className="text-[10px] text-gray-500">Value</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{Number(result.achievement_percentage).toFixed(0)}%</p>
            <p className="text-[10px] text-gray-500">Achievement</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{result.contributing_activities}</p>
            <p className="text-[10px] text-gray-500">Activities</p>
          </div>
        </div>
      )}

      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Recent auto-calculated values</p>
      {perf.length === 0 ? (
        <p className="text-xs text-gray-400 italic">No calculations yet — link activities, then recalculate.</p>
      ) : (
        <div className="space-y-1">
          {perf.slice(0, 5).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs bg-white/60 dark:bg-gray-800/60 rounded px-2 py-1">
              <span className="text-gray-600 dark:text-gray-400">{p.period}</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{Number(p.actual_value).toFixed(1)}</span>
              <span className="text-gray-400">conf. {Number(p.confidence_score).toFixed(0)}%</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">auto</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function StrategicMappingPage() {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const { data: indicators = [] } = useQuery({
    queryKey: ['indicators-for-mapping'],
    queryFn: () => indicatorsApi.list().then(r => (Array.isArray(r.data) ? r.data : r.data.data || [])),
  });

  const filtered = indicators.filter((ind) =>
    `${ind.name} ${ind.code}`.toLowerCase().includes(search.toLowerCase())
  );
  const selected = indicators.find((i) => i.id === selectedId);

  return (
    <div className="max-w-7xl mx-auto">
      <ProjectsTabs />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <LinkIcon className="w-7 h-7 text-mit-blue dark:text-blue-400" />
          Activity → Indicator Mapping
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Link activities to performance indicators so indicator values update automatically when activities are completed — no manual data entry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Indicator list */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search indicators…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto space-y-1">
              {filtered.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => setSelectedId(ind.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedId === ind.id ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'}`}
                >
                  <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400">{ind.code}</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">{ind.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detail / mapping editor */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-12 text-center">
              <ChartBarIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Select an indicator to manage its activity mappings.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400">{selected.code}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{selected.unit}</span>
                </div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">{selected.name}</h2>
              </div>

              <RecalcPanel indicatorId={selected.id} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-1.5">
                    <SparklesIcon className="w-4 h-4" /> Linked Activities
                  </h3>
                  <MappingsList indicatorId={selected.id} />
                </div>
                <AddMappingForm indicatorId={selected.id} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
