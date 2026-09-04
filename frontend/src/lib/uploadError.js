// Shared between AdminMovies.jsx and AdminShows.jsx - both hit the same
// /admin/upload endpoint and should describe a failed upload the same way.
export function describeUploadError(err) {
  const code = err.response?.data?.error;
  if (code === 'file_too_large') return 'That file is too large (limit is 20GB).';
  if (err.code === 'ERR_NETWORK') return "Upload lost the connection - check the file isn't larger than your disk has room for, and try again.";
  return 'Upload failed - try again.';
}
