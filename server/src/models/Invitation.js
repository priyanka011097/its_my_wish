import mongoose from 'mongoose'

export const INVITE_STATUSES = ['pending', 'accepted', 'declined']

/**
 * One person's invitation to one board, and the single source of truth for
 * who may view it: access follows an *accepted* invitation, so nobody is added to
 * a wishlist without agreeing to it, and a pending invite is what the bell shows.
 */
const invitationSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: INVITE_STATUSES, default: 'pending', index: true },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

// One invitation per person per board; re-inviting updates the existing row.
invitationSchema.index({ board: 1, email: 1 }, { unique: true })
invitationSchema.index({ email: 1, status: 1 })

invitationSchema.methods.toPublic = function toPublic() {
  return {
    id: this.id,
    email: this.email,
    status: this.status,
    createdAt: this.createdAt,
    respondedAt: this.respondedAt,
  }
}

/** The shape the notification bell needs: who invited you, and to what. */
invitationSchema.methods.toNotification = function toNotification(extra = {}) {
  const board = this.populated('board') ? this.board : null
  const from = this.populated('invitedBy') ? this.invitedBy : null
  return {
    id: this.id,
    status: this.status,
    createdAt: this.createdAt,
    board: board && {
      id: board.id,
      title: board.title,
      description: board.description,
      emoji: board.emoji,
      color: board.color,
    },
    invitedBy: from && { name: from.name, email: from.email, picture: from.picture },
    ...extra,
  }
}

export const Invitation = mongoose.model('Invitation', invitationSchema)
