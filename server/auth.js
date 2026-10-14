/** Sessions (JWT in httpOnly cookie), CSRF double-submit, role guards. */
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { config } from './config.js'
import { db } from './db.js'
import { unauthorized, forbidden } from './lib/errors.js'

const CSRF_COOKIE = 'nelove_csrf'
export const SESSION_COOKIE = 'nelove_session'

function baseCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.COOKIE_SECURE,
    path: '/',
  }
}

export function issueSession(res, user) {
  const token = jwt.sign(
    { uid: user.id, role: user.role, name: user.name, email: user.email },
    config.JWT_SECRET,
    { expiresIn: `${config.SESSION_TTL_DAYS}d` }
  )
  res.cookie(SESSION_COOKIE, token, { ...baseCookie(), maxAge: config.SESSION_TTL_DAYS * 86400e3 })
  rotateCsrf(res)
}

export function clearSession(res) {
  res.clearCookie(SESSION_COOKIE, baseCookie())
  rotateCsrf(res)
}

export function rotateCsrf(res) {
  const token = crypto.randomBytes(24).toString('hex')
  res.cookie(CSRF_COOKIE, token, { httpOnly: false, sameSite: 'lax', secure: config.COOKIE_SECURE, path: '/' })
  return token
}

/** Attaches req.user when a valid session cookie exists (never throws). */
export function attachUser(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (token) {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET)
      const user = db.prepare('SELECT id, email, name, phone, role FROM users WHERE id = ?').get(payload.uid)
      if (user) req.user = user
    } catch { /* expired/invalid — treated as guest */ }
  }
  next()
}

/** Enforces CSRF for state-changing requests (except webhooks). */
export function csrfGuard(req, _res, next) {
  // webhooks authenticate via HMAC signature instead
  if (req.path.startsWith('/webhooks/') || req.path === '/pay/webhook') return next()
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
  const cookieToken = req.cookies?.[CSRF_COOKIE]
  const headerToken = req.get('x-csrf-token')
  if (cookieToken && headerToken && cookieToken === headerToken) return next()
  return next(forbidden('Security token mismatch — refresh the page and try again'))
}

export function ensureCsrfCookie(req, res, next) {
  if (!req.cookies?.[CSRF_COOKIE]) rotateCsrf(res)
  next()
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized())
  next()
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(unauthorized())
  if (req.user.role !== 'admin') return next(forbidden('Admin access required'))
  next()
}
