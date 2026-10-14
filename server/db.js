/** Database: open, migrate, and seed-on-first-run. */
import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'

const serverDir = path.dirname(fileURLToPath(import.meta.url))

export const db = new Database(config.DB_FILE)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/* ------------------------------- migrate ------------------------------ */
const migDir = path.join(serverDir, 'migrations')
db.exec(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`)
const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map((r) => r.name))
for (const file of fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()) {
  if (applied.has(file)) continue
  db.transaction(() => {
    db.exec(fs.readFileSync(path.join(migDir, file), 'utf8'))
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
  })()
  console.log(`[db] migration applied: ${file}`)
}

/* -------------------------------- seed -------------------------------- */
async function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) c FROM products').get().c
  if (count > 0) return
  console.log('[db] empty database — seeding catalogue, content and settings…')

  const { products } = await import(pathToFileURLCompat(path.join(config.ROOT, 'src/data/products.js')))

  const insCat = db.prepare('INSERT INTO categories (slug, name, description, image, sort_order) VALUES (?,?,?,?,?)')
  const insProd = db.prepare(`INSERT INTO products (id, name, line, category, price, old_price, badge, short, description, details, colors, color_names)
    VALUES (@id, @name, @line, @category, @price, @old_price, @badge, @short, @description, @details, @colors, @color_names)`)
  const insImg = db.prepare('INSERT INTO product_images (product_id, url, position) VALUES (?,?,?)')
  const insVar = db.prepare('INSERT INTO product_variants (product_id, kind, value, stock) VALUES (?,?,?,?)')
  const insRev = db.prepare(`INSERT INTO reviews (product_id, name, rating, title, body, status, verified, helpful, created_at)
    VALUES (?,?,?,?,?,?,?,?,?)`)

  db.transaction(() => {
    insCat.run('shoes', 'Shoes', 'The Legacy Shoe Room — handcrafted footwear.', '/images/shoe-onyx.jpg', 1)
    insCat.run('clothing', 'Clothing', 'The Untold Story — tailored & occasion.', '/images/cloth-sunset-gown.jpg', 2)
    insCat.run('bags', 'Bags', 'The Nomad Edit — carry everything.', '/images/bag-sahara.jpg', 3)

    for (const p of products) {
      insProd.run({
        id: p.id, name: p.name, line: p.line, category: p.category,
        price: p.price, old_price: p.oldPrice ?? null, badge: p.badge ?? null,
        short: p.short, description: p.description,
        details: JSON.stringify(p.details || []),
        colors: JSON.stringify(p.colors || []),
        color_names: JSON.stringify(p.colorNames || []),
      })
      insImg.run(p.id, p.image, 0)
      for (const [i, size] of (p.sizes || []).entries()) {
        insVar.run(p.id, 'size', size, size === 'One Size' ? 25 : 8 + ((i * 7) % 9))
      }
      for (const r of p.reviews || []) {
        insRev.run(p.id, r.name, r.rating, r.title, r.body, 'approved', r.verified ? 1 : 0, r.helpful, isoFrom(r.date))
      }
    }

    const insSet = db.prepare('INSERT INTO settings (key, value) VALUES (?,?)')
    insSet.run('delivery', JSON.stringify({
      standard_fee: 2500, express_fee: 5000, pickup_fee: 0,
      free_ship_threshold: 75000,
      standard_eta: '2–4 working days', express_eta: 'Next working day',
    }))
    insSet.run('store', JSON.stringify({
      name: 'nelove',
      tagline: 'Your wardrobe. All in one place.',
      email: 'hello@nelove.ng',
      phone: '+234 803 000 0000',
      address: '14 Admiralty Way, Lekki Phase 1, Lagos',
      currency: '₦',
      bank_name: 'Wema Bank',
      bank_account_name: 'nelove Studios Ltd',
      bank_account_number: '0123456789',
    }))
    insSet.run('paystack', JSON.stringify({ enabled: true }))

    const insCms = db.prepare('INSERT INTO cms (key, value) VALUES (?,?)')
    insCms.run('announcement', JSON.stringify([
      'Free delivery in Lagos & Abuja over ₦75,000',
      'New season — The Golden Hour Edit is live',
      'Easy 30-day returns, always',
      'Pay on delivery available nationwide',
    ]))
    insCms.run('hero', JSON.stringify({
      eyebrow: 'New season · The Golden Hour Edit',
      headline_a: 'Your wardrobe.',
      headline_b: 'All in one place.',
      sub: 'Shoes, clothing & bags for people who dress like they mean it. nelove curates, you decide. Designed in Lagos — worn everywhere.',
      cta_primary: { label: 'Shop the collection →', to: '/shop' },
      cta_secondary: { label: 'Explore shoes', to: '/shop/shoes' },
      micro: 'Free delivery over ₦75,000 · Pay on delivery nationwide · 30-day returns',
      featured_product: 'aira-court-sneaker',
    }))
    insCms.run('editorial', JSON.stringify({
      kicker: '04 — The house',
      headline_a: 'Designed in Lagos.',
      headline_b: 'Worn everywhere.',
      body: 'nelove began in a two-room atelier off Admiralty Way with one conviction: that world-class craft doesn’t need a foreign postcode. Today our shoes are welted, our silks are draped and our leathers are cut in Lagos — then shipped to wardrobes on four continents.',
      cta_label: 'Discover heritage, reimagined',
      image_main: '/images/cloth-zuri.jpg',
      image_float: '/images/editorial.jpg',
    }))
    insCms.run('testimonials', JSON.stringify([
      { quote: 'nelove is my first stop now. The quality rivals the international houses I used to import from — delivered to my door in Yaba within days.', name: 'Adaeze O.', role: 'Creative director, Lagos' },
      { quote: 'I styled three editorials with their pieces last season. The tailoring, the leather — it photographs like quiet luxury and wears like a dream.', name: 'Kemi A.', role: 'Fashion stylist, Abuja' },
      { quote: 'Ordered Tuesday, wore it to a wedding Saturday. Three people asked for the brand before the reception ended.', name: 'Tunde B.', role: 'Architect, Port Harcourt' },
    ]))

    const insDisc = db.prepare('INSERT INTO discounts (code, type, value, min_spend, active) VALUES (?,?,?,?,1)')
    insDisc.run('WELCOME10', 'percent', 10, 0)
    insDisc.run('LAGOS5K', 'flat', 5000, 50000)
  })()
  console.log('[db] catalogue seeded ✓')

  // Admin account
  const password = config.ADMIN_PASSWORD || 'nelove-admin-2026'
  db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?,?,?,?)')
    .run(config.ADMIN_EMAIL, bcrypt.hashSync(password, 10), 'Store Admin', 'admin')
  console.log(`[db] admin created: ${config.ADMIN_EMAIL}${config.ADMIN_PASSWORD ? ' (password from env)' : ` (default password — change it!${config.PROD ? '' : ' nelove-admin-2026'})`}`)
}

function isoFrom(dateStr) {
  const d = new Date(dateStr)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

function pathToFileURLCompat(p) {
  const resolved = path.resolve(p)
  return new URL(`file://${resolved.startsWith('/') ? '' : '/'}${resolved}`).href
}

