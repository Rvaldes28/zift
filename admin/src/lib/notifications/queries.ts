import 'server-only'

import {
  db,
  notificationDeliveries,
  notificationRules,
  notifications,
  pushSubscriptions,
} from '@ziftlab/db'
import { and, count, desc, eq, inArray, isNull, or } from 'drizzle-orm'

import { notificationsConfig, notificationsEnabled } from './config'

export interface NotificationFilters {
  channel?: string
  event?: string
  severity?: string
  status?: string
}

function filterValue(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function parseNotificationFilters(
  input: NotificationFilters | undefined,
): NotificationFilters {
  return {
    channel: filterValue(input?.channel),
    event: filterValue(input?.event),
    severity: filterValue(input?.severity),
    status: filterValue(input?.status) ?? 'open',
  }
}

function includesChannel(channels: unknown, channel: string | undefined): boolean {
  if (!channel) return true
  return Array.isArray(channels) && channels.includes(channel)
}

export async function getNotificationInbox(input: NotificationFilters | undefined) {
  const filters = parseNotificationFilters(input)
  const rows = await db
    .select()
    .from(notifications)
    .where(
      and(
        filters.status ? eq(notifications.status, filters.status) : undefined,
        filters.severity ? eq(notifications.severity, filters.severity) : undefined,
        filters.event ? eq(notifications.eventType, filters.event) : undefined,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(120)

  const filteredRows = rows.filter((row) => includesChannel(row.channels, filters.channel))
  const ids = filteredRows.map((row) => row.id)
  const deliveries = ids.length
    ? await db
        .select()
        .from(notificationDeliveries)
        .where(inArray(notificationDeliveries.notificationId, ids))
        .orderBy(desc(notificationDeliveries.updatedAt))
    : []

  return {
    filters,
    rows: filteredRows.map((row) => ({
      ...row,
      deliveries: deliveries.filter((delivery) => delivery.notificationId === row.id),
    })),
  }
}

export async function getNotificationStats() {
  const [open] = await db
    .select({ value: count() })
    .from(notifications)
    .where(eq(notifications.status, 'open'))
  const [critical] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.status, 'open'), eq(notifications.severity, 'critical')))
  const [failedDeliveries] = await db
    .select({ value: count() })
    .from(notificationDeliveries)
    .where(eq(notificationDeliveries.status, 'failed'))
  const [unread] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.status, 'open'), isNull(notifications.readAt)))

  return {
    critical: critical?.value ?? 0,
    failedDeliveries: failedDeliveries?.value ?? 0,
    open: open?.value ?? 0,
    unread: unread?.value ?? 0,
  }
}

export async function getNotificationRules() {
  return db.select().from(notificationRules).orderBy(notificationRules.eventType)
}

export async function getNotificationSettingsOverview(userId: string) {
  const config = notificationsConfig()
  const [pushCount] = await db
    .select({ value: count() })
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.status, 'active')))

  return {
    channels: {
      email: Boolean(config.resendApiKey && config.resendFrom && config.emailTo),
      push: Boolean(config.webPushPrivateKey && config.webPushPublicKey),
      slack: Boolean(config.slackWebhookUrl),
      telegram: Boolean(config.telegramBotToken && config.telegramChatId),
      whatsapp: Boolean(
        config.whatsappAccessToken &&
        config.whatsappPhoneNumberId &&
        config.whatsappTemplateName &&
        config.whatsappToNumbers.length > 0,
      ),
    },
    defaultChannels: config.defaultChannels,
    enabled: notificationsEnabled(),
    pushPublicKey: config.webPushPublicKey,
    userPushSubscriptions: pushCount?.value ?? 0,
  }
}

export async function getHeaderNotificationBadge() {
  const stats = await getNotificationStats().catch(() => ({
    critical: 0,
    failedDeliveries: 0,
    open: 0,
    unread: 0,
  }))
  return {
    critical: stats.critical,
    unread: stats.unread,
  }
}

export async function canSeeNotification(userId: string, notificationId: string) {
  const row = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.id, notificationId),
      or(eq(notifications.userId, userId), isNull(notifications.userId)),
    ),
  })
  return Boolean(row)
}
