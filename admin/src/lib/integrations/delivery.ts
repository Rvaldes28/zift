import 'server-only'

import { createHmac } from 'node:crypto'

import { db, integrations } from '@ziftlab/db'
import { eq } from 'drizzle-orm'

import { getLeadDetail } from '@/lib/leads/queries'

import { envValue, integrationHasRequiredEnv } from './env'
import { integrationFetch, normalizedError, safeJson } from './http'
import { recordIntegrationLog } from './queries'
import { integrationByKey, integrationRegistry, type IntegrationKey } from './registry'

type DeliveryStatus = 'failed' | 'sent' | 'skipped'

export interface IntegrationDeliveryResult {
  message: string
  status: DeliveryStatus
}

function adminUrl(path = ''): string {
  return `${(process.env.ADMIN_APP_URL || 'http://localhost:3000').replace(/\/+$/, '')}${path}`
}

function signature(body: string, secret: string | null): string | null {
  if (!secret) return null
  return createHmac('sha256', secret).update(body).digest('hex')
}

function syntheticLeadBody() {
  return {
    budget: 'test',
    company: 'ZiftLab',
    createdAt: new Date().toISOString(),
    dashboardUrl: adminUrl('/dashboard/integrations'),
    email: 'integraciones-test@ziftlab.local',
    formType: 'test',
    id: 'test',
    message: 'Lead de prueba enviado desde el centro de integraciones.',
    name: 'Lead de prueba',
    phone: '+000000000',
    service: null,
    source: 'dashboard.integrations',
    status: 'new',
    utm: {},
  }
}

function leadBody(lead: NonNullable<Awaited<ReturnType<typeof getLeadDetail>>>) {
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

function webhookConfig(key: IntegrationKey): {
  headers: Record<string, string>
  secret: string | null
  url: string | null
} | null {
  if (key === 'zapier') {
    return {
      headers: {},
      secret: envValue('ZAPIER_WEBHOOK_SECRET'),
      url: envValue('ZAPIER_WEBHOOK_URL'),
    }
  }
  if (key === 'make') {
    const token = envValue('MAKE_API_TOKEN')
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      secret: null,
      url: envValue('MAKE_WEBHOOK_URL'),
    }
  }
  if (key === 'custom_crm') {
    return {
      headers: {},
      secret: envValue('CUSTOM_CRM_WEBHOOK_SECRET'),
      url: envValue('CUSTOM_CRM_WEBHOOK_URL') || envValue('LEADS_CRM_WEBHOOK_URL'),
    }
  }
  return null
}

async function sendWebhookBody(input: {
  actorId: string | null
  integrationKey: IntegrationKey
  payload: Record<string, unknown>
}): Promise<IntegrationDeliveryResult> {
  const config = webhookConfig(input.integrationKey)
  if (!config?.url) {
    await recordIntegrationLog({
      action: 'integration.lead.skipped',
      createdBy: input.actorId,
      integrationKey: input.integrationKey,
      message: 'Webhook URL no configurado.',
      status: 'skipped',
    })
    return { message: 'Webhook no configurado.', status: 'skipped' }
  }

  const body = JSON.stringify(input.payload)
  const hmac = signature(body, config.secret)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  }
  if (hmac) headers['X-ZiftLab-Signature'] = hmac

  try {
    const response = await integrationFetch(config.url, {
      body,
      headers,
      method: 'POST',
    })
    await recordIntegrationLog({
      action: response.ok ? 'integration.lead.sent' : 'integration.lead.failed',
      createdBy: input.actorId,
      integrationKey: input.integrationKey,
      level: response.ok ? 'info' : 'error',
      message: response.ok ? 'Lead enviado.' : 'El webhook respondio con error.',
      metadata: { response },
      status: response.ok ? 'ok' : 'failed',
    })
    return {
      message: response.ok ? 'Lead enviado.' : 'El webhook respondio con error.',
      status: response.ok ? 'sent' : 'failed',
    }
  } catch (error) {
    await recordIntegrationLog({
      action: 'integration.lead.failed',
      createdBy: input.actorId,
      integrationKey: input.integrationKey,
      level: 'error',
      message: normalizedError(error),
      status: 'failed',
    })
    return { message: 'No se pudo enviar el lead.', status: 'failed' }
  }
}

