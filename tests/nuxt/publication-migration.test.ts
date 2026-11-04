// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import * as schema from '../../server/db/schema'
import { queryAlumni } from '../../server/api/alumni/index.get'
import { publicationEligibility } from '../../server/utils/publication'
import { alumniQuerySchema } from '../../shared/alumni'
// queryAlumni receives this suite's database explicitly; never load the app DB.
vi.mock('../../server/utils/db', () => ({ db: undefined }))

let temporary: string
let sqlite: InstanceType<typeof Database>
beforeEach(async () => {
  temporary = await mkdtemp(path.join(tmpdir(), 'epics-migration-'))
  sqlite = new Database(path.join(temporary, 'epics-demo.sqlite'))
  sqlite.pragma('foreign_keys = ON')
})
afterEach(async () => {
  sqlite?.close()
  if (temporary) await rm(temporary, { recursive: true, force: true })
})

describe('real publication migrations on isolated SQLite files', () => {
  it('creates a fresh schema, defaults to private, and persists explicit consent across connections', () => {
    const db = drizzle(sqlite, { schema })
    migrate(db, { migrationsFolder: 'drizzle' })
    const column = (sqlite.pragma('table_info(profile)') as { name: string; notnull: number; dflt_value: string }[]).find((column) => column.name === 'directoryPublished')
    expect(column).toMatchObject({ notnull: 1, dflt_value: 'false' })
    db.insert(schema.user).values({ id: 'owner', name: 'Owner', email: 'owner@example.test' }).run()
    db.insert(schema.profile).values({ userId: 'owner', major: 'CS', graduationYear: 2026 }).run()
    expect(db.select().from(schema.profile).get()?.directoryPublished).toBe(false)
    expect(() => sqlite.exec("UPDATE profile SET directoryPublished = NULL")).toThrow()
    expect(() => db.insert(schema.profile).values({ userId: 'missing' }).run()).toThrow()
    db.update(schema.profile).set({ directoryPublished: true }).where(eq(schema.profile.userId, 'owner')).run()
    sqlite.close()
    sqlite = new Database(path.join(temporary, 'epics-demo.sqlite'))
    expect(drizzle(sqlite, { schema }).select().from(schema.profile).get()?.directoryPublished).toBe(true)
    migrate(drizzle(sqlite), { migrationsFolder: 'drizzle' })
    expect(sqlite.prepare('SELECT count(*) AS count FROM __drizzle_migrations').get()).toEqual({ count: 3 })
  })

  it('upgrades the prior schema without changing existing user/profile values or opting anyone in', async () => {
    const prior = path.join(temporary, 'prior')
    await mkdir(path.join(prior, 'meta'), { recursive: true })
    const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'))
    journal.entries = journal.entries.slice(0, 2)
    await writeFile(path.join(prior, 'meta/_journal.json'), JSON.stringify(journal))
    for (const entry of journal.entries) await copyFile(`drizzle/${entry.tag}.sql`, path.join(prior, `${entry.tag}.sql`))
    const db = drizzle(sqlite, { schema })
    migrate(db, { migrationsFolder: prior })
    db.insert(schema.user).values([
      { id: 'legacy', name: 'Legacy Owner', email: 'legacy@example.test', image: 'users/legacy/images/11111111-1111-4111-8111-111111111111' },
      { id: 'missing', name: 'No Profile', email: 'missing@example.test' },
    ]).run()
    sqlite.prepare('INSERT INTO profile (userId, major, graduationYear, company, bio, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('legacy', 'CS', 2025, 'Legacy Co', 'Existing biography', 1700000000, 1700000001)
    const oldProfile = sqlite.prepare('SELECT * FROM profile').get() as Record<string, unknown>
    const oldUsers = sqlite.prepare('SELECT * FROM user ORDER BY id').all()
    migrate(db, { migrationsFolder: 'drizzle' })
    expect(sqlite.prepare('SELECT * FROM profile').get()).toEqual({ ...oldProfile, directoryPublished: 0 })
    expect(sqlite.prepare('SELECT * FROM user ORDER BY id').all()).toEqual(oldUsers)
    expect(queryAlumni(db, alumniQuerySchema.parse({}), publicationEligibility).data).toEqual([])
    db.update(schema.profile).set({ directoryPublished: true, company: 'Updated Co' }).where(eq(schema.profile.userId, 'legacy')).run()
    expect(queryAlumni(db, alumniQuerySchema.parse({}), publicationEligibility).data[0]).toMatchObject({ id: 'legacy', company: 'Updated Co', biography: 'Existing biography' })
  })

  it('keeps the generated journal and snapshot chain consistent with the schema', async () => {
    const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'))
    const previous = JSON.parse(await readFile('drizzle/meta/0001_snapshot.json', 'utf8'))
    const current = JSON.parse(await readFile('drizzle/meta/0002_snapshot.json', 'utf8'))
    expect(journal.entries.at(-1)).toMatchObject({ idx: 2, tag: '0002_profile_publication' })
    expect(current.prevId).toBe(previous.id)
    expect(current.tables.profile.columns.directoryPublished).toMatchObject({ name: 'directoryPublished', type: 'integer', notNull: true, default: false })
    expect(Object.keys(current.tables)).toEqual(Object.keys(previous.tables))
  })
})

async function seed(overrides: Record<string, string | undefined> = {}) {
  return promisify(execFile)(process.execPath, ['--import', 'tsx', 'server/db/seed.ts'], {
    env: { PATH: process.env.PATH, NODE_ENV: 'development', EPICS_SEED_DEMO: '1',
      DATABASE_URL: `file:${path.join(temporary, 'epics-demo.sqlite')}`, DOTENV_CONFIG_PATH: '/dev/null', ...overrides },
  })
}

describe('opt-in demonstration seed', () => {
  it('creates only isolated examples and preserves withdrawn consent and edits on rerun', async () => {
    const db = drizzle(sqlite, { schema })
    migrate(db, { migrationsFolder: 'drizzle' })
    await seed()
    expect(db.select().from(schema.user).all()).toHaveLength(14)
    expect(queryAlumni(db, alumniQuerySchema.parse({}), publicationEligibility).pagination.total).toBe(12)
    db.update(schema.profile).set({ directoryPublished: false, company: 'Keep this edit' }).where(eq(schema.profile.userId, 'epics-demo-01')).run()
    await seed()
    expect(db.select().from(schema.profile).where(eq(schema.profile.userId, 'epics-demo-01')).get()).toMatchObject({ directoryPublished: false, company: 'Keep this edit' })
    expect(queryAlumni(db, alumniQuerySchema.parse({}), publicationEligibility).pagination.total).toBe(11)
  })

  it.each([{ NODE_ENV: 'production' }, { EPICS_SEED_DEMO: '0' }, { DATABASE_URL: 'file:./dev.db' }])('refuses unsafe seed configuration %j before opening a database', async (overrides) => {
    await expect(seed(overrides)).rejects.toThrow('Demo seed requires')
    expect(sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all()).toEqual([])
  })
})
