import 'server-only'

import { analyticsEvents, db } from '@ziftlab/db'
import { z } from 'zod'

import { normalizeTrafficSource } from '@/lib/analytics/constants'
import { clientIp, hashAnalyticsId, locationFromHeaders } from '@/lib/analytics/privacy'
import { parseUserAgent } from '@/lib/analytics/user-agent'

import { PERFORMANCE_RUM_EVENTS, PERFORMANCE_THRESHOLDS } from './constants'
import { upsertPerformanceAlert } from './alerts'

const WINDOW_MS = 60 * 1000
const MAX_EVENTS = 180
const attempts = new Map<string, { count: number; resetAt: number }>()

const jsonRecordSchema = z.record(z.string(), z.unknown()).default({})

export const performanceRumSchema = z.object({
  durationMs: z.number().min(0).max(24 * 60 * 60 * 1000).optional(),
  eventName: z.enum(PERFORMANCE_RUM_EVENTS),
  initiatorType: z.string().trim().max(80).optional(),
  message: z.string().trim().max(1200).optional(),
  metadata: jsonRecordSchema.optional(),
  method: z.string().trim().max(12).optional(),
  name: z.string().trim().max(120).optional(),
  occurredAt: z.string().datetime().optional(),
  path: z.string().trim().max(500).optional(),
  referrer: z.string().trim().max(1000).optional(),
  sessionId: z.string().trim().max(200).optional(),
  source: z.string().trim().max(120).optional(),
  status: z.number().int().min(0).max(599).optional(),
  title: z.string().trim().max(300).optional(),
  transferSize: z.number().min(0).max(250 * 1024 * 1024).optional(),
  url: z.string().trim().max(1200).optional(),
  utm: jsonRecordSchema.optional(),
  value: z.number().min(0).max(250 * 1024 * 1024).optional(),
  visitorId: z.string().trim().max(200).optional(),
})

export type PerformanceRumInput = z.infer<typeof performanceRumSchema>

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
    const url = value.startsWith('http://') || value.startsWith('https://')
      ? new URL(value)
      : new URL(value, 'https://zift.local')
    return `${url.pathname}${url.search}`.slice(0, 500)
  } catch {
    return value.startsWith('/') ? value.slice(0, 500) : null
  }
}

function cleanRecord(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined))
}

function durationFromInput(input: PerformanceRumInput): number | null {
  if (typeof input.durationMs === 'number') return Math.round(input.durationMs)
  if (input.eventName === 'web_vital' && input.name !== 'CLS' && typeof input.value === 'number') {
    return Math.round(input.value)
  }
  if (input.eventName === 'api_timing' && typeof input.value === 'number') return Math.round(input.value)
  return null
}

