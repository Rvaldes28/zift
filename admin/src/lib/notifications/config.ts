import 'server-only'

import { NOTIFICATION_CHANNELS, type NotificationChannel } from './constants'

function envString(name: string): string | null {
  const value = process.env[name]?.trim()
  return value ? value : null
}

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function channelList(name: string, fallback: NotificationChannel[]): NotificationChannel[] {
  const configured = envString(name)
  if (!configured) return fallback

  const allowed = new Set<string>(NOTIFICATION_CHANNELS)
  const channels = configured
    .split(',')
    .map((channel) => channel.trim())
    .filter((channel): channel is NotificationChannel => allowed.has(channel))

  return channels.length > 0 ? [...new Set(channels)] : fallback
}

export function notificationsEnabled(): boolean {
  return process.env.NOTIFICATIONS_ENABLED !== 'false'
}

export function notificationsConfig() {
  return {
    criticalChannels: channelList('NOTIFICATIONS_CRITICAL_CHANNELS', [
      'dashboard',
      'email',
      'slack',
      'telegram',
    ]),
    dedupeMinutes: envNumber('NOTIFICATIONS_DEDUPE_MINUTES', 15),
    defaultChannels: channelList('NOTIFICATIONS_DEFAULT_CHANNELS', ['dashboard', 'email']),
    dispatchSecret: envString('NOTIFICATIONS_DISPATCH_SECRET'),
    emailTo: envString('NOTIFICATIONS_EMAIL_TO'),
    resendApiKey: envString('RESEND_API_KEY'),
    resendFrom: envString('RESEND_FROM_EMAIL'),
    slackWebhookUrl: envString('SLACK_WEBHOOK_URL'),
    telegramBotToken: envString('TELEGRAM_BOT_TOKEN'),
    telegramChatId: envString('TELEGRAM_CHAT_ID'),
    webPushPrivateKey: envString('WEB_PUSH_PRIVATE_KEY'),
    webPushPublicKey: envString('WEB_PUSH_PUBLIC_KEY'),
    webPushSubject: envString('WEB_PUSH_SUBJECT') ?? 'mailto:admin@ziftlab.com',
    whatsappAccessToken: envString('WHATSAPP_BUSINESS_ACCESS_TOKEN'),
    whatsappLanguage: envString('WHATSAPP_ALERT_TEMPLATE_LANGUAGE') ?? 'es',
    whatsappPhoneNumberId: envString('WHATSAPP_BUSINESS_PHONE_NUMBER_ID'),
    whatsappTemplateName: envString('WHATSAPP_ALERT_TEMPLATE_NAME'),
    whatsappToNumbers: (envString('WHATSAPP_ALERT_TO_NUMBERS') ?? '')
      .split(',')
      .map((phone) => phone.trim())
      .filter(Boolean),
  }
}
