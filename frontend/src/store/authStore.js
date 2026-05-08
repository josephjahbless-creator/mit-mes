import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// BroadcastChannel syncs auth state (logout / new login) across browser tabs
const channel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('mit-mes-auth')
  : null;

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken });
        channel?.postMessage({ type: 'login', user });
      },

      setAccessToken: (accessToken) => set({ accessToken }),

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        channel?.postMessage({ type: 'logout' });
      },

      // Called internally when another tab broadcasts a logout
      _syncLogout: () => set({ user: null, accessToken: null, refreshToken: null }),
    }),
    { name: 'mit-mes-auth' }
  )
);

// Listen for cross-tab events and mirror them into this tab's store
if (channel) {
  channel.onmessage = (event) => {
    const store = useAuthStore.getState();
    if (event.data?.type === 'logout' && store.accessToken) {
      store._syncLogout();
      // Redirect to login if not already there
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    if (event.data?.type === 'login' && !store.accessToken) {
      // Another tab logged in — reload so the app picks up the persisted token
      window.location.reload();
    }
  };
}

export default useAuthStore;
