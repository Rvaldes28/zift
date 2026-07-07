import 'server-only'

import { db, permissions, rolePermissions, roles, userRoles, users, type User } from '@ziftlab/db'
import { eq } from 'drizzle-orm'

import { authConfig } from '@/lib/auth/config'
import type { UserAccess } from '@/lib/rbac/access'
import type { PermissionSlug } from '@/lib/rbac/permissions'

export const SENSITIVE_PERMISSIONS: PermissionSlug[] = [
  'users.manage',
  'roles.manage',
  'settings.manage',
  'audit.read',
]

export function requiresTwoFactorSetup(user: User, access: UserAccess): boolean {
  if (!authConfig().enforceTwoFactorForSensitive) return false
  if (user.twoFactorEnabled) return false

  return (
    access.roles.includes('admin') ||
    SENSITIVE_PERMISSIONS.some((permission) => access.permissions.includes(permission))
  )
}

export async function userRequiresTwoFactorSetup(userId: string): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) return false

  const rows = await db
    .select({
      permissionSlug: permissions.slug,
      roleSlug: roles.slug,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId))

  return requiresTwoFactorSetup(user, {
    permissions: rows
      .map((row) => row.permissionSlug)
      .filter((permission): permission is PermissionSlug => Boolean(permission)),
    roles: rows.map((row) => row.roleSlug),
  })
}
