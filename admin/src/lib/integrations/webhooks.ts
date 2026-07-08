import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { envValue } from './env'
import { integrationFetch, normalizedError, safeJson } from './http'
import { recordIntegrationLog, upsertIntegrationRecord } from './queries'
import { createNotification } from '@/lib/notifications/service'

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function hmacSha256(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

export function verifyStripeSignature(body: string, signatureHeader: string | null): boolean {
  const secret = envValue('STRIPE_WEBHOOK_SECRET')
  if (!secret || !signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader
      .split(',')
      .map((part) => part.split('='))
      .filter(([key, value]) => key && value),
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const timestampMs = Number(timestamp) * 1000
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    return false
  }

  const expected = hmacSha256(secret, `${timestamp}.${body}`)
  return safeEqual(expected, signature)
}

function paypalBaseUrl() {
  return envValue('PAYPAL_ENV') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

async function paypalAccessToken(): Promise<string | null> {
  const clientId = envValue('PAYPAL_CLIENT_ID')
  const clientSecret = envValue('PAYPAL_CLIENT_SECRET')
  if (!clientId || !clientSecret) return null

  const response = await integrationFetch(
    `${paypalBaseUrl()}/v1/oauth2/token`,
    {
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    },
    12000,
  )
  if (!response.ok) return null

  const json = safeJson(JSON.parse(response.body) as unknown)
  return typeof json.access_token === 'string' ? json.access_token : null
}

export async function verifyPaypalWebhook(request: Request, event: Record<string, unknown>) {
  const webhookId = envValue('PAYPAL_WEBHOOK_ID')
  const accessToken = await paypalAccessToken()
  if (!webhookId || !accessToken) return false

  const headers = request.headers
  const body = {
    auth_algo: headers.get('paypal-auth-algo'),
    cert_url: headers.get('paypal-cert-url'),
    transmission_id: headers.get('paypal-transmission-id'),
    transmission_sig: headers.get('paypal-transmission-sig'),
    transmission_time: headers.get('paypal-transmission-time'),
    webhook_event: event,
    webhook_id: webhookId,
  }

  if (
    !body.auth_algo ||
    !body.cert_url ||
    !body.transmission_id ||
    !body.transmission_sig ||
    !body.transmission_time
  ) {
    return false
  }

  const response = await integrationFetch(
    `${paypalBaseUrl()}/v1/notifications/verify-webhook-signature`,
    {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    },
  )
  if (!response.ok) return false

  const json = safeJson(JSON.parse(response.body) as unknown)
  return json.verification_status === 'SUCCESS'
}

export function verifyMetaSignature(body: string, signatureHeader: string | null): boolean {
  const secret = envValue('WHATSAPP_BUSINESS_APP_SECRET')
  if (!secret || !signatureHeader?.startsWith('sha256=')) return false
  const signature = signatureHeader.slice('sha256='.length)
  const expected = hmacSha256(secret, body)
  return safeEqual(expected, signature)
}

export async function recordWebhookEvent(input: {
  event: Record<string, unknown>
  integrationKey: 'paypal' | 'stripe' | 'whatsapp_business'
  status: 'failed' | 'ok'
}) {
  const eventId =
    typeof input.event.id === 'string'
      ? input.event.id
      : typeof input.event.event_id === 'string'
        ? input.event.event_id
        : null
  const eventType =
    typeof input.event.type === 'string'
      ? input.event.type
      : typeof input.event.event_type === 'string'
        ? input.event.event_type
        : null

  await Promise.all([
    recordIntegrationLog({
      action: input.status === 'ok' ? 'integration.webhook.received' : 'integration.webhook.failed',
      integrationKey: input.integrationKey,
      level: input.status === 'ok' ? 'info' : 'error',
      message: input.status === 'ok' ? 'Webhook verificado.' : 'Webhook rechazado.',
      metadata: {
        eventId,
        eventType,
      },
      requestId: eventId,
      status: input.status,
    }),
    upsertIntegrationRecord({
      enabled: input.status === 'ok',
      key: input.integrationKey,
      lastCheckedAt: new Date(),
      lastError: input.status === 'ok' ? null : 'Webhook verification failed',
      metadata: { lastWebhookEventId: eventId, lastWebhookEventType: eventType },
      status: input.status === 'ok' ? 'connected' : 'error',
    }),
  ])

  if (input.status === 'ok') {
    await notifyWebhookEvent(input.integrationKey, eventId, eventType).catch(() => null)
  }
}

export async function safeRecordWebhookFailure(input: {
  error?: unknown
  integrationKey: 'paypal' | 'stripe' | 'whatsapp_business'
}) {
  await recordIntegrationLog({
    action: 'integration.webhook.failed',
    integrationKey: input.integrationKey,
    level: 'error',
    message: input.error ? normalizedError(input.error) : 'Webhook verification failed',
    status: 'failed',
  }).catch(() => null)
  await createNotification({
    body: input.error ? normalizedError(input.error) : 'Webhook rechazado o firma invalida.',
    dedupeKey: `${input.integrationKey}:webhook_failed`,
    entityType: 'integration',
    eventType: 'system.error',
    metadata: { integrationKey: input.integrationKey },
    severity: 'warning',
    source: 'integrations',
    title: 'Webhook de integracion fallido',
  }).catch(() => null)
}

function paymentEvent(eventType: string | null, integrationKey: string): boolean {
  if (!eventType) return false
  const normalized = eventType.toLowerCase()
  if (integrationKey === 'stripe') {
    return (
      normalized.includes('payment_intent.succeeded') ||
      normalized.includes('checkout.session.completed') ||
      normalized.includes('charge.succeeded')
    )
  }
  if (integrationKey === 'paypal') {
    return normalized.includes('payment') || normalized.includes('capture.completed')
  }
  return false
}

async function notifyWebhookEvent(
  integrationKey: 'paypal' | 'stripe' | 'whatsapp_business',
  eventId: string | null,
  eventType: string | null,
) {
  if (paymentEvent(eventType, integrationKey)) {
    await createNotification({
      body: `${integrationKey} confirmo ${eventType ?? 'un pago'}.`,
      dedupeKey: eventId ?? `${integrationKey}:${eventType}`,
      entityId: eventId ?? undefined,
      entityType: 'payment_event',
      eventType: 'payment.received',
      metadata: { eventId, eventType, integrationKey },
      severity: 'info',
      source: 'payments',
      title: 'Pago recibido',
    })
  }
}
