import { useEffect, useState } from 'react';
import axios from 'axios';

// Tilted, dimmed collage of real posters behind the standalone pages
// (login, register, who's-watching, plans) - matches the marketing mockups,
// including the soft light beam from the top-left. Fetches from the public
// catalog endpoint so it also works before login; on failure it just leaves
// the dark background, no error.
export default function PosterWall() {
  const [posters, setPosters] = useState([]);

  useEffect(() => {
    axios
      .get('/api/movies?limit=24')
      .then((r) => setPosters(r.data.map((m) => m.posterUrl).filter(Boolean)))
      .catch(() => {});
  }, []);

  const tiles = posters.length ? Array.from({ length: 48 }, (_, i) => posters[i % posters.length]) : [];

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden bg-ink">
      <div className="absolute inset-0 origin-center scale-[1.45] -rotate-[8deg]">
        <div className="grid h-full w-full grid-cols-4 sm:grid-cols-6 lg:grid-cols-8">
          {tiles.map((src, i) => (
            <img key={i} src={src} alt="" className="h-full w-full object-cover brightness-[0.55]" />
          ))}
        </div>
      </div>

      {/* soft light beam from the top-left corner */}
      <div className="absolute -left-24 -top-40 h-[70vh] w-[55vw] rounded-full bg-white/10 blur-[130px]" />

      <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/70 to-ink/95" />
      <div className="absolute inset-0 bg-ink/45" />
    </div>
  );
}
