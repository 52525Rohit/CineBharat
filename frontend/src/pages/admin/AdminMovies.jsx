import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import { useGenres } from '../../api/genres.js';
import { describeUploadError } from '../../lib/uploadError.js';
import { extractYoutubeId } from '../../lib/youtube.js';
import { Card, CardHeader, thClass, tdClass, rowClass, Badge, planTone, btnPrimary, btnOutline, btnGhost, btnDanger, inputClass } from './ui.jsx';

const emptyForm = {
  title: '', description: '', director: '', cast: '', releaseYear: '', durationSec: '', requiredPlan: 'free',
  posterUrl: '', videoUrl: '', subtitleUrl: '', subtitleLang: 'English', youtubeUrl: '', genreIds: [],
  audioTracks: [], // [{ lang, videoUrl }] - alternate-language dubs
};

export default function AdminMovies() {
  const queryClient = useQueryClient();
  const { data: movies } = useQuery({ queryKey: ['admin', 'movies'], queryFn: async () => (await api.get('/movies?limit=100')).data });
  const { data: genres } = useGenres();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [uploading, setUploading] = useState('');

  // A movie edit can surface anywhere - home rails, detail page, search,
  // recommendations - so refresh the whole cache rather than trying to
  // name every affected query key.
  function refresh() {
    queryClient.invalidateQueries();
  }

  async function handleUpload(field, file) {
    if (!file) return;
    setUploading(field);
    // No explicit Content-Type here - axios/the browser must set it
    // itself so it can append the multipart boundary. Forcing
    // "multipart/form-data" manually strips that boundary and the
    // server's parser can't split the body, which 500s.
    const body = new FormData();
    body.append('file', file);
    try {
      const { data } = await api.post('/admin/upload', body);
      setForm((f) => ({ ...f, [field]: data.url }));
    } catch (err) {
      alert(describeUploadError(err));
    } finally {
      setUploading('');
    }
  }

  const setAudioTrack = (i, patch) =>
    setForm((f) => ({ ...f, audioTracks: f.audioTracks.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) }));
  const addAudioTrack = () => setForm((f) => ({ ...f, audioTracks: [...f.audioTracks, { lang: '', videoUrl: '' }] }));
  const removeAudioTrack = (i) => setForm((f) => ({ ...f, audioTracks: f.audioTracks.filter((_, idx) => idx !== i) }));

  async function handleAudioUpload(i, file) {
    if (!file) return;
    setUploading(`audio-${i}`);
    const body = new FormData();
    body.append('file', file);
    try {
      const { data } = await api.post('/admin/upload', body);
      setAudioTrack(i, { videoUrl: data.url });
    } catch (err) {
      alert(describeUploadError(err));
    } finally {
      setUploading('');
    }
  }

  function toggleGenre(genreId) {
    setForm((f) => ({
      ...f,
      genreIds: f.genreIds.includes(genreId) ? f.genreIds.filter((id) => id !== genreId) : [...f.genreIds, genreId],
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (uploading) return; // don't save a stale URL while a file is still uploading
    const { youtubeUrl, ...rest } = form;
    const payload = {
      ...rest,
      cast: form.cast.split(',').map((s) => s.trim()).filter(Boolean),
      audioTracks: form.audioTracks
        .filter((t) => t.lang.trim() && t.videoUrl)
        .map((t) => ({ lang: t.lang.trim(), videoUrl: t.videoUrl })),
      releaseYear: Number(form.releaseYear) || undefined,
      durationSec: Number(form.durationSec) || 0,
      trailerYoutubeKey: extractYoutubeId(youtubeUrl),
    };
    if (editingId) {
      await api.put(`/admin/movies/${editingId}`, payload);
    } else {
      await api.post('/admin/movies', payload);
    }
    setForm(emptyForm);
    setEditingId(null);
    refresh();
  }

  function startEdit(movie) {
    setEditingId(movie._id);
    setForm({
      title: movie.title,
      description: movie.description,
      director: movie.director ?? '',
      cast: (movie.cast ?? []).join(', '),
      releaseYear: movie.releaseYear ?? '',
      durationSec: movie.durationSec ?? '',
      requiredPlan: movie.requiredPlan,
      posterUrl: movie.posterUrl,
      videoUrl: movie.videoUrl,
      subtitleUrl: movie.subtitleUrl ?? '',
      subtitleLang: movie.subtitleLang || 'English',
      youtubeUrl: movie.trailerYoutubeKey ?? '',
      genreIds: movie.genreIds ?? [],
      audioTracks: (movie.audioTracks ?? []).map((t) => ({ lang: t.lang, videoUrl: t.videoUrl })),
    });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this movie?')) return;
    await api.delete(`/admin/movies/${id}`);
    refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader title={`Movies (${movies?.length ?? 0})`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr>
                <th className={thClass}>Title</th>
                <th className={thClass}>Year</th>
                <th className={thClass}>Plan</th>
                <th className={thClass}>Status</th>
                <th className={`${thClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {movies?.map((m) => (
                <tr key={m._id} className={rowClass}>
                  <td className={`${tdClass} font-medium text-white`}>{m.title}</td>
                  <td className={`${tdClass} tabular-nums`}>{m.releaseYear}</td>
                  <td className={tdClass}><Badge tone={planTone(m.requiredPlan)}>{m.requiredPlan}</Badge></td>
                  <td className={tdClass}><Badge tone={m.status === 'ready' ? 'green' : 'amber'}>{m.status}</Badge></td>
                  <td className={`${tdClass} space-x-1 text-right`}>
                    <button onClick={() => startEdit(m)} className={btnGhost}>Edit</button>
                    <button onClick={() => handleDelete(m._id)} className={btnDanger}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="h-fit space-y-3 rounded-xl border border-white/10 bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/80">{editingId ? 'Edit movie' : 'Add movie'}</h2>
        <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
        <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
        <Field label="Director" value={form.director} onChange={(v) => setForm({ ...form, director: v })} />
        <Field label="Cast (comma-separated)" value={form.cast} onChange={(v) => setForm({ ...form, cast: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Year" type="number" value={form.releaseYear} onChange={(v) => setForm({ ...form, releaseYear: v })} />
          <Field label="Duration (sec)" type="number" value={form.durationSec} onChange={(v) => setForm({ ...form, durationSec: v })} />
        </div>
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

        <FileField label="Poster image" uploading={uploading === 'posterUrl'} value={form.posterUrl} onFile={(f) => handleUpload('posterUrl', f)} onClear={() => setForm({ ...form, posterUrl: '' })} />
        <FileField label="Video file" uploading={uploading === 'videoUrl'} value={form.videoUrl} onFile={(f) => handleUpload('videoUrl', f)} onClear={() => setForm({ ...form, videoUrl: '' })} />
        <Field
          label="— or a YouTube URL, if you'd rather not upload a file"
          value={form.youtubeUrl}
          onChange={(v) => setForm({ ...form, youtubeUrl: v })}
        />
        <FileField
          label="Subtitles (.srt or .vtt)"
          uploading={uploading === 'subtitleUrl'}
          value={form.subtitleUrl}
          onFile={(f) => handleUpload('subtitleUrl', f)}
          onClear={() => setForm({ ...form, subtitleUrl: '' })}
        />
        {form.subtitleUrl && (
          <Field label="Subtitle language label" value={form.subtitleLang} onChange={(v) => setForm({ ...form, subtitleLang: v })} />
        )}

        <div>
          <p className="mb-1 text-sm text-white/70">Audio languages (dubs)</p>
          <p className="mb-2 text-xs text-white/40">Each is a full alternate-language video file. The main video above is “Original”.</p>
          <div className="space-y-2">
            {form.audioTracks.map((track, i) => (
              <div key={i} className="rounded border border-white/10 p-2">
                <div className="flex items-center gap-2">
                  <input
                    value={track.lang}
                    onChange={(e) => setAudioTrack(i, { lang: e.target.value })}
                    placeholder="Language e.g. Hindi"
                    className={`${inputClass} flex-1`}
                  />
                  <button type="button" onClick={() => removeAudioTrack(i)} className="shrink-0 text-xs text-white/40 hover:text-red-400">
                    remove
                  </button>
                </div>
                <label className="mt-1 block text-xs text-white/50">
                  Video file {uploading === `audio-${i}` && <span className="text-accent">uploading…</span>}
                  <input type="file" onChange={(e) => handleAudioUpload(i, e.target.files[0])} className="mt-1 w-full text-xs text-white/60" />
                </label>
                {track.videoUrl && (
                  <p className="mt-1 truncate text-xs text-emerald-400">✓ uploaded — {track.videoUrl}</p>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addAudioTrack} className="mt-2 text-xs text-accent hover:underline">
            + Add audio language
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" className={btnPrimary} disabled={!!uploading}>
            {uploading ? 'Uploading…' : editingId ? 'Save changes' : 'Create movie'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} className={btnOutline}>
              Cancel
            </button>
          )}
          {uploading && <span className="text-xs text-white/40">wait for the upload to finish before saving</span>}
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

function FileField({ label, value, onFile, onClear, uploading }) {
  return (
    <div className="text-sm text-white/70">
      <label className="block">
        {label} {uploading && <span className="text-accent">uploading…</span>}
        <input type="file" onChange={(e) => onFile(e.target.files[0])} className="mt-1 w-full text-xs text-white/60" />
      </label>
      {value && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span className={`truncate ${value.startsWith('/uploads/') ? 'text-emerald-400' : 'text-white/40'}`}>
            {value.startsWith('/uploads/') ? '✓ uploaded — ' : ''}{value}
          </span>
          {onClear && (
            <button type="button" onClick={onClear} className="shrink-0 text-white/40 hover:text-red-400">
              clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
