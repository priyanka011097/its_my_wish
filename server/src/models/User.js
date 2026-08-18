import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    picture: { type: String, default: '' },
    lastLoginAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

userSchema.methods.toPublic = function toPublic() {
  return { id: this.id, email: this.email, name: this.name, picture: this.picture }
}

export const User = mongoose.model('User', userSchema)
