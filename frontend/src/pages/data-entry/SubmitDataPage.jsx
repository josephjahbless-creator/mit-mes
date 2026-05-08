import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { frameworkApi, indicatorsApi, dataEntryApi, institutionsApi } from '../../api';
import api from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import {
  CheckCircleIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon,
  BuildingOfficeIcon, UserGroupIcon, DocumentIcon,
  ExclamationTriangleIcon, LockClosedIcon, PaperClipIcon,
  CalendarDaysIcon, ArrowLeftIcon, ShieldExclamationIcon,
  XMarkIcon, MagnifyingGlassIcon, InformationCircleIcon,
  ArrowPathIcon, CheckBadgeIcon, Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';
import { FORMULA_META, previewCalculate, statusColor, statusBadge } from '../../utils/formulaMeta';

// ── Constants ──────────────────────────────────────────────────────────────────
const FISCAL_YEAR   = getCurrentFiscalYear();
const PERIODS       = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const PERIOD_META   = {
  Q1:     { label: 'Q1',     desc: 'Jul – Sep',  color: 'blue' },
  Q2:     { label: 'Q2',     desc: 'Oct – Dec',  color: 'indigo' },
  Q3:     { label: 'Q3',     desc: 'Jan – Mar',  color: 'violet' },
  Q4:     { label: 'Q4',     desc: 'Apr – Jun',  color: 'emerald' },
  Annual: { label: 'Annual', desc: 'Full Year',  color: 'amber' },
};
const P_KEY = { Q1:'q1Target', Q2:'q2Target', Q3:'q3Target', Q4:'q4Target', Annual:'annualTarget' };

function wordCount(t) { return (!t || !t.trim()) ? 0 : t.trim().split(/\s+/).length; }

// ── Step indicator ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Reporting Entity',  short: 'Entity' },
  { id: 2, label: 'Reporting Period',  short: 'Period' },
  { id: 3, label: 'Implementation',    short: 'Framework' },
  { id: 4, label: 'Progress & Data',   short: 'Data' },
];

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
      {STEPS.map((s, i) => {
        const done    = s.id < current;
        const active  = s.id === current;
        const future  = s.id > current;
        return (
          <div key={s.id} className="flex items-center flex-1 min-w-0">
            <div className={`flex flex-col items-center flex-1 min-w-0 ${future ? 'opacity-40' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1.5 transition-all ${
                done   ? 'bg-green-500 text-white ring-2 ring-green-200' :
                active ? 'bg-mit-blue text-white ring-2 ring-blue-200 shadow-md shadow-blue-200' :
                         'bg-gray-100 text-gray-400'
              }`}>
                {done ? <CheckCircleIcon className="w-4.5 h-4.5 w-5 h-5" /> : s.id}
              </div>
              <p className={`text-[10px] font-semibold text-center leading-tight hidden sm:block ${
                active ? 'text-mit-blue' : done ? 'text-green-600' : 'text-gray-400'
              }`}>{s.short}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-full max-w-[32px] mx-0.5 rounded-full transition-all ${
                current > s.id ? 'bg-green-400' : 'bg-gray-100'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Entity Card ────────────────────────────────────────────────────────────────
function EntityCard({ entity, type, selected, onClick }) {
  const colors = {
    institution: { border: 'border-blue-400',   bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
    department:  { border: 'border-indigo-400', bg: 'bg-indigo-50', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
    unit:        { border: 'border-violet-400', bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  };
  const c = colors[type] || colors.institution;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all hover:shadow-md ${
        selected
          ? `${c.border} ${c.bg} shadow-sm`
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full shrink-0 ${selected ? c.dot : 'bg-gray-200'}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${selected ? 'text-gray-900' : 'text-gray-700'}`}>
            {entity.name}
          </p>
          <p className="text-[11px] text-gray-400 font-mono">{entity.code}</p>
        </div>
        {selected && (
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badge}`}>
            Selected
          </span>
        )}
      </div>
    </button>
  );
}

// ── Framework Tree ─────────────────────────────────────────────────────────────
// Displays objectives → outputs → activities/indicators as an expandable tree.
// User selects ONE activity and ONE indicator.
function FrameworkTree({ chain, selectedActivity, selectedIndicator, onSelectActivity, onSelectIndicator }) {
  const [openObjs, setOpenObjs]   = useState({});
  const [openOuts, setOpenOuts]   = useState({});
  const [indSearch, setIndSearch] = useState('');

  // Auto-expand first objective on mount
  useEffect(() => {
    if (chain.length > 0 && Object.keys(openObjs).length === 0) {
      setOpenObjs({ [chain[0].id]: true });
      if (chain[0].outputs?.length > 0) {
        setOpenOuts({ [chain[0].outputs[0].id]: true });
      }
    }
  }, [chain]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleObj = (id) => setOpenObjs(p => ({ ...p, [id]: !p[id] }));
  const toggleOut = (id) => setOpenOuts(p => ({ ...p, [id]: !p[id] }));

  if (chain.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-200 py-10 text-center space-y-2">
        <InformationCircleIcon className="w-10 h-10 mx-auto text-gray-300" />
        <p className="text-sm font-medium text-gray-400">No framework data found for this entity</p>
        <p className="text-xs text-gray-300">Contact your M&E officer to set up indicators</p>
      </div>
    );
  }

  // Which output does the selected activity belong to?
  const selActOutputId = useMemo(() => {
    if (!selectedActivity) return null;
    for (const obj of chain) {
      for (const out of obj.outputs || []) {
        if (out.activities?.some(a => a.id === selectedActivity)) return out.id;
      }
    }
    return null;
  }, [chain, selectedActivity]);

  return (
    <div className="space-y-3">
      {chain.map((obj, oi) => {
        const isObjOpen = !!openObjs[obj.id];
        const totalInds = obj.outputs?.reduce((s, op) => s + (op.indicators?.length || 0), 0) || 0;
        const totalActs = obj.outputs?.reduce((s, op) => s + (op.activities?.length || 0), 0) || 0;

        return (
          <div key={obj.id} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Objective header */}
            <button
              type="button"
              onClick={() => toggleObj(obj.id)}
              className="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-left hover:from-blue-700 hover:to-blue-800 transition-colors"
            >
              <span className="shrink-0 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                {String.fromCharCode(65 + oi)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-snug line-clamp-1">{obj.name}</p>
                <p className="text-[11px] text-blue-200 mt-0.5">
                  {obj.outputs?.length || 0} performance targets · {totalActs} activities · {totalInds} indicators
                </p>
              </div>
              {isObjOpen
                ? <ChevronUpIcon className="w-4 h-4 text-white/70 shrink-0" />
                : <ChevronDownIcon className="w-4 h-4 text-white/70 shrink-0" />
              }
            </button>

            {isObjOpen && (
              <div className="divide-y divide-gray-100">
                {(obj.outputs || []).map((out, outIdx) => {
                  const isOutOpen = !!openOuts[out.id];
                  const hasSelection = selActOutputId === out.id || out.indicators?.some(i => i.id === selectedIndicator);

                  return (
                    <div key={out.id} className={hasSelection ? 'ring-1 ring-inset ring-emerald-300' : ''}>
                      {/* Output header */}
                      <button
                        type="button"
                        onClick={() => toggleOut(out.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          hasSelection ? 'bg-emerald-50 hover:bg-emerald-100/60' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <span className={`shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                          hasSelection ? 'bg-emerald-500 text-white' : 'bg-indigo-100 text-indigo-600'
                        }`}>{outIdx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold leading-snug line-clamp-2 ${hasSelection ? 'text-emerald-800' : 'text-gray-700'}`}>
                            {out.name}
                          </p>
                          {out.outcomeName && (
                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">Outcome: {out.outcomeName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded-full">
                            {out.activities?.length || 0} act · {out.indicators?.length || 0} ind
                          </span>
                          {isOutOpen
                            ? <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400" />
                            : <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
                          }
                        </div>
                      </button>

                      {isOutOpen && (
                        <div className="px-4 pb-4 pt-3 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">

                          {/* Activities column */}
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Squares2X2Icon className="w-3 h-3" /> Planned Activities
                            </p>
                            <div className="space-y-1.5">
                              {(out.activities || []).length === 0 && (
                                <p className="text-xs text-gray-300 italic">No activities linked</p>
                              )}
                              {(out.activities || []).map((act, ai) => {
                                const sel = act.id === selectedActivity;
                                return (
                                  <button
                                    key={act.id}
                                    type="button"
                                    onClick={() => onSelectActivity(sel ? '' : act.id)}
                                    className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-all ${
                                      sel
                                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold shadow-sm'
                                        : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 text-gray-700'
                                    }`}
                                  >
                                    <span className={`inline-block w-4 h-4 rounded-full text-[9px] font-bold mr-1.5 text-center leading-4 ${
                                      sel ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>{ai + 1}</span>
                                    {act.name}
                                    {sel && <CheckCircleIcon className="w-3.5 h-3.5 inline ml-1 text-emerald-500" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Indicators column */}
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <CheckBadgeIcon className="w-3 h-3" /> Performance Indicators
                            </p>
                            {(out.indicators || []).length === 0 && (
                              <p className="text-xs text-gray-300 italic">No indicators linked</p>
                            )}
                            {/* Search if many indicators */}
                            {(out.indicators || []).length > 4 && (
                              <div className="relative mb-2">
                                <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                                <input
                                  type="text"
                                  className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-6 pr-3 py-1.5 text-xs outline-none focus:border-blue-300"
                                  placeholder="Search indicators…"
                                  value={indSearch}
                                  onChange={e => setIndSearch(e.target.value)}
                                />
                              </div>
                            )}
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                              {(out.indicators || [])
                                .filter(i => !indSearch || i.name.toLowerCase().includes(indSearch.toLowerCase()) || i.code.toLowerCase().includes(indSearch.toLowerCase()))
                                .map(ind => {
                                  const sel = ind.id === selectedIndicator;
                                  return (
                                    <button
                                      key={ind.id}
                                      type="button"
                                      onClick={() => onSelectIndicator(sel ? '' : ind.id)}
                                      className={`w-full text-left rounded-lg border px-3 py-2 text-xs transition-all ${
                                        sel
                                          ? 'border-violet-400 bg-violet-50 text-violet-800 font-semibold shadow-sm'
                                          : 'border-gray-100 hover:border-violet-200 hover:bg-violet-50/40 text-gray-700'
                                      }`}
                                    >
                                      <div className="flex items-start gap-2">
                                        <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono mt-0.5 ${
                                          sel ? 'bg-violet-200 text-violet-800' : 'bg-gray-100 text-gray-500'
                                        }`}>{ind.code}</span>
                                        <span className="leading-snug">{ind.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 mt-1 ml-8">
                                        <span className="text-[10px] text-gray-400">{ind.unit}</span>
                                        {ind.baselineValue != null && (
                                          <span className="text-[10px] text-gray-400">· Baseline: {ind.baselineValue}</span>
                                        )}
                                        {sel && <CheckCircleIcon className="w-3.5 h-3.5 text-violet-500 ml-auto" />}
                                      </div>
                                    </button>
                                  );
                                })
                              }
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Progress Meter ─────────────────────────────────────────────────────────────
function ProgressMeter({ pct }) {
  const capped = Math.min(pct, 100);
  const cfg =
    pct >= 75 ? { bar:'bg-green-500',  text:'text-green-700',  bg:'bg-green-50 border-green-200',  label:'On Track' } :
    pct >= 50 ? { bar:'bg-amber-400',  text:'text-amber-700',  bg:'bg-amber-50 border-amber-200',  label:'Moderate' } :
                { bar:'bg-red-400',    text:'text-red-700',    bg:'bg-red-50 border-red-200',      label:'Behind Target' };

  return (
    <div className={`rounded-xl border p-4 ${cfg.bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
        <span className={`text-2xl font-extrabold ${cfg.text}`}>{pct}%</span>
      </div>
      <div className="h-3 bg-white/60 rounded-full overflow-hidden border border-white">
        <div className={`h-3 rounded-full transition-all duration-500 ${cfg.bar}`} style={{ width: `${capped}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1.5">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
    </div>
  );
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ data, onConfirm, onCancel, isPending }) {
  const rows = [
    { label: 'Fiscal Year',          value: data.fiscalYear },
    { label: 'Reporting Period',      value: data.period },
    { label: 'Submission Date',       value: data.submissionDate ? new Date(data.submissionDate + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
    { label: 'Reporting Entity',      value: data.entityLabel,      truncate: true },
    { label: 'Strategic Objective',   value: data.objectiveName,    truncate: true },
    { label: 'Performance Target',    value: data.outputName,       truncate: true },
    { label: 'Planned Activity',      value: data.activityName,     truncate: true },
    { label: 'Performance Indicator', value: `${data.indicatorCode} – ${data.indicatorName}`, truncate: true },
    { label: 'Progress Achieved',     value: `${data.actualValue?.toLocaleString()} ${data.unit}`, bold: true },
    data.pct != null ? { label: 'Performance vs Target', value: `${data.pct}%`, bold: true } : null,
    data.attachments?.length > 0 ? { label: 'Attachments', value: `${data.attachments.length} file(s)` } : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <h2 className="text-lg font-bold text-white">Confirm Submission</h2>
          <p className="text-blue-100 text-sm mt-1">Review carefully: data is locked after submission</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {rows.map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-white gap-4">
                <span className="text-xs text-gray-500 shrink-0">{row.label}</span>
                <span className={`text-xs text-right max-w-[240px] ${row.truncate ? 'truncate' : ''} ${row.bold ? 'font-bold text-blue-700' : 'text-gray-800 font-medium'}`}>
                  {row.value || '—'}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <ShieldExclamationIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Once submitted, this record will be <strong>locked for editing</strong> and forwarded to your M&amp;E officer for review and approval.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onConfirm} disabled={isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
              {isPending ? 'Submitting…' : '✓ Confirm & Submit'}
            </button>
            <button onClick={onCancel} disabled={isPending}
              className="flex-1 border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold py-3 rounded-xl text-sm">
              ← Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SubmitDataPage() {
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);

  // Wizard step
  const [step, setStep] = useState(1);

  // Step 1: Entity
  const [entityType,   setEntityType]   = useState('institution'); // 'institution' | 'department'
  const [entityId,     setEntityId]     = useState('');
  const [entityKind,   setEntityKind]   = useState('');     // 'institution' | 'department' | 'unit'
  // Resolved entity IDs for scoping
  const [resolvedInstitutionId, setResolvedInstitutionId] = useState('');
  const [resolvedDepartmentId,  setResolvedDepartmentId]  = useState('');
  const [resolvedUnitId,        setResolvedUnitId]        = useState('');
  const [entityLabel,  setEntityLabel]  = useState('');

  // Step 2: Period
  const [period,         setPeriod]         = useState('');
  const [submissionDate, setSubmissionDate]  = useState(() => new Date().toISOString().slice(0, 10));

  // Step 3: Framework selection
  const [activityId,  setActivityId]  = useState('');
  const [indicatorId, setIndicatorId] = useState('');

  // Step 4: Data
  const [progressVal,  setProgressVal]  = useState('');
  const [binaryVal,    setBinaryVal]    = useState(null);  // for 'binary' formula
  const [extraFields,  setExtraFields]  = useState({});   // formula-specific extra inputs
  const [remarks,      setRemarks]      = useState('');
  const [attachments,  setAttachments]  = useState([]);
  const [uploading,    setUploading]    = useState(false);

  // GPS location
  const [location, setLocation] = useState(null); // { lat, lng, name }
  const [gpsLoading, setGpsLoading] = useState(false);

  // Confirm modal
  const [showConfirm, setShowConfirm] = useState(false);

  // User meta
  const isSuperOrME  = ['super_admin', 'me_officer'].includes(user?.role);
  const isRestricted = ['data_collector', 'admin'].includes(user?.role);

  // ── Auto-detect entity for restricted users ─────────────────────────────────
  useEffect(() => {
    if (isRestricted) {
      // Department user (MIT-HQ)
      if (user?.departmentId && user?.department) {
        setEntityKind('department');
        setEntityId(user.departmentId);
        setResolvedInstitutionId(user.institutionId || '');
        setResolvedDepartmentId(user.departmentId);
        setResolvedUnitId('');
        setEntityLabel(`${user.department.code} – ${user.department.name}`);
        setStep(2); // skip entity step
      } else if (user?.unitId && user?.unit) {
        setEntityKind('unit');
        setEntityId(user.unitId);
        setResolvedInstitutionId(user.institutionId || '');
        setResolvedDepartmentId(user.departmentId || '');
        setResolvedUnitId(user.unitId);
        setEntityLabel(`${user.unit.code} – ${user.unit.name}`);
        setStep(2);
      } else if (user?.institutionId && user?.institution) {
        setEntityKind('institution');
        setEntityId(user.institutionId);
        setResolvedInstitutionId(user.institutionId);
        setResolvedDepartmentId('');
        setResolvedUnitId('');
        setEntityLabel(user.institution.name);
        setStep(2);
      }
    }
  }, [user, isRestricted]);

  // ── Data fetches ────────────────────────────────────────────────────────────
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
    enabled: isSuperOrME,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
    enabled: isSuperOrME,
  });

  // Chain API: only fetch once entity is resolved
  const chainParams = useMemo(() => {
    const p = {};
    if (resolvedUnitId)        p.unitId        = resolvedUnitId;
    else if (resolvedDepartmentId) p.departmentId = resolvedDepartmentId;
    else if (resolvedInstitutionId) p.institutionId = resolvedInstitutionId;
    return p;
  }, [resolvedInstitutionId, resolvedDepartmentId, resolvedUnitId]);

  const chainEnabled = !!(resolvedInstitutionId || resolvedDepartmentId || resolvedUnitId);

  const { data: chainRaw = [], isFetching: chainFetching } = useQuery({
    queryKey: ['framework-chain', chainParams],
    queryFn: () => frameworkApi.getChain(chainParams).then(r => r.data),
    enabled: chainEnabled,
    staleTime: 60_000,
  });

  // Deduplicate objectives by name
  const chain = useMemo(() => {
    const seen = new Set();
    return chainRaw.filter(o => {
      const key = (o.name || '').trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [chainRaw]);

  // ── Derived selections ──────────────────────────────────────────────────────
  const selActivity  = useMemo(() => {
    for (const obj of chain) {
      for (const out of obj.outputs || []) {
        const act = out.activities?.find(a => a.id === activityId);
        if (act) return { obj, out, act };
      }
    }
    return null;
  }, [chain, activityId]);

  const selIndicator = useMemo(() => {
    for (const obj of chain) {
      for (const out of obj.outputs || []) {
        const ind = out.indicators?.find(i => i.id === indicatorId);
        if (ind) return { obj, out, ind };
      }
    }
    return null;
  }, [chain, indicatorId]);

  // ── Indicator targets ────────────────────────────────────────────────────────
  const { data: targets = [] } = useQuery({
    queryKey: ['indicator-targets', indicatorId, FISCAL_YEAR],
    queryFn: () => indicatorsApi.getTargets(indicatorId, { fiscalYear: FISCAL_YEAR }).then(r => r.data),
    enabled: !!indicatorId,
  });

  const myTarget = targets.find(t =>
    (resolvedUnitId        && t.unitId        === resolvedUnitId)        ||
    (resolvedDepartmentId  && t.departmentId  === resolvedDepartmentId)  ||
    (resolvedInstitutionId && t.institutionId === resolvedInstitutionId)
  ) || targets[0];

  const periodTarget   = period && myTarget ? myTarget[P_KEY[period]] : null;
  const progressNum    = parseFloat(progressVal) || 0;
  const exceedsTarget  = periodTarget != null && progressNum > periodTarget;
  const progressPct    = periodTarget != null && periodTarget > 0 && progressVal !== ''
    ? Math.round((progressNum / periodTarget) * 100) : null;
  const wc             = wordCount(remarks);
  const wcExceeds      = wc > 1000;

  // ── Handlers ────────────────────────────────────────────────────────────────
  function selectEntity(kind, ent, instId, deptId, unitId) {
    setEntityKind(kind);
    setEntityId(ent.id);
    setResolvedInstitutionId(instId || '');
    setResolvedDepartmentId(deptId  || '');
    setResolvedUnitId(unitId         || '');
    setEntityLabel(ent.name);
    // Reset downstream
    setActivityId(''); setIndicatorId(''); setProgressVal('');
  }

  function handleSelectActivity(id) {
    setActivityId(id);
    setIndicatorId('');
    setProgressVal('');
    setExtraFields({});
    setBinaryVal(null);
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    e.target.value = '';
    setUploading(true);
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    try {
      const res = await dataEntryApi.uploadFiles(fd);
      setAttachments(prev => [...prev, ...res.data.urls]);
      toast.success(`${files.length} file(s) uploaded`);
    } catch { toast.error('Upload failed: PDF, PNG or JPEG only, max 10 MB'); }
    finally  { setUploading(false); }
  }

  const { mutateAsync, isPending } = useMutation({
    mutationFn: d => dataEntryApi.submit(d),
    onSuccess: () => { toast.success('Activity submitted successfully!'); navigate('/data-entry'); },
    onError: err => { toast.error(err.response?.data?.error || 'Submission failed'); setShowConfirm(false); },
  });

  async function captureGPS() {
    if (!navigator.geolocation) { toast.error('Geolocation is not supported by your browser'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode using OpenStreetMap Nominatim (free, no key)
        let name = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const d = await r.json();
          name = d.display_name?.split(',').slice(0, 3).join(', ') || name;
        } catch {}
        setLocation({ lat: latitude, lng: longitude, name });
        setGpsLoading(false);
        toast.success('Location captured');
      },
      () => { toast.error('Unable to get location. Please allow location access.'); setGpsLoading(false); },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  const ind = selIndicator?.ind;
  const formulaType = ind?.formulaType || 'achievement_pct';
  const formulaConfig = ind?.formulaConfig || {};
  const isBinaryFormula = formulaType === 'binary';

  // Effective actual value: binary uses 1/0, others use progressNum
  const effectiveActual = isBinaryFormula
    ? (binaryVal === true ? 1 : binaryVal === false ? 0 : null)
    : progressNum;

  // Live preview result
  const livePreview = useMemo(() => {
    if (effectiveActual == null && !isBinaryFormula) return null;
    const a = isBinaryFormula ? effectiveActual : progressNum;
    if (a == null || a === '' || isNaN(Number(a))) return null;
    return previewCalculate(formulaType, formulaConfig, {
      actualValue:   Number(a),
      baselineValue: ind?.baselineValue,
      target:        periodTarget,
      extraFields:   isBinaryFormula ? {} : extraFields,
    });
  }, [formulaType, formulaConfig, effectiveActual, progressNum, periodTarget, extraFields, ind, isBinaryFormula]);

  const handleConfirmSubmit = () => mutateAsync({
    indicatorId,
    activityId,
    objectiveId: selIndicator?.obj?.id || selActivity?.obj?.id || null,
    institutionId: resolvedInstitutionId || null,
    departmentId:  resolvedDepartmentId  || null,
    unitId:        resolvedUnitId        || null,
    fiscalYear:    FISCAL_YEAR,
    reportingPeriod: period,
    actualValue:   effectiveActual,
    extraFields:   Object.keys(extraFields).length > 0 ? extraFields : undefined,
    remarks:       remarks || null,
    submissionDate,
    attachments,
    latitude:     location?.lat || null,
    longitude:    location?.lng || null,
    locationName: location?.name || null,
  });

  const canProceedStep3 = !!activityId && !!indicatorId;
  const hasValue = isBinaryFormula ? binaryVal !== null : (progressVal !== '' && effectiveActual != null);
  const canSubmit = canProceedStep3 && period && hasValue && !exceedsTarget && !wcExceeds && !!submissionDate;

  const confirmData = {
    fiscalYear:     FISCAL_YEAR,
    period,
    submissionDate,
    entityLabel,
    objectiveName:  selIndicator?.obj?.name  || selActivity?.obj?.name  || '',
    outputName:     selIndicator?.out?.name  || selActivity?.out?.name  || '',
    activityName:   selActivity?.act?.name   || '',
    indicatorCode:  selIndicator?.ind?.code  || '',
    indicatorName:  selIndicator?.ind?.name  || '',
    unit:           selIndicator?.ind?.unit  || '',
    actualValue:    progressNum,
    pct:            progressPct,
    attachments,
  };

  // ── Search for entity step ──────────────────────────────────────────────────
  const [entitySearch, setEntitySearch] = useState('');
  const filteredInsts = useMemo(() => {
    if (!entitySearch) return institutions;
    const q = entitySearch.toLowerCase();
    return institutions.filter(i => i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));
  }, [institutions, entitySearch]);
  const filteredDepts = useMemo(() => {
    if (!entitySearch) return departments;
    const q = entitySearch.toLowerCase();
    return departments.filter(d => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
  }, [departments, entitySearch]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Activity Report</h1>
          <p className="text-gray-500 text-sm mt-1">FY {FISCAL_YEAR} · {entityLabel || 'Select entity to begin'}</p>
        </div>
        {step > (isRestricted ? 2 : 1) && (
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </button>
        )}
      </div>

      {/* Step bar */}
      <StepBar current={step} />

      {/* ════════════════════════════════════════════════════════ */}
      {/* STEP 1: ENTITY SELECTION (super_admin / me_officer only) */}
      {/* ════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
              Select Reporting Entity
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Choose the institution or department submitting this activity report
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:bg-white transition-all"
                placeholder="Search institutions or departments…"
                value={entitySearch}
                onChange={e => setEntitySearch(e.target.value)}
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {[
                { id: 'institution', label: 'Institutions', icon: BuildingOfficeIcon, count: filteredInsts.length },
                { id: 'department',  label: 'Departments / Units', icon: UserGroupIcon,     count: filteredDepts.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setEntityType(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                    entityType === tab.id
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 font-bold">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Institution cards */}
            {entityType === 'institution' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredInsts.map(inst => (
                  <EntityCard
                    key={inst.id}
                    entity={inst}
                    type="institution"
                    selected={entityKind === 'institution' && entityId === inst.id}
                    onClick={() => selectEntity('institution', inst, inst.id, null, null)}
                  />
                ))}
              </div>
            )}

            {/* Department cards */}
            {entityType === 'department' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredDepts.map(dept => (
                  <EntityCard
                    key={dept.id}
                    entity={dept}
                    type="department"
                    selected={entityKind === 'department' && entityId === dept.id}
                    onClick={() => {
                      // MIT-HQ is the institution for all depts
                      const mitHQ = institutions.find(i => i.code === 'MIT-HQ');
                      selectEntity('department', dept, mitHQ?.id || null, dept.id, null);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Proceed */}
            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                disabled={!entityId}
                onClick={() => setStep(2)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                  entityId
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue to Period <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* STEP 2: PERIOD SELECTION                               */}
      {/* ════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="space-y-4">

          {/* Selected entity banner */}
          <div className="flex items-center gap-3 bg-blue-600 rounded-2xl px-5 py-3">
            <BuildingOfficeIcon className="w-4 h-4 text-blue-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-blue-200">Reporting Entity</p>
              <p className="text-sm font-bold text-white truncate">{entityLabel}</p>
            </div>
            {!isRestricted && (
              <button
                type="button"
                onClick={() => { setStep(1); setActivityId(''); setIndicatorId(''); setProgressVal(''); }}
                className="shrink-0 text-blue-200 hover:text-white text-xs flex items-center gap-1 transition-colors"
              >
                <ArrowPathIcon className="w-3.5 h-3.5" /> Change
              </button>
            )}
          </div>

          {/* Period card */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Reporting Period</p>
              <p className="text-xs text-gray-400 mt-0.5">Select the period this report covers: FY {FISCAL_YEAR}</p>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-5 gap-2">
                {PERIODS.map(p => {
                  const meta = PERIOD_META[p];
                  const sel  = period === p;
                  return (
                    <button key={p} type="button" onClick={() => setPeriod(p)}
                      className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 text-sm font-bold transition-all ${
                        sel
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200'
                          : 'border-gray-200 text-gray-600 bg-white hover:border-blue-300 hover:text-blue-600'
                      }`}>
                      <span className="text-base font-extrabold">{meta.label}</span>
                      <span className={`text-[10px] font-normal mt-0.5 ${sel ? 'text-blue-200' : 'text-gray-400'}`}>{meta.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submission date */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Submission Date</p>
            </div>
            <div className="px-6 py-4">
              <div className="relative max-w-xs">
                <CalendarDaysIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <input
                  type="date"
                  value={submissionDate}
                  onChange={e => setSubmissionDate(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-xl border-2 border-gray-200 bg-white pl-11 pr-4 py-3 text-sm font-medium text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!period}
              onClick={() => setStep(3)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                period
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Select Implementation <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* STEP 3: FRAMEWORK / IMPLEMENTATION SELECTION           */}
      {/* ════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-4">

          {/* Context banner */}
          <div className="flex flex-wrap items-center gap-3 bg-blue-600 rounded-2xl px-5 py-3">
            <div className="flex items-center gap-2 text-white text-xs">
              <BuildingOfficeIcon className="w-4 h-4 opacity-80" />
              <span className="opacity-80">Entity:</span>
              <span className="font-semibold">{entityLabel}</span>
            </div>
            <span className="text-blue-400 hidden sm:block">·</span>
            <div className="flex items-center gap-2 text-white text-xs">
              <CalendarDaysIcon className="w-4 h-4 opacity-80" />
              <span className="opacity-80">Period:</span>
              <span className="font-semibold">{period} · FY {FISCAL_YEAR}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
            <InformationCircleIcon className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 leading-relaxed">
              The framework below shows objectives, performance targets, activities and indicators <strong>linked to your entity</strong> in the Results Framework.
              Select <span className="font-semibold">one activity</span> and <span className="font-semibold">one indicator</span> to report on.
            </p>
          </div>

          {/* Selection summary chips */}
          {(activityId || indicatorId) && (
            <div className="flex flex-wrap gap-2">
              {activityId && selActivity && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200">
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  Activity: {selActivity.act.name.substring(0, 40)}{selActivity.act.name.length > 40 ? '…' : ''}
                  <button type="button" onClick={() => { setActivityId(''); setIndicatorId(''); setProgressVal(''); }} className="text-emerald-500 hover:text-emerald-700 ml-0.5">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              )}
              {indicatorId && selIndicator && (
                <span className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-violet-200">
                  <CheckBadgeIcon className="w-3.5 h-3.5" />
                  {selIndicator.ind.code}: {selIndicator.ind.name.substring(0, 35)}{selIndicator.ind.name.length > 35 ? '…' : ''}
                  <button type="button" onClick={() => { setIndicatorId(''); setProgressVal(''); }} className="text-violet-500 hover:text-violet-700 ml-0.5">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Framework tree */}
          {chainFetching ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 flex flex-col items-center gap-3">
              <ArrowPathIcon className="w-8 h-8 text-blue-400 animate-spin" />
              <p className="text-sm text-gray-400">Loading Results Framework…</p>
            </div>
          ) : (
            <FrameworkTree
              chain={chain}
              selectedActivity={activityId}
              selectedIndicator={indicatorId}
              onSelectActivity={handleSelectActivity}
              onSelectIndicator={(id) => { setIndicatorId(id); setProgressVal(''); }}
            />
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canProceedStep3}
              onClick={() => setStep(4)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                canProceedStep3
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canProceedStep3 ? 'Enter Progress Data' : 'Select Activity & Indicator'}
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* STEP 4: DATA ENTRY                                     */}
      {/* ════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-5">

          {/* Summary banner */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
              <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold">Submission Summary</p>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-100">
              {[
                { label: 'Reporting Entity',    value: entityLabel },
                { label: 'Period',               value: `${period} · FY ${FISCAL_YEAR}` },
                { label: 'Strategic Objective',  value: selIndicator?.obj?.name  || selActivity?.obj?.name  || '—' },
                { label: 'Performance Target',   value: selIndicator?.out?.name  || selActivity?.out?.name  || '—' },
                { label: 'Planned Activity',     value: selActivity?.act?.name   || '—' },
                { label: 'Performance Indicator',value: selIndicator ? `${selIndicator.ind.code} – ${selIndicator.ind.name}` : '—' },
              ].map(r => (
                <div key={r.label} className="flex items-start gap-3 py-2">
                  <span className="text-xs text-gray-400 w-36 shrink-0 pt-0.5">{r.label}</span>
                  <span className="text-xs text-gray-800 font-medium leading-snug">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Indicator details + progress */}
          {selIndicator && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Progress Against Target</p>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{selIndicator.ind.code} · {selIndicator.ind.unit}</p>
              </div>
              <div className="p-5 space-y-5">
                {/* Baseline + Target */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <LockClosedIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Baseline</span>
                    </div>
                    <p className="text-2xl font-extrabold text-gray-700">
                      {selIndicator.ind.baselineValue != null ? selIndicator.ind.baselineValue.toLocaleString() : '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{selIndicator.ind.unit}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <LockClosedIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{period} Target</span>
                    </div>
                    {periodTarget != null ? (
                      <>
                        <p className="text-2xl font-extrabold text-gray-700">{periodTarget.toLocaleString()}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{selIndicator.ind.unit}</p>
                      </>
                    ) : (
                      <p className="text-sm text-amber-500 font-semibold mt-2">Not set</p>
                    )}
                  </div>
                </div>

                {/* ── Formula badge ──────────────────────────────────── */}
                {(() => {
                  const fm = FORMULA_META[formulaType];
                  if (!fm) return null;
                  return (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <InformationCircleIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-gray-700">{fm.label}</span>
                        <span className="text-xs text-gray-400 ml-1.5 font-mono">{fm.description}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Binary (Yes/No) ─────────────────────────────────── */}
                {isBinaryFormula ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Was this milestone achieved? <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ v: true, label: '✓ Yes — Achieved', cls: binaryVal === true ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 hover:border-green-400 text-gray-700' },
                        { v: false, label: '✗ No — Not achieved', cls: binaryVal === false ? 'bg-red-500 text-white border-red-500' : 'border-gray-200 hover:border-red-300 text-gray-700' },
                      ].map(({ v, label, cls }) => (
                        <button key={String(v)} type="button"
                          onClick={() => setBinaryVal(v)}
                          className={`py-4 rounded-xl border-2 text-sm font-bold transition-all ${cls}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                    {binaryVal !== null && (
                      <div className={`mt-3 p-3 rounded-xl text-sm font-semibold text-center ${
                        binaryVal ? 'bg-green-50 text-green-700 border border-green-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        Achievement: {binaryVal ? '100%' : '0%'}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* ── Main value input ─────────────────────────────── */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {FORMULA_META[formulaType]?.inputLabel || 'Progress Achieved'}{' '}
                        <span className="text-red-400">*</span>
                        <span className="text-xs text-gray-400 font-normal ml-1">
                          ({selIndicator.ind.unit})
                        </span>
                      </label>
                      <input
                        type="number" step="any" min="0"
                        className={`w-full rounded-xl border-2 px-4 py-3 text-xl font-bold outline-none transition-all ${
                          exceedsTarget
                            ? 'border-red-400 bg-red-50 focus:border-red-500 text-red-700'
                            : progressVal
                            ? 'border-green-300 bg-green-50/30 focus:border-green-400 text-gray-900'
                            : 'border-gray-200 bg-white focus:border-blue-400 text-gray-900'
                        }`}
                        placeholder={`Enter numeric value in ${selIndicator.ind.unit}`}
                        value={progressVal}
                        onChange={e => setProgressVal(e.target.value)}
                      />
                    </div>

                    {/* ── Formula extra fields ──────────────────────────── */}
                    {(() => {
                      const fm = FORMULA_META[formulaType];
                      const dynFields = fm?.extraFields;
                      if (!dynFields || dynFields === 'dynamic' || !Array.isArray(dynFields) || dynFields.length === 0) return null;
                      return (
                        <div className="space-y-3 border border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/30">
                          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                            Additional Inputs for {fm.label}
                          </p>
                          {dynFields.map(f => (
                            <div key={f.key}>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">
                                {f.label}
                                {f.required && <span className="text-red-400 ml-1">*</span>}
                              </label>
                              <input
                                type={f.type || 'number'} step="any"
                                className="input"
                                placeholder={f.hint || ''}
                                value={extraFields[f.key] || ''}
                                onChange={e => setExtraFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                              />
                              {f.hint && (
                                <p className="text-[11px] text-gray-400 mt-0.5">{f.hint}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* ── Sub-indicator inputs for multi_input ─────────── */}
                    {formulaType === 'multi_input' && (() => {
                      const subs = formulaConfig?.subIndicators;
                      if (!subs?.length) return (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          No sub-indicators configured for this indicator. Contact your M&E officer.
                        </p>
                      );
                      return (
                        <div className="border border-dashed border-purple-200 rounded-xl p-4 bg-purple-50/20 space-y-3">
                          <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Sub-indicator Values</p>
                          {subs.map(s => (
                            <div key={s.key}>
                              <label className="block text-xs font-semibold text-gray-700 mb-1">{s.label}</label>
                              <input
                                type="number" step="any" className="input"
                                placeholder={`Enter value for ${s.label}`}
                                value={extraFields[s.key] || ''}
                                onChange={e => setExtraFields(prev => ({ ...prev, [s.key]: e.target.value }))}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* ── Sub-indicator inputs for weighted_score ──────── */}
                    {formulaType === 'weighted_score' && (() => {
                      const subs = formulaConfig?.subIndicators;
                      if (!subs?.length) return (
                        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          No dimensions configured for this composite indicator.
                        </p>
                      );
                      return (
                        <div className="border border-dashed border-purple-200 rounded-xl p-4 bg-purple-50/20 space-y-3">
                          <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide">
                            Dimension Values — Weighted Score
                          </p>
                          {subs.map(s => (
                            <div key={s.key} className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  {s.label}
                                  {s.weight && (
                                    <span className="ml-1.5 text-[10px] text-purple-600 font-bold">
                                      {Math.round(s.weight * 100)}% weight
                                    </span>
                                  )}
                                </label>
                                <input
                                  type="number" step="any" className="input"
                                  placeholder={s.target ? `Target: ${s.target}` : 'Enter value'}
                                  value={extraFields[s.key] || ''}
                                  onChange={e => setExtraFields(prev => ({ ...prev, [s.key]: e.target.value }))}
                                />
                              </div>
                              {s.target && extraFields[s.key] && (
                                <div className="text-center min-w-[52px]">
                                  <p className="text-[10px] text-gray-400">vs target</p>
                                  <p className={`text-sm font-bold ${
                                    (parseFloat(extraFields[s.key]) / s.target) >= 1
                                      ? 'text-green-600' : 'text-amber-600'
                                  }`}>
                                    {Math.min(Math.round((parseFloat(extraFields[s.key]) / s.target) * 100), 100)}%
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* ── Live calculation preview ──────────────────────── */}
                    {livePreview && (
                      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Live Calculation</p>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Result</p>
                            <p className="text-xl font-extrabold text-gray-900">
                              {livePreview.displayValue || String(livePreview.result)}
                            </p>
                          </div>
                          {livePreview.achievementPct != null && (
                            <div>
                              <p className="text-xs text-gray-500">Achievement</p>
                              <p className={`text-xl font-extrabold ${statusColor(livePreview.achievementPct)}`}>
                                {livePreview.achievementPct}%
                              </p>
                            </div>
                          )}
                          {livePreview.achievementPct != null && (() => {
                            const b = statusBadge(livePreview.achievementPct);
                            return (
                              <span className={`self-end px-3 py-1 rounded-full text-xs font-bold ${b.cls}`}>
                                {b.label}
                              </span>
                            );
                          })()}
                        </div>
                        {livePreview.achievementPct != null && (
                          <div className="mt-3">
                            <ProgressMeter pct={Math.min(livePreview.achievementPct, 150)} />
                          </div>
                        )}
                      </div>
                    )}

                    {exceedsTarget && formulaType === 'achievement_pct' && (
                      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-700">Value Exceeds Target</p>
                          <p className="text-xs text-red-600 mt-0.5">
                            Entered value ({progressNum.toLocaleString()}) exceeds the {period} target ({periodTarget?.toLocaleString()}). Please verify.
                          </p>
                        </div>
                      </div>
                    )}

                    {!livePreview && progressPct != null && !exceedsTarget && (
                      <div className="mt-3"><ProgressMeter pct={progressPct} /></div>
                    )}

                    {periodTarget == null && progressVal && formulaType === 'achievement_pct' && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                        No target set for {period}: progress recorded but performance % cannot be calculated.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Remarks */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Remarks</p>
              <p className="text-xs text-gray-400 mt-0.5">Explain progress, provide context or justification</p>
            </div>
            <div className="p-5">
              <textarea
                rows={4}
                className={`w-full rounded-xl border-2 px-4 py-3 text-sm resize-none outline-none transition-all ${
                  wcExceeds
                    ? 'border-red-400 bg-red-50 focus:border-red-500'
                    : 'border-gray-200 bg-white focus:border-blue-400'
                }`}
                placeholder="Describe how this activity was implemented, challenges encountered, and impact observed…"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
              <div className={`flex justify-between text-xs mt-1.5 ${wcExceeds ? 'text-red-500' : 'text-gray-400'}`}>
                <span>{wcExceeds ? '⚠ Exceeds limit' : 'Maximum 1,000 words'}</span>
                <span className={`font-semibold tabular-nums ${wcExceeds ? 'text-red-600' : wc > 900 ? 'text-amber-500' : ''}`}>
                  {wc} / 1,000
                </span>
              </div>
            </div>
          </div>

          {/* Supporting evidence */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Supporting Evidence</p>
              <p className="text-xs text-gray-400 mt-0.5">Upload files for physical verification: PDF, PNG or JPEG, max 10 MB</p>
            </div>
            <div className="p-5 space-y-3">
              <label className={`flex items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4 cursor-pointer transition-all ${
                uploading ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
              }`}>
                <PaperClipIcon className="w-6 h-6 text-gray-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{uploading ? 'Uploading…' : 'Click to attach files'}</p>
                  <p className="text-xs text-gray-400">PDF, PNG, JPEG · up to 5 files</p>
                </div>
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" multiple onChange={handleFileUpload} disabled={uploading} />
              </label>
              {attachments.length > 0 && (
                <ul className="space-y-2">
                  {attachments.map((url, i) => (
                    <li key={i} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <DocumentIcon className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-xs text-gray-700 truncate max-w-xs">{url.split('/').pop()}</span>
                      </div>
                      <button type="button" onClick={() => setAttachments(a => a.filter((_, idx) => idx !== i))}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* GPS Location capture */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className="text-base">📍</span>
              <h3 className="font-semibold text-gray-800 text-sm">GPS Location <span className="text-xs text-gray-400 font-normal">(optional)</span></h3>
            </div>
            <div className="p-5">
              {location ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{location.name}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                  </div>
                  <button type="button" onClick={() => setLocation(null)} className="text-gray-400 hover:text-red-500">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={captureGPS}
                  disabled={gpsLoading}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all w-full"
                >
                  {gpsLoading
                    ? <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
                    : <span className="text-xl">📍</span>
                  }
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-700">{gpsLoading ? 'Getting location…' : 'Capture GPS Location'}</p>
                    <p className="text-xs text-gray-400">Records where this data was collected</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Submit actions */}
          <div className="flex gap-3 pb-8">
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              disabled={!canSubmit}
              className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Review &amp; Submit
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-8 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Confirm modal ─────────────────────────────────────── */}
      {showConfirm && (
        <ConfirmModal
          data={confirmData}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowConfirm(false)}
          isPending={isPending}
        />
      )}
    </div>
  );
}
