import type { ProfileResponse } from '#shared/profile'

export default defineNuxtRouteMiddleware(async (to) => {
  // Forward this request's cookies during SSR; on the client the browser sends
  // its session cookie. Never cache completion globally or in browser storage.
  const request = useRequestFetch()
  const path = to.path.replace(/\/$/, '') || '/'
  let session: { user: { id: string } } | null
  try {
    session = await request<{ user: { id: string } } | null>('/api/auth/get-session')
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 401) session = null
    else throw createError({ statusCode: 503, statusMessage: 'Unable to verify your session. Please try again.' })
  }

  if (!session?.user) {
    if (path !== '/auth') return navigateTo('/auth', { replace: true })
    return
  }
  if (path === '/auth') return navigateTo('/', { replace: true })
  // Always allow the profile editor, including when its API needs a retry.
  if (path === '/' || path === '/profile') return

  try {
    const profile = await request<ProfileResponse>('/api/profile')
    if (!profile.onboarding.completed) return navigateTo('/?setup=1', { replace: true })
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 401) return navigateTo('/auth', { replace: true })
    // The profile page has retry/logout controls; don't redirect in a loop or
    // assume completion when the profile service is unavailable.
    return navigateTo('/?setup=1', { replace: true })
  }
})
