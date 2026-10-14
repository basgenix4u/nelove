/** Admin API: dashboard, products, categories, orders, customers, reviews,
 *  discounts, homepage CMS, settings, uploads. All behind requireAdmin. */
import { Router } from 'express'
import { requireAdmin } from '../auth.js'
import { db, mapProduct, loadStockMaps, getSetting } from '../db.js'
import { wrap, notFound, bad, conflict } from '../lib/errors.js'
import {
  productSchema, categorySchema, orderStatusSchema, discountSchema,
  reviewModerationSchema, settingsSchema, cmsSchema,
} from '../validate.js'
import { cloudinarySignature, localUpload, uploadsEnabled } from '../lib/uploads.js'
import path from 'node:path'
import fs from 'node:fs'
import { config } from '../config.js'

const r = Router()
r.use(requireAdmin)

/* ------------------------------ dashboard ------------------------------ */
r.get('/stats', wrap(async (_req, res) => {
  const c = (sql) => db.prepare(sql).get()
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) s, COUNT(*) c FROM orders WHERE status IN ('paid','processing','shipped','delivered')").get()
  const byStatus = Object.fromEntries(db.prepare('SELECT status, COUNT(*) c FROM orders GROUP BY status').all().map((x) => [x.status, x.c]))
  const recent = db.prepare('SELECT id, number, name, email, total, status, created_at AS createdAt FROM orders ORDER BY created_at DESC LIMIT 6').all()
  const lowStock = db.prepare(`
    SELECT p.name, v.value AS size, v.stock FROM product_variants v
    JOIN products p ON p.id = v.product_id
    WHERE v.stock <= 3 AND p.active = 1 ORDER BY v.stock LIMIT 8
  `).all()
  const trend = db.prepare(`
    SELECT date(created_at) d, COUNT(*) orders, SUM(total) revenue FROM orders
    WHERE status IN ('paid','processing','shipped','delivered') AND created_at >= date('now','-13 days')
    GROUP BY date(created_at) ORDER BY d
  `).all()
  res.json({
    revenue: revenue.s, paidOrders: revenue.c,
    products: c('SELECT COUNT(*) c FROM products WHERE active = 1').c,
    customers: c('SELECT COUNT(DISTINCT email) c FROM orders').c,
    pendingReviews: c("SELECT COUNT(*) c FROM reviews WHERE status = 'pending'").c,
    byStatus, recent, lowStock, trend,
  })
}))

