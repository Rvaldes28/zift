import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

function securityHeaders() {
  const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, '')
  const configuredOrigins = [
    ...originsFromEnv('ADMIN_APP_URL'),
    ...originsFromEnv('PUBLIC_SITE_URL'),
    ...originsFromEnv('PUBLIC_API_URL'),
    ...originsFromEnv('ADMIN_ALLOWED_ORIGINS'),
  ]
  const websocketOrigins = configuredOrigins.map(toWebSocketOrigin)
  const connectSources = [
    "'self'",
    'http://app:*',
    'ws://app:*',
    ...configuredOrigins,
    ...websocketOrigins,
  ]
  const imgSources = ["'self'", 'data:', 'blob:', 'http://app:*', 'https:', ...configuredOrigins]
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(process.env.NODE_ENV === 'development' ? ["'unsafe-eval'"] : []),
  ]

  if (s3PublicBaseUrl) {
    connectSources.push(s3PublicBaseUrl)
    imgSources.push(s3PublicBaseUrl)
  }

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src ${connectSources.join(' ')}`,
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self'",
    `img-src ${imgSources.join(' ')}`,
    "object-src 'none'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    'upgrade-insecure-requests',
  ].join('; ')

  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
    { key: 'Referrer-Policy', value: 'same-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    ...(process.env.NODE_ENV === 'production'
      ? [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ]
      : []),
  ]
}

function originsFromEnv(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin
      } catch {
        return value.replace(/\/+$/, '')
      }
    })
}

function toWebSocketOrigin(origin: string): string {
  if (origin.startsWith('https://')) return origin.replace(/^https:\/\//, 'wss://')
  if (origin.startsWith('http://')) return origin.replace(/^http:\/\//, 'ws://')
  return origin
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        headers: securityHeaders(),
        source: '/:path*',
      },
    ]
  },
  serverExternalPackages: ['@aws-sdk/client-s3', 'argon2', 'pg'],
  turbopack: {
    root: path.resolve(dirname, '..'),
  },
}

export default nextConfig
