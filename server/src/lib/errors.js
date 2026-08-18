export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details
  }
}

export const badRequest = (msg, details) => new HttpError(400, msg, details)
export const unauthorized = (msg = 'You need to sign in') => new HttpError(401, msg)
export const forbidden = (msg = 'You do not have access to this') => new HttpError(403, msg)
export const notFound = (msg = 'Not found') => new HttpError(404, msg)

// Wraps async route handlers so rejected promises reach the error middleware.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function errorHandler(err, req, res, _next) {
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: Object.values(err.errors).map((e) => e.message) })
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ error: 'Malformed id' })
  }
  const status = err.status || 500
  if (status >= 500) console.error('[error]', err)
  res.status(status).json({ error: err.message || 'Something went wrong', details: err.details })
}
