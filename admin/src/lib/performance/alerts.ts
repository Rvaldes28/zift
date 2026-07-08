import 'server-only'

import { db, performanceAlerts } from '@ziftlab/db'
import { and, desc, eq } from 'drizzle-orm'

import { createNotification } from '@/lib/notifications/service'

export type PerformanceAlertSeverity = 'critical' | 'info' | 'warning'

export interface PerformanceAlertInput {
  message: string
  metadata?: Record<string, unknown>
  metric?: string | null
  severity: PerformanceAlertSeverity
  source: string
  threshold?: number | null
  title: string
  url?: string | null
  value?: number | null
}

function intOrNull(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : null
}

export async function upsertPerformanceAlert(input: PerformanceAlertInput) {
  const candidates = await db
    .select()
    .from(performanceAlerts)
    .where(
      and(
        eq(performanceAlerts.status, 'open'),
        eq(performanceAlerts.source, input.source),
        eq(performanceAlerts.title, input.title),
      ),
    )
    .orderBy(desc(performanceAlerts.lastSeenAt))
    .limit(20)

  const existing = candidates.find(
    (alert) =>
      (alert.url ?? null) === (input.url ?? null) &&
      (alert.metric ?? null) === (input.metric ?? null),
  )
  const now = new Date()
  const values = {
    lastSeenAt: now,
    message: input.message,
    metadata: input.metadata ?? {},
    metric: input.metric ?? null,
    severity: input.severity,
    threshold: intOrNull(input.threshold),
    updatedAt: now,
    url: input.url ?? null,
    value: intOrNull(input.value),
  }

  if (existing) {
    await db.update(performanceAlerts).set(values).where(eq(performanceAlerts.id, existing.id))
    await notifyPerformanceAlert(existing.id, input).catch(() => null)
    return existing.id
  }

  const [created] = await db
    .insert(performanceAlerts)
    .values({
      ...values,
      source: input.source,
      title: input.title,
    })
    .returning({ id: performanceAlerts.id })

  if (created?.id) {
    await notifyPerformanceAlert(created.id, input).catch(() => null)
  }

  return created?.id ?? null
}

function notificationEventType(input: PerformanceAlertInput): string {
  if (input.metric === 'form_error' || input.metric === 'form_submit') return 'form.error'
  if (input.metric === 'http_status')
    return input.url?.includes('/api/') ? 'system.error' : 'site.down'
  return 'performance.slow'
}

async function notifyPerformanceAlert(alertId: string, input: PerformanceAlertInput) {
  const eventType = notificationEventType(input)
  await createNotification({
    body: input.message,
    dedupeKey: `${eventType}:${input.url ?? 'unknown'}:${input.metric ?? input.title}`,
    entityId: alertId,
    entityType: 'performance_alert',
    eventType,
    metadata: {
      metric: input.metric,
      source: input.source,
      threshold: input.threshold,
      url: input.url,
      value: input.value,
    },
    severity: input.severity,
    source: 'performance',
    title: input.title,
  })
}
