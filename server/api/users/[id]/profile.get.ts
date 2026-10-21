import { constants } from 'node:fs'
import { lstat, open, realpath } from 'node:fs/promises'
import path from 'node:path'
import { createError, defineEventHandler, getRouterParam, isError, sendStream, setHeader } from 'h3'
import { fileTypeFromBuffer } from 'file-type'
import { db } from '../../../utils/db'
import { user } from '../../../db/schema'
import { requireUser } from '../../../utils/session'
import { eq } from 'drizzle-orm'
import { AVATAR_MIME_TYPES, isAvatarStorageKey } from '../../../../shared/profile'

export default defineEventHandler(async (event) => {
  requireUser(event)
  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'Missing userId' })

  let image: string | null | undefined
  try {
    image = db.select({ image: user.image }).from(user).where(eq(user.id, userId)).get()?.image
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Unable to load avatar' })
  }
  if (!isAvatarStorageKey(image, userId)) {
    throw createError({ statusCode: 404, statusMessage: 'Avatar not found' })
  }

  // Trust the configured root, but reject symlinks in every component beneath it.
  const handle = await (async () => {
    try {
      const root = await realpath(path.resolve(process.env.UPLOAD_STORAGE_PATH || 'public/images'))
      let candidate = root
      const parts = image.split('/')
      for (const [index, part] of parts.entries()) {
        candidate = path.resolve(candidate, part)
        if (!candidate.startsWith(root + path.sep)) throw new Error('Invalid path')
        const info = await lstat(candidate)
        if (info.isSymbolicLink() || (index < parts.length - 1 ? !info.isDirectory() : !info.isFile())) {
          throw new Error('Invalid file')
        }
        if (await realpath(candidate) !== candidate) throw new Error('Invalid path')
      }
      // Detect and stream from the same descriptor; never reopen by path.
      return await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    } catch {
      throw createError({ statusCode: 404, statusMessage: 'Avatar not found' })
    }
  })()

  let streaming = false
  try {
    const info = await handle.stat()
    if (!info.isFile()) throw createError({ statusCode: 404, statusMessage: 'Avatar not found' })
    const header = Buffer.alloc(Math.min(info.size, 4100))
    await handle.read(header, 0, header.length, 0)
    const detected = await fileTypeFromBuffer(header).catch(() => undefined)
    if (!detected || !AVATAR_MIME_TYPES.some((mime) => mime === detected.mime)) {
      throw createError({ statusCode: 415, statusMessage: 'Unsupported avatar image' })
    }
    setHeader(event, 'Content-Type', detected.mime)
    setHeader(event, 'X-Content-Type-Options', 'nosniff')
    setHeader(event, 'Cache-Control', 'private, no-store')
    const stream = handle.createReadStream({ start: 0, autoClose: true })
    streaming = true
    // H3 only calls stream.abort() on a disconnected Node response; a Node
    // ReadStream needs destroy() to close its descriptor and reject sendStream.
    const onResponseClose = () => {
      if (!stream.readableEnded && !stream.destroyed) stream.destroy(new Error('Response closed'))
    }
    if (event.node.res.socket) {
      event.node.res.once('close', onResponseClose)
      stream.once('close', () => event.node.res.off('close', onResponseClose))
    }
    // The stream owns the descriptor until consumed, including web adapters
    // that return from sendStream before the response body is read.
    try {
      return await sendStream(event, stream)
    } catch {
      stream.destroy()
      throw createError({ statusCode: 500, statusMessage: 'Unable to read avatar' })
    }
  } catch (error) {
    if (isError(error)) throw error
    throw createError({ statusCode: 404, statusMessage: 'Avatar not found' })
  } finally {
    if (!streaming) await handle.close().catch(() => {})
  }
})
