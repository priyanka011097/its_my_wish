import crypto from 'node:crypto'
import mongoose from 'mongoose'

export const BOARD_COLORS = ['violet', 'blue', 'teal', 'green', 'amber', 'rose', 'slate']

export function newShareToken() {
  return crypto.randomBytes(12).toString('base64url')
}

const boardSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    emoji: { type: String, default: '🎁', maxlength: 8 },
    color: { type: String, enum: BOARD_COLORS, default: 'violet' },
    // Who may see it besides the owner lives in the Invitation collection.
    // Anyone-with-the-link access
    linkSharing: { type: Boolean, default: false },
    shareToken: { type: String, default: newShareToken, unique: true, index: true },
  },
  { timestamps: true },
)

boardSchema.index({ owner: 1, createdAt: -1 })

const OWNER_ONLY_FIELDS = ['invites', 'linkSharing', 'shareToken']

boardSchema.methods.toJSONFor = function toJSONFor(role, extra = {}) {
  const safeExtra =
    role === 'owner'
      ? extra
      : Object.fromEntries(Object.entries(extra).filter(([key]) => !OWNER_ONLY_FIELDS.includes(key)))
  const base = {
    id: this.id,
    title: this.title,
    description: this.description,
    emoji: this.emoji,
    color: this.color,
    role,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    ...safeExtra,
  }
  const ownerDoc = this.populated('owner') ? this.owner : null
  if (ownerDoc) base.owner = { name: ownerDoc.name, email: ownerDoc.email, picture: ownerDoc.picture }
  if (role === 'owner') {
    base.linkSharing = this.linkSharing
    base.shareToken = this.shareToken
  }
  return base
}

export const Board = mongoose.model('Board', boardSchema)
