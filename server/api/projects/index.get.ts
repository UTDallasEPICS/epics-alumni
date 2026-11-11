// returns one page (15) of projects for infinite-scroll list.
// skip: number of rows to skip (0, 15, 30, ...).
// missing/invalid values fall back to 0.
// selects only cols the cards, modal, and search use.
// omits createdAt/updatedAt.
// sorted by semester date (newest first), then title, then id so pages stay stable btwn requests.
// semester dates: Fall YYYY -> Aug 25 YYYY, Spring YYYY -> Jan 1 YYYY.

import { db } from '../../utils/db'
import { project } from '../../db/schema'
import { asc, desc, sql } from 'drizzle-orm'

// builds sortable number from the semester string.
// "Fall 2025" -> 20250825, "Spring 2026" -> 20260101
const semesterDate = sql`(
  CAST(substr(${project.semester}, -4) AS INTEGER) * 10000 +
  CASE WHEN ${project.semester} LIKE 'Spring%' THEN 101 ELSE 825 END
)`

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
    .orderBy(desc(semesterDate), asc(project.projectTitle), asc(project.id))
    .limit(pageSize)
    .offset(skip)
})
