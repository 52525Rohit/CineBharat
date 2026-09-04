import { Link } from 'react-router-dom';
import { useWatchlist, useToggleWatchlist } from '../api/engagement.js';

export default function Watchlist() {
  const { data, isLoading } = useWatchlist();
  const toggle = useToggleWatchlist();

  return (
    <div className="px-6 pb-16 pt-8 sm:px-10">
      <h1 className="mb-6 text-2xl font-bold">My List</h1>
      {isLoading && <p className="text-white/60">Loading...</p>}
      {data && data.length === 0 && <p className="text-white/60">Nothing here yet — add titles from any detail page.</p>}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 md:grid-cols-6">
        {data?.map((item) => (
          <div key={item._id}>
            <Link to={item.contentType === 'show' ? `/shows/${item.contentId}` : `/movies/${item.contentId}`}>
              <div className="aspect-[2/3] overflow-hidden rounded-md bg-surface">
                <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
              </div>
              <p className="mt-2 truncate text-sm">{item.title}</p>
            </Link>
            <button
              onClick={() => toggle.mutate({ contentId: item.contentId, remove: true })}
              className="mt-1 text-xs text-white/50 hover:text-red-400"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
