import { and, eq, sql } from 'drizzle-orm'
import { profile, user } from '../db/schema'

// SQLite trim defaults to ASCII spaces. Match JS String.trim for legacy rows,
// including tabs, newlines, NBSP and other Unicode whitespace.
const whitespace = ' \t\n\v\f\r\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff'

// Every public read (including avatars) shares this database-owned policy.
// An opt-in flag alone must not expose incomplete or malformed legacy data.
export const publicationEligibility = and(
  eq(profile.directoryPublished, true),
  sql`length(trim(${user.name}, ${whitespace})) > 0`,
  sql`length(trim(${profile.major}, ${whitespace})) > 0`,
  sql`typeof(${profile.graduationYear}) = 'integer'`,
  sql`${profile.graduationYear} BETWEEN 1900 AND 2100`,
)!
