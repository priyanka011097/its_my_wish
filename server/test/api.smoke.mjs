/**
 * End-to-end check of the wishlist API against a throwaway in-memory MongoDB.
 * Run with: npm --prefix server test
 *
 * Google sign-in cannot be replayed here, so the test mints session tokens
 * directly for two users and exercises everything behind them.
 */
import assert from 'node:assert/strict'
import { MongoMemoryServer } from 'mongodb-memory-server'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-value-for-smoke-tests'

// By default the suite spins up its own throwaway MongoDB. Point SMOKE_MONGODB_URI at a
// running server (e.g. the local one from `npm run db`) to test against that instead - the
// database it names is dropped when the run finishes.
const useExternal = Boolean(process.env.SMOKE_MONGODB_URI)
const mongo = useExternal ? null : await MongoMemoryServer.create()
process.env.MONGODB_URI = useExternal ? process.env.SMOKE_MONGODB_URI : mongo.getUri('wishlist_test')

const mongoose = (await import('mongoose')).default
const { buildApp } = await import('../src/app.js')
const { connectDb } = await import('../src/config/db.js')
const { User } = await import('../src/models/User.js')
const { signToken } = await import('../src/lib/auth.js')

await connectDb()
const server = buildApp({ logging: false }).listen(0)
const base = `http://127.0.0.1:${server.address().port}`

const owner = await User.create({ googleId: 'g-owner', email: 'owner@example.com', name: 'Owner Person' })
const friend = await User.create({ googleId: 'g-friend', email: 'friend@example.com', name: 'Friend Person' })
const strangerToken = signToken(await User.create({ googleId: 'g-stranger', email: 'stranger@example.com', name: 'Stranger' }))
const ownerToken = signToken(owner)
const friendToken = signToken(friend)

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => null)
  return { status: response.status, body: payload }
}

const checks = []
const check = async (name, fn) => {
  try {
    await fn()
    checks.push({ name, ok: true })
    console.log(`  ok   ${name}`)
  } catch (err) {
    checks.push({ name, ok: false, err })
    console.log(`  FAIL ${name}\n       ${err.message}`)
  }
}

let boardId
let shareToken

console.log('\nwishlist API smoke test\n')

await check('anonymous callers cannot list boards', async () => {
  const res = await call('GET', '/api/boards')
  assert.equal(res.status, 401)
})

await check('owner creates a board', async () => {
  const res = await call('POST', '/api/boards', {
    token: ownerToken,
    body: { title: 'Birthday 2026', description: 'Turning another year older', emoji: '🎂', color: 'rose' },
  })
  assert.equal(res.status, 201)
  assert.equal(res.body.board.title, 'Birthday 2026')
  assert.equal(res.body.board.role, 'owner')
  assert.equal(res.body.board.linkSharing, false)
  assert.ok(res.body.board.shareToken)
  boardId = res.body.board.id
  shareToken = res.body.board.shareToken
})

await check('a board without a title is rejected', async () => {
  const res = await call('POST', '/api/boards', { token: ownerToken, body: { title: '   ' } })
  assert.equal(res.status, 400)
})

