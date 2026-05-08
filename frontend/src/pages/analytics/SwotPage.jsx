import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { swotApi, institutionsApi } from '../../api';
import { getCurrentFiscalYear, getFiscalYearOptions } from '../../utils/fiscalYear';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const FY_OPTIONS = getFiscalYearOptions();

const CATEGORIES = [
  { key: 'strength',    label: 'Strengths',    bg: 'bg-green-50',  border: 'border-green-200', header: 'bg-green-600', text: 'text-green-700' },
  { key: 'weakness',    label: 'Weaknesses',   bg: 'bg-red-50',    border: 'border-red-200',   header: 'bg-red-600',   text: 'text-red-700' },
  { key: 'opportunity', label: 'Opportunities', bg: 'bg-blue-50',   border: 'border-blue-200',  header: 'bg-blue-600',  text: 'text-blue-700' },
  { key: 'threat',      label: 'Threats',      bg: 'bg-amber-50',  border: 'border-amber-200', header: 'bg-amber-600', text: 'text-amber-700' },
];

const EMPTY_FORM = { category: 'strength', area: '', description: '', impact: '', institutionId: '' };

function EntryCard({ entry, onEdit, onDelete, canEdit }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm truncate">{entry.area}</p>
          <p className="text-xs text-gray-600 mt-1 line-clamp-3">{entry.description}</p>
          {entry.impact && (
            <p className="text-xs text-gray-400 mt-1 italic">Impact: {entry.impact}</p>
          )}
          {entry.institution && (
            <span className="mt-2 inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {entry.institution.name}
            </span>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={() => onEdit(entry)} className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors">
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(entry.id)} className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors">
              <TrashIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EntryModal({ initial, institutions, fiscalYear, onClose, onSave }) {
  const [form, setForm] = useState(initial ?? { ...EMPTY_FORM, fiscalYear });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.area.trim() || !form.description.trim()) {
      toast.error('Area and description are required');
      return;
    }
    onSave({ ...form, fiscalYear: form.fiscalYear || fiscalYear });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{initial ? 'Edit SWOT Entry' : 'New SWOT Entry'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="input w-full">
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Year</label>
              <select value={form.fiscalYear} onChange={e => set('fiscalYear', e.target.value)} className="input w-full">
                {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Area / Title</label>
            <input type="text" value={form.area} onChange={e => set('area', e.target.value)}
              placeholder="e.g. Strong policy framework" className="input w-full" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Describe this SWOT factor..." className="input w-full resize-none" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Impact (optional)</label>
            <input type="text" value={form.impact} onChange={e => set('impact', e.target.value)}
              placeholder="Expected impact or implication" className="input w-full" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Institution (optional)</label>
            <select value={form.institutionId} onChange={e => set('institutionId', e.target.value)} className="input w-full">
              <option value="">Ministry-wide</option>
              {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <CheckIcon className="w-4 h-4" /> {initial ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SwotPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [institutionId, setInstitutionId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const canEdit = ['super_admin', 'admin', 'me_officer'].includes(user?.role);

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['swot', fiscalYear, institutionId],
    queryFn: () => swotApi.list({ fiscalYear, ...(institutionId ? { institutionId } : {}) }).then(r => r.data),
    keepPreviousData: true,
  });

  const createMutation = useMutation({
    mutationFn: (data) => swotApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['swot'] }); setShowModal(false); toast.success('Entry created'); },
    onError: () => toast.error('Failed to create entry'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => swotApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['swot'] }); setEditing(null); toast.success('Entry updated'); },
    onError: () => toast.error('Failed to update entry'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => swotApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['swot'] }); toast.success('Entry deleted'); },
    onError: () => toast.error('Failed to delete entry'),
  });

  function handleSave(form) {
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this SWOT entry?')) return;
    deleteMutation.mutate(id);
  }

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = entries.filter(e => e.category === cat.key);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SWOT Analysis</h1>
          <p className="text-gray-500 text-sm mt-1">Strengths, Weaknesses, Opportunities & Threats</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="input py-1.5 text-sm w-36">
            {FY_OPTIONS.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
          <select value={institutionId} onChange={e => setInstitutionId(e.target.value)} className="input py-1.5 text-sm w-48">
            <option value="">All Institutions</option>
            {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
          </select>
          {canEdit && (
            <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Add Entry
            </button>
          )}
        </div>
      </div>

      {/* SWOT Quadrant */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card animate-pulse h-64" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map(cat => (
            <div key={cat.key} className={`rounded-2xl border-2 ${cat.border} ${cat.bg} overflow-hidden`}>
              <div className={`${cat.header} text-white px-5 py-3 flex items-center justify-between`}>
                <h2 className="font-bold tracking-wide">{cat.label}</h2>
                <span className="text-white/70 text-sm">{byCategory[cat.key]?.length ?? 0} entries</span>
              </div>
              <div className="p-4 space-y-3 min-h-48">
                {(byCategory[cat.key] ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 italic text-center pt-8">
                    No {cat.label.toLowerCase()} recorded
                  </p>
                ) : (
                  byCategory[cat.key].map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={(e) => setEditing(e)}
                      onDelete={handleDelete}
                      canEdit={canEdit}
                    />
                  ))
                )}
                {canEdit && (
                  <button
                    onClick={() => { setShowModal(true); }}
                    className={`w-full text-center text-xs ${cat.text} py-2 rounded-lg border border-dashed ${cat.border} hover:bg-white transition-colors`}
                  >
                    + Add {cat.label.slice(0, -1)}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <EntryModal
          initial={null}
          institutions={institutions}
          fiscalYear={fiscalYear}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
      {editing && (
        <EntryModal
          initial={{ ...editing, institutionId: editing.institutionId ?? '' }}
          institutions={institutions}
          fiscalYear={fiscalYear}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
