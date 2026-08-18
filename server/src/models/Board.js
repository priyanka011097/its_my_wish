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
    // Who can see it besides the owner
    sharedEmails: { type: [{ type: String, lowercase: true, trim: true }], default: [] },
    // Anyone-with-the-link access
    linkSharing: { type: Boolean, default: false },
    shareToken: { type: String, default: newShareToken, unique: true, index: true },
  },
  { timestamps: true },
)

boardSchema.index({ owner: 1, createdAt: -1 })
boardSchema.index({ sharedEmails: 1 })

boardSchema.methods.toJSONFor = function toJSONFor(role, extra = {}) {
  const base = {
    id: this.id,
    title: this.title,
    description: this.description,
    emoji: this.emoji,
    color: this.color,
    role,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    ...extra,
  }
  const ownerDoc = this.populated('owner') ? this.owner : null
  if (ownerDoc) base.owner = { name: ownerDoc.name, email: ownerDoc.email, picture: ownerDoc.picture }
  if (role === 'owner') {
    base.sharedEmails = this.sharedEmails
    base.linkSharing = this.linkSharing
    base.shareToken = this.shareToken
  }
  return base
}

export const Board = mongoose.model('Board', boardSchema)
