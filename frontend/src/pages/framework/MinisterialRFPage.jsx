import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDownIcon, ChevronRightIcon, MagnifyingGlassIcon,
  FlagIcon, PrinterIcon, FunnelIcon, XMarkIcon,
  ChevronDoubleDownIcon, ChevronDoubleUpIcon,
  TableCellsIcon, CheckCircleIcon, ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../../store/authStore';
import { DEPT_META, DEPT_DATA, MIT_STRUCTURE, OBJ_META, OUTCOME_MAP, fmt } from '../../data/mitRFData';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

const FISCAL_YEAR = getCurrentFiscalYear();
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const PERIOD_LABELS = { Q1: 'Q1 Jul-Sep 2025', Q2: 'Q2 Oct-Dec 2025', Q3: 'Q3 Jan-Mar 2026', Q4: 'Q4 Apr-Jun 2026', Annual: 'Annual 2025/26' };

// ── Sidebar nav item ───────────────────────────────────────────────────────────
function NavItem({ code, name, active, onClick, type }) {
  const meta = DEPT_META[code] || {};
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group ${
        active
          ? 'bg-[#1a3a5c] text-white shadow-md'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 transition-all ${
        active ? 'bg-white/20' : (meta.color || 'bg-gray-100')
      }`}>
        {meta.icon || (type === 'dept' ? '🏛️' : '📌')}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold leading-tight ${active ? 'text-white' : ''}`}>{code}</p>
        <p className={`text-[10px] leading-tight truncate mt-0.5 ${active ? 'text-blue-200' : 'text-gray-400'}`}>{name}</p>
      </div>
    </button>
  );
}

