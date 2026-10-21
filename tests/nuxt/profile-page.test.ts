// @vitest-environment nuxt
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ProfilePage from '../../app/pages/index.vue'
import type { ProfileResponse } from '../../shared/profile'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), toast: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: mocks.toast }))
vi.mock('#build/fetch', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ofetch')>()
  return {
    ...actual,
    $fetch: (...args: Parameters<typeof actual.$fetch>) => {
      return args[0] === '/api/profile' || args[0] === '/api/users/upload'
        ? mocks.fetch(...args)
        : actual.$fetch(...args)
    },
  }
})
vi.mock('../../app/utils/auth-client', () => ({
  authClient: {
    useSession: async () => ({ data: ref({ user: { id: 'owner' } }) }),
    signOut: vi.fn(),
  },
}))

let backend: ProfileResponse
const mounted: VueWrapper[] = []

beforeEach(() => {
  backend = { id: 'owner', name: 'Session Owner', email: 'owner@example.test', graduationYear: '2026', biography: 'Stored biography', imageUrl: null }
  mocks.toast.mockReset()
  mocks.fetch.mockReset().mockImplementation(async (url: string, options?: { method?: string; body?: unknown }) => {
    if (url === '/api/users/upload') return { message: 'Uploaded', imageUrl: '/api/users/owner/profile' }
    if (url !== '/api/profile') throw new Error(`Unexpected API: ${url}`)
    if (options?.method === 'PUT') backend = { ...backend, ...options.body as object }
    return { ...backend }
  })
})

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  vi.unstubAllGlobals()
})

async function mountPage() {
  const wrapper = await mountSuspended(ProfilePage)
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

async function click(wrapper: VueWrapper, text: string) {
  const button = wrapper.findAll('button').find((candidate) => candidate.text() === text)
  expect(button, `button ${text}`).toBeDefined()
  await button!.trigger('click')
  await flushPromises()
}

async function edit(wrapper: VueWrapper, name = 'Changed Owner') {
  await click(wrapper, 'Edit profile')
  await wrapper.get('input[placeholder="Enter your full name"]').setValue(name)
}

async function selectImage(wrapper: VueWrapper) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [new File(['fixture'], 'avatar.png', { type: 'image/png' })], configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
}

