//Create code to read a notification for the user

import { db } from '../../../utils/db'
import { announcments } from '../../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const notificationId = getRouterParam(event, 'id')

  if (!notificationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing notificationId' })
  }

  return await db
    .update(announcments)
    .set({ updatedAt: new Date() })
    .where(eq(announcments.id, notificationId))
})
