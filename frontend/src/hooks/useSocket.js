import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';

// Singleton socket — reconnects automatically
let socket = null;

function getSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      rejectUnauthorized: false,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    });
  }
  return socket;
}

/**
 * Join rooms when the user is authenticated, then clean up on logout.
 * Call this once near the top of your app (e.g. in AppLayout).
 */
export function useSocketAuth() {
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user?.id) return;
    const sock = getSocket();
    sock.emit('join', user.id);
    if (user.institutionId) sock.emit('joinInstitution', user.institutionId);
    if (user.role) sock.emit('joinRole', user.role);
  }, [user?.id, user?.institutionId, user?.role]);
}

/**
 * Subscribe to a socket event. Automatically unsubscribes on unmount.
 */
export function useSocketEvent(event, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const sock = getSocket();
    const cb = (...args) => handlerRef.current(...args);
    sock.on(event, cb);
    return () => sock.off(event, cb);
  }, [event]);
}

export { getSocket };
