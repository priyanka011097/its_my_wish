import { Router } from 'express'
import mongoose from 'mongoose'
import { Board, BOARD_COLORS, newShareToken } from '../models/Board.js'
import { Invitation } from '../models/Invitation.js'
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

// Every board the signed-in user owns, plus every board whose invitation they accepted.
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const acceptedFor = await Invitation.find({ email: req.user.email, status: 'accepted' }).select('board')
    const [owned, shared, invites] = await Promise.all([
      Board.find({ owner: req.user.id }).sort({ updatedAt: -1 }),
      Board.find({ _id: { $in: acceptedFor.map((i) => i.board) }, owner: { $ne: req.user.id } })
        .populate('owner', 'name email picture')
        .sort({ updatedAt: -1 }),
      Invitation.find({ invitedBy: req.user.id }).sort({ createdAt: 1 }),
    ])

    const byBoard = new Map()
    for (const invite of invites) {
      const key = String(invite.board)
      if (!byBoard.has(key)) byBoard.set(key, [])
      byBoard.get(key).push(invite.toPublic())
    }

    const summary = await summarize([...owned, ...shared].map((b) => b.id))
    const blank = { wishCount: 0, coverImage: '' }
    res.json({
      owned: owned.map((b) => b.toJSONFor(OWNER, { ...(summary.get(b.id) || blank), invites: byBoard.get(b.id) || [] })),
      shared: shared.map((b) => b.toJSONFor('viewer', summary.get(b.id) || blank)),
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
    res.status(201).json({ board: board.toJSONFor(OWNER, { wishCount: 0, coverImage: '', invites: [] }) })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { board, role } = await loadBoardFor(req, { boardId: req.params.id, populateOwner: true })
    const [wishes, invites] = await Promise.all([
      listWishes(board.id),
      role === OWNER ? Invitation.find({ board: board.id }).sort({ createdAt: 1 }) : [],
    ])
    const extra = { wishCount: wishes.length }
    if (role === OWNER) extra.invites = invites.map((i) => i.toPublic())
    res.json({ board: board.toJSONFor(role, extra), wishes, role })
  }),
)

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    Object.assign(board, readBoardBody(req.body))
    await board.save()
    const invites = await Invitation.find({ board: board.id }).sort({ createdAt: 1 })
    res.json({ board: board.toJSONFor(OWNER, { invites: invites.map((i) => i.toPublic()) }) })
  }),
)

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    const images = await Wish.find({ board: board.id }).select('imageUrl').lean()
    await Wish.deleteMany({ board: board.id })
    await Invitation.deleteMany({ board: board.id })
    await board.deleteOne()
    await Promise.all(images.map((w) => deleteUploadByUrl(w.imageUrl)))
    res.json({ ok: true })
  }),
)

// --- Sharing ---

/** Replaces the whole invite list: anyone dropped loses access, new addresses get a pending invite. */
router.put(
  '/:id/share/emails',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    const emails = normalizeEmails(req.body?.emails ?? []).filter((e) => e !== req.user.email)
    if (emails.length > 100) throw badRequest('A wishlist can be shared with at most 100 people')

    await Invitation.deleteMany({ board: board.id, email: { $nin: emails } })
    const invites = await inviteAll({ board, emails, user: req.user })
    res.json({ board: board.toJSONFor(OWNER, { invites }) })
  }),
)

/**
 * Sends invitations. An address that was invited before keeps its row: a declined
 * invite returns to pending, so re-inviting someone genuinely re-asks them.
 */
async function inviteAll({ board, emails, user }) {
  for (const email of emails) {
    await Invitation.findOneAndUpdate(
      { board: board.id, email },
      {
        $set: { invitedBy: user.id },
        $setOnInsert: { board: board.id, email, status: 'pending', respondedAt: null },
      },
      { upsert: true, setDefaultsOnInsert: true },
    )
    // Asking again after a decline should show up as a fresh invitation.
    await Invitation.updateOne(
      { board: board.id, email, status: 'declined' },
      { $set: { status: 'pending', respondedAt: null } },
    )
  }
  const all = await Invitation.find({ board: board.id }).sort({ createdAt: 1 })
  return all.map((i) => i.toPublic())
}

router.post(
  '/:id/share/emails',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    const incoming = normalizeEmails(req.body?.emails ?? req.body?.email ?? [])
    if (!incoming.length) throw badRequest('Add at least one email address', { field: 'emails' })

    const emails = incoming.filter((e) => e !== req.user.email)
    if (!emails.length) throw badRequest('You already own this wishlist - invite someone else', { field: 'emails' })

    const existing = await Invitation.countDocuments({ board: board.id })
    if (existing + emails.length > 100) throw badRequest('A wishlist can be shared with at most 100 people')

    const invites = await inviteAll({ board, emails, user: req.user })
    res.json({ board: board.toJSONFor(OWNER, { invites }) })
  }),
)

router.delete(
  '/:id/share/emails/:email',
  requireAuth,
  asyncHandler(async (req, res) => {
    const board = await loadOwnedBoard(req, req.params.id)
    const email = decodeURIComponent(req.params.email).toLowerCase()
    await Invitation.deleteOne({ board: board.id, email })
    const invites = await Invitation.find({ board: board.id }).sort({ createdAt: 1 })
    res.json({ board: board.toJSONFor(OWNER, { invites: invites.map((i) => i.toPublic()) }) })
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
