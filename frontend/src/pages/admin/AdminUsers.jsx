import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { Card, CardHeader, thClass, tdClass, rowClass, Badge, planTone, btnGhost } from './ui.jsx';

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { data: users } = useQuery({ queryKey: ['admin', 'users'], queryFn: async () => (await api.get('/admin/users')).data });

  async function toggleStatus(user) {
    await api.patch(`/admin/users/${user._id}`, { status: user.status === 'active' ? 'suspended' : 'active' });
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  }

  async function toggleRole(user) {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`${nextRole === 'admin' ? 'Grant' : 'Revoke'} admin access for ${user.email}?`)) return;
    await api.patch(`/admin/users/${user._id}`, { role: nextRole });
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  }

  return (
    <Card>
      <CardHeader title="Users" subtitle={users ? `${users.length} account${users.length === 1 ? '' : 's'}` : undefined} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead>
            <tr>
              <th className={thClass}>Email</th>
              <th className={thClass}>Role</th>
              <th className={thClass}>Plan</th>
              <th className={thClass}>Status</th>
              <th className={`${thClass} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u._id} className={rowClass}>
                <td className={`${tdClass} font-medium text-white`}>{u.email}</td>
                <td className={tdClass}>
                  <Badge tone={u.role === 'admin' ? 'accent' : 'neutral'}>{u.role}</Badge>
                </td>
                <td className={tdClass}>
                  <Badge tone={planTone(u.plan)}>{u.plan}</Badge>
                </td>
                <td className={tdClass}>
                  <Badge tone={u.status === 'active' ? 'green' : 'red'}>{u.status}</Badge>
                </td>
                <td className={`${tdClass} space-x-2 text-right`}>
                  <button onClick={() => toggleRole(u)} className={btnGhost}>
                    {u.role === 'admin' ? 'Revoke admin' : 'Make admin'}
                  </button>
                  <button onClick={() => toggleStatus(u)} className={btnGhost}>
                    {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
