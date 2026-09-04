import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from 'shared/config/db.js';
import { env } from 'shared/config/env.js';
import { User } from 'shared/models/User.js';
import { Profile } from 'shared/models/Profile.js';
import { Genre } from 'shared/models/Genre.js';
import { Movie } from 'shared/models/Movie.js';
import { TVShow } from 'shared/models/TVShow.js';
import { Season } from 'shared/models/Season.js';
import { Episode } from 'shared/models/Episode.js';

// Real catalog metadata + posters come from TMDB. TMDB has no streamable
// video though (just metadata/artwork), so playback still uses public
// sample video files - the only thing that isn't "real" here, and there's
// no legal way to make it otherwise without licensed streaming rights.
//
// Google's old gtv-videos-bucket (previously used here) started returning
// 403 on every file at some point after this was first wired up - the
// bucket got locked down. These six were individually curl-verified
// reachable (200/206) across three different hosts, so one host going
// dark again doesn't take down the whole catalog. Re-verify with:
//   curl -s -o /dev/null -w '%{http_code}\n' -r 0-1000 <url>
// Three of these six (test-videos.co.uk's bigbuckbunny/sintel/jellyfish)
// genuinely exist in multiple encoded resolutions at that host - verified
// with the same curl -r 0-1000 check as above, just varying the /360//720/
// /1080/ path segment and filename. The other three sample hosts only have
// the one file, so `qualities` stays null and the player's quality picker
// degrades to a plan-gated label only for those titles. No host here has
// a real 4K encode of these clips - the "4K" plan tier is a gate/label
// only, never a real fourth file.
const SAMPLE_VIDEOS = [
  {
    url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    qualities: {
      '360p': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
      '720p': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
      '1080p': 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/1080/Big_Buck_Bunny_1080_10s_1MB.mp4',
    },
  },
  {
    url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
    qualities: {
      '360p': 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
      '720p': 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
      '1080p': 'https://test-videos.co.uk/vids/sintel/mp4/h264/1080/Sintel_1080_10s_1MB.mp4',
    },
  },
  {
    url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
    qualities: {
      '360p': 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
      '720p': 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
      '1080p': 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/1080/Jellyfish_1080_10s_1MB.mp4',
    },
  },
  { url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4', qualities: null },
  { url: 'https://download.samplelib.com/mp4/sample-10s.mp4', qualities: null },
  { url: 'https://vjs.zencdn.net/v/oceans.mp4', qualities: null },
];
const PLANS = ['free', 'basic', 'standard', 'premium'];
const IMG500 = 'https://image.tmdb.org/t/p/w500';
const IMG780 = 'https://image.tmdb.org/t/p/w780';

const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdb(path, params = {}) {
  const url = new URL(TMDB_BASE + path);
  url.searchParams.set('api_key', env.tmdbApiKey);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TMDB ${path} -> ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seedGenres() {
  const [movieGenres, tvGenres] = await Promise.all([tmdb('/genre/movie/list'), tmdb('/genre/tv/list')]);
  const names = [...new Set([...movieGenres.genres, ...tvGenres.genres].map((g) => g.name))];
  const docs = await Genre.insertMany(names.map((name) => ({ name, slug: slugify(name) })));
  const byName = Object.fromEntries(docs.map((d) => [d.name, d._id]));
  return {
    movieGenreMap: Object.fromEntries(movieGenres.genres.map((g) => [g.id, byName[g.name]])),
    tvGenreMap: Object.fromEntries(tvGenres.genres.map((g) => [g.id, byName[g.name]])),
  };
}

async function seedMovies(movieGenreMap, count) {
  const list = await tmdb('/movie/popular', { page: 1 });
  const picks = list.results.slice(0, count);

  const docs = [];
  for (let i = 0; i < picks.length; i++) {
    const summary = picks[i];
    try {
      const detail = await tmdb(`/movie/${summary.id}`, { append_to_response: 'credits,release_dates,videos' });
      const usRelease = detail.release_dates?.results?.find((r) => r.iso_3166_1 === 'US');
      const certification = usRelease?.release_dates?.find((d) => d.certification)?.certification || 'NR';
      const director = detail.credits?.crew?.find((c) => c.job === 'Director')?.name ?? 'Unknown';
      const cast = (detail.credits?.cast ?? []).slice(0, 5).map((c) => c.name);

      // Real trailer if TMDB has one; Play falls back to a placeholder
      // sample clip only when it doesn't (see Movie model, videoUrl).
      const trailer =
        detail.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ??
        detail.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Teaser');

      docs.push({
        title: detail.title,
        description: detail.overview || 'No synopsis available.',
        releaseYear: detail.release_date ? Number(detail.release_date.slice(0, 4)) : undefined,
        genreIds: (detail.genres ?? []).map((g) => movieGenreMap[g.id]).filter(Boolean),
        cast,
        director,
        durationSec: (detail.runtime || 90) * 60,
        maturityRating: certification,
        posterUrl: detail.poster_path ? `${IMG500}${detail.poster_path}` : '',
        thumbnailUrl: detail.backdrop_path ? `${IMG780}${detail.backdrop_path}` : '',
        trailerYoutubeKey: trailer?.key ?? '',
        trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
        videoUrl: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length].url,
        videoQualities: SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length].qualities ?? undefined,
        requiredPlan: PLANS[i % PLANS.length],
        popularityScore: Math.round(detail.popularity ?? 0),
        avgRating: Math.round((detail.vote_average ?? 0) / 2 * 10) / 10,
      });
    } catch (err) {
      console.warn(`[seed] skipped movie ${summary.title}: ${err.message}`);
    }
  }
  await Movie.insertMany(docs);
  return docs.length;
}

