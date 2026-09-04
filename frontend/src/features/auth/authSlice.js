import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  accessToken: null,
  user: null,
  profiles: [],
  // Which profile is active, and everything else here, lives only in
  // memory - nothing is persisted to localStorage. The one thing that
  // needs to survive a reload (which profile to restore) is kept on the
  // account server-side instead (User.lastActiveProfileId) and restored
  // by lib/bootstrapSession.js on page load.
  activeProfileId: null,
  // Gates the "Who's Watching" picker - true only after a profile is
  // explicitly chosen this session, reset on every fresh login/logout so
  // it reappears each time, matching Netflix's actual login flow.
  profileChosen: false,
  // False until the silent-refresh attempt on page load resolves either
  // way. Routing must wait for this - otherwise every reload flashes to
  // /login for a moment before the refresh cookie has had a chance to
  // prove the session is still valid (see lib/bootstrapSession.js).
  bootstrapped: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loggedIn(state, action) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.profiles = action.payload.profiles;
      state.profileChosen = false;
    },
    tokenRefreshed(state, action) {
      state.accessToken = action.payload;
    },
    profileSelected(state, action) {
      state.activeProfileId = action.payload;
      state.profileChosen = true;
    },
    profilesSet(state, action) {
      state.profiles = action.payload;
    },
    planUpdated(state, action) {
      if (state.user) state.user.plan = action.payload;
    },
    loggedOut(state) {
      state.accessToken = null;
      state.user = null;
      state.profiles = [];
      state.activeProfileId = null;
      state.profileChosen = false;
    },
    // The backend rejected activeProfileId as not belonging to the current
    // account - stays logged in, just sends the viewer back to the picker
    // instead of endlessly failing every profile-scoped request. Happens
    // whenever the cached profile predates a login switch or a database
    // reseed (see lib/api.js interceptor).
    profileInvalidated(state) {
      state.activeProfileId = null;
      state.profileChosen = false;
    },
    bootstrapFinished(state) {
      state.bootstrapped = true;
    },
  },
});

export const {
  loggedIn,
  tokenRefreshed,
  profileSelected,
  profilesSet,
  planUpdated,
  loggedOut,
  profileInvalidated,
  bootstrapFinished,
} = authSlice.actions;
export default authSlice.reducer;
