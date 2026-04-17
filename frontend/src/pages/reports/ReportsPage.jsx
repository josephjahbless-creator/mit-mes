import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { reportsApi, institutionsApi, dataEntryApi, dashboardApi } from '../../api';
import {
  ArrowDownTrayIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

// ── Constants ──────────────────────────────────────────────────────────────────
const FISCAL_YEAR = getCurrentFiscalYear();
const PERIODS     = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const EXCLUDED    = ['MIT', 'MIT-HQ'];

// ── Performance colour helpers ─────────────────────────────────────────────────
function perfColors(v) {
  if (v == null) return { bg: 'bg-gray-100', text: 'text-gray-400', bar: 'bg-gray-300', hex: '#9ca3af', label: 'No Data' };
  if (v >= 90)   return { bg: 'bg-green-50',  text: 'text-green-700', bar: 'bg-green-500',  hex: '#16a34a', label: 'On Track'  };
  if (v >= 60)   return { bg: 'bg-amber-50',  text: 'text-amber-700', bar: 'bg-amber-400',  hex: '#d97706', label: 'Moderate'  };
  return               { bg: 'bg-red-50',    text: 'text-red-600',   bar: 'bg-red-500',    hex: '#dc2626', label: 'Off Track' };
}

// ── Shared UI atoms ────────────────────────────────────────────────────────────
function PerfBadge({ value, size = 'sm' }) {
  const c = perfColors(value);
  return (
    <span className={`${c.bg} ${c.text} font-bold rounded-md px-2 py-0.5 whitespace-nowrap border ${
      value == null ? 'border-gray-200' : value >= 90 ? 'border-green-200' : value >= 60 ? 'border-amber-200' : 'border-red-200'
    } ${size === 'lg' ? 'text-sm' : 'text-xs'}`}>
      {value != null ? `${value}%` : '—'}
    </span>
  );
}

function PerfBar({ value, className = 'w-24' }) {
  const pct = Math.min(Math.max(value || 0, 0), 100);
  const c   = perfColors(value);
  return (
    <div className={`${className} bg-gray-200 rounded-full h-1.5 shrink-0`}>
      <div
        className={`${c.bar} h-1.5 rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Sidebar entity button ──────────────────────────────────────────────────────
function EntityBtn({ active, onClick, children, indent = false, activeClass = 'bg-mit-blue text-white' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg text-xs transition-colors leading-snug ${
        indent ? 'pl-7 pr-3 py-1' : 'px-3 py-1.5'
      } ${active ? activeClass : 'text-gray-700 hover:bg-gray-100'}`}
    >
      {children}
    </button>
  );
}

// ── Indicator row ──────────────────────────────────────────────────────────────
function IndicatorRow({ ind, showOwner }) {
  const c = perfColors(ind.performance);
  return (
    <div className="flex items-center gap-2 py-2 px-4 border-t border-gray-100 hover:bg-indigo-50/40 transition-colors text-xs group">
      {/* Indent spacer */}
      <div className="w-12 shrink-0" />

      {/* Code */}
      <div className="w-28 shrink-0">
        <span className="font-mono text-[10px] text-gray-400 group-hover:text-mit-blue transition-colors">{ind.code}</span>
      </div>

      {/* Name + owner */}
      <div className="flex-1 min-w-0 pr-2">
        <p className="font-medium text-gray-800 leading-snug line-clamp-2">{ind.name}</p>
        {showOwner && ind.ownerName && (
          <span className={`inline-block mt-0.5 text-[10px] px-1.5 rounded font-semibold ${
            ind.ownerType === 'Institution' ? 'bg-blue-100 text-blue-600' :
            ind.ownerType === 'Department'  ? 'bg-teal-100 text-teal-600' :
                                              'bg-violet-100 text-violet-600'
          }`}>
            {ind.ownerName}
          </span>
        )}
      </div>

      {/* Unit */}
      <div className="w-14 text-center text-gray-400 shrink-0 text-[11px]">{ind.unit || '—'}</div>

      {/* Baseline */}
      <div className="w-20 text-right text-gray-400 shrink-0">
        {ind.baseline != null ? Number(ind.baseline).toLocaleString() : '—'}
      </div>

      {/* Target */}
      <div className="w-20 text-right text-gray-600 shrink-0 font-medium">
        {ind.target != null ? Number(ind.target).toLocaleString() : <span className="text-gray-300">—</span>}
      </div>

      {/* Actual */}
      <div className="w-20 text-right text-gray-900 shrink-0 font-bold">
        {ind.actual != null ? Number(ind.actual).toLocaleString() : <span className="text-gray-300 font-normal">—</span>}
      </div>

      {/* Performance */}
      <div className="w-36 flex items-center gap-2 shrink-0 justify-end">
        <PerfBar value={ind.performance} className="w-16" />
        <PerfBadge value={ind.performance} />
      </div>
    </div>
  );
}

// ── Output section ─────────────────────────────────────────────────────────────
function OutputSection({ op, collapsed, toggleRow, showOwner }) {
  const isOpen = !collapsed.has(`op-${op.id}`);
  const c      = perfColors(op.performance);

  return (
    <div className="border-t border-gray-200">
      {/* Output header */}
      <button
        onClick={() => toggleRow(`op-${op.id}`)}
        className="w-full flex items-center gap-2 py-2.5 px-4 pl-8 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-slate-400 shrink-0 mt-0.5">
          {isOpen ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-700 truncate">
            <span className="text-[10px] font-normal text-slate-400 mr-1 uppercase tracking-wide">Output</span>
            {op.name}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-gray-400">
            {op.indicators.length} indicator{op.indicators.length !== 1 ? 's' : ''}
            {op.activities.length > 0 && ` · ${op.activities.length} activit${op.activities.length !== 1 ? 'ies' : 'y'}`}
          </span>
          <PerfBar value={op.performance} className="w-20" />
          <PerfBadge value={op.performance} />
        </div>
      </button>

      {isOpen && (
        <div>
          {/* Activities list */}
          {op.activities.length > 0 && (
            <div className="mx-4 ml-12 my-2 rounded-lg bg-amber-50/60 border border-amber-100 p-3">
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Activities
              </p>
              <div className="space-y-1">
                {op.activities.map((act, i) => (
                  <div key={act.id} className="flex items-start gap-2 text-[11px] text-gray-700">
                    <span className="text-amber-300 shrink-0 font-mono mt-px">{String(i + 1).padStart(2, '0')}.</span>
                    <span className="leading-relaxed flex-1">{act.name}</span>
                    {act.isCritical && (
                      <span className="shrink-0 text-[9px] bg-red-100 text-red-600 font-bold px-1 rounded">Critical</span>
                    )}
                    {act.responsible && (
                      <span className="shrink-0 text-[10px] text-gray-400 italic ml-auto pl-2">{act.responsible}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indicators */}
          {op.indicators.length > 0 && (
            <>
              {/* Column headers */}
              <div className="flex items-center gap-2 py-1.5 px-4 bg-mit-blue/5 border-t border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <div className="w-12 shrink-0" />
                <div className="w-28 shrink-0">Code</div>
                <div className="flex-1">Indicator</div>
                <div className="w-14 text-center shrink-0">Unit</div>
                <div className="w-20 text-right shrink-0">Baseline</div>
                <div className="w-20 text-right shrink-0">Target</div>
                <div className="w-20 text-right shrink-0">Actual</div>
                <div className="w-36 text-right shrink-0">Performance</div>
              </div>
              {op.indicators.map(ind => (
                <IndicatorRow key={ind.id} ind={ind} showOwner={showOwner} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Outcome section ────────────────────────────────────────────────────────────
function OutcomeSection({ oc, collapsed, toggleRow, showOwner }) {
  const isOpen = !collapsed.has(`oc-${oc.id}`);

  return (
    <div className="border-t border-gray-200">
      <button
        onClick={() => toggleRow(`oc-${oc.id}`)}
        className="w-full flex items-center gap-2 py-2.5 px-4 pl-5 bg-teal-50/70 hover:bg-teal-100/60 transition-colors text-left"
      >
        <span className="text-teal-500 shrink-0">
          {isOpen ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-teal-900 truncate">
            <span className="text-[10px] font-normal text-teal-500 mr-1 uppercase tracking-wide">Outcome</span>
            {oc.name}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] text-gray-400">
            {oc.outputs.length} output{oc.outputs.length !== 1 ? 's' : ''}
          </span>
          <PerfBar value={oc.performance} className="w-24" />
          <PerfBadge value={oc.performance} />
        </div>
      </button>

      {isOpen && oc.outputs.map(op => (
        <OutputSection key={op.id} op={op} collapsed={collapsed} toggleRow={toggleRow} showOwner={showOwner} />
      ))}
    </div>
  );
}

// ── Objective section ──────────────────────────────────────────────────────────
function ObjectiveSection({ obj, collapsed, toggleRow, showOwner }) {
  const isOpen = !collapsed.has(obj.id);
  const c      = perfColors(obj.performance);

  return (
    <div className={`rounded-xl overflow-hidden border mb-3 shadow-sm ${
      obj.performance == null ? 'border-gray-200' :
      obj.performance >= 90  ? 'border-green-200' :
      obj.performance >= 60  ? 'border-amber-200' :
                               'border-red-200'
    }`}>
      {/* Objective header */}
      <button
        onClick={() => toggleRow(obj.id)}
        className={`w-full flex items-center gap-3 py-3.5 px-4 transition-colors text-left ${c.bg} hover:brightness-95`}
      >
        <span className={`${c.text} shrink-0`}>
          {isOpen ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold ${c.text} leading-snug`}>
            <span className="text-[10px] font-normal opacity-70 mr-1 uppercase tracking-wide">Objective</span>
            {obj.name}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-[10px] text-gray-500">
            {obj.outcomes.length} outcome{obj.outcomes.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <PerfBar value={obj.performance} className="w-28" />
            <PerfBadge value={obj.performance} size="lg" />
          </div>
        </div>
      </button>

      {/* Outcomes */}
      {isOpen && obj.outcomes.map(oc => (
        <OutcomeSection key={oc.id} oc={oc} collapsed={collapsed} toggleRow={toggleRow} showOwner={showOwner} />
      ))}
    </div>
  );
}

// ── Custom chart tooltip ───────────────────────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  const c = perfColors(v);
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs max-w-xs">
      <p className="font-semibold text-gray-700 mb-1 leading-snug">{payload[0].payload.fullName}</p>
      <p className={`font-bold text-base ${c.text}`}>{v != null ? `${v}%` : '—'}</p>
      <p className={`text-[10px] ${c.text}`}>{c.label}</p>
    </div>
  );
}

// ══ Main Page ══════════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const [selected,  setSelected]  = useState({ type: 'all', id: null, label: 'All Entities' });
  const [period,    setPeriod]    = useState('Annual');
  const [sideOpen,  setSideOpen]  = useState({ institutions: true, departments: false });
  const [collapsed, setCollapsed] = useState(new Set());

  const toggleSide = useCallback((key) => setSideOpen(s => ({ ...s, [key]: !s[key] })), []);
  const toggleRow  = useCallback((id) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  }), []);

  // ── Entity lists ─────────────────────────────────────────────────────────────
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn:  () => institutionsApi.list().then(r => r.data),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn:  () => dataEntryApi.listDepartments().then(r => r.data),
  });

  // ── Report query params ───────────────────────────────────────────────────────
  const reportParams = useMemo(() => {
    const p = { fiscalYear: FISCAL_YEAR, period };
    if (selected.type === 'institution') { p.ownerType = 'Institution'; p.ownerInstitutionId = selected.id; }
    if (selected.type === 'department')  { p.ownerType = 'Department';  p.ownerDepartmentId  = selected.id; }
    if (selected.type === 'unit')        { p.ownerType = 'Unit';        p.ownerUnitId        = selected.id; }
    return p;
  }, [selected, period]);

  const { data: report = {}, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['consolidated-report', reportParams],
    queryFn:  () => reportsApi.consolidated(reportParams).then(r => r.data),
    placeholderData: {
      objectives:  [],
      summary:     { total: 0, onTrack: 0, moderate: 0, offTrack: 0, noData: 0 },
      performance: null,
    },
    staleTime: 30_000,
  });

  const { data: industryData } = useQuery({
    queryKey: ['industry-statistics', FISCAL_YEAR],
    queryFn:  () => dashboardApi.industryStatistics({ fiscalYear: FISCAL_YEAR }).then(r => r.data),
    retry: false,
  });

  const objectives = report.objectives || [];
  const summary    = report.summary    || {};
  const overall    = report.performance;
  const bySector   = industryData?.bySector || [];
  const totals     = industryData?.totals   ?? {};
  const showOwner  = selected.type === 'all';

  // ── Expand / Collapse all ─────────────────────────────────────────────────────
  const allObjIds = useMemo(() => objectives.map(o => o.id), [objectives]);
  const expandAll  = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(() => setCollapsed(new Set(allObjIds)), [allObjIds]);

  // ── Chart data ────────────────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    objectives.map(obj => ({
      name:     obj.name.length > 22 ? obj.name.slice(0, 20) + '…' : obj.name,
      fullName: obj.name,
      performance: obj.performance,
      color:    perfColors(obj.performance).hex,
    })),
  [objectives]);

  // ── Export ────────────────────────────────────────────────────────────────────
  async function handleExport() {
    try {
      const body = { fiscalYear: FISCAL_YEAR, period };
      if (selected.type !== 'all') { body.type = selected.type; body.id = selected.id; }
      const res = await reportsApi.exportExcel(body);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a'); a.href = url;
      a.download = `MIT-MES-${FISCAL_YEAR}-${period}-${selected.label}.xlsx`;
      a.click();
      toast.success('Report downloaded');
    } catch { toast.error('Export failed'); }
  }

  const filteredInstitutions = institutions.filter(i => !EXCLUDED.includes(i.code));
  const overallC = perfColors(overall);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-4rem)] -mx-4 -mt-4 overflow-hidden">

      {/* ══ LEFT SIDEBAR ══ */}
      <div className="w-60 border-r border-gray-200 bg-white flex flex-col overflow-hidden shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter by Entity</p>
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
          {/* All */}
          <EntityBtn
            active={selected.type === 'all'}
            onClick={() => setSelected({ type: 'all', id: null, label: 'All Entities' })}
          >
            <span className="font-semibold">All Entities</span>
          </EntityBtn>

          {/* ── Institutions ── */}
          <div className="pt-2">
            <button
              onClick={() => toggleSide('institutions')}
              className="w-full flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600"
            >
              {sideOpen.institutions
                ? <ChevronDownIcon  className="w-3 h-3" />
                : <ChevronRightIcon className="w-3 h-3" />}
              Institutions
              <span className="ml-auto font-normal normal-case">{filteredInstitutions.length}</span>
            </button>
            {sideOpen.institutions && filteredInstitutions.map(inst => (
              <EntityBtn
                key={inst.id}
                active={selected.type === 'institution' && selected.id === inst.id}
                onClick={() => setSelected({ type: 'institution', id: inst.id, label: inst.code })}
                activeClass="bg-blue-50 text-mit-blue font-semibold"
              >
                <span className="inline-block w-14 font-mono text-[10px] text-gray-400 shrink-0">{inst.code}</span>
                <span className="truncate">{inst.name}</span>
              </EntityBtn>
            ))}
          </div>

          {/* ── MIT Departments & Units ── */}
          <div className="pt-2">
            <button
              onClick={() => toggleSide('departments')}
              className="w-full flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600"
            >
              {sideOpen.departments
                ? <ChevronDownIcon  className="w-3 h-3" />
                : <ChevronRightIcon className="w-3 h-3" />}
              MIT Departments
              <span className="ml-auto font-normal normal-case">{departments.length}</span>
            </button>
            {sideOpen.departments && departments.map(dept => (
              <div key={dept.id}>
                <EntityBtn
                  active={selected.type === 'department' && selected.id === dept.id}
                  onClick={() => setSelected({ type: 'department', id: dept.id, label: dept.code || dept.name })}
                  activeClass="bg-teal-50 text-teal-700 font-semibold"
                >
                  {dept.name}
                </EntityBtn>
                {dept.units?.map(unit => (
                  <EntityBtn
                    key={unit.id}
                    indent
                    active={selected.type === 'unit' && selected.id === unit.id}
                    onClick={() => setSelected({ type: 'unit', id: unit.id, label: unit.code || unit.name })}
                    activeClass="bg-violet-50 text-violet-700 font-semibold"
                  >
                    {unit.name}
                  </EntityBtn>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">

        {/* ── Top header bar ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 truncate">
                Consolidated Performance Report
              </h1>
              {selected.type !== 'all' && (
                <span className="shrink-0 text-xs font-semibold text-white bg-mit-blue px-2 py-0.5 rounded-full">
                  {selected.label}
                </span>
              )}
              {isFetching && !isLoading && (
                <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              FY {FISCAL_YEAR} · Auto-generated from submitted activity data · Read-only
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Period selector */}
            <div className="flex gap-0.5 bg-gray-100 rounded-lg p-1">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    period === p
                      ? 'bg-white text-mit-blue shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >{p}</button>
              ))}
            </div>

            <button onClick={() => refetch()} className="btn-secondary text-xs py-1.5 px-3" title="Refresh data">
              <ArrowPathIcon className="w-3.5 h-3.5" />
            </button>

            <button onClick={handleExport} className="btn-primary text-xs py-1.5">
              <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
              <div className="w-10 h-10 border-2 border-mit-blue border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Generating performance report…</p>
              <p className="text-xs">Aggregating data from activity submissions</p>
            </div>
          ) : (
            <>
              {/* ── Summary stat cards ── */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">

                {/* Overall performance — 2 cols */}
                <div className={`card col-span-2 sm:col-span-2 p-4 border-0 ${overallC.bg} flex items-center gap-4`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${overallC.text} opacity-80`}>
                      Overall Performance
                    </p>
                    <p className={`text-5xl font-black mt-1 ${overallC.text}`}>
                      {overall != null ? `${overall}%` : '—'}
                    </p>
                    <div className="mt-2">
                      <PerfBar value={overall} className="w-full" />
                    </div>
                    <p className={`text-[10px] mt-1.5 ${overallC.text} opacity-70`}>
                      {summary.total || 0} indicators · Period: {period} · {overallC.label}
                    </p>
                  </div>
                </div>

                {/* On Track */}
                <div className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-green-600">{summary.onTrack || 0}</p>
                    <p className="text-[10px] font-semibold text-gray-600">On Track</p>
                    <p className="text-[10px] text-gray-400">≥ 90%</p>
                  </div>
                </div>

                {/* Moderate */}
                <div className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-amber-600">{summary.moderate || 0}</p>
                    <p className="text-[10px] font-semibold text-gray-600">Moderate</p>
                    <p className="text-[10px] text-gray-400">60–89%</p>
                  </div>
                </div>

                {/* Off Track */}
                <div className="card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-red-600">{summary.offTrack || 0}</p>
                    <p className="text-[10px] font-semibold text-gray-600">Off Track</p>
                    <p className="text-[10px] text-gray-400">{'< 60%'}</p>
                  </div>
                </div>
              </div>

              {/* ── Performance chart (by objective) ── */}
              {chartData.length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-gray-800">Performance by Objective</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Aggregated from indicators via outputs and outcomes · {period}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />≥ 90%</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />60–89%</span>
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{'< 60%'}</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                        width={38}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={90} stroke="#16a34a" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value: '90%', fontSize: 9, fill: '#16a34a', position: 'insideTopRight' }} />
                      <ReferenceLine y={60} stroke="#d97706" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value: '60%', fontSize: 9, fill: '#d97706', position: 'insideTopRight' }} />
                      <Bar dataKey="performance" radius={[4, 4, 0, 0]} maxBarSize={60}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── Hierarchy controls ── */}
              {objectives.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-600">
                    {objectives.length} Objective{objectives.length !== 1 ? 's' : ''}
                    <span className="text-gray-400 font-normal ml-2">
                      → {objectives.reduce((a, o) => a + o.outcomes.length, 0)} Outcomes
                      → {objectives.reduce((a, o) => a + o.outcomes.reduce((b, c) => b + c.outputs.length, 0), 0)} Outputs
                    </span>
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <button onClick={expandAll}   className="hover:text-mit-blue transition-colors">Expand all</button>
                    <span>·</span>
                    <button onClick={collapseAll} className="hover:text-mit-blue transition-colors">Collapse all</button>
                  </div>
                </div>
              )}

              {/* ── Hierarchical tree ── */}
              {objectives.length === 0 ? (
                <div className="card p-12 text-center text-gray-400">
                  <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-4 opacity-25" />
                  <p className="text-base font-semibold text-gray-500">No performance data found</p>
                  <p className="text-sm mt-2 max-w-md mx-auto">
                    {selected.type === 'all'
                      ? 'Submit activity data through the Data Entry module to generate this report.'
                      : `No activity submissions found for "${selected.label}" in ${period} · FY ${FISCAL_YEAR}. Submit data through the Data Entry module first.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {objectives.map(obj => (
                    <ObjectiveSection
                      key={obj.id}
                      obj={obj}
                      collapsed={collapsed}
                      toggleRow={toggleRow}
                      showOwner={showOwner}
                    />
                  ))}
                </div>
              )}

              {/* ── Data source notice ── */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
                <InformationCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  This report is <strong>automatically generated</strong> from data submitted through the
                  Data Entry module. Performance figures update instantly when new submissions are approved.
                  No manual editing of reports is permitted.
                </p>
              </div>

              {/* ── Industry Statistics ── */}
              {bySector.length > 0 && (
                <div className="card">
                  <div className="flex items-center gap-2 mb-4">
                    <BuildingStorefrontIcon className="w-5 h-5 text-green-600" />
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">Industry Statistics by Sector</h2>
                      <p className="text-[10px] text-gray-400">Tanzania · FY {FISCAL_YEAR}</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase border-b bg-gray-50">
                          <th className="text-left py-2 px-3">Sector</th>
                          <th className="text-right py-2 px-3">Registered</th>
                          <th className="text-right py-2 px-3">Operating</th>
                          <th className="text-right py-2 px-3">Closed</th>
                          <th className="text-right py-2 px-3">New</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bySector.map(s => (
                          <tr key={s.sector} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="py-2 px-3 font-medium text-gray-800">{s.sector}</td>
                            <td className="py-2 px-3 text-right">{s.totalRegistered.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-green-600 font-medium">{s.operating.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-red-500">{s.closed.toLocaleString()}</td>
                            <td className="py-2 px-3 text-right text-amber-600 font-semibold">{s.newRegistered.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t-2 bg-gray-50 font-semibold text-gray-800 text-sm">
                        <tr>
                          <td className="py-2 px-3">Total</td>
                          <td className="py-2 px-3 text-right">{(totals.totalRegistered ?? 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-green-600">{(totals.operating ?? 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-red-500">{(totals.closed ?? 0).toLocaleString()}</td>
                          <td className="py-2 px-3 text-right text-amber-600">{(totals.newRegistered ?? 0).toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
