import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';
import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';

const FISCAL_YEARS = ['2023-2024', '2024-2025', '2025-2026', '2026-2027'];
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4'];

function CompBar({ value, colorClass }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-16">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${colorClass}`}
          style={{ width: `${Math.min(value || 0, 100)}%` }}
        />
      </div>
      <span className="text-sm font-bold w-10 text-right tabular-nums">{value ?? 0}%</span>
    </div>
  );
}

function statCard(label, value, Icon, colorClass) {
  return (
    <div className={`rounded-xl border p-5 ${colorClass}`}>
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}

export default function CompletenessPage() {
  const [fy, setFy]         = useState(getCurrentFiscalYear());
  const [period, setPeriod] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['completeness', fy, period],
    queryFn: () => api.get('/data-entry/completeness', {
      params: { fiscalYear: fy, period: period || undefined },
    }).then(r => r.data),
    staleTime: 60000,
  });

  const report = data?.report || [];
  const avgComp    = report.length ? Math.round(report.reduce((s, r) => s + r.completenessRate, 0) / report.length) : 0;
  const fullCount  = report.filter(r => r.completenessRate === 100).length;
  const partCount  = report.filter(r => r.completenessRate > 0 && r.completenessRate < 100).length;
  const noneCount  = report.filter(r => r.completenessRate === 0).length;

  const avgColor   = avgComp >= 90 ? 'text-green-600 bg-green-50 border-green-200'
                   : avgComp >= 60 ? 'text-amber-600 bg-amber-50 border-amber-200'
                   : 'text-red-600 bg-red-50 border-red-200';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Completeness Monitoring</h1>
          <p className="text-sm text-gray-500">Track which institutions have submitted their indicator data</p>
        </div>
        <div className="flex gap-3">
          <select value={fy} onChange={e => setFy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
            {FISCAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
            <option value="">All Periods (Q1–Q4)</option>
            {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={() => refetch()} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCard(`Avg Completeness (${fy})`, `${avgComp}%`, CheckCircleIcon, avgColor)}
        {statCard('Fully Reported', fullCount, CheckCircleIcon, 'text-green-600 bg-green-50 border-green-200')}
        {statCard('Partial / Late', partCount, ClockIcon, 'text-amber-600 bg-amber-50 border-amber-200')}
        {statCard('Not Reported', noneCount, ExclamationCircleIcon, 'text-red-600 bg-red-50 border-red-200')}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <BuildingOffice2Icon className="w-5 h-5 text-gray-400" />
          <span className="font-semibold text-gray-800">
            Institution Reporting Status: {fy} {period ? `· ${period}` : '· All Periods'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : report.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <BuildingOffice2Icon className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>No data found for the selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Institution', 'Expected', 'Submitted', 'Approved', 'Missing', 'Completeness Rate', 'Approval Rate'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.map((row, idx) => {
                  const compColor = row.completenessRate >= 90 ? 'bg-green-500'
                                  : row.completenessRate >= 60 ? 'bg-amber-400'
                                  : 'bg-red-500';
                  const apprColor = row.approvalRate >= 90 ? 'bg-blue-500'
                                  : row.approvalRate >= 60 ? 'bg-indigo-400'
                                  : 'bg-gray-400';
                  return (
                    <tr key={row.institution.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-400 tabular-nums">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800">{row.institution.name}</div>
                        <div className="text-xs text-gray-400">{row.institution.code}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 tabular-nums">{row.totalExpected}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800 tabular-nums">{row.submitted}</td>
                      <td className="px-4 py-3 text-sm font-medium text-green-600 tabular-nums">{row.approved}</td>
                      <td className="px-4 py-3">
                        {row.missing > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-0.5">
                            <ExclamationCircleIcon className="w-3 h-3" />
                            {row.missing} missing
                          </span>
                        ) : (
                          <span className="text-xs text-green-600 font-medium">✓ All done</span>
                        )}
                      </td>
                      <td className="px-4 py-3 w-52">
                        <CompBar value={row.completenessRate} colorClass={compColor} />
                      </td>
                      <td className="px-4 py-3 w-44">
                        <CompBar value={row.approvalRate} colorClass={apprColor} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span><span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full mr-1.5" />Completeness ≥ 90% (On Track)</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-full mr-1.5" />Completeness 60–89% (Moderate)</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5" />Completeness &lt; 60% (At Risk)</span>
        <span><span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full mr-1.5" />Approval rate (blue bar)</span>
      </div>
    </div>
  );
}
