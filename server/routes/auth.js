import { Router } from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { db } from '../db.js'
import { issueSession, clearSession, requireAuth } from '../auth.js'
import { registerSchema, loginSchema } from '../validate.js'
import { wrap, conflict, unauthorized } from '../lib/errors.js'

const r = Router()

const limiter = rateLimit({
  windowMs: 15 * 60e3,
  max: 24,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts — try again in a few minutes' } },
})

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone || '', role: u.role })

r.post('/register', limiter, wrap(async (req, res) => {
  const body = registerSchema.parse(req.body)
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email)
  if (exists) throw conflict('EMAIL_TAKEN', 'An account with this email already exists — sign in instead')
  const hash = bcrypt.hashSync(body.password, 10)
  const info = db.prepare("INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?, 'customer')")
    .run(body.email, hash, body.name)
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(info.lastInsertRowid)
  issueSession(res, user)
  res.status(201).json({ user: publicUser(user) })
}))

r.post('/login', limiter, wrap(async (req, res) => {
  const body = loginSchema.parse(req.body)
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(body.email)
  if (!user || !bcrypt.compareSync(body.password, user.password_hash)) {
    throw unauthorized('Email or password is incorrect')
  }
  issueSession(res, user)
  res.json({ user: publicUser(user) })
}))

r.post('/logout', (req, res) => {
  clearSession(res)
  res.json({ ok: true })
})

r.get('/me', (req, res) => {
  res.json({ user: req.user ? publicUser(req.user) : null })
})

r.patch('/profile', requireAuth, wrap(async (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 80)
  const phone = String(req.body?.phone ?? '').trim().slice(0, 20)
  if (name.length < 2) throw unauthorized('Name must be at least 2 characters')
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name, phone, req.user.id)
  res.json({ user: { ...req.user, name, phone } })
}))

export default r
