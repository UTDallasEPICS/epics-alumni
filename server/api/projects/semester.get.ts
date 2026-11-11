import { db } from '../../utils/db'
import { project } from '../../db/schema'
import { asc } from 'drizzle-orm'

// List each semester once
// Objects to strings
export default defineEventHandler(async () => {
  const options = await db
    .selectDistinct({ semester: project.semester })
    .from(project)
    .orderBy(asc(project.semester))
  return options.map((option) => option.semester)
})