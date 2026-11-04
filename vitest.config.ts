import { defineVitestConfig } from '@nuxt/test-utils/config'

// Components run in Nuxt; server suites select Node and use isolated SQLite.
// The HTTP integration suite binds a loopback port and mocks outbound mail.
export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: { nuxt: { overrides: { ui: { fonts: false } } } },
    include: ['tests/nuxt/**/*.test.ts'],
    // Fail the run if no tests are found, so an empty/broken suite can never
    // pass silently in a merge request.
    passWithNoTests: false,
  },
})
