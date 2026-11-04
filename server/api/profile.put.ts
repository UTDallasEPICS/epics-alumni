import { createError, defineEventHandler, isError, readBody, setHeader } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { requireUser } from '../utils/session'
import { profile, user } from '../db/schema'
import { deriveOnboarding, professionalFields, profileUpdateSchema, toProfileResponse, type ProfessionalField } from '../../shared/profile'

export default defineEventHandler(async (event) => {
  const currentUser = requireUser(event)
  const body = await readBody(event).catch(() => {
    throw createError({ statusCode: 400, statusMessage: 'Invalid profile data' })
  })
  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) throw createError({ statusCode: 400, statusMessage: 'Invalid profile data' })
  const { name, graduationYear, biography } = parsed.data
  const professional: Partial<Record<ProfessionalField, string | null>> = {}
  for (const field of professionalFields) {
    const value = parsed.data[field]
    if (value !== undefined) professional[field] = value === '' ? null : value
  }

  const result = (() => {
    try {
      // better-sqlite3 transactions must be synchronous: use .get()/.run(),
      // never an async callback, so failures roll back both tables together.
      return db.transaction((tx) => {
        const existing = tx.select({ id: user.id }).from(user).where(eq(user.id, currentUser.id)).get()
        if (!existing) return null
        const previous = tx.select({ major: profile.major, directoryPublished: profile.directoryPublished })
          .from(profile).where(eq(profile.userId, currentUser.id)).get()
        const completed = deriveOnboarding({
          name, graduationYear, major: parsed.data.major ?? previous?.major ?? '',
        }).completed
        if (parsed.data.directoryPublished === true && !completed) {
          throw createError({ statusCode: 400, statusMessage: 'Complete your name, major, and graduation year before publishing' })
        }
        // Clearing required information also withdraws consent. Completing it
        // again never silently republishes a profile. Omitted values preserve
        // consent for older clients only while the saved profile is complete.
        const directoryPublished = completed && (parsed.data.directoryPublished ?? previous?.directoryPublished ?? false)
        const now = new Date()
        const identity = tx.update(user).set({ name, updatedAt: now })
          .where(eq(user.id, currentUser.id))
          .returning({ id: user.id, name: user.name, email: user.email, image: user.image }).get()!
        const fields = { ...professional, directoryPublished, graduationYear: graduationYear === '' ? null : Number(graduationYear), bio: biography, updatedAt: now }
        const saved = tx.insert(profile).values({ userId: currentUser.id, ...fields, createdAt: now })
          .onConflictDoUpdate({ target: profile.userId, set: fields })
          .returning({
            graduationYear: profile.graduationYear, biography: profile.bio,
            major: profile.major, company: profile.company, jobTitle: profile.jobTitle,
            linkedinUrl: profile.linkedinUrl, githubUrl: profile.githubUrl, websiteUrl: profile.websiteUrl,
            directoryPublished: profile.directoryPublished,
          }).get()!
        return toProfileResponse({ ...identity, ...saved })
      }, { behavior: 'immediate' })
    } catch (error) {
      if (isError(error) && error.statusCode === 400) throw error
      throw createError({ statusCode: 500, statusMessage: 'Unable to save profile' })
    }
  })()

  if (!result) throw createError({ statusCode: 404, statusMessage: 'User not found' })
  setHeader(event, 'Cache-Control', 'private, no-store')
  return result
})
