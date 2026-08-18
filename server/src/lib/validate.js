import { badRequest } from './errors.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function normalizeEmails(input, field = 'emails') {
  const list = Array.isArray(input) ? input : String(input ?? '').split(/[,\s;]+/)
  const cleaned = [...new Set(list.map((e) => String(e).trim().toLowerCase()).filter(Boolean))]
  const invalid = cleaned.filter((e) => !EMAIL_RE.test(e))
  if (invalid.length) throw badRequest(`Not a valid email address: ${invalid.join(', ')}`, { field })
  return cleaned
}

// Only http(s) links are stored, so nothing can smuggle in javascript: or data: URLs.
export function normalizeUrl(value, field = 'url', { required = false } = {}) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    if (required) throw badRequest(`A ${field} is required`, { field })
    return ''
  }
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let parsed
  try {
    parsed = new URL(withScheme)
  } catch {
    throw badRequest(`That ${field} does not look like a valid link`, { field })
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) {
    throw badRequest(`That ${field} does not look like a valid link`, { field })
  }
  return parsed.toString()
}

export function normalizeTags(input) {
  const list = Array.isArray(input) ? input : String(input ?? '').split(',')
  return [...new Set(list.map((t) => String(t).trim()).filter(Boolean))].slice(0, 8)
}

export function trimmed(value, max) {
  return String(value ?? '').trim().slice(0, max)
}
