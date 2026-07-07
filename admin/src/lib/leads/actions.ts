'use server'

import { db, leadNotes, leads, users } from '@ziftlab/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

import { requirePermission, recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'

import { sendLeadToCrm } from './delivery'
import { isLeadStatus } from './constants'

const uuidSchema = z.string().uuid()

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function detailPath(leadId: string, params = '') {
  return `/dashboard/leads/${leadId}${params ? `?${params}` : ''}`
}

function revalidateLead(leadId: string) {
  revalidatePath('/dashboard/leads')
  revalidatePath(`/dashboard/leads/${leadId}`)
}

export async function updateLeadStatus(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('leads.manage')
  const leadId = formString(formData, 'leadId')
  const status = formString(formData, 'status')
  const spamReason = formString(formData, 'spamReason')

  if (!uuidSchema.safeParse(leadId).success || !isLeadStatus(status)) {
    redirect('/dashboard/leads?error=invalid')
  }

  await db
    .update(leads)
    .set({
      spamReason: status === 'spam' ? spamReason || null : null,
      status,
      statusChangedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId))

  await recordActivity({
    action: 'lead.status_updated',
    actorId: current.user.id,
    entityId: leadId,
    entityType: 'lead',
    metadata: { spamReason: status === 'spam' ? spamReason || null : null, status },
  })

  revalidateLead(leadId)
  redirect(detailPath(leadId, 'status=updated'))
}

export async function assignLead(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('leads.manage')
  const leadId = formString(formData, 'leadId')
  const assignedTo = formString(formData, 'assignedTo')

  if (!uuidSchema.safeParse(leadId).success) redirect('/dashboard/leads?error=invalid')

  let nextAssignedTo: string | null = null
  if (assignedTo) {
    if (!uuidSchema.safeParse(assignedTo).success) redirect(detailPath(leadId, 'error=invalid'))
    const [assignee] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, assignedTo))
      .limit(1)
    if (!assignee) redirect(detailPath(leadId, 'error=invalid'))
    nextAssignedTo = assignee.id
  }

  await db
    .update(leads)
    .set({ assignedTo: nextAssignedTo, updatedAt: new Date() })
    .where(eq(leads.id, leadId))

  await recordActivity({
    action: 'lead.assigned',
    actorId: current.user.id,
    entityId: leadId,
    entityType: 'lead',
    metadata: { assignedTo: nextAssignedTo },
  })

  revalidateLead(leadId)
  redirect(detailPath(leadId, 'status=assigned'))
}

export async function addLeadNote(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('leads.manage')
  const leadId = formString(formData, 'leadId')
  const body = formString(formData, 'body')

  if (!uuidSchema.safeParse(leadId).success || body.length < 2 || body.length > 5000) {
    redirect('/dashboard/leads?error=invalid')
  }

  const [lead] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) redirect('/dashboard/leads?error=invalid')

  await db.insert(leadNotes).values({
    authorId: current.user.id,
    body,
    leadId,
  })

  await recordActivity({
    action: 'lead.note_added',
    actorId: current.user.id,
    entityId: leadId,
    entityType: 'lead',
  })

  revalidateLead(leadId)
  redirect(detailPath(leadId, 'status=note-added'))
}

export async function sendLeadToCrmAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('leads.manage')
  const leadId = formString(formData, 'leadId')
  if (!uuidSchema.safeParse(leadId).success) redirect('/dashboard/leads?error=invalid')

  const [lead] = await db.select({ id: leads.id }).from(leads).where(eq(leads.id, leadId)).limit(1)
  if (!lead) redirect('/dashboard/leads?error=invalid')

  const result = await sendLeadToCrm({ actorId: current.user.id, leadId })

  revalidateLead(leadId)
  redirect(detailPath(leadId, `crm=${result.status}`))
}

export async function softDeleteLead(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('leads.manage')
  const leadId = formString(formData, 'leadId')
  if (!uuidSchema.safeParse(leadId).success) redirect('/dashboard/leads?error=invalid')

  await db
    .update(leads)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(leads.id, leadId))

  await recordActivity({
    action: 'lead.deleted',
    actorId: current.user.id,
    entityId: leadId,
    entityType: 'lead',
  })

  revalidatePath('/dashboard/leads')
  redirect('/dashboard/leads?status=deleted')
}