async function seedShows(tvGenreMap, count) {
  const list = await tmdb('/tv/popular', { page: 1 });
  const picks = list.results.slice(0, count);

  let showCount = 0;
  for (let i = 0; i < picks.length; i++) {
    const summary = picks[i];
    try {
      const detail = await tmdb(`/tv/${summary.id}`);
      const show = await TVShow.create({
        title: detail.name,
        description: detail.overview || 'No synopsis available.',
        releaseYear: detail.first_air_date ? Number(detail.first_air_date.slice(0, 4)) : undefined,
        genreIds: (detail.genres ?? []).map((g) => tvGenreMap[g.id]).filter(Boolean),
        cast: [],
        posterUrl: detail.poster_path ? `${IMG500}${detail.poster_path}` : '',
        thumbnailUrl: detail.backdrop_path ? `${IMG780}${detail.backdrop_path}` : '',
        maturityRating: detail.adult ? 'R' : 'PG-13',
        requiredPlan: PLANS[i % PLANS.length],
        popularityScore: Math.round(detail.popularity ?? 0),
        avgRating: Math.round((detail.vote_average ?? 0) / 2 * 10) / 10,
      });

      const firstRealSeason = (detail.seasons ?? []).find((s) => s.season_number >= 1) ?? detail.seasons?.[0];
      if (firstRealSeason) {
        const seasonDetail = await tmdb(`/tv/${summary.id}/season/${firstRealSeason.season_number}`);
        const seasonDoc = await Season.create({
          showId: show._id,
          seasonNumber: firstRealSeason.season_number,
          title: seasonDetail.name || `Season ${firstRealSeason.season_number}`,
        });
        const episodes = (seasonDetail.episodes ?? []).slice(0, 8).map((ep, epIdx) => ({
          seasonId: seasonDoc._id,
          showId: show._id,
          episodeNumber: ep.episode_number,
          title: ep.name,
          description: ep.overview || 'No synopsis available.',
          durationSec: (ep.runtime || 45) * 60,
          thumbnailUrl: ep.still_path ? `${IMG780}${ep.still_path}` : show.thumbnailUrl,
          videoUrl: SAMPLE_VIDEOS[(i + epIdx) % SAMPLE_VIDEOS.length].url,
          videoQualities: SAMPLE_VIDEOS[(i + epIdx) % SAMPLE_VIDEOS.length].qualities ?? undefined,
        }));
        if (episodes.length) await Episode.insertMany(episodes);
      }
      showCount++;
    } catch (err) {
      console.warn(`[seed] skipped show ${summary.name}: ${err.message}`);
    }
  }
  return showCount;
}

async function seed() {
  if (!env.tmdbApiKey) {
    throw new Error('TMDB_API_KEY is not set in backend/.env - get a free key at themoviedb.org/settings/api');
  }

  await connectDB('seed-script');
  console.log('[seed] clearing existing catalog + demo accounts...');
  await Promise.all([
    Movie.deleteMany({}),
    TVShow.deleteMany({}),
    Season.deleteMany({}),
    Episode.deleteMany({}),
    Genre.deleteMany({}),
    User.deleteMany({ email: { $in: ['admin@gmail.com', 'demo@streamline.dev'] } }),
  ]);

  console.log('[seed] fetching genres from TMDB...');
  const { movieGenreMap, tvGenreMap } = await seedGenres();

  console.log('[seed] fetching popular movies from TMDB...');
  const movieCount = await seedMovies(movieGenreMap, 16);

  console.log('[seed] fetching popular TV shows + season 1 episodes from TMDB...');
  const showCount = await seedShows(tvGenreMap, 6);

  const adminPasswordHash = await bcrypt.hash('Admin@123', 12);
  const demoPasswordHash = await bcrypt.hash('Demo1234!', 12);
  const admin = await User.create({ email: 'admin@gmail.com', passwordHash: adminPasswordHash, role: 'admin', plan: 'premium' });
  const demo = await User.create({ email: 'demo@streamline.dev', passwordHash: demoPasswordHash, role: 'user', plan: 'standard' });
  await Profile.create({ userId: admin._id, name: 'Admin' });
  await Profile.create({ userId: demo._id, name: 'Demo' });

  const withTrailer = await Movie.countDocuments({ trailerYoutubeKey: { $ne: '' } });
  console.log(`[seed] done: ${movieCount} movies (${withTrailer} with a real trailer), ${showCount} shows.`);
  console.log('  admin@gmail.com / Admin@123');
  console.log('  demo@streamline.dev  / Demo1234!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
