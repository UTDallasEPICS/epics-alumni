// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import DirectoryPage from '../../app/pages/people/index.vue'
import DetailPage from '../../app/pages/people/[id].vue'
import type { AlumniDirectoryEntry } from '../../shared/alumni'

const mocks = vi.hoisted(() => ({
  api: vi.fn(), navigate: vi.fn(),
  route: { query: {} as Record<string, string>, params: { id: 'owner' }, fullPath: '/people' },
}))
mockNuxtImport('useRoute', () => () => mocks.route)
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('useRequestFetch', () => () => (url: string, options?: unknown) => {
  if (url === '/api/auth/get-session') return Promise.resolve({ user: { id: 'owner' } })
  if (url === '/api/profile') return Promise.resolve({ onboarding: { completed: true } })
  return mocks.api(url, options)
})
const entry: AlumniDirectoryEntry = { id: 'owner', name: 'Ada Alumni', major: 'CS', company: 'Acme', jobTitle: 'Engineer', graduationYear: 2026, biography: 'A biography', linkedinUrl: null, githubUrl: 'https://github.com/ada', websiteUrl: null, imageUrl: null }
const page = (entries = [entry]) => ({ data: entries, pagination: { page: 1, limit: 20, total: 21, totalPages: 2, hasNextPage: true, hasPreviousPage: false } })
let wrapper: VueWrapper
beforeEach(() => {
  mocks.route = reactive({ query: {}, params: { id: 'owner' }, fullPath: '/people' })
  mocks.api.mockReset().mockResolvedValue(page())
  mocks.navigate.mockClear()
})
afterEach(() => {
  wrapper?.unmount()
  clearNuxtData()
})
async function click(label: string) {
  const button = wrapper.findAll('button').find((item) => item.text() === label)!
  expect(button).toBeDefined()
  await button.trigger('click')
  await flushPromises()
}
describe('alumni directory frontend', () => {
  it('loads the existing API, renders public cards and detail links, and honors pagination', async () => {
    wrapper = await mountSuspended(DirectoryPage, { route: '/people' })
    expect(mocks.api).toHaveBeenCalledWith('/api/alumni', { query: { q: '', page: 1, limit: 20, sort: 'name_asc' } })
    expect(wrapper.text()).toContain('Ada Alumni')
    expect(wrapper.get('a[href="/people/owner"]').text()).toBe('Ada Alumni')
    expect(wrapper.text()).toContain('Page 1 of 2')
    expect(wrapper.findAll('button').find((button) => button.text() === 'Previous')!.attributes()).toHaveProperty('disabled')
    await click('Next')
    expect(mocks.navigate).toHaveBeenCalledWith({ path: '/people', query: { page: '2' } })
  })
  it('preserves query filters on refresh and resets pagination on a new search', async () => {
    mocks.route.query = { q: 'Ada', major: 'CS', company: 'Acme', graduationYear: '2026', page: '2', sort: 'name_desc' }
    wrapper = await mountSuspended(DirectoryPage, { route: '/people' })
    expect(wrapper.get('input[name="q"]').element).toHaveProperty('value', 'Ada')
    expect(mocks.api).toHaveBeenCalledWith('/api/alumni', expect.objectContaining({ query: expect.objectContaining({ page: 2, major: 'CS', company: 'Acme', graduationYear: '2026' }) }))
    await wrapper.get('input[name="q"]').setValue('Grace')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(mocks.navigate).toHaveBeenCalledWith({ path: '/people', query: { q: 'Grace', major: 'CS', company: 'Acme', graduationYear: '2026', sort: 'name_desc', limit: '20', page: '1' } })
  })
  it('renders an empty publication-gated response without inventing profiles', async () => {
    mocks.api.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } })
    wrapper = await mountSuspended(DirectoryPage, { route: '/people' })
    expect(wrapper.text()).toContain('No published profiles')
    expect(wrapper.find('li').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Directory pages"]').exists()).toBe(false)
  })
  it('handles errors and retries', async () => {
    mocks.api.mockRejectedValueOnce(new Error('Offline'))
    wrapper = await mountSuspended(DirectoryPage, { route: '/people' })
    expect(wrapper.text()).toContain('Unable to load alumni')
    await click('Retry directory')
    expect(wrapper.text()).toContain('Ada Alumni')
  })
  it('validates filters and avoids requesting an invalid URL query', async () => {
    mocks.route.query = { page: 'NaN' }
    wrapper = await mountSuspended(DirectoryPage, { route: '/people' })
    expect(mocks.api).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('directory filters are invalid')
    await wrapper.get('input[name="graduationYear"]').setValue('1800')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('four-digit graduation year')
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
  it('shows loading and hides the old results while a route query changes', async () => {
    wrapper = await mountSuspended(DirectoryPage, { route: '/people' })
    let resolve!: (value: ReturnType<typeof page>) => void
    mocks.api.mockReturnValueOnce(new Promise((done) => { resolve = done }))
    mocks.route.query = { q: 'Grace' }
    mocks.route.fullPath = '/people?q=Grace'
    await flushPromises()
    expect(wrapper.text()).toContain('Loading alumni')
    expect(wrapper.text()).not.toContain('Ada Alumni')
    resolve(page([{ ...entry, name: 'Grace Alumni' }]))
    await flushPromises()
    expect(wrapper.text()).toContain('Grace Alumni')
  })
  it('redirects when the API reports session expiry', async () => {
    mocks.api.mockRejectedValue({ statusCode: 401 })
    wrapper = await mountSuspended(DirectoryPage, { route: '/people' })
    expect(mocks.navigate).toHaveBeenCalledWith('/auth', { replace: true })
  })
})

describe('alumni detail frontend', () => {
  it('loads only the public detail endpoint and renders safe professional links', async () => {
    mocks.api.mockResolvedValue({ ...entry, websiteUrl: 'javascript:alert(1)' })
    wrapper = await mountSuspended(DetailPage, { route: '/people/owner' })
    expect(mocks.api).toHaveBeenCalledWith('/api/alumni/owner', undefined)
    expect(wrapper.text()).toContain(entry.biography)
    expect(wrapper.get('a[href="https://github.com/ada"]').attributes()).toMatchObject({ target: '_blank', rel: 'noopener noreferrer' })
    expect(wrapper.find('a[href^="javascript:"]').exists()).toBe(false)
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false)
  })
  it('treats unpublished and missing profiles as unavailable without private API fallback', async () => {
    mocks.api.mockRejectedValue({ statusCode: 404 })
    wrapper = await mountSuspended(DetailPage, { route: '/people/owner' })
    expect(wrapper.text()).toContain('Profile unavailable')
    expect(wrapper.find('article').exists()).toBe(false)
    expect(mocks.api).toHaveBeenCalledTimes(1)
  })
  it('validates IDs before making a request', async () => {
    mocks.route.params.id = '../private'
    wrapper = await mountSuspended(DetailPage, { route: '/people/owner' })
    expect(wrapper.text()).toContain('Profile unavailable')
    expect(mocks.api).not.toHaveBeenCalled()
  })
  it('retries a transient detail error', async () => {
    mocks.api.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(entry)
    wrapper = await mountSuspended(DetailPage, { route: '/people/owner' })
    await click('Retry profile')
    expect(wrapper.text()).toContain('Ada Alumni')
  })
})
