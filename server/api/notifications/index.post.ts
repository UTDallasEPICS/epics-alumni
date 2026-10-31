//Create an Api to create a notification for the user

import { db } from '../../utils/db'
import { announcments } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body) {
    throw createError({ statusCode: 400, statusMessage: 'Missing body' })
  }

  const { createdBy, message } = body

  if (!createdBy || !message) {
    throw createError({ statusCode: 400, statusMessage: 'Missing createdBy or message' })
  }

  const [newNotification] = await db
    .insert(announcments)
    .values({
      createdBy,
      message,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning()

  return newNotification
})
