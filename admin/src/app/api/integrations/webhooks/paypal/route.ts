import { NextResponse } from 'next/server'

import {
  recordWebhookEvent,
  safeRecordWebhookFailure,
  verifyPaypalWebhook,
} from '@/lib/integrations/webhooks'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let event: Record<string, unknown>

  try {
    event = (await request.json()) as Record<string, unknown>
  } catch (error) {
    await safeRecordWebhookFailure({ error, integrationKey: 'paypal' })
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  try {
    const verified = await verifyPaypalWebhook(request, event)
    if (!verified) {
      await recordWebhookEvent({ event, integrationKey: 'paypal', status: 'failed' })
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    await recordWebhookEvent({ event, integrationKey: 'paypal', status: 'ok' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    await safeRecordWebhookFailure({ error, integrationKey: 'paypal' })
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
