'use server'

import { db, rolePermissions, roles, sessions, userRoles, users } from '@ziftlab/db'
import { and, eq, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { normalizeEmail } from '@/lib/auth/config'
import { hashPassword } from '@/lib/auth/password'
import { requirePermission } from '@/lib/rbac/access'
import { recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'

const uuidSchema = z.string().uuid()

function roleIdsFromFormData(formData: FormData): string[] {
  return formData
    .getAll('roleIds')
    .filter((value): value is string => typeof value === 'string')
    .filter((value) => uuidSchema.safeParse(value).success)
}

async function activeAdminIds(): Promise<Set<string>> {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(users.status, 'active'), isNull(users.deletedAt), eq(roles.slug, 'admin')))

  return new Set(rows.map((row) => row.id))
}

async function roleIdsForSlugs(slugs: string[]): Promise<Map<string, string>> {
  const roleRows = await db.select({ id: roles.id, slug: roles.slug }).from(roles)
  const result = new Map<string, string>()

  for (const role of roleRows) {
    if (slugs.includes(role.slug)) result.set(role.slug, role.id)
  }

  return result
}

async function ensureNotRemovingLastAdmin(input: {
  userId: string
  nextStatus?: string
  nextRoleIds?: string[]
}): Promise<boolean> {
  const adminIds = await activeAdminIds()
  if (!adminIds.has(input.userId) || adminIds.size > 1) return true

  if (input.nextStatus && input.nextStatus !== 'active') return false

  if (input.nextRoleIds) {
    const adminRole = await roleIdsForSlugs(['admin'])
    const adminRoleId = adminRole.get('admin')
    if (adminRoleId && !input.nextRoleIds.includes(adminRoleId)) return false
  }

  return true
}

async function replaceUserRoles(input: {
  userId: string
  roleIds: string[]
  actorId: string
}): Promise<void> {
  await db.delete(userRoles).where(eq(userRoles.userId, input.userId))

  for (const roleId of input.roleIds) {
    await db
      .insert(userRoles)
      .values({
        userId: input.userId,
        roleId,
        assignedBy: input.actorId,
      })
      .onConflictDoNothing()
  }
}

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(254).transform(normalizeEmail),
  password: z.string().min(12),
})

const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(254).transform(normalizeEmail),
})

export async function createUser(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('users.manage')
  const parsed = createUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  const roleIds = roleIdsFromFormData(formData)

  if (!parsed.success || roleIds.length === 0) {
    redirect('/dashboard/users/new?error=invalid')
  }

  const now = new Date()
  const passwordHash = await hashPassword(parsed.data.password)
  const [user] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      status: 'active',
      mustChangePassword: true,
      passwordUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: users.id })

  await replaceUserRoles({ userId: user.id, roleIds, actorId: current.user.id })
  await recordActivity({
    actorId: current.user.id,
    action: 'user.created',
    entityType: 'user',
    entityId: user.id,
    metadata: { email: parsed.data.email, roleIds },
  })

  revalidatePath('/dashboard/users')
  redirect(`/dashboard/users/${user.id}?status=created`)
}

export async function updateUser(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('users.manage')
  const userId = formData.get('userId')
  const parsed = updateUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  })
  const roleIds = roleIdsFromFormData(formData)

  if (typeof userId !== 'string' || !parsed.success || roleIds.length === 0) {
    redirect('/dashboard/users?error=invalid')
  }

  if (!(await ensureNotRemovingLastAdmin({ userId, nextRoleIds: roleIds }))) {
    redirect(`/dashboard/users/${userId}?error=last-admin`)
  }

  await db
    .update(users)
    .set({
      name: parsed.data.name,
      email: parsed.data.email,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  await replaceUserRoles({ userId, roleIds, actorId: current.user.id })
  await recordActivity({
    actorId: current.user.id,
    action: 'user.updated',
    entityType: 'user',
    entityId: userId,
    metadata: { email: parsed.data.email, roleIds },
  })

  revalidatePath('/dashboard/users')
  redirect(`/dashboard/users/${userId}?status=updated`)
}

export async function setUserStatus(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('users.manage')
  const userId = formData.get('userId')
  const status = formData.get('status')

  if (typeof userId !== 'string' || (status !== 'active' && status !== 'inactive')) {
    redirect('/dashboard/users?error=invalid')
  }

  if (!(await ensureNotRemovingLastAdmin({ userId, nextStatus: status }))) {
    redirect(`/dashboard/users/${userId}?error=last-admin`)
  }

  await db.update(users).set({ status, updatedAt: new Date() }).where(eq(users.id, userId))

  if (status !== 'active') {
    await db
      .update(sessions)
      .set({
        revokedAt: new Date(),
        revokedBy: current.user.id,
        revocationReason: 'user_deactivated',
        updatedAt: new Date(),
      })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
  }

  await recordActivity({
    actorId: current.user.id,
    action: status === 'active' ? 'user.activated' : 'user.deactivated',
    entityType: 'user',
    entityId: userId,
  })
  revalidatePath('/dashboard/users')
  redirect(`/dashboard/users/${userId}?status=${status}`)
}

export async function resetUserPassword(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('users.manage')
  const userId = formData.get('userId')
  const password = formData.get('password')

  if (typeof userId !== 'string' || typeof password !== 'string' || password.length < 12) {
    redirect('/dashboard/users?error=invalid')
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      passwordUpdatedAt: new Date(),
      mustChangePassword: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
  await db
    .update(sessions)
    .set({
      revokedAt: new Date(),
      revokedBy: current.user.id,
      revocationReason: 'password_reset',
      updatedAt: new Date(),
    })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))

  await recordActivity({
    actorId: current.user.id,
    action: 'user.password_reset',
    entityType: 'user',
    entityId: userId,
  })
  redirect(`/dashboard/users/${userId}?status=password-reset`)
}

export async function resetUserTotp(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('users.manage')
  const userId = formData.get('userId')
  if (typeof userId !== 'string') redirect('/dashboard/users?error=invalid')

  await db
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecretEncrypted: null,
      twoFactorConfirmedAt: null,
      twoFactorRecoveryCodes: [],
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  await recordActivity({
    actorId: current.user.id,
    action: 'auth.totp_reset',
    entityType: 'user',
    entityId: userId,
  })
  redirect(`/dashboard/users/${userId}?status=totp-reset`)
}

export async function updateRolePermissions(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('roles.manage')
  const roleId = formData.get('roleId')
  if (typeof roleId !== 'string') redirect('/dashboard/roles?error=invalid')

  const [role] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1)
  if (!role) redirect('/dashboard/roles?error=invalid')
  if (role.slug === 'admin') redirect('/dashboard/roles?error=admin-locked')

  const permissionIds = formData
    .getAll('permissionIds')
    .filter((value): value is string => typeof value === 'string')
    .filter((value) => uuidSchema.safeParse(value).success)

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId))
  for (const permissionId of permissionIds) {
    await db
      .insert(rolePermissions)
      .values({
        roleId,
        permissionId,
        assignedBy: current.user.id,
      })
      .onConflictDoNothing()
  }

  await recordActivity({
    actorId: current.user.id,
    action: 'role.permissions_updated',
    entityType: 'role',
    entityId: roleId,
    metadata: { role: role.slug, permissionIds },
  })
  revalidatePath('/dashboard/roles')
  redirect('/dashboard/roles?status=updated')
}
