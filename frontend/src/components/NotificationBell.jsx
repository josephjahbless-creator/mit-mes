import { useRef, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { notificationsApi } from '../api';
import { useSocketEvent } from '../hooks/useSocket';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_DOT = {
  deadline:        'bg-orange-400',
  approval:        'bg-green-500',
  rejection:       'bg-red-500',
  submission:      'bg-blue-500',
  helpdesk_reply:  'bg-purple-500',
  ai_risk:         'bg-red-400',
  ai_anomaly:      'bg-amber-400',
};

function typeDot(type) {
  return TYPE_DOT[type] ?? 'bg-gray-400';
}

// Maps notification relatedType → frontend route
// Returns the path to navigate to (relatedId available if needed for detail routes)
const RELATED_ROUTES = {
  'user-requests': ()   => '/admin/user-requests',
  'SupportTicket': (id) => `/helpdesk`,
  'ai_risk':       ()   => '/insights',
  'ai_anomaly':    ()   => '/insights',
  'submission':    (id) => `/data-entry/approval-queue`,
  'dataEntry':     (id) => `/data-entry/${id}`,
  'indicator':     (id) => `/indicators/${id}`,
};

function resolveNotificationRoute(relatedType, relatedId) {
  const fn = RELATED_ROUTES[relatedType];
  if (fn) return fn(relatedId);
  // Fallback: try to build a sensible path
  return `/${relatedType}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Real-time: invalidate count when server pushes a notification event
  useSocketEvent('notification:new', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
  });
  useSocketEvent('submission:approved', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast.success('A submission was just approved', { icon: '✅' });
  });
  useSocketEvent('submission:rejected', () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast.error('A submission was rejected');
  });

  // Unread count: polls every 60 s (socket supplements between polls)
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const unread = countData?.count ?? 0;
  const badgeLabel = unread > 9 ? '9+' : unread > 0 ? String(unread) : null;

  // Latest 10 notifications (fetched when panel opens)
  const { data: listData, isLoading } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationsApi.list({ limit: 10, page: 1 }).then((r) => r.data),
    enabled: open,
  });

  const notifications = listData?.notifications ?? listData?.data ?? [];

  // Mark one as read
  const markRead = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Could not mark notification as read'),
  });

  // Mark all as read
  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: () => toast.error('Could not mark all as read'),
  });

  // Close panel when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleNotificationClick(n) {
    const notifId  = n.id ?? n._id;
    const relatedId = n.relatedId ?? n.related_id;

    // Mark as read only if unread and we have a valid ID
    if (!n.isRead && notifId) {
      markRead.mutate(notifId);
    }

    setOpen(false);

    // Navigate to the correct frontend route using the mapping
    if (n.relatedType) {
      navigate(resolveNotificationRoute(n.relatedType, relatedId));
    }
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-mit-blue hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-200"
        aria-label="Notifications"
      >
        <BellIcon className="w-5 h-5" />
        {badgeLabel && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {badgeLabel}
          </span>
        )}
      </button>

      {/* Dropdown panel — fixed to top-right of viewport */}
      {open && (
        <div className="fixed top-4 right-4 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">
              Notifications
              {unread > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium">
                  {unread} unread
                </span>
              )}
            </h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-xs text-mit-blue hover:text-blue-800 font-medium disabled:opacity-50 transition-colors"
              >
                <CheckIcon className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[420px] divide-y divide-gray-50">
            {isLoading && (
              <div className="py-10 text-center text-sm text-gray-400">
                Loading…
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="py-10 text-center text-sm text-gray-400">
                No notifications yet
              </div>
            )}

            {notifications.map((n) => {
              const id = n.id ?? n._id;
              const isRead = n.isRead ?? n.is_read ?? false;
              const createdAt = n.createdAt ?? n.created_at;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  {/* Colored type dot */}
                  <span
                    className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${typeDot(n.type)}`}
                  />

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="mt-0.5 text-xs text-gray-500 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                    )}
                    {createdAt && (
                      <p className="mt-1 text-[11px] text-gray-400">
                        {timeAgo(createdAt)}
                      </p>
                    )}
                  </div>

                  {/* Unread dot indicator */}
                  {!isRead && (
                    <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-mit-blue" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="text-xs text-mit-blue hover:text-blue-800 font-medium transition-colors"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
