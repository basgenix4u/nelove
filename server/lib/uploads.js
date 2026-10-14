/** Image upload pipeline — Cloudinary when configured, local disk otherwise. */
import crypto from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import multer from 'multer'
import { config } from '../config.js'
import { ApiError } from './errors.js'

/* ------------------------------- Cloudinary ------------------------------ */
export function cloudinarySignature() {
  const { cloud_name, api_key, api_secret, folder } = config.CLOUDINARY
  if (!config.CLOUDINARY.configured) return null
  const timestamp = Math.round(Date.now() / 1000)
  const params = `folder=${folder}&timestamp=${timestamp}${api_secret}`
  const signature = crypto.createHash('sha1').update(params).digest('hex')
  return { cloudName: cloud_name, apiKey: api_key, timestamp, folder, signature }
}

/* -------------------------------- Local disk ---------------------------- */
const uploadsDir = path.join(config.ROOT, 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif' }

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = ALLOWED[file.mimetype]
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
  },
})

export const localUpload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new ApiError(400, 'BAD_FILE', 'Upload a JPG, PNG, WEBP or AVIF image'))
    cb(null, true)
  },
})

export function uploadsEnabled() {
  return { cloudinary: config.CLOUDINARY.configured, local: true }
}
