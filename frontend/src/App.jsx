import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import { ProtectedRoute, AdminRoute, AuthedRoute } from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import WhoIsWatching from './pages/WhoIsWatching.jsx';
import Profile from './pages/Profile.jsx';
import Home from './pages/Home.jsx';
import Shows from './pages/Shows.jsx';
import MovieDetail from './pages/MovieDetail.jsx';
import ShowDetail from './pages/ShowDetail.jsx';
import Search from './pages/Search.jsx';
import Watchlist from './pages/Watchlist.jsx';
import Player from './pages/Player.jsx';
import Subscriptions from './pages/Subscriptions.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminMovies from './pages/admin/AdminMovies.jsx';
import AdminShows from './pages/admin/AdminShows.jsx';
import AdminGenres from './pages/admin/AdminGenres.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';

export default function App() {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const profileChosen = useSelector((s) => s.auth.profileChosen);
  const bootstrapped = useSelector((s) => s.auth.bootstrapped);
  const isAdmin = useSelector((s) => s.auth.user?.role === 'admin');

  // Wait for the silent-refresh attempt (bootstrapSession.js) to resolve
  // before making any routing decision - otherwise a page reload always
  // redirects to /login for an instant, even when the refresh-token cookie
  // would have kept the session alive.
  if (!bootstrapped) {
    return <div className="min-h-screen bg-ink" />;
  }

  return (
    <div className="min-h-screen bg-ink">
      {accessToken && (profileChosen || isAdmin) && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<AuthedRoute />}>
          <Route path="/who-is-watching" element={<WhoIsWatching />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/shows" element={<Shows />} />
          <Route path="/movies/:id" element={<MovieDetail />} />
          <Route path="/shows/:id" element={<ShowDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/watch/:type/:id" element={<Player />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="movies" element={<AdminMovies />} />
            <Route path="shows" element={<AdminShows />} />
            <Route path="genres" element={<AdminGenres />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
        </Route>
      </Routes>
      {accessToken && (profileChosen || isAdmin) && <Footer />}
    </div>
  );
}
