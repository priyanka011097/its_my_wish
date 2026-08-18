/**
 * One-time backfill for boards created before invitations existed.
 *
 * Those boards kept the invited addresses in a `sharedEmails` array. Each one
 * becomes an *accepted* invitation, so nobody who already had access loses it.
 * Safe to run more than once.
 *
 * Run with: npm run migrate --workspace server
 */
import mongoose from 'mongoose'
import { connectDb } from '../src/config/db.js'
import { Board } from '../src/models/Board.js'
import { Invitation } from '../src/models/Invitation.js'

await connectDb()

// sharedEmails is gone from the schema, so read the raw documents.
const raw = await mongoose.connection.db
  .collection('boards')
  .find({ sharedEmails: { $exists: true, $ne: [] } })
  .toArray()

console.log(`[migrate] boards with a legacy sharedEmails list: ${raw.length}`)

let created = 0
let skipped = 0
for (const doc of raw) {
  const board = await Board.findById(doc._id)
  if (!board) continue
  for (const email of doc.sharedEmails) {
    const address = String(email).trim().toLowerCase()
    if (!address) continue
    const existing = await Invitation.findOne({ board: board.id, email: address })
    if (existing) {
      skipped += 1
      continue
    }
    await Invitation.create({
      board: board.id,
      email: address,
      invitedBy: board.owner,
      status: 'accepted',
      respondedAt: new Date(),
    })
    created += 1
  }
  await mongoose.connection.db
    .collection('boards')
    .updateOne({ _id: doc._id }, { $unset: { sharedEmails: '' } })
}

console.log(`[migrate] invitations created: ${created}, already present: ${skipped}`)
await mongoose.disconnect()
