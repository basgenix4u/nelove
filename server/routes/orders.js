/** Order creation + customer order views, with payment wiring. */
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { customAlphabet } from 'nanoid'
import { db, getSetting, mapProduct, loadStockMaps } from '../db.js'
import { orderSchema } from '../validate.js'
import { wrap, bad, conflict, notFound } from '../lib/errors.js'
import { datePlusDaysCompat } from '../lib/helpers.js'

const r = Router()
const orderNumber = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6)

const orderLimiter = rateLimit({
  windowMs: 60 * 60e3, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many orders from this device — try again later' } },
})

function computeDelivery(method, subtotal, delivery) {
  const feeMap = { standard: delivery.standard_fee, express: delivery.express_fee, pickup: delivery.pickup_fee ?? 0 }
  const fee = method === 'standard' && subtotal >= delivery.free_ship_threshold ? 0 : (feeMap[method] ?? delivery.standard_fee)
  const today = new Date().toISOString().slice(0, 10)
  const eta = method === 'express'
    ? `Tomorrow, ${datePlusDaysCompat(today, 1)}`
    : method === 'pickup'
      ? `${datePlusDaysCompat(today, 1)} from 10am`
      : `${datePlusDaysCompat(today, 2)} – ${datePlusDaysCompat(today, 5)}`
  return { fee, eta }
}

function validDiscount(code, subtotal) {
  if (!code) return { code: null, amount: 0 }
  const d = db.prepare('SELECT * FROM discounts WHERE code = ? AND active = 1').get(code.toUpperCase())
  if (!d) return { code: null, amount: 0 }
  const now = new Date().toISOString()
  if ((d.starts_at && now < d.starts_at) || (d.ends_at && now > d.ends_at)) return { code: null, amount: 0 }
  if (d.max_uses && d.used_count >= d.max_uses) return { code: null, amount: 0 }
  if (subtotal < d.min_spend) return { code: null, amount: 0 }
  return { code: d.code, amount: Math.min(d.type === 'percent' ? Math.round(subtotal * (d.value / 100)) : d.value, subtotal) }
}

/** Shared pricing pipeline — used by /quote and POST /. Throws on stale/empty/out-of-stock. */
function priceLines(body) {
  const delivery = getSetting('delivery', {})
  const getProd = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1')
  const getVar = db.prepare('SELECT stock FROM product_variants WHERE product_id = ? AND value = ?')
  const { imagesMap, stockMap } = loadStockMaps(body.items.map((i) => i.productId))

  const lines = []
  for (const item of body.items) {
    const row = getProd.get(item.productId)
    if (!row) throw bad('UNKNOWN_PRODUCT', 'One of the items is no longer available')
    const p = mapProduct(row, imagesMap, stockMap)
    const size = item.size || (p.sizes.length === 1 ? p.sizes[0] : null)
    if (p.sizes.length > 1 && !size) throw bad('SIZE_REQUIRED', `Choose a size for ${p.name}`, { productId: p.id })
    if (size && !p.sizes.includes(size)) throw bad('BAD_SIZE', `Size ${size} is not offered for ${p.name}`)
    let stock = null
    if (size) {
      stock = getVar.get(p.id, size)?.stock ?? 0
      if (stock < item.qty) {
        throw conflict('OUT_OF_STOCK', stock === 0
          ? `${p.name} (size ${size}) just sold out`
          : `Only ${stock} left of ${p.name} (size ${size})`, { productId: p.id, size, stock })
      }
    }
    lines.push({ p, size, color: item.color || p.colorNames?.[0] || '', qty: item.qty, stock })
  }

  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
  const dc = validDiscount(body.discountCode, subtotal)
  // free-shipping threshold applies to merchandise subtotal (pre-discount)
  const { fee, eta } = computeDelivery(body.deliveryMethod, subtotal, delivery)
  return { lines, subtotal, discount: dc, fee, eta, total: subtotal - dc.amount + fee }
}

