import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { indicatorsApi, institutionsApi } from '../../api';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import StatusBadge from '../../components/ui/StatusBadge';
import ProgressBar from '../../components/ui/ProgressBar';
import InsightPanel from '../../components/InsightPanel';
import useAuthStore from '../../store/authStore';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

const FISCAL_YEAR = getCurrentFiscalYear();

export default function IndicatorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const canSetTargets = ['super_admin', 'me_officer', 'admin'].includes(user?.role);
  const canEdit = ['super_admin', 'me_officer'].includes(user?.role);

  const { data: indicator, isLoading } = useQuery({
    queryKey: ['indicator', id],
    queryFn: () => indicatorsApi.get(id).then(r => r.data),
  });

  const { data: targets = [] } = useQuery({
    queryKey: ['indicator-targets', id],
    queryFn: () => indicatorsApi.getTargets(id, { fiscalYear: FISCAL_YEAR }).then(r => r.data),
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const { register, handleSubmit, reset } = useForm();

  const targetMutation = useMutation({
    mutationFn: (data) => indicatorsApi.setTargets(id, { ...data, fiscalYear: FISCAL_YEAR }),
    onSuccess: () => { qc.invalidateQueries(['indicator-targets', id]); toast.success('Targets saved'); reset(); },
    onError: () => toast.error('Failed to save targets'),
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (!indicator) return <div className="p-8 text-center text-red-400">Indicator not found</div>;

  const chain = [
    indicator.output?.outcome?.objective?.name,
    indicator.output?.outcome?.name,
    indicator.output?.name,
  ].filter(Boolean).join(' → ');

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-blue font-mono">{indicator.code}</span>
            <span className="badge-gray capitalize">{indicator.formulaType?.replace(/_/g, ' ')}</span>
            <span className="badge-gray capitalize">{indicator.reportingFrequency}</span>
            {indicator.indicatorType && (
              <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700 capitalize">
                {indicator.indicatorType.replace(/_indicator$/, '').replace(/_/g, ' ')}
              </span>
            )}
            {indicator.progressDirection && (
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                indicator.progressDirection === 'increasing' ? 'bg-green-100 text-green-700' :
                indicator.progressDirection === 'decreasing' ? 'bg-red-100 text-red-700' :
                                                                'bg-blue-100 text-blue-700'
              }`}>
                {indicator.progressDirection === 'increasing' ? '↑ Increasing' :
                 indicator.progressDirection === 'decreasing' ? '↓ Decreasing' : '→ Stable'}
              </span>
            )}
            {indicator.indicatorStatus && indicator.indicatorStatus !== 'active' && (
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                indicator.indicatorStatus === 'retired'      ? 'bg-gray-100 text-gray-500' :
                indicator.indicatorStatus === 'discontinued' ? 'bg-red-100 text-red-600' :
                                                                'bg-yellow-100 text-yellow-700'
              } capitalize`}>
                {indicator.indicatorStatus.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{indicator.name}</h1>
          {indicator.ownerType && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                indicator.ownerType === 'Institution' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                indicator.ownerType === 'Department'  ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                                        'bg-violet-50 text-violet-700 border-violet-200'
              }`}>{indicator.ownerType}</span>
              <span className="text-xs font-semibold text-gray-700">
                {indicator.ownerInstitution?.name || indicator.ownerDepartment?.name || indicator.ownerUnit?.name || '—'}
              </span>
              {(indicator.ownerInstitution?.code || indicator.ownerDepartment?.code || indicator.ownerUnit?.code) && (
                <span className="text-xs text-gray-400 font-mono">
                  ({indicator.ownerInstitution?.code || indicator.ownerDepartment?.code || indicator.ownerUnit?.code})
                </span>
              )}
            </div>
          )}
          {chain && <p className="text-sm text-gray-400 mt-1">{chain}</p>}
          {indicator.description && (
            <p className="text-sm text-gray-600 mt-2 max-w-2xl">{indicator.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <button
              onClick={() => navigate(`/indicators/${id}/edit`)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
              Edit
            </button>
          )}
          <Link to="/data-entry/submit" className="btn-primary">Submit Data</Link>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400">Unit</p>
          <p className="font-bold text-gray-900 mt-1">{indicator.unit}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400">Baseline</p>
          <p className="font-bold text-gray-900 mt-1">
            {indicator.baselineValue != null ? `${indicator.baselineValue.toLocaleString()} (${indicator.baselineYear})` : '-'}
          </p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400">Data Source</p>
          <p className="font-bold text-gray-900 mt-1 text-sm">{indicator.dataSource || '-'}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-gray-400">Responsible</p>
          <p className="font-bold text-gray-900 mt-1 text-sm">{indicator.responsiblePerson || '-'}</p>
        </div>
      </div>

      {/* ── Insight Panel (trend & anomaly summary for this indicator) ─── */}
      <InsightPanel
        indicatorId={id}
        fiscalYear={FISCAL_YEAR}
        title="What the trend says"
        compact
        limit={6}
      />

      {/* Targets */}
      <div className="card">
        <h2 className="text-base font-semibold mb-4">Targets · FY {FISCAL_YEAR}</h2>
        {targets.length > 0 ? (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-gray-500 font-medium">Institution</th>
                <th className="text-right py-2 text-gray-500 font-medium">Q1</th>
                <th className="text-right py-2 text-gray-500 font-medium">Q2</th>
                <th className="text-right py-2 text-gray-500 font-medium">Q3</th>
                <th className="text-right py-2 text-gray-500 font-medium">Q4</th>
                <th className="text-right py-2 text-gray-500 font-medium">Annual</th>
              </tr>
            </thead>
            <tbody>
              {targets.map(t => (
                <tr key={t.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-800">{t.institution?.name}</td>
                  <td className="py-2 text-right">{t.q1Target ?? '-'}</td>
                  <td className="py-2 text-right">{t.q2Target ?? '-'}</td>
                  <td className="py-2 text-right">{t.q3Target ?? '-'}</td>
                  <td className="py-2 text-right">{t.q4Target ?? '-'}</td>
                  <td className="py-2 text-right font-semibold">{t.annualTarget ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-gray-400 text-sm mb-4">No targets set yet.</p>}

        {canSetTargets && (
          <form onSubmit={handleSubmit(d => targetMutation.mutate(d))} className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Set / Update Targets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {['super_admin', 'me_officer'].includes(user?.role) && (
                <div className="col-span-2 sm:col-span-3">
                  <label className="label">Institution</label>
                  <select className="input" {...register('institutionId', { required: true })}>
                    <option value="">Select institution...</option>
                    {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
              )}
              {['Q1','Q2','Q3','Q4','Annual'].map(q => (
                <div key={q}>
                  <label className="label">{q} Target</label>
                  <input type="number" step="any" className="input" {...register(`${q.toLowerCase()}Target`, { valueAsNumber: true })} />
                </div>
              ))}
            </div>
            <button type="submit" className="btn-primary mt-3" disabled={targetMutation.isPending}>
              {targetMutation.isPending ? 'Saving...' : 'Save Targets'}
            </button>
          </form>
        )}
      </div>

      {/* PIRS Documentation */}
      {(indicator.collectionMethod || indicator.verificationSource || indicator.dataSource || indicator.responsiblePerson || indicator.minValue != null || indicator.maxValue != null) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">PIRS Documentation</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {indicator.dataSource && (
              <div><span className="text-gray-400 text-xs">Data Source</span><p className="font-medium text-gray-800 mt-0.5">{indicator.dataSource}</p></div>
            )}
            {indicator.collectionMethod && (
              <div><span className="text-gray-400 text-xs">Collection Method</span><p className="font-medium text-gray-800 mt-0.5">{indicator.collectionMethod}</p></div>
            )}
            {indicator.verificationSource && (
              <div className="col-span-2"><span className="text-gray-400 text-xs">Verification Source</span><p className="font-medium text-gray-800 mt-0.5">{indicator.verificationSource}</p></div>
            )}
            {indicator.responsiblePerson && (
              <div><span className="text-gray-400 text-xs">Responsible Person</span><p className="font-medium text-gray-800 mt-0.5">{indicator.responsiblePerson}</p></div>
            )}
            {(indicator.minValue != null || indicator.maxValue != null) && (
              <div>
                <span className="text-gray-400 text-xs">Acceptable Range</span>
                <p className="font-medium text-gray-800 mt-0.5">
                  {indicator.minValue != null ? indicator.minValue.toLocaleString() : '—'} to {indicator.maxValue != null ? indicator.maxValue.toLocaleString() : '—'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
