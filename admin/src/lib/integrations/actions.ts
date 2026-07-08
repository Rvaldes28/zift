'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { requirePermission, recordActivity } from '@/lib/rbac/access'
import { verifyCsrf } from '@/lib/security/csrf'

import { sendDataToIntegration } from './delivery'
import { envStateForIntegration, integrationHasRequiredEnv } from './env'
import { recordIntegrationLog, upsertIntegrationRecord } from './queries'
import { integrationByKey } from './registry'
import { runIntegrationTest } from './tests'

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function integrationsRedirect(status = 'saved', key?: string): never {
  const params = new URLSearchParams({ status })
  if (key) params.set('integration', key)
  redirect(`/dashboard/integrations?${params.toString()}`)
}

export async function updateIntegrationAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const key = formString(formData, 'key')
  const integration = integrationByKey(key)
  if (!integration) integrationsRedirect('invalid')

  const env = envStateForIntegration(integration)
  const enabled = formData.get('enabled') === 'on'
  const autoLeadSync = formData.get('autoLeadSync') === 'on'
  const owner = formString(formData, 'owner')
  const notes = formString(formData, 'notes')
  const environment = formString(formData, 'environment') === 'sandbox' ? 'sandbox' : 'live'
  const status = integrationHasRequiredEnv(integration) ? 'configured' : 'not_configured'

  await upsertIntegrationRecord({
    config: {
      owner: owner || null,
    },
    enabled,
    environment,
    key,
    lastError: null,
    metadata: {
      autoLeadSync,
      missingRequired: env.missingRequired,
      notes: notes || null,
    },
    status,
    updatedBy: current.user.id,
  })

  await Promise.all([
    recordIntegrationLog({
      action: 'integration.config.updated',
      createdBy: current.user.id,
      integrationKey: key,
      message: enabled
        ? 'Integracion activada/actualizada.'
        : 'Integracion desactivada/actualizada.',
      metadata: { autoLeadSync, enabled, environment },
    }),
    recordActivity({
      action: 'integration.config.updated',
      actorId: current.user.id,
      entityId: key,
      entityType: 'integration',
      metadata: { autoLeadSync, enabled, environment },
    }),
  ])

  revalidatePath('/dashboard/integrations')
  integrationsRedirect('saved', key)
}

export async function testIntegrationAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const key = formString(formData, 'key')
  const integration = integrationByKey(key)
  if (!integration) integrationsRedirect('invalid')

  const result = await runIntegrationTest({ actorId: current.user.id, key })
  await recordActivity({
    action: 'integration.tested',
    actorId: current.user.id,
    entityId: key,
    entityType: 'integration',
    metadata: { result: result.status },
  })

  revalidatePath('/dashboard/integrations')
  integrationsRedirect(result.status === 'error' ? 'test_failed' : 'tested', key)
}

export async function sendIntegrationLeadTestAction(formData: FormData): Promise<void> {
  await verifyCsrf(formData)
  const current = await requirePermission('settings.manage')
  const key = formString(formData, 'key')
  const integration = integrationByKey(key)
  if (!integration) integrationsRedirect('invalid')

  const result = await sendDataToIntegration({
    actorId: current.user.id,
    integrationKey: key,
  })

  await recordActivity({
    action: 'integration.lead_tested',
    actorId: current.user.id,
    entityId: key,
    entityType: 'integration',
    metadata: { result: result.status },
  })

  revalidatePath('/dashboard/integrations')
  integrationsRedirect(result.status === 'failed' ? 'lead_failed' : 'lead_sent', key)
}
