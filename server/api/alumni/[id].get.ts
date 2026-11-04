import { createError, defineEventHandler, getRouterParam, setHeader } from 'h3'
import { db } from '../../utils/db'
import { requireUser } from '../../utils/session'
import { alumniIdSchema } from '../../../shared/alumni'
import { publicationEligibility, queryAlumnus } from './index.get'

export default defineEventHandler((event) => {
  requireUser(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const parsed = alumniIdSchema.safeParse(getRouterParam(event, 'id'))
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid alumni ID' })
  const entry = (() => {
    try {
      return queryAlumnus(db, parsed.data, publicationEligibility)
    } catch {
      throw createError({ statusCode: 500, statusMessage: 'Unable to load alumni profile' })
    }
  })()
  if (!entry) throw createError({ statusCode: 404, statusMessage: 'Alumni profile not found' })
  return entry
})
