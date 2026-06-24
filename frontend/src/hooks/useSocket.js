import { useEffect, useRef } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import useAuthStore from '../store/authStore';

// ── Laravel Reverb (Pusher protocol) replaces socket.io ───────────────────────
// Same public API as before (useSocketAuth / useSocketEvent / getSocket) so no
// consuming component changes. We subscribe to PUBLIC channels mirroring the old
// socket.io rooms — global, user.<id>, role.<role>, institution.<id> — and listen
// for the exact backend event names (leading dot = no namespace prefix).
window.Pusher = Pusher;

const REVERB_KEY = import.meta.env.VITE_REVERB_APP_KEY || 'wrdsdcfblwquafvmosci';
const REVERB_PORT = Number(import.meta.env.VITE_REVERB_PORT || 8081);
// Same hostname the app is served from → works on localhost and over the LAN.
const REVERB_HOST = import.meta.env.VITE_REVERB_HOST || window.location.hostname;

let echo = null;
const channels = new Map();   // channelName -> Echo channel
const listeners = new Set();  // { event, cb }

function getEcho() {
  if (!echo) {
    echo = new Echo({
      broadcaster: 'reverb',
      key: REVERB_KEY,
      wsHost: REVERB_HOST,
      wsPort: REVERB_PORT,
      wssPort: REVERB_PORT,
      forceTLS: false,
      enabledTransports: ['ws', 'wss'],
    });
  }
  return echo;
}

/** Ensure a public channel exists and has every registered listener attached. */
function ensureChannel(name) {
  if (channels.has(name)) return channels.get(name);
  const ch = getEcho().channel(name);
  channels.set(name, ch);
  for (const { event, cb } of listeners) ch.listen('.' + event, cb);
  return ch;
}

/**
 * Subscribe to the user's channels once authenticated. Mirrors the old
 * join/joinInstitution/joinRole emits.
 */
export function useSocketAuth() {
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    ensureChannel('global');
    if (!user?.id) return;
    ensureChannel(`user.${user.id}`);
    if (user.institutionId) ensureChannel(`institution.${user.institutionId}`);
    if (user.role) ensureChannel(`role.${user.role}`);
  }, [user?.id, user?.institutionId, user?.role]);
}

/**
 * Subscribe to a backend event across all joined channels.
 * Automatically unsubscribes on unmount.
 */
export function useSocketEvent(event, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const cb = (payload) => handlerRef.current(payload);
    const entry = { event, cb };
    listeners.add(entry);
    // Attach to channels that already exist; ensureChannel() attaches to future ones.
    ensureChannel('global');
    for (const ch of channels.values()) ch.listen('.' + event, cb);
    return () => {
      listeners.delete(entry);
      for (const ch of channels.values()) ch.stopListening('.' + event, cb);
    };
  }, [event]);
}

export function getSocket() {
  return getEcho();
}
