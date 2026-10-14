/** Authoritative catalogue currency — Nigerian Naira (kobo-free). */
export const fmt = (n) => '₦' + Math.round(Number(n) || 0).toLocaleString('en-NG')

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Tiny deterministic hash so each product gets stable pseudo-random picks. */
export function hashString(str) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

export function datePlusDays(iso, days) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full / private mode — fail silently */
  }
}

export const ORDER_KEY = 'nelove:orders:v1'
/** Server-created order snapshot shown on the confirmation page. */
export const LAST_ORDER_KEY = 'nelove:last-order:v2'
