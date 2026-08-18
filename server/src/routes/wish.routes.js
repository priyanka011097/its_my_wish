import { Router } from 'express'
import { Board } from '../models/Board.js'
import { PRIORITIES, Wish, WISH_TYPES } from '../models/Wish.js'
import { requireAuth } from '../lib/auth.js'
import { asyncHandler, badRequest, forbidden, notFound } from '../lib/errors.js'
import { normalizeTags, normalizeUrl, trimmed } from '../lib/validate.js'

const router = Router()

export function listWishes(boardId) {
  return Wish.find({ board: boardId })
    .sort({ position: 1, createdAt: -1 })
    .then((docs) => docs.map((d) => d.toPublic()))
}

// Builds the fields for a wish, enforcing what each type needs:
// photo -> an image URL, link -> a destination URL, note -> body text.
function readWishBody(body, existing) {
  const type = body.type ?? existing?.type
  if (!WISH_TYPES.includes(type)) throw badRequest(`A wish must be one of: ${WISH_TYPES.join(', ')}`, { field: 'type' })

  const patch = { type }
  const has = (field) => body[field] !== undefined

  if (has('title') || !existing) patch.title = trimmed(body.title, 200)
  if (has('note') || !existing) patch.note = trimmed(body.note, 2000)
  if (has('price') || !existing) patch.price = trimmed(body.price, 40)
  if (has('url') || !existing) patch.url = normalizeUrl(body.url, 'link')
  if (has('imageUrl') || !existing) patch.imageUrl = normalizeUrl(body.imageUrl, 'image link')
  if (has('tags') || !existing) patch.tags = normalizeTags(body.tags)
  if (has('priority') || !existing) {
    const priority = body.priority ?? 'medium'
    if (!PRIORITIES.includes(priority)) throw badRequest('Unknown priority', { field: 'priority' })
    patch.priority = priority
  }
  if (has('position')) patch.position = Number(body.position) || 0

  const merged = { ...(existing?.toObject?.() ?? {}), ...patch }
  if (!merged.title) throw badRequest('Give this wish a name', { field: 'title' })
  if (type === 'photo' && !merged.imageUrl) throw badRequest('Paste the image link for this photo wish', { field: 'imageUrl' })
  if (type === 'link' && !merged.url) throw badRequest('Paste the link for this wish', { field: 'url' })
  if (type === 'note' && !merged.note) throw badRequest('Write something in the note', { field: 'note' })

  return patch
}

export async function createWish({ board, user, body }) {
  const patch = readWishBody(body)
  const last = await Wish.findOne({ board: board.id }).sort({ position: -1 }).select('position')
  const wish = await Wish.create({
    ...patch,
    position: patch.position ?? (last ? last.position + 1 : 0),
    board: board.id,
    createdBy: user.id,
  })
  return wish.toPublic()
}

async function loadOwnWish(req) {
  const wish = await Wish.findById(req.params.id)
  if (!wish) throw notFound('That wish no longer exists')
  const board = await Board.findById(wish.board)
  if (!board) throw notFound('That wishlist no longer exists')
  if (String(board.owner) !== req.user.id) throw forbidden('Only the wishlist owner can change its wishes')
  return { wish, board }
}

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { wish, board } = await loadOwnWish(req)
    Object.assign(wish, readWishBody(req.body, wish))
    await wish.save()
    await Board.updateOne({ _id: board.id }, { $currentDate: { updatedAt: true } })
    res.json({ wish: wish.toPublic() })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { wish, board } = await loadOwnWish(req)
    await wish.deleteOne()
    await Board.updateOne({ _id: board.id }, { $currentDate: { updatedAt: true } })
    res.json({ ok: true })
  }),
)

export default router
