import 'dotenv/config'

function required(name, fallback) {
  const value = process.env[name] ?? fallback
  if (!value) {
    console.error(`[config] Missing required env var: ${name}. Copy server/.env.example to server/.env and fill it in.`)
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
}
