import { useShows } from '../api/shows.js';
import MovieCard from '../components/MovieCard.jsx';

export default function Shows() {
  const { data, isLoading } = useShows();
  return (
    <div className="px-6 pb-16 pt-8 sm:px-10">
      <h1 className="mb-6 text-2xl font-bold">TV Shows</h1>
      {isLoading && <p className="text-white/60">Loading...</p>}
      <div className="flex flex-wrap gap-5">
        {data?.map((show) => (
          <MovieCard key={show._id} item={show} type="show" />
        ))}
      </div>
    </div>
  );
}
