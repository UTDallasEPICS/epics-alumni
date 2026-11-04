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
import { deriveOnboarding } from '../../shared/profile'

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

describe('onboarding from persisted profile data', () => {
  it('loads a new account with accurate missing fields and does not create a profile', async () => {
    const result = await (await call()).json()
    expect(result).toMatchObject({ name: 'Owner', email: 'owner@example.test', major: '', graduationYear: '', onboarding: { completed: false, missingFields: ['major', 'graduationYear'] } })
    expect(isolated.db.select().from(schema.profile).all()).toEqual([])
  })

  it.each([
    [{ name: '', major: 'CS', graduationYear: '2026' }, ['name']],
    [{ name: '  ', major: 'CS', graduationYear: '2026' }, ['name']],
    [{ name: 'Owner', major: ' ', graduationYear: '2026' }, ['major']],
    [{ name: 'Owner', major: 'CS', graduationYear: '' }, ['graduationYear']],
    [{ name: 'Owner', major: '', graduationYear: '' }, ['major', 'graduationYear']],
    [{ name: 'Owner', major: 'CS', graduationYear: '2026.5' }, ['graduationYear']],
    [{ name: 'Owner', major: 'CS', graduationYear: '1899' }, ['graduationYear']],
    [{ name: 'Owner', major: 'CS', graduationYear: '2026' }, []],
  ])('derives exact missing fields for %j', (values, missingFields) => {
    expect(deriveOnboarding(values)).toEqual({ completed: missingFields.length === 0, missingFields })
  })

  it('reports a blank legacy name from the database without altering it', async () => {
    isolated.db.update(schema.user).set({ name: ' ' }).where(eq(schema.user.id, 'owner')).run()
    expect(await (await call()).json()).toMatchObject({ onboarding: { completed: false, missingFields: ['name', 'major', 'graduationYear'] } })
    expect(isolated.db.select().from(schema.user).where(eq(schema.user.id, 'owner')).get()?.name).toBe(' ')
  })

  it('permits partial saves, then completes and remains complete after a fresh GET', async () => {
    expect(await (await call('PUT', { ...valid, graduationYear: '' })).json()).toMatchObject({ onboarding: { completed: false, missingFields: ['major', 'graduationYear'] } })
    const saved = await (await call('PUT', { ...valid, major: 'CS' })).json()
    expect(saved.onboarding).toEqual({ completed: true, missingFields: [] })
    expect(await (await call()).json()).toEqual(saved)
    expect(await (await call('GET', undefined, 'first')).json()).toMatchObject({ name: 'First User', onboarding: { completed: false, missingFields: ['major', 'graduationYear'] } })
  })

  it.each([{ major: '' }, { graduationYear: '' }])('becomes incomplete when a required value is cleared: %j', async (changes) => {
    await call('PUT', { ...valid, major: 'CS' })
    expect(await (await call('PUT', { ...valid, ...changes })).json()).toMatchObject({ onboarding: { completed: false, missingFields: Object.keys(changes) } })
    expect(await (await call()).json()).toMatchObject({ onboarding: { completed: false } })
  })

  it('retains name validation rather than allowing a blank-name update', async () => {
    await call('PUT', { ...valid, major: 'CS' })
    expect((await call('PUT', { ...valid, name: '' })).status).toBe(400)
    expect(await (await call()).json()).toMatchObject({ onboarding: { completed: true } })
  })

  it('does not complete onboarding when the save fails transactionally', async () => {
    await call('PUT', { ...valid, graduationYear: '' })
    const before = await (await call()).json()
    sqlite.exec("CREATE TRIGGER fail_onboarding BEFORE UPDATE ON profile BEGIN SELECT RAISE(ABORT, 'fixture failure'); END;")
    expect((await call('PUT', { ...valid, major: 'CS' })).status).toBe(500)
    expect(await (await call()).json()).toEqual(before)
  })

  it('rejects client-supplied completion state and requires the session owner', async () => {
    expect((await call('PUT', { ...valid, onboarding: { completed: true } })).status).toBe(400)
    expect((await call('PUT', { ...valid, major: 'CS' }, null)).status).toBe(401)
    expect(isolated.db.select().from(schema.profile).all()).toEqual([])
  })
})


describe('persistent explicit directory consent', () => {
  const complete = { ...valid, major: 'CS' }

  it('defaults to private and does not infer consent from completion', async () => {
    expect(await (await call()).json()).toMatchObject({ directoryPublished: false })
    expect(await (await call('PUT', complete)).json()).toMatchObject({ directoryPublished: false, onboarding: { completed: true } })
    expect(isolated.db.select().from(schema.profile).get()?.directoryPublished).toBe(false)
  })

  it('publishes and withdraws consent durably for only the session owner', async () => {
    expect(await (await call('PUT', { ...complete, directoryPublished: true })).json()).toMatchObject({ directoryPublished: true })
    expect(await (await call()).json()).toMatchObject({ directoryPublished: true })
    expect(await (await call('GET', undefined, 'first')).json()).toMatchObject({ directoryPublished: false })
    // Older clients preserve consent when they omit the setting.
    expect(await (await call('PUT', complete)).json()).toMatchObject({ directoryPublished: true })
    expect(await (await call('PUT', { ...complete, directoryPublished: false })).json()).toMatchObject({ directoryPublished: false })
    expect(isolated.db.select().from(schema.profile).get()?.directoryPublished).toBe(false)
  })

  it.each([{ major: '' }, { graduationYear: '' }])('rejects incomplete opt-in atomically: %j', async (changes) => {
    await call('PUT', complete)
    const before = await (await call()).json()
    const response = await call('PUT', { ...complete, ...changes, name: 'Unsaved', directoryPublished: true })
    expect(response.status).toBe(400)
    expect(await (await call()).json()).toEqual(before)
  })

  it('revokes on incomplete edits and requires a new opt-in after completion', async () => {
    await call('PUT', { ...complete, directoryPublished: true })
    expect(await (await call('PUT', { ...complete, major: '' })).json()).toMatchObject({ directoryPublished: false, onboarding: { completed: false } })
    expect(isolated.db.select().from(schema.profile).get()?.directoryPublished).toBe(false)
    expect(await (await call('PUT', complete)).json()).toMatchObject({ directoryPublished: false, onboarding: { completed: true } })
  })

  it.each(['true', 1, null, {}, []])('rejects nonboolean consent %j', async (directoryPublished) => {
    expect((await call('PUT', { ...complete, directoryPublished })).status).toBe(400)
    expect(isolated.db.select().from(schema.profile).all()).toEqual([])
  })

  it('rolls back publication along with text if a database write fails', async () => {
    await call('PUT', complete)
    sqlite.exec("CREATE TRIGGER fail_consent BEFORE UPDATE ON profile BEGIN SELECT RAISE(ABORT, 'fixture'); END;")
    expect((await call('PUT', { ...complete, directoryPublished: true })).status).toBe(500)
    expect(await (await call()).json()).toMatchObject({ directoryPublished: false })
  })
})
