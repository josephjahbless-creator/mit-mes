import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { indicatorsApi, frameworkApi, institutionsApi, dataEntryApi } from '../../api';
import toast from 'react-hot-toast';

const FORMULA_TYPES = [
  { value: 'achievement_pct',  label: 'Achievement % — (actual / target) × 100' },
  { value: 'cumulative_total', label: 'Cumulative Total — baseline + actual' },
  { value: 'proportion_pct',   label: 'Proportion % — (actual + baseline) / total × 100' },
  { value: 'complement_pct',   label: 'Complement % — (total − cumulative) / total × 100' },
  { value: 'multi_input',      label: 'Multi-Input — sub-indicators with breakdown' },
  { value: 'manual',           label: 'Manual — no auto-calculation' },
];

const UNIT_CODES = new Set(['FAU', 'PMU', 'LSU', 'ICTU', 'GCU', 'IAU', 'MEU']);

export default function NewIndicatorPage() {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { reportingFrequency: 'quarterly', formulaType: 'achievement_pct' }
  });
  const navigate = useNavigate();
  const [ownerType, setOwnerType] = useState('');

  // ── Data fetches ─────────────────────────────────────────────────────────────
  const { data: objectives = [] } = useQuery({
    queryKey: ['framework'],
    queryFn: () => frameworkApi.listObjectives().then(r => r.data),
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => dataEntryApi.listDepartments().then(r => r.data),
  });

  // ── Derived ──────────────────────────────────────────────────────────────────
  const outputs = objectives.flatMap(obj =>
    obj.outcomes?.flatMap(oc =>
      oc.outputs?.map(op => ({
        id: op.id,
        label: `${obj.name} → ${oc.name} → ${op.name}`,
      })) || []
    ) || []
  );

  const supervisedInstitutions = institutions.filter(i => i.code !== 'MIT-HQ' && i.code !== 'MIT');
  const mitDepts = departments.filter(d => !UNIT_CODES.has(d.code));
  const mitUnits = departments.filter(d =>  UNIT_CODES.has(d.code));

  // ── Mutation ─────────────────────────────────────────────────────────────────
  const { mutateAsync } = useMutation({
    mutationFn: (data) => indicatorsApi.create(data),
    onSuccess: (res) => { toast.success('Indicator created'); navigate(`/indicators/${res.data.id}`); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  async function onSubmit(values) {
    if (!ownerType) { toast.error('Select an owner type'); return; }
    const ownerField = ownerType === 'Institution' ? { ownerInstitutionId: values.ownerId }
                     : ownerType === 'Department'  ? { ownerDepartmentId: values.ownerId }
                     :                              { ownerUnitId: values.ownerId };
    await mutateAsync({
      ...values,
      ownerType,
      ...ownerField,
      ownerId: undefined,
      baselineValue: values.baselineValue ? parseFloat(values.baselineValue) : null,
      baselineYear:  values.baselineYear  ? parseInt(values.baselineYear)    : null,
    });
  }

  const ownerOptions =
    ownerType === 'Institution' ? supervisedInstitutions :
    ownerType === 'Department'  ? mitDepts :
    ownerType === 'Unit'        ? mitUnits : [];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">New Indicator</h1>
      <p className="text-gray-500 text-sm mb-6">Indicators must be assigned to exactly one owner: Institution, Department, or Unit.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-5">

        {/* ── Owner assignment ──────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Indicator Ownership *</p>
          <div className="grid grid-cols-3 gap-2">
            {['Institution', 'Department', 'Unit'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => { setOwnerType(type); setValue('ownerId', ''); }}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  ownerType === type
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {ownerType && (
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">
                Select {ownerType} *
              </label>
              <select className="input" {...register('ownerId', { required: true })}>
                <option value="">Choose {ownerType}...</option>
                {ownerOptions.map(e => (
                  <option key={e.id} value={e.id}>{e.code ? `${e.code} — ${e.name}` : e.name}</option>
                ))}
              </select>
              {errors.ownerId && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
          )}
        </div>

        {/* ── Core fields ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Indicator Name *</label>
            <input className="input" placeholder="e.g. Number of businesses registered"
              {...register('name', { required: true })} />
            {errors.name && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>
          <div>
            <label className="label">Indicator Code *</label>
            <input className="input" placeholder="e.g. IND-CBE-001"
              {...register('code', { required: true })} />
            {errors.code && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>
          <div>
            <label className="label">Unit of Measurement *</label>
            <input className="input" placeholder="e.g. Number, %, TZS"
              {...register('unit', { required: true })} />
            {errors.unit && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>
        </div>

        <div>
          <label className="label">Output (Logframe) *</label>
          <select className="input" {...register('outputId', { required: true })}>
            <option value="">Select output...</option>
            {outputs.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          {errors.outputId && <p className="text-red-500 text-xs mt-1">Required</p>}
        </div>

        <div>
          <label className="label">Formula Type *</label>
          <select className="input" {...register('formulaType', { required: true })}>
            {FORMULA_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Reporting Frequency</label>
            <select className="input" {...register('reportingFrequency')}>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div>
            <label className="label">Data Source</label>
            <input className="input" placeholder="e.g. BRELA Registration System" {...register('dataSource')} />
          </div>
          <div>
            <label className="label">Baseline Value</label>
            <input type="number" step="any" className="input" {...register('baselineValue')} />
          </div>
          <div>
            <label className="label">Baseline Year</label>
            <input type="number" className="input" placeholder="e.g. 2024" {...register('baselineYear')} />
          </div>
        </div>

        <div>
          <label className="label">Responsible Person</label>
          <input className="input" placeholder="e.g. Director of Trade Development" {...register('responsiblePerson')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Indicator'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
