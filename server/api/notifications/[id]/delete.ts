//Create API to delete notifications for the user
import { db } from '../../../utils/db'
import { announcments } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing notification id' })
  }

  await db.delete(announcments).where(eq(announcments.id, id))
  return { ok: true }
})
