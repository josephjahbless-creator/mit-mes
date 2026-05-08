import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { projectsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import {
  PlusIcon, MagnifyingGlassIcon, FolderOpenIcon,
  BuildingOfficeIcon, CalendarDaysIcon, CurrencyDollarIcon,
  Squares2X2Icon, ListBulletIcon,
} from '@heroicons/react/24/outline';

const STATUS_CFG = {
  planned:   { label: 'Planned',   color: 'bg-gray-100 text-gray-600' },
  ongoing:   { label: 'Ongoing',   color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  delayed:   { label: 'Delayed',   color: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-400' },
};

const SUSTAIN_CFG = {
  strong:   { label: 'Strong',   color: 'text-green-600 bg-green-50 border-green-200' },
  moderate: { label: 'Moderate', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  weak:     { label: 'Weak',     color: 'text-red-600 bg-red-50 border-red-200' },
};

function fmt(n) {
  if (!n) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString();
}

function ProgressBar({ pct, color }) {
  const c = color || (pct >= 75 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400');
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${c} h-2 rounded-full transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-bold w-9 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

function ProjectCard({ project }) {
  const { metrics } = project;
  const status = STATUS_CFG[project.status] || STATUS_CFG.planned;
  const sustain = SUSTAIN_CFG[metrics?.sustainRating] || SUSTAIN_CFG.moderate;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all overflow-hidden flex flex-col">
      <div className="p-5 flex-1 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-900 leading-snug">{project.name}</p>
            {project.code && <p className="text-xs text-gray-400 font-mono mt-0.5">{project.code}</p>}
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${status.color}`}>{status.label}</span>
        </div>

        {/* Institution */}
        {project.institution && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <BuildingOfficeIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{project.institution.name}</span>
          </div>
        )}

        {/* Financials */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-xl p-2">
            <p className="text-[11px] text-gray-400">Budget</p>
            <p className="text-sm font-bold text-gray-800">TZS {fmt(project.totalBudget)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-2">
            <p className="text-[11px] text-gray-400">Spent</p>
            <p className="text-sm font-bold text-blue-700">TZS {fmt(metrics?.totalSpent)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2">
            <p className="text-[11px] text-gray-400">Balance</p>
            <p className="text-sm font-bold text-green-700">TZS {fmt(metrics?.remainingBalance)}</p>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span className="font-semibold">{metrics?.progressPct ?? 0}%</span>
          </div>
          <ProgressBar pct={metrics?.progressPct ?? 0} />
        </div>

        {/* Sustainability */}
        <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${sustain.color}`}>
          <span className="text-xs font-semibold">Sustainability</span>
          <span className="text-xs font-bold">{metrics?.sustainScore ?? 0}% · {sustain.label}</span>
        </div>
      </div>

      <div className="px-5 pb-4">
        <Link to={`/projects/${project.id}`}
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
          View Details
        </Link>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const user     = useAuthStore(s => s.user);
  const canCreate = ['super_admin', 'me_officer', 'admin', 'data_collector'].includes(user?.role);

  const [view,   setView]   = useState('card');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', status, search],
    queryFn: () => projectsApi.list({ ...(status ? { status } : {}), ...(search ? { search } : {}) }).then(r => r.data),
  });

  const filtered = projects; // server-side filtered already

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FolderOpenIcon className="w-7 h-7 text-blue-600" />
            Projects
          </h1>
          <p className="text-gray-500 text-sm mt-1">Monitor and evaluate institutional projects</p>
        </div>
        {canCreate && (
          <Link to="/projects/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shrink-0">
            <PlusIcon className="w-4 h-4" /> New Project
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-200 text-sm outline-none focus:border-blue-400" />
        </div>

        <div className="flex gap-1">
          {[['', 'All'], ['planned', 'Planned'], ['ongoing', 'Ongoing'], ['completed', 'Completed'], ['delayed', 'Delayed']].map(([v, l]) => (
            <button key={v} onClick={() => setStatus(v)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                status === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {l}
            </button>
          ))}
        </div>

        <div className="flex gap-1 ml-auto">
          <button onClick={() => setView('card')} className={`p-2 rounded-lg transition-colors ${view === 'card' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'}`}>
            <Squares2X2Icon className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:bg-gray-100'}`}>
            <ListBulletIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total',     count: filtered.length,                                       color: 'text-gray-700' },
            { label: 'Planned',   count: filtered.filter(p => p.status === 'planned').length,   color: 'text-gray-500' },
            { label: 'Ongoing',   count: filtered.filter(p => p.status === 'ongoing').length,   color: 'text-blue-600' },
            { label: 'Completed', count: filtered.filter(p => p.status === 'completed').length, color: 'text-green-600' },
            { label: 'Delayed',   count: filtered.filter(p => p.status === 'delayed').length,   color: 'text-red-500' },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 text-center">
              <p className={`text-xl font-extrabold ${color}`}>{count}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Card grid */}
      {!isLoading && view === 'card' && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {/* List view */}
      {!isLoading && view === 'list' && filtered.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Project', 'Institution', 'Status', 'Budget (TZS)', 'Spent', 'Progress', 'Sustainability', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => {
                const status = STATUS_CFG[p.status] || STATUS_CFG.planned;
                const sustain = SUSTAIN_CFG[p.metrics?.sustainRating] || SUSTAIN_CFG.moderate;
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {p.code && <p className="text-xs text-gray-400 font-mono">{p.code}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{p.institution?.code || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{fmt(p.totalBudget)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{fmt(p.metrics?.totalSpent)}</td>
                    <td className="px-4 py-3 w-32"><ProgressBar pct={p.metrics?.progressPct ?? 0} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${sustain.color}`}>
                        {p.metrics?.sustainScore}% {sustain.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/projects/${p.id}`} className="text-blue-600 hover:underline text-xs font-semibold">View</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
          <FolderOpenIcon className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No projects found</p>
          {canCreate && (
            <Link to="/projects/new" className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
              <PlusIcon className="w-4 h-4" /> Create First Project
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
