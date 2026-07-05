import 'server-only'

interface AuthConfig {
  sessionDays: number
  loginMaxAttempts: number
  loginWindowMinutes: number
  loginLockMinutes: number
  passwordMinLength: number
  argon2Memory: number
  argon2Time: number
  argon2Parallelism: number
  totpIssuer: string
  twoFactorChallengeMinutes: number
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback

  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

export function authConfig(): AuthConfig {
  return {
    sessionDays: numberEnv('ADMIN_SESSION_DAYS', 14),
    loginMaxAttempts: numberEnv('ADMIN_LOGIN_MAX_ATTEMPTS', 5),
    loginWindowMinutes: numberEnv('ADMIN_LOGIN_WINDOW_MINUTES', 15),
    loginLockMinutes: numberEnv('ADMIN_LOGIN_LOCK_MINUTES', 15),
    passwordMinLength: numberEnv('ADMIN_PASSWORD_MIN_LENGTH', 12),
    argon2Memory: numberEnv('ADMIN_ARGON2_MEMORY', 65536),
    argon2Time: numberEnv('ADMIN_ARGON2_TIME', 3),
    argon2Parallelism: numberEnv('ADMIN_ARGON2_PARALLELISM', 1),
    totpIssuer: process.env.ADMIN_TOTP_ISSUER?.trim() || 'ZiftLab',
    twoFactorChallengeMinutes: numberEnv('ADMIN_2FA_CHALLENGE_MINUTES', 5),
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
