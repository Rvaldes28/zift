import 'server-only'

import { db, users } from '@ziftlab/db'
import { isNull } from 'drizzle-orm'

import { bootstrapToken } from './config'

export interface InitialRegistrationStatus {
  available: boolean
  tokenConfigured: boolean
}

export async function initialRegistrationStatus(): Promise<InitialRegistrationStatus> {
  const tokenConfigured = Boolean(bootstrapToken())

  if (!tokenConfigured) {
    return { available: false, tokenConfigured }
  }

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(isNull(users.deletedAt))
    .limit(1)

  return {
    available: !existingUser,
    tokenConfigured,
  }
}
