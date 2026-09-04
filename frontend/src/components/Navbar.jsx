import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { api } from "../lib/api.js";
import { loggedOut } from "../features/auth/authSlice.js";
import BrandMark from "./BrandMark.jsx";

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const profiles = useSelector((s) => s.auth.profiles);
  const activeProfileId = useSelector((s) => s.auth.activeProfileId);
  const activeProfile = profiles.find((p) => p._id === activeProfileId);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    await api.post("/auth/logout").catch(() => {});
    dispatch(loggedOut());
    navigate("/login");
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <header
      className={`sticky top-0 z-20 flex h-[var(--nav-h)] items-center justify-between gap-4 px-6 transition-colors duration-300 sm:px-10 ${
        scrolled ? "bg-ink-2" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="flex items-center gap-6">
        <Link to="/" className="-ml-4 flex shrink-0 items-center sm:-ml-6">
          <BrandMark className="h-[84px] w-auto" />
        </Link>
        {user && (
          <nav className="hidden gap-5 text-sm text-white/80 sm:flex">
            <Link to="/" className="transition-colors hover:text-white">
              Home
            </Link>
            <Link to="/shows" className="transition-colors hover:text-white">
              TV Shows
            </Link>
            <Link to="/watchlist" className="transition-colors hover:text-white">
              My List
            </Link>
            {user.role === "admin" && (
              <Link
                to="/admin"
                className="font-semibold text-accent transition-colors hover:text-accent-hover"
              >
                Admin
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <form onSubmit={handleSearchSubmit}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Titles, people, genres"
              className="w-40 rounded border border-white/20 bg-black/60 px-3 py-1.5 text-sm text-white placeholder-white/40 outline-none focus:border-white sm:w-64"
            />
          </form>
        )}
        {user && activeProfile && user.role !== "admin" && (
          <Link
            to="/profile"
            title="Your profile"
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-bold text-white ring-2 ring-transparent transition hover:ring-white"
          >
            {activeProfile.avatarUrl ? (
              <img src={activeProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              activeProfile.name.charAt(0).toUpperCase()
            )}
          </Link>
        )}
        {user ? (
          <button
            onClick={handleLogout}
            className="text-sm text-white/70 transition-colors hover:text-white"
          >
            Sign out
          </button>
        ) : (
          <Link
            to="/login"
            className="rounded bg-accent px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
