import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ClipboardDocumentListIcon, PlusIcon, PencilIcon, TrashIcon,
  EyeIcon, DocumentDuplicateIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { customFormsApi } from '../../api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function CustomFormListPage() {
  const user = useAuthStore(s => s.user);
  const canEdit = ['super_admin', 'admin', 'me_officer'].includes(user?.role);
  const qc = useQueryClient();

  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['custom-forms'],
    queryFn: () => customFormsApi.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => customFormsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries(['custom-forms']); toast.success('Form deleted'); },
    onError: () => toast.error('Failed to delete form'),
  });

  const statusColors = {
    draft: 'bg-gray-100 text-gray-600',
    published: 'bg-green-100 text-green-700',
    closed: 'bg-red-100 text-red-600',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardDocumentListIcon className="w-7 h-7 text-blue-600" />
            Custom Forms
          </h1>
          <p className="text-gray-500 text-sm mt-1">Design and deploy custom data collection forms</p>
        </div>
        {canEdit && (
          <Link to="/forms/designer/new" className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" /> Create Form
          </Link>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-40" />
          ))}
        </div>
      ) : forms.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardDocumentListIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No custom forms yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first form to collect structured data</p>
          {canEdit && (
            <Link to="/forms/designer/new" className="btn-primary mt-4 inline-flex items-center gap-2">
              <PlusIcon className="w-4 h-4" /> Create Form
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => (
            <div key={form.id} className="card hover:shadow-md transition-shadow flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[form.status] || statusColors.draft}`}>
                  {form.status || 'draft'}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 leading-snug">{form.title}</h3>
              {form.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{form.description}</p>
              )}
              <div className="mt-auto pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span className="flex items-center gap-1">
                    <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                    {form.fields?.length || 0} fields
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3.5 h-3.5" />
                    {form.createdAt ? new Date(form.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/forms/${form.id}/submit`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                  >
                    <EyeIcon className="w-3.5 h-3.5" /> Fill Out
                  </Link>
                  {canEdit && (
                    <>
                      <Link
                        to={`/forms/designer/${form.id}`}
                        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 border border-gray-200"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => { if (window.confirm('Delete this form and all responses?')) deleteMutation.mutate(form.id); }}
                        className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 border border-gray-200"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
