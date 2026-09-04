// Accepts a full YouTube URL (watch/embed/shorts/youtu.be, with or
// without extra query params) or a bare 11-character video ID, and
// returns just the ID - what the backend actually stores and what the
// player's YouTube IFrame API needs.
export function extractYoutubeId(input) {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : '';
}
