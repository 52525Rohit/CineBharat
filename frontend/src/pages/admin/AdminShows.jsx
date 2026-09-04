import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useGenres } from '../../api/genres.js';
import { describeUploadError } from '../../lib/uploadError.js';
import { extractYoutubeId } from '../../lib/youtube.js';
import { Card, CardHeader, thClass, tdClass, rowClass, Badge, planTone, btnPrimary, btnOutline, btnGhost, btnDanger, inputClass } from './ui.jsx';

const emptyShowForm = { title: '', description: '', releaseYear: '', requiredPlan: 'free', posterUrl: '', genreIds: [] };

export default function AdminShows() {
  const queryClient = useQueryClient();
  const { data: shows } = useQuery({ queryKey: ['admin', 'shows'], queryFn: async () => (await api.get('/shows?limit=100')).data });
  const { data: genres } = useGenres();
  const [form, setForm] = useState(emptyShowForm);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedShowId, setSelectedShowId] = useState(null);

  // Refresh everything - a show edit can surface on home rails, the detail
  // page, search and recommendations, not just the admin list.
  function refreshShows() {
    queryClient.invalidateQueries();
  }

  async function handleUploadPoster(file) {
    if (!file) return;
    setUploading(true);
    // No explicit Content-Type - see AdminMovies.jsx's handleUpload for why.
    const body = new FormData();
    body.append('file', file);
    try {
      const { data } = await api.post('/admin/upload', body);
      setForm((f) => ({ ...f, posterUrl: data.url }));
    } catch (err) {
      alert(describeUploadError(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (uploading) return;
    const payload = { ...form, releaseYear: Number(form.releaseYear) || undefined };
    if (editingId) {
      await api.put(`/admin/shows/${editingId}`, payload);
    } else {
      await api.post('/admin/shows', payload);
    }
    setForm(emptyShowForm);
    setEditingId(null);
    refreshShows();
  }

  function startEdit(show) {
    setEditingId(show._id);
    setSelectedShowId(show._id);
    setForm({
      title: show.title,
      description: show.description,
      releaseYear: show.releaseYear ?? '',
      requiredPlan: show.requiredPlan,
      posterUrl: show.posterUrl,
      genreIds: show.genreIds ?? [],
    });
  }

  function toggleGenre(genreId) {
    setForm((f) => ({
      ...f,
      genreIds: f.genreIds.includes(genreId) ? f.genreIds.filter((id) => id !== genreId) : [...f.genreIds, genreId],
    }));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this show? Its seasons and episodes will be deleted too.')) return;
    await api.delete(`/admin/shows/${id}`);
    if (selectedShowId === id) setSelectedShowId(null);
    refreshShows();
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title={`Shows (${shows?.length ?? 0})`} subtitle="Select a title to manage its seasons and episodes below." />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr>
                  <th className={thClass}>Title</th>
                  <th className={thClass}>Year</th>
                  <th className={thClass}>Plan</th>
                  <th className={`${thClass} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shows?.map((s) => (
                  <tr key={s._id} className={`${rowClass} ${selectedShowId === s._id ? 'bg-white/5' : ''}`}>
                    <td className={tdClass}>
                      <button onClick={() => setSelectedShowId(s._id)} className="text-left font-medium text-white hover:text-accent">
                        {s.title}
                      </button>
                    </td>
                    <td className={`${tdClass} tabular-nums`}>{s.releaseYear}</td>
                    <td className={tdClass}><Badge tone={planTone(s.requiredPlan)}>{s.requiredPlan}</Badge></td>
                    <td className={`${tdClass} space-x-1 text-right`}>
                      <button onClick={() => startEdit(s)} className={btnGhost}>Edit</button>
                      <button onClick={() => handleDelete(s._id)} className={btnDanger}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="h-fit space-y-3 rounded-xl border border-white/10 bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">{editingId ? 'Edit show' : 'Add show'}</h2>
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
          <Field label="Year" type="number" value={form.releaseYear} onChange={(v) => setForm({ ...form, releaseYear: v })} />
          <label className="block text-sm text-white/70">
            Required plan
            <select
              value={form.requiredPlan}
              onChange={(e) => setForm({ ...form, requiredPlan: e.target.value })}
              className={`mt-1 ${inputClass}`}
            >
              <option value="free">Free</option>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </select>
          </label>
          <div>
            <p className="mb-1 text-sm text-white/70">Categories</p>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto rounded border border-white/10 p-2">
              {genres?.map((genre) => (
                <button
                  type="button"
                  key={genre._id}
                  onClick={() => toggleGenre(genre._id)}
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    form.genreIds.includes(genre._id) ? 'bg-accent text-white' : 'bg-ink text-white/60 hover:text-white'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-sm text-white/70">
            Poster image {uploading && <span className="text-accent">uploading...</span>}
            <input type="file" onChange={(e) => handleUploadPoster(e.target.files[0])} className="mt-1 w-full text-xs text-white/60" />
            {form.posterUrl && <p className="mt-1 truncate text-xs text-white/40">{form.posterUrl}</p>}
          </label>
          <div className="flex items-center gap-2 pt-2">
            <button type="submit" className={btnPrimary} disabled={uploading}>
              {uploading ? 'Uploading…' : editingId ? 'Save changes' : 'Create show'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(emptyShowForm); }} className={btnOutline}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {selectedShowId && <SeasonManager showId={selectedShowId} showTitle={shows?.find((s) => s._id === selectedShowId)?.title} />}
    </div>
  );
}

function SeasonManager({ showId, showTitle }) {
  const queryClient = useQueryClient();
  const { data: seasons } = useQuery({
    queryKey: ['admin', 'seasons', showId],
    queryFn: async () => (await api.get(`/shows/${showId}/seasons`)).data,
  });
  const [newSeasonNumber, setNewSeasonNumber] = useState('');

  function refresh() {
    // Season/episode changes also feed the public show detail page
    // (['show', id, 'seasons']) - refresh the whole cache.
    queryClient.invalidateQueries();
  }

  async function addSeason(e) {
    e.preventDefault();
    await api.post('/admin/seasons', { showId, seasonNumber: Number(newSeasonNumber), title: `Season ${newSeasonNumber}` });
    setNewSeasonNumber('');
    refresh();
  }

  async function deleteSeason(id) {
    if (!confirm('Delete this season and its episodes list entry?')) return;
    await api.delete(`/admin/seasons/${id}`);
    refresh();
  }

  return (
    <div className="rounded-lg border border-white/10 p-5">
      <h2 className="mb-4 text-lg font-semibold">Seasons &amp; episodes — {showTitle}</h2>

      <form onSubmit={addSeason} className="mb-6 flex items-end gap-2">
        <label className="text-sm text-white/70">
          New season number
          <input
            type="number"
            min="1"
            required
            value={newSeasonNumber}
            onChange={(e) => setNewSeasonNumber(e.target.value)}
            className="mt-1 block w-28 rounded bg-ink px-3 py-2 text-white ring-1 ring-white/10"
          />
        </label>
        <button type="submit" className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
          Add season
        </button>
      </form>

      <div className="space-y-6">
        {seasons?.map((season) => (
          <EpisodeManager key={season._id} season={season} onDeleteSeason={() => deleteSeason(season._id)} onEpisodesChanged={refresh} showId={showId} />
        ))}
        {seasons?.length === 0 && <p className="text-sm text-white/50">No seasons yet.</p>}
      </div>
    </div>
  );
}

const emptyEpisodeForm = { title: '', description: '', durationSec: '', videoUrl: '', subtitleUrl: '', youtubeUrl: '' };

function EpisodeManager({ season, onDeleteSeason, onEpisodesChanged, showId }) {
  const [form, setForm] = useState(emptyEpisodeForm);
  const [editingEpisodeId, setEditingEpisodeId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [subtitleUploading, setSubtitleUploading] = useState(false);

  async function handleUploadVideo(file) {
    if (!file) return;
    setUploading(true);
    // No explicit Content-Type - see AdminMovies.jsx's handleUpload for why.
    const body = new FormData();
    body.append('file', file);
    try {
      const { data } = await api.post('/admin/upload', body);
      setForm((f) => ({ ...f, videoUrl: data.url }));
    } catch (err) {
      alert(describeUploadError(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadSubtitle(file) {
    if (!file) return;
    setSubtitleUploading(true);
    const body = new FormData();
    body.append('file', file);
    try {
      const { data } = await api.post('/admin/upload', body);
      setForm((f) => ({ ...f, subtitleUrl: data.url }));
    } catch (err) {
      alert(describeUploadError(err));
    } finally {
      setSubtitleUploading(false);
    }
  }

  function startEditEpisode(ep) {
    setEditingEpisodeId(ep._id);
    setForm({
      title: ep.title,
      description: ep.description ?? '',
      durationSec: ep.durationSec ?? '',
      videoUrl: ep.videoUrl ?? '',
      subtitleUrl: ep.subtitleUrl ?? '',
      youtubeUrl: ep.youtubeKey ?? '',
    });
  }

  function cancelEdit() {
    setEditingEpisodeId(null);
    setForm(emptyEpisodeForm);
  }

  async function submitEpisode(e) {
    e.preventDefault();
    if (uploading || subtitleUploading) return;
    const payload = {
      seasonId: season._id,
      showId,
      title: form.title,
      description: form.description,
      durationSec: Number(form.durationSec) || 0,
      videoUrl: form.videoUrl ?? '',
      subtitleUrl: form.subtitleUrl ?? '',
      youtubeKey: extractYoutubeId(form.youtubeUrl),
    };
    if (editingEpisodeId) {
      await api.put(`/admin/episodes/${editingEpisodeId}`, payload);
    } else {
      await api.post('/admin/episodes', { ...payload, episodeNumber: (season.episodes?.length ?? 0) + 1 });
    }
    setForm(emptyEpisodeForm);
    setEditingEpisodeId(null);
    onEpisodesChanged();
  }

  async function deleteEpisode(id) {
    if (!confirm('Delete this episode?')) return;
    if (editingEpisodeId === id) cancelEdit();
    await api.delete(`/admin/episodes/${id}`);
    onEpisodesChanged();
  }

  return (
    <div className="rounded border border-white/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">{season.title || `Season ${season.seasonNumber}`}</h3>
        <button onClick={onDeleteSeason} className="text-xs text-red-400">Delete season</button>
      </div>

      <ul className="mb-4 space-y-1 text-sm text-white/80">
        {season.episodes?.map((ep) => (
          <li key={ep._id} className="flex items-center justify-between gap-2">
            <span className="truncate">
              {ep.episodeNumber}. {ep.title}
              {!ep.videoUrl?.startsWith('/uploads/') && !ep.youtubeKey && <span className="ml-2 text-xs text-red-400">no video set</span>}
            </span>
            <span className="flex flex-shrink-0 gap-3">
              <button onClick={() => startEditEpisode(ep)} className="text-xs text-accent">Edit</button>
              <button onClick={() => deleteEpisode(ep._id)} className="text-xs text-red-400">Delete</button>
            </span>
          </li>
        ))}
        {season.episodes?.length === 0 && <li className="text-white/40">No episodes yet.</li>}
      </ul>

      <form onSubmit={submitEpisode} className="grid gap-2 rounded border border-white/10 p-3 sm:grid-cols-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50 sm:col-span-2">
          {editingEpisodeId ? 'Edit episode' : 'Add episode'}
        </p>
        <input
          placeholder="Episode title"
          required
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="rounded bg-ink px-3 py-2 text-sm text-white ring-1 ring-white/10"
        />
        <input
          placeholder="Duration (sec)"
          type="number"
          value={form.durationSec}
          onChange={(e) => setForm({ ...form, durationSec: e.target.value })}
          className="rounded bg-ink px-3 py-2 text-sm text-white ring-1 ring-white/10"
        />
        <input
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="rounded bg-ink px-3 py-2 text-sm text-white ring-1 ring-white/10 sm:col-span-2"
        />
        <label className="text-xs text-white/60 sm:col-span-2">
          Video file {uploading && <span className="text-accent">uploading...</span>}
          <input type="file" onChange={(e) => handleUploadVideo(e.target.files[0])} className="mt-1 block w-full text-xs" />
          {form.videoUrl && <p className="mt-1 truncate text-xs text-white/40">{form.videoUrl}</p>}
        </label>
        <label className="text-xs text-white/60 sm:col-span-2">
          — or a YouTube URL, if you'd rather not upload a file
          <input
            placeholder="https://youtube.com/watch?v=..."
            value={form.youtubeUrl}
            onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
            className="mt-1 w-full rounded bg-ink px-2 py-1.5 text-xs text-white ring-1 ring-white/10"
          />
        </label>
        <label className="text-xs text-white/60 sm:col-span-2">
          Subtitles (.srt or .vtt) {subtitleUploading && <span className="text-accent">uploading...</span>}
          <input type="file" onChange={(e) => handleUploadSubtitle(e.target.files[0])} className="mt-1 block w-full text-xs" />
          {form.subtitleUrl && <p className="mt-1 truncate text-xs text-white/40">{form.subtitleUrl}</p>}
        </label>
        <div className="flex items-center gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={uploading || subtitleUploading}
            className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {uploading || subtitleUploading ? 'Uploading…' : editingEpisodeId ? 'Save changes' : 'Add episode'}
          </button>
          {editingEpisodeId && (
            <button type="button" onClick={cancelEdit} className="rounded border border-white/20 px-3 py-1.5 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', textarea, required }) {
  const props = {
    value,
    onChange: (e) => onChange(e.target.value),
    required,
    className: `mt-1 ${inputClass}`,
  };
  return (
    <label className="block text-sm text-white/70">
      {label}
      {textarea ? <textarea rows={3} {...props} /> : <input type={type} {...props} />}
    </label>
  );
}
