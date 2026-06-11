import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    prefersDark ? root.classList.add('dark') : root.classList.remove('dark');
  }
}

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light', // 'light' | 'dark' | 'system'
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      init: () => {
        applyTheme(get().theme);
        // Watch system preference changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (get().theme === 'system') applyTheme('system');
        });
      },
    }),
    { name: 'mit-mes-theme' }
  )
);

export default useThemeStore;
