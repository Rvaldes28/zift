import 'server-only'

import { activityLogs, db, leadNotes, leads, services, users } from '@ziftlab/db'
import { and, desc, eq, gte, ilike, isNull, lte, or } from 'drizzle-orm'

import type { LeadStatus } from './constants'
import { isLeadStatus } from './constants'

export interface LeadFilters {
  assignedTo?: string
  dateFrom?: string
  dateTo?: string
  formType?: string
  q?: string
  serviceId?: string
  status?: string
}

export interface ListedLead {
  assignedTo: string | null
  assignedUserEmail: string | null
  assignedUserName: string | null
  budget: string | null
  company: string | null
  createdAt: Date
  crmStatus: string | null
  email: string
  formType: string
  id: string
  message: string | null
  name: string
  notificationSentAt: Date | null
  phone: string | null
  serviceId: string | null
  serviceTitle: string | null
  source: string | null
  spamReason: string | null
  status: string
  utm: Record<string, unknown>
}

export interface LeadNoteItem {
  authorEmail: string | null
  authorName: string | null
  body: string
  createdAt: Date
  id: string
}

export interface LeadActivityItem {
  action: string
  actorEmail: string | null
  actorName: string | null
  createdAt: Date
  id: string
  metadata: Record<string, unknown>
}

export interface LeadDetail extends ListedLead {
  crmResponse: Record<string, unknown> | null
  crmSentAt: Date | null
  ipAddress: string | null
  payload: Record<string, unknown>
  statusChangedAt: Date | null
  userAgent: string | null
  utm: Record<string, unknown>
  notes: LeadNoteItem[]
  activity: LeadActivityItem[]
}

export interface LeadStats {
  contacted: number
  converted: number
  followUp: number
  lostOrSpam: number
  new: number
  total: number
}

