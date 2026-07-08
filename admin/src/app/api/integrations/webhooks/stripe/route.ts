import { NextResponse } from 'next/server'

import {
  recordWebhookEvent,
  safeRecordWebhookFailure,
  verifyStripeSignature,
} from '@/lib/integrations/webhooks'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const body = await request.text()
  const verified = verifyStripeSignature(body, request.headers.get('stripe-signature'))

  if (!verified) {
    await safeRecordWebhookFailure({ integrationKey: 'stripe' })
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const event = JSON.parse(body) as Record<string, unknown>
    await recordWebhookEvent({ event, integrationKey: 'stripe', status: 'ok' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    await safeRecordWebhookFailure({ error, integrationKey: 'stripe' })
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
