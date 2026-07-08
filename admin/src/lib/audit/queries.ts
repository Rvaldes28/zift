import 'server-only'

import { activityLogs, auditLogs, db } from '@ziftlab/db'
import { and, desc, eq, gte, lte, type SQL } from 'drizzle-orm'

import type { AuditSeverity } from './constants'

type JsonRecord = Record<string, unknown>

export interface AuditFilters {
  action?: string
  actorId?: string
  dateFrom?: string
  dateTo?: string
  entity?: string
  ip?: string
  limit?: number
  query?: string
  severity?: string
}

export interface AuditLogEvent {
  action: string
  actorEmail: string | null
  actorId: string | null
  actorName: string | null
  after: JsonRecord | null
  before: JsonRecord | null
  createdAt: Date
  entityId: string | null
  entityType: string | null
  id: string
  ipAddress: string | null
  kind: 'activity' | 'audit'
  metadata: JsonRecord
  requestId: string | null
  route: string | null
  sessionId: string | null
  severity: AuditSeverity
  source: string
  userAgent: string | null
}

function parseDate(value: string | undefined, endOfDay = false): Date | null {
  if (!value) return null
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(date.valueOf()) ? null : date
}

export function parseAuditFilters(searchParams: URLSearchParams): AuditFilters {
  return {
    action: searchParams.get('action')?.trim() || undefined,
    actorId: searchParams.get('actorId')?.trim() || undefined,
    dateFrom: searchParams.get('from')?.trim() || undefined,
    dateTo: searchParams.get('to')?.trim() || undefined,
    entity: searchParams.get('entity')?.trim() || undefined,
    ip: searchParams.get('ip')?.trim() || undefined,
    query: searchParams.get('q')?.trim() || undefined,
    severity: searchParams.get('severity')?.trim() || undefined,
  }
}

function activityWhere(filters: AuditFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = []
  const from = parseDate(filters.dateFrom)
  const to = parseDate(filters.dateTo, true)

  if (from) conditions.push(gte(activityLogs.createdAt, from))
  if (to) conditions.push(lte(activityLogs.createdAt, to))
  if (filters.actorId) conditions.push(eq(activityLogs.actorId, filters.actorId))
  if (filters.action) conditions.push(eq(activityLogs.action, filters.action))
  if (filters.entity) conditions.push(eq(activityLogs.entityType, filters.entity))
  if (filters.ip) conditions.push(eq(activityLogs.ipAddress, filters.ip))
  if (filters.severity) conditions.push(eq(activityLogs.severity, filters.severity))

  return conditions.length ? and(...conditions) : undefined
}

function auditWhere(filters: AuditFilters): SQL | undefined {
  const conditions: (SQL | undefined)[] = []
  const from = parseDate(filters.dateFrom)
  const to = parseDate(filters.dateTo, true)

  if (from) conditions.push(gte(auditLogs.createdAt, from))
  if (to) conditions.push(lte(auditLogs.createdAt, to))
  if (filters.actorId) conditions.push(eq(auditLogs.actorId, filters.actorId))
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action))
  if (filters.entity) conditions.push(eq(auditLogs.targetType, filters.entity))
  if (filters.ip) conditions.push(eq(auditLogs.ipAddress, filters.ip))
  if (filters.severity) conditions.push(eq(auditLogs.severity, filters.severity))

  return conditions.length ? and(...conditions) : undefined
}

function matchesSearch(event: AuditLogEvent, query: string | undefined): boolean {
  if (!query) return true
  const needle = query.toLowerCase()
  const haystack = [
    event.action,
    event.actorEmail,
    event.actorName,
    event.entityId,
    event.entityType,
    event.ipAddress,
    event.route,
    event.source,
    JSON.stringify(event.metadata),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(needle)
}

function normalizeSeverity(value: string): AuditSeverity {
  if (value === 'critical' || value === 'warning' || value === 'notice') return value
  return 'info'
}

export async function listAuditLogEvents(filters: AuditFilters = {}) {
  const limit = Math.min(Math.max(filters.limit ?? 120, 20), 500)
  const [activityRows, auditRows] = await Promise.all([
    db
      .select()
      .from(activityLogs)
      .where(activityWhere(filters))
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit * 2),
    db
      .select()
      .from(auditLogs)
      .where(auditWhere(filters))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit * 2),
  ])

  const activityEvents: AuditLogEvent[] = activityRows.map((row) => ({
    action: row.action,
    actorEmail: row.actorEmail,
    actorId: row.actorId,
    actorName: row.actorName,
    after: null,
    before: null,
    createdAt: row.createdAt,
    entityId: row.entityId,
    entityType: row.entityType,
    id: row.id,
    ipAddress: row.ipAddress,
    kind: 'activity',
    metadata: row.metadata,
    requestId: row.requestId,
    route: row.route,
    sessionId: row.sessionId,
    severity: normalizeSeverity(row.severity),
    source: row.source,
    userAgent: row.userAgent,
  }))

  const auditEvents: AuditLogEvent[] = auditRows.map((row) => ({
    action: row.action,
    actorEmail: row.actorEmail,
    actorId: row.actorId,
    actorName: row.actorName,
    after: row.after ?? null,
    before: row.before ?? null,
    createdAt: row.createdAt,
    entityId: row.targetId,
    entityType: row.targetType,
    id: row.id,
    ipAddress: row.ipAddress,
    kind: 'audit',
    metadata: row.metadata,
    requestId: row.requestId,
    route: row.route,
    sessionId: row.sessionId,
    severity: normalizeSeverity(row.severity),
    source: row.source,
    userAgent: row.userAgent,
  }))

  return [...activityEvents, ...auditEvents]
    .filter((event) => matchesSearch(event, filters.query))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
}

