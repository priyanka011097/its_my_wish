import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler, badRequest } from '../lib/errors.js'
import { clearAuthCookie, loginWithGoogleCredential, requireAuth, setAuthCookie, signToken } from '../lib/auth.js'

const router = Router()

const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false })

// Exchange a Google ID token (from the browser sign-in button) for a session cookie.
router.post(
  '/google',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const credential = req.body?.credential
    if (!credential) throw badRequest('Missing Google credential')

    const user = await loginWithGoogleCredential(credential)
    const token = signToken(user)
    setAuthCookie(res, token)
    res.json({ user: user.toPublic(), token })
  }),
)

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() })
})

router.post('/logout', (req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

export default router
