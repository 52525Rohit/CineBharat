import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api } from '../lib/api.js';
import { profilesSet } from '../features/auth/authSlice.js';
import PosterWall from '../components/PosterWall.jsx';

const AVATAR_COLORS = ['#e50914', '#0071eb', '#00a86b', '#f5a623', '#8e44ad', '#e67e22'];
function colorFor(id = '') {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
}

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Spain',
  'Italy', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Ireland', 'Portugal', 'Poland', 'Brazil',
  'Mexico', 'Argentina', 'Japan', 'South Korea', 'China', 'Singapore', 'United Arab Emirates',
  'Saudi Arabia', 'South Africa', 'Nigeria', 'Kenya', 'Egypt', 'New Zealand', 'Bangladesh',
  'Pakistan', 'Sri Lanka', 'Nepal', 'Indonesia', 'Malaysia', 'Thailand', 'Vietnam', 'Philippines',
];

const fieldClass =
  'mt-1.5 w-full rounded-lg bg-ink px-4 py-2.5 text-sm text-white placeholder-white/30 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-accent';
const labelClass = 'block text-sm text-white/60';

export default function Profile() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileInput = useRef(null);
  const profiles = useSelector((s) => s.auth.profiles);
  const activeProfileId = useSelector((s) => s.auth.activeProfileId);
  const email = useSelector((s) => s.auth.user?.email ?? '');

  const profile = profiles.find((p) => p._id === activeProfileId) ?? profiles[0];
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    phone: profile?.phone ?? '',
    location: profile?.location ?? '',
    bio: profile?.bio ?? '',
    avatarUrl: profile?.avatarUrl ?? '',
    isKids: !!profile?.isKids,
  });
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!profile) {
    return (
      <div className="relative isolate min-h-screen overflow-hidden px-6 py-16 text-center text-white/60">
        <PosterWall />
        No profile selected.
      </div>
    );
  }

  const set = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setStatus(''); };
  const dirty =
    form.name.trim() !== profile.name ||
    form.phone !== (profile.phone ?? '') ||
    form.location !== (profile.location ?? '') ||
    form.bio !== (profile.bio ?? '') ||
    form.avatarUrl !== (profile.avatarUrl ?? '') ||
    form.isKids !== !!profile.isKids;

  async function handlePhoto(file) {
    if (!file) return;
    setUploading(true);
    setStatus('');
    const body = new FormData();
    body.append('file', file);
    try {
      const { data } = await api.post('/upload', body);
      setForm((f) => ({ ...f, avatarUrl: data.url }));
    } catch (err) {
      setStatus(err.response?.data?.error === 'image_required_max_5mb' ? 'Use an image under 5 MB.' : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !dirty) return;
    setStatus('saving');
    try {
      const { data } = await api.patch(`/profiles/${profile._id}`, { ...form, name: form.name.trim() });
      dispatch(profilesSet(profiles.map((p) => (p._id === data._id ? data : p))));
      navigate('/');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 pb-20 pt-10">
      <PosterWall />

      <h1 className="text-center text-4xl font-extrabold text-white sm:text-5xl">Your profile</h1>
      <p className="mx-auto mt-3 max-w-lg text-center text-white/60">
        Customize your profile for personalized recommendations.
      </p>

      <form
        onSubmit={save}
        className="mx-auto mt-10 w-full max-w-4xl rounded-2xl border border-white/5 bg-[#1c2029]/95 p-6 backdrop-blur-sm sm:p-10"
      >
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-12">
          {/* avatar */}
          <div className="flex shrink-0 flex-col items-center sm:pt-2">
            <div className="relative">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="" className="h-32 w-32 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-32 w-32 items-center justify-center rounded-full text-5xl font-bold text-white"
                  style={{ backgroundColor: colorFor(profile._id) }}
                >
                  {(form.name.trim() || profile.name).charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                title="Change photo"
                className="absolute -bottom-1 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-surface-2 text-white ring-4 ring-[#1c2029] hover:bg-white/20 disabled:opacity-50"
              >
                {uploading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4l-1.5-2Z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhoto(e.target.files[0])}
              />
            </div>
            {form.avatarUrl && (
              <button
                type="button"
                onClick={() => set('avatarUrl')('')}
                className="mt-3 text-xs text-white/40 hover:text-white/70"
              >
                Remove photo
              </button>
            )}
          </div>

          {/* fields */}
          <div className="flex-1 space-y-5">
            <label className={labelClass}>
              Full name
              <input value={form.name} onChange={(e) => set('name')(e.target.value)} required maxLength={40} placeholder="Your full name" className={fieldClass} />
            </label>

            <label className={labelClass}>
              Email
              <input value={email} readOnly placeholder="Your email" className={`${fieldClass} cursor-not-allowed bg-ink/60 text-white/50`} />
            </label>

            <label className={labelClass}>
              Phone number
              <input value={form.phone} onChange={(e) => set('phone')(e.target.value)} type="tel" maxLength={20} placeholder="Your phone number" className={fieldClass} />
            </label>

            <label className={labelClass}>
              Location
              <select value={form.location} onChange={(e) => set('location')(e.target.value)} className={fieldClass}>
                <option value="">– Select your country –</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              About me
              <textarea
                value={form.bio}
                onChange={(e) => set('bio')(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="Tell something about yourself"
                className={`${fieldClass} resize-y`}
              />
            </label>

            <label className="flex items-center gap-3 text-sm text-white/60">
              <input type="checkbox" checked={form.isKids} onChange={(e) => set('isKids')(e.target.checked)} className="h-4 w-4 accent-accent" />
              Kids profile — limit this profile to family-friendly titles
            </label>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-4">
          {status === 'error' && <span className="text-sm text-red-400">Could not save — try again</span>}
          {status && !['saving', 'error'].includes(status) && (
            <span className="text-sm text-white/40">{status}</span>
          )}
          <button type="button" onClick={() => navigate(-1)} className="text-sm text-white/60 hover:text-white">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!dirty || status === 'saving' || uploading}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-40"
          >
            {status === 'saving' ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
