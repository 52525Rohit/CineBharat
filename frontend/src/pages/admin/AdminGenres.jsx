import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useGenres } from '../../api/genres.js';
import { Card, CardHeader, btnPrimary, inputClass } from './ui.jsx';

export default function AdminGenres() {
  const queryClient = useQueryClient();
  const { data: genres } = useGenres();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function refresh() {
    queryClient.invalidateQueries();
  }

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await api.post('/admin/genres', { name: trimmed, slug: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
      setName('');
      refresh();
    } catch (err) {
      setError(err.response?.data?.error === 'already_exists' ? `"${trimmed}" already exists.` : 'Could not add that category - try again.');
    }
  }

  async function handleDelete(genre) {
    if (!confirm(`Delete "${genre.name}"? Titles already tagged with it will just lose the tag.`)) return;
    try {
      await api.delete(`/admin/genres/${genre._id}`);
      refresh();
    } catch {
      setError(`Could not delete "${genre.name}" - try again.`);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader
          title="Categories"
          subtitle="They power the genre filter and the auto-generated home page rows. Tag titles from the Movies and TV Shows tabs."
        />
        <div className="flex flex-wrap gap-2 p-5">
          {genres?.length ? (
            genres.map((genre) => (
              <span
                key={genre._id}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-ink px-3 py-1.5 text-sm text-white"
              >
                {genre.name}
                <button
                  onClick={() => handleDelete(genre)}
                  className="text-white/40 transition-colors hover:text-red-400"
                  aria-label={`Delete ${genre.name}`}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <p className="text-sm text-white/40">No categories yet.</p>
          )}
        </div>
      </Card>

      <Card className="h-fit">
        <CardHeader title="Add category" />
        <form onSubmit={handleAdd} className="space-y-3 p-5">
          {error && <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}
          <label className="block text-sm text-white/70">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hollywood, Bollywood, News"
              required
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <button type="submit" className={btnPrimary}>
            Add category
          </button>
        </form>
      </Card>
    </div>
  );
}
