import { db } from '../../utils/db'
import { project } from '../../db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {skip: number}
  const skip = query.skip
  const pageSize = 15 
  return await db
    .select()
    .from(project)
    .orderBy(asc(project.semester),asc(project.projectTitle),asc(project.id))
    .limit(pageSize)
    .offset(skip)
})
