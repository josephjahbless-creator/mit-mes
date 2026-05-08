import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { indicatorsApi, frameworkApi, institutionsApi, dataEntryApi } from '../../api';
import toast from 'react-hot-toast';
import { InformationCircleIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { FORMULA_META, FORMULA_LIST, FORMULA_CATEGORIES } from '../../utils/formulaMeta';

const INDICATOR_TYPES = [
  { value: 'output_indicator',  label: 'Output',  desc: 'Direct products of activities' },
  { value: 'outcome_indicator', label: 'Outcome', desc: 'Short/medium-term results' },
  { value: 'impact_indicator',  label: 'Impact',  desc: 'Long-term development change' },
  { value: 'process_indicator', label: 'Process', desc: 'Quality/efficiency of processes' },
];

const DIRECTIONS = [
  { value: 'increasing', label: 'Increasing', icon: '↑', color: 'text-green-600' },
  { value: 'decreasing', label: 'Decreasing', icon: '↓', color: 'text-red-600'   },
  { value: 'stable',     label: 'Stable',     icon: '→', color: 'text-blue-600'  },
];

const UNIT_CODES = new Set(['FAU', 'PMU', 'LSU', 'ICTU', 'GCU', 'IAU', 'MEU']);

const CAT_COLORS = {
  basic:      'border-blue-200   bg-blue-50   text-blue-700',
  growth:     'border-green-200  bg-green-50  text-green-700',
  change:     'border-teal-200   bg-teal-50   text-teal-700',
  composite:  'border-purple-200 bg-purple-50 text-purple-700',
  efficiency: 'border-amber-200  bg-amber-50  text-amber-700',
  rate:       'border-indigo-200 bg-indigo-50 text-indigo-700',
  average:    'border-sky-200    bg-sky-50    text-sky-700',
  milestone:  'border-emerald-200 bg-emerald-50 text-emerald-700',
};

// Group formulas by category for the picker
const GROUPED = Object.entries(FORMULA_CATEGORIES).map(([cat, meta]) => ({
  cat,
  ...meta,
  formulas: FORMULA_LIST.filter(k => FORMULA_META[k]?.category === cat),
})).filter(g => g.formulas.length > 0);

export default function NewIndicatorPage() {
  const { id: editId } = useParams();           // present when route is /indicators/:id/edit
  const isEditMode = Boolean(editId);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: {
      reportingFrequency: 'quarterly',
      formulaType:        'achievement_pct',
      indicatorStatus:    'active',
      progressDirection:  'increasing',
    },
  });
  const navigate = useNavigate();
  const [ownerType, setOwnerType]         = useState('');
  const [indicatorType, setIndicatorType] = useState('');
  const [direction, setDirection]         = useState('increasing');
  const [formulaType, setFormulaType]     = useState('achievement_pct');

  // For formulas that need config (proportion_pct, complement_pct, rate_per_n, cost_per_output)
  const [formulaConfig, setFormulaConfig] = useState({});

  // Sub-indicator builder (multi_input, weighted_score)
  const [subIndicators, setSubIndicators] = useState([
    { key: 'sub1', label: '', weight: '', target: '' },
  ]);

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

  // In edit mode: load existing indicator and prefill the form
  const { data: existingIndicator } = useQuery({
    queryKey: ['indicator', editId],
    queryFn: () => indicatorsApi.get(editId).then(r => r.data),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (!existingIndicator) return;
    const ind = existingIndicator;
    reset({
      name:               ind.name               ?? '',
      code:               ind.code               ?? '',
      outputId:           ind.outputId           ?? '',
      unit:               ind.unit               ?? '',
      dataSource:         ind.dataSource         ?? '',
      reportingFrequency: ind.reportingFrequency ?? 'quarterly',
      formulaType:        ind.formulaType        ?? 'achievement_pct',
      baselineValue:      ind.baselineValue      ?? '',
      baselineYear:       ind.baselineYear       ?? '',
      minValue:           ind.minValue           ?? '',
      maxValue:           ind.maxValue           ?? '',
      indicatorStatus:    ind.indicatorStatus    ?? 'active',
      progressDirection:  ind.progressDirection  ?? 'increasing',
      description:        ind.description        ?? '',
      collectionMethod:   ind.collectionMethod   ?? '',
      verificationSource: ind.verificationSource ?? '',
      responsiblePerson:  ind.responsiblePerson  ?? '',
      ownerId: ind.ownerInstitutionId ?? ind.ownerDepartmentId ?? ind.ownerUnitId ?? '',
    });
    if (ind.formulaType)        { setFormulaType(ind.formulaType); }
    if (ind.formulaConfig)      { setFormulaConfig(ind.formulaConfig);
      if (ind.formulaConfig.subIndicators) setSubIndicators(ind.formulaConfig.subIndicators.map(s => ({ ...s, weight: String(s.weight), target: String(s.target ?? '') })));
    }
    if (ind.ownerType)          setOwnerType(ind.ownerType);
    if (ind.indicatorType)      setIndicatorType(ind.indicatorType);
    if (ind.progressDirection)  setDirection(ind.progressDirection);
  }, [existingIndicator, reset]);

  const createMutation = useMutation({
    mutationFn: (data) => indicatorsApi.create(data),
    onSuccess: (res) => { toast.success('Indicator created'); navigate(`/indicators/${res.data.id}`); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => indicatorsApi.update(editId, data),
    onSuccess: () => { toast.success('Indicator updated'); navigate(`/indicators/${editId}`); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const { mutateAsync } = isEditMode ? updateMutation : createMutation;

  function handleFormulaChange(val) {
    setFormulaType(val);
    setValue('formulaType', val);
    setFormulaConfig({});
  }

  function addSubIndicator() {
    const key = `sub${subIndicators.length + 1}`;
    setSubIndicators(prev => [...prev, { key, label: '', weight: '', target: '' }]);
  }
  function removeSubIndicator(i) {
    setSubIndicators(prev => prev.filter((_, idx) => idx !== i));
  }
  function updateSub(i, field, value) {
    setSubIndicators(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      // Auto-generate key from label
      if (field === 'label') next[i].key = value.toLowerCase().replace(/\W+/g, '_').slice(0, 20) || `sub${i + 1}`;
      return next;
    });
  }

  async function onSubmit(values) {
    if (!ownerType) { toast.error('Select an owner type'); return; }

    // Build formulaConfig
    let config = { ...formulaConfig };
    if (['multi_input', 'weighted_score'].includes(formulaType)) {
      const validSubs = subIndicators.filter(s => s.label);
      if (!validSubs.length) { toast.error('Add at least one sub-indicator'); return; }
      config.subIndicators = validSubs.map(s => ({
        key:    s.key || s.label.toLowerCase().replace(/\W+/g, '_'),
        label:  s.label,
        weight: parseFloat(s.weight) || (1 / validSubs.length),
        target: parseFloat(s.target) || null,
      }));
    }

    const ownerField =
      ownerType === 'Institution' ? { ownerInstitutionId: values.ownerId } :
      ownerType === 'Department'  ? { ownerDepartmentId: values.ownerId }  :
                                    { ownerUnitId: values.ownerId };

    await mutateAsync({
      ...values,
      ownerType,
      ...ownerField,
      ownerId:          undefined,
      indicatorType:    indicatorType || null,
      progressDirection: direction,
      baselineValue:    values.baselineValue ? parseFloat(values.baselineValue) : null,
      baselineYear:     values.baselineYear  ? parseInt(values.baselineYear)    : null,
      minValue:         values.minValue !== '' && values.minValue != null ? parseFloat(values.minValue) : null,
      maxValue:         values.maxValue !== '' && values.maxValue != null ? parseFloat(values.maxValue) : null,
      formulaConfig:    Object.keys(config).length ? config : null,
    });
  }

  const ownerOptions =
    ownerType === 'Institution' ? supervisedInstitutions :
    ownerType === 'Department'  ? mitDepts :
    ownerType === 'Unit'        ? mitUnits : [];

  const meta = FORMULA_META[formulaType];
  const needsSubBuilder = ['multi_input', 'weighted_score'].includes(formulaType);
  const isWeighted      = formulaType === 'weighted_score';

  const totalWeight = subIndicators.reduce((s, x) => s + (parseFloat(x.weight) || 0), 0);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {isEditMode ? `Edit Indicator` : 'New Indicator'}
      </h1>
      {isEditMode && existingIndicator && (
        <p className="text-xs text-gray-400 font-mono mb-1">{existingIndicator.code}</p>
      )}
      <p className="text-gray-500 text-sm mb-6">
        Indicators must be assigned to exactly one owner: Institution, Department, or Unit.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* ── Owner assignment ────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">Indicator Ownership *</p>
          <div className="grid grid-cols-3 gap-2">
            {['Institution', 'Department', 'Unit'].map(type => (
              <button key={type} type="button"
                onClick={() => { setOwnerType(type); setValue('ownerId', ''); }}
                className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  ownerType === type
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}>{type}</button>
            ))}
          </div>
          {ownerType && (
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">Select {ownerType} *</label>
              <select className="input" {...register('ownerId', { required: true })}>
                <option value="">Choose {ownerType}...</option>
                {ownerOptions.map(e => (
                  <option key={e.id} value={e.id}>{e.code ? `${e.code}: ${e.name}` : e.name}</option>
                ))}
              </select>
              {errors.ownerId && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>
          )}
        </div>

        {/* ── Core fields ─────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Core Definition</p>
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
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea rows={2} className="input"
                placeholder="What does this indicator measure and why is it important?"
                {...register('description')} />
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
        </div>

        {/* ── Classification ───────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Classification</p>

          <div>
            <label className="label">Indicator Type</label>
            <div className="grid grid-cols-2 gap-2">
              {INDICATOR_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setIndicatorType(t.value)}
                  className={`px-3 py-2.5 rounded-lg text-sm border-2 text-left transition-all ${
                    indicatorType === t.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                  }`}>
                  <span className="font-semibold block">{t.label}</span>
                  <span className={`text-[11px] ${indicatorType === t.value ? 'text-indigo-200' : 'text-gray-400'}`}>
                    {t.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Direction of Progress</label>
            <div className="flex gap-2">
              {DIRECTIONS.map(d => (
                <button key={d.value} type="button"
                  onClick={() => { setDirection(d.value); setValue('progressDirection', d.value); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                    direction === d.value
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}>
                  <span className={direction === d.value ? 'text-white' : d.color}>{d.icon}</span> {d.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {direction === 'increasing' ? 'Higher values indicate better performance' :
               direction === 'decreasing' ? 'Lower values indicate better performance' :
               'Value should remain constant within acceptable range'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Reporting Frequency</label>
              <select className="input" {...register('reportingFrequency')}>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Formula Type ─────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Calculation Formula *</p>

          {/* Grouped formula picker */}
          <div className="space-y-3">
            {GROUPED.map(group => (
              <div key={group.cat}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  {group.label}
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {group.formulas.map(key => {
                    const fm = FORMULA_META[key];
                    const catCls = CAT_COLORS[group.cat] || 'border-gray-200 bg-gray-50 text-gray-700';
                    const selected = formulaType === key;
                    return (
                      <button key={key} type="button"
                        onClick={() => handleFormulaChange(key)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          selected
                            ? `${catCls} border-current shadow-sm`
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${selected ? '' : 'text-gray-800'}`}>
                              {fm.label}
                            </p>
                            <p className="text-xs font-mono text-gray-500 mt-0.5">
                              {fm.description}
                            </p>
                          </div>
                          {selected && (
                            <span className="w-4 h-4 rounded-full bg-current flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <input type="hidden" {...register('formulaType')} value={formulaType} />

          {/* Formula hint */}
          {meta && (
            <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <InformationCircleIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">{meta.hint}</p>
            </div>
          )}

          {/* Formula-specific config fields */}
          {meta?.configFields?.length > 0 && (
            <div className="space-y-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-600">Formula Configuration</p>
              {meta.configFields.map(cf => (
                <div key={cf.key}>
                  <label className="label">{cf.label}</label>
                  {cf.type === 'select' ? (
                    <select className="input"
                      value={formulaConfig[cf.key] || cf.defaultValue || ''}
                      onChange={e => setFormulaConfig(prev => ({ ...prev, [cf.key]: e.target.value }))}>
                      {cf.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input type={cf.type || 'text'} step="any" className="input"
                      value={formulaConfig[cf.key] || ''}
                      onChange={e => setFormulaConfig(prev => ({ ...prev, [cf.key]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sub-indicator builder for multi_input / weighted_score */}
          {needsSubBuilder && (
            <div className="border-t border-gray-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600">
                  Sub-indicators
                  {isWeighted && totalWeight > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      Math.abs(totalWeight - 1) < 0.01 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      Total weight: {Math.round(totalWeight * 100)}%
                    </span>
                  )}
                </p>
                <button type="button" onClick={addSubIndicator}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                  <PlusIcon className="w-3.5 h-3.5" /> Add
                </button>
              </div>

              <div className="space-y-2">
                {subIndicators.map((sub, i) => (
                  <div key={i} className="grid gap-2 items-start bg-gray-50 rounded-lg p-3 border border-gray-200"
                    style={{ gridTemplateColumns: isWeighted ? '1fr 80px 80px auto' : '1fr auto' }}>
                    <div>
                      <input className="input text-sm" placeholder={`Sub-indicator ${i + 1} label`}
                        value={sub.label}
                        onChange={e => updateSub(i, 'label', e.target.value)} />
                    </div>
                    {isWeighted && (
                      <>
                        <div>
                          <input type="number" step="0.01" min="0" max="1" className="input text-sm text-center"
                            placeholder="Weight" title="Weight (0–1, e.g. 0.25 for 25%)"
                            value={sub.weight}
                            onChange={e => updateSub(i, 'weight', e.target.value)} />
                          <p className="text-[10px] text-gray-400 text-center mt-0.5">weight</p>
                        </div>
                        <div>
                          <input type="number" step="any" className="input text-sm text-center"
                            placeholder="Target"
                            value={sub.target}
                            onChange={e => updateSub(i, 'target', e.target.value)} />
                          <p className="text-[10px] text-gray-400 text-center mt-0.5">target</p>
                        </div>
                      </>
                    )}
                    <button type="button" onClick={() => removeSubIndicator(i)}
                      disabled={subIndicators.length === 1}
                      className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30 mt-1">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {isWeighted && Math.abs(totalWeight - 1) > 0.01 && totalWeight > 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <InformationCircleIcon className="w-3.5 h-3.5" />
                  Weights should sum to 1.0 (currently {Math.round(totalWeight * 100)}%).
                  The engine will normalise automatically.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── PIRS Documentation ───────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">PIRS Documentation</p>
            <span className="text-[10px] text-gray-400 bg-gray-100 rounded px-2 py-0.5">
              Performance Indicator Reference Sheet
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data Source</label>
              <input className="input" placeholder="e.g. BRELA Registration System"
                {...register('dataSource')} />
            </div>
            <div>
              <label className="label">Responsible Person</label>
              <input className="input" placeholder="e.g. Director of Trade"
                {...register('responsiblePerson')} />
            </div>
            <div className="col-span-2">
              <label className="label">Collection Method</label>
              <input className="input"
                placeholder="e.g. Administrative records, survey, census"
                {...register('collectionMethod')} />
            </div>
            <div className="col-span-2">
              <label className="label">Verification Source</label>
              <input className="input"
                placeholder="e.g. Official register, audit report, field visit"
                {...register('verificationSource')} />
            </div>
            <div>
              <label className="label">
                Baseline Value
                {formulaType === 'ppt_change' && (
                  <span className="text-red-400 ml-1">* required for ppt_change</span>
                )}
              </label>
              <input type="number" step="any" className="input"
                {...register('baselineValue')} />
              {formulaType === 'ppt_change' && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Enter the starting % (e.g. 38 for "38% at baseline")
                </p>
              )}
            </div>
            <div>
              <label className="label">Baseline Year</label>
              <input type="number" className="input" placeholder="e.g. 2024"
                {...register('baselineYear')} />
            </div>
            <div>
              <label className="label">Min Acceptable Value</label>
              <input type="number" step="any" className="input"
                placeholder="Outlier lower bound" {...register('minValue')} />
            </div>
            <div>
              <label className="label">Max Acceptable Value</label>
              <input type="number" step="any" className="input"
                placeholder="Outlier upper bound" {...register('maxValue')} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting
              ? (isEditMode ? 'Saving...' : 'Creating...')
              : (isEditMode ? 'Save Changes' : 'Create Indicator')}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
