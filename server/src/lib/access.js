import { Board } from '../models/Board.js'
import { Invitation } from '../models/Invitation.js'
import { forbidden, notFound } from './errors.js'

export const OWNER = 'owner'
export const VIEWER = 'viewer'

/**
 * Resolves how the caller may use a board.
 * The owner gets full control; an accepted invitation or a valid share link gets
 * read-only access. A pending invitation deliberately grants nothing yet - it has
 * to be accepted from the notification bell first.
 */
export async function loadBoardFor(req, { boardId, shareToken, populateOwner = false } = {}) {
  const query = boardId ? Board.findById(boardId) : Board.findOne({ shareToken })
  if (populateOwner) query.populate('owner', 'name email picture')
  const board = await query
  if (!board) throw notFound('That wishlist does not exist (or was deleted)')

  const user = req.user
  const ownerId = board.populated('owner') ? board.owner.id : String(board.owner)
  if (user && ownerId === user.id) return { board, role: OWNER }

  const token = shareToken || req.query.token
  if (token && token === board.shareToken && board.linkSharing) return { board, role: VIEWER }

  if (user) {
    const invitation = await Invitation.findOne({ board: board.id, email: user.email })
    if (invitation?.status === 'accepted') return { board, role: VIEWER }
    if (invitation?.status === 'pending') {
      throw forbidden('You have an invitation to this wishlist - accept it from your notifications first')
    }
    throw forbidden('This wishlist has not been shared with you')
  }

  throw forbidden('Sign in with an invited account, or ask for a share link')
}

export async function loadOwnedBoard(req, boardId) {
  const { board, role } = await loadBoardFor(req, { boardId })
  if (role !== OWNER) throw forbidden('Only the wishlist owner can change this')
  return board
}
