import { blockPrivateAssets } from './server/utils/private-assets'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@nuxt/image', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  nitro: {
    // Never copy legacy private uploads to the deployable public directory.
    ignore: ['**/images/users/**'],
    devHandlers: [{ handler: blockPrivateAssets }],
  },
  // Prettier owns formatting; ESLint handles logic only (no stylistic rules).
  eslint: {
    config: {
      stylistic: false,
    },
  },
  // Surface TypeScript errors in the terminal during `nuxt dev`. Not during
  // `nuxt build`: the in-build vue-tsc runs in a clean environment where it
  // can't resolve auto-imports/module types and fails the Docker deploy. CI
  // runs `pnpm typecheck` (nuxi typecheck) as the real gate.
  typescript: {
    typeCheck: process.env.NODE_ENV !== 'production',
  },
  vite: {
    server: {
      fs: {
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.data/**', '**/users/*/images/**', '**/*.{db,sqlite}', '**/*.{db,sqlite}-*'],
      },
    },
    optimizeDeps: {
      include: ['better-auth/client/plugins', 'better-auth/vue', 'zod'],
    },
  },
})
