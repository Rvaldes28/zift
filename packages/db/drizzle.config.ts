import { defineConfig } from 'drizzle-kit'
import { config } from 'dotenv'

config({ path: '../../.env' })
config({ path: '.env' })

const adminDatabaseUrl =
  process.env.ADMIN_DATABASE_URL ?? 'postgresql://localhost:5432/ziftlab_admin_dev'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: adminDatabaseUrl,
  },
  strict: true,
  verbose: true,
})
