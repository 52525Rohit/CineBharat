import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { loggedIn } from '../features/auth/authSlice.js';
import PosterWall from '../components/PosterWall.jsx';
import BrandMark from '../components/BrandMark.jsx';

function LightField({ label, children }) {
  return (
    <div className="rounded-md bg-[#e9e9ec] px-4 py-2 ring-2 ring-transparent focus-within:ring-accent">
      <span className="block text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </div>
  );
}

const lightInput = 'w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', form);
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password });
      dispatch(loggedIn(data));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error === 'email_already_registered' ? 'That email is already registered.' : (err.response?.data?.error ?? 'Registration failed.'));
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <PosterWall />

      <Link to="/login" className="absolute left-6 top-6">
        <BrandMark className="h-32 w-auto" />
      </Link>

      <h1 className="max-w-2xl text-center text-4xl font-extrabold text-white sm:text-5xl">
        Igniting your passion for movies
      </h1>
      <p className="mt-3 text-center font-medium text-white/70">Create an account and start streaming.</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 w-full max-w-md rounded-2xl border border-white/5 bg-[#23262e]/95 p-8 backdrop-blur-sm"
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-white">Create your account</h2>
        {error && <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

        <div className="space-y-4">
          <LightField label="Name">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={lightInput} />
          </LightField>
          <LightField label="Email">
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              placeholder="example.email@gmail.com"
              required
              className={lightInput}
            />
          </LightField>
          <LightField label="Password">
            <input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              type="password"
              minLength={8}
              required
              placeholder="Enter at least 8+ characters"
              className={lightInput}
            />
          </LightField>
        </div>

        <button
          type="submit"
          className="mt-5 w-full rounded-md bg-accent py-2.5 font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Create account
        </button>

        <p className="mt-5 text-center text-sm text-white/50">
          Already have an account? <Link to="/login" className="font-medium text-accent">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
