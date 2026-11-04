// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { alumniIdSchema, alumniQuerySchema, directoryPagination, toAlumniEntry, validateAlumniQuery } from '../../shared/alumni'

describe('alumni directory contracts', () => {
  it.each(['__proto__=x', 'constructor=x', '=x', 'q=x&q=x', '%71=x&q=y'])('rejects unknown or repeated raw query %s', (query) => {
    expect(validateAlumniQuery(new URLSearchParams(query)).success).toBe(false)
  })
  it('normalizes defaults and valid scalar parameters', () => {
    expect(alumniQuerySchema.parse({})).toEqual({ q: '', page: 1, limit: 20, sort: 'name_asc' })
    expect(alumniQuerySchema.parse({ q: '  Ada ', major: ' CS ', company: ' Acme ', jobTitle: ' Engineer ', graduationYear: '2026', page: '2', limit: '50', sort: 'name_desc' }))
      .toEqual({ q: 'Ada', major: 'CS', company: 'Acme', jobTitle: 'Engineer', graduationYear: '2026', page: 2, limit: 50, sort: 'name_desc' })
  })

  it.each(['q', 'major', 'company', 'jobTitle', 'graduationYear', 'page', 'limit', 'sort'])('rejects duplicate scalar %s', (field) => {
    expect(alumniQuerySchema.safeParse({ [field]: ['1', '1'] }).success).toBe(false)
  })

  it.each([
    { unknown: 'x' }, { published: 'true' }, { q: 'x'.repeat(101) }, { major: 'x'.repeat(121) },
    { company: 'x'.repeat(121) }, { jobTitle: 'x'.repeat(121) }, { graduationYear: '26' },
    { graduationYear: '2026\n' }, { graduationYear: '' }, { graduationYear: '2101' },
    { page: '0' }, { page: '-1' }, { page: '1.5' }, { page: '1e2' }, { page: ' 2' }, { page: '01' },
    { page: 'Infinity' }, { page: '9007199254740992' }, { page: '9007199254740991', limit: '50' },
    { limit: '0' }, { limit: '51' }, { limit: '2.5' }, { limit: 20 }, { sort: 'email_asc' },
  ])('rejects malformed query %j', (query) => {
    expect(alumniQuerySchema.safeParse(query).success).toBe(false)
  })

  it.each(['name_asc', 'name_desc', 'graduation_year_asc', 'graduation_year_desc'])('accepts sort %s', (sort) => {
    expect(alumniQuerySchema.parse({ sort }).sort).toBe(sort)
  })

  it('accepts exact length and pagination boundaries', () => {
    expect(alumniQuerySchema.safeParse({ q: 'x'.repeat(100), major: 'x'.repeat(120), company: 'x'.repeat(120), jobTitle: 'x'.repeat(120), page: '1', limit: '1' }).success).toBe(true)
  })

  it('returns accurate empty, first, middle, last, and beyond-last metadata', () => {
    expect(directoryPagination(1, 20, 0)).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false })
    expect(directoryPagination(5, 20, 0)).toMatchObject({ hasNextPage: false, hasPreviousPage: false })
    expect(directoryPagination(1, 2, 5)).toMatchObject({ totalPages: 3, hasNextPage: true, hasPreviousPage: false })
    expect(directoryPagination(2, 2, 5)).toMatchObject({ hasNextPage: true, hasPreviousPage: true })
    expect(directoryPagination(3, 2, 5)).toMatchObject({ hasNextPage: false, hasPreviousPage: true })
    expect(directoryPagination(4, 2, 5)).toMatchObject({ hasNextPage: false, hasPreviousPage: true })
  })

  it.each(['', '../owner', 'owner/name', 'owner\n', 'x'.repeat(129)])('rejects invalid ID %j', (id) => {
    expect(alumniIdSchema.safeParse(id).success).toBe(false)
  })

  it('serializes only approved fields, including safe links and avatar URL', () => {
    const source = {
      id: 'owner', name: 'Owner', graduationYear: 2026, major: 'CS', company: null, jobTitle: null, biography: 'Bio',
      linkedinUrl: 'https://linkedin.com/in/a', githubUrl: 'javascript:bad', websiteUrl: 'https://127.0.0.1',
      image: 'users/owner/images/11111111-1111-4111-8111-111111111111',
      email: 'private@example.test', emailVerified: true, token: 'secret', password: 'secret', createdAt: 0,
    }
    expect(JSON.parse(JSON.stringify(toAlumniEntry(source)))).toEqual({
      id: 'owner', name: 'Owner', graduationYear: 2026, major: 'CS', company: null, jobTitle: null, biography: 'Bio',
      linkedinUrl: 'https://linkedin.com/in/a', githubUrl: null, websiteUrl: null, imageUrl: '/api/users/owner/profile',
    })
    expect(toAlumniEntry({ ...source, image: '/private/file' }).imageUrl).toBeNull()
  })
})
