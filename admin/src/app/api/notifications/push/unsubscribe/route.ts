import { db, pushSubscriptions } from '@ziftlab/db'
import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { getCurrentSession } from '@/lib/auth/session'
import { verifyCsrf } from '@/lib/security/csrf'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const current = await getCurrentSession()
  if (!current) return NextResponse.json({ ok: false }, { status: 401 })

  const formData = await request.formData()
  await verifyCsrf(formData)
  const endpoint = formData.get('endpoint')
  const where =
    typeof endpoint === 'string' && endpoint
      ? and(eq(pushSubscriptions.userId, current.user.id), eq(pushSubscriptions.endpoint, endpoint))
      : eq(pushSubscriptions.userId, current.user.id)

  await db.update(pushSubscriptions).set({ status: 'inactive', updatedAt: new Date() }).where(where)

  return NextResponse.json({ ok: true })
}
