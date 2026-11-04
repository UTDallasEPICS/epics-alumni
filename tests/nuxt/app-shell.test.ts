// @vitest-environment nuxt
//
// Component tests for the application shell (app/app.vue).
// The application shell now contains the shared EPICS navigation bar
// and renders the current page through <NuxtPage />.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import App from '../../app/app.vue'
import type { VueWrapper } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ navigate: vi.fn(), request: vi.fn(async () => ({ user: { id: 'owner' } })) }))
mockNuxtImport('navigateTo', () => mocks.navigate)
mockNuxtImport('useRequestFetch', () => () => mocks.request)
const mounted: VueWrapper[] = []

describe('application shell (app.vue)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mocks.navigate.mockClear()
    mocks.request.mockResolvedValue({ user: { id: 'owner' } })
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount())
    fetchSpy.mockRestore()
  })

  it('links the EPICS logo to the home route', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/',
      global: {
        stubs: {
          NuxtPage: true,
        },
      },
    })

    mounted.push(wrapper)
    const homeLink = wrapper.find('a[href="/"]')

    expect(homeLink.exists()).toBe(true)

    const logo = homeLink.find('img[alt="EPICS logo"]')

    expect(logo.exists()).toBe(true)
    expect(logo.attributes('src')).toBe('/images/epics-logo.png')

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders the shared navigation links', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/',
      global: {
        stubs: {
          NuxtPage: true,
        },
      },
    })

    mounted.push(wrapper)
    expect(wrapper.find('[aria-label="Home"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="People"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Projects"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Messages"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Notifications"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Profile"]').exists()).toBe(true)

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})


it('searches the directory from the header and marks unfinished destinations unavailable', async () => {
  const wrapper = await mountSuspended(App, { route: '/', global: { stubs: { NuxtPage: true } } })
  try {
    await wrapper.get('input[aria-label="Alumni name"]').setValue('  Ada  ')
    await wrapper.get('form[role="search"]').trigger('submit')
    expect(mocks.navigate).toHaveBeenCalledWith({ path: '/people', query: { q: 'Ada', page: '1' } })
    for (const label of ['Projects', 'Messages', 'Notifications']) {
      expect(wrapper.get(`[aria-label="${label}"]`).attributes('aria-disabled')).toBe('true')
      expect(wrapper.get(`[aria-label="${label}"]`).attributes('href')).toBeUndefined()
    }
  } finally { wrapper.unmount() }
})
