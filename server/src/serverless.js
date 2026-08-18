/**
 * Serverless request handler for the API.
 *
 * Vercel does not run a long-lived `app.listen`, so instead of the bootstrap in
 * index.js the Express app is exposed as a plain (req, res) handler. Every request
 * waits on one shared connection promise: a warm instance reuses its connection
 * rather than opening one per request, which is what exhausts an Atlas connection
 * limit.
 */
import mongoose from 'mongoose'
import { buildApp } from './app.js'
import { connectDb } from './config/db.js'

let connection = null

function ready() {
  // 1 = connected, 2 = connecting. Anything else needs a fresh attempt.
  if (mongoose.connection.readyState === 1) return Promise.resolve()
  if (!connection) {
    connection = connectDb().catch((err) => {
      connection = null // let the next request retry rather than serving errors forever
      throw err
    })
  }
  return connection
}

/**
 * Express matches on the real request path, so make sure that is what it sees.
 * Two ways the platform can hand us something else:
 *   - a `rewrites` entry carrying the original path in `__path` (our fallback when
 *     the catch-all filename is not honoured, which silently 404s longer paths)
 *   - a path with the /api prefix stripped
 */
function restorePath(req) {
  const [path = '/', query = ''] = (req.url || '/').split('?')
  const params = new URLSearchParams(query)
  const forwarded = params.get('__path')

  if (forwarded) {
    params.delete('__path')
    const rest = params.toString()
    req.url = `${forwarded}${rest ? `?${rest}` : ''}`
    return
  }
  if (!path.startsWith('/api')) {
    req.url = `/api${path.startsWith('/') ? '' : '/'}${path}${query ? `?${query}` : ''}`
  }
}

const app = buildApp({ logging: false })

export default async function handler(req, res) {
  restorePath(req)

  try {
    await ready()
  } catch (err) {
    console.error('[api] database unavailable:', err.message)
    res.statusCode = 503
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ error: 'The database is unavailable. Check MONGODB_URI and the Atlas IP allowlist.' }))
    return
  }

  return app(req, res)
}
