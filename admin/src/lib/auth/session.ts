import 'server-only'

import { db, sessions, users, type Session, type User } from '@ziftlab/db'
import { and, eq, gt, isNull, ne } from 'drizzle-orm'
import { cookies } from 'next/headers'

import { authConfig } from './config'
import { MUST_CHANGE_PASSWORD_COOKIE, MUST_SETUP_2FA_COOKIE, SESSION_COOKIE } from './constants'
import { createSessionToken, hashSessionToken } from './crypto'
import { requestMeta } from './request'
import { userRequiresTwoFactorSetup } from '@/lib/security/two-factor-policy'

export interface CurrentSession {
  session: Session
  user: User
}

function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  }
}

function mustChangePasswordCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  }
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt))
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  cookieStore.set(MUST_CHANGE_PASSWORD_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
  cookieStore.set(MUST_SETUP_2FA_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function clearMustSetupTwoFactorCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(MUST_SETUP_2FA_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value ?? null
}

export async function createSession(
  userId: string,
  options: { mustChangePassword?: boolean; mustSetupTwoFactor?: boolean } = {},
): Promise<Session> {
  const token = createSessionToken()
  const tokenHash = hashSessionToken(token)
  const config = authConfig()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + config.sessionDays * 24 * 60 * 60 * 1000)
  const meta = await requestMeta()

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      tokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  await setSessionCookie(token, expiresAt)
  const cookieStore = await cookies()

  const mustSetupTwoFactor =
    options.mustSetupTwoFactor ?? (await userRequiresTwoFactorSetup(userId).catch(() => false))

  if (options.mustChangePassword) {
    cookieStore.set(MUST_CHANGE_PASSWORD_COOKIE, '1', mustChangePasswordCookieOptions(expiresAt))
  } else {
    cookieStore.set(MUST_CHANGE_PASSWORD_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })
  }

  if (mustSetupTwoFactor) {
    cookieStore.set(MUST_SETUP_2FA_COOKIE, '1', mustChangePasswordCookieOptions(expiresAt))
  } else {
    cookieStore.set(MUST_SETUP_2FA_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
    })
  }

  return session
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const token = await getSessionToken()
  if (!token) return null

  const tokenHash = hashSessionToken(token)
  const now = new Date()

  const [current] = await db
    .select({
      session: sessions,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        eq(users.status, 'active'),
        isNull(users.deletedAt),
      ),
    )
    .limit(1)

  if (!current) return null

  const idleCutoff = new Date(now.getTime() - authConfig().sessionIdleMinutes * 60 * 1000)
  if (current.session.lastSeenAt < idleCutoff) {
    await db
      .update(sessions)
      .set({ revokedAt: now, revocationReason: 'idle_timeout', updatedAt: now })
      .where(eq(sessions.id, current.session.id))
    await clearSessionCookie()
    return null
  }

  await db
    .update(sessions)
    .set({ lastSeenAt: now, updatedAt: now })
    .where(eq(sessions.id, current.session.id))

  return current
}

export async function revokeSession(
  sessionId: string,
  options: { revokedBy?: string | null; reason?: string } = {},
): Promise<void> {
  const now = new Date()
  await db
    .update(sessions)
    .set({
      revokedAt: now,
      revokedBy: options.revokedBy ?? null,
      revocationReason: options.reason ?? 'revoked',
      updatedAt: now,
    })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)))
}

export async function revokeCurrentSession(): Promise<void> {
  const current = await getCurrentSession()
  if (current) {
    await revokeSession(current.session.id, { revokedBy: current.user.id, reason: 'logout' })
  }

  await clearSessionCookie()
}

export async function revokeOtherSessions(
  userId: string,
  keepSessionId: string,
  options: { revokedBy?: string | null; reason?: string } = {},
): Promise<void> {
  const now = new Date()
  await db
    .update(sessions)
    .set({
      revokedAt: now,
      revokedBy: options.revokedBy ?? null,
      revocationReason: options.reason ?? 'revoked_other_sessions',
      updatedAt: now,
    })
    .where(
      and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId), isNull(sessions.revokedAt)),
    )
}

export async function revokeAllUserSessions(
  userId: string,
  options: { revokedBy?: string | null; reason?: string } = {},
): Promise<void> {
  const now = new Date()
  await db
    .update(sessions)
    .set({
      revokedAt: now,
      revokedBy: options.revokedBy ?? null,
      revocationReason: options.reason ?? 'revoked_all_sessions',
      updatedAt: now,
    })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
}
