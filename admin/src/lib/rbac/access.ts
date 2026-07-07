import 'server-only'

import { activityLogs, db, permissions, rolePermissions, roles, userRoles } from '@ziftlab/db'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { getCurrentSession } from '@/lib/auth/session'
import { requiresTwoFactorSetup } from '@/lib/security/two-factor-policy'

import type { PermissionSlug } from './permissions'

export interface UserAccess {
  roles: string[]
  permissions: PermissionSlug[]
}

function asPermissionSlug(value: string): PermissionSlug | null {
  return value as PermissionSlug
}

export async function getUserAccess(userId: string): Promise<UserAccess> {
  const rows = await db
    .select({
      roleSlug: roles.slug,
      permissionSlug: permissions.slug,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId))

  const roleSet = new Set<string>()
  const permissionSet = new Set<PermissionSlug>()

  for (const row of rows) {
    roleSet.add(row.roleSlug)
    if (row.permissionSlug) {
      const permission = asPermissionSlug(row.permissionSlug)
      if (permission) permissionSet.add(permission)
    }
  }

  return {
    roles: [...roleSet].sort(),
    permissions: [...permissionSet].sort(),
  }
}

export async function getUserPermissions(userId: string): Promise<PermissionSlug[]> {
  return (await getUserAccess(userId)).permissions
}

export async function hasPermission(userId: string, permission: PermissionSlug): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  return permissions.includes(permission)
}

export async function requirePermission(permission: PermissionSlug) {
  const current = await getCurrentSession()
  if (!current) redirect('/login')

  const access = await getUserAccess(current.user.id)
  if (!access.permissions.includes(permission)) {
    await recordActivity({
      actorId: current.user.id,
      action: 'security.permission_denied',
      entityType: 'permission',
      entityId: permission,
    }).catch(() => null)
    redirect('/login?error=forbidden')
  }

  if (permission !== 'dashboard.access' && requiresTwoFactorSetup(current.user, access)) {
    redirect('/dashboard/account?required=2fa')
  }

  return { ...current, access }
}

export async function requireAnyPermission(requiredPermissions: PermissionSlug[]) {
  const current = await getCurrentSession()
  if (!current) redirect('/login')

  const access = await getUserAccess(current.user.id)
  const allowed = requiredPermissions.some((permission) => access.permissions.includes(permission))

  if (!allowed) {
    await recordActivity({
      actorId: current.user.id,
      action: 'security.permission_denied',
      entityType: 'permission',
      metadata: { requiredPermissions },
    }).catch(() => null)
    redirect('/login?error=forbidden')
  }

  if (requiresTwoFactorSetup(current.user, access)) {
    redirect('/dashboard/account?required=2fa')
  }

  return { ...current, access }
}

export async function recordActivity(input: {
  actorId: string | null
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  await db.insert(activityLogs).values({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? {},
  })
}
