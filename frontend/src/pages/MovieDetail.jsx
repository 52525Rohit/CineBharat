import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useMovie, useMovies } from '../api/movies.js';
import { useToggleWatchlist, useWatchlist, useRateContent } from '../api/engagement.js';
import Rail from '../components/Rail.jsx';

const PLAN_RANK = { free: 0, basic: 1, standard: 2, premium: 3 };

export default function MovieDetail() {
  const { id } = useParams();
  const { data: movie, isLoading } = useMovie(id);
  const { data: watchlist } = useWatchlist();
  const toggleWatchlist = useToggleWatchlist();
  const rate = useRateContent();
  const user = useSelector((s) => s.auth.user);
  const [myRating, setMyRating] = useState(0);

  const primaryGenreId = movie?.genreIds?.[0]?._id;
  const { data: similar } = useMovies(primaryGenreId ? { genre: primaryGenreId } : {});

  if (isLoading) {
    return (
      <div className="animate-pulse px-6 pt-24 sm:px-10">
        <div className="h-8 w-64 rounded bg-surface" />
        <div className="mt-4 h-4 w-96 rounded bg-surface" />
      </div>
    );
  }
  if (!movie) return <p className="p-10 text-white/60">Not found.</p>;

  const inList = watchlist?.some((w) => w.contentId === movie._id);
  const locked = PLAN_RANK[user?.plan] < PLAN_RANK[movie.requiredPlan];

  return (
    <div className="pb-16">
      <div className="relative -mt-[var(--nav-h)] h-[46vh] w-full overflow-hidden sm:h-[58vh]">
        <img src={movie.thumbnailUrl || movie.posterUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 -mt-32 px-6 sm:px-10">
        <div className="grid gap-8 md:grid-cols-[240px_1fr]">
          <img src={movie.posterUrl} alt={movie.title} className="hidden w-full max-w-xs rounded-lg shadow-2xl md:block" />

          <div>
            <h1 className="font-display text-5xl leading-none tracking-wide text-white drop-shadow-lg sm:text-6xl">{movie.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              <span className="font-semibold text-green-400">{Math.round((movie.avgRating ?? 0) * 20)}% match</span>
              <span>{movie.releaseYear}</span>
              <span className="rounded border border-white/30 px-1.5 text-xs">{movie.maturityRating}</span>
              <span>{Math.round(movie.durationSec / 60)}m</span>
              <span className="flex items-center gap-0.5">
                {'★'.repeat(Math.round(movie.avgRating ?? 0))}
                <span className="text-white/30">{'★'.repeat(5 - Math.round(movie.avgRating ?? 0))}</span>
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {locked ? (
                <Link to="/subscriptions" className="flex items-center gap-2 rounded bg-white/15 px-6 py-2.5 font-bold text-white backdrop-blur hover:bg-white/25">
                  🔒 Upgrade to {movie.requiredPlan}
                </Link>
              ) : (
                <Link to={`/watch/movie/${movie._id}`} className="flex items-center gap-2 rounded bg-white px-6 py-2.5 font-bold text-black hover:bg-white/85">
                  ▶ Play
                </Link>
              )}
              <button
                onClick={() => toggleWatchlist.mutate({ contentId: movie._id, contentType: 'movie', remove: inList })}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/40 text-xl text-white hover:border-white"
                aria-label={inList ? 'Remove from My List' : 'Add to My List'}
              >
                {inList ? '✓' : '+'}
              </button>
            </div>

            <p className="mt-6 max-w-2xl text-white/85">{movie.description}</p>

            <div className="mt-5 space-y-1 text-sm text-white/60">
              {movie.cast?.length > 0 && (
                <p><span className="text-white/40">Cast: </span>{movie.cast.join(', ')}</p>
              )}
              {movie.director && <p><span className="text-white/40">Director: </span>{movie.director}</p>}
              {movie.genreIds?.length > 0 && (
                <p>
                  <span className="text-white/40">Genres: </span>
                  {movie.genreIds.map((g) => g.name).join(', ')}
                </p>
              )}
            </div>

            <div className="mt-6">
              <p className="mb-1 text-sm text-white/60">Rate this title</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setMyRating(n);
                      rate.mutate({ contentId: movie._id, contentType: 'movie', value: n });
                    }}
                    className={`text-2xl transition-transform hover:scale-110 ${n <= myRating ? 'text-accent' : 'text-white/20'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <Rail title="More Like This" items={similar?.filter((m) => m._id !== movie._id)} />
      </div>
    </div>
  );
}
