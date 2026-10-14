/** nelove API + production static server. */
import express from 'express'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import fs from 'node:fs'
import { config } from './config.js'
import { ready as dbReady, db } from './db.js'
import { attachUser, csrfGuard, ensureCsrfCookie } from './auth.js'
import { errorHandler, notFound } from './lib/errors.js'

import authRoutes from './routes/auth.js'
import storefrontRoutes from './routes/storefront.js'
import orderRoutes from './routes/orders.js'
import paymentRoutes from './routes/payments.js'
import adminRoutes from './routes/admin.js'

await dbReady

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

/* ------------------------------ security ------------------------------- */
app.use(helmet({
  contentSecurityPolicy: config.PROD
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          connectSrc: ["'self'"],
          frameSrc: ['https://checkout.paystack.com'],
          formAction: ["'self'"],
          objectSrc: ["'none'"],
        },
      }
    : false,
  crossOriginEmbedderPolicy: false,
}))
app.use(compression())

const globalLimiter = rateLimit({
  windowMs: 10 * 60e3, max: 900, standardHeaders: true, legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests — slow down a little' } },
})
app.use('/api', globalLimiter)

/* ------------------------------ parsing -------------------------------- */
app.use('/api/webhooks/paystack', express.json({
  verify: (req, _res, buf) => { req.rawBody = buf },
  limit: '100kb',
}))
app.use(express.json({ limit: '200kb' }))
app.use(cookieParser())

app.use('/api', attachUser, ensureCsrfCookie, csrfGuard)

/* ------------------------------- routes --------------------------------- */
app.use('/api/auth', authRoutes)
app.use('/api', storefrontRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/pay', paymentRoutes)
app.use('/api/webhooks/paystack', paymentRoutes) // exposes POST /webhook
app.use('/api/admin', adminRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }))

/* -------------------------- SEO files (prod) ---------------------------- */
app.get('/robots.txt', (req, res) => {
  const base = config.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: ${base}/sitemap.xml\n`)
})

app.get('/sitemap.xml', (req, res) => {
  const base = config.PUBLIC_URL || `${req.protocol}://${req.get('host')}`
  const products = db.prepare('SELECT id, updated_at FROM products WHERE active = 1').all()
  const urls = [
    ['', '1.0'], ['/#/shop', '0.9'], ['/#/shop/shoes', '0.8'], ['/#/shop/clothing', '0.8'], ['/#/shop/bags', '0.8'],
    ...products.map((p) => [`/#/product/${p.id}`, '0.7', p.updated_at]),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(([loc, pr, lm]) => `  <url><loc>${base}${loc}</loc>${lm ? `<lastmod>${lm.slice(0, 10)}</lastmod>` : ''}<priority>${pr}</priority></url>`)
    .join('\n')}\n</urlset>`
  res.type('application/xml').send(xml)
})

/* ------------------------- static + SPA fallback ------------------------ */
const distDir = path.join(config.ROOT, 'dist')
app.use('/uploads', express.static(path.join(config.ROOT, 'public', 'uploads'), { maxAge: '7d', immutable: false }))
// uploads that don't exist must 404 (never fall through to the SPA)
app.use('/uploads', (_req, _res, next) => next(notFound('File not found')))
if (config.PROD && fs.existsSync(distDir)) {
  app.use(express.static(distDir, {
    maxAge: '1y',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-store')
    },
  }))
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')))
} else if (config.PROD) {
  console.warn('[server] dist/ not found — run `npm run build` first. API-only mode.')
}

/* ------------------------------ 404 + errors ----------------------------- */
app.use('/api', (_req, _res, next) => next(notFound('Endpoint not found')))
app.use(errorHandler)

app.listen(config.PORT, () => {
  console.log(`[nelove] API ${config.PROD ? '+ app' : ''} listening on :${config.PORT} (${config.PROD ? 'production' : 'development'})`)
  console.log(`[nelove] payments: ${config.PAYSTACK_SECRET_KEY ? 'paystack ✓' : 'not configured (transfer/POD active)'}`)
  console.log(`[nelove] uploads: ${config.CLOUDINARY.configured ? 'cloudinary ✓' : 'local disk ✓'}`)
})

process.on('SIGTERM', () => process.exit(0))
process.on('SIGINT', () => process.exit(0))
