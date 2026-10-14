/** Paystack payment lifecycle: initialize → verify (+webhook). */
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { db } from '../db.js'
import { initializeTransaction, verifyTransaction, verifyWebhookSignature, paystackConfigured } from '../lib/paystack.js'
import { wrap, notFound, bad, ApiError } from '../lib/errors.js'
import { config } from '../config.js'

const r = Router()

const payLimiter = rateLimit({
  windowMs: 60 * 60e3, max: 40, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts — try again later' } },
})

function markPaid(reference, amountKobo) {
  const order = db.prepare('SELECT * FROM orders WHERE paystack_ref = ?').get(reference)
  if (!order) return null
  if (amountKobo != null && Number(amountKobo) !== order.total * 100) return order // mismatched amount — leave pending
  if (['pending', 'failed'].includes(order.status)) {
    db.prepare("UPDATE orders SET status = 'paid', updated_at = datetime('now') WHERE id = ?").run(order.id)
  }
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id)
}

r.post('/initialize', payLimiter, wrap(async (req, res) => {
  const { orderNumber } = req.body || {}
  if (!orderNumber) throw bad('MISSING_ORDER', 'Order number required')
  const order = db.prepare('SELECT * FROM orders WHERE number = ?').get(String(orderNumber))
  if (!order) throw notFound('Order not found')
  if (order.status === 'paid') return res.json({ alreadyPaid: true, number: order.number })
  if (!['pending', 'failed'].includes(order.status)) throw bad('ORDER_LOCKED', 'This order can no longer be paid online')
  if (!paystackConfigured()) {
    throw new ApiError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online card payment is being configured — choose bank transfer or pay on delivery')
  }
  const callbackUrl = `${config.PUBLIC_URL}/#/payment/callback`
  const data = await initializeTransaction({
    email: order.email,
    amountNaira: order.total,
    reference: order.paystack_ref,
    callbackUrl,
    metadata: { order_number: order.number, customer: order.name },
  })
  res.json({ authorizationUrl: data.authorization_url, reference: data.reference })
}))

r.get('/verify', payLimiter, wrap(async (req, res) => {
  const reference = String(req.query.reference || '')
  if (!reference) throw bad('MISSING_REFERENCE', 'Payment reference required')
  const order = db.prepare('SELECT * FROM orders WHERE paystack_ref = ?').get(reference)
  if (!order) throw notFound('We could not find this payment reference')
  if (order.status === 'paid') return res.json({ status: 'paid', order: orderSummary(order) })
  if (!paystackConfigured()) throw new ApiError(503, 'PAYMENTS_NOT_CONFIGURED', 'Online payment is not configured yet')
  const data = await verifyTransaction(reference)
  if (data.status === 'success') {
    const updated = markPaid(reference, data.amount)
    return res.json({ status: 'paid', order: orderSummary(updated) })
  }
  db.prepare("UPDATE orders SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(order.id)
  res.json({ status: data.status || 'failed', order: orderSummary(order) })
}))

function orderSummary(orderRow) {
  const items = db.prepare('SELECT name, price, qty, size, color, image FROM order_items WHERE order_id = ?').all(orderRow.id)
  return {
    id: orderRow.id, number: orderRow.number, email: orderRow.email, name: orderRow.name,
    address: `${orderRow.address}, ${orderRow.city}, ${orderRow.state}`,
    eta: orderRow.eta, payment: orderRow.payment_method, subtotal: orderRow.subtotal,
    discount: orderRow.discount, deliveryFee: orderRow.delivery_fee,
    total: orderRow.total, status: orderRow.status, createdAt: orderRow.created_at,
    items,
  }
}

/** Webhook: raw body + HMAC verification handled in index.js mount. */
r.post('/webhook', wrap(async (req, res) => {
  const signature = req.get('x-paystack-signature')
  if (!verifyWebhookSignature(req.rawBody || JSON.stringify(req.body), signature)) {
    return res.status(401).json({ error: { code: 'BAD_SIGNATURE', message: 'Invalid signature' } })
  }
  const event = req.body
  if (event?.event === 'charge.success' && event.data?.reference) {
    markPaid(event.data.reference, event.data.amount)
    console.log(`[webhook] charge.success → order marked paid (ref ${event.data.reference})`)
  }
  res.sendStatus(200)
}))

export default r
