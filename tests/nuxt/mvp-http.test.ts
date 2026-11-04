// @vitest-environment node
// Real loopback HTTP, Better Auth OTP/session cookies, application handlers,
// SQLite migrations and filesystem. Only the outbound mail transport is fake.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import { createApp, createError, defineEventHandler, toNodeListener } from 'h3'
import * as schema from '../../server/db/schema'

const isolated = vi.hoisted(() => ({
  db: undefined as unknown as BetterSQLite3Database<typeof schema>,
  mail: vi.fn(),
}))
vi.mock('../../server/utils/db', () => ({ get db() { return isolated.db } }))
vi.mock('../../server/utils/env', () => ({ env: {
  EMAIL_HOST: 'smtp.example.invalid', EMAIL_USER: 'test', EMAIL_PASS: 'test', EMAIL_FROM: 'epics@example.invalid',
} }))
vi.mock('nodemailer', () => ({ default: { createTransport: () => ({ sendMail: isolated.mail }) } }))

let sqlite: InstanceType<typeof Database>
let server: Server
let origin: string
let temporary: string
const codes = new Map<string, string>()
const complete = { name: 'Ada Example', major: 'Computer Science', graduationYear: '2026', company: 'Demo Labs', jobTitle: 'Engineer', biography: 'A real HTTP test profile.' }

beforeAll(async () => {
  temporary = await mkdtemp(path.join(tmpdir(), 'epics-http-'))
  sqlite = new Database(path.join(temporary, 'test.sqlite'))
  isolated.db = drizzle(sqlite, { schema })
  migrate(isolated.db, { migrationsFolder: 'drizzle' })
  const app = createApp({ onError: () => {} })
  server = createServer(toNodeListener(app))
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing HTTP test address')
  origin = `http://127.0.0.1:${address.port}`
  vi.stubEnv('BETTER_AUTH_URL', origin)
  vi.stubEnv('BETTER_AUTH_SECRET', 'isolated-http-test-secret-at-least-32-characters')
  vi.stubEnv('UPLOAD_STORAGE_PATH', path.join(temporary, 'uploads'))
  const [gateway, auth, getProfile, putProfile, list, detail, users, upload, avatar, privateAssets] = await Promise.all([
    import('../../server/middleware/auth'), import('../../server/api/auth/[...all]'),
    import('../../server/api/profile.get'), import('../../server/api/profile.put'),
    import('../../server/api/alumni/index.get'), import('../../server/api/alumni/[id].get'),
    import('../../server/api/users/index.get'), import('../../server/api/users/upload.post'),
    import('../../server/api/users/[id]/profile.get'), import('../../server/middleware/private-assets'),
  ])
  app.use(defineEventHandler(async (event) => {
    const blocked = await privateAssets.default(event)
    if (blocked) return blocked
    await gateway.default(event)
    const pathname = event.path.split('?')[0]!
    if (pathname.startsWith('/api/auth/')) return auth.default(event)
    if (pathname === '/api/profile') return event.method === 'PUT' ? putProfile.default(event) : getProfile.default(event)
    if (pathname === '/api/alumni') return list.default(event)
    if (pathname === '/api/users') return users.default(event)
    if (pathname === '/api/users/upload') return upload.default(event)
    const detailId = /^\/api\/alumni\/([^/]+)$/.exec(pathname)?.[1]
    const avatarId = /^\/api\/users\/([^/]+)\/profile$/.exec(pathname)?.[1]
    if (detailId || avatarId) {
      event.context.params = { id: detailId ?? avatarId! }
      return detailId ? detail.default(event) : avatar.default(event)
    }
    throw createError({ statusCode: 404 })
  }))
}, 15000)

beforeEach(() => {
  sqlite.exec('DELETE FROM session; DELETE FROM verification; DELETE FROM account; DELETE FROM profile; DELETE FROM user;')
  codes.clear()
  isolated.mail.mockReset().mockImplementation(async ({ to, html }: { to: string; html: string }) => {
    const code = html.match(/\b[0-9]{6}\b/)?.[0]
    if (!code) throw new Error('OTP missing from test email')
    codes.set(to, code)
    return { accepted: [to] }
  })
})