/* ------------------------------ products ------------------------------ */
function fullProducts({ search = '', category = '', includeInactive = true, limit = 200, offset = 0 } = {}) {
  const where = ['1=1']
  const args = []
  if (!includeInactive) where.push('active = 1')
  if (category) { where.push('category = ?'); args.push(category) }
  if (search) { where.push('(name LIKE ? OR id LIKE ? OR line LIKE ?)'); args.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  const rows = db.prepare(`SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...args, limit, offset)
  const { imagesMap, stockMap } = loadStockMaps(rows.map((x) => x.id))
  const stats = new Map(db.prepare("SELECT product_id, ROUND(AVG(rating),1) rating, COUNT(*) c FROM reviews WHERE status='approved' GROUP BY product_id").all()
    .map((s) => [s.product_id, s]))
  return rows.map((row) => ({
    ...mapProduct(row, imagesMap, stockMap),
    rating: stats.get(row.id)?.rating ?? null,
    reviewCount: stats.get(row.id)?.c ?? 0,
    stockTotal: (stockMap.get(row.id) || []).reduce((s, v) => s + v.stock, 0),
  }))
}

r.get('/products', wrap(async (req, res) => {
  res.json({ products: fullProducts({ search: req.query.search || '', category: req.query.category || '' }) })
}))

r.get('/products/:id', wrap(async (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!row) throw notFound('Product not found')
  const { imagesMap, stockMap } = loadStockMaps([row.id])
  res.json({ product: mapProduct(row, imagesMap, stockMap) })
}))

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70)
}

r.post('/products', wrap(async (req, res) => {
  const body = productSchema.parse(req.body)
  const id = body.id || slugify(body.name)
  if (db.prepare('SELECT 1 FROM products WHERE id = ?').get(id)) throw conflict('ID_TAKEN', 'That product ID already exists')
  if (!db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(body.category)) throw bad('BAD_CATEGORY', 'Unknown category')
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO products (id, name, line, category, price, old_price, badge, short, description, details, colors, color_names, active)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, body.name, body.line, body.category, body.price, body.oldPrice ?? null, body.badge ?? null,
      body.short, body.description, JSON.stringify(body.details), JSON.stringify(body.colors), JSON.stringify(body.colorNames), body.active ? 1 : 0
    )
    const insImg = db.prepare('INSERT INTO product_images (product_id, url, position) VALUES (?,?,?)')
    body.images.forEach((url, i) => insImg.run(id, url, i))
    const sizes = Object.keys(body.stock)
    if (sizes.length === 0 && body.active) throw bad('NO_SIZES', 'Add at least one size with stock')
    const insVar = db.prepare('INSERT INTO product_variants (product_id, kind, value, stock) VALUES (?,?,?,?)')
    for (const s of sizes) insVar.run(id, 'size', s, body.stock[s])
  })
  tx()
  res.status(201).json({ id })
}))

r.put('/products/:id', wrap(async (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id)
  if (!existing) throw notFound('Product not found')
  const body = productSchema.parse({ ...req.body, id: req.params.id })
  const tx = db.transaction(() => {
    db.prepare(`UPDATE products SET name=?, line=?, category=?, price=?, old_price=?, badge=?, short=?, description=?, details=?, colors=?, color_names=?, active=?, updated_at=datetime('now')
      WHERE id=?`).run(
      body.name, body.line, body.category, body.price, body.oldPrice ?? null, body.badge ?? null,
      body.short, body.description, JSON.stringify(body.details), JSON.stringify(body.colors), JSON.stringify(body.colorNames), body.active ? 1 : 0,
      req.params.id
    )
    db.prepare('DELETE FROM product_images WHERE product_id = ?').run(req.params.id)
    const insImg = db.prepare('INSERT INTO product_images (product_id, url, position) VALUES (?,?,?)')
    body.images.forEach((url, i) => insImg.run(req.params.id, url, i))
    const current = new Map(db.prepare('SELECT value, stock FROM product_variants WHERE product_id = ?').all(req.params.id).map((v) => [v.value, v.stock]))
    const upsert = db.prepare('INSERT INTO product_variants (product_id, kind, value, stock) VALUES (?,?,?,?) ON CONFLICT(product_id, kind, value) DO UPDATE SET stock = excluded.stock')
    const wanted = new Set(Object.keys(body.stock))
    for (const [size, stock] of Object.entries(body.stock)) upsert.run(req.params.id, 'size', size, stock)
    for (const size of current.keys()) if (!wanted.has(size)) db.prepare('DELETE FROM product_variants WHERE product_id = ? AND value = ?').run(req.params.id, size)
  })
  tx()
  res.json({ ok: true })
}))

r.delete('/products/:id', wrap(async (req, res) => {
  const info = db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id)
  if (!info.changes) throw notFound('Product not found')
  res.json({ ok: true, archived: true })
}))

/* ------------------------------ categories ----------------------------- */
r.post('/categories', wrap(async (req, res) => {
  const body = categorySchema.parse(req.body)
  if (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(body.slug)) throw conflict('SLUG_TAKEN', 'That slug already exists')
  db.prepare('INSERT INTO categories (slug, name, description, image, sort_order) VALUES (?,?,?,?,?)')
    .run(body.slug, body.name, body.description, body.image, body.sortOrder)
  res.status(201).json({ ok: true })
}))

r.put('/categories/:slug', wrap(async (req, res) => {
  const body = categorySchema.parse({ ...req.body, slug: req.params.slug })
  const info = db.prepare('UPDATE categories SET name=?, description=?, image=?, sort_order=? WHERE slug=?')
    .run(body.name, body.description, body.image, body.sortOrder, req.params.slug)
  if (!info.changes) throw notFound('Category not found')
  res.json({ ok: true })
}))

r.delete('/categories/:slug', wrap(async (req, res) => {
  const used = db.prepare('SELECT COUNT(*) c FROM products WHERE category = ?').get(req.params.slug).c
  if (used > 0) throw conflict('CATEGORY_IN_USE', `${used} products still use this category — reassign them first`)
  const info = db.prepare('DELETE FROM categories WHERE slug = ?').run(req.params.slug)
  if (!info.changes) throw notFound('Category not found')
  res.json({ ok: true })
}))

/* -------------------------------- orders ------------------------------- */
const ORDER_COLS = `id, number, user_id AS userId, email, name, phone, address, city, state,
  delivery_method AS deliveryMethod, delivery_fee AS deliveryFee, eta,
  payment_method AS paymentMethod, paystack_ref AS paystackRef, discount_code AS discountCode,
  subtotal, discount, total, status, admin_note AS adminNote, created_at AS createdAt, updated_at AS updatedAt`

r.get('/orders', wrap(async (req, res) => {
  const where = []
  const args = []
  if (req.query.status) { where.push('status = ?'); args.push(req.query.status) }
  if (req.query.search) { where.push('(number LIKE ? OR email LIKE ? OR name LIKE ?)'); args.push(`%${req.query.search}%`, `%${req.query.search}%`, `%${req.query.search}%`) }
  const orders = db.prepare(`SELECT ${ORDER_COLS} FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 300`).all(...args)
  const items = db.prepare('SELECT * FROM order_items ORDER BY id').all()
  const byOrder = new Map()
  for (const i of items) {
    if (!byOrder.has(i.order_id)) byOrder.set(i.order_id, [])
    byOrder.get(i.order_id).push(i)
  }
  res.json({ orders: orders.map((o) => ({ ...o, items: byOrder.get(o.id) || [] })) })
}))

r.get('/orders/:id', wrap(async (req, res) => {
  const order = db.prepare(`SELECT ${ORDER_COLS} FROM orders WHERE id = ?`).get(req.params.id)
  if (!order) throw notFound('Order not found')
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
  res.json({ order: { ...order, items } })
}))

const TRANSITIONS = {
  pending: ['paid', 'cancelled', 'failed'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: ['pending'],
  failed: ['pending'],
}

r.put('/orders/:id/status', wrap(async (req, res) => {
  const { status, note } = orderStatusSchema.parse(req.body)
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)
  if (!order) throw notFound('Order not found')
  if (status !== order.status && !TRANSITIONS[order.status]?.includes(status)) {
    throw bad('BAD_TRANSITION', `Cannot move ${order.status} → ${status}`)
  }
  db.prepare("UPDATE orders SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, note || order.admin_note, order.id)
  // restock on cancellation
  if (status === 'cancelled' && order.status !== 'cancelled') {
    const items = db.prepare('SELECT product_id, size, qty FROM order_items WHERE order_id = ?').all(order.id)
    const restock = db.prepare('UPDATE product_variants SET stock = stock + ? WHERE product_id = ? AND value = ?')
    for (const i of items) if (i.size) restock.run(i.qty, i.product_id, i.size)
  }
  res.json({ ok: true })
}))

/* ------------------------------- customers ----------------------------- */
r.get('/customers', wrap(async (_req, res) => {
  const rows = db.prepare(`
    SELECT email, MAX(name) name, COUNT(*) orders, SUM(CASE WHEN status IN ('paid','processing','shipped','delivered') THEN total ELSE 0 END) spent,
           MAX(created_at) lastOrder
    FROM orders GROUP BY email ORDER BY lastOrder DESC LIMIT 400
  `).all()
  const registered = new Set(db.prepare("SELECT email FROM users WHERE role = 'customer'").all().map((u) => u.email))
  res.json({ customers: rows.map((x) => ({ ...x, registered: registered.has(x.email) })) })
}))

/* -------------------------------- reviews ------------------------------ */
r.get('/reviews', wrap(async (req, res) => {
  const status = ['pending', 'approved', 'hidden'].includes(req.query.status) ? req.query.status : null
  const rows = db.prepare(`
    SELECT rv.id, rv.product_id AS productId, p.name AS productName, rv.name, rv.rating, rv.title, rv.body,
           rv.status, rv.verified, rv.helpful, rv.created_at AS createdAt
    FROM reviews rv JOIN products p ON p.id = rv.product_id
    ${status ? 'WHERE rv.status = ?' : ''}
    ORDER BY CASE rv.status WHEN 'pending' THEN 0 ELSE 1 END, rv.created_at DESC LIMIT 300
  `).all(...(status ? [status] : []))
  res.json({ reviews: rows, pendingCount: db.prepare("SELECT COUNT(*) c FROM reviews WHERE status = 'pending'").get().c })
}))

r.put('/reviews/:id', wrap(async (req, res) => {
  const { status } = reviewModerationSchema.parse(req.body)
  const info = db.prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, req.params.id)
  if (!info.changes) throw notFound('Review not found')
  res.json({ ok: true })
}))

r.delete('/reviews/:id', wrap(async (req, res) => {
  const info = db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id)
  if (!info.changes) throw notFound('Review not found')
  res.json({ ok: true })
}))

/* ------------------------------- discounts ----------------------------- */
r.get('/discounts', wrap(async (_req, res) => {
  res.json({
    discounts: db.prepare(`SELECT code, type, value, min_spend AS minSpend, starts_at AS startsAt, ends_at AS endsAt,
      max_uses AS maxUses, used_count AS usedCount, active, created_at AS createdAt FROM discounts ORDER BY created_at DESC`).all(),
  })
}))

r.post('/discounts', wrap(async (req, res) => {
  const body = discountSchema.parse(req.body)
  if (db.prepare('SELECT 1 FROM discounts WHERE code = ?').get(body.code)) throw conflict('CODE_TAKEN', 'That code already exists')
  db.prepare('INSERT INTO discounts (code, type, value, min_spend, starts_at, ends_at, max_uses, active) VALUES (?,?,?,?,?,?,?,?)')
    .run(body.code, body.type, body.value, body.minSpend, body.startsAt || null, body.endsAt || null, body.maxUses ?? null, body.active ? 1 : 0)
  res.status(201).json({ ok: true })
}))

r.put('/discounts/:code', wrap(async (req, res) => {
  const body = discountSchema.parse({ ...req.body, code: req.params.code.toUpperCase() })
  const info = db.prepare('UPDATE discounts SET type=?, value=?, min_spend=?, starts_at=?, ends_at=?, max_uses=?, active=? WHERE code=?')
    .run(body.type, body.value, body.minSpend, body.startsAt || null, body.endsAt || null, body.maxUses ?? null, body.active ? 1 : 0, req.params.code.toUpperCase())
  if (!info.changes) throw notFound('Discount not found')
  res.json({ ok: true })
}))

r.delete('/discounts/:code', wrap(async (req, res) => {
  db.prepare('UPDATE discounts SET active = 0 WHERE code = ?').run(req.params.code.toUpperCase())
  res.json({ ok: true })
}))

/* ----------------------------- CMS + settings -------------------------- */
r.put('/content', wrap(async (req, res) => {
  const body = cmsSchema.parse(req.body)
  const up = db.prepare('INSERT INTO cms (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  db.transaction(() => {
    up.run('announcement', JSON.stringify(body.announcement))
    up.run('hero', JSON.stringify(body.hero))
    up.run('editorial', JSON.stringify(body.editorial))
    up.run('testimonials', JSON.stringify(body.testimonials))
  })()
  res.json({ ok: true })
}))

r.put('/settings', wrap(async (req, res) => {
  const body = settingsSchema.parse(req.body)
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  db.transaction(() => {
    up.run('store', JSON.stringify(body.store))
    up.run('delivery', JSON.stringify(body.delivery))
  })()
  res.json({ ok: true })
}))

/* ------------------------------ subscribers ---------------------------- */
r.get('/subscribers', wrap(async (_req, res) => {
  res.json({ subscribers: db.prepare('SELECT id, email, created_at AS createdAt FROM subscribers ORDER BY created_at DESC LIMIT 2000').all() })
}))

r.get('/subscribers.csv', wrap(async (_req, res) => {
  const rows = db.prepare('SELECT email, created_at FROM subscribers ORDER BY created_at DESC').all()
  res.set('Content-Type', 'text/csv')
  res.set('Content-Disposition', 'attachment; filename="nelove-subscribers.csv"')
  res.send('email,subscribed_at\n' + rows.map((x) => `${x.email},${x.created_at}`).join('\n'))
}))

/* -------------------------------- uploads ------------------------------ */
r.get('/uploads/config', wrap(async (_req, res) => {
  res.json(uploadsEnabled())
}))

r.get('/uploads/signature', wrap(async (_req, res) => {
  const sig = cloudinarySignature()
  if (!sig) throw bad('CLOUDINARY_OFF', 'Cloudinary is not configured — local uploads will be used')
  res.json(sig)
}))

r.post('/uploads', localUpload.single('file'), wrap(async (req, res) => {
  if (!req.file) throw bad('NO_FILE', 'No file received')
  const url = `/uploads/${req.file.filename}`
  res.status(201).json({ url })
}))

r.delete('/uploads/:file', wrap(async (req, res) => {
  const safe = path.basename(req.params.file)
  const p = path.join(config.ROOT, 'public', 'uploads', safe)
  if (fs.existsSync(p)) fs.unlinkSync(p)
  res.json({ ok: true })
}))

export default r
