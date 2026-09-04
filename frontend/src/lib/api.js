import axios from 'axios';
import { store } from '../app/store.js';
import { tokenRefreshed, loggedOut, profileInvalidated } from '../features/auth/authSlice.js';

export const api = axios.create({ baseURL: '/api', withCredentials: true });

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Access tokens are short-lived (15 min). On a 401, try the refresh-token
// cookie once and replay the original request - see docs §08.
let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    // requireOwnProfile rejected the cached profileId - it belongs to a
    // different account or predates a database reseed. Self-heal by
    // sending the viewer back to the profile picker instead of every
    // profile-scoped request failing forever on a stale id.
    if (error.response?.status === 403 && error.response?.data?.error === 'forbidden') {
      // Background telemetry (progress pings) opts out - a stale profileId
      // there shouldn't yank the viewer out of playback.
      if (!error.config?.skipProfileInvalidation) store.dispatch(profileInvalidated());
      throw error;
    }

    const original = error.config;
    if (error.response?.status !== 401 || original._retried) {
      throw error;
    }
    original._retried = true;

    try {
      refreshPromise ??= axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
      const { data } = await refreshPromise;
      refreshPromise = null;
      store.dispatch(tokenRefreshed(data.accessToken));
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (refreshError) {
      refreshPromise = null;
      store.dispatch(loggedOut());
      throw refreshError;
    }
  },
);
