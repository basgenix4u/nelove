# nelove — production e-commerce platform

**Live:** https://nelove.onrender.com · **Repo:** https://github.com/basgenix4u/nelove (public) · **Admin:** https://nelove.onrender.com/#/admin

A full-stack fashion e-commerce build: Oryze-inspired storefront, a real Express + SQLite backend, secure admin dashboard, Paystack payments and Cloudinary uploads — with zero fake functionality.

## Stack

| Layer        | Choice                                                                 |
| ------------ | ---------------------------------------------------------------------- |
| Frontend     | React 19, React Router (hash), Vite 8                                  |
| API          | Express 4, helmet, compression, express-rate-limit, cookie-based JWT   |
| Database     | SQLite via better-sqlite3 (transactional, WAL, migrations in folder)   |
| Auth         | bcrypt(10) passwords, JWT in httpOnly SameSite=Lax cookie, CSRF double-submit |
| Payments     | Paystack — server-side initialize, verify, and HMAC-SHA512 webhook      |
| Images       | Cloudinary signed uploads, with a real local-disk fallback             |

## Quick start (development)

```bash
npm install
cp .env.example .env          # fill in JWT_SECRET at minimum
npm run dev                   # storefront → http://localhost:5173 (proxies /api)
npm run dev:api               # API → http://localhost:8787
```

The database (`nelove.db`) auto-creates, migrates and seeds (19 products, categories, reviews, homepage CMS, delivery settings, two discount codes) on first boot.

**Admin:** `http://localhost:5173/#/admin` — sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

## Production

```bash
npm run build     # builds the SPA into dist/ and syntax-checks the server
npm start         # serves the built app AND the API on one port
```

Set `NODE_ENV=production` (the `start` script does), plus real values for every variable in `.env.example`. In production the session cookie is `Secure` — serve over HTTPS only.

## Configuration (`.env`)

| Variable                | Purpose                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `PORT`                  | API/app port (default `8787`)                                  |
| `PUBLIC_URL`            | Public base URL — used for the Paystack callback and sitemap   |
| `DB_FILE`               | SQLite file path                                               |
| `JWT_SECRET`            | Long random hex — session signing                              |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First-run admin account (change before deploy)        |
| `PAYSTACK_SECRET_KEY`   | Enables card payments. **Blank** = storefront honestly steers customers to bank transfer / pay-on-delivery instead of pretending card works |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | Signed uploads to Cloudinary. Blank = uploads stored on server disk under `public/uploads` |

No secrets exist in this repository — everything above comes from the environment.

## How the important flows work

- **Checkout** — all pricing is server-authoritative: `POST /api/orders/quote` validates stock (per size), discounts, delivery fee/threshold in one pass; the summary you see is the summary you're charged. `POST /api/orders` runs inside a single SQLite transaction (create + atomic stock decrement + discount use count).
- **Card payment** — `POST /api/pay/initialize` creates a Paystack transaction that redirects the customer to Paystack's hosted page. Return URL → `/#/payment/callback` → server `verify` marks the order paid. The same order gets marked paid by the `/api/pay/webhook` HMAC-verified webhook (handles browser-abandoned flows). Amount is re-checked on the server. No card numbers touch this codebase.
- **Bank transfer / pay on delivery** — order is placed `pending`; the confirmation page shows the bank details configured in Admin → Settings. Admins mark it paid when the transfer lands.
- **Reviews** — submissions start `pending` and appear only after admin approval (Admin → Reviews). "Verified buyer" is computed from real delivered/paid orders. Helpful votes persist server-side.
- **Uploads** — product image uploads go direct to Cloudinary with a server-generated signature when configured; otherwise they stream to the server disk and are served at `/uploads/…`. SVG/HTML files are rejected by MIME allowlist.
- **Inventory** — stock lives per product × size; overselling is impossible at the database level (`UPDATE … WHERE stock >= qty` inside the transaction); cancelling an order restocks.

## Security notes

- Every mutation requires the CSRF double-submit token (`x-csrf-token` header matching the cookie), issued as a non-httpOnly cookie and rotated on login/logout.
- Rate limits: auth endpoints (24 / 15 min), orders (30 / hr), payments (40 / hr), global API (900 / 10 min).
- Production CSP: `default-src 'self'`, fonts locked to Google, images to self + Cloudinary, frames to checkout.paystack.com.
- Passwords bcrypt-hashed (cost 10); JWT sessions expire per `SESSION_TTL_DAYS`.
- Webhooks are CSRF-exempt *only* on the callback routes, authenticated instead by Paystack's HMAC signature.

## SEO

- `/sitemap.xml` and `/robots.txt` are generated from the live database.
- Every page sets title/description/canonical/OG tags; product pages inject `Product` JSON-LD; the homepage injects `ClothingStore` JSON-LD.
- Images are lazy-loaded below the fold, the route code splits non-critical pages, and admin code is a separate lazy chunk.

## Project map

```
server/
  index.js            — express assembly (security, static, SPA fallback, SEO files)
  config.js           — env loading (no hardcoded secrets)
  db.js               — sqlite, migration runner, seed, mappers
  auth.js             — session JWT, CSRF guard, role guards
  validate.js         — zod schemas for every mutation
  migrations/         — 001_init.sql, 002_subscribers.sql
  routes/             — auth, storefront, orders, payments, admin
  lib/                — paystack, uploads, errors, helpers
src/
  api.js              — typed client with CSRF header handling
  context/            — AuthContext, CatalogContext (live data), CartContext, ToastContext
  pages/              — Home, Shop, ProductDetail, Checkout, OrderSuccess,
                        PaymentCallback, SignIn, SignUp, Account
  admin/              — lazy-loaded admin SPA (dashboard, products, categories,
                        orders, customers, reviews, discounts, homepage CMS, settings)
public/
  images/             — committed product photography
  uploads/            — runtime uploads (local-disk fallback target)
```
