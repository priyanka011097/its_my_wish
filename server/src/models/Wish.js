import mongoose from 'mongoose'

export const WISH_TYPES = ['photo', 'link', 'note']
export const PRIORITIES = ['low', 'medium', 'high']

const wishSchema = new mongoose.Schema(
  {
    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: WISH_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    note: { type: String, default: '', trim: true, maxlength: 2000 },
    url: { type: String, default: '', trim: true, maxlength: 2000 },
    imageUrl: { type: String, default: '', trim: true, maxlength: 2000 },
    price: { type: String, default: '', trim: true, maxlength: 40 },
    priority: { type: String, enum: PRIORITIES, default: 'medium' },
    tags: { type: [{ type: String, trim: true, maxlength: 24 }], default: [] },
    position: { type: Number, default: 0 },
  },
  { timestamps: true },
)

wishSchema.index({ board: 1, position: 1, createdAt: -1 })

wishSchema.methods.toPublic = function toPublic() {
  return {
    id: this.id,
    board: String(this.board),
    type: this.type,
    title: this.title,
    note: this.note,
    url: this.url,
    imageUrl: this.imageUrl,
    price: this.price,
    priority: this.priority,
    tags: this.tags,
    position: this.position,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export const Wish = mongoose.model('Wish', wishSchema)
