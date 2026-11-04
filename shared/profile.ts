import { z } from 'zod'

export const professionalFields = ['major', 'company', 'jobTitle', 'linkedinUrl', 'githubUrl', 'websiteUrl'] as const
export type ProfessionalField = typeof professionalFields[number]
export type ProfessionalFields = Record<ProfessionalField, string>
export type OnboardingField = 'name' | 'major' | 'graduationYear'

export interface ProfileResponse extends ProfessionalFields {
  id: string
  name: string
  email: string
  graduationYear: string
  biography: string
  imageUrl: string | null
  directoryPublished: boolean
  onboarding: { completed: boolean; missingFields: OnboardingField[] }
}

export function isGraduationYear(year: string): boolean {
  return year.length === 4 && /^[0-9]{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 2100
}

export function deriveOnboarding(values: { name: string; major: string; graduationYear: string }): ProfileResponse['onboarding'] {
  const missingFields: OnboardingField[] = []
  if (!values.name.trim()) missingFields.push('name')
  if (!values.major.trim()) missingFields.push('major')
  if (!isGraduationYear(values.graduationYear)) missingFields.push('graduationYear')
  return { completed: missingFields.length === 0, missingFields }
}

function isPublicIPv4(host: string): boolean {
  const [a = 0, b = 0] = host.split('.').map(Number)
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168))
}

function isPublicHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  if (host.startsWith('[')) {
    // URL already validates and canonicalizes IPv6 literals. Expand compressed
    // groups so mapped IPv4 addresses cannot disguise a private destination.
    const halves = host.slice(1, -1).split('::')
    const left = halves[0] ? halves[0].split(':') : []
    const right = halves[1] ? halves[1].split(':') : []
    const groups = (halves.length === 2 ? [...left, ...Array<string>(8 - left.length - right.length).fill('0'), ...right] : left).map((part) => parseInt(part, 16))
    const first = groups[0]!
    if (groups.slice(0, 5).every((part) => part === 0) && groups[5] === 0xffff) {
      return isPublicIPv4(`${groups[6]! >> 8}.${groups[6]! & 255}.${groups[7]! >> 8}.${groups[7]! & 255}`)
    }
    return first !== 0 && (first & 0xfe00) !== 0xfc00 && (first & 0xffc0) !== 0xfe80 &&
      (first & 0xffc0) !== 0xfec0 && (first & 0xff00) !== 0xff00
  }
  if (/^[0-9.]+$/.test(host)) return isPublicIPv4(host)
  if (host === 'localhost' || host.endsWith('.localhost')) return false
  return host.length <= 253 && host.includes('.') && host.split('.').every((label) =>
    label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
}

export function isProfessionalUrl(value: string, field: 'linkedinUrl' | 'githubUrl' | 'websiteUrl'): boolean {
  if (!value || value.length > 2048 || !/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return false
  const authority = value.slice('https://'.length).split(/[/?#]/)[0]
  if (!authority || authority.includes('@')) return false
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return false
    if (field === 'linkedinUrl') return ['linkedin.com', 'www.linkedin.com'].includes(url.hostname)
    if (field === 'githubUrl') return ['github.com', 'www.github.com'].includes(url.hostname)
    return isPublicHostname(url.hostname)
  } catch { return false }
}

const professionalUrl = (field: 'linkedinUrl' | 'githubUrl' | 'websiteUrl') => z.string().trim().max(2048)
  .refine((value) => value === '' || isProfessionalUrl(value, field), 'Enter a valid public HTTPS URL for this service.').optional()

export const profileUpdateSchema = z.strictObject({
  name: z.string().trim().min(1, 'Please enter your name.').max(100, 'Name must be 100 characters or fewer.'),
  graduationYear: z.string().refine(
    (year) => year === '' || isGraduationYear(year),
    'Graduation year must be empty or a four-digit year from 1900 to 2100.',
  ),
  biography: z.string().max(2000, 'Biography must be 2000 characters or fewer.'),
  major: z.string().trim().max(120).optional(),
  company: z.string().trim().max(160).optional(),
  jobTitle: z.string().trim().max(160).optional(),
  linkedinUrl: professionalUrl('linkedinUrl'),
  githubUrl: professionalUrl('githubUrl'),
  websiteUrl: professionalUrl('websiteUrl'),
  directoryPublished: z.boolean().optional(),
})

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

// Existing uploads use a Better Auth ID and a crypto.randomUUID() filename.
// Keep this check shared by JSON responses, uploads, and file retrieval.
export function isAvatarStorageKey(value: unknown, userId: string): value is string {
  if (typeof value !== 'string' || !userId || /[^A-Za-z0-9_-]/.test(userId)) return false
  const parts = value.split('/')
  return parts.length === 4 && parts[0] === 'users' && parts[1] === userId &&
    parts[2] === 'images' && parts[3]?.length === 36 && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parts[3])
}

export function avatarUrl(userId: string, image: unknown): string | null {
  return isAvatarStorageKey(image, userId) ? `/api/users/${encodeURIComponent(userId)}/profile` : null
}

export function toProfileResponse(values: {
  id: string
  name: string
  email: string
  graduationYear: number | null
  biography: string | null
  image: string | null
  directoryPublished?: boolean | null
} & Record<ProfessionalField, string | null>): ProfileResponse {
  const professional = {
    major: values.major ?? '', company: values.company ?? '', jobTitle: values.jobTitle ?? '',
    linkedinUrl: values.linkedinUrl ?? '', githubUrl: values.githubUrl ?? '', websiteUrl: values.websiteUrl ?? '',
  }
  const graduationYear = values.graduationYear === null ? '' : String(values.graduationYear)
  const onboarding = deriveOnboarding({ name: values.name, major: professional.major, graduationYear })
  return {
    id: values.id,
    name: values.name,
    email: values.email,
    graduationYear,
    biography: values.biography ?? '',
    imageUrl: avatarUrl(values.id, values.image),
    ...professional,
    onboarding,
    directoryPublished: values.directoryPublished === true && onboarding.completed,
  }
}
