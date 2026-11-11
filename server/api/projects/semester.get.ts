// returns every distinct semester, sorted newest first.
// used by the semester dropdown so it lists all semesters,
// not just the ones from pages already loaded by infinite scroll.
// semester dates: Fall YYYY -> Aug 25 YYYY, Spring YYYY -> Jan 1 YYYY.

import { db } from '../../utils/db'
import { project } from '../../db/schema'

// "Fall 2025" -> 20250825, "Spring 2026" -> 20260101
function semesterDate(semester: string): number {
  const [term, year] = semester.split(' ')
  return Number(year) * 10000 + (term === 'Spring' ? 101 : 825)
}

export default defineEventHandler(async () => {
  const rows = await db.selectDistinct({ semester: project.semester }).from(project)

  return rows.map((row) => row.semester).sort((a, b) => semesterDate(b) - semesterDate(a))
})
