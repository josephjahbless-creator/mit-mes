import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { projectsApi, institutionsApi } from '../../api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { getCurrentFiscalYear } from '../../utils/fiscalYear';

const STATUSES = ['planned', 'ongoing', 'completed', 'delayed', 'cancelled'];

const EMPTY = {
  name: '', code: '', goal: '', description: '',
  institutionId: '', departmentId: '', unitId: '',
  status: 'planned', startDate: '', endDate: '',
  totalBudget: '', fiscalYear: getCurrentFiscalYear(), fundingSource: '',
};

export default function ProjectFormPage() {
  const { id }   = useParams();   // present = edit mode
  const navigate = useNavigate();
  const user     = useAuthStore(s => s.user);
  const isEdit   = !!id;

  const [form, setForm] = useState(EMPTY);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (project) {
      setForm({
        name:          project.name          || '',
        code:          project.code          || '',
        goal:          project.goal          || '',
        description:   project.description   || '',
        institutionId: project.institutionId || '',
        departmentId:  project.departmentId  || '',
        unitId:        project.unitId        || '',
        status:        project.status        || 'planned',
        startDate:     project.startDate ? new Date(project.startDate).toISOString().slice(0, 10) : '',
        endDate:       project.endDate   ? new Date(project.endDate).toISOString().slice(0, 10)   : '',
        totalBudget:   project.totalBudget != null ? String(project.totalBudget) : '',
        fiscalYear:    project.fiscalYear    || getCurrentFiscalYear(),
        fundingSource: project.fundingSource || '',
      });
    }
  }, [project]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: data => isEdit ? projectsApi.update(id, data) : projectsApi.create(data),
    onSuccess: (res) => {
      toast.success(isEdit ? 'Project updated' : 'Project created');
      navigate(`/projects/${res.data.id}`);
    },
    onError: () => toast.error('Failed to save project'),
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    mutateAsync({
      ...form,
      totalBudget:  form.totalBudget  ? parseFloat(form.totalBudget)  : 0,
      institutionId: form.institutionId || null,
      departmentId:  form.departmentId  || null,
      unitId:        form.unitId        || null,
      startDate:     form.startDate || null,
      endDate:       form.endDate   || null,
    });
  }

  const Field = ({ label, req, children }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label} {req && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );

  const Input = (props) => (
    <input {...props} className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 transition-colors" />
  );

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={isEdit ? `/projects/${id}` : '/projects'}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <ArrowLeftIcon className="w-4 h-4 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Project' : 'New Project'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill in the project details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Basic Information</p>

          <Field label="Project Name" req>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. NDC Industrial Development Project" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Project Code">
              <Input value={form.code} onChange={e => set('code', e.target.value)} placeholder="e.g. NDC-IDP-2025" />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Project Goal">
            <Input value={form.goal} onChange={e => set('goal', e.target.value)} placeholder="Brief statement of what the project aims to achieve" />
          </Field>

          <Field label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Detailed project description…"
              className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm resize-none outline-none focus:border-blue-400" />
          </Field>
        </div>

        {/* Institutional Scope */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Institutional Scope</p>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Institution">
              <select value={form.institutionId} onChange={e => set('institutionId', e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400">
                <option value="">Select institution</option>
                {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Financial */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Financial</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Total Budget (TZS)" req>
              <Input type="number" min="0" step="1" value={form.totalBudget}
                onChange={e => set('totalBudget', e.target.value)} placeholder="0" />
            </Field>
            <Field label="Funding Source">
              <Input value={form.fundingSource} onChange={e => set('fundingSource', e.target.value)} placeholder="e.g. Government, Donor, Loan" />
            </Field>
            <Field label="Fiscal Year">
              <Input value={form.fiscalYear} onChange={e => set('fiscalYear', e.target.value)} placeholder="2025-2026" />
            </Field>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Timeline</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start Date">
              <Input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
            </Field>
            <Field label="End Date">
              <Input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} min={form.startDate} />
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button type="submit" disabled={isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-colors disabled:opacity-50">
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Project'}
          </button>
          <Link to={isEdit ? `/projects/${id}` : '/projects'}
            className="px-8 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-sm transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
