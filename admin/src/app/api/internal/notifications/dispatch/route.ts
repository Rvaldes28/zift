import { NextResponse } from 'next/server'

import { notificationsConfig } from '@/lib/notifications/config'
import { dispatchFailedDeliveries } from '@/lib/notifications/service'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const secret = notificationsConfig().dispatchSecret
  const provided = request.headers.get('x-ziftlab-notifications-secret')

  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const result = await dispatchFailedDeliveries()
  return NextResponse.json({ ok: true, ...result })
}
