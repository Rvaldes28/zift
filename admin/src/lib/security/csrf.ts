import 'server-only'

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { authConfig } from '@/lib/auth/config'
import { getCurrentSession } from '@/lib/auth/session'
import { recordActivity } from '@/lib/rbac/access'

export const CSRF_COOKIE = 'ziftlab-admin-csrf'
export const CSRF_FIELD = 'csrfToken'

function secret(): string {
  return process.env.ADMIN_CSRF_SECRET?.trim() || process.env.ADMIN_BOOTSTRAP_TOKEN?.trim() || 'ziftlab-dev-csrf'
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('hex')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

function allowedOrigins(): Set<string> {
  const configured = process.env.ADMIN_ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean) ?? []
  const appUrl = process.env.ADMIN_APP_URL?.trim()
  return new Set([...configured, ...(appUrl ? [appUrl] : [])].map((origin) => origin.replace(/\/+$/, '')))
}

async function verifyOrigin(): Promise<boolean> {
  const headerStore = await headers()
  const origin = headerStore.get('origin')
  const host = headerStore.get('host')

  if (!origin) return true
  if (host) {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    if (origin === `${protocol}://${host}`) return true
  }

  return allowedOrigins().has(origin.replace(/\/+$/, ''))
}

async function reject(reason: string): Promise<never> {
  const current = await getCurrentSession().catch(() => null)
  await recordActivity({
    actorId: current?.user.id ?? null,
    action: 'security.csrf_rejected',
    entityType: 'security',
    metadata: { reason },
  }).catch(() => null)
  redirect('/login?error=invalid')
}

export async function createCsrfToken(): Promise<string> {
  const cookieStore = await cookies()
  const existing = cookieStore.get(CSRF_COOKIE)?.value
  const nonce = existing?.split('.')[0] || randomBytes(32).toString('hex')
  const token = `${nonce}.${sign(nonce)}`

  try {
    if (existing !== token) {
      cookieStore.set(CSRF_COOKIE, token, cookieOptions())
    }
  } catch {
    // En Server Components algunas versiones de Next no permiten setear cookies.
    // Middleware tambien emite esta cookie; el token firmado sigue validado abajo.
  }

  return token
}

export async function verifyCsrf(formData: FormData): Promise<void> {
  if (!(await verifyOrigin())) {
    await reject('origin')
  }

  const cookieStore = await cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value
  const submittedToken = formData.get(CSRF_FIELD)

  if (typeof submittedToken !== 'string' || !submittedToken) {
    await reject('missing')
  }

  const submitted = submittedToken as string
  const tokenToVerify = cookieToken || submitted
  const [nonce, signature] = tokenToVerify.split('.')
  if (!nonce || !signature || sign(nonce) !== signature) {
    await reject('signature')
  }

  if (cookieToken && !safeEqual(cookieToken, submitted)) {
    await reject('mismatch')
  }
}

export async function securityStatus() {
  const config = authConfig()
  return {
    allowedOrigins: [...allowedOrigins()],
    csrfSecretConfigured: Boolean(process.env.ADMIN_CSRF_SECRET?.trim()),
    enforceTwoFactorForSensitive: config.enforceTwoFactorForSensitive,
  }
}
