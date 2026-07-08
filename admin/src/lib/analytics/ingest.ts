import 'server-only'

import { analyticsEvents, db } from '@ziftlab/db'
import { z } from 'zod'

import { analyticsEventNameSchema, normalizeTrafficSource } from './constants'
import { clientIp, hashAnalyticsId, locationFromHeaders } from './privacy'
import { parseUserAgent } from './user-agent'

const WINDOW_MS = 60 * 1000
const MAX_EVENTS = 120
const attempts = new Map<string, { count: number; resetAt: number }>()

const jsonRecordSchema = z.record(z.string(), z.unknown()).default({})

export const analyticsEventSchema = z.object({
  durationMs: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60 * 1000)
    .optional(),
  duration_ms: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60 * 1000)
    .optional(),
  eventName: analyticsEventNameSchema,
  metadata: jsonRecordSchema.optional(),
  occurredAt: z.string().datetime().optional(),
  path: z.string().trim().max(500).optional(),
  referrer: z.string().trim().max(1000).optional(),
  sessionId: z.string().trim().max(200).optional(),
  source: z.string().trim().max(120).optional(),
  title: z.string().trim().max(300).optional(),
  utm: jsonRecordSchema.optional(),
  visitorId: z.string().trim().max(200).optional(),
})

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const current = attempts.get(key)

  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > MAX_EVENTS
}

function normalizedPath(value: string | undefined): string | null {
  if (!value) return null

  try {
    const url =
      value.startsWith('http://') || value.startsWith('https://')
        ? new URL(value)
        : new URL(value, 'https://zift.local')
    return `${url.pathname}${url.search}`.slice(0, 500)
  } catch {
    return value.startsWith('/') ? value.slice(0, 500) : null
  }
}

export async function recordAnalyticsEvent(request: Request, input: AnalyticsEventInput) {
  const key = clientIp(request)
  if (isRateLimited(key)) return { limited: true }

  const userAgent = request.headers.get('user-agent')
  const parsedUserAgent = parseUserAgent(userAgent)
  const location = locationFromHeaders(request.headers)
  const durationMs = input.durationMs ?? input.duration_ms ?? null
  const utm = input.utm ?? {}
  const source = normalizeTrafficSource({
    referrer: input.referrer,
    source: input.source,
    utm,
  })
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()

  await db.insert(analyticsEvents).values({
    browser: parsedUserAgent.browser,
    city: location.city,
    country: location.country,
    deviceType: parsedUserAgent.deviceType,
    durationMs,
    eventName: input.eventName,
    occurredAt: Number.isNaN(occurredAt.valueOf()) ? new Date() : occurredAt,
    os: parsedUserAgent.os,
    path: normalizedPath(input.path),
    payload: input.metadata ?? {},
    referrer: input.referrer || null,
    sessionIdHash: hashAnalyticsId(input.sessionId),
    source,
    title: input.title || null,
    utm,
    visitorIdHash: hashAnalyticsId(input.visitorId),
  })

  return { limited: false }
}