afterAll(async () => {
  if (server) {
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  sqlite?.close()
  if (temporary) await rm(temporary, { recursive: true, force: true })
  vi.unstubAllEnvs()
})

function client(initialCookie = '') {
  const jar = new Map(initialCookie.split('; ').filter(Boolean).map((part) => [part.split('=')[0]!, part.slice(part.indexOf('=') + 1)]))
  return {
    cookie: () => [...jar].map(([key, value]) => `${key}=${value}`).join('; '),
    async request(url: string, method = 'GET', body?: unknown) {
      const response = await fetch(origin + url, {
        method,
        headers: { origin, cookie: this.cookie(), ...(body !== undefined && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}) },
        body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
      })
      for (const cookie of response.headers.getSetCookie()) {
        const pair = cookie.split(';')[0]!
        const separator = pair.indexOf('=')
        jar.set(pair.slice(0, separator), pair.slice(separator + 1))
      }
      return response
    },
  }
}
async function requestCode(browser: ReturnType<typeof client>, email: string) {
  const sent = await browser.request('/api/auth/email-otp/send-verification-otp', 'POST', { email, type: 'sign-in' })
  expect(sent.status, await sent.text()).toBe(200)
  return codes.get(email)!
}
async function login(email: string) {
  const browser = client()
  const otp = await requestCode(browser, email)
  const result = await browser.request('/api/auth/sign-in/email-otp', 'POST', { email, otp })
  expect(result.status, await result.text()).toBe(200)
  expect(browser.cookie()).toContain('session_token=')
  return browser
}

