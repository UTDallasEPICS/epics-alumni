import path from 'node:path'
import { constants } from 'node:fs'
import { lstat, mkdir, open, realpath, unlink } from 'node:fs/promises'
import { createError, defineEventHandler, readMultipartFormData, setResponseStatus } from 'h3'
import { fileTypeFromBuffer } from 'file-type'
import { db } from '../../utils/db'
import { user } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../utils/session'
import { AVATAR_MIME_TYPES, MAX_AVATAR_BYTES, avatarUrl, isAvatarStorageKey } from '../../../shared/profile'

export default defineEventHandler(async (event) => {
  const currentUser = requireUser(event)
  const form = await readMultipartFormData(event).catch(() => undefined)
  if (!form || form.length !== 1 || form[0]?.name !== 'file' || !form[0].data.length) {
    throw createError({ statusCode: 400, statusMessage: 'Upload one nonempty image file' })
  }
  const file = form[0]
  if (file.data.length > MAX_AVATAR_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Image must be 5 MB or smaller' })
  }
  const detected = await fileTypeFromBuffer(file.data).catch(() => undefined)
  if (!detected || !AVATAR_MIME_TYPES.some((mime) => mime === detected.mime)) {
    throw createError({ statusCode: 415, statusMessage: 'Upload a JPEG, PNG, or WebP image' })
  }

  const image = `users/${currentUser.id}/images/${crypto.randomUUID()}`
  if (!isAvatarStorageKey(image, currentUser.id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid upload destination' })
  }
  let filePath: string | undefined
  let created: { dev: number; ino: number } | undefined
  try {
    const configuredRoot = path.resolve(process.env.UPLOAD_STORAGE_PATH || 'public/images')
    await mkdir(configuredRoot, { recursive: true })
    const root = await realpath(configuredRoot)
    let directory = root
    const parts = image.split('/')
    for (const part of parts.slice(0, -1)) {
      directory = path.resolve(directory, part)
      if (!directory.startsWith(root + path.sep)) throw new Error('Invalid path')
      await mkdir(directory).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error
      })
      const info = await lstat(directory)
      if (!info.isDirectory() || info.isSymbolicLink() || await realpath(directory) !== directory) {
        throw new Error('Invalid directory')
      }
    }
    filePath = path.join(directory, parts[3]!)
    const handle = await open(filePath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600)
    try {
      created = await handle.stat()
      await handle.writeFile(file.data)
    } finally {
      await handle.close()
    }

    const updated = db.update(user).set({ image, updatedAt: new Date() })
      .where(eq(user.id, currentUser.id)).returning({ id: user.id }).get()
    if (!updated) throw new Error('User no longer exists')
  } catch {
    // Only remove the new file we created, never an existing or replaced file.
    if (filePath && created) {
      try {
        if (await realpath(path.dirname(filePath)) === path.dirname(filePath)) {
          const info = await lstat(filePath)
          if (info.isFile() && !info.isSymbolicLink() && info.dev === created.dev && info.ino === created.ino) await unlink(filePath)
        }
      } catch { /* Best-effort cleanup; preserve the original generic failure. */ }
    }
    throw createError({ statusCode: 500, statusMessage: 'Unable to save avatar' })
  }

  setResponseStatus(event, 201)
  return {
    message: 'Added profile picture to logged in user.',
    imageUrl: avatarUrl(currentUser.id, image)!,
  }
})
