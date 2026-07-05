import 'server-only'

import {
  activityLogs,
  db,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from '@ziftlab/db'
import { desc, eq, isNull } from 'drizzle-orm'

export interface ListedUser {
  id: string
  name: string
  email: string
  status: string
  mustChangePassword: boolean
  twoFactorEnabled: boolean
  lastLoginAt: Date | null
  roles: string[]
}

export async function listUsers(
  input: {
    search?: string
    status?: string
    role?: string
  } = {},
): Promise<ListedUser[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
      mustChangePassword: users.mustChangePassword,
      twoFactorEnabled: users.twoFactorEnabled,
      lastLoginAt: users.lastLoginAt,
      roleSlug: roles.slug,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(isNull(users.deletedAt))
    .orderBy(users.email)

  const usersById = new Map<string, ListedUser>()
  for (const row of rows) {
    const existing = usersById.get(row.id)
    if (existing) {
      if (row.roleSlug) existing.roles.push(row.roleSlug)
      continue
    }

    usersById.set(row.id, {
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status,
      mustChangePassword: row.mustChangePassword,
      twoFactorEnabled: row.twoFactorEnabled,
      lastLoginAt: row.lastLoginAt,
      roles: row.roleSlug ? [row.roleSlug] : [],
    })
  }

  const search = input.search?.trim().toLowerCase()
  return [...usersById.values()].filter((user) => {
    const matchesSearch =
      !search ||
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    const matchesStatus = !input.status || user.status === input.status
    const matchesRole = !input.role || user.roles.includes(input.role)

    return matchesSearch && matchesStatus && matchesRole
  })
}

export async function getUserForEdit(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)

  if (!user || user.deletedAt) return null

  const assignedRoles = await db
    .select({ roleId: userRoles.roleId, roleSlug: roles.slug })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId))

  return {
    user,
    roleIds: assignedRoles.map((role) => role.roleId),
    roleSlugs: assignedRoles.map((role) => role.roleSlug),
  }
}

export async function listRoles() {
  return db.select().from(roles).orderBy(roles.slug)
}

export async function listPermissions() {
  return db.select().from(permissions).orderBy(permissions.slug)
}

export async function getRolePermissionMatrix() {
  const [roleRows, permissionRows, relationRows] = await Promise.all([
    listRoles(),
    listPermissions(),
    db.select().from(rolePermissions),
  ])

  const permissionIdsByRole = new Map<string, Set<string>>()
  for (const relation of relationRows) {
    const current = permissionIdsByRole.get(relation.roleId) ?? new Set<string>()
    current.add(relation.permissionId)
    permissionIdsByRole.set(relation.roleId, current)
  }

  return {
    roles: roleRows,
    permissions: permissionRows,
    permissionIdsByRole,
  }
}

export async function listActivity(limit = 80) {
  return db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.actorId, users.id))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
}
