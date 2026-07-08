import 'server-only'

import { analyticsEvents, db, performanceAlerts, performanceChecks } from '@ziftlab/db'
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm'

import {
  PERFORMANCE_RANGES,
  PERFORMANCE_RUM_EVENTS,
  PERFORMANCE_THRESHOLDS,
  normalizePerformanceRange,
  performanceRangeLabel,
  type PerformanceRangePreset,
} from './constants'

export interface PerformanceFilters {
  checks?: string
  range?: string
}

export interface PerformanceMetricRow {
  count?: number
  helper?: string
  label: string
  status?: 'critical' | 'ok' | 'warning'
  url?: string | null
  value: string
}

export interface PerformanceCheckRow {
  cacheStatus: string
  cdnStatus: string
  checkedAt: string
  httpStatus: string
  kind: string
  method: string
  responseTime: string
  status: string
  url: string
}

export interface PerformanceAlertRow {
  lastSeenAt: string
  message: string
  metric: string
  severity: string
  title: string
  url: string
  value: string
}

export interface PerformanceDashboard {
  alerts: PerformanceAlertRow[]
  apiResponseP75Ms: number
  checkRows: PerformanceCheckRow[]
  clsP75: number
  errorRows: PerformanceMetricRow[]
  healthLabel: string
  healthScore: number
  heavyResourceRows: PerformanceMetricRow[]
  inpP75Ms: number
  lcpP75Ms: number
  openAlerts: number
  range: { dateFrom: Date; dateTo: Date; label: string; preset: PerformanceRangePreset }
  recentErrors: number
  slowPageRows: PerformanceMetricRow[]
  slowRoutes: number
  syntheticFailures: number
  webVitalSamples: number
}

function dateRange(preset: PerformanceRangePreset) {
  const dateTo = new Date()
  const hours = preset === '24h' ? 24 : preset === '7d' ? 24 * 7 : 24 * 30
  const dateFrom = new Date(dateTo.getTime() - hours * 60 * 60 * 1000)

  return {
    dateFrom,
    dateTo,
    label: performanceRangeLabel(preset),
    preset,
  }
}

export function parsePerformanceFilters(input: PerformanceFilters | undefined) {
  return dateRange(normalizePerformanceRange(input?.range))
}

function payloadRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function payloadString(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function payloadNumber(payload: Record<string, unknown>, key: string): number | null {
  const value = payload[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && Number.isFinite(Number(value))) return Number(value)
  return null
}

function p75(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.ceil(sorted.length * 0.75) - 1)
  return sorted[index] ?? 0
}

function formatMs(value: number): string {
  if (!value) return 'Sin datos'
  return `${Math.round(value)} ms`
}

