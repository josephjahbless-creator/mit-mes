import { useState, useEffect, useCallback, useRef } from 'react';
import { ClockIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import useAuthStore from '../store/authStore';
import api from '../api/client';
import toast from 'react-hot-toast';

// Decode JWT exp claim (no library needed)
function getTokenExpiry(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // convert to ms
  } catch { return null; }
}

export default function SessionTimer() {
  const { accessToken, refreshToken, setAuth, logout, user } = useAuthStore();
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [visible, setVisible]         = useState(false);
  const [extending, setExtending]     = useState(false);
  const intervalRef = useRef(null);

  const doRefresh = useCallback(async (silent = false) => {
    if (!refreshToken) return;
    setExtending(true);
    try {
      const { data } = await api.post('/auth/refresh', { refreshToken });
      setAuth(user, data.accessToken, data.refreshToken || refreshToken);
      setVisible(false);
      if (!silent) toast.success('Session extended by 15 minutes');
    } catch {
      logout();
      window.location.href = '/login';
    } finally { setExtending(false); }
  }, [refreshToken, user, setAuth, logout]);

  useEffect(() => {
    clearInterval(intervalRef.current);

    const expiry = getTokenExpiry(accessToken);
    if (!expiry) return;

    intervalRef.current = setInterval(() => {
      const diff = Math.floor((expiry - Date.now()) / 1000);
      setSecondsLeft(diff);

      if (diff <= 0) {
        clearInterval(intervalRef.current);
        doRefresh(true); // silent auto-extend on expiry
      } else if (diff <= 120) {
        setVisible(true); // show warning at 2 min mark
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [accessToken, doRefresh]);

  if (!visible || secondsLeft === null || secondsLeft <= 0) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = secondsLeft <= 30;

  return (
    <div className={`fixed bottom-5 right-5 z-50 rounded-2xl shadow-2xl border-2 p-4 max-w-xs w-full transition-all ${
      isUrgent ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-amber-50 border-amber-300'
    }`}>
      <div className="flex items-start gap-3">
        <ClockIcon className={`w-5 h-5 shrink-0 mt-0.5 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
        <div className="flex-1">
          <p className={`text-sm font-bold ${isUrgent ? 'text-red-800' : 'text-amber-800'}`}>
            Session expiring soon
          </p>
          <p className={`text-xs mt-0.5 font-mono font-semibold ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
            {mins > 0 ? `${mins}m ` : ''}{String(secs).padStart(2, '0')}s remaining
          </p>
        </div>
        <button onClick={() => setVisible(false)} className="text-gray-400 hover:text-gray-600 shrink-0">
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      <button
        onClick={() => doRefresh(false)}
        disabled={extending}
        className={`mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors text-white ${
          isUrgent
            ? 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
            : 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
        }`}
      >
        <ArrowPathIcon className={`w-3.5 h-3.5 ${extending ? 'animate-spin' : ''}`} />
        {extending ? 'Extending…' : 'Extend Session'}
      </button>
    </div>
  );
}
