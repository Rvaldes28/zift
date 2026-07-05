import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { getAdminDatabaseUrl } from './env.js'
import * as schema from './schema.js'

export const pool = new Pool({
  connectionString: getAdminDatabaseUrl(),
})

export const db = drizzle(pool, { schema })

export async function closeDb(): Promise<void> {
  await pool.end()
}
