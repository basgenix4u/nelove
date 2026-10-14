/** Zod schemas for every mutation body. */
import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Use at least 8 characters').max(120),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, 'Enter your password'),
})

export const reviewSchema = z.object({
  name: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().default(''),
  body: z.string().trim().min(10, 'A few words help other shoppers').max(2000),
})

export const discountValidateSchema = z.object({
  code: z.string().trim().min(2).max(40),
  subtotal: z.coerce.number().int().min(0),
})

export const orderSchema = z.object({
  customer: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    name: z.string().trim().min(2, 'Full name required').max(120),
    phone: z.string().trim().min(10, 'Enter a valid phone number').max(20),
    address: z.string().trim().min(6, 'Enter a full street address').max(240),
    city: z.string().trim().min(2, 'City required').max(80),
    state: z.string().trim().min(2, 'State required').max(80),
  }),
  items: z.array(z.object({
    productId: z.string().min(1),
    size: z.string().max(20).nullish(),
    color: z.string().max(60).nullish(),
    qty: z.coerce.number().int().min(1).max(10),
  })).min(1, 'Your bag is empty'),
  deliveryMethod: z.enum(['standard', 'express', 'pickup']),
  paymentMethod: z.enum(['card', 'transfer', 'pod']),
  discountCode: z.string().trim().max(40).optional().default(''),
})

/* ------------------------------- admin ------------------------------- */
export const productSchema = z.object({
  id: z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase-letters-dashes-only').max(80).optional(),
  name: z.string().trim().min(2).max(120),
  line: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().min(1),
  price: z.coerce.number().int().min(0),
  oldPrice: z.coerce.number().int().min(0).nullable().optional(),
  badge: z.enum(['New', 'Bestseller', 'Sale', 'Trending', 'Iconic']).nullable().optional(),
  short: z.string().trim().max(300).optional().default(''),
  description: z.string().trim().max(5000).optional().default(''),
  details: z.array(z.string().max(300)).max(20).optional().default([]),
  colors: z.array(z.string().max(20)).max(8).optional().default([]),
  colorNames: z.array(z.string().max(60)).max(8).optional().default([]),
  images: z.array(z.string().url().or(z.string().startsWith('/'))).min(1, 'Add at least one image').max(10),
  stock: z.record(z.string(), z.coerce.number().int().min(0).max(99999)).optional().default({}),
  active: z.coerce.boolean().optional().default(true),
})

export const categorySchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase-letters-dashes-only').max(60),
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().default(''),
  image: z.string().trim().max(500).optional().default(''),
  sortOrder: z.coerce.number().int().optional().default(0),
})

export const orderStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'failed']),
  note: z.string().trim().max(1000).optional().default(''),
})

export const discountSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,40}$/, '3–40 chars: A–Z, 0–9, - _'),
  type: z.enum(['percent', 'flat']),
  value: z.coerce.number().positive(),
  minSpend: z.coerce.number().int().min(0).optional().default(0),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  maxUses: z.coerce.number().int().min(1).nullable().optional(),
  active: z.coerce.boolean().optional().default(true),
}).refine((d) => d.type !== 'percent' || d.value <= 100, { message: 'Percent must be ≤ 100', path: ['value'] })

export const reviewModerationSchema = z.object({
  status: z.enum(['pending', 'approved', 'hidden']),
})

export const settingsSchema = z.object({
  store: z.object({
    name: z.string().trim().min(1).max(60),
    tagline: z.string().trim().max(160).optional().default(''),
    email: z.string().trim().email().optional().default(''),
    phone: z.string().trim().max(30).optional().default(''),
    address: z.string().trim().max(200).optional().default(''),
    currency: z.string().trim().max(4).optional().default('₦'),
    instagram: z.string().trim().max(200).optional().default(''),
    twitter: z.string().trim().max(200).optional().default(''),
    tiktok: z.string().trim().max(200).optional().default(''),
    // shown to customers for manual bank transfer
    bank_name: z.string().trim().max(60).optional().default(''),
    bank_account_name: z.string().trim().max(120).optional().default(''),
    bank_account_number: z.string().trim().max(20).optional().default(''),
  }),
  delivery: z.object({
    standard_fee: z.coerce.number().int().min(0),
    express_fee: z.coerce.number().int().min(0),
    pickup_fee: z.coerce.number().int().min(0).optional().default(0),
    free_ship_threshold: z.coerce.number().int().min(0),
    standard_eta: z.string().trim().max(60).optional().default(''),
    express_eta: z.string().trim().max(60).optional().default(''),
  }),
})

export const cmsSchema = z.object({
  announcement: z.array(z.string().max(160)).max(10),
  hero: z.object({
    eyebrow: z.string().max(120), headline_a: z.string().max(80), headline_b: z.string().max(80),
    sub: z.string().max(400), cta_primary: z.object({ label: z.string().max(40), to: z.string().max(120) }),
    cta_secondary: z.object({ label: z.string().max(40), to: z.string().max(120) }),
    micro: z.string().max(240), featured_product: z.string().max(80),
  }),
  editorial: z.object({
    kicker: z.string().max(60), headline_a: z.string().max(80), headline_b: z.string().max(80),
    body: z.string().max(1200), cta_label: z.string().max(80),
    image_main: z.string().max(500), image_float: z.string().max(500),
  }),
  testimonials: z.array(z.object({
    quote: z.string().max(600), name: z.string().max(60), role: z.string().max(80),
  })).max(10),
})
