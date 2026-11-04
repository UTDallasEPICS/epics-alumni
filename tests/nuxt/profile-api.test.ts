// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
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
  // Apply real migrations to disposable in-memory SQLite only.

  isolated.db = drizzle(sqlite, { schema })
  migrate(isolated.db, { migrationsFolder: 'drizzle' })
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
  const professional = {
    major: 'Computer Science', company: 'Acme', jobTitle: 'Engineer',
    linkedinUrl: 'https://www.linkedin.com/in/owner', githubUrl: 'https://github.com/owner', websiteUrl: 'https://example.test/about',
  }

  it('persists all professional fields, trims them, and returns them after reload', async () => {
    const padded = Object.fromEntries(Object.entries(professional).map(([key, value]) => [key, `  ${value}  `]))
    const saved = await (await call('PUT', { ...valid, ...padded })).json()
    expect(saved).toMatchObject({ ...professional, onboarding: { completed: true, missingFields: [] } })
    expect(await (await call()).json()).toEqual(saved)
    expect(await (await call('GET', undefined, 'first')).json()).toMatchObject({ major: '', company: '', jobTitle: '' })
  })

  it('preserves omitted fields for older clients and clears explicitly empty fields to null', async () => {
    await call('PUT', { ...valid, ...professional })
    const createdAt = isolated.db.select().from(schema.profile).get()!.createdAt
    expect(await (await call('PUT', valid)).json()).toMatchObject(professional)
    const empty = Object.fromEntries(Object.keys(professional).map((field) => [field, '   ']))
    expect((await call('PUT', { ...valid, ...empty })).status).toBe(200)
    const row = isolated.db.select().from(schema.profile).get()!
    for (const field of Object.keys(professional) as (keyof typeof professional)[]) expect(row[field]).toBeNull()
    expect(row.createdAt).toEqual(createdAt)
    expect(await (await call()).json()).toMatchObject({ major: '', company: '', linkedinUrl: '', onboarding: { completed: false, missingFields: ['major'] } })
  })

  it.each([['major', 120], ['company', 160], ['jobTitle', 160]] as const)('enforces %s length boundary', async (field, length) => {
    expect((await call('PUT', { ...valid, [field]: 'x'.repeat(length) })).status).toBe(200)
    expect((await call('PUT', { ...valid, [field]: 'x'.repeat(length + 1) })).status).toBe(400)
    expect((await call('PUT', { ...valid, [field]: null })).status).toBe(400)
    expect((await call('PUT', { ...valid, [field]: 5 })).status).toBe(400)
  })

  it.each(['linkedinUrl', 'githubUrl', 'websiteUrl'] as const)('enforces the %s URL length boundary', async (field) => {
    const base = professional[field] + '/'
    const url = base + 'x'.repeat(2048 - base.length)
    expect((await call('PUT', { ...valid, [field]: url })).status).toBe(200)
    expect((await call('PUT', { ...valid, [field]: url + 'x' })).status).toBe(400)
  })

  it.each([
    ['linkedinUrl', 'https://linkedin.com.attacker.test/in/a'], ['linkedinUrl', 'https://github.com/a'],
    ['linkedinUrl', 'https://me:secret@linkedin.com/in/a'], ['githubUrl', 'https://github.com.attacker.test/a'],
    ['githubUrl', 'http://github.com/a'], ['githubUrl', 'https://linkedin.com/in/a'],
    ['githubUrl', 'https://@github.com/a'], ['websiteUrl', 'https:////example.com'],
    ['websiteUrl', 'javascript:alert(1)'], ['websiteUrl', '//example.com'], ['websiteUrl', 'https://localhost'],
    ['websiteUrl', 'https://dev.localhost'], ['websiteUrl', 'https://127.0.0.1'], ['websiteUrl', 'https://2130706433'],
    ['websiteUrl', 'https://0x7f000001'], ['websiteUrl', 'https://10.1.2.3'], ['websiteUrl', 'https://172.16.0.1'],
    ['websiteUrl', 'https://192.168.1.1'], ['websiteUrl', 'https://169.254.169.254'],
    ['websiteUrl', 'https://[::1]'], ['websiteUrl', 'https://[fc00::1]'], ['websiteUrl', 'https://[fe80::1]'],
    ['websiteUrl', 'https://[fec0::1]'], ['websiteUrl', 'https://[::ffff:192.168.1.1]'], ['websiteUrl', 'https://localhost.'],
    ['websiteUrl', 'https://[::ffff:127.0.0.1]'], ['websiteUrl', 'https://a:b@example.com'],
    ['websiteUrl', 'https://bad_host.example'], ['websiteUrl', 'https://-bad.example'],
  ])('rejects unsafe or wrong-service URL in %s: %s', async (field, value) => {
    expect((await call('PUT', { ...valid, [field]: value })).status).toBe(400)
    expect(isolated.db.select().from(schema.profile).all()).toHaveLength(0)
  })

  it.each(['https://example.com', 'https://8.8.8.8', 'https://[2606:4700:4700::1111]'])('accepts public website %s without fetching it', async (websiteUrl) => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    expect((await call('PUT', { ...valid, websiteUrl })).status).toBe(200)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rolls back an existing professional profile and name when an update fails', async () => {
    await call('PUT', { ...valid, ...professional })
    const before = await (await call()).json()
    sqlite.exec("CREATE TRIGGER fail_update BEFORE UPDATE ON profile BEGIN SELECT RAISE(ABORT, 'private failure'); END;")
    expect((await call('PUT', { ...valid, name: 'Lost name', major: 'Lost major' })).status).toBe(500)
    expect(await (await call()).json()).toEqual(before)
  })

  it.each(['GET', 'PUT'])('%s requires authentication', async (method) => {
    expect((await call(method, method === 'PUT' ? valid : undefined, null)).status).toBe(401)
  })

  it('reads the session owner, ignores query IDs, and does not insert a missing profile', async () => {
    const response = await call()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ id: 'owner', name: 'Owner', email: 'owner@example.test', graduationYear: '', biography: '', imageUrl: null, directoryPublished: false, major: '', company: '', jobTitle: '', linkedinUrl: '', githubUrl: '', websiteUrl: '', onboarding: { completed: false, missingFields: ['major', 'graduationYear'] } })
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
    expect(Object.keys(response).sort()).toEqual(['biography', 'company', 'directoryPublished', 'email', 'githubUrl', 'graduationYear', 'id', 'imageUrl', 'jobTitle', 'linkedinUrl', 'major', 'name', 'onboarding', 'websiteUrl'])
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
