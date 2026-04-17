/**
 * Global Express error handler.
 * Catches all errors thrown by route handlers and formats a consistent JSON response.
 */

// eslint-disable-next-line no-unused-vars
export default function errorHandler(err, _req, res, _next) {
  const requestId = _req.requestId ?? null;

  // PostgreSQL unique-violation (23505)
  if (err.code === '23505') {
    return res.status(409).json({
      error:   'Conflict',
      message: 'A record with this identifier already exists.',
      code: 'DB_UNIQUE_VIOLATION',
      request_id: requestId,
      detail:  err.detail ?? null,
    });
  }

  // PostgreSQL FK violation (23503)
  if (err.code === '23503') {
    return res.status(422).json({
      error:   'Unprocessable Entity',
      message: 'Referenced record does not exist.',
      code: 'DB_FOREIGN_KEY_VIOLATION',
      request_id: requestId,
      detail:  err.detail ?? null,
    });
  }

  // PostgreSQL invalid UUID (22P02)
  if (err.code === '22P02') {
    return res.status(400).json({
      error:   'Bad Request',
      message: 'Invalid UUID format.',
      code: 'INVALID_UUID',
      request_id: requestId,
    });
  }

  const status = err.status ?? err.statusCode ?? 500;
  const message = status < 500 ? err.message : 'Internal server error';

  if (status >= 500) {
    console.error(`[ERROR] request_id=${requestId ?? 'n/a'} ${err.message}`, err.stack);
  }

  res.status(status).json({
    error: message,
    code: err.code ?? 'UNEXPECTED_ERROR',
    request_id: requestId,
  });
}
