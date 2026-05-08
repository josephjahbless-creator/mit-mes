import { useState, useMemo, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ChevronDownIcon, ChevronRightIcon, PlusIcon, PencilIcon,
  BuildingOfficeIcon, FlagIcon, UserGroupIcon, RectangleGroupIcon,
  XMarkIcon, TableCellsIcon,
} from '@heroicons/react/24/outline';
import { frameworkApi, institutionsApi, dataEntryApi } from '../../api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const LOGO_MAP = {
  CAMARTEC: '/logos/camartec.png', BRELA: '/logos/brela.png', CBE: '/logos/cbe.png',
  FCC: '/logos/fcc.jpeg', NDC: '/logos/ndc.png', TEMDO: '/logos/temdo.jpeg',
  TIRDO: '/logos/tirdo.png', SIDO: '/logos/sido.jpeg', TBS: '/logos/tbs.png',
  TANTRADE: '/logos/tantrade.png', WRRB: '/logos/wrrb.png',
};

// ── Responsible badge helper ───────────────────────────────────────────────────
function ResponsibleBadge({ entity, size = 'sm' }) {
  if (!entity) return null;
  return (
    <span className={`inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5 shrink-0 ${size === 'xs' ? 'text-[9px]' : 'text-[10px]'}`}>
      <UserGroupIcon className="w-3 h-3" />
      {entity.code || entity.name}
    </span>
  );
}

// ── Multi-responsible badges ──────────────────────────────────────────────────
function ResponsibleBadges({ responsibles = [], size = 'xs' }) {
  if (!responsibles.length) return null;
  const MAX = 2;
  const shown = responsibles.slice(0, MAX);
  const rest  = responsibles.length - MAX;
  return (
    <div className="flex gap-1 items-center flex-wrap">
      {shown.map((r, i) => {
        const entity = r.unit || r.department || r.institution;
        return entity ? <ResponsibleBadge key={i} entity={entity} size={size} /> : null;
      })}
      {rest > 0 && (
        <span className="text-[9px] bg-teal-100 text-teal-700 rounded-full px-1.5 py-0.5 font-semibold">
          +{rest} more
        </span>
      )}
    </div>
  );
}