describe('profile page persistence contract', () => {
  it('loads only the current-user API and displays its supported fields', async () => {
    const wrapper = await mountPage()
    expect(mocks.fetch).toHaveBeenCalledWith('/api/profile')
    expect(mocks.fetch.mock.calls.every(([url]) => url === '/api/profile')).toBe(true)
    expect(wrapper.get('h1').text()).toBe('Session Owner')
    expect(wrapper.text()).toContain('Class of 2026')
    expect(wrapper.text()).toContain('Stored biography')
    expect(wrapper.get('a.contact-button').attributes('href')).toBe('mailto:owner@example.test')
  })

  it('shows a load error without falling back to the user directory', async () => {
    mocks.fetch.mockRejectedValue(new Error('Unable to load profile'))
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain('Unable to load profile')
    expect(wrapper.find('h1').exists()).toBe(false)
    expect(mocks.fetch.mock.calls.every(([url]) => url === '/api/profile')).toBe(true)
  })

  it('saves exactly the supported fields and updates display after success', async () => {
    const wrapper = await mountPage()
    await edit(wrapper, '  Changed Owner  ')
    await wrapper.get('input[placeholder="For example: 2026"]').setValue('2030')
    await wrapper.get('textarea[placeholder="Tell other EPICS members about yourself"]').setValue('Line one\n\n  Line two  ')
    await click(wrapper, 'Save profile')
    expect(mocks.fetch).toHaveBeenCalledWith('/api/profile', {
      method: 'PUT', body: { name: 'Changed Owner', graduationYear: '2030', biography: 'Line one\n\n  Line two  ' },
    })
    expect(wrapper.get('h1').text()).toBe('Changed Owner')
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Profile saved', color: 'success' }))
  })

  it('does not claim success or exit edit mode on failed save and allows retry', async () => {
    const wrapper = await mountPage()
    await edit(wrapper)
    mocks.fetch.mockRejectedValueOnce(new Error('Save failed'))
    await click(wrapper, 'Save profile')
    expect(wrapper.get('input[placeholder="Enter your full name"]').element).toHaveProperty('value', 'Changed Owner')
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Unable to save profile', color: 'error' }))
    expect(mocks.toast.mock.calls.some(([toast]) => toast.color === 'success')).toBe(false)
    expect(backend.name).toBe('Session Owner')
    await click(wrapper, 'Save profile')
    expect(wrapper.get('h1').text()).toBe('Changed Owner')
  })

  it('validates frontend input without sending a write', async () => {
    const wrapper = await mountPage()
    await edit(wrapper, '   ')
    await click(wrapper, 'Save profile')
    expect(mocks.fetch.mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(0)
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Check your profile', color: 'error' }))
  })

  it('makes email read-only and excludes email, roles, and projects from PUT', async () => {
    const wrapper = await mountPage()
    await edit(wrapper)
    expect(wrapper.get('input[type="email"]').attributes()).toHaveProperty('readonly')
    expect(wrapper.get('input[type="email"]').element).toHaveProperty('value', 'owner@example.test')
    const addProject = wrapper.findAll('button').find((button) => button.text() === 'Add project')!
    expect(addProject.attributes()).toHaveProperty('disabled')
    expect(wrapper.text()).toContain('Project editing is not available yet.')
    await click(wrapper, 'Save profile')
    const [, options] = mocks.fetch.mock.calls.find(([, options]) => options?.method === 'PUT')!
    expect(Object.keys(options.body).sort()).toEqual(['biography', 'graduationYear', 'name'])
    expect(wrapper.find('.role-badge').exists()).toBe(false)
  })

  it('reloads persisted backend values on a fresh mount', async () => {
    const wrapper = await mountPage()
    await edit(wrapper)
    await click(wrapper, 'Save profile')
    wrapper.unmount()
    mounted.splice(mounted.indexOf(wrapper), 1)
    const reloaded = await mountPage()
    expect(reloaded.get('h1').text()).toBe('Changed Owner')
    expect(mocks.fetch.mock.calls.filter(([, options]) => !options)).toHaveLength(2)
  })

  it('cancel discards local edits and restores stored fields on the next edit', async () => {
    const wrapper = await mountPage()
    await edit(wrapper)
    await click(wrapper, 'Cancel')
    expect(wrapper.get('h1').text()).toBe('Session Owner')
    expect(mocks.fetch.mock.calls.filter(([, options]) => options?.method)).toHaveLength(0)
    await click(wrapper, 'Edit profile')
    expect(wrapper.get('input[placeholder="Enter your full name"]').element).toHaveProperty('value', 'Session Owner')
  })

  it('uploads through the existing endpoint and uses its durable URL', async () => {
    const wrapper = await mountPage()
    await edit(wrapper)
    await selectImage(wrapper)
    await click(wrapper, 'Save profile')
    expect(mocks.fetch).toHaveBeenCalledWith('/api/users/upload', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }))
    expect(wrapper.get('.profile-avatar img').attributes('src')).toBe('/api/users/owner/profile')
  })

  it('ignores a late file preview after a successful save', async () => {
    let finishPreview: (() => void) | undefined
    vi.stubGlobal('FileReader', class {
      onload?: (event: { target: { result: string } }) => void
      readAsDataURL() {
        finishPreview = () => this.onload?.({ target: { result: 'data:image/png;base64,late' } })
      }
    })
    const wrapper = await mountPage()
    await edit(wrapper)
    await selectImage(wrapper)
    await click(wrapper, 'Save profile')
    finishPreview?.()
    await flushPromises()
    expect(wrapper.get('.profile-avatar img').attributes('src')).toBe('/api/users/owner/profile')
  })

  it('reports an avatar failure separately after text persists, retaining retry state', async () => {
    const wrapper = await mountPage()
    await edit(wrapper)
    await selectImage(wrapper)
    mocks.fetch.mockImplementationOnce(async (_url: string, options: { body: object }) => {
      backend = { ...backend, ...options.body }
      return { ...backend }
    }).mockRejectedValueOnce(new Error('Upload failed'))
    await click(wrapper, 'Save profile')
    expect(backend.name).toBe('Changed Owner')
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('avatar.png')
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Profile saved, image upload failed', color: 'error' }))
    expect(mocks.toast.mock.calls.some(([toast]) => toast.color === 'success')).toBe(false)
  })
})
