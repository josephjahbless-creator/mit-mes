import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, KeyIcon } from '@heroicons/react/24/outline';
import { usersApi, institutionsApi } from '../../api';
import api from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const ROLES = ['super_admin', 'admin', 'me_officer', 'data_collector', 'viewer'];
const ROLE_LABELS  = { super_admin: 'Super Admin', admin: 'Admin', me_officer: 'M&E Officer', data_collector: 'Data Collector', viewer: 'Viewer' };
const ROLE_COLORS  = {
  super_admin:    'badge-red',
  admin:          'badge-blue',
  me_officer:     'badge-blue',
  data_collector: 'badge-yellow',
  viewer:         'badge-gray',
};

const MIT_HQ_CODES = ['MIT-HQ'];

const EMPTY_FORM = {
  name: '', personalEmail: '', password: '', role: 'data_collector',
  institutionId: '', departmentId: '', unitId: '',
};

// Mirror of the backend nameToMitEmail utility
function nameToMitEmail(name) {
  const parts = name.trim()
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length ? parts.join('.') + '@mit.go.tz' : '';
}

export default function UsersPage() {
  const user    = useAuthStore(s => s.user);
  const qc      = useQueryClient();

  const [modal,       setModal]      = useState(null); // null | 'create' | 'edit' | 'reset-pw'
  const [form,        setForm]       = useState(EMPTY_FORM);
  const [editId,      setEditId]     = useState(null);
  const [newPw,       setNewPw]      = useState('');
  const [filterRole,  setFilterRole] = useState('');
  const [filterInst,  setFilterInst] = useState('');
  const [search,      setSearch]     = useState('');

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data),
  });

  const { data: institutions = [] } = useQuery({
    queryKey: ['institutions'],
    queryFn: () => institutionsApi.list().then(r => r.data),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', form.departmentId],
    queryFn: () => api.get(`/departments/${form.departmentId}/units`).then(r => r.data),
    enabled: !!form.departmentId,
  });

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedInst = institutions.find(i => i.id === form.institutionId);
  const isMitHQ = selectedInst && MIT_HQ_CODES.includes(selectedInst.code);

  // filtered units for currently selected department
  const deptUnits = units;

  // table filter
  const filteredUsers = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterInst && u.institution?.id !== filterInst) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => usersApi.create(data),
    onSuccess: () => { qc.invalidateQueries(['users']); closeModal(); toast.success('User created'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create user'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['users']); closeModal(); toast.success('User updated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id) => usersApi.toggleActive(id),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('Status updated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update status'),
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, password }) => usersApi.resetPassword(id, { password }),
    onSuccess: () => { qc.invalidateQueries(['users']); closeModal(); toast.success('Password reset'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Reset failed'),
  });

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setModal('create');
  }

  function openEdit(u) {
    setForm({
      name:          u.name,
      personalEmail: '',
      password:      '',
      role:          u.role,
      institutionId: u.institution?.id  || '',
      departmentId:  u.department?.id   || '',
      unitId:        u.unit?.id         || '',
    });
    setEditId(u.id);
    setModal('edit');
  }

  function openResetPw(u) {
    setEditId(u.id);
    setNewPw('');
    setModal('reset-pw');
  }

  function closeModal() {
    setModal(null);
    setEditId(null);
    setNewPw('');
    setForm(EMPTY_FORM);
  }

  function handleSave() {
    const payload = {
      name:          form.name,
      role:          form.role,
      institutionId: form.institutionId || null,
      departmentId:  form.departmentId  || null,
      unitId:        form.unitId        || null,
    };
    if (modal === 'create') {
      createMutation.mutate({
        ...payload,
        password:      form.password,
        personalEmail: form.personalEmail || undefined,
      });
    } else {
      updateMutation.mutate({ id: editId, data: payload });
    }
  }

  // helper: entity label for table cell
  function entityLabel(u) {
    if (u.unit)       return `${u.unit.code} · ${u.unit.name}`;
    if (u.department) return `${u.department.code} · ${u.department.name}`;
    if (u.institution) return u.institution.name;
    return '—';
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{filteredUsers.length} of {users.length} users</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <PlusIcon className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search name or email…"
          className="input flex-1 min-w-[200px] max-w-xs"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input w-40" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select className="input w-56" value={filterInst} onChange={e => setFilterInst(e.target.value)}>
          <option value="">All institutions</option>
          {institutions.map(i => <option key={i.id} value={i.id}>{i.code} – {i.name.substring(0,35)}</option>)}
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate" title={entityLabel(u)}>
                      {entityLabel(u)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => openResetPw(u)} className="text-gray-400 hover:text-amber-600 transition-colors" title="Reset password">
                          <KeyIcon className="w-4 h-4" />
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => toggleMutation.mutate(u.id)}
                            className={`text-xs font-medium ${u.isActive ? 'text-red-400 hover:text-red-600' : 'text-green-500 hover:text-green-700'}`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-5">{modal === 'create' ? 'Add User' : 'Edit User'}</h2>
            <div className="space-y-4">

              {/* Name */}
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Auto-generated MIT email preview */}
              <div>
                <label className="label">System Login Email (auto-generated)</label>
                <div className="input bg-gray-50 text-gray-700 flex items-center gap-2 select-all cursor-default">
                  <span className="text-blue-700 font-medium">
                    {nameToMitEmail(form.name) || <span className="text-gray-400 font-normal">Enter full name above…</span>}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Generated from the full name — this is what the user signs in with.</p>
              </div>

              {/* Personal / contact email (optional, for sending credentials) */}
              {modal === 'create' && (
                <div>
                  <label className="label">Personal Email <span className="text-gray-400 font-normal">(optional — to receive credentials)</span></label>
                  <input
                    type="email" className="input"
                    placeholder="e.g. joseph@gmail.com"
                    value={form.personalEmail}
                    onChange={e => setForm(f => ({ ...f, personalEmail: e.target.value }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">If provided, the welcome email with login details is sent here.</p>
                </div>
              )}

              {/* Password (only on create) */}
              {modal === 'create' && (
                <div>
                  <label className="label">Temporary Password *</label>
                  <input type="password" className="input" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                  <p className="text-xs text-gray-400 mt-1">Min 8 chars, 1 uppercase, 1 number, 1 special character</p>
                </div>
              )}

              {/* Role */}
              <div>
                <label className="label">Role *</label>
                <select className="input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>

              {/* Institution */}
              <div>
                <label className="label">Institution</label>
                <select className="input" value={form.institutionId}
                  onChange={e => setForm(f => ({ ...f, institutionId: e.target.value, departmentId: '', unitId: '' }))}>
                  <option value="">None (national level)</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.code} – {i.name}</option>)}
                </select>
              </div>

              {/* Department: only show when MIT-HQ is selected */}
              {isMitHQ && (
                <div>
                  <label className="label">Department / Unit</label>
                  <select className="input" value={form.departmentId}
                    onChange={e => setForm(f => ({ ...f, departmentId: e.target.value, unitId: '' }))}>
                    <option value="">None (HQ level)</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
                  </select>
                </div>
              )}

              {/* Sub-unit: only show when department has units */}
              {isMitHQ && form.departmentId && deptUnits.length > 0 && (
                <div>
                  <label className="label">Sub-Unit (optional)</label>
                  <select className="input" value={form.unitId}
                    onChange={e => setForm(f => ({ ...f, unitId: e.target.value }))}>
                    <option value="">None</option>
                    {deptUnits.map(u => <option key={u.id} value={u.id}>{u.code} – {u.name}</option>)}
                  </select>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} className="btn-primary" disabled={isSubmitting || !form.name || (modal === 'create' && !form.password)}>
                  {isSubmitting ? 'Saving…' : (modal === 'create' ? 'Create User' : 'Save Changes')}
                </button>
                <button onClick={closeModal} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ────────────────────────────────────────── */}
      {modal === 'reset-pw' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
            <p className="text-sm text-gray-500 mb-4">
              Set a new password for <strong>{users.find(u => u.id === editId)?.name}</strong>.
              All existing sessions will be terminated.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">New Password *</label>
                <input
                  type="password" className="input"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="Min 8 chars, uppercase + number + special"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => resetPwMutation.mutate({ id: editId, password: newPw })}
                  className="btn-primary"
                  disabled={resetPwMutation.isPending || newPw.length < 8}
                >
                  {resetPwMutation.isPending ? 'Resetting…' : 'Reset Password'}
                </button>
                <button onClick={closeModal} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
