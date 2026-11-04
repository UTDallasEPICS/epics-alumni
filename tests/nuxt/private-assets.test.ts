// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineEventHandler, toWebHandler } from 'h3'
import path from 'node:path'
import { blockPrivateAssets } from '../../server/utils/private-assets'
import { avatarReadRoots, avatarStorageRoot } from '../../server/utils/avatar-storage'
const app = createApp({ onError: () => {} })
app.use(blockPrivateAssets)
app.use(defineEventHandler(() => 'public asset'))
const request = toWebHandler(app)
afterEach(() => vi.unstubAllEnvs())

describe('static and optimized avatar privacy', () => {
  it.each([
    '/images/users/owner/images/file', '/images/users', '/images//users/owner/images/file',
    '//images/users/owner/images/file', '/images%2fusers%2fowner/images/file',
    '/images/%75sers/owner/images/file', '/images/other/../users/owner/images/file',
    '/_ipx/w_100/images/users/owner/images/file', '/_ipx/w_100/images%2Fusers%2Fowner/images/file',
  ])('blocks the private asset path %s before static handlers', async (url) => {
    const response = await request(new Request('http://localhost' + url))
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it('leaves ordinary EPICS assets accessible', async () => {
    expect((await request(new Request('http://localhost/images/epics-logo.png'))).status).toBe(200)
  })
  it('uses private storage by default while retaining guarded reads of legacy uploads', () => {
    vi.stubEnv('UPLOAD_STORAGE_PATH', '')
    expect(avatarStorageRoot()).toBe(path.resolve('.data/uploads'))
    expect(avatarReadRoots()).toEqual([path.resolve('.data/uploads'), path.resolve('public/images')])
  })
  it('rejects custom public locations without a denial rule', () => {
    vi.stubEnv('UPLOAD_STORAGE_PATH', 'public/unsafe')
    expect(() => avatarStorageRoot()).toThrow('outside public')
  })
})
