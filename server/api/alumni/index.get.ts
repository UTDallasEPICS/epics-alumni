import { createError, defineEventHandler, getRequestURL, setHeader } from 'h3'
import { and, asc, count, desc, eq, sql, type SQL, type SQLWrapper } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { db } from '../../utils/db'
import { requireUser } from '../../utils/session'
import { profile, user } from '../../db/schema'
import { validateAlumniQuery, directoryPagination, toAlumniEntry, type AlumniDirectoryResponse, type AlumniQuery } from '../../../shared/alumni'

import { publicationEligibility } from '../../utils/publication'
export { publicationEligibility } from '../../utils/publication'
type DirectoryDatabase = BetterSQLite3Database<typeof import('../../db/schema')>

const publicColumns = {
  id: user.id, name: user.name, image: user.image,
  graduationYear: profile.graduationYear, major: profile.major,
  company: profile.company, jobTitle: profile.jobTitle, biography: profile.bio,
  linkedinUrl: profile.linkedinUrl, githubUrl: profile.githubUrl, websiteUrl: profile.websiteUrl,
}

function contains(column: SQLWrapper, value: string) {
  const escaped = value.replace(/[!%_]/g, '!$&')
  return sql`lower(${column}) LIKE lower(${`%${escaped}%`}) ESCAPE '!'`
}

// Eligibility is required explicitly so fixture tests can exercise SQL behavior
// without adding a runtime publication switch or exposing unpublished users.
export function queryAlumni(database: DirectoryDatabase, query: AlumniQuery, eligibility: SQL): AlumniDirectoryResponse {
  const where = and(eligibility,
    query.q ? contains(user.name, query.q) : undefined,
    query.major ? contains(profile.major, query.major) : undefined,
    query.company ? contains(profile.company, query.company) : undefined,
    query.jobTitle ? contains(profile.jobTitle, query.jobTitle) : undefined,
    query.graduationYear ? eq(profile.graduationYear, Number(query.graduationYear)) : undefined,
  )
  const name = sql`lower(${user.name})`
  const sort = {
    name_asc: asc(name), name_desc: desc(name),
    graduation_year_asc: asc(profile.graduationYear), graduation_year_desc: desc(profile.graduationYear),
  }[query.sort]
  // One read transaction gives count and page the same eligibility and snapshot.
  return database.transaction((tx) => {
    const total = tx.select({ total: count() }).from(user).leftJoin(profile, eq(profile.userId, user.id)).where(where).get()!.total
    const rows = tx.select(publicColumns).from(user).leftJoin(profile, eq(profile.userId, user.id))
      .where(where).orderBy(sort, asc(user.id)).limit(query.limit).offset((query.page - 1) * query.limit).all()
    return { data: rows.map(toAlumniEntry), pagination: directoryPagination(query.page, query.limit, total) }
  })
}

export function queryAlumnus(database: DirectoryDatabase, id: string, eligibility: SQL) {
  const row = database.select(publicColumns).from(user).leftJoin(profile, eq(profile.userId, user.id))
    .where(and(eligibility, eq(user.id, id))).limit(1).get()
  return row ? toAlumniEntry(row) : null
}

export default defineEventHandler((event) => {
  requireUser(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const parsed = validateAlumniQuery(getRequestURL(event).searchParams)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid directory query' })
  try {
    return queryAlumni(db, parsed.data, publicationEligibility)
  } catch {
    throw createError({ statusCode: 500, statusMessage: 'Unable to load alumni directory' })
  }
})
