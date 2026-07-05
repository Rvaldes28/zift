import { config } from 'dotenv'
import path from 'node:path'

const DEFAULT_ADMIN_DATABASE_URL = 'postgresql://localhost:5432/ziftlab_admin_dev'

config({ path: path.resolve(process.cwd(), '../../.env') })
config({ path: path.resolve(process.cwd(), '.env'), override: true })

export function getAdminDatabaseUrl(): string {
  const url = process.env.ADMIN_DATABASE_URL?.trim()
  if (url) return url

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_DATABASE_URL is required in production')
  }

  return DEFAULT_ADMIN_DATABASE_URL
}
