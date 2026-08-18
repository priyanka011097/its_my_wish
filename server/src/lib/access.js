import { Board } from '../models/Board.js'
import { forbidden, notFound } from './errors.js'

export const OWNER = 'owner'
export const VIEWER = 'viewer'

/**
 * Resolves how the caller may use a board.
 * A signed-in owner gets full control; invited emails and valid share links get read-only access.
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

  if (user && board.sharedEmails.includes(user.email)) return { board, role: VIEWER }

  if (!user) throw forbidden('Sign in with an invited account, or ask for a share link')
  throw forbidden('This wishlist has not been shared with you')
}

export async function loadOwnedBoard(req, boardId) {
  const { board, role } = await loadBoardFor(req, { boardId })
  if (role !== OWNER) throw forbidden('Only the wishlist owner can change this')
  return board
}
