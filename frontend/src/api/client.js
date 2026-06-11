import axios from 'axios';
import useAuthStore from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh: when several requests 401 at once (e.g. a dashboard
// firing many calls), they all await ONE refresh instead of each firing their
// own — which previously burst the auth rate-limiter and logged users out.
let refreshPromise = null;
function refreshAccessToken(refreshToken) {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/auth/refresh', { refreshToken })
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          const accessToken = await refreshAccessToken(refreshToken);
          original.headers.Authorization = `Bearer ${accessToken}`;
          return api(original);
        } catch {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
