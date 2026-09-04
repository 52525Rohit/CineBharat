import { useRef } from 'react';
import MovieCard from './MovieCard.jsx';

export default function Rail({ title, items, type = 'movie' }) {
  const scrollerRef = useRef(null);

  if (!items || items.length === 0) return null;

  function scrollBy(direction) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
  }

  return (
    <section className="group/rail relative mb-10">
      <h2 className="mb-3 px-6 text-xl font-bold text-white sm:px-10">{title}</h2>

      <button
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="absolute bottom-0 left-0 top-6 z-10 hidden w-12 items-center justify-center bg-gradient-to-r from-ink/90 to-transparent text-3xl text-white opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 sm:flex"
      >
        ‹
      </button>

      <div ref={scrollerRef} className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-6 pb-6 pt-2 sm:gap-3 sm:px-10">
        {items.map((item) => (
          <MovieCard key={item._id} item={item} type={type} />
        ))}
      </div>

      <button
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="absolute bottom-0 right-0 top-6 z-10 hidden w-12 items-center justify-center bg-gradient-to-l from-ink/90 to-transparent text-3xl text-white opacity-0 transition-opacity duration-200 group-hover/rail:opacity-100 sm:flex"
      >
        ›
      </button>
    </section>
  );
}