describe('MVP through real HTTP and real Better Auth', () => {
  it('creates a new account via OTP, saves onboarding, survives reload and returning login, and revokes logout cookies', async () => {
    const browser = await login('new@example.test')
    const initial = await (await browser.request('/api/profile')).json()
    expect(initial).toMatchObject({ directoryPublished: false, onboarding: { completed: false } })
    expect((await browser.request('/api/profile', 'PUT', complete)).status).toBe(200)
    const saved = await (await browser.request('/api/profile')).json()
    expect(saved).toMatchObject({ ...complete, directoryPublished: false, onboarding: { completed: true } })
    const refreshed = client(browser.cookie())
    expect(await (await refreshed.request('/api/profile')).json()).toEqual(saved)
    const oldCookie = browser.cookie()
    expect((await browser.request('/api/auth/sign-out', 'POST', {})).status).toBe(200)
    expect((await client(oldCookie).request('/api/profile')).status).toBe(401)
    const returning = await login('new@example.test')
    expect(await (await returning.request('/api/profile')).json()).toEqual(saved)
    expect(isolated.db.select().from(schema.user).all()).toHaveLength(1)
  })

  it('enforces consent across directory search, detail and avatar requests from another authenticated member', async () => {
    const owner = await login('owner@example.test')
    const viewer = await login('viewer@example.test')
    const ownerProfile = await (await owner.request('/api/profile', 'PUT', complete)).json()
    const viewerProfile = await (await viewer.request('/api/profile', 'PUT', { ...complete, name: 'Private Viewer' })).json()
    const id = ownerProfile.id as string
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII=', 'base64')
    const form = new FormData()
    form.append('file', new Blob([png], { type: 'image/png' }), 'avatar.png')
    expect((await owner.request('/api/users/upload', 'POST', form)).status).toBe(201)
    expect((await viewer.request(`/api/alumni/${id}`)).status).toBe(404)
    expect((await viewer.request(`/api/users/${id}/profile`)).status).toBe(404)
    expect((await owner.request('/api/profile', 'PUT', { ...complete, directoryPublished: true })).status).toBe(200)
    const directory = await (await viewer.request('/api/alumni?q=ada&major=computer&company=labs&graduationYear=2026&limit=1')).json()
    expect(directory.pagination.total).toBe(1)
    expect(directory.data[0].id).toBe(id)
    expect(await (await viewer.request(`/api/alumni/${id}`)).json()).toEqual(directory.data[0])
    expect(JSON.stringify(directory)).not.toContain('owner@example.test')
    const avatar = await viewer.request(`/api/users/${id}/profile`)
    expect(avatar.status).toBe(200)
    expect(Buffer.from(await avatar.arrayBuffer())).toEqual(png)
    const legacy = await (await viewer.request('/api/users')).json()
    expect(legacy).toHaveLength(1)
    expect(legacy[0].id).toBe(viewerProfile.id)
    expect(JSON.stringify(legacy)).not.toContain('owner@example.test')
    expect((await viewer.request('/api/profile', 'PUT', { ...complete, userId: id, directoryPublished: false })).status).toBe(400)
    expect((await owner.request('/api/profile', 'PUT', { ...complete, directoryPublished: false })).status).toBe(200)
    expect((await viewer.request(`/api/alumni/${id}`)).status).toBe(404)
    expect((await viewer.request(`/api/users/${id}/profile`)).status).toBe(404)
    expect((await (await viewer.request('/api/alumni')).json()).pagination.total).toBe(0)
    const image = isolated.db.select().from(schema.user).where(eq(schema.user.id, id)).get()!.image
    expect((await client().request(`/images/${image}`)).status).toBe(404)
  })

  it('rejects invalid, expired and replayed OTPs without issuing sessions', async () => {
    const browser = client()
    const email = 'codes@example.test'
    const otp = await requestCode(browser, email)
    const invalid = otp === '000000' ? '111111' : '000000'
    expect((await browser.request('/api/auth/sign-in/email-otp', 'POST', { email, otp: invalid })).status).toBe(400)
    expect((await browser.request('/api/profile')).status).toBe(401)
    isolated.db.update(schema.verification).set({ expiresAt: new Date(0) }).run()
    expect((await browser.request('/api/auth/sign-in/email-otp', 'POST', { email, otp })).status).toBe(400)
    const fresh = await requestCode(browser, email)
    expect((await browser.request('/api/auth/sign-in/email-otp', 'POST', { email, otp: fresh })).status).toBe(200)
    expect((await client().request('/api/auth/sign-in/email-otp', 'POST', { email, otp: fresh })).status).toBe(400)
  })

  it('enforces missing and expired sessions at the API gateway', async () => {
    for (const endpoint of ['/api/profile', '/api/alumni', '/api/alumni/private', '/api/users', '/api/users/private/profile']) {
      expect((await client().request(endpoint)).status).toBe(401)
    }
    expect((await client().request('/api/profile', 'PUT', complete)).status).toBe(401)
    const browser = await login('expires@example.test')
    isolated.db.update(schema.session).set({ expiresAt: new Date(0) }).run()
    expect((await browser.request('/api/profile')).status).toBe(401)
    expect(await (await browser.request('/api/auth/get-session')).json()).toBeNull()
  })

  it('surfaces a mail transport failure and permits a subsequent retry', async () => {
    isolated.mail.mockRejectedValueOnce(new Error('Test transport unavailable'))
    const browser = client()
    const failed = await browser.request('/api/auth/email-otp/send-verification-otp', 'POST', { email: 'retry@example.test', type: 'sign-in' })
    expect(failed.status).toBeGreaterThanOrEqual(400)
    expect(failed.status).toBe(503)
    expect(await failed.json()).toEqual({ code: 'OTP_DELIVERY_UNAVAILABLE', message: 'Unable to send sign-in email. Please try again.' })
    expect(isolated.db.select().from(schema.verification).all()).toHaveLength(0)
    expect((await browser.request('/api/profile')).status).toBe(401)
    const otp = await requestCode(browser, 'retry@example.test')
    expect((await browser.request('/api/auth/sign-in/email-otp', 'POST', { email: 'retry@example.test', otp })).status).toBe(200)
  })
})


