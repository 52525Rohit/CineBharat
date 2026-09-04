import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchPlayback } from '../api/movies.js';
import { fetchEpisodePlayback } from '../api/shows.js';
import { useReportProgress } from '../api/engagement.js';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
// Mirrors backend/shared/utils/plans.js PLAN_RANK and subscription-service's
// PLANS.maxResolution. fileKey maps each marketing tier to the real key in
// grant.videoQualities (see Movie.videoQualities) - only set for the handful
// of seed sources that have genuine multi-resolution encodes. The lowest
// real encode available is 360p (no host here has true 480p), and nobody
// has a real 4K file, so both '480p' and '4k' point at the nearest real
// tier (360p and 1080p) rather than a file that doesn't exist. When a title
// has no videoQualities map at all, every tier resolves to the same base
// videoUrl and switching is a no-op label change, not a real swap.
const QUALITIES = [
  { id: '480p', label: '480p', minPlan: 'free', fileKey: '360p' },
  { id: '720p', label: '720p HD', minPlan: 'basic', fileKey: '720p' },
  { id: '1080p', label: '1080p Full HD', minPlan: 'standard', fileKey: '1080p' },
  { id: '4k', label: '4K Ultra HD', minPlan: 'premium', fileKey: '1080p' },
];
const PLAN_RANK = { free: 0, basic: 1, standard: 2, premium: 3 };

function resolveQualityUrl(grant, qualityId) {
  const q = QUALITIES.find((x) => x.id === qualityId);
  return (q && grant.videoQualities?.[q.fileKey]) || grant.videoUrl;
}

// A non-"Original" audio language is a whole alternate video file (see
// Movie.audioTracks) - it replaces the source outright, so quality
// variants don't apply to it.
function resolveSourceUrl(grant, qualityId, audioLang) {
  if (audioLang && audioLang !== 'Original') {
    const track = (grant.audioTracks || []).find((a) => a.lang === audioLang);
    if (track?.videoUrl) return track.videoUrl;
  }
  return resolveQualityUrl(grant, qualityId);
}
const FIT_MODES = [
  { id: 'contain', label: 'Fit' },
  { id: 'cover', label: 'Fill' },
  { id: 'fill', label: 'Stretch' },
];
// Tailwind's build-time scanner needs literal class strings - it can't
// see through `object-${fitMode}` template interpolation, so that would
// silently produce no styling at all past the first build.
const FIT_CLASS = { contain: 'object-contain', cover: 'object-cover', fill: 'object-fill' };
const FRAME_DURATION = 1 / 30; // approximate - actual source fps isn't exposed to <video>