export async function getAuditLogEvent(id: string): Promise<AuditLogEvent | null> {
  const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1)
  if (audit) {
    return {
      action: audit.action,
      actorEmail: audit.actorEmail,
      actorId: audit.actorId,
      actorName: audit.actorName,
      after: audit.after ?? null,
      before: audit.before ?? null,
      createdAt: audit.createdAt,
      entityId: audit.targetId,
      entityType: audit.targetType,
      id: audit.id,
      ipAddress: audit.ipAddress,
      kind: 'audit',
      metadata: audit.metadata,
      requestId: audit.requestId,
      route: audit.route,
      sessionId: audit.sessionId,
      severity: normalizeSeverity(audit.severity),
      source: audit.source,
      userAgent: audit.userAgent,
    }
  }

  const [activity] = await db.select().from(activityLogs).where(eq(activityLogs.id, id)).limit(1)

  if (!activity) return null

  return {
    action: activity.action,
    actorEmail: activity.actorEmail,
    actorId: activity.actorId,
    actorName: activity.actorName,
    after: null,
    before: null,
    createdAt: activity.createdAt,
    entityId: activity.entityId,
    entityType: activity.entityType,
    id: activity.id,
    ipAddress: activity.ipAddress,
    kind: 'activity',
    metadata: activity.metadata,
    requestId: activity.requestId,
    route: activity.route,
    sessionId: activity.sessionId,
    severity: normalizeSeverity(activity.severity),
    source: activity.source,
    userAgent: activity.userAgent,
  }
}

export async function getAuditFacets() {
  const [activityRows, auditRows] = await Promise.all([
    db
      .select({
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        severity: activityLogs.severity,
      })
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(500),
    db
      .select({
        action: auditLogs.action,
        entityType: auditLogs.targetType,
        severity: auditLogs.severity,
      })
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(500),
  ])

  const actions = new Set<string>()
  const entities = new Set<string>()
  const severities = new Set<string>()

  for (const row of [...activityRows, ...auditRows]) {
    actions.add(row.action)
    if (row.entityType) entities.add(row.entityType)
    severities.add(row.severity)
  }

  return {
    actions: [...actions].sort(),
    entities: [...entities].sort(),
    severities: [...severities].sort(),
  }
}

export function auditFilterQuery(filters: AuditFilters): string {
  const params = new URLSearchParams()
  if (filters.query) params.set('q', filters.query)
  if (filters.dateFrom) params.set('from', filters.dateFrom)
  if (filters.dateTo) params.set('to', filters.dateTo)
  if (filters.actorId) params.set('actorId', filters.actorId)
  if (filters.action) params.set('action', filters.action)
  if (filters.entity) params.set('entity', filters.entity)
  if (filters.ip) params.set('ip', filters.ip)
  if (filters.severity) params.set('severity', filters.severity)
  const value = params.toString()
  return value ? `?${value}` : ''
}

function csvCell(value: unknown): string {
  const stringValue = value instanceof Date ? value.toISOString() : String(value ?? '')
  return `"${stringValue.replace(/"/g, '""')}"`
}

export function auditEventsToCsv(events: AuditLogEvent[]): string {
  const rows = [
    [
      'fecha',
      'tipo',
      'severidad',
      'accion',
      'usuario',
      'email',
      'recurso',
      'recurso_id',
      'ip',
      'ruta',
      'navegador',
      'metadata',
      'before',
      'after',
    ],
    ...events.map((event) => [
      event.createdAt,
      event.kind,
      event.severity,
      event.action,
      event.actorName ?? 'Sistema',
      event.actorEmail,
      event.entityType,
      event.entityId,
      event.ipAddress,
      event.route,
      event.userAgent,
      JSON.stringify(event.metadata),
      event.before ? JSON.stringify(event.before) : '',
      event.after ? JSON.stringify(event.after) : '',
    ]),
  ]

  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\n')}`
}
