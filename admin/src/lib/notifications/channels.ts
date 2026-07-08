import 'server-only'

import { db, pushSubscriptions } from '@ziftlab/db'
import { eq } from 'drizzle-orm'
import webpush from 'web-push'

import { notificationsConfig } from './config'
import type { NotificationChannel } from './constants'

export interface NotificationMessage {
  body: string | null
  dashboardUrl: string
  eventType: string
  id: string
  severity: string
  title: string
}

export interface ChannelDeliveryResult {
  response?: Record<string, unknown>
  status: 'failed' | 'sent' | 'skipped'
  errorMessage?: string
}

function adminUrl(path = ''): string {
  return `${(process.env.ADMIN_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')}${path}`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

async function postJson(url: string, payload: unknown, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  })
  const body = await response.text().catch(() => '')
  return {
    body: body.slice(0, 2000),
    ok: response.ok,
    status: response.status,
  }
}

async function sendEmail(message: NotificationMessage): Promise<ChannelDeliveryResult> {
  const config = notificationsConfig()
  if (!config.resendApiKey || !config.resendFrom || !config.emailTo) {
    return { errorMessage: 'Email no configurado.', status: 'skipped' }
  }

  const recipients = config.emailTo
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
  if (recipients.length === 0)
    return { errorMessage: 'Sin destinatarios email.', status: 'skipped' }

  const html = `
    <h1>${escapeHtml(message.title)}</h1>
    ${message.body ? `<p>${escapeHtml(message.body)}</p>` : ''}
    <p><strong>Severidad:</strong> ${escapeHtml(message.severity)}</p>
    <p><strong>Evento:</strong> ${escapeHtml(message.eventType)}</p>
    <p><a href="${escapeHtml(message.dashboardUrl)}">Abrir en dashboard</a></p>
  `
  const response = await postJson(
    'https://api.resend.com/emails',
    {
      from: config.resendFrom,
      html,
      subject: `[ZiftLab] ${message.title}`,
      to: recipients,
    },
    { Authorization: `Bearer ${config.resendApiKey}` },
  )

  return {
    errorMessage: response.ok ? undefined : 'Resend respondio con error.',
    response,
    status: response.ok ? 'sent' : 'failed',
  }
}

async function sendSlack(message: NotificationMessage): Promise<ChannelDeliveryResult> {
  const webhookUrl = notificationsConfig().slackWebhookUrl
  if (!webhookUrl) return { errorMessage: 'Slack webhook no configurado.', status: 'skipped' }

  const response = await postJson(webhookUrl, {
    blocks: [
      {
        text: {
          text: `*${message.title}*\n${message.body ?? ''}\n<${message.dashboardUrl}|Abrir en dashboard>`,
          type: 'mrkdwn',
        },
        type: 'section',
      },
    ],
    text: `${message.title}${message.body ? ` - ${message.body}` : ''}`,
  })

  return {
    errorMessage: response.ok ? undefined : 'Slack respondio con error.',
    response,
    status: response.ok ? 'sent' : 'failed',
  }
}

async function sendTelegram(message: NotificationMessage): Promise<ChannelDeliveryResult> {
  const config = notificationsConfig()
  if (!config.telegramBotToken || !config.telegramChatId) {
    return { errorMessage: 'Telegram no configurado.', status: 'skipped' }
  }

  const response = await postJson(
    `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`,
    {
      chat_id: config.telegramChatId,
      disable_web_page_preview: true,
      text: `${message.title}\n${message.body ?? ''}\n${message.dashboardUrl}`,
    },
  )

  return {
    errorMessage: response.ok ? undefined : 'Telegram respondio con error.',
    response,
    status: response.ok ? 'sent' : 'failed',
  }
}

async function sendWhatsapp(message: NotificationMessage): Promise<ChannelDeliveryResult> {
  void message
  const config = notificationsConfig()
  if (
    !config.whatsappAccessToken ||
    !config.whatsappPhoneNumberId ||
    !config.whatsappTemplateName ||
    config.whatsappToNumbers.length === 0
  ) {
    return { errorMessage: 'WhatsApp template no configurado.', status: 'skipped' }
  }

  const responses = []
  for (const to of config.whatsappToNumbers) {
    const response = await postJson(
      `https://graph.facebook.com/v20.0/${config.whatsappPhoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        template: {
          language: { code: config.whatsappLanguage },
          name: config.whatsappTemplateName,
        },
        to,
        type: 'template',
      },
      { Authorization: `Bearer ${config.whatsappAccessToken}` },
    )
    responses.push({ status: response.status, ok: response.ok })
    if (!response.ok) {
      return {
        errorMessage: 'WhatsApp respondio con error.',
        response: { responses },
        status: 'failed',
      }
    }
  }

  return { response: { responses }, status: 'sent' }
}

async function sendPush(message: NotificationMessage): Promise<ChannelDeliveryResult> {
  const config = notificationsConfig()
  if (!config.webPushPublicKey || !config.webPushPrivateKey) {
    return { errorMessage: 'Web Push no configurado.', status: 'skipped' }
  }

  webpush.setVapidDetails(config.webPushSubject, config.webPushPublicKey, config.webPushPrivateKey)

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.status, 'active'))

  if (subscriptions.length === 0) {
    return { errorMessage: 'Sin suscripciones push activas.', status: 'skipped' }
  }

  const payload = JSON.stringify({
    body: message.body,
    title: message.title,
    url: message.dashboardUrl,
  })
  let sent = 0
  let failed = 0

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.auth,
            p256dh: subscription.p256dh,
          },
        },
        payload,
      )
      sent += 1
      await db
        .update(pushSubscriptions)
        .set({ lastSeenAt: new Date(), updatedAt: new Date() })
        .where(eq(pushSubscriptions.id, subscription.id))
    } catch (error) {
      failed += 1
      const statusCode =
        typeof error === 'object' && error && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : null
      if (statusCode === 404 || statusCode === 410) {
        await db
          .update(pushSubscriptions)
          .set({ status: 'inactive', updatedAt: new Date() })
          .where(eq(pushSubscriptions.id, subscription.id))
      }
    }
  }

  return {
    errorMessage: failed > 0 && sent === 0 ? 'No se pudo enviar ninguna push.' : undefined,
    response: { failed, sent },
    status: sent > 0 ? 'sent' : 'failed',
  }
}

export async function sendNotificationChannel(
  channel: NotificationChannel,
  message: NotificationMessage,
): Promise<ChannelDeliveryResult> {
  try {
    if (channel === 'dashboard') return { status: 'sent' }
    if (channel === 'email') return sendEmail(message)
    if (channel === 'slack') return sendSlack(message)
    if (channel === 'telegram') return sendTelegram(message)
    if (channel === 'whatsapp') return sendWhatsapp(message)
    if (channel === 'push') return sendPush(message)
    return { errorMessage: 'Canal no soportado.', status: 'skipped' }
  } catch (error) {
    return {
      errorMessage: error instanceof Error ? error.message : String(error),
      status: 'failed',
    }
  }
}

export { adminUrl }
