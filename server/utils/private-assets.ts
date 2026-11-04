import type { H3Event } from 'h3'

// Also loaded by nuxt.config before module aliases exist. Keep runtime imports
// out of this callback so a clean Node/pnpm development startup can load it.
// Legacy avatars must be blocked before Nitro's development static server.
export function blockPrivateAssets(event: H3Event) {
  let pathname = event.path.split('?')[0] ?? '/'
  try { pathname = decodeURIComponent(pathname) } catch {
    event.node.res.statusCode = 400
    return { statusCode: 400, statusMessage: 'Invalid asset path' }
  }
  const normalized = new URL(pathname.replaceAll('\\', '/').replace(/\/+/g, '/'), 'http://localhost').pathname
  // Includes optimizer URLs so IPX cannot read legacy uploads directly.
  if (/\/images\/users(?:\/|$)/i.test(normalized)) {
    event.node.res.setHeader('Cache-Control', 'private, no-store')
    // Return directly: Nuxt's HTML error renderer overrides cache headers.
    event.node.res.statusCode = 404
    return { statusCode: 404, statusMessage: 'Not found' }
  }
}
