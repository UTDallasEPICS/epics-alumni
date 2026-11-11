// returns one page (15) of projects for infinite-scroll list.
// skip: number of rows to skip (0, 15, 30, ...).
// missing/invalid values fall back to 0.
// selects only cols the cards, modal, and search use.
// omits createdAt/updatedAt.
// sorted by sem, title, then id so pages stay stable btwn requests.
// projects where the text matches a field.
// predictable search and semester values from URL before query

import { db } from '../../utils/db'
import { project } from '../../db/schema'
import { asc, eq, or, like, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const skip = Math.max(0, Number(query.skip) || 0)
  const pageSize = 15

  const search = typeof query.search === 'string' ? query.search.trim() : ''
  const semester = typeof query.semester === 'string' ? query.semester : ''

  return await db
    .select({
      id: project.id,
      projectTitle: project.projectTitle,
      semester: project.semester,
      projectCategory: project.projectCategory,
      status: project.status,
      description: project.description,
    })
    .from(project)
    .where(
      and(
      semester ? eq(project.semester, semester) : undefined,
      search
        ? or(
            like(project.projectTitle, `%${search}%`),
            like(project.projectCategory, `%${search}%`),
            like(project.description, `%${search}%`),
            like(project.semester, `%${search}%`),
            like(project.status, `%${search}%`),
          )
        : undefined
      )
    )
    .orderBy(asc(project.semester), asc(project.projectTitle), asc(project.id))
    .limit(pageSize)
    .offset(skip)
})
