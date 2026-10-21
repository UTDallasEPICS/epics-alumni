import { createError, defineEventHandler, readBody, setHeader } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { requireUser } from '../utils/session'
import { profile, user } from '../db/schema'
import { profileUpdateSchema, toProfileResponse } from '../../shared/profile'

export default defineEventHandler(async (event) => {
  const currentUser = requireUser(event)
  const body = await readBody(event).catch(() => {
    throw createError({ statusCode: 400, statusMessage: 'Invalid profile data' })
  })
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid profile data' })
  const { name, graduationYear, biography } = parsed.data

  const result = (() => {
    try {
      // better-sqlite3 transactions must be synchronous: use .get()/.run(),
      // never an async callback, so failures roll back both tables together.
      return db.transaction((tx) => {
        const existing = tx.select({ id: user.id }).from(user).where(eq(user.id, currentUser.id)).get()
        if (!existing) return null
        const now = new Date()
        const identity = tx.update(user).set({ name, updatedAt: now })
          .where(eq(user.id, currentUser.id))
          .returning({ id: user.id, name: user.name, email: user.email, image: user.image }).get()!
        const fields = { graduationYear: graduationYear === '' ? null : Number(graduationYear), bio: biography, updatedAt: now }
        const saved = tx.insert(profile).values({ userId: currentUser.id, ...fields, createdAt: now })
          .onConflictDoUpdate({ target: profile.userId, set: fields })
          .returning({ graduationYear: profile.graduationYear, biography: profile.bio }).get()!
        return toProfileResponse({ ...identity, ...saved })
      }, { behavior: 'immediate' })
    } catch {
      throw createError({ statusCode: 500, statusMessage: 'Unable to save profile' })
    }
  })()

  if (!result) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return result
})
