import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  PlusIcon, ChevronDownIcon,
  PencilSquareIcon, BuildingOfficeIcon, BuildingOffice2Icon,
  UserGroupIcon, CheckCircleIcon, XMarkIcon, LockClosedIcon,
} from '@heroicons/react/24/outline';
import { indicatorsApi, institutionsApi, dataEntryApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

const FISCAL_YEAR = getCurrentFiscalYear();
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const P_KEY   = { Q1: 'q1Target', Q2: 'q2Target', Q3: 'q3Target', Q4: 'q4Target', Annual: 'annualTarget' };

const DEPT_ICON = {
  DAHRM:'🏛️', DID:'🏭', DPP:'📋', DTD:'🤝', DSME:'🏪', DTI:'🌐',
  FAU:'💰', PMU:'📦', LSU:'⚖️', ICTU:'💻', GCU:'📢', IAU:'🔍', MEU:'📊',
};

// Which codes are Units vs Departments
const UNIT_CODES = new Set(['FAU', 'PMU', 'LSU', 'ICTU', 'GCU', 'IAU', 'MEU']);

// ── Target badge ──────────────────────────────────────────────────────────────
function TVal({ v }) {
  if (v == null) return <span className="text-gray-300 text-xs">-</span>;
  return <span className="text-gray-800 text-xs font-semibold">{v.toLocaleString()}</span>;
}

// ── Completion chip ───────────────────────────────────────────────────────────
function CompletionChip({ set, total }) {
  if (total === 0) return <span className="text-[10px] text-gray-400">No indicators</span>;
  const pct = Math.round((set / total) * 100);
  const color = pct === 100 ? 'bg-green-100 text-green-700' : pct > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500';
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {set}/{total} targets set
    </span>
  );
}

// ── Set / Edit Target Modal ───────────────────────────────────────────────────
function TargetModal({ indicator, institution, existing, onClose, canEdit }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      q1Target:     existing?.q1Target     ?? '',
      q2Target:     existing?.q2Target     ?? '',
      q3Target:     existing?.q3Target     ?? '',
      q4Target:     existing?.q4Target     ?? '',
      annualTarget: existing?.annualTarget ?? '',
    },
  });

  const { mutateAsync } = useMutation({
    mutationFn: (data) => indicatorsApi.setTargets(indicator.id, {
      institutionId: institution.id,
      fiscalYear: FISCAL_YEAR,
      ...data,
    }),
    onSuccess: () => {
      qc.invalidateQueries(['all-targets']);
      toast.success('Targets saved');
      onClose();
    },
    onError: () => toast.error('Failed to save targets'),
  });

  function onSubmit(vals) {
    const parsed = {};
    PERIODS.forEach(p => {
      const k = P_KEY[p];
      parsed[k] = vals[k] !== '' && vals[k] != null ? parseFloat(vals[k]) : null;
    });
    return mutateAsync(parsed);
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Set Targets · FY {FISCAL_YEAR}</p>
            <h2 className="font-bold text-gray-900 text-sm leading-tight">{indicator.name}</h2>
            <p className="text-xs text-blue-600 mt-0.5">{institution.name} · {indicator.unit}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 mt-0.5">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Baseline (read-only) */}
        {indicator.baselineValue != null && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <LockClosedIcon className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">
              Baseline: <strong>{indicator.baselineValue.toLocaleString()}</strong> {indicator.unit}
            </span>
          </div>
        )}

        {/* Target inputs */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {PERIODS.map(p => (
              <div key={p}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{p} Target</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  readOnly={!canEdit}
                  className={`input text-sm ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder="-"
                  {...register(P_KEY[p])}
                />
              </div>
            ))}
          </div>

          {existing && (
            <p className="text-[10px] text-gray-400 flex items-center gap-1">
              <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />
              Targets previously set - saving will overwrite existing values.
            </p>
          )}

          <div className="flex gap-3 pt-1">
            {canEdit ? (
              <button type="submit" disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50">
                {isSubmitting ? 'Saving…' : existing ? 'Update Targets' : 'Save Targets'}
              </button>
            ) : (
              <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2.5">
                <LockClosedIcon className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">Read-only - contact admin to edit</span>
              </div>
            )}
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold py-2.5 rounded-xl text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Indicator targets row ─────────────────────────────────────────────────────
function IndicatorRow({ ind, targetsForEntity, entity, canEdit, onSetTarget }) {
  const existing = targetsForEntity?.find(t => t.indicatorId === ind.id);
  const hasTarget = existing && PERIODS.some(p => existing[P_KEY[p]] != null);

  return (
    <tr className="hover:bg-gray-50 border-b border-gray-50 last:border-0">
      <td className="px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-gray-900 leading-tight">{ind.name}</p>
          <span className="font-mono text-[10px] text-gray-400">{ind.code}</span>
        </div>
      </td>
      <td className="px-3 py-3 text-xs text-gray-500">{ind.unit}</td>
      {PERIODS.map(p => (
        <td key={p} className="px-3 py-3 text-center">
          <TVal v={existing?.[P_KEY[p]]} />
        </td>
      ))}
      <td className="px-4 py-3">
        {canEdit ? (
          <button
            onClick={() => onSetTarget(ind, entity, existing)}
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
              hasTarget
                ? 'text-blue-600 hover:bg-blue-50'
                : 'text-green-600 hover:bg-green-50 bg-green-50/50'
            }`}
          >
            <PencilSquareIcon className="w-3.5 h-3.5" />
            {hasTarget ? 'Edit' : 'Set'}
          </button>
        ) : (
          <Link to={`/indicators/${ind.id}`} className="text-xs text-gray-400 hover:text-blue-600">
            View
          </Link>
        )}
      </td>
    </tr>
  );
}

