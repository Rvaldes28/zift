import { readConsent } from './consent'
import { readUtm } from './utm'

export type TrackParams = Record<string, boolean | null | number | string | undefined>
export type PerformanceEventName =
  'api_timing' | 'client_error' | 'form_error' | 'resource_timing' | 'web_vital'

export interface PerformanceParams {
  durationMs?: number
  initiatorType?: string
  message?: string
  metadata?: Record<string, unknown>
  method?: string
  name?: string
  source?: string
  status?: number
  transferSize?: number
  url?: string
  value?: number
}

const VISITOR_KEY = 'ziftlab-analytics-visitor'
const SESSION_KEY = 'ziftlab-analytics-session'
const LANDING_KEY = 'ziftlab-analytics-landing'
const REFERRER_KEY = 'ziftlab-analytics-referrer'

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    /** Función/stub de Microsoft Clarity (la inyecta Analytics.astro) */
    clarity?: { (...args: unknown[]): void; q?: unknown[] }
  }
}

function analyticsEnabled(): boolean {
  return import.meta.env.PUBLIC_ANALYTICS_ENABLED !== 'false'
}

function canTrack(): boolean {
  return typeof window !== 'undefined' && analyticsEnabled() && readConsent()?.analytics === true
}

function randomId(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function getOrCreateStorageValue(storage: Storage, key: string, value = randomId()): string {
  try {
    const existing = storage.getItem(key)
    if (existing) return existing
    storage.setItem(key, value)
    return value
  } catch {
    return value
  }
}

function sessionId(): string {
  const id = getOrCreateStorageValue(sessionStorage, SESSION_KEY)
  getOrCreateStorageValue(sessionStorage, LANDING_KEY, `${location.pathname}${location.search}`)
  getOrCreateStorageValue(sessionStorage, REFERRER_KEY, document.referrer)
  return id
}

function visitorId(): string {
  return getOrCreateStorageValue(localStorage, VISITOR_KEY)
}

function deviceType(): string {
  const ua = navigator.userAgent.toLowerCase()
  if (/ipad|tablet/.test(ua)) return 'tablet'
  if (/mobi|iphone|android/.test(ua)) return 'mobile'
  return 'desktop'
}

function apiUrl(): string {
  const base = import.meta.env.PUBLIC_API_URL || location.origin
  return `${base.replace(/\/+$/, '')}/api/analytics/events`
}

function performanceApiUrl(): string {
  const base = import.meta.env.PUBLIC_API_URL || location.origin
  return `${base.replace(/\/+$/, '')}/api/performance/rum`
}

function gtagEvent(event: string, params: TrackParams): void {
  window.dataLayer ??= []
  function gtag(..._args: unknown[]) {
    window.dataLayer!.push(arguments as unknown as Record<string, unknown>)
  }
  gtag('event', event, params)
}

function sendOwnEvent(event: string, params: TrackParams): void {
  const session = sessionId()
  const visitor = visitorId()
  const durationMs =
    typeof params.duration_ms === 'number'
      ? params.duration_ms
      : typeof params.durationMs === 'number'
        ? params.durationMs
        : undefined
  const payload = {
    durationMs,
    eventName: event,
    metadata: params,
    occurredAt: new Date().toISOString(),
    path: `${location.pathname}${location.search}`,
    referrer: document.referrer || undefined,
    sessionId: session,
    source: typeof params.source === 'string' ? params.source : undefined,
    title: document.title,
    utm: readUtm() ?? undefined,
    visitorId: visitor,
  }
  const body = JSON.stringify(payload)

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    if (navigator.sendBeacon(apiUrl(), blob)) return
  }

  fetch(apiUrl(), {
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    method: 'POST',
  }).catch(() => null)
}

export function track(event: string, params: TrackParams = {}): void {
  if (!canTrack()) return

  gtagEvent(event, params)
  sendOwnEvent(event, params)
}

export function reportPerformance(
  eventName: PerformanceEventName,
  params: PerformanceParams,
): void {
  if (!canTrack()) return

  const body = JSON.stringify({
    ...params,
    eventName,
    occurredAt: new Date().toISOString(),
    path: `${location.pathname}${location.search}`,
    referrer: document.referrer || undefined,
    sessionId: sessionId(),
    title: document.title,
    utm: readUtm() ?? undefined,
    visitorId: visitorId(),
  })

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' })
    if (navigator.sendBeacon(performanceApiUrl(), blob)) return
  }

  fetch(performanceApiUrl(), {
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    method: 'POST',
  }).catch(() => null)
}

export function analyticsAttribution():
  | {
      analyticsSessionId: string
      deviceType: string
      landingPath: string
      referrer?: string
    }
  | undefined {
  if (!canTrack()) return undefined

  const session = sessionId()
  let landingPath = `${location.pathname}${location.search}`
  let referrer = document.referrer || undefined
  try {
    landingPath = sessionStorage.getItem(LANDING_KEY) || landingPath
    referrer = sessionStorage.getItem(REFERRER_KEY) || referrer
  } catch {
    // Storage bloqueado: enviamos solo los valores de la página actual.
  }

  return {
    analyticsSessionId: session,
    deviceType: deviceType(),
    landingPath,
    referrer,
  }
}
