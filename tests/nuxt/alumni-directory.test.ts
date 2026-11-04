// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { eq, inArray, sql } from 'drizzle-orm'
import { createApp, createError, eventHandler, toWebHandler } from 'h3'
import * as schema from '../../server/db/schema'
import list, { queryAlumni, queryAlumnus } from '../../server/api/alumni/index.get'
import detail from '../../server/api/alumni/[id].get'
import { alumniQuerySchema } from '../../shared/alumni'

const isolated = vi.hoisted(() => ({ db: undefined as unknown as BetterSQLite3Database<typeof schema> }))
vi.mock('../../server/utils/db', () => ({ get db() { return isolated.db } }))
let sqlite: InstanceType<typeof Database>
let request: ReturnType<typeof toWebHandler>
const statements: string[] = []

beforeEach(() => {
  vi.stubGlobal('createError', createError)
  sqlite = new Database(':memory:')

  isolated.db = drizzle(sqlite, { schema, logger: { logQuery(query) { statements.push(query) } } })
  migrate(isolated.db, { migrationsFolder: 'drizzle' })
  isolated.db.insert(schema.user).values([
    { id: 'b', name: 'Ada', email: 'b@example.test' },
    { id: 'a', name: 'ada', email: 'a@example.test', image: 'users/a/images/11111111-1111-4111-8111-111111111111' },
    { id: 'c', name: 'Grace', email: 'c@example.test', image: '../../secret' },
    { id: 'd', name: '100%_\\ literal', email: 'd@example.test' },
    { id: 'e', name: 'No Profile', email: 'e@example.test' },
  ]).run()
  isolated.db.insert(schema.profile).values([
    { userId: 'a', major: 'Computer Science', company: 'Acme', jobTitle: 'Engineer', graduationYear: 2026, bio: 'Bio', githubUrl: 'https://github.com/ada' },
    { userId: 'b', major: 'Computer Engineering', company: 'ACME', jobTitle: 'Manager', graduationYear: 2025 },
    { userId: 'c', major: 'Math', company: 'Other', jobTitle: 'Engineer', graduationYear: 2026 },
    { userId: 'd', major: '100%_\\ literal', company: 'Other', jobTitle: 'Analyst', graduationYear: 2024 },
  ]).run()
  const app = createApp({ onError: () => {} })
  app.use(eventHandler((event) => {
    if (event.headers.get('x-test-user')) event.context.user = { id: 'a', name: 'Ada', email: 'a@example.test', emailVerified: true, createdAt: new Date(), updatedAt: new Date() }
    const id = event.headers.get('x-test-detail-id')
    if (id !== null) {
      event.context.params = { id }
      return detail(event)
    }
    return list(event)
  }))
  request = toWebHandler(app)
  statements.length = 0
})

afterEach(() => {
  sqlite.close()
  vi.unstubAllGlobals()
})

function call(query = '', id?: string, authenticated = true) {
  return request(new Request(`http://localhost/api/alumni${query}`, {
    headers: { ...(authenticated ? { 'x-test-user': 'a' } : {}), ...(id === undefined ? {} : { 'x-test-detail-id': id }) },
  }))
}

// This predicate exists only in disposable fixture tests. Live handlers always
// use persisted consent and completeness, regardless of request parameters.
const fixtureEligibility = inArray(schema.user.id, ['a', 'b', 'c', 'd'])
function search(query: Record<string, string> = {}) {
  return queryAlumni(isolated.db, alumniQuerySchema.parse(query), fixtureEligibility)
}

describe('authenticated directory routes with private-by-default profiles', () => {
  it.each([undefined, 'a'])('requires authentication for list/detail %s', async (id) => {
    expect((await call('', id, false)).status).toBe(401)
    expect(statements).toHaveLength(0)
  })

  it('publishes no real users, even complete fixture profiles, with accurate empty pagination', async () => {
    const response = await call('?page=3&limit=2')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect(await response.json()).toEqual({ data: [], pagination: { page: 3, limit: 2, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } })
  })

  it.each(['a', 'e', 'missing'])('returns 404 for unpublished or missing ID %s', async (id) => {
    const response = await call('', id)
    expect(response.status).toBe(404)
    expect(await response.text()).not.toContain('@example.test')
  })

  it.each(['', '../a', 'a/b', 'x'.repeat(129)])('validates requested ID %j', async (id) => {
    expect((await call('', id)).status).toBe(400)
  })

  it.each(['?published=true', '?email=x', '?__proto__=x', '?constructor=x', '?=x', '?page=1&page=1', '?q=ada&q=grace', '?limit=51', '?page=1e2', '?sort=email_asc', '?graduationYear=abc'])('rejects invalid route query %s', async (query) => {
    expect((await call(query)).status).toBe(400)
    expect(statements).toHaveLength(0)
  })

  it('sanitizes database failures for both routes', async () => {
    sqlite.exec('DROP TABLE profile')
    for (const id of [undefined, 'a']) {
      const response = await call('', id)
      expect(response.status).toBe(500)
      expect(await response.text()).not.toContain('no such table')
    }
  })
})

