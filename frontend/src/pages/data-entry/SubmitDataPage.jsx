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

// ── Framework Tree (Multi-Select) ─────────────────────────────────────────────
// Checkboxes allow selecting multiple activities AND multiple indicators.
// selectedActivities: Set<string>   selectedIndicators: Set<string>
function FrameworkTree({ chain, selectedActivities, selectedIndicators, onToggleActivity, onToggleIndicator }) {
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

  return (
    <div className="space-y-3">
      {/* Multi-select hint */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
        <InformationCircleIcon className="w-4 h-4 text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>Multi-select enabled</strong> — check any number of activities and indicators. All selected items will be submitted in one operation.
        </p>
      </div>

      {chain.map((obj, oi) => {
        const isObjOpen = !!openObjs[obj.id];
        const totalInds = obj.outputs?.reduce((s, op) => s + (op.indicators?.length || 0), 0) || 0;
        const totalActs = obj.outputs?.reduce((s, op) => s + (op.activities?.length || 0), 0) || 0;
        const selActsInObj = obj.outputs?.reduce((s, op) => s + (op.activities?.filter(a => selectedActivities.has(a.id))?.length || 0), 0) || 0;
        const selIndsInObj = obj.outputs?.reduce((s, op) => s + (op.indicators?.filter(i => selectedIndicators.has(i.id))?.length || 0), 0) || 0;

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
                  {(selActsInObj > 0 || selIndsInObj > 0) && (
                    <span className="ml-2 text-emerald-300 font-bold">
                      ✓ {selActsInObj} act · {selIndsInObj} ind selected
                    </span>
                  )}
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
                  const selActs = out.activities?.filter(a => selectedActivities.has(a.id)) || [];
                  const selInds = out.indicators?.filter(i => selectedIndicators.has(i.id)) || [];
                  const hasSelection = selActs.length > 0 || selInds.length > 0;

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
                          {hasSelection && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                              {selActs.length + selInds.length} selected
                            </span>
                          )}
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

                          {/* Activities column — checkboxes */}
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Squares2X2Icon className="w-3 h-3" /> Planned Activities
                              <span className="ml-1 text-emerald-600">{selActs.length > 0 ? `(${selActs.length} selected)` : ''}</span>
                            </p>
                            <div className="space-y-1.5">
                              {(out.activities || []).length === 0 && (
                                <p className="text-xs text-gray-300 italic">No activities linked</p>
                              )}
                              {(out.activities || []).map((act) => {
                                const sel = selectedActivities.has(act.id);
                                return (
                                  <label
                                    key={act.id}
                                    className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-all ${
                                      sel
                                        ? 'border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold shadow-sm'
                                        : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 text-gray-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={sel}
                                      onChange={() => onToggleActivity(act.id)}
                                      className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                                    />
                                    <span className="leading-snug">{act.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Indicators column — checkboxes */}
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                              <CheckBadgeIcon className="w-3 h-3" /> Performance Indicators
                              <span className="ml-1 text-violet-600">{selInds.length > 0 ? `(${selInds.length} selected)` : ''}</span>
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
                                  const sel = selectedIndicators.has(ind.id);
                                  return (
                                    <label
                                      key={ind.id}
                                      className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-xs cursor-pointer transition-all ${
                                        sel
                                          ? 'border-violet-400 bg-violet-50 text-violet-800 font-semibold shadow-sm'
                                          : 'border-gray-100 hover:border-violet-200 hover:bg-violet-50/40 text-gray-700'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={sel}
                                        onChange={() => onToggleIndicator(ind.id)}
                                        className="mt-0.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 shrink-0"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                            sel ? 'bg-violet-200 text-violet-800' : 'bg-gray-100 text-gray-500'
                                          }`}>{ind.code}</span>
                                          <span className="leading-snug truncate">{ind.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 ml-0">
                                          <span className="text-[10px] text-gray-400">{ind.unit}</span>
                                          {ind.baselineValue != null && (
                                            <span className="text-[10px] text-gray-400">· Baseline: {ind.baselineValue}</span>
                                          )}
                                        </div>
                                      </div>
                                    </label>
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

// ── Batch Confirm Modal ────────────────────────────────────────────────────────
function BatchConfirmModal({ selIndicatorList, selActivityList, indicatorValues, entityLabel, period, submissionDate, attachments, onConfirm, onCancel, isPending }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 shrink-0">
          <h2 className="text-lg font-bold text-white">Confirm Batch Submission</h2>
          <p className="text-blue-100 text-sm mt-1">
            {selIndicatorList.length} indicator{selIndicatorList.length !== 1 ? 's' : ''} · data is locked after submission
          </p>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Shared meta */}
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
            {[
              { label: 'Fiscal Year',     value: FISCAL_YEAR },
              { label: 'Reporting Period', value: period },
              { label: 'Submission Date', value: submissionDate ? new Date(submissionDate + 'T00:00:00').toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
              { label: 'Reporting Entity', value: entityLabel, truncate: true },
              attachments?.length > 0 ? { label: 'Attachments', value: `${attachments.length} file(s)` } : null,
            ].filter(Boolean).map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5 bg-white gap-4">
                <span className="text-xs text-gray-500 shrink-0">{row.label}</span>
                <span className={`text-xs text-right max-w-[240px] font-medium text-gray-800 ${row.truncate ? 'truncate' : ''}`}>{row.value || '—'}</span>
              </div>
            ))}
          </div>

          {/* Indicator list */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Indicators to Submit</p>
            <div className="space-y-2">
              {selIndicatorList.map(({ ind, out }, idx) => {
                const entry = indicatorValues[ind.id] || {};
                const isBin = ind.formulaType === 'binary';
                const display = isBin
                  ? (entry.binaryVal === true ? '✓ Achieved' : '✗ Not Achieved')
                  : `${entry.value} ${ind.unit}`;
                return (
                  <div key={ind.id} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 leading-snug">{ind.code} — {ind.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{out.name}</p>
                    </div>
                    <span className="text-xs font-bold text-blue-700 shrink-0">{display}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activities (if any selected) */}
          {selActivityList.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Linked Activities</p>
              <div className="space-y-1">
                {selActivityList.map(({ act }) => (
                  <div key={act.id} className="flex items-center gap-2 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs text-emerald-800 font-medium">{act.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <ShieldExclamationIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed">
              Once submitted, these records will be <strong>locked for editing</strong> and forwarded to your M&amp;E officer for review and approval.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button onClick={onConfirm} disabled={isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
              {isPending ? 'Submitting…' : `✓ Submit ${selIndicatorList.length} Record${selIndicatorList.length !== 1 ? 's' : ''}`}
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

  // Step 3: Framework selection — multi-select via Sets
  const [selectedActivities,  setSelectedActivities]  = useState(new Set());
  const [selectedIndicators,  setSelectedIndicators]  = useState(new Set());

  // Step 4: Data — per-indicator values keyed by indicatorId
  const [indicatorValues, setIndicatorValues] = useState({}); // { [id]: { value: string, binaryVal: null|bool, extraFields: {} } }
  const [remarks,      setRemarks]      = useState('');
  const [attachments,  setAttachments]  = useState([]);
  const [uploading,    setUploading]    = useState(false);
  const [submitResults, setSubmitResults] = useState(null); // null | { succeeded: [], failed: [] }

  // GPS location
  const [location, setLocation] = useState(null); // { lat, lng, name }
  const [gpsLoading, setGpsLoading] = useState(false);

  // Confirm modal
  const [showConfirm, setShowConfirm] = useState(false);

  // User meta
  const isSuperOrME  = ['super_admin', 'me_officer'].includes(user?.role);
  const isRestricted = ['data_collector', 'admin'].includes(user?.role);

  // Multi-select toggle helpers
  function toggleActivity(id) {
    setSelectedActivities(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleIndicator(id) {
    setSelectedIndicators(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    // Init value entry for newly added indicator
    setIndicatorValues(prev => {
      if (prev[id]) return prev; // already exists
      return { ...prev, [id]: { value: '', binaryVal: null, extraFields: {} } };
    });
  }
  function setIndValue(id, field, val) {
    setIndicatorValues(prev => ({
      ...prev,
      [id]: { ...(prev[id] || { value: '', binaryVal: null, extraFields: {} }), [field]: val },
    }));
  }

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

  // ── Derived selections — multi-select ───────────────────────────────────────
  // Flat list of selected indicator objects with their parent context
  const selIndicatorList = useMemo(() => {
    const result = [];
    for (const obj of chain) {
      for (const out of obj.outputs || []) {
        for (const ind of out.indicators || []) {
          if (selectedIndicators.has(ind.id)) {
            result.push({ obj, out, ind });
          }
        }
      }
    }
    return result;
  }, [chain, selectedIndicators]);

  // Flat list of selected activity objects
  const selActivityList = useMemo(() => {
    const result = [];
    for (const obj of chain) {
      for (const out of obj.outputs || []) {
        for (const act of out.activities || []) {
          if (selectedActivities.has(act.id)) {
            result.push({ obj, out, act });
          }
        }
      }
    }
    return result;
  }, [chain, selectedActivities]);

  const wc        = wordCount(remarks);
  const wcExceeds = wc > 1000;

  // ── Handlers ────────────────────────────────────────────────────────────────
  function selectEntity(kind, ent, instId, deptId, unitId) {
    setEntityKind(kind);
    setEntityId(ent.id);
    setResolvedInstitutionId(instId || '');
    setResolvedDepartmentId(deptId  || '');
    setResolvedUnitId(unitId         || '');
    setEntityLabel(ent.name);
    // Reset downstream selections
    setSelectedActivities(new Set());
    setSelectedIndicators(new Set());
    setIndicatorValues({});
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

  // ── Can proceed to step 4? At least one indicator must be selected ──────────
  const canProceedStep3 = selectedIndicators.size > 0;

  // ── Can submit? All selected indicators must have valid values ───────────────
  const canSubmit = useMemo(() => {
    if (!canProceedStep3 || !period || wcExceeds || !submissionDate) return false;
    for (const { ind } of selIndicatorList) {
      const entry = indicatorValues[ind.id] || {};
      const isBin = ind.formulaType === 'binary';
      if (isBin) {
        if (entry.binaryVal === null || entry.binaryVal === undefined) return false;
      } else {
        if (!entry.value && entry.value !== 0) return false;
      }
    }
    return true;
  }, [canProceedStep3, period, wcExceeds, submissionDate, selIndicatorList, indicatorValues]);

  // ── Build all submission payloads ────────────────────────────────────────────
  function buildPayloads() {
    // One payload per selected indicator; activities are distributed by matching objectiveId
    return selIndicatorList.map(({ obj, out, ind }) => {
      const entry = indicatorValues[ind.id] || {};
      const isBin = ind.formulaType === 'binary';
      const actualValue = isBin
        ? (entry.binaryVal === true ? 1 : 0)
        : parseFloat(entry.value) || 0;
      // Find a matching activity (from selected) that belongs to same output
      const matchingAct = selActivityList.find(({ out: ao }) => ao.id === out.id);
      return {
        indicatorId:  ind.id,
        activityId:   matchingAct?.act?.id || null,
        objectiveId:  obj.id,
        institutionId: resolvedInstitutionId || null,
        departmentId:  resolvedDepartmentId  || null,
        unitId:        resolvedUnitId        || null,
        fiscalYear:    FISCAL_YEAR,
        reportingPeriod: period,
        actualValue,
        extraFields:   Object.keys(entry.extraFields || {}).length > 0 ? entry.extraFields : undefined,
        remarks:       remarks || null,
        submissionDate,
        attachments,
        latitude:     location?.lat || null,
        longitude:    location?.lng || null,
        locationName: location?.name || null,
      };
    });
  }

  async function handleConfirmSubmit() {
    const payloads = buildPayloads();
    const succeeded = [];
    const failed = [];
    for (const payload of payloads) {
      try {
        await mutateAsync(payload);
        succeeded.push(payload.indicatorId);
      } catch (err) {
        failed.push({ indicatorId: payload.indicatorId, error: err.response?.data?.error || 'Failed' });
      }
    }
    setShowConfirm(false);
    setSubmitResults({ succeeded, failed });
    if (failed.length === 0) {
      toast.success(`${succeeded.length} record${succeeded.length !== 1 ? 's' : ''} submitted successfully!`);
      navigate('/data-entry');
    } else if (succeeded.length > 0) {
      toast.success(`${succeeded.length} submitted, ${failed.length} failed`);
    } else {
      toast.error('All submissions failed');
    }
  }

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
                onClick={() => { setStep(1); setSelectedActivities(new Set()); setSelectedIndicators(new Set()); setIndicatorValues({}); }}
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
              Select <span className="font-semibold">any number of activities and indicators</span> — all selected items will be submitted in one batch operation.
            </p>
          </div>

          {/* Selection summary chips */}
          {(selectedActivities.size > 0 || selectedIndicators.size > 0) && (
            <div className="flex flex-wrap gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider self-center">Selected:</span>
              {selActivityList.map(({ act }) => (
                <span key={act.id} className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200">
                  <CheckCircleIcon className="w-3 h-3" />
                  {act.name.substring(0, 30)}{act.name.length > 30 ? '…' : ''}
                  <button type="button" onClick={() => toggleActivity(act.id)} className="text-emerald-500 hover:text-emerald-700">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selIndicatorList.map(({ ind }) => (
                <span key={ind.id} className="inline-flex items-center gap-1.5 bg-violet-100 text-violet-800 text-xs font-semibold px-3 py-1 rounded-full border border-violet-200">
                  <CheckBadgeIcon className="w-3 h-3" />
                  {ind.code}: {ind.name.substring(0, 25)}{ind.name.length > 25 ? '…' : ''}
                  <button type="button" onClick={() => toggleIndicator(ind.id)} className="text-violet-500 hover:text-violet-700">
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
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
              selectedActivities={selectedActivities}
              selectedIndicators={selectedIndicators}
              onToggleActivity={toggleActivity}
              onToggleIndicator={toggleIndicator}
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
              {canProceedStep3
                ? `Enter Data for ${selectedIndicators.size} Indicator${selectedIndicators.size !== 1 ? 's' : ''}`
                : 'Select at least 1 Indicator'}
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════ */}
      {/* STEP 4: DATA ENTRY — one value field per indicator     */}
      {/* ════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-5">

          {/* Summary banner */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
              <p className="text-xs text-blue-200 uppercase tracking-widest font-semibold">Batch Submission</p>
              <span className="text-xs text-blue-100 font-semibold bg-white/20 rounded-full px-2.5 py-0.5">
                {selIndicatorList.length} indicator{selIndicatorList.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="px-5 py-4 divide-y divide-gray-100">
              {[
                { label: 'Reporting Entity', value: entityLabel },
                { label: 'Period',           value: `${period} · FY ${FISCAL_YEAR}` },
                selActivityList.length > 0
                  ? { label: 'Activities', value: selActivityList.map(a => a.act.name).join(', ') }
                  : null,
              ].filter(Boolean).map(r => (
                <div key={r.label} className="flex items-start gap-3 py-2">
                  <span className="text-xs text-gray-400 w-28 shrink-0 pt-0.5">{r.label}</span>
                  <span className="text-xs text-gray-800 font-medium leading-snug">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* One card per selected indicator */}
          {selIndicatorList.map(({ obj, out, ind }, idx) => {
            const entry = indicatorValues[ind.id] || { value: '', binaryVal: null, extraFields: {} };
            const isBin = ind.formulaType === 'binary';
            const ft    = ind.formulaType || 'achievement_pct';
            const fc    = ind.formulaConfig || {};
            const fm    = FORMULA_META[ft];
            const progressNum = parseFloat(entry.value) || 0;

            const livePreview = (() => {
              if (isBin) {
                if (entry.binaryVal === null) return null;
                return previewCalculate(ft, fc, { actualValue: entry.binaryVal ? 1 : 0, baselineValue: ind.baselineValue, target: null, extraFields: {} });
              }
              if (!entry.value) return null;
              return previewCalculate(ft, fc, { actualValue: progressNum, baselineValue: ind.baselineValue, target: null, extraFields: entry.extraFields || {} });
            })();

            return (
              <div key={ind.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                {/* Card header */}
                <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 leading-snug">{ind.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">{ind.code} · {ind.unit}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">{out.name.substring(0, 40)}{out.name.length > 40 ? '…' : ''}</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Formula badge */}
                  {fm && (
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                      <InformationCircleIcon className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-xs font-semibold text-blue-700">{fm.label}</span>
                      <span className="text-xs text-blue-400 font-mono">{fm.description}</span>
                    </div>
                  )}

                  {/* Binary */}
                  {isBin ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Was this milestone achieved? <span className="text-red-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { v: true,  label: '✓ Yes — Achieved',    cls: entry.binaryVal === true  ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 hover:border-green-400 text-gray-700' },
                          { v: false, label: '✗ No — Not achieved', cls: entry.binaryVal === false ? 'bg-red-500 text-white border-red-500'     : 'border-gray-200 hover:border-red-300 text-gray-700' },
                        ].map(({ v, label, cls }) => (
                          <button key={String(v)} type="button"
                            onClick={() => setIndValue(ind.id, 'binaryVal', v)}
                            className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${cls}`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {fm?.inputLabel || 'Progress Achieved'} <span className="text-red-400">*</span>
                        <span className="text-xs text-gray-400 font-normal ml-1">({ind.unit})</span>
                      </label>
                      <input
                        type="number" step="any" min="0"
                        className={`w-full rounded-xl border-2 px-4 py-3 text-xl font-bold outline-none transition-all ${
                          entry.value
                            ? 'border-green-300 bg-green-50/30 focus:border-green-400 text-gray-900'
                            : 'border-gray-200 bg-white focus:border-blue-400 text-gray-900'
                        }`}
                        placeholder={`Enter value in ${ind.unit}`}
                        value={entry.value}
                        onChange={e => setIndValue(ind.id, 'value', e.target.value)}
                      />
                    </div>
                  )}

                  {/* Live preview */}
                  {livePreview && livePreview.achievementPct != null && (
                    <ProgressMeter pct={Math.min(livePreview.achievementPct, 150)} />
                  )}
                </div>
              </div>
            );
          })}

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

      {/* ── Batch confirm modal ──────────────────────────────── */}
      {showConfirm && (
        <BatchConfirmModal
          selIndicatorList={selIndicatorList}
          selActivityList={selActivityList}
          indicatorValues={indicatorValues}
          entityLabel={entityLabel}
          period={period}
          submissionDate={submissionDate}
          attachments={attachments}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowConfirm(false)}
          isPending={isPending}
        />
      )}
    </div>
  );
}
