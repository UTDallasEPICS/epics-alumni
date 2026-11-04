import 'dotenv/config'
import path from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

// Deliberately require an isolated, explicitly named demonstration database.
// Never run this seed automatically during startup, migrations, or deployment.
const databasePath = process.env.DATABASE_URL?.replace(/^file:/, '')
if (process.env.NODE_ENV !== 'development' || process.env.EPICS_SEED_DEMO !== '1' ||
    !databasePath || path.basename(databasePath) !== 'epics-demo.sqlite') {
  throw new Error('Demo seed requires NODE_ENV=development, EPICS_SEED_DEMO=1, and DATABASE_URL=file:<path>/epics-demo.sqlite. Run migrations first.')
}
const sqlite = new Database(databasePath, { fileMustExist: true })
const db = drizzle(sqlite, { schema })
try {
  db.transaction((tx) => {
    for (let index = 1; index <= 14; index++) {
      const id = `epics-demo-${String(index).padStart(2, '0')}`
      const created = tx.insert(schema.user).values({
        id, name: `Demo Alumnus ${String(index).padStart(2, '0')}`,
        email: `${id}@example.invalid`,
      }).onConflictDoNothing().returning({ id: schema.user.id }).get()
      // Re-running cannot overwrite edits or republish a withdrawn profile.
      if (!created) continue
      tx.insert(schema.profile).values({
        userId: id, major: index === 14 ? null : index % 2 ? 'Computer Science' : 'Mechanical Engineering',
        graduationYear: 2024 + index % 3, company: index % 2 ? 'Demo Robotics' : 'Demo Research',
        jobTitle: index % 2 ? 'Engineer' : 'Researcher', bio: 'Fictional local demonstration profile.',
        directoryPublished: index <= 12,
      }).run()
    }
  })
  console.log('Demo seed complete: 12 opted-in examples, one private example, and one incomplete example. Existing rows were preserved.')
} finally {
  sqlite.close()
}
