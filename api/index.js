// Serves /api itself, and is the target of the vercel.json rewrite that carries
// the original path in ?__path= for hosts that do not honour the catch-all name.
export { default } from '../server/src/serverless.js'