// ── Entity accordion (used for both institutions and departments) ──────────────
function EntityAccordion({ entity, indicators, allTargets, canEdit, onSetTarget, icon, subtitle }) {
  const [open, setOpen] = useState(false);

  const targetsForEntity = allTargets.filter(t => t.institutionId === entity.id);
  const setCount = indicators.filter(ind =>
    targetsForEntity.some(t => t.indicatorId === ind.id && PERIODS.some(p => t[P_KEY[p]] != null))
  ).length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${open ? 'bg-blue-50' : 'bg-gray-100'}`}>
          {icon || <BuildingOfficeIcon className="w-5 h-5 text-gray-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{entity.name}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <CompletionChip set={setCount} total={indicators.length} />
          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Expanded table */}
      {open && (
        <div className="border-t border-gray-100 overflow-x-auto">
          {indicators.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">No indicators available.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 min-w-[220px]">Indicator</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Unit</th>
                  {PERIODS.map(p => (
                    <th key={p} className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">{p}</th>
                  ))}
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">
                    {canEdit ? 'Target' : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {indicators.map(ind => (
                  <IndicatorRow
                    key={ind.id}
                    ind={ind}
                    targetsForEntity={targetsForEntity}
                    entity={entity}
                    canEdit={canEdit}
                    onSetTarget={onSetTarget}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Department accordion (targets stored under MIT-HQ institution) ────────────
function DeptAccordion({ dept, indicators, allTargets, mitHqId, canEdit, onSetTarget }) {
  const [open, setOpen] = useState(false);
  const icon = DEPT_ICON[dept.code] || '🏢';
  const isUnit = UNIT_CODES.has(dept.code);

  // For departments/units, we show MIT-HQ targets
  const targetsForMIT = allTargets.filter(t => t.institutionId === mitHqId);
  const setCount = indicators.filter(ind =>
    targetsForMIT.some(t => t.indicatorId === ind.id && PERIODS.some(p => t[P_KEY[p]] != null))
  ).length;

  // Fake "entity" using MIT-HQ id so IndicatorRow works correctly
  const entityAsMIT = { id: mitHqId, name: dept.name };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${open ? 'bg-blue-50' : 'bg-gray-50'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm">{dept.name}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isUnit ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
            }`}>{isUnit ? 'Unit' : 'Department'} · {dept.code}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <CompletionChip set={setCount} total={indicators.length} />
          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-100 overflow-x-auto">
          {indicators.length === 0 ? (
            <div className="px-5 py-6 text-center text-sm text-gray-400">No indicators assigned yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 min-w-[220px]">Indicator</th>
                  <th className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">Unit</th>
                  {PERIODS.map(p => (
                    <th key={p} className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">{p}</th>
                  ))}
                  <th className="px-4 py-2.5 text-xs font-medium text-gray-500">{canEdit ? 'Target' : ''}</th>
                </tr>
              </thead>
              <tbody>
                {indicators.map(ind => (
                  <IndicatorRow
                    key={ind.id}
                    ind={ind}
                    targetsForEntity={targetsForMIT}
                    entity={entityAsMIT}
                    canEdit={canEdit}
                    onSetTarget={onSetTarget}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function IndicatorsPage() {
  const user   = useAuthStore(s => s.user);
  const canEdit = ['super_admin', 'me_officer', 'admin'].includes(user?.role);

  const [tab,   setTab]  = useState('institutions');
  const [modal, setModal] = useState(null);

  // ── Data fetching ────────────────────────────────────────────────────────
  const { data: indicators = [], isLoading: indLoading } = useQuery({
    queryKey: ['indicators'],
    queryFn: () => indicatorsApi.list().then(r => r.data),
  });

  const { data: allTargets = [], isLoading: targetsLoading } = useQuery({
    queryKey: ['all-targets', FISCAL_YEAR],
    queryFn: () => indicatorsApi.getAllTargets({ fiscalYear: FISCAL_YEAR }).then(r => r.data),
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => dataEntryApi.listDepartments().then(r => r.data),
  });

  // ── Derived ──────────────────────────────────────────────────────────────
  const mitHq = useMemo(() => institutions.find(i => i.code === 'MIT-HQ' || i.code === 'MIT'), [institutions]);
  const supervisedInstitutions = useMemo(() => institutions.filter(i => i.code !== 'MIT-HQ' && i.code !== 'MIT'), [institutions]);
  const mitDepartments = useMemo(() => departments.filter(d => !UNIT_CODES.has(d.code)), [departments]);
  const mitUnits       = useMemo(() => departments.filter(d =>  UNIT_CODES.has(d.code)), [departments]);

  // ── Helper: return the full list of owners for an indicator ────────────────
  // Uses allEffectiveOwners (multi-owner) when available; falls back to the
  // single effectiveOwnerType fields for older API responses.
  function getOwners(ind) {
    if (ind.ownerType) {
      return [{ type: ind.ownerType, institutionId: ind.ownerInstitutionId, departmentId: ind.ownerDepartmentId, unitId: ind.ownerUnitId }];
    }
    if (ind.allEffectiveOwners && ind.allEffectiveOwners.length > 0) {
      return ind.allEffectiveOwners;
    }
    if (ind.effectiveOwnerType) {
      return [{ type: ind.effectiveOwnerType, institutionId: ind.effectiveOwnerInstitutionId || null, departmentId: ind.effectiveOwnerDepartmentId || null, unitId: ind.effectiveOwnerUnitId || null }];
    }
    return [];
  }

  const instIndicators = useMemo(() => {
    const map = {};
    indicators.forEach(ind => {
      const seen = new Set();
      getOwners(ind).forEach(owner => {
        if (owner.type === 'Institution' && owner.institutionId && !seen.has(owner.institutionId)) {
          seen.add(owner.institutionId);
          if (!map[owner.institutionId]) map[owner.institutionId] = [];
          map[owner.institutionId].push(ind);
        }
      });
    });
    return map;
  }, [indicators]);

  const deptIndicators = useMemo(() => {
    const map = {};
    indicators.forEach(ind => {
      const seen = new Set();
      getOwners(ind).forEach(owner => {
        if (owner.type === 'Department' && owner.departmentId && !seen.has(owner.departmentId)) {
          seen.add(owner.departmentId);
          if (!map[owner.departmentId]) map[owner.departmentId] = [];
          map[owner.departmentId].push(ind);
        }
      });
    });
    return map;
  }, [indicators]);

  // Units (FAU, PMU, LSU, etc.) are stored as departments in the DB and linked via
  // departmentId in objectiveResponsibles — so their indicators appear in deptIndicators.
  // The unitIndicators map is an alias: same source, same keys (department IDs).
  // The Units tab looks up unit.id which matches the department record's ID.
  const unitIndicators = deptIndicators;

  // Truly unassigned: no explicit owner and no framework chain assignment
  const unassigned = useMemo(() => indicators.filter(i => getOwners(i).length === 0), [indicators]);

  const totalSet = useMemo(() => new Set(allTargets.map(t => `${t.indicatorId}-${t.institutionId}`)).size, [allTargets]);
  const isLoading = indLoading || targetsLoading;

  const tabs = [
    { key: 'institutions', label: 'Institutions',    icon: BuildingOfficeIcon,  count: supervisedInstitutions.length },
    { key: 'departments',  label: 'MIT Departments', icon: BuildingOffice2Icon, count: mitDepartments.length },
    { key: 'units',        label: 'MIT Units',       icon: UserGroupIcon,       count: mitUnits.length },
  ];

  return (
    <div className="space-y-6">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indicators</h1>
          <p className="text-gray-500 text-sm mt-1">
            {indicators.length} indicators · {totalSet} targets set · FY {FISCAL_YEAR}
            {unassigned.length > 0 && (
              <span className="ml-2 text-amber-600 font-medium">· {unassigned.length} unassigned</span>
            )}
          </p>
        </div>
        {['super_admin', 'me_officer'].includes(user?.role) && (
          <Link to="/indicators/new" className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> New Indicator
          </Link>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              tab === t.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>{t.count}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading indicators…</div>
      ) : (
        <>
          {/* ── INSTITUTIONS tab ────────────────────────────────────── */}
          {tab === 'institutions' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <BuildingOfficeIcon className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-xs text-gray-600">
                  Indicators are automatically linked from the Results Framework based on each institution's responsible objectives.
                  {canEdit ? ' Click to expand and set targets.' : ''}
                </p>
              </div>
              {supervisedInstitutions.map(inst => {
                const inds = instIndicators[inst.id] || [];
                return (
                  <EntityAccordion
                    key={inst.id}
                    entity={inst}
                    indicators={inds}
                    allTargets={allTargets}
                    canEdit={canEdit}
                    onSetTarget={(ind, entity, existing) => setModal({ indicator: ind, institution: entity, existing })}
                    icon={<BuildingOfficeIcon className="w-5 h-5 text-blue-500" />}
                    subtitle={`${inst.code}${inst.region ? ' · ' + inst.region : ''} · ${inds.length} indicator${inds.length !== 1 ? 's' : ''}`}
                  />
                );
              })}
              {supervisedInstitutions.length === 0 && <div className="text-center py-12 text-gray-400">No institutions found.</div>}
            </div>
          )}

          {/* ── MIT DEPARTMENTS tab ─────────────────────────────────── */}
          {tab === 'departments' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                <BuildingOffice2Icon className="w-4 h-4 text-blue-500 shrink-0" />
                <p className="text-xs text-gray-600">
                  Indicators are automatically linked from the Results Framework based on each department's responsible objectives. Targets are tracked under MIT-HQ.
                </p>
              </div>
              {mitDepartments.map(dept => {
                const inds = deptIndicators[dept.id] || [];
                return (
                  <DeptAccordion
                    key={dept.id}
                    dept={dept}
                    indicators={inds}
                    allTargets={allTargets}
                    mitHqId={mitHq?.id}
                    canEdit={canEdit && !!mitHq}
                    onSetTarget={(ind, entity, existing) => setModal({ indicator: ind, institution: entity, existing })}
                  />
                );
              })}
              {mitDepartments.length === 0 && <div className="text-center py-12 text-gray-400">No departments found.</div>}
            </div>
          )}

          {/* ── MIT UNITS tab ───────────────────────────────────────── */}
          {tab === 'units' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                <UserGroupIcon className="w-4 h-4 text-violet-500 shrink-0" />
                <p className="text-xs text-gray-600">
                  Indicators are automatically linked from the Results Framework based on each unit's responsible objectives. Targets are tracked under MIT-HQ.
                </p>
              </div>
              {mitUnits.map(unit => {
                const inds = unitIndicators[unit.id] || [];
                return (
                  <DeptAccordion
                    key={unit.id}
                    dept={unit}
                    indicators={inds}
                    allTargets={allTargets}
                    mitHqId={mitHq?.id}
                    canEdit={canEdit && !!mitHq}
                    onSetTarget={(ind, entity, existing) => setModal({ indicator: ind, institution: entity, existing })}
                  />
                );
              })}
              {mitUnits.length === 0 && <div className="text-center py-12 text-gray-400">No units found.</div>}
            </div>
          )}
        </>
      )}

      {/* ── Target modal ──────────────────────────────────────────────── */}
      {modal && (
        <TargetModal
          indicator={modal.indicator}
          institution={modal.institution}
          existing={modal.existing}
          canEdit={canEdit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
