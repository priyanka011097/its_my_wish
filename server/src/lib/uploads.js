import crypto from 'node:crypto'
import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { badRequest } from './errors.js'

export const UPLOAD_BUCKET = 'uploads'
export const MAX_UPLOAD_BYTES = env.maxUploadBytes
export const UPLOAD_PATH_PREFIX = '/api/uploads/'

// Tokens, not ObjectIds, are what appear in image URLs: ObjectIds embed a
// timestamp and counter, so they can be guessed. These cannot.
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/

export const formatLimit = () => `${+(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(1)}MB`

export const isUploadUrl = (value) => typeof value === 'string' && value.startsWith(UPLOAD_PATH_PREFIX)

export function tokenFromUrl(value) {
  if (!isUploadUrl(value)) return null
  const token = value.slice(UPLOAD_PATH_PREFIX.length).split(/[?#]/)[0]
  return TOKEN_RE.test(token) ? token : null
}

export const isUploadToken = (value) => TOKEN_RE.test(String(value ?? ''))

function bucket() {
  const db = mongoose.connection.db
  if (!db) throw new Error('Database connection is not ready')
  return new mongoose.mongo.GridFSBucket(db, { bucketName: UPLOAD_BUCKET })
}

/**
 * Identifies an image from its leading bytes rather than trusting the
 * browser-supplied content type, so a renamed .exe cannot be stored as a photo.
 */
export function sniffImageType(buffer) {
  if (!buffer || buffer.length < 12) return null
  const hex = buffer.subarray(0, 12).toString('hex').toLowerCase()
  const ascii = buffer.subarray(0, 12).toString('latin1')

  if (hex.startsWith('ffd8ff')) return 'image/jpeg'
  if (hex.startsWith('89504e470d0a1a0a')) return 'image/png'
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'image/gif'
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'image/webp'
  if (ascii.slice(4, 8) === 'ftyp') {
    const brand = ascii.slice(8, 12)
    if (['avif', 'avis'].includes(brand)) return 'image/avif'
    if (['heic', 'heix', 'hevc', 'mif1'].includes(brand)) return 'image/heic'
  }
  if (ascii.startsWith('<svg') || ascii.startsWith('<?xml')) return null // SVG can carry script - refused
  return null
}

export async function saveUpload({ buffer, originalName, ownerId }) {
  const contentType = sniffImageType(buffer)
  if (!contentType) {
    throw badRequest('That file is not an image we can store. Use a JPEG, PNG, GIF, WebP, AVIF or HEIC.', {
      field: 'file',
    })
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw badRequest(`Images must be ${formatLimit()} or smaller`, { field: 'file' })
  }

  const token = crypto.randomBytes(24).toString('base64url')
  await new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(token, {
      contentType,
      metadata: { owner: ownerId, contentType, originalName: String(originalName || '').slice(0, 200) },
    })
    stream.on('error', reject)
    stream.on('finish', resolve)
    stream.end(buffer)
  })

  return { token, url: `${UPLOAD_PATH_PREFIX}${token}`, contentType, size: buffer.length }
}

export async function findUpload(token) {
  if (!isUploadToken(token)) return null
  const [file] = await bucket().find({ filename: token }).limit(1).toArray()
  return file || null
}

export function openUploadStream(fileId) {
  return bucket().openDownloadStream(fileId)
}

/** Removes a stored image. Safe to call with a plain external URL - it just does nothing. */
export async function deleteUploadByUrl(value) {
  const token = tokenFromUrl(value)
  if (!token) return false
  const file = await findUpload(token)
  if (!file) return false
  await bucket().delete(file._id)
  return true
}
