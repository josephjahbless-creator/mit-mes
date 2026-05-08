import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  ClipboardDocumentListIcon, CheckCircleIcon, ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { customFormsApi } from '../../api';
import toast from 'react-hot-toast';

export default function CustomFormSubmitPage() {
  const { id } = useParams();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { data: form, isLoading, isError } = useQuery({
    queryKey: ['custom-form', id],
    queryFn: () => customFormsApi.get(id).then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => customFormsApi.submit(id, data),
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to submit'),
  });

  function handleChange(fieldId, value) {
    setAnswers(a => ({ ...a, [fieldId]: value }));
  }

  function handleCheckbox(fieldId, option, checked) {
    setAnswers(a => {
      const current = a[fieldId] || [];
      return { ...a, [fieldId]: checked ? [...current, option] : current.filter(o => o !== option) };
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form) return;
    // Validate required fields
    for (const field of (form.fields || [])) {
      if (field.required) {
        const val = answers[field.id];
        if (!val || (Array.isArray(val) && val.length === 0)) {
          toast.error(`"${field.label}" is required`);
          return;
        }
      }
    }
    mutation.mutate({ answers });
  }

  if (isLoading) return (
    <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded-xl w-64" />
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}
    </div>
  );

  if (isError || !form) return (
    <div className="max-w-2xl mx-auto card text-center py-12">
      <p className="text-red-500">Form not found or unavailable.</p>
      <Link to="/forms" className="btn-secondary mt-4 inline-flex items-center gap-2"><ArrowLeftIcon className="w-4 h-4" /> Back to Forms</Link>
    </div>
  );

  if (submitted) return (
    <div className="max-w-2xl mx-auto card text-center py-16">
      <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-gray-900 mb-2">Response Submitted!</h2>
      <p className="text-gray-500 mb-6">Thank you for completing the form.</p>
      <Link to="/forms" className="btn-secondary inline-flex items-center gap-2"><ArrowLeftIcon className="w-4 h-4" /> Back to Forms</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/forms" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeftIcon className="w-4 h-4" /> All Forms
      </Link>

      <div className="card">
        <div className="flex items-start gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{form.title}</h1>
            {form.description && <p className="text-sm text-gray-500 mt-1">{form.description}</p>}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {(form.fields || []).map(field => (
            <div key={field.id}>
              <label className="label">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.helpText && <p className="text-xs text-gray-400 mb-1.5">{field.helpText}</p>}

              {field.type === 'text' && (
                <input className="input" placeholder={field.placeholder}
                  value={answers[field.id] || ''}
                  onChange={e => handleChange(field.id, e.target.value)} />
              )}
              {field.type === 'textarea' && (
                <textarea className="input" rows={4} placeholder={field.placeholder}
                  value={answers[field.id] || ''}
                  onChange={e => handleChange(field.id, e.target.value)} />
              )}
              {field.type === 'number' && (
                <input type="number" className="input" placeholder={field.placeholder}
                  value={answers[field.id] || ''}
                  onChange={e => handleChange(field.id, e.target.value)} />
              )}
              {field.type === 'date' && (
                <input type="date" className="input"
                  value={answers[field.id] || ''}
                  onChange={e => handleChange(field.id, e.target.value)} />
              )}
              {field.type === 'select' && (
                <select className="input"
                  value={answers[field.id] || ''}
                  onChange={e => handleChange(field.id, e.target.value)}>
                  <option value="">Select an option...</option>
                  {(field.options || []).map((o, i) => <option key={i} value={o}>{o}</option>)}
                </select>
              )}
              {field.type === 'radio' && (
                <div className="space-y-2">
                  {(field.options || []).map((o, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700">
                      <input type="radio" name={field.id} value={o}
                        checked={answers[field.id] === o}
                        onChange={() => handleChange(field.id, o)}
                        className="accent-blue-600" />
                      {o}
                    </label>
                  ))}
                </div>
              )}
              {field.type === 'checkbox' && (
                <div className="space-y-2">
                  {(field.options || []).map((o, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer text-sm text-gray-700">
                      <input type="checkbox" value={o}
                        checked={(answers[field.id] || []).includes(o)}
                        onChange={e => handleCheckbox(field.id, o, e.target.checked)}
                        className="accent-blue-600 rounded" />
                      {o}
                    </label>
                  ))}
                </div>
              )}
              {field.type === 'file' && (
                <input type="file" className="input" onChange={e => handleChange(field.id, e.target.files?.[0]?.name)} />
              )}
            </div>
          ))}

          <div className="pt-2 flex gap-3">
            <Link to="/forms" className="btn-secondary">Cancel</Link>
            <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
              {mutation.isPending ? 'Submitting...' : <><CheckCircleIcon className="w-4 h-4" /> Submit Response</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
