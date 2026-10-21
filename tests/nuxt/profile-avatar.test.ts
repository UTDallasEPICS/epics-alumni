// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { IncomingMessage, type ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { Writable } from 'node:stream'
import type { ReadStream } from 'node:fs'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { createApp, createError, createEvent, eventHandler, toWebHandler } from 'h3'
import * as schema from '../../server/db/schema'
import upload from '../../server/api/users/upload.post'
import retrieve from '../../server/api/users/[id]/profile.get'
import { isAvatarStorageKey, MAX_AVATAR_BYTES } from '../../shared/profile'

const isolated = vi.hoisted(() => ({ db: undefined as unknown as BetterSQLite3Database<typeof schema> }))
vi.mock('../../server/utils/db', () => ({ get db() { return isolated.db } }))

const images = {
  png: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII=', 'base64'),
  jpeg: Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC/gA//2Q==', 'base64'),
  webp: Buffer.from('UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA', 'base64'),
}
const key = 'users/owner/images/11111111-1111-4111-8111-111111111111'
let temporary: string
let root: string
let sqlite: InstanceType<typeof Database>
let request: ReturnType<typeof toWebHandler>

beforeEach(async () => {
  vi.stubGlobal('createError', createError)
  temporary = await mkdtemp(path.join(tmpdir(), 'epics-avatar-test-'))
  root = path.join(temporary, 'uploads')
  await mkdir(root)
  vi.stubEnv('UPLOAD_STORAGE_PATH', root)
  sqlite = new Database(':memory:')
  sqlite.exec(`CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    emailVerified INTEGER NOT NULL DEFAULT 0, image TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL)`)
  isolated.db = drizzle(sqlite, { schema })
  isolated.db.insert(schema.user).values([
    { id: 'first', name: 'First', email: 'first@example.test' },
    { id: 'owner', name: 'Owner', email: 'owner@example.test' },
  ]).run()
  const app = createApp({ onError: () => {} })
  app.use(eventHandler((event) => {
    const id = event.headers.get('x-test-user')
    if (id) event.context.user = { id, name: 'Owner', email: 'owner@example.test', emailVerified: true, createdAt: new Date(), updatedAt: new Date() }
    event.context.params = { id: 'owner' }
    return event.method === 'POST' ? upload(event) : retrieve(event)
  }))
  request = toWebHandler(app)
})

