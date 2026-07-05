import 'server-only'

import { authChallenges, db, users, type User } from '@ziftlab/db'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { cookies } from 'next/headers'

import { authConfig } from '@/lib/auth/config'
import { TWO_FACTOR_CHALLENGE_COOKIE } from '@/lib/auth/constants'
import { createSessionToken, hashSessionToken } from '@/lib/auth/crypto'
import { requestMeta } from '@/lib/auth/request'

export async function createTwoFactorChallenge(userId: string): Promise<string> {
  const token = createSessionToken()
  const tokenHash = hashSessionToken(token)
  const config = authConfig()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + config.twoFactorChallengeMinutes * 60 * 1000)
  const meta = await requestMeta()

  await db.insert(authChallenges).values({
    userId,
    tokenHash,
    type: 'totp',
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    createdAt: now,
    updatedAt: now,
  })

  const cookieStore = await cookies()
  cookieStore.set(TWO_FACTOR_CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })

  return token
}

export async function clearTwoFactorChallengeCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(TWO_FACTOR_CHALLENGE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}

export async function getTwoFactorChallenge(): Promise<{
  challengeId: string
  user: User
} | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TWO_FACTOR_CHALLENGE_COOKIE)?.value
  if (!token) return null

  const tokenHash = hashSessionToken(token)
  const now = new Date()

  const [challenge] = await db
    .select({
      challengeId: authChallenges.id,
      user: users,
    })
    .from(authChallenges)
    .innerJoin(users, eq(authChallenges.userId, users.id))
    .where(
      and(
        eq(authChallenges.tokenHash, tokenHash),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, now),
        eq(users.status, 'active'),
        isNull(users.deletedAt),
      ),
    )
    .limit(1)

  return challenge ?? null
}

export async function consumeTwoFactorChallenge(challengeId: string): Promise<void> {
  const now = new Date()
  await db
    .update(authChallenges)
    .set({ consumedAt: now, updatedAt: now })
    .where(eq(authChallenges.id, challengeId))
  await clearTwoFactorChallengeCookie()
}
