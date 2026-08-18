import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { optionalAuth } from './lib/auth.js'
import { asyncHandler, errorHandler, notFound } from './lib/errors.js'
import authRoutes from './routes/auth.routes.js'
import boardRoutes from './routes/board.routes.js'
import wishRoutes from './routes/wish.routes.js'
import shareRoutes from './routes/share.routes.js'
import metaRoutes from './routes/meta.routes.js'
import uploadRoutes from './routes/upload.routes.js'

/** Builds the Express app. Kept separate from the bootstrap so tests can mount it directly. */
export function buildApp({ logging = !env.isProd } = {}) {
  const app = express()
  app.set('trust proxy', 1)

  app.use(cors({ origin: env.clientOrigin, credentials: true }))
  app.use(express.json({ limit: '200kb' }))
  app.use(cookieParser())
  if (logging) app.use(morgan('dev'))

  const DB_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting']
  app.get('/api/health', (_req, res) =>
    res.json({
      ok: true,
      env: env.nodeEnv,
      database: DB_STATES[mongoose.connection.readyState] ?? 'unknown',
      googleConfigured: Boolean(env.googleClientId),
      maxUploadBytes: env.maxUploadBytes,
    }),
  )
  app.get('/api/config', (_req, res) =>
    res.json({ googleClientId: env.googleClientId, maxUploadBytes: env.maxUploadBytes }),
  )

  app.use('/api', asyncHandler(optionalAuth))
  app.use('/api/auth', authRoutes)
  app.use('/api/boards', boardRoutes)
  app.use('/api/wishes', wishRoutes)
  app.use('/api/share', shareRoutes)
  app.use('/api/meta', metaRoutes)
  app.use('/api/uploads', uploadRoutes)

  app.use('/api', (_req, _res, next) => next(notFound('No such endpoint')))

  // Single-process deploys serve the built client from the same origin as the API.
  if (env.serveClient) {
    const clientDist = path.resolve(fileURLToPath(new URL('../../client/dist', import.meta.url)))
    app.use(express.static(clientDist))
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
  }

  app.use(errorHandler)
  return app
}
