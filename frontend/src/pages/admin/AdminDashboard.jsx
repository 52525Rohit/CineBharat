import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card, CardHeader, thClass, tdClass, rowClass, Badge, planTone, IconFilm, IconTv, IconUsers } from './ui.jsx';

export default function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ['admin', 'analytics'],
    queryFn: async () => (await api.get('/admin/analytics')).data,
  });

  if (!data) return <p className="text-white/50">Loading…</p>;

  const totalPlans = data.planCounts.reduce((sum, p) => sum + p.count, 0) || 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Movies" value={data.movieCount} icon={IconFilm} />
        <Stat label="TV Shows" value={data.showCount} icon={IconTv} />
        <Stat label="Users" value={data.userCount} icon={IconUsers} />
      </div>

      <Card>
        <CardHeader title="Plan distribution" />
        <div className="space-y-4 p-5">
          {data.planCounts.map((p) => (
            <div key={p._id}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <Badge tone={planTone(p._id)}>{p._id}</Badge>
                <span className="tabular-nums text-white/50">
                  {p.count} · {Math.round((p.count / totalPlans) * 100)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(p.count / totalPlans) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Top titles by popularity" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr>
                <th className={thClass}>Title</th>
                <th className={thClass}>Popularity</th>
                <th className={thClass}>Avg rating</th>
              </tr>
            </thead>
            <tbody>
              {data.topMovies.map((m) => (
                <tr key={m._id} className={rowClass}>
                  <td className={`${tdClass} font-medium text-white`}>{m.title}</td>
                  <td className={`${tdClass} tabular-nums`}>{m.popularityScore}</td>
                  <td className={tdClass}>
                    {m.avgRating ? <Badge tone="amber">★ {m.avgRating.toFixed(1)}</Badge> : <span className="text-white/30">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon }) {
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</p>
        <p className="mt-0.5 text-3xl font-bold tabular-nums text-white">{value ?? 0}</p>
      </div>
    </Card>
  );
}
