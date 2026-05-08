import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApi } from '../../api';
import ProgressBar from '../../components/ui/ProgressBar';
import toast from 'react-hot-toast';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

const FISCAL_YEAR = getCurrentFiscalYear();

export default function BudgetPage() {
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['budget-plans', FISCAL_YEAR],
    queryFn: () => budgetApi.listPlans({ fiscalYear: FISCAL_YEAR }).then(r => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['budget-summary', FISCAL_YEAR],
    queryFn: () => budgetApi.summary({ fiscalYear: FISCAL_YEAR }).then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget Planning</h1>
          <p className="text-gray-500 text-sm">FY {FISCAL_YEAR} · Budget vs Expenditure</p>
        </div>
        <a href="/budget/plan" className="btn-primary">+ New Budget Plan</a>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <p className="text-sm text-gray-500">Total Budget</p>
            <p className="text-xl font-bold text-gray-900 mt-1">TZS {summary.totalBudget.toLocaleString()}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Total Spent</p>
            <p className="text-xl font-bold text-green-600 mt-1">TZS {summary.totalSpent.toLocaleString()}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">Absorption Rate</p>
            <p className="text-xl font-bold mt-1">{summary.absorptionRate}%</p>
            <ProgressBar value={summary.absorptionRate} max={100} showValue={false} size="sm" />
          </div>
        </div>
      )}

      {/* Budget plans table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : plans.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No budget plans yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Activity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Institution</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Budget (TZS)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Spent (TZS)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Variance</th>
                <th className="px-4 py-3 font-medium text-gray-600">Absorption</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.activity?.name}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{p.institution?.name}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{p.totalBudget.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-700">{(p.totalSpent || 0).toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.variance < 0 ? 'text-red-600' : 'text-gray-700'}`}>
                    {(p.variance || p.totalBudget).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <ProgressBar value={p.absorptionRate || 0} max={100} size="sm" showValue />
                  </td>
                  <td className="px-4 py-3">
                    <a href={`/budget/expenditures?planId=${p.id}`} className="text-xs text-mit-blue hover:underline">Add Expenditure</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