async function sendMailchimpContact(input: {
  actorId: string | null
  payload: ReturnType<typeof syntheticLeadBody>
}): Promise<IntegrationDeliveryResult> {
  const apiKey = envValue('MAILCHIMP_API_KEY')
  const prefix = envValue('MAILCHIMP_SERVER_PREFIX')
  const audienceId = envValue('MAILCHIMP_AUDIENCE_ID')
  if (!apiKey || !prefix || !audienceId)
    return { message: 'Mailchimp no configurado.', status: 'skipped' }

  try {
    const response = await integrationFetch(
      `https://${prefix}.api.mailchimp.com/3.0/audiences/${audienceId}/contacts`,
      {
        body: JSON.stringify({
          email_address: input.payload.email,
          merge_fields: {
            COMPANY: input.payload.company,
            FNAME: input.payload.name,
            PHONE: input.payload.phone,
          },
          status: 'subscribed',
        }),
        headers: {
          Authorization: `Basic ${Buffer.from(`ziftlab:${apiKey}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    )
    await recordIntegrationLog({
      action: response.ok ? 'integration.lead.sent' : 'integration.lead.failed',
      createdBy: input.actorId,
      integrationKey: 'mailchimp',
      level: response.ok ? 'info' : 'error',
      message: response.ok ? 'Contacto enviado a Mailchimp.' : 'Mailchimp respondio con error.',
      metadata: { response },
      status: response.ok ? 'ok' : 'failed',
    })
    return {
      message: response.ok ? 'Contacto enviado a Mailchimp.' : 'Mailchimp respondio con error.',
      status: response.ok ? 'sent' : 'failed',
    }
  } catch (error) {
    await recordIntegrationLog({
      action: 'integration.lead.failed',
      createdBy: input.actorId,
      integrationKey: 'mailchimp',
      level: 'error',
      message: normalizedError(error),
      status: 'failed',
    })
    return { message: 'No se pudo enviar a Mailchimp.', status: 'failed' }
  }
}

async function sendHubspotContact(input: {
  actorId: string | null
  payload: ReturnType<typeof syntheticLeadBody>
}): Promise<IntegrationDeliveryResult> {
  const token = envValue('HUBSPOT_ACCESS_TOKEN')
  if (!token) return { message: 'HubSpot no configurado.', status: 'skipped' }

  try {
    const response = await integrationFetch('https://api.hubapi.com/crm/objects/2026-03/contacts', {
      body: JSON.stringify({
        properties: {
          company: input.payload.company,
          email: input.payload.email,
          firstname: input.payload.name,
          message: input.payload.message,
          phone: input.payload.phone,
        },
      }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    })
    await recordIntegrationLog({
      action: response.ok ? 'integration.lead.sent' : 'integration.lead.failed',
      createdBy: input.actorId,
      integrationKey: 'hubspot',
      level: response.ok ? 'info' : 'error',
      message: response.ok ? 'Contacto enviado a HubSpot.' : 'HubSpot respondio con error.',
      metadata: { response },
      status: response.ok ? 'ok' : 'failed',
    })
    return {
      message: response.ok ? 'Contacto enviado a HubSpot.' : 'HubSpot respondio con error.',
      status: response.ok ? 'sent' : 'failed',
    }
  } catch (error) {
    await recordIntegrationLog({
      action: 'integration.lead.failed',
      createdBy: input.actorId,
      integrationKey: 'hubspot',
      level: 'error',
      message: normalizedError(error),
      status: 'failed',
    })
    return { message: 'No se pudo enviar a HubSpot.', status: 'failed' }
  }
}

export async function sendDataToIntegration(input: {
  actorId: string | null
  integrationKey: string
  payload?: Record<string, unknown>
}): Promise<IntegrationDeliveryResult> {
  const integration = integrationByKey(input.integrationKey)
  if (!integration) return { message: 'Integracion no soportada.', status: 'failed' }

  const key = integration.key as IntegrationKey
  const payload = (input.payload ?? syntheticLeadBody()) as ReturnType<typeof syntheticLeadBody>

  if (key === 'zapier' || key === 'make' || key === 'custom_crm') {
    return sendWebhookBody({ actorId: input.actorId, integrationKey: key, payload })
  }

  if (key === 'mailchimp') {
    return sendMailchimpContact({ actorId: input.actorId, payload })
  }

  if (key === 'hubspot') {
    return sendHubspotContact({ actorId: input.actorId, payload })
  }

  return { message: 'Esta integracion no recibe leads en FASE 17.', status: 'skipped' }
}

export async function runLeadIntegrationAutomations(input: {
  actorId: string | null
  leadId: string
}): Promise<void> {
  const lead = await getLeadDetail(input.leadId)
  if (!lead) return

  const rows = await db.select().from(integrations).where(eq(integrations.enabled, true))

  const payload = leadBody(lead)
  for (const row of rows) {
    const registryItem = integrationByKey(row.key)
    const metadata = safeJson(row.metadata)
    if (
      !registryItem ||
      metadata.autoLeadSync !== true ||
      !integrationHasRequiredEnv(registryItem)
    ) {
      continue
    }

    await sendDataToIntegration({
      actorId: input.actorId,
      integrationKey: row.key,
      payload,
    }).catch(() => null)
  }
}

export function leadEnabledIntegrationKeys() {
  return integrationRegistry
    .filter((integration) =>
      ['custom_crm', 'hubspot', 'mailchimp', 'make', 'zapier'].includes(integration.key),
    )
    .map((integration) => integration.key)
}
