import { Link, useNavigate } from 'react-router-dom';

export default function MovieCard({ item, type = 'movie' }) {
  const navigate = useNavigate();
  const detailPath = type === 'show' ? `/shows/${item._id}` : `/movies/${item._id}`;

  function play(e) {
    // Without stopPropagation, this click bubbles to the parent <Link>,
    // whose own navigation to detailPath races the navigate() call below
    // and usually wins - the button would appear to do nothing.
    e.preventDefault();
    e.stopPropagation();
    navigate(type === 'show' ? detailPath : `/watch/movie/${item._id}`);
  }

  return (
    <Link to={detailPath} className="group relative flex-shrink-0 w-40 sm:w-48">
      <div className="aspect-[2/3] overflow-hidden rounded bg-surface shadow-lg transition-all duration-300 ease-out group-hover:z-10 group-hover:scale-110 group-hover:shadow-2xl group-hover:shadow-black/80">
        <img src={item.posterUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover" />

        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="p-2.5">
            <p className="mb-2 truncate text-xs font-semibold text-white">{item.title}</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={play}
                aria-label="Play"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-110"
              >
                ▶
              </button>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/50 text-sm text-white">ⓘ</span>
            </div>
          </div>
        </div>

        {item.progress > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
            <div className="h-full bg-accent" style={{ width: `${Math.min(Math.round(item.progress * 100), 100)}%` }} />
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm text-white/90 group-hover:text-white">{item.title}</p>
      {item.releaseYear && <p className="text-xs text-white/50">{item.releaseYear}</p>}
    </Link>
  );
}