function formatBytes(value: number): string {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`
  return `${Math.round(value / 1024)} KB`
}

function formatDate(value: Date): string {
  return value.toLocaleString('es-PA', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  })
}

function statusFromMetric(metric: string, value: number): 'critical' | 'ok' | 'warning' {
  if (metric === 'LCP') return value > PERFORMANCE_THRESHOLDS.lcpMs ? 'warning' : 'ok'
  if (metric === 'INP') return value > PERFORMANCE_THRESHOLDS.inpMs ? 'warning' : 'ok'
  if (metric === 'CLS') return value > PERFORMANCE_THRESHOLDS.cls ? 'warning' : 'ok'
  if (metric === 'transferSize') {
    return value > PERFORMANCE_THRESHOLDS.heavyResourceBytes ? 'warning' : 'ok'
  }
  return 'ok'
}

function healthLabel(score: number): string {
  if (score >= 90) return 'Saludable'
  if (score >= 70) return 'Atencion'
  return 'Critico'
}

export async function getPerformanceDashboard(
  input: PerformanceFilters | undefined,
): Promise<PerformanceDashboard> {
  const range = parsePerformanceFilters(input)
  const [events, checks, alerts] = await Promise.all([
    db
      .select()
      .from(analyticsEvents)
      .where(
        and(
          gte(analyticsEvents.occurredAt, range.dateFrom),
          lte(analyticsEvents.occurredAt, range.dateTo),
          inArray(analyticsEvents.eventName, [...PERFORMANCE_RUM_EVENTS]),
        ),
      )
      .orderBy(analyticsEvents.occurredAt),
    db
      .select()
      .from(performanceChecks)
      .where(
        and(
          gte(performanceChecks.checkedAt, range.dateFrom),
          lte(performanceChecks.checkedAt, range.dateTo),
        ),
      )
      .orderBy(desc(performanceChecks.checkedAt))
      .limit(80),
    db
      .select()
      .from(performanceAlerts)
      .where(eq(performanceAlerts.status, 'open'))
      .orderBy(desc(performanceAlerts.lastSeenAt))
      .limit(50),
  ])

  const lcpValues: number[] = []
  const inpValues: number[] = []
  const clsValues: number[] = []
  const apiValues: number[] = []
  const lcpByPath = new Map<string, number[]>()
  const heavyResources: PerformanceMetricRow[] = []
  const errorRows: PerformanceMetricRow[] = []

  for (const event of events) {
    const payload = payloadRecord(event.payload)
    const metricName = payloadString(payload, 'name')
    const value = payloadNumber(payload, 'value') ?? event.durationMs ?? 0
    const path = event.path || 'Ruta desconocida'

    if (event.eventName === 'web_vital' && metricName === 'LCP' && value > 0) {
      lcpValues.push(value)
      const values = lcpByPath.get(path) ?? []
      values.push(value)
      lcpByPath.set(path, values)
    }
    if (event.eventName === 'web_vital' && metricName === 'INP' && value > 0) inpValues.push(value)
    if (event.eventName === 'web_vital' && metricName === 'CLS' && value > 0) clsValues.push(value)

    if (event.eventName === 'api_timing') {
      const duration = event.durationMs ?? value
      if (duration > 0) apiValues.push(duration)
      const status = payloadNumber(payload, 'status')
      if (status && status >= 400) {
        errorRows.push({
          helper: `${payloadString(payload, 'method') ?? 'API'} ${formatMs(duration)}`,
          label: `HTTP ${status}`,
          status: status >= 500 ? 'critical' : 'warning',
          url: payloadString(payload, 'resourceUrl') ?? event.path,
          value: formatDate(event.occurredAt),
        })
      }
    }

    if (event.eventName === 'resource_timing') {
      const transferSize = payloadNumber(payload, 'transferSize') ?? value
      if (transferSize > PERFORMANCE_THRESHOLDS.heavyResourceBytes) {
        heavyResources.push({
          helper: payloadString(payload, 'initiatorType') ?? 'resource',
          label: payloadString(payload, 'resourceUrl') ?? path,
          status: 'warning',
          url: payloadString(payload, 'resourceUrl'),
          value: formatBytes(transferSize),
        })
      }
    }

    if (event.eventName === 'client_error' || event.eventName === 'form_error') {
      errorRows.push({
        helper: payloadString(payload, 'message') ?? event.eventName,
        label: event.eventName === 'form_error' ? 'Formulario' : 'Cliente',
        status: event.eventName === 'form_error' ? 'critical' : 'warning',
        url: payloadString(payload, 'resourceUrl') ?? event.path,
        value: formatDate(event.occurredAt),
      })
    }
  }

  const lcpP75Ms = p75(lcpValues)
  const inpP75Ms = p75(inpValues)
  const clsP75 = p75(clsValues)
  const apiResponseP75Ms = p75(apiValues)

  const slowPageRows = [...lcpByPath.entries()]
    .map(([path, values]) => {
      const value = p75(values)
      return {
        count: values.length,
        helper: `p75 LCP con ${values.length} muestras`,
        label: path,
        status: statusFromMetric('LCP', value),
        url: path,
        value: formatMs(value),
      } satisfies PerformanceMetricRow
    })
    .sort(
      (a, b) =>
        Number(b.status === 'warning') - Number(a.status === 'warning') || b.count! - a.count!,
    )
    .slice(0, 8)

  const checkRows = checks.slice(0, 20).map((check) => ({
    cacheStatus: check.cacheStatus ?? 'Sin header',
    cdnStatus: check.cdnStatus ?? 'Sin CDN',
    checkedAt: formatDate(check.checkedAt),
    httpStatus: check.httpStatus ? String(check.httpStatus) : 'N/A',
    kind: check.kind,
    method: check.method,
    responseTime: check.responseTimeMs ? formatMs(check.responseTimeMs) : 'Sin respuesta',
    status: check.status,
    url: check.url,
  }))
  const syntheticFailures = checks.filter((check) => check.status === 'failed').length
  const slowSynthetic = checks.filter(
    (check) => (check.responseTimeMs ?? 0) > PERFORMANCE_THRESHOLDS.syntheticResponseMs,
  ).length
  const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical').length
  const warningAlerts = alerts.filter((alert) => alert.severity === 'warning').length
  const slowRoutes = slowPageRows.filter((row) => row.status === 'warning').length + slowSynthetic
  const recentErrors = errorRows.length + syntheticFailures
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      100 - criticalAlerts * 20 - warningAlerts * 8 - syntheticFailures * 10 - slowRoutes * 4,
    ),
  )

  return {
    alerts: alerts.map((alert) => ({
      lastSeenAt: formatDate(alert.lastSeenAt),
      message: alert.message,
      metric: alert.metric ?? 'performance',
      severity: alert.severity,
      title: alert.title,
      url: alert.url ?? 'Sin URL',
      value: alert.value ? String(alert.value) : 'N/A',
    })),
    apiResponseP75Ms,
    checkRows,
    clsP75,
    errorRows: errorRows.slice(0, 12),
    healthLabel: healthLabel(healthScore),
    healthScore,
    heavyResourceRows: heavyResources
      .sort((a, b) => Number.parseFloat(b.value) - Number.parseFloat(a.value))
      .slice(0, 12),
    inpP75Ms,
    lcpP75Ms,
    openAlerts: alerts.length,
    range,
    recentErrors,
    slowPageRows,
    slowRoutes,
    syntheticFailures,
    webVitalSamples: lcpValues.length + inpValues.length + clsValues.length,
  }
}

export { PERFORMANCE_RANGES }
