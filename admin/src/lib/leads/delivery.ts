import 'server-only'

import { createHmac } from 'node:crypto'

import { db, leads } from '@ziftlab/db'
import { eq } from 'drizzle-orm'

import { recordAuditEvent } from '@/lib/audit/service'
import { runLeadIntegrationAutomations } from '@/lib/integrations/delivery'
import { createNotification } from '@/lib/notifications/service'

import { leadFormLabel, leadStatusLabel } from './constants'
import { getLeadDetail } from './queries'

type DeliveryStatus = 'failed' | 'sent' | 'skipped'

interface DeliveryResult {
  message: string
  status: DeliveryStatus
}

function adminUrl(path = ''): string {
  return `${(process.env.ADMIN_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')}${path}`
}

async function recordLeadActivity(input: {
  action: string
  actorId: string | null
  leadId: string
  metadata?: Record<string, unknown>
}) {
  await recordAuditEvent({
    action: input.action,
    actorId: input.actorId,
    entityId: input.leadId,
    entityType: 'lead',
    metadata: input.metadata ?? {},
    severity: input.action.includes('failed') ? 'warning' : 'notice',
    source: 'api',
  })
}

function leadDeliveryBody(lead: NonNullable<Awaited<ReturnType<typeof getLeadDetail>>>) {
  return {
    assignedTo: lead.assignedTo,
    budget: lead.budget,
    company: lead.company,
    createdAt: lead.createdAt.toISOString(),
    dashboardUrl: adminUrl(`/dashboard/leads/${lead.id}`),
    email: lead.email,
    formType: lead.formType,
    id: lead.id,
    message: lead.message,
    name: lead.name,
    phone: lead.phone,
    service: lead.serviceId
      ? {
          id: lead.serviceId,
          title: lead.serviceTitle,
        }
      : null,
    source: lead.source,
    status: lead.status,
    utm: lead.utm,
  }
}

function hmacSignature(body: string): string | null {
  const secret = process.env.LEADS_CRM_WEBHOOK_SECRET?.trim()
  if (!secret) return null

  return createHmac('sha256', secret).update(body).digest('hex')
}

function responseRecord(input: {
  body: string
  ok: boolean
  status: number
}): Record<string, unknown> {
  return {
    body: input.body.slice(0, 4000),
    ok: input.ok,
    status: input.status,
  }
}