/* ------------------------- shared row mappers ------------------------- */
const parseJ = (v, fb) => { try { return JSON.parse(v) } catch { return fb } }

export function mapProduct(row, imagesMap, stockMap) {
  return {
    id: row.id, name: row.name, line: row.line, category: row.category,
    price: row.price, oldPrice: row.old_price, badge: row.badge,
    short: row.short, description: row.description,
    details: parseJ(row.details, []),
    colors: parseJ(row.colors, []),
    colorNames: parseJ(row.color_names, []),
    images: imagesMap.get(row.id) || [],
    image: (imagesMap.get(row.id) || [])[0] || '',
    sizes: (stockMap.get(row.id) || []).map((v) => v.value),
    stock: Object.fromEntries((stockMap.get(row.id) || []).map((v) => [v.value, v.stock])),
    active: !!row.active,
    createdAt: row.created_at,
  }
}

export function loadStockMaps(productIds) {
  const imagesMap = new Map()
  const stockMap = new Map()
  if (!productIds.length) return { imagesMap, stockMap }
  const qs = productIds.map(() => '?').join(',')
  const imgs = db.prepare(`SELECT product_id, url FROM product_images WHERE product_id IN (${qs}) ORDER BY position`).all(...productIds)
  for (const i of imgs) {
    if (!imagesMap.has(i.product_id)) imagesMap.set(i.product_id, [])
    imagesMap.get(i.product_id).push(i.url)
  }
  const vars = db.prepare(`SELECT product_id, value, stock FROM product_variants WHERE product_id IN (${qs}) ORDER BY value`).all(...productIds)
  for (const v of vars) {
    if (!stockMap.has(v.product_id)) stockMap.set(v.product_id, [])
    stockMap.get(v.product_id).push(v)
  }
  return { imagesMap, stockMap }
}

export function getCms(key, fallback = null) {
  const row = db.prepare('SELECT value FROM cms WHERE key = ?').get(key)
  return row ? parseJ(row.value, fallback) : fallback
}
export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key)
  return row ? parseJ(row.value, fallback) : fallback
}

export const ready = seedIfEmpty()
