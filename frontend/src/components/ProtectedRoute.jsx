import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export function ProtectedRoute() {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const user = useSelector((s) => s.auth.user);
  const profileChosen = useSelector((s) => s.auth.profileChosen);
  if (!accessToken) return <Navigate to="/login" replace />;
  // Admins land on /admin after login (see Login.jsx) but can still browse
  // and preview the catalog; they just skip the profile picker.
  if (user?.role !== 'admin' && !profileChosen) return <Navigate to="/who-is-watching" replace />;
  return <Outlet />;
}

// Needs a logged-in user, but not a chosen profile yet - the picker
// screen itself uses this.
export function AuthedRoute() {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const user = useSelector((s) => s.auth.user);
  if (!accessToken) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const user = useSelector((s) => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  // No "Who's Watching" gate - admins don't pick a viewing profile.
  return <Outlet />;
}
