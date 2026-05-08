import { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon,
  Bars3Icon, XMarkIcon, CheckCircleIcon, EyeIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { customFormsApi } from '../../api';
import toast from 'react-hot-toast';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', icon: '📝' },
  { value: 'textarea', label: 'Long Text', icon: '📄' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'select', label: 'Dropdown', icon: '▼' },
  { value: 'radio', label: 'Single Choice', icon: '🔘' },
  { value: 'checkbox', label: 'Multiple Choice', icon: '☑️' },
  { value: 'file', label: 'File Upload', icon: '📎' },
];

function genId() { return Math.random().toString(36).slice(2, 9); }

function FieldEditor({ field, index, total, onChange, onDelete, onMoveUp, onMoveDown }) {
  const [expanded, setExpanded] = useState(false);
  const hasOptions = ['select', 'radio', 'checkbox'].includes(field.type);

  function updateOption(i, val) {
    const opts = [...(field.options || [])];
    opts[i] = val;
    onChange({ ...field, options: opts });
  }
  function addOption() { onChange({ ...field, options: [...(field.options || []), ''] }); }
  function removeOption(i) { onChange({ ...field, options: (field.options || []).filter((_, idx) => idx !== i) }); }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Bars3Icon className="w-4 h-4 text-gray-300 cursor-grab flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800 truncate">
              {field.label || <span className="text-gray-400 italic">Untitled field</span>}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
              {FIELD_TYPES.find(t => t.value === field.type)?.icon} {FIELD_TYPES.find(t => t.value === field.type)?.label}
            </span>
            {field.required && <span className="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-600 flex-shrink-0">Required</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onMoveUp(index)} disabled={index === 0} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
            <ArrowUpIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onMoveDown(index)} disabled={index === total - 1} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
            <ArrowDownIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-1 text-gray-400 hover:text-gray-700">
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={() => onDelete(field.id)} className="p-1 text-gray-300 hover:text-red-500">
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Field Label *</label>
              <input
                className="input text-sm"
                value={field.label}
                placeholder="Question text"
                onChange={e => onChange({ ...field, label: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Field Type</label>
              <select
                className="input text-sm"
                value={field.type}
                onChange={e => onChange({ ...field, type: e.target.value, options: [] })}
              >
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Help Text (optional)</label>
              <input
                className="input text-sm"
                value={field.helpText || ''}
                placeholder="Guidance for respondent"
                onChange={e => onChange({ ...field, helpText: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-xs">Placeholder</label>
              <input
                className="input text-sm"
                value={field.placeholder || ''}
                placeholder="Input hint text"
                onChange={e => onChange({ ...field, placeholder: e.target.value })}
              />
            </div>
          </div>

          {hasOptions && (
            <div>
              <label className="label text-xs">Options</label>
              <div className="space-y-2">
                {(field.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="input text-sm flex-1"
                      value={opt}
                      placeholder={`Option ${i + 1}`}
                      onChange={e => updateOption(i, e.target.value)}
                    />
                    <button onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500">
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button onClick={addOption} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
                  <PlusIcon className="w-3 h-3" /> Add option
                </button>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={field.required || false}
              onChange={e => onChange({ ...field, required: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-700">Required field</span>
          </label>
        </div>
      )}
    </div>
  );
}

function FormPreview({ title, description, fields }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900">{title || 'Untitled Form'}</h2>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {fields.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No fields added yet</p>
      ) : (
        <div className="space-y-4">
          {fields.map(field => (
            <div key={field.id}>
              <label className="label text-sm">
                {field.label || 'Untitled field'}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.helpText && <p className="text-xs text-gray-400 mb-1.5">{field.helpText}</p>}
              {field.type === 'text' && <input className="input" placeholder={field.placeholder} disabled />}
              {field.type === 'textarea' && <textarea className="input" rows={3} placeholder={field.placeholder} disabled />}
              {field.type === 'number' && <input type="number" className="input" placeholder={field.placeholder} disabled />}
              {field.type === 'date' && <input type="date" className="input" disabled />}
              {field.type === 'select' && (
                <select className="input" disabled>
                  <option>Select an option...</option>
                  {(field.options || []).map((o, i) => <option key={i}>{o}</option>)}
                </select>
              )}
              {field.type === 'radio' && (
                <div className="space-y-1.5">
                  {(field.options || []).map((o, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={field.id} disabled /> {o || `Option ${i+1}`}
                    </label>
                  ))}
                </div>
              )}
              {field.type === 'checkbox' && (
                <div className="space-y-1.5">
                  {(field.options || []).map((o, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" disabled /> {o || `Option ${i+1}`}
                    </label>
                  ))}
                </div>
              )}
              {field.type === 'file' && <input type="file" className="input" disabled />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomFormDesignerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [showPreview, setShowPreview] = useState(false);

  const [meta, setMeta] = useState({ title: '', description: '', status: 'draft' });
  const [fields, setFields] = useState([]);
  const setMet = (k, v) => setMeta(m => ({ ...m, [k]: v }));

  // Load existing form
  useQuery({
    queryKey: ['custom-form', id],
    queryFn: () => customFormsApi.get(id).then(r => r.data),
    enabled: !isNew,
    onSuccess: (data) => {
      setMeta({ title: data.title, description: data.description || '', status: data.status });
      setFields(data.fields || []);
    },
  });

  const mutation = useMutation({
    mutationFn: (data) => isNew ? customFormsApi.create(data) : customFormsApi.update(id, data),
    onSuccess: () => {
      toast.success(isNew ? 'Form created!' : 'Form saved!');
      navigate('/forms');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save form'),
  });

  function addField(type = 'text') {
    setFields(f => [...f, { id: genId(), type, label: '', required: false, options: [] }]);
  }

  function updateField(updated) {
    setFields(f => f.map(field => field.id === updated.id ? updated : field));
  }

  function deleteField(fieldId) {
    setFields(f => f.filter(field => field.id !== fieldId));
  }

  function moveUp(index) {
    setFields(f => { const n = [...f]; [n[index-1], n[index]] = [n[index], n[index-1]]; return n; });
  }

  function moveDown(index) {
    setFields(f => { const n = [...f]; [n[index], n[index+1]] = [n[index+1], n[index]]; return n; });
  }

  function handleSave() {
    if (!meta.title.trim()) { toast.error('Form title is required'); return; }
    mutation.mutate({ ...meta, fields });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/forms" className="text-gray-400 hover:text-gray-700">
            <XMarkIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isNew ? 'New Form' : 'Edit Form'}</h1>
            <p className="text-xs text-gray-500">{fields.length} field{fields.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(p => !p)}
            className={`btn-secondary flex items-center gap-2 ${showPreview ? 'bg-blue-50 border-blue-300 text-blue-700' : ''}`}
          >
            <EyeIcon className="w-4 h-4" /> {showPreview ? 'Hide Preview' : 'Preview'}
          </button>
          <button onClick={handleSave} disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4" /> {mutation.isPending ? 'Saving...' : 'Save Form'}
          </button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
        {/* Designer */}
        <div className="space-y-5">
          {/* Form meta */}
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Form Details</h3>
            <div>
              <label className="label">Form Title *</label>
              <input className="input" placeholder="e.g. Quarterly Data Collection" value={meta.title} onChange={e => setMet('title', e.target.value)} />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea className="input" rows={2} placeholder="Brief description of this form's purpose" value={meta.description} onChange={e => setMet('description', e.target.value)} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input w-40" value={meta.status} onChange={e => setMet('status', e.target.value)}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Form Fields</h3>
            {fields.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-xl py-12 text-center">
                <p className="text-gray-400 text-sm">No fields yet. Add your first field below.</p>
              </div>
            ) : (
              fields.map((field, i) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  index={i}
                  total={fields.length}
                  onChange={updateField}
                  onDelete={deleteField}
                  onMoveUp={moveUp}
                  onMoveDown={moveDown}
                />
              ))
            )}

            {/* Add field panel */}
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">Add Field</p>
              <div className="grid grid-cols-4 gap-2">
                {FIELD_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => addField(t.value)}
                    className="flex flex-col items-center gap-1.5 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-xs text-gray-600 font-medium">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Live Preview</h3>
            <FormPreview title={meta.title} description={meta.description} fields={fields} />
          </div>
        )}
      </div>
    </div>
  );
}
