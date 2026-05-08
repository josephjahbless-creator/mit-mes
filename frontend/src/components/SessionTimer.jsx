import { useState, useEffect, useCallback, useRef } from 'react';
import { ClockIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import useAuthStore from '../store/authStore';
import api from '../api/client';
import toast from 'react-hot-toast';

// ── Tunable constants ─────────────────────────────────────────────────────────
const INACTIVITY_TIMEOUT = 3 * 60;   // 3 minutes → auto-logout
const WARN_BEFORE        = 60;        // show warning 60 s before logout (at 2-min mark)

// Activity events that reset the inactivity clock
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll', 'click'];

export default function SessionTimer() {
  const { accessToken, refreshToken, setAuth, logout, user } = useAuthStore();

  const [secondsIdle, setSecondsIdle] = useState(0);
  const [visible, setVisible]          = useState(false);
  const [extending, setExtending]      = useState(false);

  const lastActivityRef = useRef(Date.now());
  const intervalRef     = useRef(null);

  // Reset idle clock on any user activity
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (visible) setVisible(false);     // dismiss warning if user moves
  }, [visible]);

  // Attach / detach activity listeners whenever the user is logged in
  useEffect(() => {
    if (!accessToken) return;
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, resetActivity, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, resetActivity));
  }, [accessToken, resetActivity]);

  // Silent JWT refresh to keep the access token alive while the user is active
  const silentRefresh = useCallback(async () => {
    if (!refreshToken) return;
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      setAuth(user, data.accessToken, data.refreshToken || refreshToken);
    } catch {
      // refresh token expired — the inactivity timer will log the user out anyway
    }
  }, [refreshToken, user, setAuth]);

  // Explicit "I'm still here" extension
  const extendSession = useCallback(async () => {
    if (!refreshToken) return;
    setExtending(true);
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      setAuth(user, data.accessToken, data.refreshToken || refreshToken);
      lastActivityRef.current = Date.now();
      setVisible(false);
      setSecondsIdle(0);
      toast.success('Session extended');
    } catch {
      logout();
      window.location.href = '/login';
    } finally { setExtending(false); }
  }, [refreshToken, user, setAuth, logout]);

  // Main inactivity ticker
  useEffect(() => {
    if (!accessToken) {
      clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      const idleSecs = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      setSecondsIdle(idleSecs);

      if (idleSecs >= INACTIVITY_TIMEOUT) {
        // Time's up — log out
        clearInterval(intervalRef.current);
        logout();
        toast.error('Session expired due to inactivity. Please sign in again.', { duration: 5000 });
        window.location.href = '/login';
        return;
      }

      if (idleSecs >= INACTIVITY_TIMEOUT - WARN_BEFORE) {
        setVisible(true);
        // Also silently refresh JWT so the API calls work if the user extends
        silentRefresh();
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [accessToken, logout, silentRefresh]);

  if (!visible || !accessToken) return null;

  const remaining = Math.max(0, INACTIVITY_TIMEOUT - secondsIdle);
  const mins      = Math.floor(remaining / 60);
  const secs      = remaining % 60;
  const isUrgent  = remaining <= 30;

  return (
    <div className={`fixed bottom-5 right-5 z-50 rounded-2xl shadow-2xl border-2 p-4 max-w-xs w-full transition-all ${
      isUrgent ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-amber-50 border-amber-300'
    }`}>
      <div className="flex items-start gap-3">
        <ClockIcon className={`w-5 h-5 shrink-0 mt-0.5 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
            Session expiring due to inactivity
          </p>
          <p className={`text-xs mt-0.5 font-mono font-semibold ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
            Auto-logout in {mins > 0 ? `${mins}m ` : ''}{String(secs).padStart(2, '0')}s
          </p>
        </div>
      </div>
      <button
        onClick={extendSession}
        disabled={extending}
        className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors text-white ${
          isUrgent
            ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
            : 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
        }`}
      >
        <ArrowPathIcon className={`w-3.5 h-3.5 ${extending ? 'animate-spin' : ''}`} />
        {extending ? 'Continuing…' : "I'm still here — continue"}
      </button>
    </div>
  );
}