function dateFromInput(value: string | undefined, endOfDay = false): Date | null {
  if (!value) return null
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`)
  return Number.isNaN(date.valueOf()) ? null : date
}

function leadWhere(filters: LeadFilters = {}) {
  const conditions = [isNull(leads.deletedAt)]
  const status = filters.status?.trim()
  const dateFrom = dateFromInput(filters.dateFrom)
  const dateTo = dateFromInput(filters.dateTo, true)

  if (status && isLeadStatus(status)) conditions.push(eq(leads.status, status))
  if (filters.formType) conditions.push(eq(leads.formType, filters.formType))
  if (filters.serviceId) conditions.push(eq(leads.serviceId, filters.serviceId))
  if (filters.assignedTo === 'unassigned') conditions.push(isNull(leads.assignedTo))
  else if (filters.assignedTo) conditions.push(eq(leads.assignedTo, filters.assignedTo))
  if (dateFrom) conditions.push(gte(leads.createdAt, dateFrom))
  if (dateTo) conditions.push(lte(leads.createdAt, dateTo))

  const q = filters.q?.trim()
  if (q) {
    const like = `%${q}%`
    conditions.push(
      or(
        ilike(leads.name, like),
        ilike(leads.email, like),
        ilike(leads.phone, like),
        ilike(leads.company, like),
        ilike(leads.message, like),
      )!,
    )
  }

  return and(...conditions)
}

async function serviceTitlesById() {
  const rows = await db.select({ id: services.id, title: services.title }).from(services)
  return new Map(rows.map((service) => [service.id, service.title]))
}

async function usersById() {
  const rows = await db
    .select({ email: users.email, id: users.id, name: users.name, status: users.status })
    .from(users)
    .where(isNull(users.deletedAt))
  return new Map(rows.map((user) => [user.id, user]))
}

function listedLeadFromRow(
  row: typeof leads.$inferSelect,
  serviceTitles: Map<string, string>,
  userMap: Awaited<ReturnType<typeof usersById>>,
): ListedLead {
  const assignedUser = row.assignedTo ? userMap.get(row.assignedTo) : null

  return {
    assignedTo: row.assignedTo,
    assignedUserEmail: assignedUser?.email ?? null,
    assignedUserName: assignedUser?.name ?? null,
    budget: row.budget,
    company: row.company,
    createdAt: row.createdAt,
    crmStatus: row.crmStatus,
    email: row.email,
    formType: row.formType,
    id: row.id,
    message: row.message,
    name: row.name,
    notificationSentAt: row.notificationSentAt,
    phone: row.phone,
    serviceId: row.serviceId,
    serviceTitle: row.serviceId ? (serviceTitles.get(row.serviceId) ?? null) : null,
    source: row.source,
    spamReason: row.spamReason,
    status: row.status,
    utm: row.utm,
  }
}

export async function listLeads(filters: LeadFilters = {}): Promise<ListedLead[]> {
  const [rows, serviceTitles, userMap] = await Promise.all([
    db.select().from(leads).where(leadWhere(filters)).orderBy(desc(leads.createdAt)).limit(500),
    serviceTitlesById(),
    usersById(),
  ])

  return rows.map((row) => listedLeadFromRow(row, serviceTitles, userMap))
}

export async function listLeadsForExport(filters: LeadFilters = {}): Promise<ListedLead[]> {
  const [rows, serviceTitles, userMap] = await Promise.all([
    db.select().from(leads).where(leadWhere(filters)).orderBy(desc(leads.createdAt)).limit(5000),
    serviceTitlesById(),
    usersById(),
  ])

  return rows.map((row) => listedLeadFromRow(row, serviceTitles, userMap))
}

export async function getLeadStats(filters: LeadFilters = {}): Promise<LeadStats> {
  const rows = await listLeads({ ...filters, status: undefined })

  return {
    contacted: rows.filter((lead) => lead.status === 'contacted').length,
    converted: rows.filter((lead) => lead.status === 'converted').length,
    followUp: rows.filter((lead) => lead.status === 'follow_up').length,
    lostOrSpam: rows.filter((lead) => lead.status === 'lost' || lead.status === 'spam').length,
    new: rows.filter((lead) => lead.status === 'new').length,
    total: rows.length,
  }
}

export async function getLeadDetail(leadId: string): Promise<LeadDetail | null> {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead || lead.deletedAt) return null

  const [serviceTitles, userMap, noteRows, activityRows] = await Promise.all([
    serviceTitlesById(),
    usersById(),
    db
      .select()
      .from(leadNotes)
      .where(and(eq(leadNotes.leadId, leadId), isNull(leadNotes.deletedAt)))
      .orderBy(desc(leadNotes.createdAt)),
    db
      .select()
      .from(activityLogs)
      .where(and(eq(activityLogs.entityType, 'lead'), eq(activityLogs.entityId, leadId)))
      .orderBy(desc(activityLogs.createdAt))
      .limit(80),
  ])

  const base = listedLeadFromRow(lead, serviceTitles, userMap)

  return {
    ...base,
    activity: activityRows.map((item) => {
      const actor = item.actorId ? userMap.get(item.actorId) : null
      return {
        action: item.action,
        actorEmail: actor?.email ?? null,
        actorName: actor?.name ?? null,
        createdAt: item.createdAt,
        id: item.id,
        metadata: item.metadata,
      }
    }),
    crmResponse: lead.crmResponse,
    crmSentAt: lead.crmSentAt,
    ipAddress: lead.ipAddress,
    notes: noteRows.map((note) => {
      const author = note.authorId ? userMap.get(note.authorId) : null
      return {
        authorEmail: author?.email ?? null,
        authorName: author?.name ?? null,
        body: note.body,
        createdAt: note.createdAt,
        id: note.id,
      }
    }),
    payload: lead.payload,
    statusChangedAt: lead.statusChangedAt,
    userAgent: lead.userAgent,
    utm: lead.utm,
  }
}

export async function listLeadServices() {
  return db
    .select({ id: services.id, title: services.title })
    .from(services)
    .where(isNull(services.deletedAt))
    .orderBy(services.title)
}

export async function listAssignableUsers() {
  return db
    .select({ email: users.email, id: users.id, name: users.name })
    .from(users)
    .where(and(isNull(users.deletedAt), eq(users.status, 'active')))
    .orderBy(users.name)
}

export function parseLeadFilters(input: LeadFilters | URLSearchParams): LeadFilters {
  if (input instanceof URLSearchParams) {
    return {
      assignedTo: input.get('assignedTo') ?? undefined,
      dateFrom: input.get('dateFrom') ?? undefined,
      dateTo: input.get('dateTo') ?? undefined,
      formType: input.get('formType') ?? undefined,
      q: input.get('q') ?? undefined,
      serviceId: input.get('serviceId') ?? undefined,
      status: input.get('status') ?? undefined,
    }
  }

  return input
}

export function safeLeadStatus(value: string): LeadStatus | null {
  return isLeadStatus(value) ? value : null
}
