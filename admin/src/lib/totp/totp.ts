import 'server-only'

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

import { authConfig, totpEncryptionSecret } from '@/lib/auth/config'

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'

function encryptionKey(): Buffer {
  const secret = totpEncryptionSecret()
  if (!secret) {
    throw new Error('ADMIN_TOTP_ENCRYPTION_KEY is required to use TOTP')
  }

  return createHash('sha256').update(secret).digest()
}

export function encryptTotpSecret(secret: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':')
}

export function decryptTotpSecret(value: string): string {
  const [version, iv, tag, encrypted] = value.split(':')
  if (version !== 'v1' || !iv || !tag || !encrypted) {
    throw new Error('Invalid encrypted TOTP secret')
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    encryptionKey(),
    Buffer.from(iv, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

export function createTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32
}

export function createTotpUri(email: string, secret: string): string {
  const config = authConfig()
  const totp = new OTPAuth.TOTP({
    issuer: config.totpIssuer,
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  return totp.toString()
}

export async function createTotpQrDataUrl(email: string, secret: string): Promise<string> {
  return QRCode.toDataURL(createTotpUri(email, secret), {
    margin: 1,
    width: 220,
  })
}

export function verifyTotpCode(secret: string, token: string): boolean {
  const config = authConfig()
  const totp = new OTPAuth.TOTP({
    issuer: config.totpIssuer,
    label: 'ZiftLab',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  })

  return totp.validate({ token: token.trim(), window: 1 }) !== null
}

export function normalizeRecoveryCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function hashRecoveryCode(value: string): string {
  return createHash('sha256').update(normalizeRecoveryCode(value)).digest('hex')
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(8)
      .toString('base64url')
      .replace(/[^A-Z0-9]/gi, '')
      .toUpperCase()
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`
  })
}

export function hashRecoveryCodes(codes: string[]): string[] {
  return codes.map(hashRecoveryCode)
}
