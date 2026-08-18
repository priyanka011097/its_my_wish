/**
 * Runs a real local MongoDB for development, with no system-wide install.
 *
 * The mongod binary is fetched once into ~/.cache/mongodb-binaries (by the same
 * downloader the tests use) and the data lives in server/.data/mongodb, so
 * everything you add survives restarts. Stop it with Ctrl+C.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = Number(process.env.LOCAL_DB_PORT || 27017)
const dataDir = path.resolve(fileURLToPath(new URL('../.data/mongodb', import.meta.url)))
fs.mkdirSync(dataDir, { recursive: true })

const { MongoBinary } = await import('mongodb-memory-server-core/lib/util/MongoBinary.js')

console.log('[db] resolving mongod binary (first run downloads it, then it is cached)...')
const binary = await MongoBinary.getPath({})
console.log(`[db] mongod: ${binary}`)
console.log(`[db] data:   ${dataDir}`)

const mongod = spawn(binary, ['--dbpath', dataDir, '--port', String(PORT), '--bind_ip', '127.0.0.1'], {
  stdio: ['ignore', 'pipe', 'pipe'],
})

let announced = false
const watch = (chunk) => {
  const text = chunk.toString()
  if (!announced && text.includes('Waiting for connections')) {
    announced = true
    console.log(`\n[db] ready on mongodb://127.0.0.1:${PORT}/wishlist\n`)
  }
  // mongod is very chatty in JSON; surface only what matters.
  for (const line of text.split('\n')) {
    if (/"s":"[EFW]"/.test(line) || /error|Address already in use/i.test(line)) console.error(`[mongod] ${line.trim()}`)
  }
}
mongod.stdout.on('data', watch)
mongod.stderr.on('data', watch)

mongod.on('exit', (code) => {
  console.log(`[db] mongod exited with code ${code}`)
  process.exit(code ?? 0)
})

const shutdown = () => {
  console.log('\n[db] stopping mongod...')
  mongod.kill('SIGTERM')
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
