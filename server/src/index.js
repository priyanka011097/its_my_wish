import { env } from './config/env.js'
import { connectDb } from './config/db.js'
import { buildApp } from './app.js'

const app = buildApp()

connectDb()
  .then(() => {
    app.listen(env.port, () => console.log(`[api] listening on http://localhost:${env.port}`))
  })
  .catch((err) => {
    console.error('[api] failed to start:', err.message)
    console.error('[api] check MONGODB_URI in server/.env - is MongoDB running?')
    process.exit(1)
  })
