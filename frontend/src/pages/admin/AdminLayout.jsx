import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { IconGrid, IconFilm, IconTv, IconTag, IconUsers } from './ui.jsx';

const nav = [
  { to: '/admin', label: 'Overview', end: true, icon: IconGrid },
  { to: '/admin/movies', label: 'Movies', icon: IconFilm },
  { to: '/admin/shows', label: 'TV Shows', icon: IconTv },
  { to: '/admin/genres', label: 'Categories', icon: IconTag },
  { to: '/admin/users', label: 'Users', icon: IconUsers },
];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const current = [...nav].reverse().find((t) => pathname === t.to || pathname.startsWith(t.to + '/'));

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <aside className="sticky top-24 hidden h-fit w-56 shrink-0 lg:block">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-white/30">Admin</p>
        <nav className="space-y-1 rounded-xl border border-white/10 bg-surface p-2">
          {nav.map(({ to, label, end, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-accent text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-surface p-1.5 lg:hidden">
          {nav.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-colors ${
                  isActive ? 'bg-accent text-white' : 'text-white/55'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <h1 className="mb-5 text-2xl font-bold text-white">{current?.label ?? 'Admin'}</h1>
        <Outlet />
      </main>
    </div>
  );
}
