import argon2 from 'argon2'
import { eq } from 'drizzle-orm'

import {
  activityLogs,
  closeDb,
  db,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '@ziftlab/db'

const DEFAULT_EMAIL = 'admin@ziftlab.local'
const DEFAULT_NAME = 'Admin Local'
const DEFAULT_PASSWORD = 'ZiftLabAdmin1234'

function readConfig() {
  const email = (process.env.ADMIN_DEV_EMAIL || DEFAULT_EMAIL).trim().toLowerCase()
  const name = (process.env.ADMIN_DEV_NAME || DEFAULT_NAME).trim()
  const password = process.env.ADMIN_DEV_PASSWORD || DEFAULT_PASSWORD
  const memoryCost = Number(process.env.ADMIN_ARGON2_MEMORY || 65536)
  const timeCost = Number(process.env.ADMIN_ARGON2_TIME || 3)
  const parallelism = Number(process.env.ADMIN_ARGON2_PARALLELISM || 1)

  if (!email.includes('@')) {
    throw new Error('ADMIN_DEV_EMAIL debe ser un email valido.')
  }

  if (password.length < 12) {
    throw new Error('ADMIN_DEV_PASSWORD debe tener al menos 12 caracteres.')
  }

  return {
    email,
    memoryCost,
    name,
    parallelism,
    password,
    timeCost,
  }
}

async function ensureAdminRolePermissions(roleId) {
  const allPermissions = await db.select({ id: permissions.id }).from(permissions)

  for (const permission of allPermissions) {
    await db
      .insert(rolePermissions)
      .values({ roleId, permissionId: permission.id })
      .onConflictDoNothing()
  }
}

async function upsertDevAdmin() {
  const config = readConfig()
  const passwordHash = await argon2.hash(config.password, {
    memoryCost: config.memoryCost,
    parallelism: config.parallelism,
    timeCost: config.timeCost,
    type: argon2.argon2id,
  })
  const now = new Date()

  const [adminRole] = await db.select().from(roles).where(eq(roles.slug, 'admin')).limit(1)
  if (!adminRole) {
    throw new Error('No existe el rol admin. Corre primero pnpm db:seed.')
  }

  await ensureAdminRolePermissions(adminRole.id)

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, config.email))
    .limit(1)

  let userId = existingUser?.id

  if (userId) {
    await db
      .update(users)
      .set({
        deletedAt: null,
        failedLoginCount: 0,
        lockedUntil: null,
        mustChangePassword: false,
        name: config.name,
        passwordHash,
        passwordUpdatedAt: now,
        status: 'active',
        twoFactorConfirmedAt: null,
        twoFactorEnabled: false,
        twoFactorRecoveryCodes: [],
        twoFactorSecretEncrypted: null,
        updatedAt: now,
      })
      .where(eq(users.id, userId))
  } else {
    const [createdUser] = await db
      .insert(users)
      .values({
        email: config.email,
        failedLoginCount: 0,
        mustChangePassword: false,
        name: config.name,
        passwordHash,
        passwordUpdatedAt: now,
        status: 'active',
      })
      .returning({ id: users.id })

    userId = createdUser.id
  }

  await db
    .insert(userRoles)
    .values({ roleId: adminRole.id, userId })
    .onConflictDoNothing()

  await db.insert(activityLogs).values({
    action: 'dev.admin_user_upserted',
    entityId: userId,
    entityType: 'user',
    metadata: {
      email: config.email,
      source: 'admin/scripts/create-dev-user.mjs',
    },
  })

  return config
}

try {
  const config = await upsertDevAdmin()

  console.info('')
  console.info('Admin local listo')
  console.info(`URL:      http://localhost:3000/dashboard`)
  console.info(`Email:    ${config.email}`)
  console.info(`Password: ${config.password}`)
  console.info('')
} catch (error) {
  console.error('No se pudo crear el admin local:', error)
  process.exitCode = 1
} finally {
  await closeDb()
}
