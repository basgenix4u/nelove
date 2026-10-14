/** Public read APIs: catalog, home content, public settings, reviews, discounts. */
import { Router } from 'express'
import { db, mapProduct, loadStockMaps, getCms, getSetting } from '../db.js'
import { reviewSchema, discountValidateSchema } from '../validate.js'
import { wrap, notFound, bad } from '../lib/errors.js'

const r = Router()

const REVIEW_STATS = `
  SELECT product_id,
         ROUND(AVG(rating), 1) AS rating,
         COUNT(*) AS review_count
  FROM reviews WHERE status = 'approved' GROUP BY product_id`

r.get('/catalog', wrap(async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=30')
  const rows = db.prepare(`SELECT * FROM products WHERE active = 1 ORDER BY created_at`).all()
  const ids = rows.map((p) => p.id)
  const { imagesMap, stockMap } = loadStockMaps(ids)
  const stats = new Map(db.prepare(REVIEW_STATS).all().map((s) => [s.product_id, s]))
  const products = rows.map((row) => ({
    ...mapProduct(row, imagesMap, stockMap),
    rating: stats.get(row.id)?.rating ?? null,
    reviewCount: stats.get(row.id)?.review_count ?? 0,
  }))
  const categories = db.prepare('SELECT slug, name, description, image, sort_order AS sortOrder FROM categories ORDER BY sort_order').all()
  res.json({ products, categories })
}))

r.get('/home', wrap(async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=30')
  res.json({
    announcement: getCms('announcement', []),
    hero: getCms('hero', null),
    editorial: getCms('editorial', null),
    testimonials: getCms('testimonials', []),
    categories: db.prepare('SELECT slug, name, description, image, sort_order AS sortOrder FROM categories ORDER BY sort_order').all(),
    store: getSetting('store', {}),
    delivery: getSetting('delivery', {}),
  })
}))

r.get('/products/:id', wrap(async (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(req.params.id)
  if (!row) throw notFound('This piece is no longer available')
  const { imagesMap, stockMap } = loadStockMaps([row.id])
  const stats = db.prepare(`SELECT ROUND(AVG(rating),1) rating, COUNT(*) review_count FROM reviews WHERE product_id = ? AND status = 'approved'`).get(row.id)
  const product = mapProduct(row, imagesMap, stockMap)
  const related = db.prepare('SELECT * FROM products WHERE category = ? AND id != ? AND active = 1 LIMIT 4').all(row.category, row.id)
  const relIds = related.map((p) => p.id)
  const maps = loadStockMaps(relIds)
  res.json({
    product: { ...product, rating: stats.rating ?? null, reviewCount: stats.review_count ?? 0 },
    related: related.map((x) => mapProduct(x, maps.imagesMap, maps.stockMap)),
  })
}))

r.get('/products/:id/reviews', wrap(async (req, res) => {
  const rows = db.prepare(`
    SELECT id, name, rating, title, body, verified, helpful, created_at
    FROM reviews WHERE product_id = ? AND status = 'approved' ORDER BY helpful DESC, created_at DESC LIMIT 60
  `).all(req.params.id)
  const dist = [0, 0, 0, 0, 0]
  let sum = 0
  for (const row of rows) { dist[5 - row.rating]++; sum += row.rating }
  res.json({
    reviews: rows.map((x) => ({ ...x, date: x.created_at.slice(0, 10) })),
    summary: { count: rows.length, rating: rows.length ? Math.round((sum / rows.length) * 10) / 10 : null, dist },
  })
}))

r.post('/products/:id/reviews', wrap(async (req, res) => {
  const product = db.prepare('SELECT id FROM products WHERE id = ? AND active = 1').get(req.params.id)
  if (!product) throw notFound('Product not found')
  const body = reviewSchema.parse(req.body)
  let verified = 0
  if (req.user) {
    verified = db.prepare(`
      SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
      WHERE o.email = ? AND oi.product_id = ? AND o.status IN ('paid','processing','shipped','delivered') LIMIT 1
    `).get(req.user.email, product.id) ? 1 : 0
  }
  const info = db.prepare(`
    INSERT INTO reviews (product_id, user_id, name, rating, title, body, verified)
    VALUES (?,?,?,?,?,?,?)
  `).run(product.id, req.user?.id ?? null, body.name, body.rating, body.title, body.body, verified)
  const review = db.prepare('SELECT id, name, rating, title, body, verified, helpful, status, created_at FROM reviews WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json({ review, moderated: review.status === 'pending' })
}))

/** "Helpful" votes — one increment per request; idempotency is client-side. */
r.post('/products/:id/reviews/:rid/helpful', wrap(async (req, res) => {
  const info = db.prepare(
    "UPDATE reviews SET helpful = helpful + 1 WHERE id = ? AND product_id = ? AND status = 'approved'"
  ).run(req.params.rid, req.params.id)
  if (!info.changes) throw notFound('Review not found')
  const { helpful } = db.prepare('SELECT helpful FROM reviews WHERE id = ?').get(req.params.rid)
  res.json({ helpful })
}))

/** Newsletter capture — real rows, exportable from the admin. */
r.post('/subscribe', wrap(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw bad('BAD_EMAIL', 'Enter a valid email address')
  const existing = db.prepare('SELECT id FROM subscribers WHERE email = ?').get(email)
  if (existing) return res.json({ ok: true, already: true })
  db.prepare('INSERT INTO subscribers (email) VALUES (?)').run(email)
  res.status(201).json({ ok: true })
}))

r.get('/discounts/validate', wrap(async (req, res) => {
  const { code, subtotal } = discountValidateSchema.parse({ code: req.query.code, subtotal: req.query.subtotal })
  const d = db.prepare('SELECT * FROM discounts WHERE code = ? AND active = 1').get(code.toUpperCase())
  if (!d) throw bad('INVALID_CODE', 'That code isn’t valid')
  const now = new Date().toISOString()
  if (d.starts_at && now < d.starts_at) throw bad('NOT_STARTED', 'This code is not active yet')
  if (d.ends_at && now > d.ends_at) throw bad('EXPIRED', 'This code has expired')
  if (d.max_uses && d.used_count >= d.max_uses) throw bad('EXHAUSTED', 'This code has been fully used')
  if (subtotal < d.min_spend) throw bad('MIN_SPEND', `Spend at least ₦${d.min_spend.toLocaleString('en-NG')} to use this code`)
  const discount = d.type === 'percent' ? Math.round(subtotal * (d.value / 100)) : d.value
  res.json({ code: d.code, type: d.type, value: d.value, discount: Math.min(discount, subtotal) })
}))

export default r
