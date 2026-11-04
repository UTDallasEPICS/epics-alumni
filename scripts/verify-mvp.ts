// Run after pnpm build: pnpm exec tsx scripts/verify-mvp.ts
// Starts the actual production bundle on loopback with a disposable migrated DB.
// Login uses known OTP records in that DB; this does NOT verify email delivery.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises'
import { once } from 'node:events'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from '../server/db/schema'

await stat('.output/server/index.mjs').catch(() => { throw new Error('Run pnpm build first.') })
assert.equal(await stat('.output/public/images/users').then(() => true, () => false), false, 'Private legacy uploads must not be copied to build output')
const development = process.argv.includes('--dev')
const temporary = await mkdtemp(path.join(tmpdir(), 'epics-runtime-'))
const sqlite = new Database(path.join(temporary, 'runtime.sqlite'))
const db = drizzle(sqlite, { schema })
migrate(db, { migrationsFolder: 'drizzle' })
const portProbe = createServer()
portProbe.listen(0, '127.0.0.1')
await once(portProbe, 'listening')
const address = portProbe.address()
assert(address && typeof address !== 'string')
const port = address.port
await new Promise<void>((resolve) => portProbe.close(() => resolve()))
const origin = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, development
  ? ['node_modules/nuxt/bin/nuxt.mjs', 'dev', '--host', '127.0.0.1', '--port', String(port), '--no-fork']
  : ['.output/server/index.mjs'], {
  env: {
    PATH: process.env.PATH, NODE_ENV: development ? 'development' : 'production', HOST: '127.0.0.1', PORT: String(port),
    DATABASE_URL: `file:${path.join(temporary, 'runtime.sqlite')}`,
    BETTER_AUTH_URL: origin, BETTER_AUTH_SECRET: 'isolated-runtime-verification-secret-32-characters',
    EMAIL_HOST: 'smtp.example.invalid', EMAIL_USER: 'fixture', EMAIL_PASS: 'fixture', EMAIL_FROM: 'epics@example.invalid',
    UPLOAD_STORAGE_PATH: path.join(temporary, 'uploads'), DOTENV_CONFIG_PATH: '/dev/null',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let legacyFixture: string | undefined
let serverLog = ''
child.stdout.on('data', (data) => { serverLog += data.toString() })
child.stderr.on('data', (data) => { serverLog += data.toString() })
async function request(url: string, cookie = '', method = 'GET', body?: unknown) {
  return fetch(origin + url, {
    method, redirect: 'manual',
    headers: { cookie, origin, ...(body !== undefined && !(body instanceof FormData) ? { 'content-type': 'application/json' } : {}) },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  })
}
async function login(email: string) {
  // Test fixture only: production has no fixed code, bypass, or test route.
  db.insert(schema.verification).values({ identifier: `sign-in-otp-${email}`, value: '314159:0', expiresAt: new Date(Date.now() + 60000) }).run()
  const response = await request('/api/auth/sign-in/email-otp', '', 'POST', { email, otp: '314159' })
  assert.equal(response.status, 200, await response.text())
  const cookie = response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
  assert(cookie.includes('session_token='))
  return cookie
}
try {
  let ready = false
  for (let attempt = 0; attempt < (development ? 900 : 100); attempt++) {
    if (child.exitCode !== null) throw new Error(`Production server exited: ${serverLog}`)
    if (await request('/api/auth/get-session').then((response) => response.status === 200, () => false)) { ready = true; break }
    await delay(100)
  }
  assert(ready, `Server did not become ready: ${serverLog}`)
  for (const url of ['/', '/profile', '/people']) {
    const response = await request(url)
    assert.equal(response.status, 302)
    assert.equal(response.headers.get('location'), '/auth')
  }
  const loginPage = await request('/auth')
  assert.equal(loginPage.status, 200)
  assert.match(await loginPage.text(), /UT Dallas EPICS/)
  for (const asset of ['epics-logo.png', 'home-icon.svg', 'people-icon.svg', 'projects-icon.svg', 'chat-icon.svg', 'notification-icon.svg', 'profile-icon.svg']) {
    assert.equal((await request('/images/' + asset)).status, 200, `Missing asset: ${asset}`)
  }
  for (const url of ['/api/profile', '/api/alumni', '/api/users']) assert.equal((await request(url)).status, 401)

  const owner = await login('runtime-owner@example.test')
  const viewer = await login('runtime-viewer@example.test')
  const initial = await (await request('/api/profile', owner)).json()
  assert.equal(initial.onboarding.completed, false)
  const onboarding = await request('/people', owner)
  assert.equal(onboarding.status, 302)
  assert.equal(onboarding.headers.get('location'), '/?setup=1')
  const complete = { name: 'Runtime Ada', major: 'Computer Science', graduationYear: '2026', company: 'Runtime Labs', jobTitle: 'Engineer', biography: 'Isolated runtime smoke test.' }
  const saved = await request('/api/profile', owner, 'PUT', complete)
  assert.equal(saved.status, 200)
  assert.equal((await saved.json()).directoryPublished, false)
  assert.equal((await request('/api/profile', viewer, 'PUT', { ...complete, name: 'Private Viewer' })).status, 200)
  const id = initial.id as string
  assert.equal((await request(`/api/alumni/${id}`, viewer)).status, 404)
  assert.equal((await (await request('/api/alumni', viewer)).json()).pagination.total, 0)

  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9XcAAAAASUVORK5CYII=', 'base64')
  const form = new FormData()
  form.append('file', new Blob([png], { type: 'image/png' }), 'avatar.png')
  assert.equal((await request('/api/users/upload', owner, 'POST', form)).status, 201)
  assert.equal((await request(`/api/users/${id}/profile`, viewer)).status, 404)
  assert.equal((await request('/api/profile', owner, 'PUT', { ...complete, directoryPublished: true })).status, 200)
  const reloaded = await (await request('/api/profile', owner)).json()
  assert.equal(reloaded.onboarding.completed, true)
  assert.equal(reloaded.directoryPublished, true)
  const directory = await (await request('/api/alumni?q=ada&major=computer&company=labs&graduationYear=2026&limit=1', viewer)).json()
  assert.equal(directory.pagination.total, 1)
  assert.equal(directory.data[0].id, id)
  assert.equal(JSON.stringify(directory).includes('runtime-owner@example.test'), false)
  assert.deepEqual(await (await request(`/api/alumni/${id}`, viewer)).json(), directory.data[0])
  const avatar = await request(`/api/users/${id}/profile`, viewer)
  assert.equal(avatar.status, 200)
  assert.deepEqual(Buffer.from(await avatar.arrayBuffer()), png)
  const directoryPage = await request('/people?q=Ada', viewer)
  assert.equal(directoryPage.status, 200)
  assert.match(await directoryPage.text(), /Runtime Ada/)
  const detailPage = await request(`/people/${id}`, viewer)
  assert.equal(detailPage.status, 200)
  assert.match(await detailPage.text(), /Runtime Labs/)
  const legacy = await (await request('/api/users', viewer)).json()
  assert.equal(legacy.length, 1)
  assert.notEqual(legacy[0].id, id)
  await mkdir('public/images/users', { recursive: true })
  legacyFixture = await mkdtemp(path.resolve('public/images/users/epics-smoke-'))
  await mkdir(path.join(legacyFixture, 'images'))
  const fixtureFile = path.join(legacyFixture, 'images', crypto.randomUUID())
  await writeFile(fixtureFile, png, { flag: 'wx' })
  const legacyUrl = '/' + path.relative(path.resolve('public'), fixtureFile).split(path.sep).join('/')
  for (const url of [legacyUrl, `/_ipx/w_100${legacyUrl}`]) {
    const response = await request(url)
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('cache-control'), 'private, no-store')
  }
  if (development) {
    const viteFile = await request('/@fs' + fixtureFile)
    assert([403, 404].includes(viteFile.status), 'Vite must not expose private upload files')
  }
  assert.equal((await request('/api/profile', owner, 'PUT', { ...complete, directoryPublished: false })).status, 200)
  assert.equal((await request(`/api/alumni/${id}`, viewer)).status, 404)
  assert.equal((await request(`/api/users/${id}/profile`, viewer)).status, 404)
  assert.equal((await request('/api/auth/sign-out', owner, 'POST', {})).status, 200)
  assert.equal((await request('/api/profile', owner)).status, 401)
  assert.equal((await request('/people', owner)).headers.get('location'), '/auth')
  console.log(`PASS: ${development ? 'development' : 'production'} HTTP/SSR redirects, onboarding, persisted profile, publication, directory filters/detail, avatar privacy, static/IPX blocking, legacy API privacy, and logout.`)
  console.log('Email delivery and interactive browser layout were not tested by this script.')
} finally {
  if (child.exitCode === null) {
    const exited = once(child, 'exit')
    child.kill('SIGTERM')
    await exited
  }
  if (legacyFixture) await rm(legacyFixture, { recursive: true, force: true })
  sqlite.close()
  await rm(temporary, { recursive: true, force: true })
}