async function evaluateRumAlert(input: PerformanceRumInput, path: string | null) {
  const url = input.url || path
  const metric = input.name || input.eventName
  const value = input.value ?? input.durationMs ?? input.transferSize ?? null

  if (input.eventName === 'web_vital' && input.name === 'LCP' && typeof value === 'number') {
    if (value > PERFORMANCE_THRESHOLDS.lcpMs) {
      await upsertPerformanceAlert({
        message: `LCP observado de ${Math.round(value)} ms en ${path ?? 'ruta desconocida'}.`,
        metadata: { name: input.name, path, source: 'rum' },
        metric: 'LCP',
        severity: 'warning',
        source: 'rum',
        threshold: PERFORMANCE_THRESHOLDS.lcpMs,
        title: 'LCP alto detectado',
        url,
        value,
      })
    }
  }

  if (input.eventName === 'web_vital' && input.name === 'INP' && typeof value === 'number') {
    if (value > PERFORMANCE_THRESHOLDS.inpMs) {
      await upsertPerformanceAlert({
        message: `INP observado de ${Math.round(value)} ms en ${path ?? 'ruta desconocida'}.`,
        metadata: { name: input.name, path, source: 'rum' },
        metric: 'INP',
        severity: 'warning',
        source: 'rum',
        threshold: PERFORMANCE_THRESHOLDS.inpMs,
        title: 'INP alto detectado',
        url,
        value,
      })
    }
  }

  if (input.eventName === 'web_vital' && input.name === 'CLS' && typeof value === 'number') {
    if (value > PERFORMANCE_THRESHOLDS.cls) {
      await upsertPerformanceAlert({
        message: `CLS observado de ${value.toFixed(3)} en ${path ?? 'ruta desconocida'}.`,
        metadata: { name: input.name, path, rawValue: value, source: 'rum' },
        metric: 'CLS',
        severity: 'warning',
        source: 'rum',
        threshold: PERFORMANCE_THRESHOLDS.cls * 1000,
        title: 'CLS alto detectado',
        url,
        value: value * 1000,
      })
    }
  }

  if (input.eventName === 'resource_timing') {
    const transferSize = input.transferSize ?? input.value
    if (typeof transferSize === 'number' && transferSize > PERFORMANCE_THRESHOLDS.heavyResourceBytes) {
      await upsertPerformanceAlert({
        message: `Recurso pesado de ${Math.round(transferSize / 1024)} KB detectado.`,
        metadata: {
          initiatorType: input.initiatorType,
          path,
          resourceUrl: input.url,
          source: 'rum',
        },
        metric: 'transferSize',
        severity: 'warning',
        source: 'rum',
        threshold: PERFORMANCE_THRESHOLDS.heavyResourceBytes,
        title: 'Imagen o recurso pesado',
        url,
        value: transferSize,
      })
    }
  }

  if (input.eventName === 'api_timing') {
    const durationMs = input.durationMs ?? input.value
    const isServerError = typeof input.status === 'number' && input.status >= 500
    const isSlow = typeof durationMs === 'number' && durationMs > PERFORMANCE_THRESHOLDS.apiResponseMs
    if (isServerError || isSlow) {
      await upsertPerformanceAlert({
        message: isServerError
          ? `API respondio ${input.status} en ${url ?? 'endpoint desconocido'}.`
          : `API lenta: ${Math.round(durationMs ?? 0)} ms en ${url ?? 'endpoint desconocido'}.`,
        metadata: { method: input.method, path, source: 'rum', status: input.status },
        metric: isServerError ? 'http_status' : 'api_response_time',
        severity: isServerError ? 'critical' : 'warning',
        source: 'rum',
        threshold: isServerError ? 500 : PERFORMANCE_THRESHOLDS.apiResponseMs,
        title: isServerError ? 'Error 500 detectado' : 'API lenta detectada',
        url,
        value: isServerError ? input.status : durationMs,
      })
    }
  }

  if (input.eventName === 'form_error') {
    await upsertPerformanceAlert({
      message: input.message || `Formulario fallando en ${path ?? 'ruta desconocida'}.`,
      metadata: { form: input.name, path, source: 'rum', status: input.status },
      metric: 'form_error',
      severity: typeof input.status === 'number' && input.status >= 500 ? 'critical' : 'warning',
      source: 'rum',
      threshold: 1,
      title: 'Formulario fallando',
      url,
      value: input.status ?? 1,
    })
  }

  if (input.eventName === 'client_error') {
    await upsertPerformanceAlert({
      message: input.message || `Error de carga detectado en ${path ?? 'ruta desconocida'}.`,
      metadata: { metric, path, source: 'rum', status: input.status },
      metric,
      severity: 'warning',
      source: 'rum',
      title: 'Error cliente detectado',
      url,
      value: input.status ?? null,
    })
  }
}

export async function recordPerformanceRum(request: Request, input: PerformanceRumInput) {
  const key = clientIp(request)
  if (isRateLimited(key)) return { limited: true }

  const userAgent = request.headers.get('user-agent')
  const parsedUserAgent = parseUserAgent(userAgent)
  const location = locationFromHeaders(request.headers)
  const utm = input.utm ?? {}
  const source = normalizeTrafficSource({
    referrer: input.referrer,
    source: input.source,
    utm,
  })
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()
  const path = normalizedPath(input.path)
  const payload = cleanRecord({
    ...(input.metadata ?? {}),
    initiatorType: input.initiatorType,
    message: input.message,
    method: input.method,
    name: input.name,
    resourceUrl: input.url,
    status: input.status,
    transferSize: input.transferSize,
    value: input.value,
  })

  await db.insert(analyticsEvents).values({
    browser: parsedUserAgent.browser,
    city: location.city,
    country: location.country,
    deviceType: parsedUserAgent.deviceType,
    durationMs: durationFromInput(input),
    eventName: input.eventName,
    occurredAt: Number.isNaN(occurredAt.valueOf()) ? new Date() : occurredAt,
    os: parsedUserAgent.os,
    path,
    payload,
    referrer: input.referrer || null,
    sessionIdHash: hashAnalyticsId(input.sessionId),
    source,
    title: input.title || null,
    utm,
    visitorIdHash: hashAnalyticsId(input.visitorId),
  })

  await evaluateRumAlert(input, path)

  return { limited: false }
}
