import dns from 'node:dns/promises'
import net from 'node:net'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../lib/auth.js'
import { asyncHandler, badRequest } from '../lib/errors.js'
import { normalizeUrl } from '../lib/validate.js'

const router = Router()

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false })

// Keeps the preview fetcher pointed at the public internet only.
function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    )
  }
  const ip = address.toLowerCase()
  return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80') || ip.startsWith('::ffff:127')
}

async function assertPublicHost(hostname) {
  if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname)) throw badRequest('That host is not reachable')
  try {
    const records = await dns.lookup(hostname, { all: true })
    if (records.some((r) => isPrivateAddress(r.address))) throw badRequest('That host is not reachable')
  } catch (err) {
    if (err.status) throw err
    throw badRequest('That link could not be resolved')
  }
}

function decodeEntities(value = '') {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

function pickMeta(html, names) {
  for (const name of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)\s*=\s*["']${name}["'][^>]*content\s*=\s*["']([^"']+)["']|` +
        `<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*(?:property|name)\s*=\s*["']${name}["']`,
      'i',
    )
    const match = html.match(re)
    const value = match?.[1] || match?.[2]
    if (value) return decodeEntities(value)
  }
  return ''
}

// Best-effort Open Graph scrape so "add a link wish" can prefill a title and image.
router.get(
  '/preview',
  requireAuth,
  limiter,
  asyncHandler(async (req, res) => {
    const target = normalizeUrl(req.query.url, 'link', { required: true })
    const parsed = new URL(target)
    await assertPublicHost(parsed.hostname)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    try {
      const response = await fetch(target, {
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; WishlistBot/1.0)', accept: 'text/html,*/*' },
      })
      if (!response.ok) return res.json({ preview: { url: target } })

      const contentType = response.headers.get('content-type') || ''
      if (contentType.startsWith('image/')) {
        return res.json({ preview: { url: target, imageUrl: target, title: '', siteName: parsed.hostname } })
      }
      if (!contentType.includes('html')) return res.json({ preview: { url: target } })

      const html = (await response.text()).slice(0, 400_000)
      const title =
        pickMeta(html, ['og:title', 'twitter:title']) || decodeEntities(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '')
      let imageUrl = pickMeta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src'])
      if (imageUrl) imageUrl = new URL(imageUrl, target).toString()

      res.json({
        preview: {
          url: target,
          title: title.slice(0, 200),
          imageUrl,
          siteName: pickMeta(html, ['og:site_name']) || parsed.hostname,
          description: pickMeta(html, ['og:description', 'description']).slice(0, 300),
          price: pickMeta(html, ['product:price:amount', 'og:price:amount']).slice(0, 40),
        },
      })
    } catch {
      // A site that blocks bots is not an error the user needs to see.
      res.json({ preview: { url: target, siteName: parsed.hostname } })
    } finally {
      clearTimeout(timer)
    }
  }),
)

export default router
