'use server'

import { db, securityIpBlocks, sessions } from '@ziftlab/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { clearSessionCookie, getCurrentSession, revokeSession } from '@/lib/auth/session'
import { requireAnyPermission, requirePermission, recordActivity } from '@/lib/rbac/access'

import { verifyCsrf } from './csrf'
import { createIpBlock } from './ip-blocks'

const uuidSchema = z.string().uuid()

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function revokeOwnSession(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await getCurrentSession()
  if (!current) redirect('/login')

  const sessionId = formString(formData, 'sessionId')
  if (!uuidSchema.safeParse(sessionId).success) redirect('/dashboard/account?error=invalid')

  const [target] = await db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)
  if (!target || target.userId !== current.user.id) redirect('/dashboard/account?error=invalid')

  await revokeSession(sessionId, {
    reason: sessionId === current.session.id ? 'self_logout' : 'user_remote_logout',
    revokedBy: current.user.id,
  })
  await recordActivity({
    action: 'security.session_revoked',
    actorId: current.user.id,
    entityId: sessionId,
    entityType: 'session',
    metadata: { ownSession: true },
  })

  if (sessionId === current.session.id) {
    await clearSessionCookie()
    redirect('/login?logged_out=1')
  }

  revalidatePath('/dashboard/account')
  redirect('/dashboard/account?status=session-revoked')
}

export async function revokeUserSession(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('users.manage')
  const sessionId = formString(formData, 'sessionId')
  const userId = formString(formData, 'userId')

  if (!uuidSchema.safeParse(sessionId).success || !uuidSchema.safeParse(userId).success) {
    redirect('/dashboard/users?error=invalid')
  }

  await revokeSession(sessionId, {
    reason: 'admin_remote_logout',
    revokedBy: current.user.id,
  })
  await recordActivity({
    action: 'security.session_revoked',
    actorId: current.user.id,
    entityId: sessionId,
    entityType: 'session',
    metadata: { targetUserId: userId },
  })

  revalidatePath(`/dashboard/users/${userId}`)
  redirect(`/dashboard/users/${userId}?status=session-revoked`)
}

export async function blockIpAddressAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requireAnyPermission(['users.manage', 'settings.manage'])
  const ipAddress = formString(formData, 'ipAddress')
  const reason = formString(formData, 'reason') || 'manual_block'

  if (!ipAddress || ipAddress.length > 80) redirect('/dashboard/security/access?error=invalid')

  await createIpBlock({
    actorId: current.user.id,
    ipAddress,
    metadata: { manual: true },
    reason,
  })

  revalidatePath('/dashboard/security')
  revalidatePath('/dashboard/security/access')
  redirect('/dashboard/security/access?status=blocked')
}

export async function unblockIpAddressAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requireAnyPermission(['users.manage', 'settings.manage'])
  const blockId = formString(formData, 'blockId')

  if (!uuidSchema.safeParse(blockId).success) redirect('/dashboard/security/access?error=invalid')

  await db
    .update(securityIpBlocks)
    .set({ blockedUntil: new Date(), updatedAt: new Date() })
    .where(eq(securityIpBlocks.id, blockId))
  await recordActivity({
    action: 'security.ip_unblocked',
    actorId: current.user.id,
    entityId: blockId,
    entityType: 'security_ip_block',
  })

  revalidatePath('/dashboard/security')
  revalidatePath('/dashboard/security/access')
  redirect('/dashboard/security/access?status=unblocked')
}