/** Server-authoritative price quote for the cart/checkout UI (no persistence). */
r.post('/quote', orderLimiter, wrap(async (req, res) => {
  const body = orderSchema.pick({
    items: true, deliveryMethod: true, paymentMethod: true, discountCode: true,
  }).parse(req.body)
  const q = priceLines(body)
  res.json({
    subtotal: q.subtotal,
    discount: q.discount.amount,
    discountCode: q.discount.code,
    deliveryFee: q.fee,
    eta: q.eta,
    total: q.total,
    lines: q.lines.map((l) => ({ productId: l.p.id, name: l.p.name, price: l.p.price, qty: l.qty, size: l.size, color: l.color, image: l.p.image, stock: l.stock })),
  })
}))

r.post('/', orderLimiter, wrap(async (req, res) => {
  const body = orderSchema.parse(req.body)
  const { lines, subtotal, discount: dc, fee, eta, total } = priceLines(body)

  let number, order
  const tx = db.transaction(() => {
    do { number = `NLV-${orderNumber()}` } while (db.prepare('SELECT 1 FROM orders WHERE number = ?').get(number))
    const ref = `${number}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const info = db.prepare(`
      INSERT INTO orders (number, user_id, email, name, phone, address, city, state, delivery_method, delivery_fee, eta,
        payment_method, paystack_ref, discount_code, subtotal, discount, total, status)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')
    `).run(
      number, req.user?.id ?? null, body.customer.email, body.customer.name, body.customer.phone,
      body.customer.address, body.customer.city, body.customer.state,
      body.deliveryMethod, fee, eta, body.paymentMethod, ref, dc.code, subtotal, dc.amount, total
    )
    const orderId = info.lastInsertRowid
    const insItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, name, price, qty, size, color, image)
      VALUES (?,?,?,?,?,?,?,?)
    `)
    const decStock = db.prepare('UPDATE product_variants SET stock = stock - ? WHERE product_id = ? AND value = ? AND stock >= ?')
    for (const l of lines) {
      insItem.run(orderId, l.p.id, l.p.name, l.p.price, l.qty, l.size, l.color, l.p.image)
      if (l.size) {
        const res = decStock.run(l.qty, l.p.id, l.size, l.qty)
        if (res.changes === 0) throw conflict('OUT_OF_STOCK', `${l.p.name} (size ${l.size}) just sold out`)
      }
    }
    if (dc.code) db.prepare('UPDATE discounts SET used_count = used_count + 1 WHERE code = ?').run(dc.code)
    order = db.prepare('SELECT id, number, paystack_ref AS paystackRef, email, name, address, city, state, delivery_method AS deliveryMethod, delivery_fee AS deliveryFee, eta, payment_method AS paymentMethod, discount_code AS discountCode, subtotal, discount, total, status, created_at AS createdAt FROM orders WHERE id = ?').get(orderId)
  })
  tx()

  const items = lines.map((l) => ({ name: l.p.name, price: l.p.price, qty: l.qty, size: l.size, color: l.color, image: l.p.image }))
  res.status(201).json({ order, items })
}))

r.get('/mine', wrap(async (req, res) => {
  if (!req.user) return res.json({ orders: [] })
  const orders = db.prepare(`
    SELECT id, number, total, status, eta, delivery_method AS deliveryMethod, created_at AS createdAt,
           payment_method AS paymentMethod
    FROM orders WHERE email = ? ORDER BY created_at DESC LIMIT 50
  `).all(req.user.email)
  const items = db.prepare(`
    SELECT oi.* FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.email = ? ORDER BY oi.order_id DESC
  `).all(req.user.email)
  const byOrder = new Map()
  for (const i of items) {
    if (!byOrder.has(i.order_id)) byOrder.set(i.order_id, [])
    byOrder.get(i.order_id).push(i)
  }
  res.json({ orders: orders.map((o) => ({ ...o, items: byOrder.get(o.id) || [] })) })
}))

export default r