afterEach(async () => {
  sqlite?.close()
  if (temporary) await rm(temporary, { recursive: true, force: true })
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function post(data?: Buffer, id: string | null = 'owner', duplicate = false) {
  const form = new FormData()
  if (data) {
    // Intentionally misleading name/type: the handler must inspect the bytes.
    form.append('file', new Blob([new Uint8Array(data)], { type: 'application/octet-stream' }), '../../ignored.txt')
    if (duplicate) form.append('file', new Blob([new Uint8Array(data)]), 'second.png')
  }
  return request(new Request('http://localhost/api/users/upload', {
    method: 'POST', headers: id ? { 'x-test-user': id } : {}, body: form,
  }))
}

function get(id: string | null = 'owner') {
  return request(new Request('http://localhost/api/users/owner/profile', { headers: id ? { 'x-test-user': id } : {} }))
}

function setImage(image: string) {
  isolated.db.update(schema.user).set({ image }).where(eq(schema.user.id, 'owner')).run()
}

describe('avatar handlers with real temporary storage and SQLite', () => {
  it('requires authentication for upload and retrieval', async () => {
    expect((await post(images.png, null)).status).toBe(401)
    expect((await get(null)).status).toBe(401)
  })

  it('rejects missing, empty, and multiple uploads', async () => {
    expect((await post()).status).toBe(400)
    expect((await post(Buffer.alloc(0))).status).toBe(400)
    expect((await post(images.png, 'owner', true)).status).toBe(400)
  })

  it('rejects files over 5 MB before writing', async () => {
    expect((await post(Buffer.alloc(MAX_AVATAR_BYTES + 1))).status).toBe(413)
    expect(await readdir(root)).toEqual([])
  })

  it.each([Buffer.from('not an image'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from('GIF89a1234567890')])('rejects unsupported contents', async (bytes) => {
    expect((await post(bytes)).status).toBe(415)
    expect(await readdir(root)).toEqual([])
  })

  it.each(['jpeg', 'png', 'webp'] as const)('persists and serves a real %s fixture for the session owner only', async (format) => {
    const bytes = images[format]
    const response = await post(bytes)
    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ message: 'Added profile picture to logged in user.', imageUrl: '/api/users/owner/profile' })
    const owner = isolated.db.select().from(schema.user).where(eq(schema.user.id, 'owner')).get()!
    expect(isAvatarStorageKey(owner.image, 'owner')).toBe(true)
    expect(await readFile(path.join(root, owner.image!))).toEqual(bytes)
    expect(isolated.db.select().from(schema.user).where(eq(schema.user.id, 'first')).get()?.image).toBeNull()
    const retrieved = await get()
    expect(retrieved.status).toBe(200)
    expect(retrieved.headers.get('content-type')).toBe(`image/${format}`)
    expect(retrieved.headers.get('x-content-type-options')).toBe('nosniff')
    expect(Buffer.from(await retrieved.arrayBuffer())).toEqual(bytes)
  })

  it('cleans up a new file after DB failure and preserves the previous avatar', async () => {
    await mkdir(path.dirname(path.join(root, key)), { recursive: true })
    await writeFile(path.join(root, key), images.png)
    setImage(key)
    sqlite.exec("CREATE TRIGGER fail_image BEFORE UPDATE OF image ON user BEGIN SELECT RAISE(ABORT, 'private detail'); END;")
    const response = await post(images.jpeg)
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('private detail')
    expect(await readdir(path.dirname(path.join(root, key)))).toEqual([path.basename(key)])
    expect(await readFile(path.join(root, key))).toEqual(images.png)
    expect(isolated.db.select().from(schema.user).where(eq(schema.user.id, 'owner')).get()?.image).toBe(key)
  })

  it('closes the file descriptor and settles the handler when a client disconnects', async () => {
    await mkdir(path.dirname(path.join(root, key)), { recursive: true })
    await writeFile(path.join(root, key), Buffer.concat([images.png, Buffer.alloc(1024 * 1024)]))
    setImage(key)
    // Exercise H3's Node stream path without opening a network listener. A slow
    // response creates backpressure, then disconnects during the first chunk.
    const response = Object.assign(new Writable({
      highWaterMark: 1,
      write() { this.destroy() },
    }), { socket: {}, setHeader: vi.fn(), _data: undefined as ReadStream | undefined })
    const socket = new Socket()
    const event = createEvent(new IncomingMessage(socket), response as unknown as ServerResponse)
    event.context.user = { id: 'owner', name: 'Owner', email: 'owner@example.test', emailVerified: true, createdAt: new Date(), updatedAt: new Date() }
    event.context.params = { id: 'owner' }
    let settled = false
    const pending = Promise.resolve(retrieve(event)).catch(() => {}).finally(() => { settled = true })
    try {
      await vi.waitFor(() => {
        expect(response.destroyed).toBe(true)
        expect(response._data?.closed).toBe(true)
        expect(settled).toBe(true)
      }, { timeout: 1000 })
    } finally {
      response._data?.destroy(new Error('Test cleanup'))
      response.destroy()
      socket.destroy()
      await pending
    }
  })

  it('does not follow symlinked upload directories', async () => {
    const outside = path.join(temporary, 'outside')
    await mkdir(outside)
    await symlink(outside, path.join(root, 'users'))
    expect((await post(images.png)).status).toBe(500)
    expect(await readdir(outside)).toEqual([])
  })

  it('handles a filesystem failure without changing the stored avatar', async () => {
    await writeFile(path.join(root, 'users'), 'not a directory')
    expect((await post(images.png)).status).toBe(500)
    expect(isolated.db.select().from(schema.user).where(eq(schema.user.id, 'owner')).get()?.image).toBeNull()
  })

  it.each(['../outside', '/etc/passwd', 'users/owner/images/../../outside', 'users\\owner\\images\\x', 'users/first/images/11111111-1111-4111-8111-111111111111', 'users/owner/images/not-a-uuid', key + '\n', key + '.png'])('rejects unsafe key %j', async (image) => {
    setImage(image)
    expect((await get()).status).toBe(404)
  })

  it('rejects final-file and parent-directory symlink escapes', async () => {
    const outside = path.join(temporary, 'outside.png')
    await writeFile(outside, images.png)
    await mkdir(path.dirname(path.join(root, key)), { recursive: true })
    await symlink(outside, path.join(root, key))
    setImage(key)
    expect((await get()).status).toBe(404)
    await rm(path.join(root, 'users'), { recursive: true })
    const outsideDirectory = path.join(temporary, 'outside-directory')
    await mkdir(path.join(outsideDirectory, 'owner/images'), { recursive: true })
    await writeFile(path.join(outsideDirectory, 'owner/images', path.basename(key)), images.png)
    await symlink(outsideDirectory, path.join(root, 'users'))
    expect((await get()).status).toBe(404)
  })

  it('rejects unsupported files and directories at otherwise valid keys', async () => {
    await mkdir(path.dirname(path.join(root, key)), { recursive: true })
    await writeFile(path.join(root, key), 'not an image')
    setImage(key)
    expect((await get()).status).toBe(415)
    await rm(path.join(root, key))
    await mkdir(path.join(root, key))
    expect((await get()).status).toBe(404)
  })

  it('returns 404 for missing references, missing files, and missing users', async () => {
    expect((await get()).status).toBe(404)
    setImage(key)
    expect((await get()).status).toBe(404)
    isolated.db.delete(schema.user).where(eq(schema.user.id, 'owner')).run()
    expect((await get()).status).toBe(404)
  })
})
