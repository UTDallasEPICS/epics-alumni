import { z } from 'zod'
import { avatarUrl, isGraduationYear, isProfessionalUrl } from './profile'

const integerParameter = z.string().regex(/^[1-9][0-9]*$/).transform(Number).refine(Number.isSafeInteger)
const filter = z.string().trim().max(120).optional()
export const alumniQuerySchema = z.strictObject({
  q: z.string().trim().max(100).default(''),
  graduationYear: z.string().refine(isGraduationYear).optional(),
  major: filter,
  company: filter,
  jobTitle: filter,
  page: integerParameter.default(1),
  limit: integerParameter.refine((value) => value <= 50).default(20),
  sort: z.enum(['name_asc', 'name_desc', 'graduation_year_asc', 'graduation_year_desc']).default('name_asc'),
}).refine((query) => Number.isSafeInteger((query.page - 1) * query.limit), 'Pagination offset is too large.')

export type AlumniQuery = z.output<typeof alumniQuerySchema>
const queryKeySchema = alumniQuerySchema.keyof()
export function validateAlumniQuery(parameters: URLSearchParams) {
  // Keep every key, including duplicates and prototype-like names, so strict
  // validation rejects them rather than silently dropping request parameters.
  const query: Record<string, string | string[]> = Object.create(null)
  for (const [key, value] of parameters) {
    const knownKey = queryKeySchema.safeParse(key)
    if (!knownKey.success) return knownKey
    const previous = query[key]
    query[key] = previous === undefined ? value : [...(Array.isArray(previous) ? previous : [previous]), value]
  }
  return alumniQuerySchema.safeParse(query)
}

export const alumniIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/)

export interface AlumniDirectoryEntry {
  id: string
  name: string
  graduationYear: number | null
  major: string | null
  company: string | null
  jobTitle: string | null
  biography: string | null
  linkedinUrl: string | null
  githubUrl: string | null
  websiteUrl: string | null
  imageUrl: string | null
}

export interface AlumniDirectoryResponse {
  data: AlumniDirectoryEntry[]
  pagination: {
    page: number; limit: number; total: number; totalPages: number
    hasNextPage: boolean; hasPreviousPage: boolean
  }
}

export function directoryPagination(page: number, limit: number, total: number): AlumniDirectoryResponse['pagination'] {
  const totalPages = Math.ceil(total / limit)
  return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && totalPages > 0 }
}

// Explicit serialization prevents extra selected/test properties from leaking.
export function toAlumniEntry(row: Omit<AlumniDirectoryEntry, 'imageUrl'> & { image: string | null }): AlumniDirectoryEntry {
  const safeLink = (field: 'linkedinUrl' | 'githubUrl' | 'websiteUrl') => {
    const value = row[field]
    return value && isProfessionalUrl(value, field) ? value : null
  }
  return {
    id: row.id, name: row.name, graduationYear: row.graduationYear,
    major: row.major, company: row.company, jobTitle: row.jobTitle, biography: row.biography,
    linkedinUrl: safeLink('linkedinUrl'), githubUrl: safeLink('githubUrl'), websiteUrl: safeLink('websiteUrl'),
    imageUrl: avatarUrl(row.id, row.image),
  }
}