describe('directory SQL with explicit synthetic eligibility', () => {
  it.each([
    [{ q: 'ADA' }, ['a', 'b']], [{ major: 'computer' }, ['a', 'b']],
    [{ company: 'acme' }, ['a', 'b']], [{ jobTitle: 'ENGINEER' }, ['a', 'c']],
    [{ graduationYear: '2026' }, ['a', 'c']],
    [{ q: 'ad', major: 'science', company: 'acme', jobTitle: 'engineer', graduationYear: '2026' }, ['a']],
  ] as const)('applies filters %j consistently to results and count', (query, ids) => {
    const result = search(query)
    expect(result.data.map((entry) => entry.id)).toEqual(ids)
    expect(result.pagination.total).toBe(ids.length)
  })

  it.each(['%', '_', '\\'])('escapes literal LIKE wildcard %s in search and filters', (value) => {
    expect(search({ q: value }).data.map((entry) => entry.id)).toEqual(['d'])
    expect(search({ major: value }).data.map((entry) => entry.id)).toEqual(['d'])
  })

  it('treats SQL injection payloads as values', () => {
    expect(search({ q: "' OR 1=1 --" }).data).toEqual([])
    expect(isolated.db.select().from(schema.user).all()).toHaveLength(5)
  })

  it.each([
    ['name_asc', ['d', 'a', 'b', 'c']], ['name_desc', ['c', 'a', 'b', 'd']],
    ['graduation_year_asc', ['d', 'b', 'a', 'c']], ['graduation_year_desc', ['a', 'c', 'b', 'd']],
  ] as const)('uses stable %s with ID tie-breaking', (sort, ids) => {
    expect(search({ sort }).data.map((entry) => entry.id)).toEqual(ids)
  })

  it('paginates in SQL with consistent totals and no N+1 queries', () => {
    const result = search({ page: '2', limit: '2' })
    expect(result.data.map((entry) => entry.id)).toEqual(['b', 'c'])
    expect(result.pagination).toEqual({ page: 2, limit: 2, total: 4, totalPages: 2, hasNextPage: false, hasPreviousPage: true })
    const selects = statements.filter((query) => query.startsWith('select'))
    expect(selects).toHaveLength(2)
    expect(selects[1]).toContain('limit ? offset ?')
    expect(search({ page: '3', limit: '2' }).data).toEqual([])
  })

  it('applies the same explicit eligibility to list and detail and serializes safe fields', () => {
    const entry = queryAlumnus(isolated.db, 'a', fixtureEligibility)!
    expect(entry).toEqual(search({ q: 'ada' }).data[0])
    expect(Object.keys(entry).sort()).toEqual(['biography', 'company', 'githubUrl', 'graduationYear', 'id', 'imageUrl', 'jobTitle', 'linkedinUrl', 'major', 'name', 'websiteUrl'])
    expect(entry.imageUrl).toBe('/api/users/a/profile')
    expect(queryAlumnus(isolated.db, 'c', fixtureEligibility)?.imageUrl).toBeNull()
    expect(queryAlumnus(isolated.db, 'e', fixtureEligibility)).toBeNull()
    expect(queryAlumnus(isolated.db, 'missing', sql`1 = 1`)).toBeNull()
    expect(queryAlumni(isolated.db, alumniQuerySchema.parse({}), eq(schema.user.id, 'e')).data[0]).toMatchObject({ major: null, biography: null, graduationYear: null })
    expect(JSON.stringify(search())).not.toContain('@example.test')
  })
})


describe('live persisted publication policy', () => {
  it('uses the same policy for search, combined filters, totals, pagination, and details', async () => {
    isolated.db.update(schema.profile).set({ directoryPublished: true }).where(inArray(schema.profile.userId, ['a', 'b'])).run()
    const first = await (await call('?q=ad&major=computer&company=acme&limit=1')).json()
    expect(first.data.map((entry: { id: string }) => entry.id)).toEqual(['a'])
    expect(first.pagination).toMatchObject({ total: 2, totalPages: 2, hasNextPage: true })
    const second = await (await call('?q=ad&major=computer&company=acme&limit=1&page=2')).json()
    expect(second.data.map((entry: { id: string }) => entry.id)).toEqual(['b'])
    expect(await (await call('', 'a')).json()).toEqual(first.data[0])
    expect(JSON.stringify(first)).not.toContain('email')
    expect((await call('', 'c')).status).toBe(404)
    expect((await (await call('?q=Grace&major=Math&graduationYear=2026')).json()).pagination.total).toBe(0)
    isolated.db.update(schema.profile).set({ directoryPublished: false }).where(eq(schema.profile.userId, 'a')).run()
    expect((await call('', 'a')).status).toBe(404)
    const remaining = await (await call('?q=ad&limit=1')).json()
    expect(remaining.pagination.total).toBe(1)
    expect(remaining.data[0].id).toBe('b')
  })

  it.each([
    { major: '' }, { major: '\t\n\u00a0' }, { graduationYear: null }, { graduationYear: 1899 }, { graduationYear: 2026.5 },
  ])('never exposes an incomplete legacy record even with consent: %j', async (changes) => {
    isolated.db.update(schema.profile).set({ ...changes, directoryPublished: true }).where(eq(schema.profile.userId, 'a')).run()
    expect((await call('', 'a')).status).toBe(404)
    expect((await (await call()).json()).pagination.total).toBe(0)
  })

  it('also requires a nonblank saved name', async () => {
    isolated.db.update(schema.profile).set({ directoryPublished: true }).where(eq(schema.profile.userId, 'a')).run()
    isolated.db.update(schema.user).set({ name: '\t\u00a0' }).where(eq(schema.user.id, 'a')).run()
    expect((await call('', 'a')).status).toBe(404)
    expect((await (await call()).json()).data).toEqual([])
  })
})
