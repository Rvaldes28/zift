import 'server-only'

import { db, loginAttempts, securityIpBlocks, sessions } from '@ziftlab/db'
import { and, eq, gt, gte, isNull } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { authConfig } from '@/lib/auth/config'
import type { RequestMeta } from '@/lib/auth/request'
import { recordActivity } from '@/lib/rbac/access'

export async function activeIpBlock(ipAddress: string | null | undefined) {
  if (!ipAddress) return null
  const now = new Date()
  const [block] = await db
    .select()
    .from(securityIpBlocks)
    .where(and(eq(securityIpBlocks.ipAddress, ipAddress), gt(securityIpBlocks.blockedUntil, now)))
    .limit(1)

  return block ?? null
}

export async function redirectIfIpBlocked(meta: RequestMeta, redirectTo = '/login?error=locked') {
  const block = await activeIpBlock(meta.ipAddress)
  if (!block) return

  await recordActivity({
    actorId: null,
    action: 'security.ip_block_enforced',
    entityType: 'security_ip_block',
    entityId: block.id,
    metadata: { ipAddress: meta.ipAddress, reason: block.reason },
  }).catch(() => null)
  redirect(redirectTo)
}

export async function createIpBlock(input: {
  actorId?: string | null
  ipAddress: string
  metadata?: Record<string, unknown>
  minutes?: number
  reason: string
}) {
  const now = new Date()
  const blockedUntil = new Date(
    now.getTime() + (input.minutes ?? authConfig().ipBlockMinutes) * 60 * 1000,
  )
  const [block] = await db
    .insert(securityIpBlocks)
    .values({
      blockedUntil,
      createdBy: input.actorId ?? null,
      ipAddress: input.ipAddress,
      metadata: input.metadata ?? {},
      reason: input.reason,
    })
    .returning()

  await db
    .update(sessions)
    .set({
      revokedAt: now,
      revokedBy: input.actorId ?? null,
      revocationReason: 'ip_block',
      updatedAt: now,
    })
    .where(and(eq(sessions.ipAddress, input.ipAddress), isNull(sessions.revokedAt)))

  await recordActivity({
    actorId: input.actorId ?? null,
    action: 'security.ip_blocked',
    entityType: 'security_ip_block',
    entityId: block.id,
    metadata: { blockedUntil: blockedUntil.toISOString(), ipAddress: input.ipAddress, reason: input.reason },
  }).catch(() => null)

  return block
}

export async function autoBlockIpIfNeeded(meta: RequestMeta) {
  if (!meta.ipAddress) return null
  if (await activeIpBlock(meta.ipAddress)) return null

  const config = authConfig()
  const windowStart = new Date(Date.now() - config.ipWindowMinutes * 60 * 1000)
  const rows = await db
    .select({ id: loginAttempts.id })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.success, false),
        eq(loginAttempts.ipAddress, meta.ipAddress),
        gte(loginAttempts.attemptedAt, windowStart),
      ),
    )
    .limit(config.ipMaxFailedAttempts)

  if (rows.length < config.ipMaxFailedAttempts) return null

  return createIpBlock({
    ipAddress: meta.ipAddress,
    metadata: { failures: rows.length, windowMinutes: config.ipWindowMinutes },
    reason: 'too_many_failed_auth_attempts',
  })
}
