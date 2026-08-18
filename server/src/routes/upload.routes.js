import { Router } from 'express'
import multer from 'multer'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../lib/auth.js'
import { asyncHandler, badRequest, notFound } from '../lib/errors.js'
import { MAX_UPLOAD_BYTES, findUpload, formatLimit, openUploadStream, saveUpload } from '../lib/uploads.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    // A first cheap gate; saveUpload still checks the actual bytes.
    if (!file.mimetype?.startsWith('image/')) return cb(badRequest('Only image files can be uploaded', { field: 'file' }))
    cb(null, true)
  },
})

const uploadLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false })

router.post(
  '/',
  requireAuth,
  uploadLimiter,
  (req, res, next) =>
    upload.single('file')(req, res, (err) => {
      if (!err) return next()
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(badRequest(`Images must be ${formatLimit()} or smaller`, { field: 'file' }))
      }
      next(err)
    }),
  asyncHandler(async (req, res) => {
    if (!req.file?.buffer?.length) throw badRequest('Choose an image to upload', { field: 'file' })
    const saved = await saveUpload({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      ownerId: req.user.id,
    })
    res.status(201).json({ upload: saved })
  }),
)

// Public on purpose: images have to load for people holding a share link, who are
// not signed in. The URL token is random and unguessable.
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const file = await findUpload(req.params.token)
    if (!file) throw notFound('That image is no longer stored')

    const etag = `"${file._id}"`
    if (req.get('if-none-match') === etag) return res.status(304).end()

    res.set({
      'Content-Type': file.metadata?.contentType || file.contentType || 'application/octet-stream',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
      'X-Content-Type-Options': 'nosniff',
    })

    const stream = openUploadStream(file._id)
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  }),
)

export default router
