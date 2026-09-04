export function notFound(req, res) {
  res.status(404).json({ error: 'not_found' });
}

// Mongoose surfaces a duplicate unique-index write as a raw driver error
// (code 11000), not a normal validation error - every service that does a
// create/update against a unique field (Genre.name, Season's per-show
// number, etc.) needs this same 409 instead of a generic 500.
function isDuplicateKeyError(err) {
  return err?.code === 11000 || err?.cause?.code === 11000;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);

  if (isDuplicateKeyError(err)) {
    const field = Object.keys(err.keyPattern ?? err.cause?.keyPattern ?? {})[0] ?? 'value';
    return res.status(409).json({ error: 'already_exists', field });
  }

  // Multer's own errors (name === 'MulterError') don't set .status, so
  // without this they'd fall through to a generic 500 - a file that's too
  // big deserves 413, not "something broke".
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'file_too_large' });
    }
    return res.status(400).json({ error: 'upload_failed', detail: err.code });
  }

  const status = err.status ?? 500;
  res.status(status).json({ error: err.publicMessage ?? 'internal_server_error' });
}
