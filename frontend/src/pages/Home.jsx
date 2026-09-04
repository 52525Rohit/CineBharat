import { Link } from 'react-router-dom';
import { useTrendingMovies, usePopularMovies, useMovies } from '../api/movies.js';
import { useShows } from '../api/shows.js';
import { useGenres } from '../api/genres.js';
import { useContinueWatching, useRecommendations } from '../api/engagement.js';
import Rail from '../components/Rail.jsx';

export default function Home() {
  const trending = useTrendingMovies();
  const popular = usePopularMovies();
  const recent = useMovies();
  const shows = useShows();
  const genres = useGenres();
  const continueWatching = useContinueWatching();
  const recommendations = useRecommendations();

  const hero = trending.data?.[0];
  const genreById = Object.fromEntries((genres.data ?? []).map((g) => [g._id, g.name]));
  const heroGenreName = hero?.genreIds?.[0] ? genreById[hero.genreIds[0]] : null;
  const genreRows = buildGenreRows(recent.data, genreById);

  return (
    <div className="pb-16">
      {hero && (
        <div className="relative -mt-[var(--nav-h)] mb-6 h-[62vh] w-full overflow-hidden sm:h-[80vh]">
          <img src={hero.thumbnailUrl} alt={hero.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-transparent" />
          <div className="absolute bottom-16 left-6 max-w-xl sm:left-10">
            <p className="mb-2 text-sm font-semibold tracking-wide text-accent">
              {heroGenreName ? `#1 in ${heroGenreName} Today` : 'Trending Today'}
            </p>
            <h1 className="font-display text-6xl leading-none tracking-wide text-white drop-shadow-lg sm:text-7xl">{hero.title}</h1>
            <p className="mt-4 line-clamp-3 max-w-md text-white/85 drop-shadow">{hero.description}</p>
            <div className="mt-6 flex gap-3">
              <Link
                to={`/watch/movie/${hero._id}`}
                className="flex items-center gap-2 rounded bg-white px-6 py-2.5 font-bold text-black transition-colors hover:bg-white/85"
              >
                <span>▶</span> Play
              </Link>
              <Link
                to={`/movies/${hero._id}`}
                className="flex items-center gap-2 rounded bg-white/25 px-6 py-2.5 font-bold text-white backdrop-blur transition-colors hover:bg-white/35"
              >
                ⓘ More Info
              </Link>
            </div>
          </div>
        </div>
      )}

      <Rail title="Continue Watching" items={mapContinueWatching(continueWatching.data)} />
      <Rail title="Recommended For You" items={recommendations.data} />
      <Rail title="Trending Now" items={trending.data} />
      <Rail title="Popular on Streamline" items={popular.data} />
      <Rail title="TV Shows" items={shows.data} type="show" />
      {genreRows.map((row) => (
        <Rail key={row.id} title={row.name} items={row.items} />
      ))}
      <Rail title="Recently Added" items={recent.data} />
    </div>
  );
}

function mapContinueWatching(items) {
  if (!items) return undefined;
  // Episode progress needs a show/season deep link the player doesn't
  // support yet, so the rail only surfaces movie resume points for now.
  return items
    .filter((i) => i.contentType === 'movie')
    .map((i) => ({
      _id: i.contentId,
      title: i.title,
      posterUrl: i.posterUrl || i.thumbnailUrl,
      progress: i.durationSec > 0 ? Math.min(i.positionSec / i.durationSec, 1) : 0,
    }));
}

// Groups the already-fetched catalog page by genre client-side instead of
// firing one request per genre - cheap at this catalog size, and the rows
// naturally disappear once a genre doesn't have enough titles to fill one.
function buildGenreRows(movies, genreById) {
  if (!movies || Object.keys(genreById).length === 0) return [];
  const byGenre = {};
  for (const movie of movies) {
    for (const genreId of movie.genreIds ?? []) {
      (byGenre[genreId] ??= []).push(movie);
    }
  }
  return Object.entries(byGenre)
    .filter(([, list]) => list.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)
    .map(([genreId, list]) => ({ id: genreId, name: genreById[genreId] ?? 'More Titles', items: list }));
}
