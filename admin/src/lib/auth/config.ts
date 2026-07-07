import 'server-only'

interface AuthConfig {
  sessionDays: number
  sessionIdleMinutes: number
  loginMaxAttempts: number
  loginWindowMinutes: number
  loginLockMinutes: number
  ipMaxFailedAttempts: number
  ipWindowMinutes: number
  ipBlockMinutes: number
  passwordMinLength: number
  argon2Memory: number
  argon2Time: number
  argon2Parallelism: number
  totpIssuer: string
  twoFactorChallengeMinutes: number
  enforceTwoFactorForSensitive: boolean
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback

  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase()
  if (!raw) return fallback
  return raw === 'true' || raw === '1' || raw === 'yes'
}

export function authConfig(): AuthConfig {
  return {
    sessionDays: numberEnv('ADMIN_SESSION_DAYS', 14),
    sessionIdleMinutes: numberEnv('ADMIN_SESSION_IDLE_MINUTES', 120),
    loginMaxAttempts: numberEnv('ADMIN_LOGIN_MAX_ATTEMPTS', 5),
    loginWindowMinutes: numberEnv('ADMIN_LOGIN_WINDOW_MINUTES', 15),
    loginLockMinutes: numberEnv('ADMIN_LOGIN_LOCK_MINUTES', 15),
    ipMaxFailedAttempts: numberEnv('ADMIN_IP_MAX_FAILED_ATTEMPTS', 10),
    ipWindowMinutes: numberEnv('ADMIN_IP_WINDOW_MINUTES', 15),
    ipBlockMinutes: numberEnv('ADMIN_IP_BLOCK_MINUTES', 60),
    passwordMinLength: numberEnv('ADMIN_PASSWORD_MIN_LENGTH', 12),
    argon2Memory: numberEnv('ADMIN_ARGON2_MEMORY', 65536),
    argon2Time: numberEnv('ADMIN_ARGON2_TIME', 3),
    argon2Parallelism: numberEnv('ADMIN_ARGON2_PARALLELISM', 1),
    totpIssuer: process.env.ADMIN_TOTP_ISSUER?.trim() || 'ZiftLab',
    twoFactorChallengeMinutes: numberEnv('ADMIN_2FA_CHALLENGE_MINUTES', 5),
    enforceTwoFactorForSensitive: booleanEnv('ADMIN_ENFORCE_2FA_FOR_SENSITIVE', true),
  }
}

export function totpEncryptionSecret(): string | null {
  const secret = process.env.ADMIN_TOTP_ENCRYPTION_KEY?.trim()
  return secret ? secret : null
}

export function bootstrapToken(): string | null {
  const token = process.env.ADMIN_BOOTSTRAP_TOKEN?.trim()
  return token ? token : null
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}
