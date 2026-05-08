import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { indicatorsApi } from '../../api';
import { BookOpenIcon, ChartBarIcon, FunnelIcon } from '@heroicons/react/24/outline';

const TYPE_COLORS = {
  output_indicator:  'bg-blue-100 text-blue-700',
  outcome_indicator: 'bg-green-100 text-green-700',
  impact_indicator:  'bg-purple-100 text-purple-700',
  process_indicator: 'bg-amber-100 text-amber-700',
};
const TYPE_LABELS = {
  output_indicator:  'Output',
  outcome_indicator: 'Outcome',
  impact_indicator:  'Impact',
  process_indicator: 'Process',
};
const STATUS_COLORS = {
  active:        'bg-green-100 text-green-700',
  discontinued:  'bg-red-100 text-red-600',
  under_revision:'bg-yellow-100 text-yellow-700',
  retired:       'bg-gray-100 text-gray-500',
};
const DIR_ICONS = { increasing: '↑', decreasing: '↓', stable: '→' };
const DIR_COLORS = { increasing: 'text-green-600', decreasing: 'text-red-500', stable: 'text-blue-500' };

export default function IndicatorLibraryPage() {
  const [search, setSearch]         = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOwner, setFilterOwner]   = useState('');

  const { data: indicators = [], isLoading } = useQuery({
    queryKey: ['indicator-library'],
    queryFn: () => indicatorsApi.list({}).then(r => r.data),
    staleTime: 60000,
  });

  const { data: stats } = useQuery({
    queryKey: ['indicator-stats'],
    queryFn: () => indicatorsApi.getStats().then(r => r.data),
    staleTime: 60000,
  });

  const filtered = indicators.filter(ind => {
    if (search && !ind.name.toLowerCase().includes(search.toLowerCase()) && !ind.code.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType   && ind.indicatorType   !== filterType)   return false;
    if (filterStatus && ind.indicatorStatus !== filterStatus) return false;
    if (filterOwner  && ind.ownerType       !== filterOwner)  return false;
    return true;
  });

  const hasFilters = search || filterType || filterStatus || filterOwner;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <BookOpenIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Indicator Library</h1>
            <p className="text-sm text-gray-500">Shared catalogue of all performance indicators across the Results Framework</p>
          </div>
        </div>
        <Link to="/indicators/new" className="btn-primary">+ New Indicator</Link>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Indicators</p>
          </div>
          {[
            { label: 'Output', key: 'output_indicator',  color: 'text-blue-600' },
            { label: 'Outcome', key: 'outcome_indicator', color: 'text-green-600' },
            { label: 'Impact', key: 'impact_indicator',  color: 'text-purple-600' },
          ].map(t => {
            const count = stats.byType?.find(b => b.indicatorType === t.key)?._count?.id || 0;
            return (
              <div key={t.key} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className={`text-3xl font-bold ${t.color}`}>{count}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
              placeholder="Search name or code..." />
            <ChartBarIcon className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="">All Types</option>
            <option value="output_indicator">Output</option>
            <option value="outcome_indicator">Outcome</option>
            <option value="impact_indicator">Impact</option>
            <option value="process_indicator">Process</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="discontinued">Discontinued</option>
            <option value="under_revision">Under Revision</option>
            <option value="retired">Retired</option>
          </select>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
            <option value="">All Owners</option>
            <option value="Institution">Institution</option>
            <option value="Department">Department</option>
            <option value="Unit">Unit</option>
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setFilterOwner(''); }}
              className="text-sm text-indigo-600 hover:underline px-2">Clear</button>
          )}
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} indicators</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpenIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No indicators found</p>
            {hasFilters && <p className="text-sm mt-1">Try adjusting your filters</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Code', 'Indicator Name', 'Type', 'Direction', 'Status', 'Owner', 'Frequency'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(ind => (
                  <tr key={ind.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/indicators/${ind.id}`} className="font-mono text-xs text-indigo-600 hover:underline">{ind.code}</Link>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <Link to={`/indicators/${ind.id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-600 line-clamp-2">{ind.name}</Link>
                      {ind.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ind.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {ind.indicatorType ? (
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${TYPE_COLORS[ind.indicatorType] || 'bg-gray-100 text-gray-600'}`}>
                          {TYPE_LABELS[ind.indicatorType] || ind.indicatorType}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ind.progressDirection ? (
                        <span className={`text-base font-bold ${DIR_COLORS[ind.progressDirection]}`} title={ind.progressDirection}>
                          {DIR_ICONS[ind.progressDirection]}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${STATUS_COLORS[ind.indicatorStatus] || 'bg-gray-100 text-gray-600'} capitalize`}>
                        {(ind.indicatorStatus || 'active').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {ind.ownerType && (
                        <div>
                          <span className="text-xs text-gray-400">{ind.ownerType}</span>
                          <p className="font-medium text-xs truncate max-w-[120px]">
                            {ind.ownerInstitution?.code || ind.ownerDepartment?.code || ind.ownerUnit?.code || '—'}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{ind.reportingFrequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
