import 'server-only'

import {
  db,
  notificationDeliveries,
  notificationRules,
  notifications,
  type Notification,
} from '@ziftlab/db'
import { and, desc, eq, gte } from 'drizzle-orm'

import { adminUrl, sendNotificationChannel } from './channels'
import { notificationsConfig, notificationsEnabled } from './config'
import {
  EVENT_LABELS,
  NOTIFICATION_CHANNELS,
  type NotificationChannel,
  type NotificationSeverity,
} from './constants'

interface CreateNotificationInput {
  body?: string | null
  channels?: NotificationChannel[]
  dedupeKey?: string | null
  entityId?: string | null
  entityType?: string | null
  eventType: string
  metadata?: Record<string, unknown>
  severity?: NotificationSeverity
  source?: string
  title?: string
  userId?: string | null
}

function uniqueChannels(channels: string[]): NotificationChannel[] {
  const allowed = new Set<string>(NOTIFICATION_CHANNELS)
  const clean = channels.filter((channel): channel is NotificationChannel => allowed.has(channel))
  return [...new Set(clean)]
}

function fallbackChannels(severity: NotificationSeverity): NotificationChannel[] {
  const config = notificationsConfig()
  return severity === 'critical' ? config.criticalChannels : config.defaultChannels
}

function asChannels(value: unknown): NotificationChannel[] {
  return Array.isArray(value)
    ? uniqueChannels(value.filter((item) => typeof item === 'string'))
    : []
}

async function ruleFor(eventType: string) {
  return db.query.notificationRules.findFirst({
    where: eq(notificationRules.eventType, eventType),
  })
}

function statusFromDelivery(status: 'failed' | 'sent' | 'skipped') {
  if (status === 'sent') return 'sent'
  if (status === 'skipped') return 'skipped'
  return 'failed'
}

async function dispatchDelivery(
  deliveryId: string,
  notification: Notification,
  channel: NotificationChannel,
) {
  const result = await sendNotificationChannel(channel, {
    body: notification.body,
    dashboardUrl: adminUrl(`/dashboard/notifications?notification=${notification.id}`),
    eventType: notification.eventType,
    id: notification.id,
    severity: notification.severity,
    title: notification.title,
  })
  const now = new Date()

  await db
    .update(notificationDeliveries)
    .set({
      attempts: 1,
      errorMessage: result.errorMessage ?? null,
      lastAttemptAt: now,
      response: result.response ?? null,
      sentAt: result.status === 'sent' ? now : null,
      status: statusFromDelivery(result.status),
      updatedAt: now,
    })
    .where(eq(notificationDeliveries.id, deliveryId))
}

async function dispatchNotification(notification: Notification) {
  const channels = asChannels(notification.channels)
  for (const channel of channels) {
    const [delivery] = await db
      .insert(notificationDeliveries)
      .values({
        channel,
        notificationId: notification.id,
        status: 'pending',
      })
      .returning()

    if (delivery) {
      await dispatchDelivery(delivery.id, notification, channel).catch(async (error) => {
        await db
          .update(notificationDeliveries)
          .set({
            attempts: 1,
            errorMessage: error instanceof Error ? error.message : String(error),
            lastAttemptAt: new Date(),
            status: 'failed',
            updatedAt: new Date(),
          })
          .where(eq(notificationDeliveries.id, delivery.id))
      })
    }
  }
}

export async function createNotification(input: CreateNotificationInput) {
  if (!notificationsEnabled()) return { deduped: false, id: null, skipped: true }

  const rule = await ruleFor(input.eventType)
  if (rule && !rule.enabled) return { deduped: false, id: null, skipped: true }

  const severity = (input.severity ?? rule?.severity ?? 'info') as NotificationSeverity
  const channels = uniqueChannels(
    input.channels ?? asChannels(rule?.channels) ?? fallbackChannels(severity),
  )
  const finalChannels = channels.length > 0 ? channels : fallbackChannels(severity)
  const title = input.title ?? EVENT_LABELS[input.eventType] ?? 'Notificacion'
  const dedupeMinutes = rule?.dedupeMinutes ?? notificationsConfig().dedupeMinutes
  const dedupeKey =
    input.dedupeKey ??
    [input.eventType, input.entityType, input.entityId].filter(Boolean).join(':') ??
    null

  if (dedupeKey) {
    const windowStart = new Date(Date.now() - dedupeMinutes * 60 * 1000)
    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.eventType, input.eventType),
          eq(notifications.dedupeKey, dedupeKey),
          eq(notifications.status, 'open'),
          gte(notifications.createdAt, windowStart),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(1)

    if (existing) {
      await db
        .update(notifications)
        .set({
          body: input.body ?? existing.body,
          metadata: {
            ...(existing.metadata ?? {}),
            ...(input.metadata ?? {}),
            dedupedAt: new Date().toISOString(),
          },
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, existing.id))
      return { deduped: true, id: existing.id, skipped: false }
    }
  }

  const [created] = await db
    .insert(notifications)
    .values({
      body: input.body ?? null,
      channels: finalChannels,
      dedupeKey,
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      eventType: input.eventType,
      metadata: input.metadata ?? {},
      severity,
      source: input.source ?? 'system',
      status: 'open',
      title,
      userId: input.userId ?? null,
    })
    .returning()

  if (!created) return { deduped: false, id: null, skipped: true }

  await dispatchNotification(created).catch(() => null)
  return { deduped: false, id: created.id, skipped: false }
}

export async function retryNotificationDelivery(deliveryId: string) {
  const row = await db.query.notificationDeliveries.findFirst({
    where: eq(notificationDeliveries.id, deliveryId),
  })
  if (!row) return false

  const notification = await db.query.notifications.findFirst({
    where: eq(notifications.id, row.notificationId),
  })
  if (!notification) return false

  await dispatchDelivery(row.id, notification, row.channel as NotificationChannel)
  return true
}

export async function dispatchFailedDeliveries(limit = 25) {
  const rows = await db
    .select()
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.status, 'failed'))
    .orderBy(desc(notificationDeliveries.updatedAt))
    .limit(limit)

  let retried = 0
  for (const row of rows) {
    if (await retryNotificationDelivery(row.id).catch(() => false)) retried += 1
  }
  return { retried }
}
