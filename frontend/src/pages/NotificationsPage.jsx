import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BellAlertIcon, CheckCircleIcon, TrashIcon, EnvelopeOpenIcon,
  ExclamationTriangleIcon, InboxIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { notificationsApi } from '../api';

// Same mapping the notification bell uses, so a click lands on the right page.
const RELATED_ROUTES = {
  'user-requests': () => '/admin/user-requests',
  'SupportTicket': () => '/helpdesk',
  'ai_risk':       () => '/insights',
  'ai_anomaly':    () => '/insights',
  'submission':    () => '/data-entry/approval-queue',
  'dataEntry':     (id) => `/data-entry/${id}`,
  'indicator':     (id) => `/indicators/${id}`,
};
function resolveRoute(relatedType, relatedId) {
  const fn = RELATED_ROUTES[relatedType];
  return fn ? fn(relatedId) : (relatedType ? `/${relatedType}` : null);
}

function timeAgo(dateStr) {
  const d = new Date(dateStr);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

const TYPE_STYLE = {
  ai_risk:    { Icon: ExclamationTriangleIcon, c: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
  ai_anomaly: { Icon: ExclamationTriangleIcon, c: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
  submission: { Icon: CheckCircleIcon, c: 'text-green-500 bg-green-50 dark:bg-green-900/30' },
  default:    { Icon: BellAlertIcon, c: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all'); // all | unread
  const limit = 20;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notifications', 'page', page],
    queryFn: () => notificationsApi.list({ page, limit }).then((r) => r.data),
    keepPreviousData: true,
  });

  const notifications = data?.notifications ?? data?.data ?? [];
  const total = data?.total ?? data?.pagination?.total ?? notifications.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const shown = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const markRead = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('All marked as read'); },
    onError: () => toast.error('Could not mark all as read'),
  });
  const remove = useMutation({
    mutationFn: (id) => notificationsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); },
    onError: () => toast.error('Could not delete notification'),
  });

  function openNotification(n) {
    if (!n.isRead && n.id) markRead.mutate(n.id);
    const route = resolveRoute(n.relatedType, n.relatedId);
    if (route) navigate(route);
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <BellAlertIcon className="w-7 h-7 text-mit-blue dark:text-blue-400" />
            Notifications
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{total} total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-700" title="Refresh">
            <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => markAll.mutate()} disabled={markAll.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-mit-blue text-white text-sm font-medium hover:bg-blue-800 disabled:opacity-50">
            <EnvelopeOpenIcon className="w-4 h-4" /> Mark all read
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-4">
        {[['all', 'All'], ['unread', 'Unread']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === v ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>
        ) : shown.length === 0 ? (
          <div className="p-12 text-center">
            <InboxIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
          </div>
        ) : shown.map((n) => {
          const st = TYPE_STYLE[n.type] || TYPE_STYLE.default;
          const route = resolveRoute(n.relatedType, n.relatedId);
          return (
            <div key={n.id} className={`flex items-start gap-3 p-4 transition-colors ${!n.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''} ${route ? 'hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer' : ''}`}
              onClick={() => route && openNotification(n)}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${st.c}`}>
                <st.Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${!n.isRead ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-700 dark:text-gray-300'}`}>{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                </div>
                {n.message && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</p>}
                <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {!n.isRead && (
                  <button onClick={() => markRead.mutate(n.id)} className="p-1.5 text-gray-400 hover:text-green-600" title="Mark read">
                    <CheckCircleIcon className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => remove.mutate(n.id)} className="p-1.5 text-gray-400 hover:text-red-500" title="Delete">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 text-gray-600 dark:text-gray-300">Next</button>
        </div>
      )}
    </div>
  );
}
