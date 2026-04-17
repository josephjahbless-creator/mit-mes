import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { helpdeskApi } from '../../api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  TicketIcon, PlusIcon, MagnifyingGlassIcon, ChevronRightIcon,
  XMarkIcon, PaperAirplaneIcon, ArrowLeftIcon, TrashIcon,
  LockClosedIcon, UserCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

// ── Config ────────────────────────────────────────────────────────────────────
const STATUS_CFG = {
  open:        { label: 'Open',        color: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  resolved:    { label: 'Resolved',    color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  closed:      { label: 'Closed',      color: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
};

const PRIORITY_CFG = {
  low:    { label: 'Low',    color: 'bg-gray-100 text-gray-600'   },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-600'   },
  high:   { label: 'High',   color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-700'     },
};

const CATEGORIES = ['general', 'data-entry', 'indicator', 'budget', 'report', 'access', 'technical', 'other'];

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.open;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CFG[priority] || PRIORITY_CFG.medium;
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── New Ticket Form ───────────────────────────────────────────────────────────
function NewTicketForm({ onClose, onCreate }) {
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'medium' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function submit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    onCreate(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">New Support Ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Subject *</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)}
              placeholder="Brief description of your issue"
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1.5">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe your issue in detail…" rows={4}
              className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-blue-300 outline-none resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 capitalize">
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.replace('-', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
              Submit Ticket
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-xl hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Ticket Detail View ────────────────────────────────────────────────────────
function TicketDetail({ ticketId, isAdmin, onBack, onStatusChange }) {
  const qc = useQueryClient();
  const [reply, setReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => helpdeskApi.getTicket(ticketId).then(r => r.data),
  });

  const addReply = useMutation({
    mutationFn: (data) => helpdeskApi.addReply(ticketId, data),
    onSuccess: () => {
      qc.invalidateQueries(['ticket', ticketId]);
      qc.invalidateQueries(['helpdesk-tickets']);
      setReply('');
      toast.success('Reply sent');
    },
    onError: () => toast.error('Failed to send reply'),
  });

  const updateStatus = useMutation({
    mutationFn: (data) => helpdeskApi.updateTicket(ticketId, data),
    onSuccess: () => {
      qc.invalidateQueries(['ticket', ticketId]);
      qc.invalidateQueries(['helpdesk-tickets']);
      qc.invalidateQueries(['helpdesk-stats']);
      toast.success('Ticket updated');
    },
    onError: () => toast.error('Update failed'),
  });

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl" />)}
    </div>
  );
  if (!ticket) return null;

  function sendReply() {
    if (!reply.trim()) return;
    addReply.mutate({ message: reply.trim(), isInternal });
  }

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
        <ArrowLeftIcon className="w-4 h-4" /> Back to tickets
      </button>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-mono text-gray-400 mb-1">{ticket.ticketNo}</p>
            <h2 className="text-lg font-bold text-gray-900">{ticket.subject}</h2>
            <p className="text-xs text-gray-500 mt-1">
              By <span className="font-medium">{ticket.submittedBy?.name || ticket.guestName || 'Guest'}</span> · {fmtDate(ticket.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-700 whitespace-pre-line bg-gray-50 rounded-xl p-3">{ticket.description}</p>

        {/* Admin controls */}
        {isAdmin && (
          <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-gray-100">
            <span className="text-xs text-gray-500 self-center mr-1">Set status:</span>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <button key={k} onClick={() => updateStatus.mutate({ status: k })}
                disabled={ticket.status === k}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all
                  ${ticket.status === k ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
                {v.label}
              </button>
            ))}
            {ticket.assignedTo && (
              <span className="text-xs text-gray-400 self-center ml-2">
                Assigned to: <span className="font-medium text-gray-700">{ticket.assignedTo.name}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Replies */}
      <div className="space-y-3">
        {ticket.replies?.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No replies yet. Be the first to respond.</p>
        )}
        {ticket.replies?.map(r => {
          const isStaff = ['super_admin', 'me_officer', 'admin'].includes(r.user?.role);
          return (
            <div key={r.id} className={`flex gap-3 ${isStaff ? 'flex-row-reverse' : ''}`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isStaff ? 'bg-blue-600' : 'bg-gray-400'}`}>
                {r.user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-2xl ${isStaff ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-3 text-sm ${
                  r.isInternal ? 'bg-amber-50 border border-amber-200 text-amber-900' :
                  isStaff ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {r.isInternal && <p className="text-[11px] font-bold text-amber-600 mb-1">Internal Note</p>}
                  <p className="whitespace-pre-line">{r.message}</p>
                </div>
                <p className="text-[11px] text-gray-400 mt-1 px-1">
                  {r.user?.name} · {fmtDate(r.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      {ticket.status !== 'closed' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <textarea value={reply} onChange={e => setReply(e.target.value)}
            placeholder="Write a reply…" rows={3}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:ring-2 focus:ring-blue-300 outline-none" />
          <div className="flex items-center justify-between mt-3">
            {isAdmin ? (
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)}
                  className="rounded" />
                Internal note (not visible to user)
              </label>
            ) : <div />}
            <button onClick={sendReply} disabled={!reply.trim() || addReply.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50">
              <PaperAirplaneIcon className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      )}

      {ticket.status === 'closed' && (
        <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-xl p-3">
          <LockClosedIcon className="w-4 h-4" />
          This ticket is closed. No further replies are possible.
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HelpdeskPage() {
  const { user } = useAuthStore();
  const qc       = useQueryClient();
  const isAdmin  = ['super_admin', 'me_officer', 'admin'].includes(user?.role);

  const [showNew,    setShowNew]    = useState(false);
  const [selected,   setSelected]  = useState(null);
  const [filters,    setFilters]   = useState({ status: '', priority: '', search: '' });
  const [page,       setPage]      = useState(1);

  const { data: stats } = useQuery({
    queryKey: ['helpdesk-stats'],
    queryFn: () => helpdeskApi.ticketStats().then(r => r.data),
    enabled: isAdmin,
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ['helpdesk-tickets', filters.status, filters.priority, page],
    queryFn: () => helpdeskApi.listTickets({
      status:   filters.status   || undefined,
      priority: filters.priority || undefined,
      page,
      limit: 15,
    }).then(r => r.data),
  });

  const tickets = result?.tickets || [];
  const total   = result?.total   || 0;
  const pages   = result?.pages   || 1;

  const create = useMutation({
    mutationFn: (data) => helpdeskApi.createTicket(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['helpdesk-tickets']);
      qc.invalidateQueries(['helpdesk-stats']);
      setShowNew(false);
      setSelected(res.data.id);
      toast.success(`Ticket ${res.data.ticketNo} submitted!`);
    },
    onError: () => toast.error('Failed to submit ticket'),
  });

  const remove = useMutation({
    mutationFn: (id) => helpdeskApi.deleteTicket(id),
    onSuccess: () => {
      qc.invalidateQueries(['helpdesk-tickets']);
      qc.invalidateQueries(['helpdesk-stats']);
      toast.success('Ticket deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const filtered = tickets.filter(t =>
    !filters.search ||
    t.subject?.toLowerCase().includes(filters.search.toLowerCase()) ||
    t.ticketNo?.toLowerCase().includes(filters.search.toLowerCase())
  );

  if (selected) {
    return (
      <TicketDetail
        ticketId={selected}
        isAdmin={isAdmin}
        onBack={() => setSelected(null)}
        onStatusChange={() => {}}
      />
    );
  }

  return (
    <div className="space-y-6">
      {showNew && <NewTicketForm onClose={() => setShowNew(false)} onCreate={d => create.mutate(d)} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Helpdesk</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin ? 'Manage and respond to support tickets' : 'Submit a request or check ticket status'}
          </p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
          <PlusIcon className="w-4 h-4" /> New Ticket
        </button>
      </div>

      {/* Admin stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Open',        value: stats.byStatus.open        || 0, color: 'bg-blue-50 text-blue-700'   },
            { label: 'In Progress', value: stats.byStatus.in_progress || 0, color: 'bg-amber-50 text-amber-700' },
            { label: 'Resolved',    value: stats.byStatus.resolved    || 0, color: 'bg-green-50 text-green-700' },
            { label: 'Total',       value: stats.total                || 0, color: 'bg-gray-50 text-gray-700 border border-gray-200'  },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs opacity-75 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search tickets…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none" />
        </div>
        <select value={filters.status} onChange={e => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
          className="text-sm border border-gray-300 rounded-xl px-3 py-2">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filters.priority} onChange={e => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}
          className="text-sm border border-gray-300 rounded-xl px-3 py-2">
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Tickets table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <TicketIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No tickets found</p>
          <p className="text-sm mt-1">
            {filters.search || filters.status ? 'Try adjusting your filters' : 'Click "New Ticket" to get started'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map(ticket => (
              <div key={ticket.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors group"
                onClick={() => setSelected(ticket.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-gray-400">{ticket.ticketNo}</span>
                    <PriorityBadge priority={ticket.priority} />
                    <span className="text-xs text-gray-400 capitalize">{ticket.category}</span>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mt-0.5 truncate">{ticket.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ticket.submittedBy?.name || ticket.guestName || 'Guest'} · {fmtDate(ticket.createdAt)}
                    {ticket._count?.replies > 0 && (
                      <span className="ml-2 text-blue-500">💬 {ticket._count.replies}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={ticket.status} />
                  {isAdmin && (
                    <button onClick={e => { e.stopPropagation(); remove.mutate(ticket.id); }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{total} tickets total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <span className="px-3 py-1.5 font-medium">{page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
