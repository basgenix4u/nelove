/** Consistent API error shape: { error: { code, message, fields? } } */
export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export const bad = (code, message, fields) => new ApiError(400, code, message, fields)
export const unauthorized = (message = 'Authentication required') => new ApiError(401, 'UNAUTHENTICATED', message)
export const forbidden = (message = 'Insufficient permissions') => new ApiError(403, 'FORBIDDEN', message)
export const notFound = (message = 'Not found') => new ApiError(404, 'NOT_FOUND', message)
export const conflict = (code, message, fields) => new ApiError(409, code, message, fields)

export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields } })
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } })
  }
  if (err?.name === 'ZodError') {
    const fields = {}
    for (const issue of err.issues) fields[issue.path.join('.')] = issue.message
    return res.status(400).json({ error: { code: 'VALIDATION', message: 'Please check the highlighted fields', fields } })
  }
  console.error('[api:error]', req.method, req.path, err)
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side' } })
}

/** Wrap async route handlers so rejections hit errorHandler. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
