import { db, pushSubscriptions } from '@ziftlab/db'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getCurrentSession } from '@/lib/auth/session'
import { verifyCsrf } from '@/lib/security/csrf'

export const runtime = 'nodejs'

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
})

export async function POST(request: Request) {
  const current = await getCurrentSession()
  if (!current) return NextResponse.json({ ok: false }, { status: 401 })

  const formData = await request.formData()
  await verifyCsrf(formData)
  const raw = formData.get('subscription')
  if (typeof raw !== 'string') return NextResponse.json({ ok: false }, { status: 400 })

  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const parsed = subscriptionSchema.safeParse(json)
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 })

  await db
    .insert(pushSubscriptions)
    .values({
      auth: parsed.data.keys.auth,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      status: 'active',
      userAgent: request.headers.get('user-agent'),
      userId: current.user.id,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        auth: parsed.data.keys.auth,
        lastSeenAt: new Date(),
        p256dh: parsed.data.keys.p256dh,
        status: 'active',
        updatedAt: new Date(),
        userAgent: request.headers.get('user-agent'),
        userId: current.user.id,
      },
    })

  return NextResponse.json({ ok: true })
}
