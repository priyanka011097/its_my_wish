import { Router } from 'express'
import { Invitation } from '../models/Invitation.js'
import { Wish } from '../models/Wish.js'
import { requireAuth } from '../lib/auth.js'
import { asyncHandler, badRequest, notFound } from '../lib/errors.js'

const router = Router()

/**
 * Everything addressed to the signed-in account. `pending` drives the notification
 * bell; `accepted` is what the "Shared with me" space is built from.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invitations = await Invitation.find({ email: req.user.email })
      .sort({ createdAt: -1 })
      .populate('board', 'title description emoji color owner')
      .populate('invitedBy', 'name email picture')

    // A board deleted after the invite was sent leaves nothing to accept.
    const live = invitations.filter((invitation) => invitation.board)
    const counts = await Wish.aggregate([
      { $match: { board: { $in: live.map((i) => i.board._id) } } },
      { $group: { _id: '$board', wishCount: { $sum: 1 } } },
    ])
    const wishCounts = new Map(counts.map((row) => [String(row._id), row.wishCount]))

    const shaped = live.map((invitation) =>
      invitation.toNotification({ wishCount: wishCounts.get(invitation.board.id) || 0 }),
    )

    res.json({
      pending: shaped.filter((i) => i.status === 'pending'),
      accepted: shaped.filter((i) => i.status === 'accepted'),
      pendingCount: shaped.filter((i) => i.status === 'pending').length,
    })
  }),
)

async function respond(req, status) {
  const invitation = await Invitation.findById(req.params.id).populate('board', 'title emoji color')
  if (!invitation) throw notFound('That invitation no longer exists')
  if (invitation.email !== req.user.email) throw notFound('That invitation no longer exists')
  if (!invitation.board) throw notFound('That wishlist has been deleted')
  if (invitation.status === status) return invitation

  // Declining is not final: the owner can invite again, which returns it to pending.
  invitation.status = status
  invitation.respondedAt = new Date()
  await invitation.save()
  return invitation
}

router.post(
  '/:id/accept',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invitation = await respond(req, 'accepted')
    res.json({ invitation: invitation.toNotification(), boardId: String(invitation.board._id) })
  }),
)

router.post(
  '/:id/decline',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invitation = await respond(req, 'declined')
    res.json({ invitation: invitation.toNotification() })
  }),
)

// Leaving a wishlist someone shared with you.
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const invitation = await Invitation.findById(req.params.id)
    if (!invitation || invitation.email !== req.user.email) throw notFound('That invitation no longer exists')
    if (invitation.status === 'pending') throw badRequest('Decline the invitation instead of removing it')
    await invitation.deleteOne()
    res.json({ ok: true })
  }),
)

export default router
