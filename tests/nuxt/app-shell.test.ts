// @vitest-environment nuxt
//
// Component tests for the application shell (app/app.vue).
// The application shell now contains the shared EPICS navigation bar
// and renders the current page through <NuxtPage />.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import App from '../../app/app.vue'

describe('application shell (app.vue)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('links the EPICS logo to the home route', async () => {
    const wrapper = await mountSuspended(App, {
      global: {
        stubs: {
          NuxtPage: true,
        },
      },
    })

    const homeLink = wrapper.find('a[href="/"]')

    expect(homeLink.exists()).toBe(true)

    const logo = homeLink.find('img[alt="EPICS logo"]')

    expect(logo.exists()).toBe(true)
    expect(logo.attributes('src')).toBe('/images/epics-logo.png')

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renders the shared navigation links', async () => {
    const wrapper = await mountSuspended(App, {
      global: {
        stubs: {
          NuxtPage: true,
        },
      },
    })

    expect(wrapper.find('[aria-label="Home"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="People"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Projects"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Messages"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Notifications"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="Profile"]').exists()).toBe(true)

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
