import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { ShieldCheckIcon, UserCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

const ACTION_COLORS = {
  CREATE: 'bg-green-100 text-green-700 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-red-100 text-red-700 border-red-200',
};

export default function AuditLogPage() {
  const [page, setPage]               = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterTable, setFilterTable]   = useState('');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filterAction, filterTable, startDate, endDate],
    queryFn: () => api.get('/audit-logs', {
      params: {
        page, limit: 50,
        action:    filterAction || undefined,
        tableName: filterTable  || undefined,
        startDate: startDate    || undefined,
        endDate:   endDate      || undefined,
      },
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => api.get('/audit-logs/stats').then(r => r.data),
    staleTime: 60000,
  });

  const logs  = data?.logs  || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;
  const tableOptions = stats?.byTable?.map(t => t.tableName) || [];

  const clearFilters = () => {
    setFilterAction(''); setFilterTable(''); setStartDate(''); setEndDate(''); setPage(1);
  };
  const hasFilters = filterAction || filterTable || startDate || endDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <ShieldCheckIcon className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-500">Immutable trail of all system changes: who did what and when</p>
          </div>
        </div>
        <span className="text-sm text-gray-400">{total.toLocaleString()} total events</span>
      </div>

      {/* Stats row */}
      {stats?.byAction && (
        <div className="grid grid-cols-3 gap-4">
          {stats.byAction.map(a => (
            <div key={a.action} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
              <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold border ${ACTION_COLORS[a.action] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {a.action}
              </span>
              <span className="text-2xl font-bold text-gray-900">{a._count.id.toLocaleString()}</span>
              <span className="text-sm text-gray-400">events</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select value={filterTable} onChange={e => { setFilterTable(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">All Tables</option>
            {tableOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
          {hasFilters && (
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline px-2">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Log table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No audit events found</p>
            <p className="text-sm mt-1">Events will appear here once users perform actions in the system</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['Timestamp', 'User', 'Action', 'Table', 'Record ID', 'Changes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {fmtDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserCircleIcon className="w-4 h-4 text-gray-400 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-gray-800">{log.user?.name || '—'}</div>
                          <div className="text-xs text-gray-400">{log.user?.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">{log.tableName}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                      {log.recordId ? log.recordId.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {log.changes ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-blue-600 hover:underline">View changes</summary>
                          <pre className="text-xs bg-gray-50 rounded p-2 mt-1 overflow-auto max-h-32 max-w-xs whitespace-pre-wrap break-all">
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </details>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <span className="text-sm text-gray-500">Page {page} of {pages} · {total} total events</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100">
                Previous
              </button>
              <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-100">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
