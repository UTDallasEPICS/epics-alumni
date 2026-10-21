import { createError, defineEventHandler, setHeader } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { requireUser } from '../utils/session'
import { profile, user } from '../db/schema'
import { toProfileResponse } from '../../shared/profile'

export default defineEventHandler((event) => {
  const currentUser = requireUser(event)
  setHeader(event, 'Cache-Control', 'private, no-store')

  const record = (() => {
    try {
      return db.select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        graduationYear: profile.graduationYear,
        biography: profile.bio,
      }).from(user).leftJoin(profile, eq(profile.userId, user.id))
        .where(eq(user.id, currentUser.id)).get()
    } catch {
      throw createError({ statusCode: 500, statusMessage: 'Unable to load profile' })
    }
  })()

  if (!record) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  return toProfileResponse(record)
})
