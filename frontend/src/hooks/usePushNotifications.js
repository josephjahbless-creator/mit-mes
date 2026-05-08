import { useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import useAuthStore from '../store/authStore';

/**
 * Registers the service worker and subscribes the user to browser push notifications.
 * Automatically called when the user is logged in.
 * Silently does nothing if the browser does not support push or VAPID is not configured.
 */
export default function usePushNotifications() {
  const { accessToken, user } = useAuthStore();
  const subscribedRef = useRef(false);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!accessToken || !user) return;
    if (subscribedRef.current) return;

    try {
      // 1. Get VAPID public key from server
      const { data } = await api.get('/push/vapid-public-key');
      if (!data?.publicKey) return;

      // 2. Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // 3. Check existing subscription
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Already subscribed — just re-register with server in case it changed
        await api.post('/push/subscribe', sub.toJSON()).catch(() => {});
        subscribedRef.current = true;
        return;
      }

      // 4. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      // 5. Subscribe
      const urlBase64ToUint8 = (base64String) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = window.atob(base64);
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
      };

      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8(data.publicKey),
      });

      // 6. Save subscription on server
      await api.post('/push/subscribe', sub.toJSON());
      subscribedRef.current = true;
    } catch {
      // Silently ignore — push is an enhancement, not a requirement
    }
  }, [accessToken, user]);

  useEffect(() => {
    if (accessToken && user) {
      // Small delay so the app is fully loaded before asking for permission
      const t = setTimeout(subscribe, 3000);
      return () => clearTimeout(t);
    } else {
      subscribedRef.current = false;
    }
  }, [accessToken, user, subscribe]);
}
