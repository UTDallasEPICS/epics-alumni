import { z } from 'zod'

export interface ProfileResponse {
  id: string
  name: string
  email: string
  graduationYear: string
  biography: string
  imageUrl: string | null
}

export const profileUpdateSchema = z.strictObject({
  name: z.string().trim().min(1, 'Please enter your name.').max(100, 'Name must be 100 characters or fewer.'),
  graduationYear: z.string().refine(
    (year) => year === '' || (year.length === 4 && /^[0-9]{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= 2100),
    'Graduation year must be empty or a four-digit year from 1900 to 2100.',
  ),
  biography: z.string().max(2000, 'Biography must be 2000 characters or fewer.'),
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
}): ProfileResponse {
  return {
    id: values.id,
    name: values.name,
    email: values.email,
    graduationYear: values.graduationYear === null ? '' : String(values.graduationYear),
    biography: values.biography ?? '',
    imageUrl: avatarUrl(values.id, values.image),
  }
}
