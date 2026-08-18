import 'dotenv/config'

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  if (!value) {
    const message = `[config] Missing required env var: ${name}.`
    // On a serverless host there is no .env - the message has to reach the logs,
    // where process.exit would only surface as a generic invocation failure.
    if (process.env.VERCEL) throw new Error(`${message} Add it to the project's Environment Variables.`)
    console.error(`${message} Copy server/.env.example to server/.env and fill it in.`)
    process.exit(1)
  }
  return value
}

// A client id that is still the sample placeholder counts as "not configured":
// the app boots so you can look around, and the sign-in card explains what is missing.
function optionalGoogleClientId() {
  const value = (process.env.GOOGLE_CLIENT_ID || '').trim()
  if (!value || value.startsWith('your-client-id')) {
    console.warn('[config] GOOGLE_CLIENT_ID is not set - Google sign-in stays disabled until you add it to server/.env')
    return ''
  }
  return value
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  clientOrigin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/wishlist'),
  // Optional: only needed when this machine's DNS resolver refuses Node's SRV lookups.
  dnsServers: (process.env.DNS_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  googleClientId: optionalGoogleClientId(),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',
  // Serverless hosts serve the built client themselves, so the API must not also
  // claim every non-/api route. Set SERVE_CLIENT=true for a single-process deploy.
  serveClient: process.env.SERVE_CLIENT
    ? process.env.SERVE_CLIENT === 'true'
    : (process.env.NODE_ENV || 'development') === 'production' && !process.env.VERCEL,
  // Vercel caps a serverless request body at 4.5MB, so the default stays under it.
  maxUploadBytes: Math.round(Number(process.env.MAX_UPLOAD_MB || 4) * 1024 * 1024),
}
