# Deploying nelove

Any host that runs Node 20+ persistently works: a VM, a container (Render/Railway/Fly.io), or a PaaS with a start command. One process serves both the app and the API — no separate frontend hosting needed.

## 1. Prepare secrets

```bash
cp .env.example .env
```
Fill in:
- `JWT_SECRET` — `openssl rand -hex 48`
- `ADMIN_EMAIL` + `ADMIN_PASSWORD` — the first-boot admin account (you can change/remove after first login)
- `PUBLIC_URL` — your public origin, e.g. `https://nelove.ng`
- `PAYSTACK_SECRET_KEY` — your live key (`sk_live_…`) once you go live (optional until then)
- `CLOUDINARY_*` — for durable image storage (strongly recommended; local disk uploads don't survive many container hosts)

## 2. Build + start

```bash
npm ci
npm run build
npm start
```

Health check: `GET /api/health` → `{"ok": true, …}`.

## 3. Reverse proxy (if behind nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name nelove.ng;
  # TLS via certbot / your provider

  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  client_max_body_size 8m;   # allow product image uploads
}
```

The app sets `cookie: Secure` in production — HTTPS is required for sessions.

## 4. Paystack webhook

In the Paystack dashboard → Settings → Webhooks, add:

```
https://your-domain.com/api/pay/webhook
```

Confirmed `charge.success` events mark orders paid even if the customer closes the browser mid-checkout. Signatures are verified with your `PAYSTACK_SECRET_KEY`.

## 5. Persistence

- Database: the SQLite file (`DB_FILE`, default `./nelove.db`) must live on a persistent disk/volume.
- Uploads without Cloudinary: `public/uploads/` also needs a persistent volume.

Both paths travel with backups of a single directory.

## 6. First-run checklist

1. Sign in at `/#/admin` with the env credentials → **change them**.
2. Admin → Settings: store name/email, delivery fees + free-shipping threshold, bank transfer details.
3. Admin → Homepage sugar: announcement lines, hero, featured product id.
4. Swap Paystack to live keys; place a ₦100 test order and watch it flip to *Paid*.
5. Announce WELCOME10 / LAGOS5K codes or replace them under Admin → Discounts.
