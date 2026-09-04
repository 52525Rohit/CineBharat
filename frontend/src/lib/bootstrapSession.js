import axios from 'axios';
import { api } from './api.js';
import { store } from '../app/store.js';
import { loggedIn, profileSelected, profilesSet, bootstrapFinished } from '../features/auth/authSlice.js';

// Runs once on app load. The access token lives only in memory, so it's
// gone after every refresh - but the httpOnly refresh-token cookie isn't.
// Without this, ProtectedRoute sees accessToken === null on first render
// and bounces straight to /login even though the session is still valid.
export async function bootstrapSession() {
  try {
    const { data } = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
    store.dispatch(loggedIn({ accessToken: data.accessToken, user: data.user, profiles: [] }));

    // Restore the previously active profile too, so a refresh doesn't
    // send the viewer back through "Who's Watching" every time. This
    // comes from the account (User.lastActiveProfileId in Mongo), not
    // localStorage, so it also follows the account to a different
    // browser/device - and only applies if that profile still actually
    // exists and belongs to this account (it may have been deleted).
    const lastActiveProfileId = data.user.lastActiveProfileId;
    if (lastActiveProfileId) {
      try {
        const { data: profiles } = await api.get('/profiles');
        store.dispatch(profilesSet(profiles));
        if (profiles.some((p) => p._id === lastActiveProfileId)) {
          store.dispatch(profileSelected(lastActiveProfileId));
        }
      } catch {
        // Profile restore is a nice-to-have, not required for login -
        // if it fails, ProtectedRoute just sends them through the picker.
      }
    }
  } catch {
    // No valid refresh cookie - genuinely logged out, nothing to restore.
  } finally {
    store.dispatch(bootstrapFinished());
  }
}
