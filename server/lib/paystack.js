/** Paystack REST client (server-side only, secret key from env). */
import crypto from 'node:crypto'
import { config } from '../config.js'
import { ApiError } from './errors.js'

const headers = () => ({
  Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
  'Content-Type': 'application/json',
})

export const paystackConfigured = () => Boolean(config.PAYSTACK_SECRET_KEY)

export async function initializeTransaction({ email, amountNaira, reference, callbackUrl, metadata }) {
  const res = await fetch(`${config.PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      email,
      amount: Math.round(amountNaira * 100), // kobo
      reference,
      callback_url: callbackUrl,
      currency: 'NGN',
      channels: ['card', 'bank', 'ussd', 'bank_transfer'],
      metadata,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.status) {
    throw new ApiError(502, 'PAYSTACK_INIT_FAILED', data.message || 'Could not start the payment — try another method')
  }
  return data.data // { authorization_url, access_code, reference }
}

export async function verifyTransaction(reference) {
  const res = await fetch(`${config.PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: headers(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.status) {
    throw new ApiError(502, 'PAYSTACK_VERIFY_FAILED', data.message || 'Unable to verify payment with Paystack')
  }
  return data.data // { status: 'success', amount, reference, ... }
}

/** Verify webhook signature (HMAC-SHA512 of raw body with secret key). */
export function verifyWebhookSignature(rawBody, signature) {
  if (!config.PAYSTACK_SECRET_KEY || !signature) return false
  const hash = crypto.createHmac('sha512', config.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
  } catch {
    return false
  }
}
