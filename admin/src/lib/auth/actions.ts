'use server'

import {
  db,
  loginAttempts,
  permissions,
  rolePermissions,
  roles,
  sessions,
  userRoles,
  users,
  type User,
} from '@ziftlab/db'
import { and, eq, gte, isNull, or, sql } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { authConfig, bootstrapToken, normalizeEmail } from './config'
import { DASHBOARD_PATH } from './constants'
import { hashPassword, verifyPassword } from './password'
import { requestMeta, type RequestMeta } from './request'
import {
  clearMustSetupTwoFactorCookie,
  createSession,
  getCurrentSession,
  revokeCurrentSession,
} from './session'
import { verifyCsrf } from '@/lib/security/csrf'
import { autoBlockIpIfNeeded, redirectIfIpBlocked } from '@/lib/security/ip-blocks'
import {
  createTwoFactorChallenge,
  getTwoFactorChallenge,
  consumeTwoFactorChallenge,
} from '@/lib/totp/challenge'
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  hashRecoveryCodes,
  verifyTotpCode,
  createTotpSecret,
} from '@/lib/totp/totp'
import { getUserPermissions, recordActivity } from '@/lib/rbac/access'

class AuthActionError extends Error {
  constructor(readonly code: string) {
    super(code)
  }
}

function safeDashboardPath(value: FormDataEntryValue | null): string {
  if (typeof value === 'string' && value.startsWith('/dashboard')) {
    return value
  }

  return DASHBOARD_PATH
}

function redirectWithParams(path: string, params: Record<string, string>): never {
  const searchParams = new URLSearchParams(params)
  redirect(`${path}?${searchParams.toString()}`)
}

function loginRedirect(error: string, next: string): never {
  redirectWithParams('/login', { error, next })
}

function registerSchema() {
  const config = authConfig()

  return z.object({
    name: z.string().trim().min(2).max(200),
    email: z.string().trim().email().max(254).transform(normalizeEmail),
    password: z.string().min(config.passwordMinLength),
    token: z.string().trim().min(1),
  })
}

function loginSchema() {
  return z.object({
    email: z.string().trim().email().max(254).transform(normalizeEmail),
    password: z.string().min(1),
  })
}

function changePasswordSchema() {
  const config = authConfig()

  return z
    .object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(config.passwordMinLength),
      confirmPassword: z.string().min(1),
    })
    .refine((value) => value.newPassword === value.confirmPassword, {
      path: ['confirmPassword'],
    })
}

function twoFactorLoginSchema() {
  return z.object({
    code: z.string().trim().min(6).max(32),
  })
}

function disableTotpSchema() {
  return z.object({
    currentPassword: z.string().min(1),
  })
}

export interface TotpSetupState {
  ok: boolean
  error?: string
  recoveryCodes?: string[]
}

async function logLoginAttempt(input: {
  userId?: string | null
  email: string
  success: boolean
  reason: string
  meta: RequestMeta
  metadata?: Record<string, unknown>
}): Promise<void> {
  await db.insert(loginAttempts).values({
    userId: input.userId ?? null,
    email: input.email,
    ipAddress: input.meta.ipAddress,
    userAgent: input.meta.userAgent,
    success: input.success,
    reason: input.reason,
    metadata: input.metadata ?? {},
  })

  if (!input.success) {
    await autoBlockIpIfNeeded(input.meta).catch(() => null)
  }
}

async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
    .limit(1)

  return user ?? null
}

async function recentFailureCount(email: string, ipAddress: string | null): Promise<number> {
  const config = authConfig()
  const windowStart = new Date(Date.now() - config.loginWindowMinutes * 60 * 1000)
  const identityFilter = ipAddress
    ? or(eq(loginAttempts.email, email), eq(loginAttempts.ipAddress, ipAddress))
    : eq(loginAttempts.email, email)

  const rows = await db
    .select({ id: loginAttempts.id })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.success, false),
        gte(loginAttempts.attemptedAt, windowStart),
        identityFilter,
      ),
    )
    .limit(config.loginMaxAttempts)

  return rows.length
}