function formatTime(sec) {
  if (!Number.isFinite(sec)) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = h > 0 ? String(m).padStart(2, '0') : m;
  return h > 0 ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`;
}

function describePlaybackError(err) {
  const code = err.response?.data?.error;
  const status = err.response?.status;
  if (code === 'upgrade_required') return `This title needs the ${err.response.data.requiredPlan} plan or higher.`;
  if (status === 404 || code === 'not_found') return "This title isn't available anymore - go back and refresh the page.";
  if (status === 401) return 'Your session expired - please sign in again.';
  if (!err.response) return "Can't reach the server - check that the backend is running.";
  return `Playback unavailable (${status ?? 'unknown error'}).`;
}

// Loads the YouTube IFrame Player API once and caches the promise - lets
// the trailer path be driven programmatically (play/pause/seek/volume)
// instead of embedding YouTube's own player chrome, so both playback
// paths end up under the exact same control bar. YouTube's terms don't
// allow pulling the raw video file, so the iframe itself is unavoidable -
// this just hides its native controls (playerVars.controls: 0) and drives
// it from ours. The VLC-style extras below (frame step, A-B loop, volume
// boost, screenshot, video filters) only make sense against a real
// decoded <video> element, so they're gated to the uploaded-file path.
let youtubeApiPromise = null;
function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  youtubeApiPromise ??= new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

export default function Player() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const profileId = useSelector((s) => s.auth.activeProfileId);
  const plan = useSelector((s) => s.auth.user?.plan) ?? 'free';
  const maxPlanRank = PLAN_RANK[plan] ?? 0;
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const ytMountRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytPollRef = useRef(null);
  const previewRef = useRef(null);
  const hideTimerRef = useRef(null);
  const loadedGrantRef = useRef(null);
  const reportProgress = useReportProgress();

  // Volume boost past 100% needs a Web Audio gain stage - a plain <video>
  // caps at its own 0-1 volume range. Created lazily, only if the viewer
  // actually drags past 100%, so most playback never touches Web Audio.
  const audioCtxRef = useRef(null);
  const gainNodeRef = useRef(null);

  const [grant, setGrant] = useState(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1); // 0 - 2 (200%) for the sample path
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [ytReady, setYtReady] = useState(false);
  const [fitMode, setFitMode] = useState('contain');
  const [loopWhole, setLoopWhole] = useState(false);
  const [loopA, setLoopA] = useState(null);
  const [loopB, setLoopB] = useState(null);
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [pipActive, setPipActive] = useState(false);
  const [jumpInput, setJumpInput] = useState('');
  const [quality, setQuality] = useState(QUALITIES[maxPlanRank]?.id ?? '480p');
  const [audioLang, setAudioLang] = useState('Original');
  const [hoverFrac, setHoverFrac] = useState(null); // scrub-bar hover position, 0-1
  const [hoverPx, setHoverPx] = useState(0); // clamped px from the bar's left, keeps the thumbnail on-screen

  const isYoutube = grant?.type === 'youtube';

  useEffect(() => {
    setError('');
    setGrant(null);
    setYtReady(false);
    const load = type === 'episode' ? fetchEpisodePlayback : fetchPlayback;
    load(id, profileId)
      .then(setGrant)
      .catch((err) => setError(describePlaybackError(err)));
  }, [type, id, profileId]);

  // Loads the video for a new title at the best quality the plan allows
  // (falling back to whatever's actually available for this title), and
  // does a real source swap - preserving position + play state - when the
  // viewer picks a different quality on the title already loaded. See
  // resolveQualityUrl: titles without a videoQualities map just resolve to
  // the same base file every time, so this becomes a harmless no-op reload.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !grant || grant.type !== 'sample') return;
    const isNewTitle = loadedGrantRef.current !== grant;
    loadedGrantRef.current = grant;

    let activeQuality = quality;
    let activeAudio = audioLang;
    if (isNewTitle) {
      const best = [...QUALITIES].reverse().find((q) => PLAN_RANK[q.minPlan] <= maxPlanRank && grant.videoQualities?.[q.fileKey]);
      activeQuality = best?.id ?? QUALITIES[maxPlanRank]?.id ?? '480p';
      if (activeQuality !== quality) setQuality(activeQuality);
      // Default to "Original"; but if there's no real base upload and dubs
      // exist, start on the first dub so playback isn't a placeholder clip.
      activeAudio = 'Original';
      if (!grant.videoUrl?.startsWith('/uploads/') && grant.audioTracks?.length) {
        activeAudio = grant.audioTracks[0].lang;
      }
      if (audioLang !== activeAudio) setAudioLang(activeAudio);
    }

    const url = resolveSourceUrl(grant, activeQuality, activeAudio);
    if (isNewTitle) {
      video.src = url;
      video.currentTime = grant.resumePositionSec || 0;
      return;
    }
    // currentSrc is absolute; url may be root-relative ("/uploads/..") -
    // resolve before comparing so a same-source re-eval isn't a reload.
    if (new URL(url, window.location.href).href === video.currentSrc) return;
    const resumeAt = video.currentTime;
    const wasPlaying = !video.paused;
    video.src = url;
    const onLoaded = () => {
      video.currentTime = resumeAt;
      if (wasPlaying) video.play().catch(() => {});
      video.removeEventListener('loadedmetadata', onLoaded);
    };
    video.addEventListener('loadedmetadata', onLoaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grant, quality, audioLang]);

  // Mount the YouTube player once we have a trailer key, driven entirely
  // through the API so our control bar - not YouTube's - is what's shown.
  useEffect(() => {
    if (!isYoutube || !ytMountRef.current) return;
    let cancelled = false;

    loadYoutubeApi().then((YT) => {
      if (cancelled || !ytMountRef.current) return;
      ytPlayerRef.current = new YT.Player(ytMountRef.current, {
        videoId: grant.youtubeKey,
        playerVars: { controls: 0, modestbranding: 1, rel: 0, disablekb: 1, iv_load_policy: 3, fs: 0, playsinline: 1 },
        events: {
          onReady: (e) => {
            setDuration(e.target.getDuration());
            e.target.playVideo();
            setYtReady(true);
          },
          onStateChange: (e) => {
            setPlaying(e.data === YT.PlayerState.PLAYING);
            if (e.data === YT.PlayerState.ENDED) setPlaying(false);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      clearInterval(ytPollRef.current);
      ytPlayerRef.current?.destroy?.();
      ytPlayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isYoutube, grant?.youtubeKey]);

  // YT's API doesn't push continuous time updates - poll while it's ready.
  useEffect(() => {
    if (!isYoutube || !ytReady) return;
    ytPollRef.current = setInterval(() => {
      const player = ytPlayerRef.current;
      if (!player?.getCurrentTime) return;
      setCurrentTime(player.getCurrentTime());
    }, 250);
    return () => clearInterval(ytPollRef.current);
  }, [isYoutube, ytReady]);

  function selectSpeed(speed) {
    if (isYoutube) ytPlayerRef.current?.setPlaybackRate(speed);
    else if (videoRef.current) videoRef.current.playbackRate = speed;
    setRate(speed);
  }

  function toggleSubtitles() {
    const video = videoRef.current;
    const next = !subtitlesOn;
    setSubtitlesOn(next);
    if (video?.textTracks?.[0]) video.textTracks[0].mode = next ? 'showing' : 'hidden';
  }

  // Shifts every cue's timing by deltaSec - the standard way to fix
  // subtitles that drift out of sync, same idea as VLC's g/h shortcuts.
  function adjustSubtitleDelay(deltaSec) {
    const track = videoRef.current?.textTracks?.[0];
    if (!track?.cues) return;
    for (const cue of track.cues) {
      cue.startTime += deltaSec;
      cue.endTime += deltaSec;
    }
    setSubtitleDelay((d) => Math.round((d + deltaSec) * 10) / 10);
  }

  const revealControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    if (playing) hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, [playing]);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  function togglePlay() {
    if (isYoutube) {
      const player = ytPlayerRef.current;
      if (!player) return;
      if (playing) player.pauseVideo();
      else player.playVideo();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }

  function seekBy(deltaSec) {
    if (isYoutube) {
      const player = ytPlayerRef.current;
      if (!player) return;
      player.seekTo(Math.min(Math.max(player.getCurrentTime() + deltaSec, 0), duration || Infinity), true);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + deltaSec, 0), duration || Infinity);
  }

  // Pauses and nudges by one approximate frame - VLC's "next/previous
  // frame" (E / comma-period here since the video element has no native
  // frame API to query the real frame duration from).
  function stepFrame(direction) {
    if (isYoutube) return;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = Math.min(Math.max(video.currentTime + direction * FRAME_DURATION, 0), duration || Infinity);
  }

  function seekTo(fraction) {
    if (!duration) return;
    if (isYoutube) ytPlayerRef.current?.seekTo(fraction * duration, true);
    else if (videoRef.current) videoRef.current.currentTime = fraction * duration;
  }

  // Scrub-bar hover: track the position for the timestamp bubble, and for
  // real files nudge a muted preview <video> to that time so its frame
  // shows as a thumbnail. Skipped for YouTube (no frame access).
  function handleBarHover(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    setHoverFrac(frac);
    // Keep the ~144px-wide thumbnail fully inside the bar so it never
    // pushes the page wider and spawns a horizontal scrollbar.
    const half = Math.min(74, rect.width / 2);
    setHoverPx(Math.min(Math.max(frac * rect.width, half), rect.width - half));
    const preview = previewRef.current;
    if (preview && duration && Number.isFinite(preview.duration)) {
      const t = frac * duration;
      if (Math.abs(preview.currentTime - t) > 0.25) preview.currentTime = t;
    }
  }

  function jumpToTimestamp() {
    const parts = jumpInput.split(':').map(Number);
    if (parts.some(Number.isNaN) || parts.length === 0) return;
    const seconds = parts.reduceRight((acc, part, i) => acc + part * 60 ** (parts.length - 1 - i), 0);
    if (isYoutube) ytPlayerRef.current?.seekTo(seconds, true);
    else if (videoRef.current) videoRef.current.currentTime = seconds;
    setJumpInput('');
  }

  function toggleMute() {
    if (isYoutube) {
      const player = ytPlayerRef.current;
      if (!player) return;
      if (muted) player.unMute();
      else player.mute();
      setMuted(!muted);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  // Web Audio only gets engaged once volume actually goes past 100% -
  // routing every plain playback through an AudioContext for no reason
  // would be wasted complexity most viewers never need.
  function ensureGainNode() {
    if (gainNodeRef.current || !videoRef.current) return gainNodeRef.current;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaElementSource(videoRef.current);
    const gain = ctx.createGain();
    source.connect(gain).connect(ctx.destination);
    audioCtxRef.current = ctx;
    gainNodeRef.current = gain;
    return gain;
  }

  function changeVolume(v) {
    if (isYoutube) {
      ytPlayerRef.current?.setVolume(Math.min(v, 1) * 100);
      setVolume(v);
      setMuted(v === 0);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (v <= 1) {
      video.volume = v;
      if (gainNodeRef.current) gainNodeRef.current.gain.value = 1;
    } else {
      video.volume = 1;
      const gain = ensureGainNode();
      if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
      if (gain) gain.gain.value = v;
    }
    video.muted = v === 0;
    setVolume(v);
    setMuted(v === 0);
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
  }

  async function togglePiP() {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      // Picture-in-Picture isn't available in every browser - fail quietly.
    }
  }

  function takeScreenshot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(grant?.title || 'screenshot').replace(/[^a-z0-9]+/gi, '-')}-${Math.floor(video.currentTime)}s.png`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  function setLoopPoint(which) {
    const t = isYoutube ? ytPlayerRef.current?.getCurrentTime() : videoRef.current?.currentTime;
    if (t == null) return;
    if (which === 'a') setLoopA(t);
    else setLoopB(t);
  }

  function clearLoop() {
    setLoopA(null);
    setLoopB(null);
  }

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    const onPipChange = () => setPipActive(!!document.pictureInPictureElement);
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('enterpictureinpicture', onPipChange);
    document.addEventListener('leavepictureinpicture', onPipChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('enterpictureinpicture', onPipChange);
      document.removeEventListener('leavepictureinpicture', onPipChange);
    };
  }, []);

  useEffect(() => {
    if (!grant || error) return;
    function onKeyDown(e) {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.code === 'ArrowRight') seekBy(10);
      else if (e.code === 'ArrowLeft') seekBy(-10);
      else if (e.code === 'Comma') stepFrame(-1);
      else if (e.code === 'Period') stepFrame(1);
      else if (e.code === 'KeyF') toggleFullscreen();
      else if (e.code === 'KeyM') toggleMute();
      revealControls();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grant, error, duration, playing, muted]);

  // A-B loop: jump back to A once playback crosses B - checked on every
  // timeupdate tick rather than a separate interval.
  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1));
    if (loopA != null && loopB != null && video.currentTime >= loopB) video.currentTime = loopA;
    if (Math.floor(video.currentTime) % 20 !== 0) return;
    // No profile = no progress tracking (e.g. an admin previewing). Firing
    // this without a valid profileId 403s, which the api interceptor turns
    // into a session invalidation - unmounting the player mid-playback.
    if (!profileId) return;
    reportProgress.mutate({
      contentId: id,
      contentType: type,
      positionSec: Math.floor(video.currentTime),
      durationSec: Math.floor(video.duration || 0),
    });
  }

  function handleEnded() {
    const video = videoRef.current;
    setPlaying(false);
    if (!profileId) return;
    reportProgress.mutate({ contentId: id, contentType: type, positionSec: Math.floor(video.duration), durationSec: Math.floor(video.duration) });
  }

  const progressPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration && !isYoutube ? (buffered / duration) * 100 : 0;
  const filterStyle = { filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)` };

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {error && (
        <div className="p-10 text-center">
          <p className="text-red-400">{error}</p>
          <button onClick={() => navigate('/')} className="mt-4 rounded bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20">
            Back to Home
          </button>
        </div>
      )}

      {!error && grant && (
        <div
          ref={containerRef}
          onMouseMove={revealControls}
          onClick={togglePlay}
          className="group relative flex-1 overflow-hidden bg-black"
        >
          {isYoutube ? (
            <>
              {grant.title && (
                <p className="pointer-events-none absolute left-4 top-16 z-0 text-sm text-white/40">Trailer — official content isn't available for streaming</p>
              )}
              {/* The mount div YT.Player replaces with its own iframe - kept
                  non-interactive so clicks/drags are handled by our overlay,
                  not YouTube's embed. */}
              <div ref={ytMountRef} className="pointer-events-none h-screen w-full" />
            </>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              loop={loopWhole}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={handleEnded}
              style={filterStyle}
              className={`h-screen w-full ${FIT_CLASS[fitMode]}`}
            >
              {grant.subtitleUrl && (
                <track kind="subtitles" src={grant.subtitleUrl} srcLang="en" label={grant.subtitleLang || 'Subtitles'} default={subtitlesOn} />
              )}
            </video>
          )}

          {/* Title + back button, fades with the rest of the chrome */}
          <div className={`pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(-1); }}
              className="pointer-events-auto text-white/80 hover:text-white"
            >
              ← Back
            </button>
            {grant.title && <p className="mt-2 text-lg font-semibold text-white">{grant.title}</p>}
          </div>

          {!playing && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/50 text-4xl text-white">▶</div>
            </div>
          )}

          {/* One control bar for both playback engines */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
          >
            {/* Scrub bar, with A/B loop markers when set */}
            <div
              className="group/bar relative mb-2 h-1.5 cursor-pointer rounded-full bg-white/25"
              onMouseMove={handleBarHover}
              onMouseLeave={() => setHoverFrac(null)}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seekTo((e.clientX - rect.left) / rect.width);
              }}
            >
              {/* Hover preview: thumbnail frame (real files only) + timestamp */}
              {!isYoutube && (
                <video
                  ref={previewRef}
                  src={resolveQualityUrl(grant, quality)}
                  muted
                  preload="metadata"
                  className={`pointer-events-none absolute bottom-4 h-20 w-36 -translate-x-1/2 rounded bg-black object-cover ring-1 ring-white/20 transition-opacity ${
                    hoverFrac != null ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{ left: `${hoverPx}px` }}
                />
              )}
              {hoverFrac != null && duration > 0 && (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 rounded bg-black/85 px-1.5 py-0.5 text-[11px] tabular-nums text-white"
                  style={{ left: `${hoverPx}px`, bottom: isYoutube ? '1rem' : '6.25rem' }}
                >
                  {formatTime(hoverFrac * duration)}
                </div>
              )}

              {!isYoutube && <div className="absolute h-full rounded-full bg-white/40" style={{ width: `${bufferedPct}%` }} />}
              <div className="absolute h-full rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
              {loopA != null && duration > 0 && (
                <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-green-400" style={{ left: `${(loopA / duration) * 100}%` }} />
              )}
              {loopB != null && duration > 0 && (
                <div className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-red-400" style={{ left: `${(loopB / duration) * 100}%` }} />
              )}
              <div
                className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-accent opacity-0 transition-opacity group-hover/bar:opacity-100"
                style={{ left: `calc(${progressPct}% - 6px)` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-white">
              <button onClick={togglePlay} className="text-xl hover:text-accent" aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? '❚❚' : '▶'}
              </button>
              <button onClick={() => seekBy(-10)} className="text-sm text-white/80 hover:text-white" aria-label="Back 10 seconds">⟲10</button>
              <button onClick={() => seekBy(10)} className="text-sm text-white/80 hover:text-white" aria-label="Forward 10 seconds">10⟳</button>

              <div className="flex items-center gap-1.5">
                <button onClick={toggleMute} className="hover:text-accent" aria-label={muted ? 'Unmute' : 'Mute'}>
                  {muted || volume === 0 ? '🔇' : volume > 1 ? '📢' : '🔊'}
                </button>
                <input
                  type="range"
                  min="0"
                  max={isYoutube ? 1 : 2}
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                  title={`${Math.round(volume * 100)}%`}
                  className="h-1 w-16 accent-accent"
                />
                {!isYoutube && volume > 1 && <span className="text-xs text-accent">{Math.round(volume * 100)}%</span>}
              </div>

              <span className="font-mono text-xs text-white/70 tabular-nums">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="ml-auto flex items-center gap-3">
                {!isYoutube && grant.subtitleUrl && (
                  <button
                    onClick={toggleSubtitles}
                    className={`rounded border px-2 py-1 text-xs ${subtitlesOn ? 'border-accent text-accent' : 'border-white/30 text-white/60'}`}
                  >
                    CC
                  </button>
                )}

                {!isYoutube && (
                  <>
                    <button onClick={togglePiP} className={`text-sm hover:text-accent ${pipActive ? 'text-accent' : 'text-white/80'}`} aria-label="Picture in picture" title="Picture in picture">⧉</button>
                    <button onClick={takeScreenshot} className="text-sm text-white/80 hover:text-accent" aria-label="Screenshot" title="Screenshot">📷</button>
                  </>
                )}

                <div className="relative">
                  <button onClick={() => setToolsOpen((v) => !v)} className="text-sm text-white/80 hover:text-white" aria-label="More options" title="More options">
                    ⚙ {!isYoutube ? QUALITIES.find((q) => q.id === quality)?.label : ''} {rate !== 1 ? `${rate}x` : ''}
                  </button>
                  {toolsOpen && (
                    <div className="absolute bottom-8 right-0 w-64 space-y-3 rounded bg-surface p-3 text-sm shadow-xl ring-1 ring-white/10">
                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Speed</p>
                        <div className="flex flex-wrap gap-1">
                          {SPEEDS.map((s) => (
                            <button
                              key={s}
                              onClick={() => selectSpeed(s)}
                              className={`rounded px-2 py-1 text-xs ${s === rate ? 'bg-accent text-white' : 'bg-ink text-white/70 hover:text-white'}`}
                            >
                              {s}x
                            </button>
                          ))}
                        </div>
                      </div>

                      {!isYoutube && (
                        <>
                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Quality</p>
                            <div className="flex flex-wrap gap-1">
                              {QUALITIES.map((q) => {
                                const locked = PLAN_RANK[q.minPlan] > maxPlanRank;
                                const hasRealFile = !!grant.videoQualities?.[q.fileKey];
                                return (
                                  <button
                                    key={q.id}
                                    onClick={() => !locked && setQuality(q.id)}
                                    disabled={locked}
                                    title={
                                      locked
                                        ? `Requires the ${q.minPlan} plan or higher`
                                        : hasRealFile
                                          ? q.label
                                          : `${q.label} - not available for this title, will play at the closest available quality`
                                    }
                                    className={`rounded px-2 py-1 text-xs ${
                                      locked
                                        ? 'cursor-not-allowed bg-ink text-white/30'
                                        : q.id === quality
                                          ? 'bg-accent text-white'
                                          : 'bg-ink text-white/70 hover:text-white'
                                    }`}
                                  >
                                    {locked ? `🔒 ${q.label}` : hasRealFile ? q.label : `${q.label} *`}
                                  </button>
                                );
                              })}
                            </div>
                            {!grant.videoQualities && (
                              <p className="mt-1 text-[11px] text-white/30">* only one source quality exists for this title</p>
                            )}
                          </div>

                          {grant.audioTracks?.length > 0 && (
                            <div>
                              <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Audio language</p>
                              <div className="flex flex-wrap gap-1">
                                {['Original', ...grant.audioTracks.map((a) => a.lang)].map((lang) => (
                                  <button
                                    key={lang}
                                    onClick={() => setAudioLang(lang)}
                                    className={`rounded px-2 py-1 text-xs ${
                                      lang === audioLang ? 'bg-accent text-white' : 'bg-ink text-white/70 hover:text-white'
                                    }`}
                                  >
                                    {lang}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Fit</p>
                            <div className="flex gap-1">
                              {FIT_MODES.map((m) => (
                                <button
                                  key={m.id}
                                  onClick={() => setFitMode(m.id)}
                                  className={`rounded px-2 py-1 text-xs ${fitMode === m.id ? 'bg-accent text-white' : 'bg-ink text-white/70 hover:text-white'}`}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="mb-1 flex items-center justify-between">
                              <p className="text-xs uppercase tracking-wide text-white/40">Loop</p>
                              <button
                                onClick={() => setLoopWhole((v) => !v)}
                                className={`rounded px-2 py-0.5 text-xs ${loopWhole ? 'bg-accent text-white' : 'bg-ink text-white/70'}`}
                              >
                                Repeat
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setLoopPoint('a')} className="rounded bg-ink px-2 py-1 text-xs text-green-400 hover:bg-white/10">Set A</button>
                              <button onClick={() => setLoopPoint('b')} className="rounded bg-ink px-2 py-1 text-xs text-red-400 hover:bg-white/10">Set B</button>
                              {(loopA != null || loopB != null) && (
                                <button onClick={clearLoop} className="rounded bg-ink px-2 py-1 text-xs text-white/50 hover:bg-white/10">Clear</button>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Video</p>
                            {[
                              ['brightness', 'Brightness'],
                              ['contrast', 'Contrast'],
                              ['saturation', 'Saturation'],
                            ].map(([key, label]) => (
                              <div key={key} className="mb-1 flex items-center gap-2">
                                <span className="w-16 text-xs text-white/60">{label}</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="200"
                                  value={filters[key]}
                                  onChange={(e) => setFilters((f) => ({ ...f, [key]: Number(e.target.value) }))}
                                  className="h-1 flex-1 accent-accent"
                                />
                              </div>
                            ))}
                            <button
                              onClick={() => setFilters({ brightness: 100, contrast: 100, saturation: 100 })}
                              className="text-xs text-white/40 hover:text-white"
                            >
                              Reset
                            </button>
                          </div>

                          {grant.subtitleUrl && (
                            <div>
                              <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Subtitle sync</p>
                              <div className="flex items-center gap-2">
                                <button onClick={() => adjustSubtitleDelay(-0.5)} className="rounded bg-ink px-2 py-1 text-xs hover:bg-white/10">-0.5s</button>
                                <span className="tabular-nums text-xs text-white/60">{subtitleDelay.toFixed(1)}s</span>
                                <button onClick={() => adjustSubtitleDelay(0.5)} className="rounded bg-ink px-2 py-1 text-xs hover:bg-white/10">+0.5s</button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div>
                        <p className="mb-1 text-xs uppercase tracking-wide text-white/40">Jump to</p>
                        <div className="flex gap-1">
                          <input
                            value={jumpInput}
                            onChange={(e) => setJumpInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && jumpToTimestamp()}
                            placeholder="mm:ss"
                            className="w-20 rounded bg-ink px-2 py-1 text-xs text-white ring-1 ring-white/10"
                          />
                          <button onClick={jumpToTimestamp} className="rounded bg-ink px-2 py-1 text-xs text-white/70 hover:bg-white/10">Go</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={toggleFullscreen} className="text-sm text-white/80 hover:text-white" aria-label="Fullscreen">
                  {fullscreen ? '⤢' : '⤡'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
