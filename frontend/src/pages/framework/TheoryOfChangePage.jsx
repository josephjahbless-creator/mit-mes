import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { LightBulbIcon, PlusIcon, PencilIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const LIKELIHOOD_COLORS = { Low: 'bg-green-100 text-green-700', Medium: 'bg-amber-100 text-amber-700', High: 'bg-red-100 text-red-700' };
const ASSUMPTION_CATEGORIES = ['Political', 'Economic', 'Social', 'Technical', 'Environmental', 'Legal', 'Other'];

function RiskBadge({ label, value }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="text-gray-400">{label}:</span>
      <span className={`px-1.5 py-0.5 rounded font-semibold ${LIKELIHOOD_COLORS[value] || 'bg-gray-100 text-gray-500'}`}>{value || '—'}</span>
    </div>
  );
}

function ToCPanel({ level, referenceId, refName }) {
  const qc = useQueryClient();
  const [editNarrative, setEditNarrative] = useState(false);
  const [narrativeText, setNarrativeText] = useState('');
  const [showAssumpForm, setShowAssumpForm] = useState(false);
  const [showRiskForm,   setShowRiskForm]   = useState(false);
  const [newAssump, setNewAssump] = useState({ text: '', category: '' });
  const [newRisk,   setNewRisk]   = useState({ title: '', description: '', likelihood: 'Medium', impact: 'Medium', mitigation: '' });

  const { data: toc, isLoading } = useQuery({
    queryKey: ['toc', level, referenceId],
    queryFn: () => api.get(`/toc/${level}/${referenceId}`).then(r => r.data),
    onSuccess: d => { if (!editNarrative) setNarrativeText(d?.narrative || ''); },
  });

  const invalidate = () => qc.invalidateQueries(['toc', level, referenceId]);

  const saveToc = useMutation({
    mutationFn: (d) => api.post('/toc', { level, referenceId, ...d }),
    onSuccess: () => { invalidate(); setEditNarrative(false); toast.success('Saved'); },
  });
  const addAssump = useMutation({
    mutationFn: (d) => api.post(`/toc/${toc.id}/assumptions`, d),
    onSuccess: () => { invalidate(); setShowAssumpForm(false); setNewAssump({ text: '', category: '' }); toast.success('Assumption added'); },
  });
  const delAssump = useMutation({
    mutationFn: (id) => api.delete(`/toc/assumptions/${id}`),
    onSuccess: () => { invalidate(); toast.success('Removed'); },
  });
  const addRisk = useMutation({
    mutationFn: (d) => api.post(`/toc/${toc.id}/risks`, d),
    onSuccess: () => { invalidate(); setShowRiskForm(false); setNewRisk({ title: '', description: '', likelihood: 'Medium', impact: 'Medium', mitigation: '' }); toast.success('Risk added'); },
  });
  const delRisk = useMutation({
    mutationFn: (id) => api.delete(`/toc/risks/${id}`),
    onSuccess: () => { invalidate(); toast.success('Removed'); },
  });

  const hasContent = toc?.narrative || toc?.assumptions?.length > 0 || toc?.risks?.length > 0;

  if (isLoading) return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="animate-pulse h-4 bg-gray-100 rounded w-1/3" />
    </div>
  );

  return (
    <div className={`rounded-xl border overflow-hidden ${hasContent ? 'border-blue-200' : 'border-gray-200 border-dashed'} bg-white`}>
      {/* Title bar */}
      <div className={`px-5 py-3 flex items-center gap-2 ${hasContent ? 'bg-blue-50 border-b border-blue-100' : 'border-b border-gray-100'}`}>
        <LightBulbIcon className={`w-4 h-4 shrink-0 ${hasContent ? 'text-blue-500' : 'text-gray-300'}`} />
        <span className="font-semibold text-gray-700 text-sm flex-1">{refName}</span>
        <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">{level}</span>
        {hasContent && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
      </div>

      <div className="p-5 space-y-5">
        {/* Causal narrative */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">Causal Narrative</label>
            {!editNarrative && (
              <button onClick={() => { setNarrativeText(toc?.narrative || ''); setEditNarrative(true); }}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <PencilIcon className="w-3 h-3" /> {toc?.narrative ? 'Edit' : 'Add'}
              </button>
            )}
          </div>
          {editNarrative ? (
            <div>
              <textarea
                value={narrativeText}
                onChange={e => setNarrativeText(e.target.value)}
                rows={3}
                className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Explain HOW this level leads to the next. What is the causal logic? What must be in place?"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => saveToc.mutate({ narrative: narrativeText })}
                  disabled={saveToc.isLoading}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium disabled:opacity-50">
                  {saveToc.isLoading ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditNarrative(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic leading-relaxed">
              {toc?.narrative || <span className="text-gray-300">No narrative yet: click Add to document the causal logic</span>}
            </p>
          )}
        </div>

        {/* Assumptions */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">
              Assumptions <span className="text-gray-400 font-normal">({toc?.assumptions?.length || 0})</span>
            </label>
            {toc?.id && (
              <button onClick={() => setShowAssumpForm(!showAssumpForm)}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <PlusIcon className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          <div className="space-y-1.5 mb-2">
            {(toc?.assumptions || []).map(a => (
              <div key={a.id} className="flex items-start gap-2 bg-blue-50/50 rounded-lg border border-blue-100 px-3 py-2">
                <CheckCircleIcon className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <span className="text-sm text-gray-700">{a.text}</span>
                  {a.category && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-600 rounded px-1.5 py-0.5">{a.category}</span>
                  )}
                </div>
                <button onClick={() => { if (window.confirm('Remove this assumption?')) delAssump.mutate(a.id); }}
                  className="text-gray-300 hover:text-red-500 text-sm ml-1 shrink-0">×</button>
              </div>
            ))}
          </div>
          {showAssumpForm && toc?.id && (
            <div className="flex gap-2 flex-wrap mt-2">
              <input value={newAssump.text} onChange={e => setNewAssump(f => ({ ...f, text: e.target.value }))}
                className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="Assumption text (what must be true)…" />
              <select value={newAssump.category} onChange={e => setNewAssump(f => ({ ...f, category: e.target.value }))}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                <option value="">Category</option>
                {ASSUMPTION_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => { if (newAssump.text.trim()) addAssump.mutate(newAssump); }}
                disabled={!newAssump.text.trim() || addAssump.isLoading}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                Add
              </button>
            </div>
          )}
        </div>

        {/* Risks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-gray-700">
              Risks <span className="text-gray-400 font-normal">({toc?.risks?.length || 0})</span>
            </label>
            {toc?.id && (
              <button onClick={() => setShowRiskForm(!showRiskForm)}
                className="text-xs text-red-600 hover:underline flex items-center gap-1">
                <PlusIcon className="w-3 h-3" /> Add Risk
              </button>
            )}
          </div>
          <div className="space-y-2 mb-2">
            {(toc?.risks || []).map(r => (
              <div key={r.id} className="bg-red-50/50 rounded-lg border border-red-100 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-800">{r.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <RiskBadge label="Likelihood" value={r.likelihood} />
                    <RiskBadge label="Impact" value={r.impact} />
                    <button onClick={() => { if (window.confirm('Remove this risk?')) delRisk.mutate(r.id); }}
                      className="text-gray-300 hover:text-red-500 text-sm ml-1">×</button>
                  </div>
                </div>
                {r.description && <p className="text-xs text-gray-500 ml-6 mb-1">{r.description}</p>}
                {r.mitigation && (
                  <p className="text-xs text-green-700 ml-6 bg-green-50 rounded px-2 py-1">
                    <span className="font-semibold">Mitigation:</span> {r.mitigation}
                  </p>
                )}
              </div>
            ))}
          </div>
          {showRiskForm && toc?.id && (
            <div className="border border-red-200 rounded-lg p-4 bg-red-50 space-y-2">
              <input value={newRisk.title} onChange={e => setNewRisk(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="Risk title *" />
              <input value={newRisk.description} onChange={e => setNewRisk(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="Description (optional)" />
              <div className="flex gap-2">
                <select value={newRisk.likelihood} onChange={e => setNewRisk(f => ({ ...f, likelihood: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                  <option value="Low">Low Likelihood</option>
                  <option value="Medium">Medium Likelihood</option>
                  <option value="High">High Likelihood</option>
                </select>
                <select value={newRisk.impact} onChange={e => setNewRisk(f => ({ ...f, impact: e.target.value }))}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
                  <option value="Low">Low Impact</option>
                  <option value="Medium">Medium Impact</option>
                  <option value="High">High Impact</option>
                </select>
              </div>
              <input value={newRisk.mitigation} onChange={e => setNewRisk(f => ({ ...f, mitigation: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="Mitigation strategy (optional)" />
              <div className="flex gap-2">
                <button onClick={() => { if (newRisk.title.trim()) addRisk.mutate(newRisk); }}
                  disabled={!newRisk.title.trim() || addRisk.isLoading}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  Add Risk
                </button>
                <button onClick={() => setShowRiskForm(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TheoryOfChangePage() {
  const { data: objectives = [], isLoading } = useQuery({
    queryKey: ['toc-objectives'],
    queryFn: () => api.get('/framework/objectives').then(r => r.data),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-100 rounded-lg"><LightBulbIcon className="w-6 h-6 text-yellow-600" /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Theory of Change</h1>
          <p className="text-sm text-gray-500">Document causal narratives, assumptions, and risks for each Results Framework level</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Theory of Change (ToC)</strong> documents HOW interventions lead to results. For each objective, document:
          (1) <strong>Causal Narrative</strong>: the logical link to the next level;
          (2) <strong>Assumptions</strong>: what must be true for the link to hold;
          (3) <strong>Risks</strong>: what could prevent the expected results.
          This is a requirement of World Bank, USAID, and UN M&amp;E standards.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : objectives.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 py-16 text-center text-gray-400">
          <LightBulbIcon className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No strategic objectives found</p>
          <p className="text-sm mt-1">Build the Results Framework first, then return here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {objectives.map(obj => (
            <ToCPanel key={obj.id} level="objective" referenceId={obj.id} refName={obj.name.replace(/^[A-Z]:/, '')} />
          ))}
        </div>
      )}
    </div>
  );
}
