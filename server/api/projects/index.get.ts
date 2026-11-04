// returns one page (15) of projects for infinite-scroll list.
// skip: number of rows to skip (0, 15, 30, ...).
// missing/invalid values fall back to 0.
// selects only cols the cards, modal, and search use.
// omits createdAt/updatedAt.
// sorted by sem, title, then id so pages stay stable btwn requests.

import { db } from '../../utils/db'
import { project } from '../../db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const skip = Math.max(0, Number(query.skip) || 0)
  const pageSize = 15

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
    .orderBy(asc(project.semester), asc(project.projectTitle), asc(project.id))
    .limit(pageSize)
    .offset(skip)
})
