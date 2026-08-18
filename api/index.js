/**
 * Vercel serverless entry for the API.
 *
 * Vercel does not run a long-lived `app.listen`, so instead of the bootstrap in
 * server/src/index.js it exports the Express app as a request handler. Every route
 * waits on one shared connection promise: a warm instance reuses its connection
 * instead of opening a new one per request, which is what exhausts an Atlas
 * connection limit.
 */
import mongoose from 'mongoose'
import { buildApp } from '../server/src/app.js'
import { connectDb } from '../server/src/config/db.js'

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

const app = buildApp({ logging: false })

export default async function handler(req, res) {
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