// ── NodeRow ────────────────────────────────────────────────────────────────────
function NodeRow({ label, name, depth = 0, children, onAdd, onEdit, responsibles, isRoot }) {
  const [open, setOpen] = useState(depth < 2);
  const indent = depth * 20;
  const colors = {
    objective: 'bg-mit-blue text-white',
    outcome:   'bg-blue-100 text-blue-800',
    output:    'bg-green-100 text-green-800',
    activity:  'bg-amber-100 text-amber-800',
    indicator: 'bg-purple-100 text-purple-800',
  };
  return (
    <div className={isRoot ? 'border border-gray-100 rounded-xl mb-2 overflow-hidden' : ''}>
      <div
        className={`flex items-center gap-2 py-1.5 px-3 hover:bg-gray-50 rounded-lg group ${isRoot ? 'bg-gray-50/80' : ''}`}
        style={{ paddingLeft: `${indent + 12}px` }}
      >
        <button onClick={() => setOpen(o => !o)} className="text-gray-400 w-4 flex-shrink-0">
          {children ? (open ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />) : <span className="w-4" />}
        </button>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${colors[label]}`}>
          {label.charAt(0).toUpperCase() + label.slice(1)}
        </span>
        <span className="text-sm text-gray-800 font-medium flex-1 leading-snug">{name}</span>
        {responsibles?.length > 0 && label === 'objective' && (
          <ResponsibleBadges responsibles={responsibles} size="xs" />
        )}
        <div className="hidden group-hover:flex gap-1">
          {onEdit && (
            <button onClick={onEdit} title="Edit" className="p-1 text-gray-400 hover:text-blue-600 rounded">
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {onAdd && (
            <button onClick={onAdd} title="Add child" className="p-1 text-gray-400 hover:text-green-600 rounded">
              <PlusIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {open && children && <div>{children}</div>}
    </div>
  );
}

// ── ObjectiveTree ──────────────────────────────────────────────────────────────
function ObjectiveTree({ objectives, canEdit, onAdd, onEdit, showResponsible = false, onReorder }) {
  const dragIdx  = useRef(null);
  const [dropIdx, setDropIdx] = useState(null);

  if (!objectives.length)
    return <p className="text-gray-400 text-center py-10 text-sm">No objectives assigned to this entity yet.</p>;

  const handleDragStart = (e, idx) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIdx(idx);
  };
  const handleDrop = (e, idx) => {
    e.preventDefault();
    if (dragIdx.current !== null && dragIdx.current !== idx && onReorder) {
      onReorder(dragIdx.current, idx);
    }
    dragIdx.current = null;
    setDropIdx(null);
  };
  const handleDragEnd = () => { dragIdx.current = null; setDropIdx(null); };

  return (
    <div className="space-y-2">
      {canEdit && (
        <p className="text-[10px] text-gray-400 text-right pr-1 pb-0.5">
          ↕ Drag objectives to reorder
        </p>
      )}
      {objectives.map((obj, idx) => (
        <div key={obj.id}
          className={`transition-all ${dropIdx === idx && dragIdx.current !== idx ? 'ring-2 ring-blue-400 rounded-xl' : ''}`}
          draggable={canEdit}
          onDragStart={canEdit ? e => handleDragStart(e, idx) : undefined}
          onDragOver={canEdit ? e => handleDragOver(e, idx) : undefined}
          onDrop={canEdit ? e => handleDrop(e, idx) : undefined}
          onDragEnd={canEdit ? handleDragEnd : undefined}
        >
          <NodeRow label="objective" name={obj.name} isRoot
            responsibles={showResponsible ? (obj.responsibles || []) : []}
            onEdit={canEdit ? () => onEdit('objective', obj) : null}
            onAdd={canEdit ? () => onAdd('outcome', obj.id) : null}
          >
            {obj.outcomes?.map(oc => (
              <NodeRow key={oc.id} label="outcome" name={oc.name} depth={1}
                onEdit={canEdit ? () => onEdit('outcome', oc) : null}
                onAdd={canEdit ? () => onAdd('output', oc.id) : null}
              >
                {oc.outputs?.map(op => (
                  <NodeRow key={op.id} label="output" name={op.name} depth={2}
                    onEdit={canEdit ? () => onEdit('output', op) : null}
                    onAdd={canEdit ? () => onAdd('activity', op.id) : null}
                  >
                    {[
                      ...(op.activities || []).map(act => (
                        <NodeRow key={act.id} label="activity" name={act.name} depth={3}
                          onEdit={canEdit ? () => onEdit('activity', act) : null}
                        />
                      )),
                      ...(op.indicators || []).map(ind => (
                        <NodeRow key={ind.id} label="indicator" name={`${ind.code}: ${ind.name}`} depth={3} />
                      )),
                    ]}
                  </NodeRow>
                ))}
              </NodeRow>
            ))}
          </NodeRow>
        </div>
      ))}
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
        active ? 'border-mit-blue text-mit-blue' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

// ── Multi-responsible selector ─────────────────────────────────────────────────
// departments: [{id, name, code, units: [{id, name, code}]}]
// value: [{departmentId, unitId}]
// onChange: (newValue) => void
function MultiResponsibleSelector({ departments, value, onChange }) {
  // Check if a dept has ANY assignment (whole dept or specific unit)
  function isDeptAssigned(deptId) {
    return value.some(r => r.departmentId === deptId);
  }
  function isWholeDeptAssigned(deptId) {
    return value.some(r => r.departmentId === deptId && !r.unitId);
  }
  function isUnitAssigned(deptId, unitId) {
    return value.some(r => r.departmentId === deptId && r.unitId === unitId);
  }

  function toggleWholeDept(deptId) {
    if (isDeptAssigned(deptId)) {
      // Remove ALL entries for this dept (whole dept and all units)
      onChange(value.filter(r => r.departmentId !== deptId));
    } else {
      // Add entire dept (no unit), remove any unit-specific entries
      onChange([...value.filter(r => r.departmentId !== deptId), { departmentId: deptId, unitId: null }]);
    }
  }

  function toggleUnit(deptId, unitId) {
    if (isUnitAssigned(deptId, unitId)) {
      // Remove this unit
      onChange(value.filter(r => !(r.departmentId === deptId && r.unitId === unitId)));
    } else {
      // Add this unit, remove "whole dept" entry if present
      onChange([
        ...value.filter(r => !(r.departmentId === deptId && r.unitId === null)),
        { departmentId: deptId, unitId },
      ]);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
      {departments.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No departments configured yet.</p>
      )}
      {departments.map((dept, di) => (
        <div key={dept.id} className={`${di > 0 ? 'border-t border-gray-100' : ''}`}>
          {/* Department row */}
          <label className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={isDeptAssigned(dept.id)}
              onChange={() => toggleWholeDept(dept.id)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-800">{dept.code}</span>
              <span className="text-xs text-gray-500 ml-1.5 truncate">{dept.name}</span>
            </div>
            {isWholeDeptAssigned(dept.id) && (
              <span className="text-[10px] bg-teal-100 text-teal-700 rounded-full px-1.5 py-0.5 font-semibold shrink-0">Entire dept</span>
            )}
          </label>

          {/* Unit rows: only show if dept is checked */}
          {isDeptAssigned(dept.id) && dept.units?.length > 0 && (
            <div className="bg-teal-50/40 border-t border-teal-100 pl-8">
              <p className="text-[10px] text-teal-600 font-semibold px-3 pt-1.5 pb-0.5 uppercase tracking-wide">Select specific units (optional)</p>
              {dept.units.map(unit => (
                <label key={unit.id} className="flex items-center gap-3 px-3 py-1.5 hover:bg-teal-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnitAssigned(dept.id, unit.id)}
                    onChange={() => toggleUnit(dept.id, unit.id)}
                    className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs font-semibold text-teal-800">{unit.code}</span>
                  <span className="text-xs text-gray-600 truncate">{unit.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FrameworkPage() {
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();
  const canEdit = ['super_admin', 'me_officer'].includes(user?.role);

  const [searchParams, setSearchParams] = useSearchParams();

  const [activeCtx,  setActiveCtx]  = useState(searchParams.get('ctx')  || 'ministerial');
  const [activeUnit, setActiveUnit] = useState(searchParams.get('unit') || '');

  function switchCtx(ctx, unit = '') {
    setActiveCtx(ctx);
    setActiveUnit(unit);
    const params = {};
    if (ctx !== 'ministerial') params.ctx = ctx;
    if (unit) params.unit = unit;
    setSearchParams(params);
  }

  // ── Modal state ────────────────────────────────────────────────────────────
  const [modal,       setModal]       = useState(null);
  const [form,        setForm]        = useState({ name: '', description: '' });
  const [responsibles, setResponsibles] = useState([]); // [{departmentId, unitId}]

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: () => dataEntryApi.listDepartments().then(r => r.data),
  });

  // ── Resolve active query params ────────────────────────────────────────────
  const queryParams = useMemo(() => {
    if (activeCtx === 'ministerial') return { scope: 'ministerial' };
    if (activeCtx.startsWith('dept:')) {
      const deptId = activeCtx.replace('dept:', '');
      if (activeUnit) return { unitId: activeUnit };
      return { departmentId: deptId };
    }
    if (activeCtx.startsWith('inst:')) return { institutionId: activeCtx.replace('inst:', '') };
    return { scope: 'ministerial' };
  }, [activeCtx, activeUnit]);

  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['framework', activeCtx, activeUnit],
    queryFn: () => frameworkApi.listObjectives(queryParams).then(r => r.data),
    placeholderData: [],   // show empty (not stale previous context) while loading
  });

  const activeDeptId   = activeCtx.startsWith('dept:') ? activeCtx.replace('dept:', '') : null;
  const activeDeptData = departments.find(d => d.id === activeDeptId);
  const activeInstId   = activeCtx.startsWith('inst:') ? activeCtx.replace('inst:', '') : null;
  const activeInstData = institutions.find(i => i.id === activeInstId);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async ({ type, data }) => {
      const map = {
        objective: frameworkApi.createObjective,
        outcome:   frameworkApi.createOutcome,
        output:    frameworkApi.createOutput,
        activity:  frameworkApi.createActivity,
      };
      return map[type](data);
    },
    onSuccess: () => { qc.invalidateQueries(['framework']); setModal(null); toast.success('Created successfully'); },
    onError: () => toast.error('Failed to create'),
  });

  const editMutation = useMutation({
    mutationFn: async ({ type, id, data }) => {
      const map = {
        objective: frameworkApi.updateObjective,
        outcome:   frameworkApi.updateOutcome,
        output:    frameworkApi.updateOutput,
        activity:  frameworkApi.updateActivity,
      };
      return map[type](id, data);
    },
    onSuccess: () => { qc.invalidateQueries(['framework']); setModal(null); toast.success('Updated successfully'); },
    onError: () => toast.error('Failed to update'),
  });

  const isSaving = createMutation.isPending || editMutation.isPending;

  // ── Drag-and-drop reorder handler ─────────────────────────────────────────
  const [localObjectives, setLocalObjectives] = useState(null);
  // When server data refreshes, drop the local optimistic copy
  const prevObjRef = useRef(objectives);
  if (objectives !== prevObjRef.current) { prevObjRef.current = objectives; setLocalObjectives(null); }
  const displayObjectives = localObjectives || objectives;

  const handleReorder = useCallback(async (fromIdx, toIdx) => {
    const arr = [...displayObjectives];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    setLocalObjectives(arr);

    // Persist new orderNo values to server (optimistic — fire and forget)
    try {
      await Promise.all(arr.map((obj, i) =>
        frameworkApi.updateObjective(obj.id, { orderNo: i + 1 })
      ));
      qc.invalidateQueries(['framework']);
    } catch {
      toast.error('Reorder failed — please try again');
      setLocalObjectives(null);
    }
  }, [displayObjectives, qc]);

  // ── Open handlers ──────────────────────────────────────────────────────────
  function openAdd(type, parentId) {
    let initResponsibles = [];
    if (activeDeptId && !activeUnit) initResponsibles = [{ departmentId: activeDeptId, unitId: null }];
    if (activeUnit)                  initResponsibles = [{ departmentId: activeDeptId, unitId: activeUnit }];
    setResponsibles(initResponsibles);
    setForm({ name: '', description: '' });
    setModal({ mode: 'add', type, parentId });
  }

  function openEdit(type, item) {
    if (type === 'objective') {
      setResponsibles((item.responsibles || []).map(r => ({
        departmentId:  r.department?.id  || null,
        unitId:        r.unit?.id        || null,
        institutionId: r.institution?.id || null,
      })));
    }
    setForm({ name: item.name || '', description: item.description || '' });
    setModal({ mode: 'edit', type, item });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const baseData = { name: form.name, description: form.description || null };

    if (modal.mode === 'edit') {
      const data = { ...baseData };
      if (modal.type === 'objective') {
        data.responsibles = responsibles;
      }
      editMutation.mutate({ type: modal.type, id: modal.item.id, data });
      return;
    }

    const parentKey = { outcome: 'objectiveId', output: 'outcomeId', activity: 'outputId' };
    const data = { ...baseData };
    if (modal.parentId) data[parentKey[modal.type]] = modal.parentId;

    if (modal.type === 'objective') {
      if (activeInstId) {
        data.institutionId = activeInstId;
      } else {
        data.responsibles = responsibles;
      }
    }
    createMutation.mutate({ type: modal.type, data });
  }

  const modalTitle = modal
    ? (modal.mode === 'edit' ? 'Edit' : 'Add') + ' ' + (modal.type.charAt(0).toUpperCase() + modal.type.slice(1))
    : '';

  // ── Responsible summary chips for preview ────────────────────────────────
  const responsibleSummary = useMemo(() => {
    return responsibles.map(r => {
      const dept = departments.find(d => d.id === r.departmentId);
      const unit = dept?.units?.find(u => u.id === r.unitId);
      if (unit) return `${unit.code} (${dept.code})`;
      if (dept) return dept.code;
      return null;
    }).filter(Boolean);
  }, [responsibles, departments]);

  const contextLabel = useMemo(() => {
    if (activeCtx === 'ministerial') return { icon: <FlagIcon className="w-5 h-5 text-mit-blue" />, title: 'Ministry of Industry and Trade · All National Objectives' };
    if (activeDeptData) {
      const unit = activeDeptData.units?.find(u => u.id === activeUnit);
      if (unit) return { icon: <UserGroupIcon className="w-5 h-5 text-teal-600" />, title: `${unit.name} (${unit.code}) · Unit Objectives` };
      return { icon: <RectangleGroupIcon className="w-5 h-5 text-teal-600" />, title: `${activeDeptData.name} (${activeDeptData.code}) · Department Objectives` };
    }
    if (activeInstData) return { icon: <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />, title: `${activeInstData.name} · Institution Objectives` };
    return { icon: null, title: '' };
  }, [activeCtx, activeDeptData, activeInstData, activeUnit]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Results Framework</h1>
          <p className="text-gray-500 text-sm mt-0.5">Strategic Objectives · Outcomes · Outputs · Activities · Multiple departments/units per objective supported</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/framework/ministerial" className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors">
            <TableCellsIcon className="w-4 h-4" /> Ministerial RF Matrix
          </Link>
          {canEdit && (
            <button onClick={() => openAdd('objective')} className="btn-primary">
              <PlusIcon className="w-4 h-4" /> Add Objective
            </button>
          )}
        </div>
      </div>

      {/* ── Main tab row ─────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0 flex-wrap overflow-x-auto">
          <TabBtn active={activeCtx === 'ministerial'} onClick={() => switchCtx('ministerial')}>
            <FlagIcon className="w-3.5 h-3.5" /> Ministerial
          </TabBtn>

          {departments.length > 0 && (
            <span className="flex items-center px-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest self-center">MIT Depts</span>
          )}

          {departments.map(dept => (
            <TabBtn key={dept.id}
              active={activeCtx === `dept:${dept.id}`}
              onClick={() => switchCtx(`dept:${dept.id}`, '')}
            >
              <RectangleGroupIcon className="w-3.5 h-3.5" />
              {dept.code}
            </TabBtn>
          ))}

          {institutions.length > 0 && (
            <span className="flex items-center px-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest self-center">Institutions</span>
          )}

          {institutions.map(inst => {
            const logo = LOGO_MAP[inst.code];
            return (
              <TabBtn key={inst.id}
                active={activeCtx === `inst:${inst.id}`}
                onClick={() => switchCtx(`inst:${inst.id}`)}
              >
                {logo
                  ? <img src={logo} alt={inst.code} className="w-4 h-4 object-contain rounded" />
                  : <BuildingOfficeIcon className="w-3.5 h-3.5" />}
                {inst.code}
              </TabBtn>
            );
          })}
        </div>

        {activeDeptData?.units?.length > 0 && (
          <div className="flex gap-0 flex-wrap overflow-x-auto bg-teal-50 border-t border-teal-100 px-2">
            <TabBtn active={!activeUnit} onClick={() => switchCtx(`dept:${activeDeptData.id}`, '')}>
              <RectangleGroupIcon className="w-3 h-3" /> All {activeDeptData.code}
            </TabBtn>
            {activeDeptData.units.map(unit => (
              <TabBtn key={unit.id}
                active={activeUnit === unit.id}
                onClick={() => switchCtx(`dept:${activeDeptData.id}`, unit.id)}
              >
                <UserGroupIcon className="w-3 h-3" /> {unit.code}
              </TabBtn>
            ))}
          </div>
        )}
      </div>

      {/* Context label */}
      <div className="flex items-center gap-2">
        {contextLabel.icon}
        <span className="font-semibold text-gray-800 text-sm">{contextLabel.title}</span>
        <span className="ml-auto text-xs text-gray-400">{objectives.length} objective{objectives.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tree */}
      <div className="card">
        {isLoading ? (
          <p className="text-gray-400 text-center py-10">Loading framework...</p>
        ) : objectives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <FlagIcon className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-500 font-semibold text-sm">No objectives found</p>
            <p className="text-gray-400 text-xs mt-1">
              {activeCtx === 'ministerial'
                ? 'No ministerial objectives have been added yet.'
                : 'No objectives are assigned to this entity yet.'}
            </p>
            {canEdit && (
              <button onClick={() => openAdd('objective')}
                className="mt-4 btn-primary text-xs px-3 py-1.5">
                <PlusIcon className="w-3.5 h-3.5" /> Add Objective
              </button>
            )}
          </div>
        ) : (
          <ObjectiveTree
            objectives={displayObjectives}
            canEdit={canEdit}
            onAdd={openAdd}
            onEdit={openEdit}
            showResponsible={activeCtx === 'ministerial'}
            onReorder={canEdit ? handleReorder : null}
          />
        )}
      </div>

      {/* ── Add / Edit modal ───────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{modalTitle}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} required
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* ── Multi-responsible assignment: OBJECTIVES only, not for ext. institutions ── */}
              {modal.type === 'objective' && !activeInstId && (
                <div className="border-2 border-teal-200 rounded-xl p-4 bg-teal-50/60 space-y-3">
                  <div className="flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-teal-600" />
                    <p className="text-sm font-bold text-teal-700">Responsible for Implementation</p>
                  </div>
                  <p className="text-xs text-teal-600 leading-relaxed">
                    Select all MIT departments and/or units responsible for implementing this objective.
                    Multiple entities can share a single objective; each will see it in their tab.
                  </p>

                  <MultiResponsibleSelector
                    departments={departments}
                    value={responsibles}
                    onChange={setResponsibles}
                  />

                  {/* Selected chips preview */}
                  {responsibleSummary.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 bg-white rounded-xl border border-teal-200 p-2.5">
                      <span className="text-[10px] text-teal-600 font-semibold self-center mr-1">Assigned:</span>
                      {responsibleSummary.map((label, i) => (
                        <span key={i} className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-[11px] font-semibold rounded-full px-2.5 py-0.5">
                          <UserGroupIcon className="w-3 h-3" />
                          {label}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic bg-white rounded-lg border border-gray-200 px-3 py-2">
                      No assignment yet. This objective will be visible under Ministerial tab only.
                    </p>
                  )}
                </div>
              )}

              {modal.type === 'objective' && activeInstId && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
                  This objective will be scoped to <strong>{activeInstData?.name}</strong>. Institution users will submit progress for its activities.
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : modal.mode === 'edit' ? 'Save Changes' : 'Add'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
