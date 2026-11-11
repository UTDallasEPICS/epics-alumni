//Create an Api to create a notification for the user
import { db } from '../../utils/db'
import { announcments } from '../../db/schema'
import { auth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const session = await auth.api.getSession({
    headers: new Headers(getRequestHeaders(event) as Record<string, string>),
  })
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'You must be signed in' })
  }
  const createdBy = session.user.id

  const form = await readMultipartFormData(event)
  const message = form?.find((f) => f.name === 'message')?.data.toString()
  const file = form?.find((f) => f.name === 'image')

  if (!message) {
    throw createError({ statusCode: 400, statusMessage: 'Missing message' })
  }

  let image: string | null = null
  if (file?.data.length) {
    if (!file.type?.startsWith('image/')) {
      throw createError({ statusCode: 415, statusMessage: 'Only image files are allowed' })
    }
    if (file.data.length > 2 * 1024 * 1024) {
      throw createError({ statusCode: 413, statusMessage: 'Image must be under 2 MB' })
    }
    image = `data:${file.type};base64,${file.data.toString('base64')}`
  }

  const [newNotification] = await db
    .insert(announcments)
    .values({ createdBy, message, image, createdAt: new Date(), updatedAt: new Date() })
    .returning()

  return newNotification
})
