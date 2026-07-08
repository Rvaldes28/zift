import { NextResponse } from 'next/server'

import { envValue } from '@/lib/integrations/env'
import {
  recordWebhookEvent,
  safeRecordWebhookFailure,
  verifyMetaSignature,
} from '@/lib/integrations/webhooks'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === envValue('WHATSAPP_BUSINESS_VERIFY_TOKEN')) {
    return new Response(challenge ?? '', {
      headers: { 'Content-Type': 'text/plain' },
      status: 200,
    })
  }

  await safeRecordWebhookFailure({ integrationKey: 'whatsapp_business' })
  return NextResponse.json({ ok: false }, { status: 403 })
}

export async function POST(request: Request) {
  const body = await request.text()
  const verified = verifyMetaSignature(body, request.headers.get('x-hub-signature-256'))

  if (!verified) {
    await safeRecordWebhookFailure({ integrationKey: 'whatsapp_business' })
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  try {
    const event = JSON.parse(body) as Record<string, unknown>
    await recordWebhookEvent({ event, integrationKey: 'whatsapp_business', status: 'ok' })
    return NextResponse.json({ ok: true })
  } catch (error) {
    await safeRecordWebhookFailure({ error, integrationKey: 'whatsapp_business' })
    return NextResponse.json({ ok: false }, { status: 400 })
  }
}
