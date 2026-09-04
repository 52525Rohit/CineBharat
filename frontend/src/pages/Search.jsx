import { useSearchParams, Link } from 'react-router-dom';
import { useSearch } from '../api/search.js';

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const { data, isLoading } = useSearch(q);

  return (
    <div className="px-6 pb-16 pt-8 sm:px-10">
      <h1 className="mb-6 text-2xl font-bold">Results for “{q}”</h1>
      {isLoading && <p className="text-white/60">Searching...</p>}
      {data && data.results.length === 0 && <p className="text-white/60">No matches. Try another title, actor, or genre.</p>}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4 md:grid-cols-6">
        {data?.results.map((item) => (
          <Link key={item.id} to={item.type === 'show' ? `/shows/${item.id}` : `/movies/${item.id}`}>
            <div className="aspect-[2/3] overflow-hidden rounded-md bg-surface">
              <img src={item.posterUrl} alt={item.title} className="h-full w-full object-cover" />
            </div>
            <p className="mt-2 truncate text-sm">{item.title}</p>
            <p className="text-xs text-white/50">{item.year} · {item.type}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
