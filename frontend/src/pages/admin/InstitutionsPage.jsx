import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon, KeyIcon, BuildingOfficeIcon, PencilIcon,
  CheckCircleIcon, XCircleIcon,
} from '@heroicons/react/24/outline';
import { institutionsApi } from '../../api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const LOGO_MAP = {
  CAMARTEC: '/logos/camartec.png', BRELA: '/logos/brela.png', CBE: '/logos/cbe.png',
  FCC: '/logos/fcc.jpeg', NDC: '/logos/ndc.png', TEMDO: '/logos/temdo.jpeg',
  TIRDO: '/logos/tirdo.png', SIDO: '/logos/sido.jpeg', TBS: '/logos/tbs.png',
  TANTRADE: '/logos/tantrade.png', WRRB: '/logos/wrrb.png',
};

// MIT HQ codes are managed under /admin/mit — excluded from this grid
const EXCLUDED_CODES = ['MIT', 'MIT-HQ'];

function InstitutionCard({ inst, navigate, regenMutation, updateMutation, isSuperAdmin, onEdit }) {
  const logo = LOGO_MAP[inst.code];
  const inactive = !inst.isActive;

  return (
    <div
      className={`card flex flex-col items-center gap-3 p-5 hover:shadow-lg transition-all group relative
        ${inactive ? 'opacity-60 border-dashed border-red-200' : 'hover:border-mit-blue/30 cursor-pointer'}`}
      onClick={() => !inactive && navigate(`/framework/edit?ctx=inst:${inst.id}`)}
    >
      {/* Inactive banner */}
      {inactive && (
        <span className="absolute top-2 right-2 text-[9px] font-bold text-red-500 uppercase tracking-wide">
          Inactive
        </span>
      )}

      {logo ? (
        <img src={logo} alt={inst.code} className="w-16 h-16 object-contain rounded-xl border border-gray-100 bg-white p-1" />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-mit-blue flex items-center justify-center">
          <span className="text-white text-sm font-bold">{inst.code?.slice(0, 3)}</span>
        </div>
      )}

      <div className="text-center">
        <div className="font-bold text-gray-800 text-sm leading-tight">{inst.code}</div>
        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-snug">{inst.name}</div>
      </div>

      {inst.region && (
        <div className="text-[10px] text-gray-400 flex items-center gap-1">
          <BuildingOfficeIcon className="w-3 h-3" />
          {inst.region}
        </div>
      )}

      {/* Action buttons — visible on hover for super_admin */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2 mt-1">
          {/* Edit details */}
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400 hover:text-mit-blue flex items-center gap-1"
            title="Edit institution details"
          >
            <PencilIcon className="w-3 h-3" /> Edit
          </button>

          {/* Regenerate API key */}
          <button
            onClick={e => { e.stopPropagation(); regenMutation.mutate(inst.id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400 hover:text-mit-blue flex items-center gap-1"
            title="Regenerate API key"
          >
            <KeyIcon className="w-3 h-3" /> API Key
          </button>

          {/* Toggle active/inactive */}
          <button
            onClick={e => {
              e.stopPropagation();
              updateMutation.mutate({ id: inst.id, data: { isActive: !inst.isActive } });
            }}
            className={`opacity-0 group-hover:opacity-100 transition-opacity text-[10px] flex items-center gap-1
              ${inst.isActive
                ? 'text-gray-400 hover:text-red-500'
                : 'text-gray-400 hover:text-green-600'}`}
            title={inst.isActive ? 'Deactivate institution' : 'Reactivate institution'}
          >
            {inst.isActive
              ? <><XCircleIcon className="w-3 h-3" /> Deactivate</>
              : <><CheckCircleIcon className="w-3 h-3" /> Reactivate</>
            }
          </button>
        </div>
      )}
    </div>
  );
}

export default function InstitutionsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const isSuperAdmin = user?.role === 'super_admin';

  const [modal, setModal]           = useState(false);
  const [editModal, setEditModal]   = useState(null);   // institution object being edited
  const [form, setForm]             = useState({ name: '', code: '', region: '', contactEmail: '' });
  const [editForm, setEditForm]     = useState({ name: '', region: '', contactEmail: '' });
  const [showInactive, setShowInactive] = useState(false);

  const { data: institutions = [], isLoading } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => institutionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['institutions']);
      setModal(false);
      setForm({ name: '', code: '', region: '', contactEmail: '' });
      toast.success('Institution created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => institutionsApi.update(id, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries(['institutions']);
      // Close edit modal if it was an edit (not a toggle)
      if (editModal && variables.id === editModal.id) {
        setEditModal(null);
      }
      toast.success('Institution updated');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update'),
  });

  const regenMutation = useMutation({
    mutationFn: (id) => institutionsApi.regenerateKey(id),
    onSuccess: (res) => toast.success(`New API key: ${res.data.apiKey}`, { duration: 8000 }),
    onError: () => toast.error('Failed to regenerate key'),
  });

  // Apply active/inactive filter
  const visible = institutions
    .filter(i => !EXCLUDED_CODES.includes(i.code))
    .filter(i => showInactive ? true : i.isActive);

  const inactiveCount = institutions.filter(i => !EXCLUDED_CODES.includes(i.code) && !i.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institutions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {institutions.filter(i => !EXCLUDED_CODES.includes(i.code) && i.isActive).length} active institutions
            {isSuperAdmin && inactiveCount > 0 && (
              <span className="ml-2 text-red-400">· {inactiveCount} inactive</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Toggle to show inactive — super_admin only */}
          {isSuperAdmin && inactiveCount > 0 && (
            <button
              onClick={() => setShowInactive(v => !v)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                showInactive
                  ? 'bg-red-50 border-red-200 text-red-600'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
              }`}
            >
              {showInactive ? 'Hide inactive' : `Show inactive (${inactiveCount})`}
            </button>
          )}
          {isSuperAdmin && (
            <button onClick={() => setModal(true)} className="btn-primary">
              <PlusIcon className="w-4 h-4" /> Add Institution
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {visible.map(inst => (
            <InstitutionCard
              key={inst.id}
              inst={inst}
              navigate={navigate}
              regenMutation={regenMutation}
              updateMutation={updateMutation}
              isSuperAdmin={isSuperAdmin}
              onEdit={() => {
                setEditForm({ name: inst.name, region: inst.region || '', contactEmail: inst.contactEmail || '' });
                setEditModal(inst);
              }}
            />
          ))}
          {visible.length === 0 && (
            <p className="col-span-full text-center text-gray-400 py-12">No institutions found.</p>
          )}
        </div>
      )}

      {/* Create modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Add Institution</h2>
            <div className="space-y-4">
              {[
                ['name',         'Institution Name *', 'text'],
                ['code',         'Short Code *',       'text'],
                ['region',       'Region',             'text'],
                ['contactEmail', 'Contact Email',      'email'],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    type={type}
                    className="input"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => createMutation.mutate(form)}
                  className="btn-primary"
                  disabled={createMutation.isPending || !form.name || !form.code}
                >
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-1">Edit Institution</h2>
            <p className="text-xs text-gray-400 mb-4">{editModal.code}</p>
            <div className="space-y-4">
              {[
                ['name',         'Institution Name', 'text'],
                ['region',       'Region',           'text'],
                ['contactEmail', 'Contact Email',    'email'],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input
                    type={type}
                    className="input"
                    value={editForm[key]}
                    onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => updateMutation.mutate({ id: editModal.id, data: editForm })}
                  className="btn-primary"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save changes'}
                </button>
                <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
