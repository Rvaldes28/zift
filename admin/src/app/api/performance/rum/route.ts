import { NextResponse } from 'next/server'

import { performanceRumSchema, recordPerformanceRum } from '@/lib/performance/rum'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (process.env.PUBLIC_ANALYTICS_ENABLED === 'false') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const body = await request.json().catch(() => null)
  const parsed = performanceRumSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const result = await recordPerformanceRum(request, parsed.data).catch(() => null)
  if (result?.limited) {
    return NextResponse.json({ ok: false }, { status: 429 })
  }

  return NextResponse.json({ ok: true })
}
