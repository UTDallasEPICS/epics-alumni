//Create API to get and display notifications for the user

import { db } from '../../utils/db'
import { announcments } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const announcements = await db
    .select({
      id: announcments.id,
      createdBy: announcments.createdBy,
      message: announcments.message,
      createdAt: announcments.createdAt,
      updatedAt: announcments.updatedAt,
    })
    .from(announcments)

  console.log(event)
  return announcements
})
