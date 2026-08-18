import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { unauthorized } from './errors.js'

export const AUTH_COOKIE = 'wl_token'
const googleClient = new OAuth2Client(env.googleClientId)

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: env.cookieSameSite,
    secure: env.cookieSameSite === 'none' || env.isProd,
    maxAge: 1000 * 60 * 60 * 24 * 30,
    path: '/',
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, {
    path: '/',
    sameSite: env.cookieSameSite,
    secure: env.cookieSameSite === 'none' || env.isProd,
  })
}

// Verifies a Google ID token from the browser and upserts the matching user.
export async function loginWithGoogleCredential(credential) {
  if (!env.googleClientId) throw unauthorized('Google sign-in is not configured on the server yet')
  let payload
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId })
    payload = ticket.getPayload()
  } catch (err) {
    throw unauthorized(`Google sign-in could not be verified: ${err.message}`)
  }
  if (!payload?.email || !payload.email_verified) throw unauthorized('Google account has no verified email')

  return User.findOneAndUpdate(
    { googleId: payload.sub },
    {
      $set: {
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture || '',
        lastLoginAt: new Date(),
      },
      $setOnInsert: { googleId: payload.sub },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )
}

function readToken(req) {
  const fromCookie = req.cookies?.[AUTH_COOKIE]
  if (fromCookie) return fromCookie
  const header = req.get('authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

// Populates req.user when a valid session exists; never rejects.
export const optionalAuth = async (req, _res, next) => {
  const token = readToken(req)
  if (!token) return next()
  try {
    const { sub } = jwt.verify(token, env.jwtSecret)
    req.user = await User.findById(sub)
  } catch {
    // Expired or tampered token: treat the caller as anonymous.
  }
  next()
}

export const requireAuth = (req, _res, next) => {
  if (!req.user) return next(unauthorized())
  next()
}
