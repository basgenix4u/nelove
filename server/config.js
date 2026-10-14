/** Central environment configuration. No secrets are hardcoded — everything
 *  comes from process.env (see .env.example). Dev-safe defaults only. */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

// Tiny .env loader (no dependency): KEY=VALUE lines, # comments
const envPath = path.join(root, '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

const PROD = process.env.NODE_ENV === 'production'

function required(name, devFallback) {
  const v = process.env[name]
  if (v) return v
  if (PROD) console.warn(`[config] WARNING: ${name} is not set${devFallback ? ' — using dev fallback, set it in production!' : ''}`)
  return devFallback
}

export const config = {
  PROD,
  ROOT: root,
  PORT: Number(process.env.PORT || 8787),
  PUBLIC_URL: process.env.PUBLIC_URL || (PROD ? '' : `http://localhost:${process.env.PORT || 8787}`),
  DB_FILE: process.env.DB_FILE || path.join(root, 'nelove.db'),
  JWT_SECRET: required('JWT_SECRET', crypto.randomBytes(32).toString('hex')),
  SESSION_TTL_DAYS: Number(process.env.SESSION_TTL_DAYS || 7),
  COOKIE_SECURE: PROD,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@nelove.ng',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY || '',
  PAYSTACK_BASE: 'https://api.paystack.co',
  CLOUDINARY: {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'nelove',
    get configured() { return !!(this.cloud_name && this.api_key && this.api_secret) },
  },
}

export function randomSecret(len = 48) {
  return crypto.randomBytes(len).toString('hex')
}
