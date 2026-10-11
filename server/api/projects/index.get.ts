import { db } from '../../utils/db'
import { project } from '../../db/schema'

export default defineEventHandler(async () => {
  return await db.select().from(project)
})
