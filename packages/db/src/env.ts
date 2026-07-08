import { config } from 'dotenv'
import path from 'node:path'

const DEFAULT_ADMIN_DATABASE_URL = 'postgresql://postgres:postgres@postgres:5432/ziftlab_admin_dev'

for (const envFile of [
  { override: false, path: path.resolve(process.cwd(), '../../.env') },
  { override: false, path: path.resolve(process.cwd(), '../.env') },
  { override: true, path: path.resolve(process.cwd(), '.env') },
]) {
  config(envFile)
}

export function getAdminDatabaseUrl(): string {
  const url = process.env.ADMIN_DATABASE_URL?.trim()
  if (url) return url

  const isNextProductionBuild = process.env.NEXT_PHASE === 'phase-production-build'
  if (process.env.NODE_ENV === 'production' && !isNextProductionBuild) {
    throw new Error('ADMIN_DATABASE_URL is required in production')
  }

  return DEFAULT_ADMIN_DATABASE_URL
}
