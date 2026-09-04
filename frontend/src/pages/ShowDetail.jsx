import { useParams, Link } from 'react-router-dom';
import { useShow, useShowSeasons } from '../api/shows.js';
import { useToggleWatchlist, useWatchlist } from '../api/engagement.js';

export default function ShowDetail() {
  const { id } = useParams();
  const { data: show, isLoading } = useShow(id);
  const { data: seasons } = useShowSeasons(id);
  const { data: watchlist } = useWatchlist();
  const toggleWatchlist = useToggleWatchlist();

  if (isLoading) {
    return (
      <div className="animate-pulse px-6 pt-24 sm:px-10">
        <div className="h-8 w-64 rounded bg-surface" />
        <div className="mt-4 h-4 w-96 rounded bg-surface" />
      </div>
    );
  }
  if (!show) return <p className="p-10 text-white/60">Not found.</p>;

  const inList = watchlist?.some((w) => w.contentId === show._id);

  return (
    <div className="pb-16">
      <div className="relative -mt-[var(--nav-h)] h-[46vh] w-full overflow-hidden sm:h-[58vh]">
        <img src={show.thumbnailUrl || show.posterUrl} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 -mt-32 px-6 sm:px-10">
        <div className="grid gap-8 md:grid-cols-[240px_1fr]">
          <img src={show.posterUrl} alt={show.title} className="hidden w-full max-w-xs rounded-lg shadow-2xl md:block" />

          <div>
            <h1 className="font-display text-5xl leading-none tracking-wide text-white drop-shadow-lg sm:text-6xl">{show.title}</h1>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              <span className="font-semibold text-green-400">{Math.round((show.avgRating ?? 0) * 20)}% match</span>
              <span>{show.releaseYear}</span>
              <span className="rounded border border-white/30 px-1.5 text-xs">{show.maturityRating}</span>
              <span className="flex items-center gap-0.5">
                {'★'.repeat(Math.round(show.avgRating ?? 0))}
                <span className="text-white/30">{'★'.repeat(5 - Math.round(show.avgRating ?? 0))}</span>
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {seasons?.[0]?.episodes?.[0] && (
                <Link to={`/watch/episode/${seasons[0].episodes[0]._id}`} className="flex items-center gap-2 rounded bg-white px-6 py-2.5 font-bold text-black hover:bg-white/85">
                  ▶ Play S1:E1
                </Link>
              )}
              <button
                onClick={() => toggleWatchlist.mutate({ contentId: show._id, contentType: 'show', remove: inList })}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/40 text-xl text-white hover:border-white"
                aria-label={inList ? 'Remove from My List' : 'Add to My List'}
              >
                {inList ? '✓' : '+'}
              </button>
            </div>

            <p className="mt-6 max-w-2xl text-white/85">{show.description}</p>

            {show.genreIds?.length > 0 && (
              <p className="mt-5 text-sm text-white/60">
                <span className="text-white/40">Genres: </span>
                {show.genreIds.map((g) => g.name).join(', ')}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 px-6 sm:px-10">
        <div className="space-y-8">
          {seasons?.map((season) => (
            <div key={season._id}>
              <h2 className="mb-3 text-xl font-semibold text-white">{season.title || `Season ${season.seasonNumber}`}</h2>
              <div className="space-y-2">
                {season.episodes.map((ep) => (
                  <Link
                    key={ep._id}
                    to={`/watch/episode/${ep._id}`}
                    className="group flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-surface"
                  >
                    <span className="w-6 flex-shrink-0 text-center text-lg text-white/40">{ep.episodeNumber}</span>
                    <div className="relative h-16 w-28 flex-shrink-0 overflow-hidden rounded">
                      <img src={ep.thumbnailUrl} alt={ep.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-xl text-white opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">▶</div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white">{ep.title}</p>
                      <p className="truncate text-sm text-white/50">{ep.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
