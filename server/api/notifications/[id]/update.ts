//Create api to update a notification for the user

import { db } from '../../../utils/db'
import { announcments } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const notificationId = getRouterParam(event, 'id')

  if (!notificationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing notificationId' })
  }

  const body = await readBody(event)

  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'Missing body' })
  }
  const { message } = body

  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'Missing message' })
  }

  return await db
    .update(announcments)
    .set({ message, updatedAt: new Date() })
    .where(eq(announcments.id, notificationId))
})