async function lockUserIfNeeded(user: User | null, failuresAfterAttempt: number): Promise<void> {
  if (!user) return

  const config = authConfig()
  const now = new Date()
  const lockedUntil =
    failuresAfterAttempt >= config.loginMaxAttempts
      ? new Date(now.getTime() + config.loginLockMinutes * 60 * 1000)
      : null

  await db
    .update(users)
    .set({
      failedLoginCount: sql`${users.failedLoginCount} + 1`,
      lockedUntil,
      updatedAt: now,
    })
    .where(eq(users.id, user.id))
}

export async function registerInitialAdmin(formData: FormData): Promise<void> {
  const meta = await requestMeta()
  await redirectIfIpBlocked(meta, '/register?error=invalid')
  await verifyCsrf(formData)

  const parsed = registerSchema().safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    token: formData.get('token'),
  })

  if (!parsed.success) {
    redirect('/register?error=invalid')
  }

  const token = bootstrapToken()
  if (!token || parsed.data.token !== token) {
    redirect('/register?error=invalid')
  }

  const passwordHash = await hashPassword(parsed.data.password)
  let userId: string | null = null

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(93612003)`)

      const [existingUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(isNull(users.deletedAt))
        .limit(1)

      if (existingUser) {
        throw new AuthActionError('registration_closed')
      }

      const now = new Date()
      const [adminRole] = await tx
        .insert(roles)
        .values({
          slug: 'admin',
          name: 'Admin',
          description: 'Acceso total al dashboard propio.',
          system: true,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: roles.slug,
          set: {
            name: 'Admin',
            description: 'Acceso total al dashboard propio.',
            system: true,
            updatedAt: now,
          },
        })
        .returning({ id: roles.id })

      const permissionRows = await tx.select({ id: permissions.id }).from(permissions)

      const [user] = await tx
        .insert(users)
        .values({
          email: parsed.data.email,
          name: parsed.data.name,
          passwordHash,
          status: 'active',
          mustChangePassword: false,
          passwordUpdatedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: users.id })

      await tx.insert(userRoles).values({
        userId: user.id,
        roleId: adminRole.id,
        assignedAt: now,
      })

      for (const permission of permissionRows) {
        await tx
          .insert(rolePermissions)
          .values({
            roleId: adminRole.id,
            permissionId: permission.id,
            assignedAt: now,
            assignedBy: user.id,
          })
          .onConflictDoNothing()
      }

      userId = user.id
    })
  } catch (error) {
    if (error instanceof AuthActionError && error.code === 'registration_closed') {
      redirect('/login?registered=closed')
    }

    console.error('Initial admin registration failed:', error)
    redirect('/register?error=setup')
  }

  if (!userId) redirect('/register?error=setup')

  await recordActivity({
    actorId: userId,
    action: 'user.initial_admin_created',
    entityType: 'user',
    entityId: userId,
  })
  await createSession(userId)
  redirect(DASHBOARD_PATH)
}

export async function login(formData: FormData): Promise<void> {
  const next = safeDashboardPath(formData.get('next'))
  const meta = await requestMeta()
  await redirectIfIpBlocked(meta, `/login?error=locked&next=${encodeURIComponent(next)}`)
  await verifyCsrf(formData)

  const parsed = loginSchema().safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    loginRedirect('invalid', next)
  }

  const config = authConfig()
  const now = new Date()
  const user = await findUserByEmail(parsed.data.email)
  const recentFailures = await recentFailureCount(parsed.data.email, meta.ipAddress)

  if (recentFailures >= config.loginMaxAttempts) {
    if (user) {
      await db
        .update(users)
        .set({
          lockedUntil: new Date(now.getTime() + config.loginLockMinutes * 60 * 1000),
          updatedAt: now,
        })
        .where(eq(users.id, user.id))
    }

    await logLoginAttempt({
      userId: user?.id,
      email: parsed.data.email,
      success: false,
      reason: 'rate_limited',
      meta,
    })
    loginRedirect('locked', next)
  }

  if (user?.lockedUntil && user.lockedUntil > now) {
    await logLoginAttempt({
      userId: user.id,
      email: parsed.data.email,
      success: false,
      reason: 'user_locked',
      meta,
      metadata: { lockedUntil: user.lockedUntil.toISOString() },
    })
    loginRedirect('locked', next)
  }

  const passwordMatches =
    user?.passwordHash && user.status === 'active'
      ? await verifyPassword(user.passwordHash, parsed.data.password)
      : false

  if (!user || !passwordMatches) {
    await lockUserIfNeeded(user, recentFailures + 1)
    await logLoginAttempt({
      userId: user?.id,
      email: parsed.data.email,
      success: false,
      reason: user ? 'invalid_password' : 'unknown_user',
      meta,
    })
    loginRedirect('invalid', next)
  }

  const userPermissions = await getUserPermissions(user.id)
  if (!userPermissions.includes('dashboard.access')) {
    await logLoginAttempt({
      userId: user.id,
      email: parsed.data.email,
      success: false,
      reason: 'missing_dashboard_permission',
      meta,
    })
    loginRedirect('forbidden', next)
  }

  await db
    .update(users)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, user.id))

  if (user.twoFactorEnabled) {
    await createTwoFactorChallenge(user.id)
    await logLoginAttempt({
      userId: user.id,
      email: parsed.data.email,
      success: true,
      reason: 'password_success_totp_required',
      meta,
    })
    redirectWithParams('/login/2fa', { next })
  }

  await logLoginAttempt({
    userId: user.id,
    email: parsed.data.email,
    success: true,
    reason: 'success',
    meta,
  })
  await createSession(user.id, { mustChangePassword: user.mustChangePassword })
  redirect(next)
}

export async function verifyTwoFactorLogin(formData: FormData): Promise<void> {
  const next = safeDashboardPath(formData.get('next'))
  const meta = await requestMeta()
  await redirectIfIpBlocked(meta, `/login?error=locked&next=${encodeURIComponent(next)}`)
  await verifyCsrf(formData)

  const parsed = twoFactorLoginSchema().safeParse({
    code: formData.get('code'),
  })

  if (!parsed.success) {
    redirectWithParams('/login/2fa', { error: 'invalid', next })
  }

  const challenge = await getTwoFactorChallenge()
  if (!challenge) {
    redirectWithParams('/login', { error: 'invalid', next })
  }

  const user = challenge.user

  if (!user.twoFactorSecretEncrypted || !user.twoFactorEnabled) {
    await consumeTwoFactorChallenge(challenge.challengeId)
    redirectWithParams('/login', { error: 'invalid', next })
  }

  const secret = decryptTotpSecret(user.twoFactorSecretEncrypted)
  const recoveryHash = hashRecoveryCode(parsed.data.code)
  const recoveryCodes = user.twoFactorRecoveryCodes ?? []
  const recoveryCodeIndex = recoveryCodes.indexOf(recoveryHash)
  const usedRecoveryCode = recoveryCodeIndex >= 0
  const validTotp = verifyTotpCode(secret, parsed.data.code)

  if (!validTotp && !usedRecoveryCode) {
    await logLoginAttempt({
      userId: user.id,
      email: user.email,
      success: false,
      reason: 'invalid_totp',
      meta,
    })
    await recordActivity({
      actorId: user.id,
      action: 'auth.totp_failed',
      entityType: 'user',
      entityId: user.id,
    })
    redirectWithParams('/login/2fa', { error: 'invalid', next })
  }

  const userPermissions = await getUserPermissions(user.id)
  if (!userPermissions.includes('dashboard.access')) {
    await consumeTwoFactorChallenge(challenge.challengeId)
    redirectWithParams('/login', { error: 'forbidden', next })
  }

  if (usedRecoveryCode) {
    recoveryCodes.splice(recoveryCodeIndex, 1)
    await db
      .update(users)
      .set({ twoFactorRecoveryCodes: recoveryCodes, updatedAt: new Date() })
      .where(eq(users.id, user.id))
  }

  await consumeTwoFactorChallenge(challenge.challengeId)
  await logLoginAttempt({
    userId: user.id,
    email: user.email,
    success: true,
    reason: usedRecoveryCode ? 'recovery_code_success' : 'totp_success',
    meta,
  })
  await recordActivity({
    actorId: user.id,
    action: usedRecoveryCode ? 'auth.recovery_code_used' : 'auth.totp_success',
    entityType: 'user',
    entityId: user.id,
  })
  await createSession(user.id, { mustChangePassword: user.mustChangePassword })
  redirect(next)
}

export async function logout(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  await revokeCurrentSession()
  redirect('/login?logged_out=1')
}

export async function changePassword(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await getCurrentSession()
  if (!current) redirect('/login')

  const parsed = changePasswordSchema().safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success || parsed.data.currentPassword === parsed.data.newPassword) {
    redirect('/dashboard/account?error=invalid')
  }

  if (!current.user.passwordHash) {
    redirect('/dashboard/account?error=invalid')
  }

  const currentPasswordMatches = await verifyPassword(
    current.user.passwordHash,
    parsed.data.currentPassword,
  )

  if (!currentPasswordMatches) {
    redirect('/dashboard/account?error=invalid')
  }

  const passwordHash = await hashPassword(parsed.data.newPassword)
  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        passwordHash,
        passwordUpdatedAt: now,
        mustChangePassword: false,
        failedLoginCount: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(eq(users.id, current.user.id))

    await tx
      .update(sessions)
      .set({
        revokedAt: now,
        revokedBy: current.user.id,
        revocationReason: 'password_changed',
        updatedAt: now,
      })
      .where(and(eq(sessions.userId, current.user.id), isNull(sessions.revokedAt)))
  })

  await recordActivity({
    actorId: current.user.id,
    action: 'user.password_changed',
    entityType: 'user',
    entityId: current.user.id,
  })
  await createSession(current.user.id)
  redirect('/dashboard/account?status=password-updated')
}

export async function startTotpSetup(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await getCurrentSession()
  if (!current) redirect('/login')

  try {
    const secret = createTotpSecret()
    await db
      .update(users)
      .set({
        twoFactorSecretEncrypted: encryptTotpSecret(secret),
        twoFactorEnabled: false,
        twoFactorConfirmedAt: null,
        twoFactorRecoveryCodes: [],
        updatedAt: new Date(),
      })
      .where(eq(users.id, current.user.id))

    await recordActivity({
      actorId: current.user.id,
      action: 'auth.totp_setup_started',
      entityType: 'user',
      entityId: current.user.id,
    })
  } catch (error) {
    console.error('TOTP setup failed:', error)
    redirect('/dashboard/account?error=totp-config')
  }

  redirect('/dashboard/account?setup=totp')
}

export async function confirmTotpSetup(
  _previousState: TotpSetupState,
  formData: FormData,
): Promise<TotpSetupState> {
  await verifyCsrf(formData)
  const current = await getCurrentSession()
  if (!current) return { ok: false, error: 'session' }

  const code = formData.get('code')
  if (typeof code !== 'string' || code.trim().length < 6) {
    return { ok: false, error: 'invalid' }
  }

  if (!current.user.twoFactorSecretEncrypted) {
    return { ok: false, error: 'setup' }
  }

  try {
    const secret = decryptTotpSecret(current.user.twoFactorSecretEncrypted)
    if (!verifyTotpCode(secret, code)) {
      return { ok: false, error: 'invalid' }
    }

    const recoveryCodes = generateRecoveryCodes()
    await db
      .update(users)
      .set({
        twoFactorEnabled: true,
        twoFactorConfirmedAt: new Date(),
        twoFactorRecoveryCodes: hashRecoveryCodes(recoveryCodes),
        updatedAt: new Date(),
      })
      .where(eq(users.id, current.user.id))

    await recordActivity({
      actorId: current.user.id,
      action: 'auth.totp_enabled',
      entityType: 'user',
      entityId: current.user.id,
    })
    await clearMustSetupTwoFactorCookie()

    return { ok: true, recoveryCodes }
  } catch (error) {
    console.error('TOTP confirmation failed:', error)
    return { ok: false, error: 'setup' }
  }
}

export async function disableOwnTotp(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await getCurrentSession()
  if (!current) redirect('/login')

  const parsed = disableTotpSchema().safeParse({
    currentPassword: formData.get('currentPassword'),
  })

  if (!parsed.success || !current.user.passwordHash) {
    redirect('/dashboard/account?error=invalid')
  }

  const matches = await verifyPassword(current.user.passwordHash, parsed.data.currentPassword)
  if (!matches) redirect('/dashboard/account?error=invalid')

  await db
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecretEncrypted: null,
      twoFactorConfirmedAt: null,
      twoFactorRecoveryCodes: [],
      updatedAt: new Date(),
    })
    .where(eq(users.id, current.user.id))

  await recordActivity({
    actorId: current.user.id,
    action: 'auth.totp_disabled',
    entityType: 'user',
    entityId: current.user.id,
  })
  redirect('/dashboard/account?status=totp-disabled')
}
