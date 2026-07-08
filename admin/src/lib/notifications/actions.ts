'use server'

import { db, notificationRules, notifications } from '@ziftlab/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requirePermission, recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'

import { NOTIFICATION_CHANNELS, type NotificationChannel } from './constants'
import { canSeeNotification } from './queries'
import { createNotification, retryNotificationDelivery } from './service'

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function selectedChannels(formData: FormData): NotificationChannel[] {
  const allowed = new Set<string>(NOTIFICATION_CHANNELS)
  return formData
    .getAll('channels')
    .filter((channel): channel is string => typeof channel === 'string' && allowed.has(channel))
    .filter((channel, index, list) => list.indexOf(channel) === index) as NotificationChannel[]
}

function notificationsRedirect(status = 'saved'): never {
  redirect(`/dashboard/notifications?result=${status}`)
}

function settingsRedirect(status = 'saved'): never {
  redirect(`/dashboard/notifications/settings?status=${status}`)
}

export async function updateNotificationStatusAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.read')
  const id = formString(formData, 'id')
  const action = formString(formData, 'action')

  if (!id || !(await canSeeNotification(current.user.id, id))) notificationsRedirect('invalid')

  const now = new Date()
  const values =
    action === 'resolve'
      ? { readAt: now, resolvedAt: now, status: 'resolved', updatedAt: now }
      : action === 'ack'
        ? { acknowledgedAt: now, readAt: now, status: 'acknowledged', updatedAt: now }
        : { readAt: now, updatedAt: now }

  await db.update(notifications).set(values).where(eq(notifications.id, id))
  await recordActivity({
    action: `notification.${action || 'read'}`,
    actorId: current.user.id,
    entityId: id,
    entityType: 'notification',
  }).catch(() => null)

  revalidatePath('/dashboard/notifications')
  notificationsRedirect(action || 'read')
}

export async function retryNotificationDeliveryAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.read')
  const deliveryId = formString(formData, 'deliveryId')
  if (!deliveryId) notificationsRedirect('invalid')

  const ok = await retryNotificationDelivery(deliveryId).catch(() => false)
  await recordActivity({
    action: ok ? 'notification.delivery_retried' : 'notification.delivery_retry_failed',
    actorId: current.user.id,
    entityId: deliveryId,
    entityType: 'notification_delivery',
  }).catch(() => null)

  revalidatePath('/dashboard/notifications')
  notificationsRedirect(ok ? 'retried' : 'retry_failed')
}

export async function updateNotificationRuleAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const eventType = formString(formData, 'eventType')
  if (!eventType) settingsRedirect('invalid')

  const channels = selectedChannels(formData)
  const dedupeMinutes = Math.max(
    1,
    Math.min(24 * 60, Number(formString(formData, 'dedupeMinutes')) || 15),
  )
  const enabled = formData.get('enabled') === 'on'

  await db
    .update(notificationRules)
    .set({
      channels,
      dedupeMinutes,
      enabled,
      updatedAt: new Date(),
    })
    .where(eq(notificationRules.eventType, eventType))

  await recordActivity({
    action: 'notification.rule_updated',
    actorId: current.user.id,
    entityId: eventType,
    entityType: 'notification_rule',
    metadata: { channels, dedupeMinutes, enabled },
  }).catch(() => null)

  revalidatePath('/dashboard/notifications/settings')
  settingsRedirect('saved')
}

export async function sendTestNotificationAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const channels = selectedChannels(formData)

  await createNotification({
    body: 'Esta es una prueba de FASE 18. Si la ves, el canal esta operativo.',
    channels: channels.length ? channels : undefined,
    dedupeKey: `manual-test-${current.user.id}-${Date.now()}`,
    eventType: 'system.error',
    metadata: { triggeredBy: current.user.id },
    severity: 'warning',
    source: 'dashboard',
    title: 'Notificacion de prueba',
  })

  await recordActivity({
    action: 'notification.test_sent',
    actorId: current.user.id,
    entityType: 'notification',
    metadata: { channels },
  }).catch(() => null)

  revalidatePath('/dashboard/notifications')
  settingsRedirect('test_sent')
}
