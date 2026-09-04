import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { loggedIn } from "../features/auth/authSlice.js";
import PosterWall from "../components/PosterWall.jsx";
import BrandMark from "../components/BrandMark.jsx";

function LightField({ label, children }) {
  return (
    <div className="rounded-md bg-[#e9e9ec] px-4 py-2 ring-2 ring-transparent focus-within:ring-accent">
      <span className="block text-xs font-semibold text-gray-500">{label}</span>
      {children}
    </div>
  );
}

const lightInput =
  "w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      dispatch(loggedIn(data));
      navigate(data.user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(
        err.response?.data?.error === "invalid_credentials"
          ? "Incorrect email or password."
          : "Sign in failed.",
      );
    }
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
      <PosterWall />

      <Link to="/login" className="absolute left-2 -top-2">
        <BrandMark className="h-[170px] w-auto" />
      </Link>

      <h1 className="max-w-2xl text-center text-4xl font-extrabold text-white sm:text-5xl">
        Unlock a world of endless entertainment
      </h1>
      <p className="mt-3 text-center font-medium text-white/70">
        Login to discover, stream, and enjoy.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 w-full max-w-md rounded-2xl border border-white/5 bg-[#23262e]/95 p-8 backdrop-blur-sm"
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-white">
          Sign in
        </h2>
        {error && (
          <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <LightField label="Email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="example.email@gmail.com"
              autoComplete="email"
              required
              className={lightInput}
            />
          </LightField>

          <LightField label="Password">
            <div className="flex items-center">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="Enter at least 8+ characters"
                autoComplete="current-password"
                required
                className={lightInput}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="ml-2 shrink-0 text-gray-500 hover:text-gray-800"
              >
                {showPassword ? EyeOff : Eye}
              </button>
            </div>
          </LightField>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-white/70">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 accent-accent"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() =>
              setNotice("Password reset isn't wired up in this demo.")
            }
            className="font-medium text-white/70 hover:text-white"
          >
            Forgot password?
          </button>
        </div>
        {notice && (
          <p className="mt-2 text-right text-xs text-white/40">{notice}</p>
        )}

        <button
          type="submit"
          className="mt-5 w-full rounded-md bg-accent py-2.5 font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Sign in
        </button>

        <p className="mt-5 text-center text-sm text-white/50">
          New to CineBharat?{" "}
          <Link to="/register" className="font-medium text-accent">
            Signup now
          </Link>
        </p>
      </form>
    </div>
  );
}

const Eye = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOff = (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.6 5.1A9.9 9.9 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-2.2 3M6.6 6.6A13.3 13.3 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M3 3l18 18" />
  </svg>
);