describe('request-scoped mail failure handling', () => {
  it.each([false, true])('returns the same safe error regardless of account existence: %s', async (existing) => {
    const email = 'delivery@example.test'
    if (existing) await login(email)
    isolated.mail.mockRejectedValueOnce(new Error('SMTP password and internal host must stay private'))
    const response = await client().request('/api/auth/email-otp/send-verification-otp', 'POST', { email, type: 'sign-in' })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ code: 'OTP_DELIVERY_UNAVAILABLE', message: 'Unable to send sign-in email. Please try again.' })
    expect(isolated.db.select().from(schema.verification).all()).toHaveLength(0)
  })

  it('handles SMTP recipient rejection without treating it as delivery', async () => {
    isolated.mail.mockResolvedValueOnce({ accepted: [], rejected: ['rejected@example.test'] })
    const response = await client().request('/api/auth/email-otp/send-verification-otp', 'POST', { email: 'rejected@example.test', type: 'sign-in' })
    expect(response.status).toBe(503)
    expect(isolated.db.select().from(schema.verification).all()).toHaveLength(0)
  })

  it.each([false, true])('isolates simultaneous failures and preserves the successful code (same email: %s)', async (sameEmail) => {
    let signalStarted!: () => void
    let failDelivery!: (error: Error) => void
    const started = new Promise<void>((resolve) => { signalStarted = resolve })
    isolated.mail.mockImplementationOnce(() => {
      signalStarted()
      return new Promise((_resolve, reject) => { failDelivery = reject })
    })
    const email = 'parallel@example.test'
    const failing = client().request('/api/auth/email-otp/send-verification-otp', 'POST', { email, type: 'sign-in' })
    await started
    const successful = client()
    const successEmail = sameEmail ? email : 'separate@example.test'
    const otp = await requestCode(successful, successEmail)
    failDelivery(new Error('A delayed SMTP failure'))
    expect((await failing).status).toBe(503)
    expect(isolated.db.select().from(schema.verification).all()).toHaveLength(1)
    const signedIn = await successful.request('/api/auth/sign-in/email-otp', 'POST', { email: successEmail, otp })
    expect(signedIn.status, await signedIn.text()).toBe(200)
    expect((await client().request('/api/auth/sign-in/email-otp', 'POST', { email: successEmail, otp })).status).toBe(400)
  })

  it('propagates the same retryable failure through the supported server-side auth API', async () => {
    const { auth } = await import('../../server/utils/auth')
    isolated.mail.mockRejectedValueOnce(new Error('Server-side transport failure'))
    await expect(auth.api.sendVerificationOTP({ body: { email: 'server@example.test', type: 'sign-in' } })).rejects.toMatchObject({ status: 'SERVICE_UNAVAILABLE' })
    expect(isolated.db.select().from(schema.verification).all()).toHaveLength(0)
  })
})

it('keeps the latest requested OTP usable when a user immediately requests another code', async () => {
  const browser = client()
  const email = 'resend@example.test'
  const oldCode = await requestCode(browser, email)
  const currentCode = await requestCode(browser, email)
  expect(isolated.db.select().from(schema.verification).all()).toHaveLength(1)
  if (oldCode !== currentCode) {
    expect((await browser.request('/api/auth/sign-in/email-otp', 'POST', { email, otp: oldCode })).status).toBe(400)
  }
  const response = await browser.request('/api/auth/sign-in/email-otp', 'POST', { email, otp: currentCode })
  expect(response.status, await response.text()).toBe(200)
})

it('keeps the newer code when an older concurrent delivery finishes last', async () => {
  let signalStarted!: () => void
  let finishDelivery!: (value: { accepted: string[] }) => void
  const started = new Promise<void>((resolve) => { signalStarted = resolve })
  isolated.mail.mockImplementationOnce(() => {
    signalStarted()
    return new Promise((resolve) => { finishDelivery = resolve })
  })
  const email = 'out-of-order@example.test'
  const older = client().request('/api/auth/email-otp/send-verification-otp', 'POST', { email, type: 'sign-in' })
  await started
  const browser = client()
  const newerCode = await requestCode(browser, email)
  finishDelivery({ accepted: [email] })
  expect((await older).status).toBe(200)
  expect(isolated.db.select().from(schema.verification).all()).toHaveLength(1)
  expect((await browser.request('/api/auth/sign-in/email-otp', 'POST', { email, otp: newerCode })).status).toBe(200)
})

it('keeps a previously delivered code usable when a subsequent resend fails', async () => {
  const browser = client()
  const email = 'failed-resend@example.test'
  const otp = await requestCode(browser, email)
  isolated.mail.mockRejectedValueOnce(new Error('Temporary delivery failure'))
  expect((await browser.request('/api/auth/email-otp/send-verification-otp', 'POST', { email, type: 'sign-in' })).status).toBe(503)
  expect(isolated.db.select().from(schema.verification).all()).toHaveLength(1)
  expect((await browser.request('/api/auth/sign-in/email-otp', 'POST', { email, otp })).status).toBe(200)
})
