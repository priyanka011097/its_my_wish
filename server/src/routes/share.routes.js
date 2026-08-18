import { Router } from 'express'
import { asyncHandler } from '../lib/errors.js'
import { loadBoardFor } from '../lib/access.js'
import { listWishes } from './wish.routes.js'

const router = Router()

// Read-only view for anyone holding a share link. No sign-in required.
router.get(
  '/:token',
  asyncHandler(async (req, res) => {
    const { board, role } = await loadBoardFor(req, { shareToken: req.params.token, populateOwner: true })
    const wishes = await listWishes(board.id)
    res.json({ board: board.toJSONFor(role, { wishCount: wishes.length }), wishes, role })
  }),
)

export default router