export async function sendLeadToCrm(input: {
  actorId: string | null
  leadId: string
}): Promise<DeliveryResult> {
  const webhookUrl = process.env.LEADS_CRM_WEBHOOK_URL?.trim()
  const now = new Date()

  if (!webhookUrl) {
    await db
      .update(leads)
      .set({
        crmResponse: { reason: 'LEADS_CRM_WEBHOOK_URL not configured' },
        crmStatus: 'skipped',
        updatedAt: now,
      })
      .where(eq(leads.id, input.leadId))

    await recordLeadActivity({
      action: 'lead.crm.skipped',
      actorId: input.actorId,
      leadId: input.leadId,
    })

    return { message: 'CRM webhook no configurado.', status: 'skipped' }
  }

  const lead = await getLeadDetail(input.leadId)
  if (!lead) return { message: 'Lead no encontrado.', status: 'failed' }

  const body = JSON.stringify(leadDeliveryBody(lead))
  const signature = hmacSignature(body)

  try {
    const response = await fetch(webhookUrl, {
      body,
      headers: {
        'Content-Type': 'application/json',
        ...(signature && { 'X-ZiftLab-Signature': signature }),
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    })
    const responseBody = await response.text().catch(() => '')
    const status: DeliveryStatus = response.ok ? 'sent' : 'failed'

    await db
      .update(leads)
      .set({
        crmResponse: responseRecord({
          body: responseBody,
          ok: response.ok,
          status: response.status,
        }),
        crmSentAt: now,
        crmStatus: status,
        updatedAt: now,
      })
      .where(eq(leads.id, input.leadId))

    await recordLeadActivity({
      action: response.ok ? 'lead.crm.sent' : 'lead.crm.failed',
      actorId: input.actorId,
      leadId: input.leadId,
      metadata: { status: response.status },
    })

    return {
      message: response.ok ? 'Lead enviado al CRM.' : 'El CRM respondio con error.',
      status,
    }
  } catch (error) {
    await db
      .update(leads)
      .set({
        crmResponse: {
          error: error instanceof Error ? error.message : String(error),
        },
        crmSentAt: now,
        crmStatus: 'failed',
        updatedAt: now,
      })
      .where(eq(leads.id, input.leadId))

    await recordLeadActivity({
      action: 'lead.crm.failed',
      actorId: input.actorId,
      leadId: input.leadId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })

    return { message: 'No se pudo conectar con el CRM.', status: 'failed' }
  }
}

function notificationRecipients(): string[] {
  return (process.env.LEADS_NOTIFY_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function leadEmailHtml(lead: NonNullable<Awaited<ReturnType<typeof getLeadDetail>>>): string {
  const rows = [
    ['Formulario', leadFormLabel(lead.formType)],
    ['Estado', leadStatusLabel(lead.status)],
    ['Nombre', lead.name],
    ['Email', lead.email],
    ['Telefono', lead.phone ?? ''],
    ['Empresa', lead.company ?? ''],
    ['Servicio', lead.serviceTitle ?? ''],
    ['Presupuesto', lead.budget ?? ''],
    ['Source', lead.source ?? ''],
  ]

  return `
    <h1>Nuevo lead: ${escapeHtml(lead.name)}</h1>
    <table cellpadding="6" cellspacing="0" border="0">
      ${rows
        .map(
          ([label, value]) =>
            `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value ?? '')}</td></tr>`,
        )
        .join('')}
    </table>
    ${lead.message ? `<p><strong>Mensaje</strong></p><p>${escapeHtml(lead.message)}</p>` : ''}
    <p><a href="${adminUrl(`/dashboard/leads/${lead.id}`)}">Abrir lead en dashboard</a></p>
  `
}

export async function sendLeadNotification(input: {
  actorId: string | null
  leadId: string
}): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  const recipients = notificationRecipients()

  if (!apiKey || !from || recipients.length === 0) {
    return { message: 'Notificacion email no configurada.', status: 'skipped' }
  }

  const lead = await getLeadDetail(input.leadId)
  if (!lead) return { message: 'Lead no encontrado.', status: 'failed' }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from,
        html: leadEmailHtml(lead),
        subject: `[ZiftLab] Nuevo lead: ${leadFormLabel(lead.formType)} - ${lead.name}`,
        to: recipients,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      await recordLeadActivity({
        action: 'lead.notification.failed',
        actorId: input.actorId,
        leadId: input.leadId,
        metadata: { body: body.slice(0, 1000), status: response.status },
      })
      return { message: 'Resend respondio con error.', status: 'failed' }
    }

    await db
      .update(leads)
      .set({ notificationSentAt: new Date(), updatedAt: new Date() })
      .where(eq(leads.id, input.leadId))

    await recordLeadActivity({
      action: 'lead.notification.sent',
      actorId: input.actorId,
      leadId: input.leadId,
      metadata: { recipients },
    })

    return { message: 'Notificacion enviada.', status: 'sent' }
  } catch (error) {
    await recordLeadActivity({
      action: 'lead.notification.failed',
      actorId: input.actorId,
      leadId: input.leadId,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    })

    return { message: 'No se pudo enviar la notificacion.', status: 'failed' }
  }
}

export async function runLeadAutomations(input: {
  actorId: string | null
  leadId: string
}): Promise<void> {
  const lead = await getLeadDetail(input.leadId).catch(() => null)
  if (lead) {
    await createNotification({
      body: `${lead.name} envio ${leadFormLabel(lead.formType)}${lead.serviceTitle ? ` sobre ${lead.serviceTitle}` : ''}.`,
      dedupeKey: input.leadId,
      entityId: input.leadId,
      entityType: 'lead',
      eventType: 'lead.created',
      metadata: { email: lead.email, formType: lead.formType, source: lead.source },
      severity: 'info',
      source: 'leads',
      title: 'Nuevo lead recibido',
    }).catch(() => null)
  }

  await sendLeadNotification(input).catch(() => null)
  await runLeadIntegrationAutomations(input).catch(() => null)

  if (process.env.LEADS_CRM_AUTO_SEND === 'true') {
    await sendLeadToCrm(input).catch(() => null)
  }
}