// ── Summary stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, textColor }) {
  return (
    <div className={`rounded-2xl border p-4 flex items-start gap-3 bg-white shadow-sm`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className={`text-xl font-extrabold leading-tight ${textColor || 'text-gray-900'}`}>{value}</p>
        <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function MinisterialRFPage() {
  const user = useAuthStore(s => s.user);
  const isME = ['super_admin', 'me_officer'].includes(user?.role);
  const isRestricted = ['data_collector', 'admin'].includes(user?.role);

  // State
  const [selected, setSelected] = useState('ALL');      // dept/unit code or 'ALL'
  const [period,   setPeriod]   = useState('Q1');
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState(new Set());   // Set of "objCode" keys
  const [expandedOps, setExpandedOps] = useState(new Set()); // Set of "outputCode" keys
  const [allOpen,  setAllOpen]  = useState(false);


  // ── Selected dept data ───────────────────────────────────────────────────────
  const deptList = useMemo(() => {
    if (selected === 'ALL') {
      return Object.entries(DEPT_DATA).map(([code, data]) => ({ code, data }));
    }
    const data = DEPT_DATA[selected];
    return data ? [{ code: selected, data }] : [];
  }, [selected]);

  // Role-based access: restricted users see only their own dept
  const accessibleCodes = useMemo(() => {
    if (!isRestricted) return null; // null = all
    // Map user's dept/unit to a code — in real app use user.departmentCode or similar
    return [user?.departmentCode || user?.unitCode].filter(Boolean);
  }, [isRestricted, user]);

  // Filtered objectives based on search
  const filteredDeptList = useMemo(() => {
    let list = deptList;
    if (accessibleCodes) {
      list = list.filter(({ code }) => accessibleCodes.includes(code));
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.map(({ code, data }) => ({
      code,
      data: {
        ...data,
        objectives: data.objectives
          .filter(obj =>
            obj.name.toLowerCase().includes(q) ||
            obj.code.toLowerCase().includes(q) ||
            obj.outputs.some(op =>
              op.name.toLowerCase().includes(q) ||
              op.code.toLowerCase().includes(q) ||
              op.activities.some(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q))
            )
          )
          .map(obj => ({
            ...obj,
            outputs: obj.outputs.filter(op =>
              obj.name.toLowerCase().includes(q) ||
              obj.code.toLowerCase().includes(q) ||
              op.name.toLowerCase().includes(q) ||
              op.code.toLowerCase().includes(q) ||
              op.activities.some(a => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q))
            ),
          })),
      },
    })).filter(({ data }) => data.objectives.some(obj => obj.outputs.length > 0));
  }, [deptList, search, accessibleCodes]);

  // ── Aggregate stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalObjectives = 0, totalOutputs = 0, totalActivities = 0;
    filteredDeptList.forEach(({ data }) => {
      data.objectives.forEach(obj => {
        totalObjectives++;
        obj.outputs.forEach(op => {
          totalOutputs++;
          totalActivities += op.activities.length;
        });
      });
    });
    return { totalObjectives, totalOutputs, totalActivities };
  }, [filteredDeptList]);

  // ── Expand/collapse helpers ──────────────────────────────────────────────────
  function toggleObj(key) {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }
  function toggleOp(key) {
    setExpandedOps(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }
  function handleExpandAll() {
    if (allOpen) {
      setExpanded(new Set());
      setExpandedOps(new Set());
      setAllOpen(false);
    } else {
      const objKeys = new Set();
      const opKeys = new Set();
      filteredDeptList.forEach(({ code, data }) => {
        data.objectives.forEach(obj => {
          objKeys.add(`${code}:${obj.code}`);
          obj.outputs.forEach(op => opKeys.add(`${code}:${op.code}`));
        });
      });
      setExpanded(objKeys);
      setExpandedOps(opKeys);
      setAllOpen(true);
    }
  }


  const selectedMeta = selected === 'ALL' ? null : DEPT_META[selected];
  const selectedData = selected === 'ALL' ? null : DEPT_DATA[selected];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 -mx-4 -mt-4 overflow-hidden">

      {/* ── LEFT SIDEBAR ───────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden shadow-sm">

        {/* Sidebar header */}
        <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-[#1a3a5c] to-[#1e4d7b]">
          <div className="flex items-center gap-2 mb-1">
            <img src="/tanzania-emblem.svg" alt="MIT" className="w-7 h-7 drop-shadow shrink-0" />
            <div>
              <p className="text-xs font-bold text-white leading-tight">MIT - Headquarters</p>
              <p className="text-[10px] text-blue-200">Dodoma · FY 2025/2026</p>
            </div>
          </div>
        </div>

        {/* ALL view */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => setSelected('ALL')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${
              selected === 'ALL'
                ? 'bg-[#1a3a5c] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 ${
              selected === 'ALL' ? 'bg-white/20' : 'bg-blue-50'
            }`}>🏛️</span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${selected === 'ALL' ? 'text-white' : 'text-gray-700'}`}>All MIT</p>
              <p className={`text-[10px] truncate ${selected === 'ALL' ? 'text-blue-200' : 'text-gray-400'}`}>Ministry Overview</p>
            </div>
          </button>
        </div>

        {/* Scrollable dept/unit list */}
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">

          {/* Departments section */}
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 pt-3 pb-1">
            Departments ({MIT_STRUCTURE.departments.length})
          </p>
          {MIT_STRUCTURE.departments.map(dept => (
            <NavItem
              key={dept.code}
              code={dept.code}
              name={dept.name}
              active={selected === dept.code}
              onClick={() => setSelected(dept.code)}
              type="dept"
            />
          ))}

          {/* Units section */}
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 pt-4 pb-1">
            Units ({MIT_STRUCTURE.units.length})
          </p>
          {MIT_STRUCTURE.units.map(unit => (
            <NavItem
              key={unit.code}
              code={unit.code}
              name={unit.name}
              active={selected === unit.code}
              onClick={() => setSelected(unit.code)}
              type="unit"
            />
          ))}
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          <p className="text-[9px] text-gray-400 text-center">
            6 Departments · 7 Units · MIT HQ Dodoma
          </p>
        </div>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-3 flex-wrap shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {selectedMeta ? (
                <>
                  <span className="text-xl">{selectedMeta.icon}</span>
                  <div>
                    <h1 className="text-base font-bold text-gray-900 leading-tight">{selected} - {selectedMeta.label}</h1>
                    <p className="text-[10px] text-gray-400">Results Framework · FY {FISCAL_YEAR} · Sub-Vote {selectedData && DEPT_DATA[selected]?.subVote}</p>
                  </div>
                </>
              ) : (
                <>
                  <TableCellsIcon className="w-5 h-5 text-[#1a3a5c] shrink-0" />
                  <div>
                    <h1 className="text-base font-bold text-gray-900 leading-tight">MIT Results Framework - Ministerial View</h1>
                    <p className="text-[10px] text-gray-400">All Departments and Units · Headquarters Dodoma · FY {FISCAL_YEAR}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/framework/edit" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" /> Edit Framework
            </Link>
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600">
              <PrinterIcon className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center gap-3 flex-wrap shrink-0 shadow-sm">
          {/* Period */}
          <div className="flex items-center gap-1.5">
            <FunnelIcon className="w-3.5 h-3.5 text-gray-400" />
            <select value={period} onChange={e => setPeriod(e.target.value)}
              className="text-xs font-semibold text-gray-700 bg-transparent border-0 outline-none cursor-pointer pr-4">
              {PERIODS.map(p => <option key={p} value={p}>{PERIOD_LABELS[p]}</option>)}
            </select>
          </div>
          <div className="h-4 w-px bg-gray-200" />
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search objectives, outputs, activities..."
              className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Expand all */}
          <button onClick={handleExpandAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#1a3a5c] px-3 py-1.5 border border-gray-200 rounded-xl hover:border-blue-300 bg-white transition-colors">
            {allOpen
              ? <><ChevronDoubleUpIcon className="w-3.5 h-3.5" /> Collapse All</>
              : <><ChevronDoubleDownIcon className="w-3.5 h-3.5" /> Expand All</>}
          </button>
        </div>

        {/* Summary cards */}
        <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0 bg-gray-50 border-b border-gray-100">
          <StatCard label="Objectives" value={stats.totalObjectives}
            sub={`Across ${filteredDeptList.length} entity${filteredDeptList.length !== 1 ? 'ies' : 'y'}`}
            icon={FlagIcon} color="bg-[#1a3a5c]" />
          <StatCard label="Outputs" value={stats.totalOutputs}
            sub="Service targets / deliverables"
            icon={TableCellsIcon} color="bg-blue-600" />
          <StatCard label="Activities" value={stats.totalActivities}
            sub={`FY ${FISCAL_YEAR}`}
            icon={CheckCircleIcon} color="bg-emerald-600" />
          <StatCard label="Reporting Period" value={period}
            sub={PERIOD_LABELS[period]}
            icon={CheckCircleIcon}
            color="bg-amber-500" />
        </div>

        {/* RF Table */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {filteredDeptList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <TableCellsIcon className="w-14 h-14 text-gray-200 mb-4" />
              <p className="text-gray-500 font-semibold">No results match your search</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search or selecting a different entity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDeptList.map(({ code, data }) => (
                <RFEntityBlock
                  key={code}
                  code={code}
                  data={data}
                  period={period}
                  expanded={expanded}
                  expandedOps={expandedOps}
                  onToggleObj={toggleObj}
                  onToggleOp={toggleOp}
                  showEntityHeader={selected === 'ALL'}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Entity block (one dept/unit) ──────────────────────────────────────────────
function RFEntityBlock({ code, data, period, expanded, expandedOps, onToggleObj, onToggleOp, showEntityHeader }) {
  const meta = DEPT_META[code] || {};

  // Compute left-border class from meta color
  const borderClass = useMemo(() => {
    if (!meta.color) return 'border-l-gray-300';
    // Convert bg-X-50 border-X-200 to border-l-X-300
    const match = meta.color.match(/border-(\w+-\d+)/);
    return match ? `border-l-${match[1]}` : 'border-l-gray-300';
  }, [meta.color]);

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${showEntityHeader ? 'border-l-4 ' + borderClass : ''}`}>

      {/* Entity header (only in ALL view) */}
      {showEntityHeader && (
        <div className={`px-5 py-3 flex items-center gap-3 border-b ${meta.color || 'bg-gray-50 border-gray-200'}`}>
          <span className="text-xl">{meta.icon || '🏢'}</span>
          <div className="flex-1 min-w-0">
            <span className={`text-sm font-extrabold ${meta.textColor || 'text-gray-800'}`}>{code}</span>
            <span className="text-xs text-gray-600 ml-2">{meta.label}</span>
          </div>
          <span className="text-xs text-gray-500 font-medium">Sub-Vote: {DEPT_DATA[code]?.subVote}</span>
          <span className="text-xs font-semibold text-blue-700">Budget: TZS {fmt(data.budget)}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            meta.type === 'unit' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>{meta.type === 'unit' ? 'Unit' : 'Department'}</span>
        </div>
      )}

      {/* RF Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[900px]">
          {/* Table header */}
          <thead>
            <tr className="bg-[#1a3a5c] text-white">
              <th className="text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider w-8"></th>
              <th className="text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider w-24">Code</th>
              <th className="text-left px-4 py-2.5 font-bold text-[10px] uppercase tracking-wider">Objective / Outcome / Output / Activity</th>
              <th className="text-center px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider w-32">Budget (TZS)</th>
              <th className="text-center px-3 py-2.5 font-bold text-[10px] uppercase tracking-wider w-20">Period</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {data.objectives.map((obj) => {
              const objKey = `${code}:${obj.code}`;
              const objOpen = expanded.has(objKey);
              const objMeta = OBJ_META[obj.code] || {};
              const outcomeName = OUTCOME_MAP[obj.code] || '-';
              const objBudget = obj.outputs.reduce((s, op) => s + (op.budget || 0), 0);

              return [
                // ── OBJECTIVE ROW ────────────────────────────────────────────
                <tr key={`obj-${objKey}`}
                  className="cursor-pointer hover:bg-slate-50 bg-slate-50/70 border-b border-gray-200"
                  onClick={() => onToggleObj(objKey)}
                >
                  <td className="px-3 py-3">
                    <div className="w-4 h-4 flex items-center justify-center">
                      {objOpen
                        ? <ChevronDownIcon className="w-4 h-4 text-[#1a3a5c]" />
                        : <ChevronRightIcon className="w-4 h-4 text-gray-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-1 rounded-full ${objMeta.color || 'bg-gray-100 text-gray-700'}`}>
                      OBJ {obj.code}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-900 text-xs leading-snug">{obj.name}</p>
                    <p className="text-[10px] text-blue-600 mt-0.5 font-medium">Outcome: {outcomeName}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs font-semibold text-gray-600">{objBudget ? `${fmt(objBudget)}` : '-'}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-[10px] text-gray-400">{period}</span>
                  </td>
                </tr>,

                // ── OUTPUTS ──────────────────────────────────────────────────
                objOpen && obj.outputs.map((op) => {
                  const opKey = `${code}:${op.code}`;
                  const opOpen = expandedOps.has(opKey);

                  return [
                    // ── OUTPUT ROW ─────────────────────────────────────────────
                    <tr key={`op-${opKey}`}
                      className="cursor-pointer hover:bg-emerald-50/50 bg-white border-b border-gray-100"
                      onClick={e => { e.stopPropagation(); onToggleOp(opKey); }}
                    >
                      <td className="px-3 py-2.5 pl-7">
                        <div className="w-4 h-4 flex items-center justify-center">
                          {opOpen
                            ? <ChevronDownIcon className="w-3.5 h-3.5 text-emerald-600" />
                            : <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono">
                          {op.code}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-start gap-1">
                          <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shrink-0 mt-0.5">OUTPUT</span>
                          <p className="text-xs font-semibold text-gray-800 leading-snug">{op.name}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-xs font-semibold text-emerald-700">{op.budget ? fmt(op.budget) : '-'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="text-[10px] text-gray-400">{op.activities.length} act.</span>
                      </td>
                    </tr>,

                    // ── ACTIVITIES ─────────────────────────────────────────────
                    opOpen && op.activities.map((act) => (
                      <tr key={`act-${code}-${act.code}`}
                        className="bg-amber-50/30 hover:bg-amber-50/60 border-b border-gray-50">
                        <td className="px-3 py-2 pl-10" />
                        <td className="px-4 py-2">
                          <span className="text-[9px] font-mono font-bold text-amber-700">{act.code}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-start gap-1">
                            <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded shrink-0 mt-0.5">ACT</span>
                            <p className="text-[11px] text-gray-700 leading-snug">{act.name}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-[10px] text-gray-500 font-semibold">
                            {act.budget ? fmt(act.budget) : '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-gray-300 text-[10px]">-</span>
                        </td>
                      </tr>
                    )),
                  ];
                }),
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* Entity footer */}
      {!showEntityHeader && (
        <div className="bg-gray-50 border-t border-gray-100 px-5 py-2 flex items-center gap-4 text-[10px] text-gray-400">
          <span>Sub-Vote: <strong className="text-gray-600">{data.subVote}</strong></span>
          <span>Budget: <strong className="text-blue-600">TZS {fmt(data.budget)}</strong></span>
          <span>{data.objectives.length} objective{data.objectives.length !== 1 ? 's' : ''}</span>
          <span>{data.objectives.reduce((s, o) => s + o.outputs.length, 0)} outputs</span>
          <span>{data.objectives.reduce((s, o) => s + o.outputs.reduce((s2, op) => s2 + op.activities.length, 0), 0)} activities</span>
        </div>
      )}
    </div>
  );
}
