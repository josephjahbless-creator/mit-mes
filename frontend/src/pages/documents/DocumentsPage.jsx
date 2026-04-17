import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentTextIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { documentsApi, institutionsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import { getCurrentFiscalYear, getFiscalYearOptions } from '../../utils/fiscalYear';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['general', 'report', 'policy', 'procedure', 'evidence', 'other'];
const PERIODS     = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

const CATEGORY_LABELS = {
  general: 'General', report: 'Report', policy: 'Policy',
  procedure: 'Procedure', evidence: 'Evidence', other: 'Other',
};
const CATEGORY_COLORS = {
  general:   'badge-gray',
  report:    'badge-blue',
  policy:    'badge-red',
  procedure: 'badge-yellow',
  evidence:  'badge-green',
  other:     'badge-gray',
};

// ─── File helpers ─────────────────────────────────────────────────────────────
function fileType(mimeType) {
  if (!mimeType) return 'document';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) return 'excel';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
  if (mimeType.startsWith('image/')) return 'image';
  return 'document';
}

function FileIcon({ mimeType, className = 'w-8 h-8' }) {
  const type = fileType(mimeType);
  const configs = {
    pdf:      { bg: 'bg-red-100',    text: 'text-red-600',    label: 'PDF' },
    excel:    { bg: 'bg-green-100',  text: 'text-green-700',  label: 'XLS' },
    word:     { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'DOC' },
    image:    { bg: 'bg-purple-100', text: 'text-purple-700', label: 'IMG' },
    document: { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'FILE' },
  };
  const { bg, text, label } = configs[type] ?? configs.document;
  return (
    <div className={`${bg} ${text} rounded-xl flex items-center justify-center p-2.5 shrink-0`}>
      <DocumentIcon className={className} />
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseTags(raw) {
  if (!raw) return [];
  return raw.split(',').map(t => t.trim()).filter(Boolean);
}

// ─── Document Card ────────────────────────────────────────────────────────────
function DocCard({ doc, canEdit, onEdit, onDelete }) {
  return (
    <div className="card p-4 flex flex-col gap-3 hover:shadow-lg transition-shadow">
      {/* Top row: icon + name + category */}
      <div className="flex items-start gap-3">
        <FileIcon mimeType={doc.mimeType} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{doc.name}</p>
          <span className={`badge mt-1 ${CATEGORY_COLORS[doc.category] ?? 'badge-gray'}`}>
            {CATEGORY_LABELS[doc.category] ?? doc.category}
          </span>
        </div>
      </div>

      {/* Description */}
      {doc.description && (
        <p className="text-xs text-gray-500 line-clamp-1">{doc.description}</p>
      )}

      {/* Meta: uploader + date + size */}
      <div className="text-xs text-gray-400 space-y-0.5">
        <p>
          Uploaded by{' '}
          <span className="text-gray-600 font-medium">{doc.uploadedBy?.name ?? '—'}</span>
        </p>
        <div className="flex items-center justify-between">
          <span>{fmtDate(doc.createdAt)}</span>
          <span className="font-medium">{formatSize(doc.fileSize)}</span>
        </div>
        {(doc.fiscalYear || doc.period) && (
          <p>
            {[doc.fiscalYear && `FY ${doc.fiscalYear}`, doc.period].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Tags */}
      {doc.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.tags.slice(0, 4).map(tag => (
            <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
              <TagIcon className="w-2.5 h-2.5" />{tag}
            </span>
          ))}
          {doc.tags.length > 4 && (
            <span className="text-[10px] text-gray-400 px-1">+{doc.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        {doc.fileUrl && (
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1.5 py-1.5"
          >
            <ArrowDownTrayIcon className="w-3.5 h-3.5" />
            Download
          </a>
        )}
        {canEdit && (
          <>
            <button
              onClick={() => onEdit(doc)}
              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
              title="Edit"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(doc)}
              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUpload, isLoading, institutions, isSuperAdmin }) {
  const fileRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: '', description: '', category: 'general',
      fiscalYear: getCurrentFiscalYear(), period: '',
      tags: '', institutionId: '', departmentId: '', unitId: '',
    },
  });

  function onSubmit(data) {
    const file = fileRef.current?.files?.[0];
    if (!file) { toast.error('Please select a file'); return; }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('name', data.name || file.name);
    fd.append('description', data.description);
    fd.append('category', data.category);
    fd.append('fiscalYear', data.fiscalYear);
    if (data.period)        fd.append('period', data.period);
    if (data.tags)          fd.append('tags', JSON.stringify(parseTags(data.tags)));
    if (data.institutionId) fd.append('institutionId', data.institutionId);
    onUpload(fd);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ArrowUpTrayIcon className="w-5 h-5 text-mit-blue" />
            Upload Document
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">

          {/* File picker */}
          <div>
            <label className="label">File *</label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-mit-blue hover:bg-blue-50/30 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {fileName ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                  <DocumentTextIcon className="w-5 h-5 text-mit-blue" />
                  <span className="font-medium">{fileName}</span>
                </div>
              ) : (
                <div className="text-sm text-gray-400">
                  <ArrowUpTrayIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p>Click to select a file</p>
                  <p className="text-xs mt-0.5">PDF, Word, Excel, images accepted</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.ppt,.pptx"
              onChange={e => setFileName(e.target.files?.[0]?.name ?? '')}
            />
          </div>

          {/* Name */}
          <div>
            <label className="label">Document Name</label>
            <input
              type="text"
              className="input"
              placeholder="Leave blank to use filename"
              {...register('name')}
            />
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} placeholder="Brief description…" {...register('description')} />
          </div>

          {/* Category + FY */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category *</label>
              <select className="input" {...register('category', { required: true })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fiscal Year</label>
              <input type="text" className="input" placeholder="e.g. 2025-2026" {...register('fiscalYear')} />
            </div>
          </div>

          {/* Period + Tags */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Period</label>
              <select className="input" {...register('period')}>
                <option value="">All periods</option>
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tags</label>
              <input
                type="text"
                className="input"
                placeholder="tag1, tag2, tag3"
                {...register('tags')}
              />
              <p className="text-xs text-gray-400 mt-0.5">Comma-separated</p>
            </div>
          </div>

          {/* Institution (super_admin only) */}
          {isSuperAdmin && institutions?.length > 0 && (
            <div>
              <label className="label">Institution (optional)</label>
              <select className="input" {...register('institutionId')}>
                <option value="">All institutions</option>
                {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={isLoading}>
              <ArrowUpTrayIcon className="w-4 h-4" />
              {isLoading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ doc, onClose, onSave, isLoading }) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      name:        doc.name        ?? '',
      description: doc.description ?? '',
      category:    doc.category    ?? 'general',
      tags:        (doc.tags ?? []).join(', '),
    },
  });

  function onSubmit(data) {
    onSave({
      name:        data.name,
      description: data.description,
      category:    data.category,
      tags:        parseTags(data.tags),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Edit Document</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Document Name *</label>
            <input type="text" className="input" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} {...register('description')} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" {...register('category')}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tags</label>
            <input type="text" className="input" placeholder="tag1, tag2" {...register('tags')} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ doc, onClose, onConfirm, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500 shrink-0" />
          <div>
            <h3 className="font-bold text-gray-900">Delete Document</h3>
            <p className="text-sm text-gray-500 mt-1">
              Permanently delete <span className="font-medium">"{doc.name}"</span>? This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className="btn-danger" disabled={isLoading}>
            {isLoading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const isSuperAdmin = user?.role === 'super_admin';
  const canEdit = ['super_admin', 'admin', 'me_officer'].includes(user?.role);

  // Filters
  const [search,     setSearch]     = useState('');
  const [category,   setCategory]   = useState('');
  const [fiscalYear, setFiscalYear] = useState('');
  const [instFilter, setInstFilter] = useState('');

  // Modal state
  const [showUpload, setShowUpload]   = useState(false);
  const [editDoc,    setEditDoc]      = useState(null);
  const [deleteDoc,  setDeleteDoc]    = useState(null);

  const fyOptions = getFiscalYearOptions(2, 1);

  // ── Queries ──
  const params = {
    ...(search     && { search }),
    ...(category   && { category }),
    ...(fiscalYear && { fiscalYear }),
    ...(instFilter && { institutionId: instFilter }),
  };

  const { data: docResult, isLoading, isError } = useQuery({
    queryKey: ['documents', params],
    queryFn: () => documentsApi.list(params).then(r => r.data),
  });
  // API returns { documents: [...], total, page, limit }
  const documents = docResult?.documents ?? docResult ?? [];

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
    enabled: isSuperAdmin,
  });

  // ── Mutations ──
  const uploadMut = useMutation({
    mutationFn: (fd) => documentsApi.upload(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded successfully');
      setShowUpload(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Upload failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => documentsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document updated');
      setEditDoc(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => documentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
      setDeleteDoc(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Delete failed'),
  });

  const hasFilters = !!(search || category || fiscalYear || instFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? 'Loading…' : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
            {hasFilters && ' (filtered)'}
          </p>
        </div>
        {canEdit && (
          <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2">
            <ArrowUpTrayIcon className="w-4 h-4" />
            Upload Document
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <FunnelIcon className="w-4 h-4 text-gray-400 shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              className="input pl-8 text-sm"
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category */}
          <select
            className="input w-40 text-sm"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>

          {/* Fiscal year */}
          <select
            className="input w-44 text-sm"
            value={fiscalYear}
            onChange={e => setFiscalYear(e.target.value)}
          >
            <option value="">All fiscal years</option>
            {fyOptions.map(fy => <option key={fy} value={fy}>FY {fy}</option>)}
          </select>

          {/* Institution (super_admin only) */}
          {isSuperAdmin && (
            <select
              className="input w-48 text-sm"
              value={instFilter}
              onChange={e => setInstFilter(e.target.value)}
            >
              <option value="">All institutions</option>
              {institutions.map(i => <option key={i.id} value={i.id}>{i.code} – {i.name}</option>)}
            </select>
          )}

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setCategory(''); setFiscalYear(''); setInstFilter(''); }}
              className="btn-secondary text-xs flex items-center gap-1"
            >
              <XMarkIcon className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="card p-10 text-center text-red-500 space-y-2">
          <ExclamationTriangleIcon className="w-10 h-10 mx-auto opacity-50" />
          <p className="font-medium">Failed to load documents</p>
          <p className="text-sm text-gray-400">Check your connection and try again</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="card p-12 text-center text-gray-400 space-y-3">
          <DocumentIcon className="w-12 h-12 mx-auto opacity-30" />
          <p className="font-medium text-gray-500">
            {hasFilters ? 'No documents match your filters' : 'No documents yet'}
          </p>
          {hasFilters ? (
            <button
              onClick={() => { setSearch(''); setCategory(''); setFiscalYear(''); setInstFilter(''); }}
              className="btn-secondary text-sm"
            >
              Clear filters
            </button>
          ) : canEdit && (
            <button onClick={() => setShowUpload(true)} className="btn-primary text-sm">
              Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              canEdit={canEdit}
              onEdit={setEditDoc}
              onDelete={setDeleteDoc}
            />
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={(fd) => uploadMut.mutate(fd)}
          isLoading={uploadMut.isPending}
          institutions={institutions}
          isSuperAdmin={isSuperAdmin}
        />
      )}

      {/* Edit modal */}
      {editDoc && (
        <EditModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSave={(data) => updateMut.mutate({ id: editDoc.id, data })}
          isLoading={updateMut.isPending}
        />
      )}

      {/* Delete confirm */}
      {deleteDoc && (
        <DeleteConfirm
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={() => deleteMut.mutate(deleteDoc.id)}
          isLoading={deleteMut.isPending}
        />
      )}
    </div>
  );
}
