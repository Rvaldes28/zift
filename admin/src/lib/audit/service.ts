import 'server-only'

import { activityLogs, auditLogs, db, users } from '@ziftlab/db'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

import { getCurrentSession } from '@/lib/auth/session'
import { requestMeta } from '@/lib/auth/request'

import type { AuditSeverity } from './constants'
import { redactRecord, redactSecrets } from './redact'

type JsonRecord = Record<string, unknown>

export interface AuditEventInput {
  action: string
  actorId?: string | null
  actorEmail?: string | null
  actorName?: string | null
  after?: JsonRecord | null
  before?: JsonRecord | null
  entityId?: string | null
  entityType?: string | null
  ipAddress?: string | null
  metadata?: JsonRecord
  requestId?: string | null
  route?: string | null
  sessionId?: string | null
  severity?: AuditSeverity
  source?: string
  targetId?: string | null
  targetType?: string | null
  timeline?: boolean
  userAgent?: string | null
}

function normalizeId(value: string | null | undefined): string | null {
  return value?.trim() || null
}

function hasDiff(input: AuditEventInput): boolean {
  return input.before !== undefined || input.after !== undefined
}

async function safeHeaders() {
  try {
    return await headers()
  } catch {
    return null
  }
}

async function resolveRequestContext(input: AuditEventInput) {
  const [meta, headerStore] = await Promise.all([
    requestMeta().catch(() => ({ ipAddress: null, userAgent: null })),
    safeHeaders(),
  ])
  const referer = headerStore?.get('referer')
  let routeFromReferer: string | null = null
  if (referer) {
    try {
      routeFromReferer = new URL(referer).pathname
    } catch {
      routeFromReferer = null
    }
  }

  return {
    ipAddress: input.ipAddress ?? meta.ipAddress,
    requestId:
      input.requestId ??
      headerStore?.get('x-request-id') ??
      headerStore?.get('x-vercel-id') ??
      headerStore?.get('cf-ray') ??
      null,
    route:
      input.route ??
      headerStore?.get('x-pathname') ??
      headerStore?.get('next-url') ??
      routeFromReferer ??
      null,
    userAgent: input.userAgent ?? meta.userAgent,
  }
}

async function resolveActor(input: AuditEventInput) {
  let actorId = input.actorId ?? null
  let actorEmail = input.actorEmail ?? null
  let actorName = input.actorName ?? null
  let sessionId = input.sessionId ?? null

  const current = await getCurrentSession().catch(() => null)
  if (!actorId && current) actorId = current.user.id
  if (!sessionId && current && (!actorId || actorId === current.user.id))
    sessionId = current.session.id
  if (!actorEmail && current && actorId === current.user.id) actorEmail = current.user.email
  if (!actorName && current && actorId === current.user.id) actorName = current.user.name

  if (actorId && (!actorEmail || !actorName)) {
    const [actor] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, actorId))
      .limit(1)
      .catch(() => [])

    actorEmail ??= actor?.email ?? null
    actorName ??= actor?.name ?? null
  }

  return { actorEmail, actorId, actorName, sessionId }
}

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  const [actor, request] = await Promise.all([resolveActor(input), resolveRequestContext(input)])
  const entityType = normalizeId(input.entityType ?? input.targetType)
  const entityId = normalizeId(input.entityId ?? input.targetId)
  const targetType = normalizeId(input.targetType ?? input.entityType)
  const targetId = normalizeId(input.targetId ?? input.entityId)
  const severity = input.severity ?? 'info'
  const source = input.source ?? 'admin'
  const metadata = redactRecord(input.metadata)
  const now = new Date()

  if (input.timeline ?? true) {
    await db.insert(activityLogs).values({
      action: input.action,
      actorEmail: actor.actorEmail,
      actorId: actor.actorId,
      actorName: actor.actorName,
      createdAt: now,
      entityId,
      entityType,
      ipAddress: request.ipAddress,
      metadata,
      requestId: request.requestId,
      route: request.route,
      sessionId: actor.sessionId,
      severity,
      source,
      userAgent: request.userAgent,
    })
  }

  if (hasDiff(input)) {
    await db.insert(auditLogs).values({
      action: input.action,
      actorEmail: actor.actorEmail,
      actorId: actor.actorId,
      actorName: actor.actorName,
      after: redactSecrets(input.after ?? null) as JsonRecord | null,
      before: redactSecrets(input.before ?? null) as JsonRecord | null,
      createdAt: now,
      ipAddress: request.ipAddress,
      metadata,
      requestId: request.requestId,
      route: request.route,
      sessionId: actor.sessionId,
      severity,
      source,
      targetId,
      targetType,
      userAgent: request.userAgent,
    })
  }
}
