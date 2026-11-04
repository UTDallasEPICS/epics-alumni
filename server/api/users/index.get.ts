import { createError, defineEventHandler, setHeader } from 'h3'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../utils/session'
import { db } from '../../utils/db'
import { user } from '../../db/schema'

// Retain the legacy array contract, scoped to the session owner. Discover
// consenting other members through the alumni directory instead.
export default defineEventHandler(async (event) => {
  const currentUser = requireUser(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const users = await db
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, currentUser.id))
    .catch(() => { throw createError({ statusCode: 500, statusMessage: 'Unable to load user' }) })

  const redacted = users.map((u) => {
    return {
      ...u,
      image: u.image != null,
    }
  })

  return redacted
})
