// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RouteLocationNormalized } from 'vue-router'
import middleware from '../../app/middleware/auth.global'

const { request, navigate } = vi.hoisted(() => ({ request: vi.fn(), navigate: vi.fn((path: string) => path) }))
mockNuxtImport('useRequestFetch', () => () => request)
mockNuxtImport('navigateTo', () => navigate)
beforeEach(() => {
  request.mockReset().mockImplementation(async (url: string) => url === '/api/auth/get-session' ? { user: { id: 'owner' } } : { onboarding: { completed: true } })
  navigate.mockClear()
})
const visit = (path: string) => middleware({ path } as RouteLocationNormalized, {} as RouteLocationNormalized)

describe('session and persisted onboarding routing', () => {
  it.each(['/people', '/people/owner', '/', '/profile'])('redirects signed-out access to %s', async (path) => {
    request.mockResolvedValue(null)
    await visit(path)
    expect(navigate).toHaveBeenCalledWith('/auth', { replace: true })
  })
  it('allows the login page without a session and normalizes trailing slashes', async () => {
    request.mockResolvedValue(null)
    await visit('/auth/')
    expect(navigate).not.toHaveBeenCalled()
  })
  it('takes signed-in visitors away from the login page', async () => {
    await visit('/auth')
    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
  })
  it.each(['/', '/profile/'])('allows the setup/retry page without an extra profile request: %s', async (path) => {
    await visit(path)
    expect(request).toHaveBeenCalledTimes(1)
    expect(navigate).not.toHaveBeenCalled()
  })
  it('directs incomplete profiles to setup, then allows navigation after persisted completion', async () => {
    request.mockResolvedValueOnce({ user: { id: 'owner' } }).mockResolvedValueOnce({ onboarding: { completed: false } })
    await visit('/people')
    expect(navigate).toHaveBeenCalledWith('/?setup=1', { replace: true })
    navigate.mockClear()
    await visit('/people')
    expect(navigate).not.toHaveBeenCalled()
  })
  it('rechecks persisted state on subsequent visits rather than trusting an old completion flag', async () => {
    await visit('/people')
    request.mockResolvedValueOnce({ user: { id: 'owner' } }).mockResolvedValueOnce({ onboarding: { completed: false } })
    await visit('/people/other')
    expect(navigate).toHaveBeenCalledWith('/?setup=1', { replace: true })
  })
  it('handles an expired session during profile lookup', async () => {
    request.mockResolvedValueOnce({ user: { id: 'owner' } }).mockRejectedValueOnce({ statusCode: 401 })
    await visit('/people')
    expect(navigate).toHaveBeenCalledWith('/auth', { replace: true })
  })
  it('routes profile failures to the profile retry screen without claiming completion', async () => {
    request.mockResolvedValueOnce({ user: { id: 'owner' } }).mockRejectedValueOnce({ statusCode: 500 })
    await visit('/people')
    expect(navigate).toHaveBeenCalledWith('/?setup=1', { replace: true })
  })
  it('reports session-service outages instead of treating them as a logged-out state', async () => {
    request.mockRejectedValue(new Error('Offline'))
    await expect(visit('/people')).rejects.toMatchObject({ statusCode: 503 })
    expect(navigate).not.toHaveBeenCalled()
  })
})
