import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { profileSelected, profilesSet } from '../features/auth/authSlice.js';
import PosterWall from '../components/PosterWall.jsx';

const AVATAR_COLORS = ['#e50914', '#0071eb', '#00a86b', '#f5a623', '#8e44ad', '#e67e22'];

function colorFor(id) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

export default function WhoIsWatching() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reduxProfiles = useSelector((s) => s.auth.profiles);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const { data: profiles = reduxProfiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => (await api.get('/profiles')).data,
    initialData: reduxProfiles,
  });

  function choose(id) {
    dispatch(profileSelected(id));
    navigate('/');
    api.put('/profiles/active', { profileId: id }).catch(() => {});
  }

  async function handleAddProfile(e) {
    e.preventDefault();
    if (!name.trim()) return;
    const { data } = await api.post('/profiles', { name: name.trim() });
    const next = [...profiles, data];
    dispatch(profilesSet(next));
    queryClient.setQueryData(['profiles'], next);
    setName('');
    setAdding(false);
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <PosterWall />

      <h1 className="font-display text-5xl tracking-wide text-white sm:text-6xl">Who's watching?</h1>
      <p className="mt-3 text-center text-white/60">Pick a profile to load its watchlist and recommendations.</p>

      <div className="mt-12 flex flex-wrap items-start justify-center gap-8">
        {profiles.map((profile) => (
          <button key={profile._id} onClick={() => choose(profile._id)} className="group flex w-28 flex-col items-center gap-3 sm:w-32">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full text-4xl font-bold text-white ring-4 ring-transparent transition-all group-hover:ring-white sm:h-32 sm:w-32"
              style={{ backgroundColor: colorFor(profile._id) }}
            >
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-white/60 transition-colors group-hover:text-white">{profile.name}</span>
          </button>
        ))}

        {profiles.length < 5 && (
          <div className="flex w-28 flex-col items-center gap-3 sm:w-32">
            {adding ? (
              <form onSubmit={handleAddProfile} className="flex flex-col items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Name"
                  className="h-28 w-28 rounded-full bg-surface text-center text-sm text-white ring-1 ring-white/20 focus:ring-white sm:h-32 sm:w-32"
                />
                <button type="submit" className="text-xs font-medium text-accent">Save</button>
              </form>
            ) : (
              <button onClick={() => setAdding(true)} className="group flex flex-col items-center gap-3">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-accent text-5xl text-white transition-transform group-hover:scale-105 sm:h-32 sm:w-32">
                  +
                </div>
                <span className="text-sm text-white/60 group-hover:text-white">Add new profile</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