await check('photo wish requires an image link', async () => {
  const res = await call('POST', `/api/boards/${boardId}/wishes`, {
    token: ownerToken,
    body: { type: 'photo', title: 'Camera' },
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /image link/i)
})

await check('javascript: URLs are rejected', async () => {
  const res = await call('POST', `/api/boards/${boardId}/wishes`, {
    token: ownerToken,
    body: { type: 'link', title: 'Sneaky', url: 'javascript:alert(1)' },
  })
  assert.equal(res.status, 400)
})

let photoWishId
await check('owner adds photo, link and note wishes', async () => {
  const photo = await call('POST', `/api/boards/${boardId}/wishes`, {
    token: ownerToken,
    body: { type: 'photo', title: 'Film camera', imageUrl: 'https://images.example.com/cam.jpg', priority: 'high' },
  })
  assert.equal(photo.status, 201)
  assert.equal(photo.body.wish.type, 'photo')
  photoWishId = photo.body.wish.id

  const link = await call('POST', `/api/boards/${boardId}/wishes`, {
    token: ownerToken,
    body: { type: 'link', title: 'Headphones', url: 'shop.example.com/headphones', tags: ['tech', 'tech', 'audio'] },
  })
  assert.equal(link.status, 201)
  assert.equal(link.body.wish.url, 'https://shop.example.com/headphones', 'bare host should get https:// added')
  assert.deepEqual(link.body.wish.tags, ['tech', 'audio'], 'tags should be de-duplicated')

  const note = await call('POST', `/api/boards/${boardId}/wishes`, {
    token: ownerToken,
    body: { type: 'note', title: 'Ideas', note: 'Something for the kitchen' },
  })
  assert.equal(note.status, 201)
})

await check('dashboard reports the wish count and cover image', async () => {
  const res = await call('GET', '/api/boards', { token: ownerToken })
  assert.equal(res.status, 200)
  assert.equal(res.body.owned.length, 1)
  assert.equal(res.body.owned[0].wishCount, 3)
  assert.equal(res.body.owned[0].coverImage, 'https://images.example.com/cam.jpg')
  assert.equal(res.body.shared.length, 0)
})

await check('a stranger cannot open the board', async () => {
  const res = await call('GET', `/api/boards/${boardId}`, { token: strangerToken })
  assert.equal(res.status, 403)
})

await check('link sharing is off until the owner turns it on', async () => {
  const res = await call('GET', `/api/share/${shareToken}`)
  assert.equal(res.status, 403)
})

await check('invited email gets read-only access', async () => {
  const invite = await call('POST', `/api/boards/${boardId}/share/emails`, {
    token: ownerToken,
    body: { emails: ['Friend@Example.com'] },
  })
  assert.equal(invite.status, 200)
  assert.deepEqual(invite.body.board.sharedEmails, ['friend@example.com'], 'emails should be lower-cased')

  const view = await call('GET', `/api/boards/${boardId}`, { token: friendToken })
  assert.equal(view.status, 200)
  assert.equal(view.body.role, 'viewer')
  assert.equal(view.body.wishes.length, 3)
  assert.equal(view.body.board.shareToken, undefined, 'viewers must not receive the share token')
  assert.equal(view.body.board.sharedEmails, undefined, 'viewers must not see the invite list')
})

await check('invited viewers cannot edit anything', async () => {
  const patchBoard = await call('PATCH', `/api/boards/${boardId}`, { token: friendToken, body: { title: 'Hijacked' } })
  assert.equal(patchBoard.status, 403)

  const addWish = await call('POST', `/api/boards/${boardId}/wishes`, {
    token: friendToken,
    body: { type: 'note', title: 'Nope', note: 'Nope' },
  })
  assert.equal(addWish.status, 403)

  const editWish = await call('PATCH', `/api/wishes/${photoWishId}`, { token: friendToken, body: { title: 'Nope' } })
  assert.equal(editWish.status, 403)

  const deleteWish = await call('DELETE', `/api/wishes/${photoWishId}`, { token: friendToken })
  assert.equal(deleteWish.status, 403)
})

await check('invalid invite emails are rejected', async () => {
  const res = await call('POST', `/api/boards/${boardId}/share/emails`, { token: ownerToken, body: { emails: ['not-an-email'] } })
  assert.equal(res.status, 400)
})

await check('removing an invite revokes access', async () => {
  const res = await call('DELETE', `/api/boards/${boardId}/share/emails/${encodeURIComponent('friend@example.com')}`, {
    token: ownerToken,
  })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.board.sharedEmails, [])

  const view = await call('GET', `/api/boards/${boardId}`, { token: friendToken })
  assert.equal(view.status, 403)
})

await check('share link works for anonymous visitors once enabled', async () => {
  const enable = await call('POST', `/api/boards/${boardId}/share/link`, { token: ownerToken, body: { enabled: true } })
  assert.equal(enable.status, 200)
  assert.equal(enable.body.board.linkSharing, true)

  const res = await call('GET', `/api/share/${shareToken}`)
  assert.equal(res.status, 200)
  assert.equal(res.body.role, 'viewer')
  assert.equal(res.body.wishes.length, 3)
  assert.equal(res.body.board.title, 'Birthday 2026')
  assert.equal(res.body.board.shareToken, undefined)
})

await check('resetting the link invalidates the old one', async () => {
  const res = await call('POST', `/api/boards/${boardId}/share/link`, { token: ownerToken, body: { regenerate: true } })
  assert.equal(res.status, 200)
  const fresh = res.body.board.shareToken
  assert.notEqual(fresh, shareToken)

  const stale = await call('GET', `/api/share/${shareToken}`)
  assert.equal(stale.status, 404)

  const good = await call('GET', `/api/share/${fresh}`)
  assert.equal(good.status, 200)
  shareToken = fresh
})

await check('owner edits and deletes a wish', async () => {
  const patch = await call('PATCH', `/api/wishes/${photoWishId}`, {
    token: ownerToken,
    body: { title: 'Film camera (used is fine)', price: '12,000' },
  })
  assert.equal(patch.status, 200)
  assert.equal(patch.body.wish.title, 'Film camera (used is fine)')
  assert.equal(patch.body.wish.imageUrl, 'https://images.example.com/cam.jpg', 'untouched fields survive a partial edit')

  const del = await call('DELETE', `/api/wishes/${photoWishId}`, { token: ownerToken })
  assert.equal(del.status, 200)

  const board = await call('GET', `/api/boards/${boardId}`, { token: ownerToken })
  assert.equal(board.body.wishes.length, 2)
})

await check('deleting a board removes its wishes too', async () => {
  const { Wish } = await import('../src/models/Wish.js')
  const del = await call('DELETE', `/api/boards/${boardId}`, { token: ownerToken })
  assert.equal(del.status, 200)

  const after = await call('GET', `/api/boards/${boardId}`, { token: ownerToken })
  assert.equal(after.status, 404)
  assert.equal(await Wish.countDocuments({ board: boardId }), 0)
})

await check('malformed ids give a clean 400', async () => {
  const res = await call('GET', '/api/boards/not-an-id', { token: ownerToken })
  assert.equal(res.status, 400)
})

await check('unknown endpoints return 404 JSON', async () => {
  const res = await call('GET', '/api/nope')
  assert.equal(res.status, 404)
  assert.ok(res.body.error)
})

server.close()
await mongoose.connection.dropDatabase()
await mongoose.disconnect()
if (mongo) await mongo.stop()

const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed\n`)
process.exit(failed.length ? 1 : 0)
