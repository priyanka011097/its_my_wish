import { Router } from 'express'
import mongoose from 'mongoose'
import { Board, BOARD_COLORS, newShareToken } from '../models/Board.js'
import { Wish } from '../models/Wish.js'
import { requireAuth } from '../lib/auth.js'
import { asyncHandler, badRequest } from '../lib/errors.js'
import { loadBoardFor, loadOwnedBoard, OWNER } from '../lib/access.js'
import { normalizeEmails, trimmed } from '../lib/validate.js'
import { deleteUploadByUrl } from '../lib/uploads.js'
import { createWish, listWishes } from './wish.routes.js'

const router = Router()

// Wish counts + a cover image for every board in one round trip.
async function summarize(boardIds) {
  if (!boardIds.length) return new Map()
  const rows = await Wish.aggregate([
    { $match: { board: { $in: boardIds.map((id) => new mongoose.Types.ObjectId(String(id))) } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$board',
        wishCount: { $sum: 1 },
        images: { $push: '$imageUrl' },
      },
    },
  ])
  return new Map(
    rows.map((r) => [String(r._id), { wishCount: r.wishCount, coverImage: r.images.find(Boolean) || '' }]),
  )
}

function readBoardBody(body) {
  const patch = {}
  if (body.title !== undefined) {
    patch.title = trimmed(body.title, 120)
    if (!patch.title) throw badRequest('Give your wishlist a title', { field: 'title' })
  }
  if (body.description !== undefined) patch.description = trimmed(body.description, 500)
  if (body.emoji !== undefined) patch.emoji = trimmed(body.emoji, 8) || '🎁'
  if (body.color !== undefined) {
    if (!BOARD_COLORS.includes(body.color)) throw badRequest('Unknown board colour', { field: 'color' })
    patch.color = body.color
  }
  return patch
}

// Every board the signed-in user owns, plus every board shared with their email.
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [owned, shared] = await Promise.all([
      Board.find({ owner: req.user.id }).sort({ updatedAt: -1 }),
      Board.find({ sharedEmails: req.user.email, owner: { $ne: req.user.id } })
        .populate('owner', 'name email picture')
        .sort({ updatedAt: -1 }),
    ])
    const summary = await summarize([...owned, ...shared].map((b) => b.id))
    res.json({
      owned: owned.map((b) => b.toJSONFor(OWNER, summary.get(b.id) || { wishCount: 0, coverImage: '' })),
      shared: shared.map((b) => b.toJSONFor('viewer', summary.get(b.id) || { wishCount: 0, coverImage: '' })),
    })
  }),
)

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const patch = readBoardBody(req.body)
    if (!patch.title) throw badRequest('Give your wishlist a title', { field: 'title' })
    const board = await Board.create({ ...patch, owner: req.user.id, shareToken: newShareToken() })
    res.status(201).json({ board: board.toJSONFor(OWNER, { wishCount: 0, coverImage: '' }) })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { board, role } = await loadBoardFor(req, { boardId: req.params.id, populateOwner: true })
    const wishes = await listWishes(board.id)
    res.json({ board: board.toJSONFor(role, { wishCount: wishes.length }), wishes, role })
  }),
)

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    Object.assign(board, readBoardBody(req.body))
    await board.save()
    res.json({ board: board.toJSONFor(OWNER) })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    const images = await Wish.find({ board: board.id }).select('imageUrl').lean()
    await Wish.deleteMany({ board: board.id })
    await board.deleteOne()
    await Promise.all(images.map((w) => deleteUploadByUrl(w.imageUrl)))
    res.json({ ok: true })
  }),
)

// --- Sharing ---

router.put(
  '/:id/share/emails',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    const emails = normalizeEmails(req.body?.emails ?? [])
    board.sharedEmails = emails.filter((e) => e !== req.user.email).slice(0, 100)
    await board.save()
    res.json({ board: board.toJSONFor(OWNER) })
  }),
)

router.post(
  '/:id/share/emails',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    const incoming = normalizeEmails(req.body?.emails ?? req.body?.email ?? [])
    if (!incoming.length) throw badRequest('Add at least one email address', { field: 'emails' })
    const merged = new Set(board.sharedEmails)
    for (const email of incoming) if (email !== req.user.email) merged.add(email)
    if (merged.size > 100) throw badRequest('A wishlist can be shared with at most 100 people')
    board.sharedEmails = [...merged]
    await board.save()
    res.json({ board: board.toJSONFor(OWNER) })
  }),
)

router.delete(
  '/:id/share/emails/:email',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    const email = decodeURIComponent(req.params.email).toLowerCase()
    board.sharedEmails = board.sharedEmails.filter((e) => e !== email)
    await board.save()
    res.json({ board: board.toJSONFor(OWNER) })
  }),
)

// Turn the public link on/off, or mint a fresh token to revoke the old one.
router.post(
  '/:id/share/link',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    if (req.body?.regenerate) board.shareToken = newShareToken()
    if (req.body?.enabled !== undefined) board.linkSharing = Boolean(req.body.enabled)
    await board.save()
    res.json({ board: board.toJSONFor(OWNER) })
  }),
)

// --- Wishes nested under a board ---

router.get(
  '/:id/wishes',
  asyncHandler(async (req, res) => {
    const { board } = await loadBoardFor(req, { boardId: req.params.id })
    res.json({ wishes: await listWishes(board.id) })
  }),
)

router.post(
  '/:id/wishes',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    const wish = await createWish({ board, user: req.user, body: req.body })
    await Board.updateOne({ _id: board.id }, { $currentDate: { updatedAt: true } })
    res.status(201).json({ wish })
  }),
)

export default router
