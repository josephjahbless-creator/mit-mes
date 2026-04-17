import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, KeyIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { institutionsApi } from '../../api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const LOGO_MAP = {
  CAMARTEC: '/logos/camartec.png', BRELA: '/logos/brela.png', CBE: '/logos/cbe.png',
  FCC: '/logos/fcc.jpeg', NDC: '/logos/ndc.png', TEMDO: '/logos/temdo.jpeg',
  TIRDO: '/logos/tirdo.png', SIDO: '/logos/sido.jpeg', TBS: '/logos/tbs.png',
  TANTRADE: '/logos/tantrade.png', WRRB: '/logos/wrrb.png',
};

// MIT HQ and any ministry-level codes are excluded — they appear under /admin/mit
const EXCLUDED_CODES = ['MIT', 'MIT-HQ'];

function InstitutionCard({ inst, navigate, regenMutation }) {
  const logo = LOGO_MAP[inst.code];
  return (
    <div
      className="card flex flex-col items-center gap-3 p-5 hover:shadow-lg hover:border-mit-blue/30 transition-all cursor-pointer group"
      onClick={() => navigate(`/framework/edit?ctx=inst:${inst.id}`)}
    >
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
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${inst.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
        {inst.isActive ? 'Active' : 'Inactive'}
      </span>
      <button
        onClick={e => { e.stopPropagation(); regenMutation.mutate(inst.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400 hover:text-mit-blue flex items-center gap-1"
        title="Regenerate API key"
      >
        <KeyIcon className="w-3 h-3" /> API Key
      </button>
    </div>
  );
}

export default function InstitutionsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', region: '', contactEmail: '' });

  const { data: institutions = [], isLoading } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => institutionsApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['institutions']); setModal(false); toast.success('Institution created'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const regenMutation = useMutation({
    mutationFn: (id) => institutionsApi.regenerateKey(id),
    onSuccess: (res) => toast.success(`New API key: ${res.data.apiKey}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Institutions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {institutions.filter(i => !EXCLUDED_CODES.includes(i.code)).length} institutions registered
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Add Institution
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {institutions
            .filter(i => !EXCLUDED_CODES.includes(i.code))
            .map(inst => (
              <InstitutionCard key={inst.id} inst={inst} navigate={navigate} regenMutation={regenMutation} />
            ))}
        </div>
      )}

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
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
