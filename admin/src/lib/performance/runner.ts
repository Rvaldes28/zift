import 'server-only'

import { db, performanceChecks } from '@ziftlab/db'

import { PERFORMANCE_THRESHOLDS } from './constants'
import { upsertPerformanceAlert } from './alerts'

interface CheckTarget {
  body?: Record<string, unknown>
  headers?: Record<string, string>
  kind: string
  label: string
  method: 'GET' | 'POST'
  url: string
}

export interface RunPerformanceChecksResult {
  failed: number
  total: number
}

function trimOrigin(value: string | undefined, fallback: string): string {
  return (value || fallback).replace(/\/+$/, '')
}

function targets(): CheckTarget[] {
  const site = trimOrigin(process.env.PUBLIC_SITE_URL, 'http://app:4321')
  const admin = trimOrigin(process.env.ADMIN_APP_URL, 'http://app:3000')
  const publicPaths = ['/', '/servicios', '/blog', '/contacto', '/cotizacion']

  return [
    ...publicPaths.map((path) => ({
      kind: 'public_route',
      label: path,
      method: 'GET' as const,
      url: `${site}${path}`,
    })),
    {
      kind: 'api_health',
      label: 'Admin health',
      method: 'GET',
      url: `${admin}/api/health`,
    },
    {
      body: {
        email: 'performance-check@ziftlab.codespace',
        formType: 'contacto',
        message: 'Performance dry-run check',
        name: 'Performance Check',
        source: 'performance-check',
        website: 'performance-check',
      },
      headers: { 'Content-Type': 'application/json', 'X-ZiftLab-Performance-Check': '1' },
      kind: 'form_dry_run',
      label: 'Lead submit dry-run',
      method: 'POST',
      url: `${admin}/api/leads/submit`,
    },
  ]
}

function cacheStatus(headers: Headers): string | null {
  return (
    headers.get('cf-cache-status') ||
    headers.get('x-cache') ||
    headers.get('x-vercel-cache') ||
    headers.get('cache-control')
  )
}

function cdnStatus(headers: Headers): string | null {
  const parts = [
    headers.get('server'),
    headers.get('via'),
    headers.get('cf-ray') ? 'cloudflare' : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : null
}

async function responseSize(response: Response): Promise<number | null> {
  const contentLength = response.headers.get('content-length')
  if (contentLength && Number.isFinite(Number(contentLength))) return Number(contentLength)

  const text = await response.text().catch(() => '')
  return text ? Buffer.byteLength(text) : null
}

async function checkTarget(target: CheckTarget): Promise<boolean> {
  const startedAt = Date.now()
  let httpStatus: number | null = null
  let responseTimeMs: number | null = null
  let status = 'ok'
  let errorMessage: string | null = null
  let metrics: Record<string, unknown> = {}
  let cache: string | null = null
  let cdn: string | null = null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    const response = await fetch(target.url, {
      body: target.body ? JSON.stringify(target.body) : undefined,
      headers: target.headers,
      method: target.method,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    responseTimeMs = Date.now() - startedAt
    httpStatus = response.status
    cache = cacheStatus(response.headers)
    cdn = cdnStatus(response.headers)
    const bytes = await responseSize(response)
    metrics = { bytes, label: target.label }

    if (response.status >= 500) status = 'failed'
    else if (!response.ok || responseTimeMs > PERFORMANCE_THRESHOLDS.syntheticResponseMs) {
      status = 'warning'
    }
  } catch (error) {
    responseTimeMs = Date.now() - startedAt
    status = 'failed'
    errorMessage = error instanceof Error ? error.message : 'Check failed'
    metrics = { label: target.label }
  }

  await db.insert(performanceChecks).values({
    cacheStatus: cache,
    cdnStatus: cdn,
    errorMessage,
    httpStatus,
    kind: target.kind,
    method: target.method,
    metrics,
    responseTimeMs,
    status,
    url: target.url,
  })

  if (httpStatus && httpStatus >= 500) {
    await upsertPerformanceAlert({
      message: `${target.label} respondio con HTTP ${httpStatus}.`,
      metadata: { kind: target.kind, label: target.label },
      metric: 'http_status',
      severity: 'critical',
      source: 'synthetic',
      threshold: 500,
      title: 'Error 500 detectado',
      url: target.url,
      value: httpStatus,
    })
  }

  if (responseTimeMs && responseTimeMs > PERFORMANCE_THRESHOLDS.syntheticResponseMs) {
    await upsertPerformanceAlert({
      message: `${target.label} esta respondiendo en ${responseTimeMs} ms.`,
      metadata: { kind: target.kind, label: target.label },
      metric: 'response_time_ms',
      severity: 'warning',
      source: 'synthetic',
      threshold: PERFORMANCE_THRESHOLDS.syntheticResponseMs,
      title: 'Ruta lenta detectada',
      url: target.url,
      value: responseTimeMs,
    })
  }

  if (target.kind === 'form_dry_run' && status !== 'ok') {
    await upsertPerformanceAlert({
      message: 'El endpoint de formulario no paso el dry-run de performance.',
      metadata: { httpStatus, label: target.label },
      metric: 'form_submit',
      severity: 'critical',
      source: 'synthetic',
      threshold: 1,
      title: 'Formulario de contacto fallando',
      url: target.url,
      value: httpStatus ?? 1,
    })
  }

  return status === 'ok'
}

export async function runPerformanceChecks(): Promise<RunPerformanceChecksResult> {
  const results = await Promise.all(targets().map((target) => checkTarget(target)))
  return {
    failed: results.filter((ok) => !ok).length,
    total: results.length,
  }
}
