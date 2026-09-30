import 'dotenv/config'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { parse } from 'csv-parse/sync'
import fs from 'fs'
import path from 'path'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!.replace('file:', '')
const sqlite = new Database(connectionString)
const db = drizzle(sqlite, { schema })

async function main() {
  console.log('Start seeding...')

  const existingUser = await db.query.user.findFirst({
    where: (user, { eq }) => eq(user.email, 'seeded-user@email.com'),
  })

  if (!existingUser) {
    const userId = crypto.randomUUID()

    console.log('Generated user ID:', userId)

    const [created] = await db
      .insert(schema.user)
      .values({
        id: crypto.randomUUID(),
        email: 'seeded-user@email.com',
        name: 'Sample Seeded User',
      })
      .returning()
    console.log({ user: created })
  } else {
    console.log({ user: existingUser })
  }

  console.log('Seeding projects...')

  const existingProjectCount = await db.query.project.findMany()

  if (existingProjectCount.length === 0) {
    const csvPath = path.join(__dirname, 'utdesign_epics_mock_projects.csv')
    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const records: Array<{
      'Project Title': string
      Semester: string
      'Project Category': string
      Status: string
      Description: string
    }> = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    })

    const rows = records.map((r) => ({
      id: crypto.randomUUID(),
      projectTitle: r['Project Title'],
      semester: r['Semester'],
      projectCategory: r['Project Category'],
      status: r['Status'],
      description: r['Description'],
    }))

    await db.insert(schema.project).values(rows)
    console.log(`Inserted ${rows.length} projects`)
  } else {
    console.log(`Projects already seeded (${existingProjectCount.length} found)`)
  }

  console.log('Seeding finished.')
}

main()
  .then(() => {
    sqlite.close()
  })
  .catch((e) => {
    console.error(e)
    sqlite.close()
    process.exit(1)
  })
