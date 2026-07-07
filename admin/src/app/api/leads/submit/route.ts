import { activityLogs, db, leads, services } from '@ziftlab/db'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { hashAnalyticsId } from '@/lib/analytics/privacy'
import { runLeadAutomations } from '@/lib/leads/delivery'

export const runtime = 'nodejs'

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 8
const attempts = new Map<string, { count: number; resetAt: number }>()

const leadSchema = z.object({
  analyticsSessionId: z.string().trim().max(200).optional(),
  budget: z.string().trim().max(80).optional(),
  company: z.string().trim().max(200).optional(),
  deviceType: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(254),
  formType: z.enum(['contacto', 'asesoria', 'cotizacion']),
  landingPath: z.string().trim().max(500).optional(),
  message: z.string().trim().max(5000).optional(),
  name: z.string().trim().min(2).max(200),
  phone: z.string().trim().max(80).optional(),
  referrer: z.string().trim().max(1000).optional(),
  service: z.string().trim().max(220).optional(),
  source: z.string().trim().max(500).optional(),
  utm: z.record(z.string(), z.unknown()).optional(),
  website: z.string().trim().optional(),
})

function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function rateLimitKey(request: Request, email?: string): string {
  return `${clientIp(request)}:${email?.toLowerCase() ?? 'anon'}`
}

function isLimited(key: string): boolean {
  const now = Date.now()
  const current = attempts.get(key)

  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }

  current.count += 1
  return current.count > MAX_ATTEMPTS
}

function zodErrors(error: z.ZodError) {
  const errors: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    errors[key] = [...(errors[key] ?? []), issue.message]
  }
  return errors
}

async function serviceIdFor(value: string | undefined): Promise<string | null> {
  if (!value) return null
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    const [byId] = await db.select({ id: services.id }).from(services).where(eq(services.id, value))
    if (byId) return byId.id
  }

  const [bySlug] = await db
    .select({ id: services.id })
    .from(services)
    .where(eq(services.slug, value))
  return bySlug?.id ?? null
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = leadSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ ok: false, errors: zodErrors(parsed.error) }, { status: 400 })
  }

  if (isLimited(rateLimitKey(request, parsed.data.email))) {
    return NextResponse.json(
      { ok: false, errors: { form: ['Demasiados intentos. Intenta de nuevo en unos minutos.'] } },
      { status: 429 },
    )
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true, id: null })
  }

  const serviceId = await serviceIdFor(parsed.data.service)
  const [created] = await db
    .insert(leads)
    .values({
      analyticsSessionIdHash: hashAnalyticsId(parsed.data.analyticsSessionId),
      budget: parsed.data.budget || null,
      company: parsed.data.company || null,
      deviceType: parsed.data.deviceType || null,
      email: parsed.data.email.toLowerCase(),
      formType: parsed.data.formType,
      landingPath: parsed.data.landingPath || null,
      message: parsed.data.message || null,
      name: parsed.data.name,
      payload: body && typeof body === 'object' ? body : {},
      phone: parsed.data.phone || null,
      referrer: parsed.data.referrer || null,
      serviceId,
      source: parsed.data.source || null,
      ipAddress: clientIp(request),
      statusChangedAt: new Date(),
      utm: parsed.data.utm ?? {},
      userAgent: request.headers.get('user-agent'),
    })
    .returning({ id: leads.id })

  await db.insert(activityLogs).values({
    action: 'lead.created',
    actorId: null,
    entityId: created.id,
    entityType: 'lead',
    metadata: { formType: parsed.data.formType, source: parsed.data.source ?? null },
  })

  await runLeadAutomations({ actorId: null, leadId: created.id }).catch(() => null)

  return NextResponse.json({ ok: true, id: created.id })
}
