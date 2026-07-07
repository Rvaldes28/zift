import 'server-only'

import crypto from 'node:crypto'

function analyticsSalt(): string {
  return (
    process.env.ANALYTICS_EVENT_SALT ||
    process.env.ADMIN_BOOTSTRAP_TOKEN ||
    'ziftlab-local-analytics-salt'
  )
}

export function hashAnalyticsId(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  if (!normalized) return null

  return crypto.createHmac('sha256', analyticsSalt()).update(normalized).digest('hex')
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function locationFromHeaders(headers: Headers) {
  const country =
    headers.get('x-vercel-ip-country') ||
    headers.get('cf-ipcountry') ||
    headers.get('x-country') ||
    null
  const city =
    headers.get('x-vercel-ip-city') ||
    headers.get('cf-ipcity') ||
    headers.get('x-city') ||
    null

  return {
    city: city ? decodeURIComponent(city).slice(0, 160) : null,
    country: country ? country.slice(0, 120) : null,
  }
}
