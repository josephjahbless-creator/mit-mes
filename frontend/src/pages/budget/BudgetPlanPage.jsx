import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { budgetApi, frameworkApi, institutionsApi } from '../../api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

const FISCAL_YEAR = getCurrentFiscalYear();

export default function BudgetPlanPage() {
  const { register, handleSubmit, watch, formState: { isSubmitting } } = useForm();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);

  const { data: objectives = [] } = useQuery({
    queryKey: ['framework'],
    queryFn: () => frameworkApi.listObjectives().then(r => r.data),
  });

  const activities = objectives.flatMap(obj =>
    obj.outcomes?.flatMap(oc =>
      oc.outputs?.flatMap(op =>
        op.activities?.map(act => ({
          id: act.id,
          label: `${op.name} → ${act.name}`,
        })) || []
      ) || []
    ) || []
  );

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
    enabled: ['super_admin', 'me_officer'].includes(user?.role),
  });

  const q1 = parseFloat(watch('q1Budget') || 0);
  const q2 = parseFloat(watch('q2Budget') || 0);
  const q3 = parseFloat(watch('q3Budget') || 0);
  const q4 = parseFloat(watch('q4Budget') || 0);
  const total = q1 + q2 + q3 + q4;

  const { mutateAsync } = useMutation({
    mutationFn: (data) => budgetApi.createPlan(data),
    onSuccess: () => { toast.success('Budget plan saved'); navigate('/budget'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  async function onSubmit(values) {
    await mutateAsync({
      ...values,
      fiscalYear: FISCAL_YEAR,
      q1Budget: parseFloat(values.q1Budget || 0),
      q2Budget: parseFloat(values.q2Budget || 0),
      q3Budget: parseFloat(values.q3Budget || 0),
      q4Budget: parseFloat(values.q4Budget || 0),
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Budget Plan</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">
        <div>
          <label className="label">Activity *</label>
          <select className="input" {...register('activityId', { required: true })}>
            <option value="">Select activity...</option>
            {activities.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </div>

        {['super_admin', 'me_officer'].includes(user?.role) && (
          <div>
            <label className="label">Institution *</label>
            <select className="input" {...register('institutionId', { required: true })}>
              <option value="">Select institution...</option>
              {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Funding Source</label>
            <input className="input" placeholder="e.g. Government, Donor" {...register('fundingSource')} />
          </div>
          <div>
            <label className="label">Currency</label>
            <select className="input" {...register('currency')}>
              <option value="TZS">TZS</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <div>
          <p className="label mb-2">Quarterly Budget Allocation</p>
          <div className="grid grid-cols-2 gap-3">
            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
              <div key={q}>
                <label className="text-xs text-gray-500 mb-1 block">{q}</label>
                <input type="number" step="any" className="input" placeholder="0" {...register(`q${q[1]}Budget`)} />
              </div>
            ))}
          </div>
          {total > 0 && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Budget</span>
              <span className="font-bold text-mit-blue">TZS {total.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Budget Plan'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
