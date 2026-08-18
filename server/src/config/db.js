import dns from 'node:dns'
import mongoose from 'mongoose'
import { env } from './env.js'

/**
 * `mongodb+srv://` needs SRV and TXT lookups, and Node resolves those itself
 * instead of asking Windows. On machines whose resolver is a local proxy or VPN
 * client that refuses those queries, the connection dies as querySrv ECONNREFUSED
 * even though the host resolves fine elsewhere. DNS_SERVERS points Node's resolver
 * somewhere that answers.
 */
function applyDnsOverride() {
  if (!env.dnsServers.length) return
  dns.setServers(env.dnsServers)
  console.log(`[db] using DNS servers ${env.dnsServers.join(', ')} for SRV lookups`)
}

export async function connectDb() {
  applyDnsOverride()
  mongoose.set('strictQuery', true)

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 })
  } catch (err) {
    if (err.message?.includes('querySrv')) {
      err.message += '\n[db] hint: Node could not run the SRV lookup that mongodb+srv:// needs. Set DNS_SERVERS=8.8.8.8,1.1.1.1 in server/.env'
    }
    throw err
  }

  const { host, name } = mongoose.connection
  console.log(`[db] connected to ${host}/${name}`)

  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'))
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message))
}
