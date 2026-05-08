import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { budgetApi } from '../../api';
import StatusBadge from '../../components/ui/StatusBadge';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];
const FISCAL_YEAR = getCurrentFiscalYear();

export default function ExpenditurePage() {
  const [params] = useSearchParams();
  const planId = params.get('planId');
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const canApprove = ['super_admin', 'me_officer', 'admin'].includes(user?.role);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const { data: expenditures = [], isLoading } = useQuery({
    queryKey: ['expenditures', planId, FISCAL_YEAR],
    queryFn: () => budgetApi.listExpenditures({ budgetPlanId: planId || undefined }).then(r => r.data),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['budget-plans', FISCAL_YEAR],
    queryFn: () => budgetApi.listPlans({ fiscalYear: FISCAL_YEAR }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => budgetApi.createExpenditure(data),
    onSuccess: () => { qc.invalidateQueries(['expenditures']); toast.success('Expenditure recorded'); reset(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const approveMutation = useMutation({
    mutationFn: (id) => budgetApi.approveExpenditure(id),
    onSuccess: () => { qc.invalidateQueries(['expenditures']); toast.success('Approved'); },
  });

  async function onSubmit(values) {
    await createMutation.mutateAsync({ ...values, amount: parseFloat(values.amount) });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Expenditures</h1>
        <button className="btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {/* Record expenditure form */}
      <div className="card">
        <h2 className="text-base font-semibold mb-4">Record Expenditure</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 sm:col-span-1">
            <label className="label">Budget Plan *</label>
            <select className="input" defaultValue={planId || ''} {...register('budgetPlanId', { required: true })}>
              <option value="">Select plan...</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.activity?.name} · {p.institution?.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Period *</label>
            <select className="input" {...register('period', { required: true })}>
              <option value="">Select period...</option>
              {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Amount (TZS) *</label>
            <input type="number" step="any" className="input" {...register('amount', { required: true })} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="Brief description" {...register('description')} />
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Record Expenditure'}
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Expenditure History</h2>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : expenditures.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No expenditures recorded</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Activity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Period</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Amount (TZS)</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">By</th>
                {canApprove && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenditures.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-800">{e.budgetPlan?.activity?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{e.period}</td>
                  <td className="px-4 py-3 text-right font-semibold">{e.amount.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusBadge status={e.status} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{e.submittedBy?.name}</td>
                  {canApprove && (
                    <td className="px-4 py-3">
                      {e.status === 'submitted' && (
                        <button onClick={() => approveMutation.mutate(e.id)} className="text-xs text-green-600 hover:underline font-medium">
                          Approve
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
