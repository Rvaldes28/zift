import 'server-only'

import { db, loginAttempts, securityIpBlocks, sessions, users } from '@ziftlab/db'
import { desc, eq, gt } from 'drizzle-orm'

export interface SessionRow {
  createdAt: Date
  current: boolean
  expiresAt: Date
  id: string
  ipAddress: string | null
  lastSeenAt: Date
  revokedAt: Date | null
  revocationReason: string | null
  userAgent: string | null
}

export async function listSessionsForUser(
  userId: string,
  currentSessionId?: string,
): Promise<SessionRow[]> {
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.lastSeenAt))
    .limit(30)

  return rows.map((session) => ({
    createdAt: session.createdAt,
    current: session.id === currentSessionId,
    expiresAt: session.expiresAt,
    id: session.id,
    ipAddress: session.ipAddress,
    lastSeenAt: session.lastSeenAt,
    revokedAt: session.revokedAt,
    revocationReason: session.revocationReason,
    userAgent: session.userAgent,
  }))
}

export async function listRecentLoginAttempts(limit = 100) {
  return db
    .select({
      attemptedAt: loginAttempts.attemptedAt,
      email: loginAttempts.email,
      id: loginAttempts.id,
      ipAddress: loginAttempts.ipAddress,
      reason: loginAttempts.reason,
      success: loginAttempts.success,
      userAgent: loginAttempts.userAgent,
      userEmail: users.email,
      userName: users.name,
    })
    .from(loginAttempts)
    .leftJoin(users, eq(loginAttempts.userId, users.id))
    .orderBy(desc(loginAttempts.attemptedAt))
    .limit(limit)
}

export async function listActiveIpBlocks(limit = 80) {
  return db
    .select({
      blockedUntil: securityIpBlocks.blockedUntil,
      createdAt: securityIpBlocks.createdAt,
      createdBy: securityIpBlocks.createdBy,
      id: securityIpBlocks.id,
      ipAddress: securityIpBlocks.ipAddress,
      metadata: securityIpBlocks.metadata,
      reason: securityIpBlocks.reason,
    })
    .from(securityIpBlocks)
    .where(gt(securityIpBlocks.blockedUntil, new Date()))
    .orderBy(desc(securityIpBlocks.createdAt))
    .limit(limit)
}

export async function getSecurityOverview() {
  const [attempts, blocks, activeSessions] = await Promise.all([
    listRecentLoginAttempts(50),
    listActiveIpBlocks(50),
    db.select().from(sessions).orderBy(desc(sessions.lastSeenAt)).limit(200),
  ])
  const failedAttempts = attempts.filter((attempt) => !attempt.success).length
  const liveSessions = activeSessions.filter(
    (session) => !session.revokedAt && session.expiresAt > new Date(),
  ).length

  return {
    activeIpBlocks: blocks.length,
    failedAttempts,
    liveSessions,
    recentAttempts: attempts.length,
  }
}
