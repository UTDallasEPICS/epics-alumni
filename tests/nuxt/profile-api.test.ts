// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import { createApp, createError, eventHandler, toWebHandler } from 'h3'
import * as schema from '../../server/db/schema'
import getProfile from '../../server/api/profile.get'
import putProfile from '../../server/api/profile.put'

const isolated = vi.hoisted(() => ({ db: undefined as unknown as BetterSQLite3Database<typeof schema> }))
vi.mock('../../server/utils/db', () => ({ get db() { return isolated.db } }))

let sqlite: InstanceType<typeof Database>
let request: ReturnType<typeof toWebHandler>
const originalDate = new Date('2020-01-01T00:00:00Z')
const valid = { name: '  Updated Owner  ', graduationYear: '2026', biography: 'First line\n\n  Indented line  ' }

beforeEach(() => {
  vi.stubGlobal('createError', createError)
  sqlite = new Database(':memory:')
  // Disposable fixture schema only: no app database or migration runner.
  sqlite.exec(`
    CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
      emailVerified INTEGER NOT NULL DEFAULT 0, image TEXT, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
    CREATE TABLE profile (userId TEXT PRIMARY KEY REFERENCES user(id), major TEXT, graduationYear INTEGER,
      company TEXT, jobTitle TEXT, bio TEXT, linkedinUrl TEXT, githubUrl TEXT, websiteUrl TEXT,
      createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
  `)
  isolated.db = drizzle(sqlite, { schema })
  isolated.db.insert(schema.user).values([
    { id: 'first', name: 'First User', email: 'first@example.test', createdAt: originalDate, updatedAt: originalDate },
    { id: 'owner', name: 'Owner', email: 'owner@example.test', createdAt: originalDate, updatedAt: originalDate },
  ]).run()
  const app = createApp({ onError: () => {} })
  app.use(eventHandler((event) => {
    const id = event.headers.get('x-test-user')
    if (id) event.context.user = { id, name: 'Stale session name', email: 'session@example.test', emailVerified: true, createdAt: originalDate, updatedAt: originalDate }
    return event.method === 'PUT' ? putProfile(event) : getProfile(event)
  }))
  request = toWebHandler(app)
})

afterEach(() => {
  sqlite?.close()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function call(method = 'GET', body?: unknown, id: string | null = 'owner') {
  return request(new Request('http://localhost/api/profile?userId=first', {
    method,
    headers: { ...(id ? { 'x-test-user': id } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }))
}

describe('current-user profile handlers with real isolated SQLite', () => {
  it.each(['GET', 'PUT'])('%s requires authentication', async (method) => {
    expect((await call(method, method === 'PUT' ? valid : undefined, null)).status).toBe(401)
  })

  it('reads the session owner, ignores query IDs, and does not insert a missing profile', async () => {
    const response = await call()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 'owner', name: 'Owner', email: 'owner@example.test', graduationYear: '', biography: '', imageUrl: null })
    expect(isolated.db.select().from(schema.profile).all()).toHaveLength(0)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })

  it('creates once, persists after a fresh GET, and updates only the owner', async () => {
    expect((await call('PUT', valid)).status).toBe(200)
    expect(await (await call()).json()).toMatchObject({ id: 'owner', name: 'Updated Owner', graduationYear: '2026', biography: valid.biography })
    expect((await call('PUT', { ...valid, name: 'Second save', graduationYear: '' })).status).toBe(200)
    const rows = isolated.db.select().from(schema.profile).all()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ userId: 'owner', graduationYear: null, bio: valid.biography })
    expect(rows[0]?.createdAt).toBeInstanceOf(Date)
    expect(isolated.db.select().from(schema.user).where(eq(schema.user.id, 'first')).get()?.name).toBe('First User')
  })

  it('preserves unrelated fields and creation timestamps while advancing update timestamps', async () => {
    const preserved = { major: 'CS', company: 'Employer', jobTitle: 'Engineer', linkedinUrl: 'https://example.test/in', githubUrl: 'https://example.test/git', websiteUrl: 'https://example.test', createdAt: originalDate }
    isolated.db.insert(schema.profile).values({ userId: 'owner', ...preserved, updatedAt: originalDate }).run()
    await call('PUT', valid)
    const row = isolated.db.select().from(schema.profile).get()!
    expect(row).toMatchObject(preserved)
    expect(row.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime())
    const identity = isolated.db.select().from(schema.user).where(eq(schema.user.id, 'owner')).get()!
    expect(identity.createdAt).toEqual(originalDate)
    expect(identity.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime())
  })

  it.each(['1899', '2101', '2026.5', '20e3', 'NaN', '２０２６', '202', ' 2026 ', '2026\n'])('rejects invalid year %j without writing', async (year) => {
    expect((await call('PUT', { ...valid, graduationYear: year })).status).toBe(400)
    expect(isolated.db.select().from(schema.profile).all()).toHaveLength(0)
    expect(isolated.db.select().from(schema.user).where(eq(schema.user.id, 'owner')).get()?.name).toBe('Owner')
  })

  it.each(['1900', '2100'])('accepts inclusive year boundary %s', async (year) => {
    expect((await call('PUT', { ...valid, graduationYear: year })).status).toBe(200)
  })

  it.each([
    { name: '  ' }, { name: 'x'.repeat(101) }, { name: 1 },
    { graduationYear: 2026 }, { graduationYear: null },
    { biography: 'x'.repeat(2001) }, { biography: null },
  ])('rejects invalid field data %j', async (changes) => {
    expect((await call('PUT', { ...valid, ...changes })).status).toBe(400)
  })

  it.each(['userId', 'id', 'email', 'emailVerified', 'roles', 'projects', 'image', 'imageUrl', 'createdAt', 'updatedAt', 'other'])('rejects additional property %s', async (field) => {
    expect((await call('PUT', { ...valid, [field]: 'first' })).status).toBe(400)
    expect(isolated.db.select().from(schema.profile).all()).toHaveLength(0)
  })

  it.each(['GET', 'PUT'])('%s returns 404 for a deleted session owner', async (method) => {
    expect((await call(method, method === 'PUT' ? valid : undefined, 'missing')).status).toBe(404)
  })

  it('rolls back the name and profile on a real database failure without leaking SQL', async () => {
    sqlite.exec("CREATE TRIGGER fail_profile BEFORE INSERT ON profile BEGIN SELECT RAISE(ABORT, 'private database detail'); END;")
    const response = await call('PUT', valid)
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('private database detail')
    expect(isolated.db.select().from(schema.user).where(eq(schema.user.id, 'owner')).get()?.name).toBe('Owner')
    expect(isolated.db.select().from(schema.profile).all()).toHaveLength(0)
  })

  it('returns a strict public response and hides invalid storage references', async () => {
    isolated.db.update(schema.user).set({ image: '../../private-file' }).where(eq(schema.user.id, 'owner')).run()
    const response = await (await call('PUT', valid)).json()
    expect(Object.keys(response).sort()).toEqual(['biography', 'email', 'graduationYear', 'id', 'imageUrl', 'name'])
    expect(response.imageUrl).toBeNull()
    isolated.db.update(schema.user).set({ image: 'users/owner/images/11111111-1111-4111-8111-111111111111' }).where(eq(schema.user.id, 'owner')).run()
    expect(await (await call()).json()).toMatchObject({ imageUrl: '/api/users/owner/profile' })
  })

  it('sanitizes database read failures', async () => {
    sqlite.exec('DROP TABLE profile')
    const response = await call()
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('no such table')
  })
})
